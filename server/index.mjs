/**
 * Server "Petualangan di Pasar" — mode multiplayer + dasbor guru.
 *
 * Fungsi:
 *  1. Menyajikan aplikasi hasil build (folder `dist/`) sebagai berkas statis.
 *  2. REST:
 *       POST /api/sesi        → guru membuat ruang, dapat token 4 digit.
 *       GET  /api/sesi/:token → daftar siswa + progres (dipakai dasbor guru).
 *  3. WebSocket /ws:
 *       - siswa join dengan token,
 *       - posisi & sapaan disiarkan hanya ke pemain di noktah yang sama,
 *       - progres dikirim ke guru (lewat event `progres`).
 *
 * Jalankan:  node server/index.mjs   (default port 8080, ubah lewat PORT)
 * Aplikasi frontend tetap bisa jalan tanpa server (singleplayer).
 */

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

import {
  buatTokenAcak,
  buatRuang,
  progresKosong,
} from './rooms.mjs';
import { MAKS_PEMAIN_PER_RUANG } from '../shared/net.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 8787;

/** token → ruang */
const ruang = new Map();
/** id pemain → { ws, token } */
const koneksi = new Map();

let seqPemain = 0;
function idPemainBaru() {
  seqPemain += 1;
  return `p${seqPemain}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ================================================================== */
/* REST API                                                            */
/* ================================================================== */

function kirimJson(res, kode, data) {
  const body = JSON.stringify(data);
  res.writeHead(kode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(body);
}

function bacaBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

/** Ringkasan seluruh ruang untuk keperluan dasbor/daftar. */
function daftarSiswa(token) {
  const r = ruang.get(token);
  if (!r) return null;
  const siswa = [...r.siswa.values()].map((s) => ({
    id: s.id,
    nama: s.nama,
    gender: s.gender,
    online: s.online,
    joinedAt: s.joinedAt,
    lastSeen: s.lastSeen,
    progress: s.progress,
  }));
  // Urutkan: online dulu, lalu nama.
  siswa.sort((a, b) => Number(b.online) - Number(a.online) || a.nama.localeCompare(b.nama));
  return { token: r.token, guru: r.guru, dibuatPada: r.dibuatPada, jumlahSiswa: siswa.length, siswa };
}

/* ================================================================== */
/* WebSocket                                                           */
/* ================================================================== */

const wss = new WebSocketServer({ noServer: true });

/** Kirim daftar pemain pada noktah yang sama ke semua orang di noktah itu. */
function siarkanPemainNoktah(token, noktah) {
  const r = ruang.get(token);
  if (!r) return;
  const diNoktah = [...r.siswa.values()].filter((s) => s.online && s.noktah === noktah && noktah !== null);
  const daftar = diNoktah.map((s) => ({
    id: s.id,
    nama: s.nama,
    gender: s.gender,
    warnaBaju: s.warnaBaju,
    warnaBawahan: s.warnaBawahan,
    warnaHijab: s.warnaHijab,
    noktah: s.noktah,
    x: s.x,
    z: s.z,
    rot: s.rot,
    sapa: s.sapa && s.sapa.sampai > Date.now() ? s.sapa : undefined,
  }));
  const teks = JSON.stringify({ t: 'pemain', daftar });
  for (const s of diNoktah) {
    if (s.ws && s.ws.readyState === 1) s.ws.send(teks);
  }
}

wss.on('connection', (ws) => {
  let idSaya = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== 'string') return;

    if (msg.t === 'join') {
      const token = String(msg.token || '').trim();
      const r = ruang.get(token);
      if (!r) {
        ws.send(JSON.stringify({ t: 'galat', pesan: 'Token tidak ditemukan. Minta token yang benar ke gurumu.' }));
        return;
      }
      if (r.siswa.size >= MAKS_PEMAIN_PER_RUANG) {
        ws.send(JSON.stringify({ t: 'galat', pesan: 'Ruang sudah penuh (maksimum 40 siswa).' }));
        return;
      }
      idSaya = idPemainBaru();
      const siswa = {
        id: idSaya,
        nama: String(msg.nama || 'Siswa').slice(0, 24),
        gender: msg.gender === 'perempuan' ? 'perempuan' : 'laki-laki',
        warnaBaju: typeof msg.warnaBaju === 'number' ? msg.warnaBaju : undefined,
        warnaBawahan: typeof msg.warnaBawahan === 'number' ? msg.warnaBawahan : undefined,
        warnaHijab: typeof msg.warnaHijab === 'number' ? msg.warnaHijab : undefined,
        online: true,
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        noktah: null,
        x: 0,
        z: 0,
        rot: 0,
        sapa: undefined,
        progress: progresKosong(String(msg.nama || 'Siswa'), msg.gender),
        ws,
      };
      r.siswa.set(idSaya, siswa);
      koneksi.set(idSaya, { ws, token });
      ws.send(JSON.stringify({ t: 'selamat', id: idSaya, token }));
      return;
    }

    if (!idSaya) return;
    const info = koneksi.get(idSaya);
    if (!info) return;
    const r = ruang.get(info.token);
    if (!r) return;
    const siswa = r.siswa.get(idSaya);
    if (!siswa) return;

    if (msg.t === 'pos') {
      const noktahBaru = msg.noktah ?? null;
      const noktahLama = siswa.noktah;
      siswa.x = Number(msg.x) || 0;
      siswa.z = Number(msg.z) || 0;
      siswa.rot = Number(msg.rot) || 0;
      siswa.noktah = noktahBaru;
      siswa.lastSeen = new Date().toISOString();
      if (noktahBaru !== noktahLama) {
        if (noktahLama) siarkanPemainNoktah(info.token, noktahLama);
        if (noktahBaru) siarkanPemainNoktah(info.token, noktahBaru);
      } else if (noktahBaru) {
        siarkanPemainNoktah(info.token, noktahBaru);
      }
      return;
    }

    if (msg.t === 'sapa') {
      const emoji = String(msg.emoji || '').slice(0, 4);
      siswa.sapa = { emoji, sampai: Date.now() + 2600 };
      if (siswa.noktah) siarkanPemainNoktah(info.token, siswa.noktah);
      return;
    }

    if (msg.t === 'progres' && msg.progress) {
      siswa.progress = { ...msg.progress, diubahPada: new Date().toISOString() };
      siswa.lastSeen = new Date().toISOString();
      return;
    }
  });

  ws.on('close', () => {
    if (!idSaya) return;
    const info = koneksi.get(idSaya);
    koneksi.delete(idSaya);
    if (!info) return;
    const r = ruang.get(info.token);
    if (!r) return;
    const siswa = r.siswa.get(idSaya);
    if (!siswa) return;
    siswa.online = false;
    siswa.ws = null;
    siswa.lastSeen = new Date().toISOString();
    if (siswa.noktah) siarkanPemainNoktah(info.token, siswa.noktah);
  });
});

/* ================================================================== */
/* HTTP: REST + berkas statis                                          */
/* ================================================================== */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

async function sajikanStatis(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(DIST_DIR, urlPath);

  // Cegah path traversal.
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) throw new Error('dir');
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    // Fallback SPA: kirim index.html untuk rute yang tidak dikenal.
    const fallback = path.join(DIST_DIR, 'index.html');
    if (existsSync(fallback)) {
      const data = await readFile(fallback);
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(data);
    } else {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Belum ada dist/. Jalankan `npm run build` dulu.');
    }
  }
}

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // --- REST API ---
  if (urlPath === '/api/sesi' && req.method === 'POST') {
    const body = await bacaBody(req);
    const dipakai = new Set(ruang.keys());
    const token = buatTokenAcak(dipakai);
    const r = buatRuang(token, body.guru);
    ruang.set(token, r);
    kirimJson(res, 200, { token, guru: r.guru, dibuatPada: r.dibuatPada });
    return;
  }

  if (urlPath.startsWith('/api/sesi/') && req.method === 'GET') {
    const token = urlPath.slice('/api/sesi/'.length).trim();
    const data = daftarSiswa(token);
    if (!data) {
      kirimJson(res, 404, { pesan: 'Sesi tidak ditemukan.' });
      return;
    }
    kirimJson(res, 200, data);
    return;
  }

  if (urlPath === '/api/cek' && req.method === 'GET') {
    kirimJson(res, 200, { ok: true, ruang: ruang.size });
    return;
  }

  if (req.method === 'OPTIONS') {
    kirimJson(res, 204, {});
    return;
  }

  await sajikanStatis(req, res);
});

server.on('upgrade', (req, socket, head) => {
  const urlPath = (req.url || '').split('?')[0];
  if (urlPath !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

server.listen(PORT, () => {
  console.log(`[server] Petualangan di Pasar berjalan di http://localhost:${PORT}`);
  console.log(`[server] REST: POST /api/sesi, GET /api/sesi/:token | WS: /ws`);
});
