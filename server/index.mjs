/**
 * Server "Survival Sains" — mode multiplayer + dasbor guru.
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
  buatKunci,
  kunciCocok,
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
/** Format ID siswa dari perangkat (lihat src/core/profil.ts): "s-" + 8–32 huruf/angka. */
const ID_SISWA_VALID = /^s-[a-z0-9]{8,32}$/;

/** Apakah nama ini sedang dipakai siswa lain (ID berbeda) yang online di ruang. */
function namaDipakaiLain(r, nama, idKecuali) {
  const n = String(nama).trim().toLowerCase();
  return [...r.siswa.values()].some((s) => s.id !== idKecuali && s.online && s.nama.trim().toLowerCase() === n);
}

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
  return { token: r.token, guru: r.guru, dibuatPada: r.dibuatPada, terkunci: r.terkunci, jeda: r.jeda, jumlahSiswa: siswa.length, siswa };
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
      // ID tetap dari profil siswa di perangkat: satu siswa = satu baris di
      // dasbor guru, walau halaman dimuat ulang atau perangkat dipakai bergantian.
      const idDiminta = typeof msg.idSiswa === 'string' && ID_SISWA_VALID.test(msg.idSiswa) ? msg.idSiswa : null;
      const lama = idDiminta ? r.siswa.get(idDiminta) : undefined;
      if (idDiminta && r.dikeluarkan.has(idDiminta)) {
        ws.send(JSON.stringify({ t: 'galat', pesan: 'Kamu dikeluarkan dari kelas ini oleh gurumu.' }));
        return;
      }
      if (!lama && r.terkunci) {
        ws.send(JSON.stringify({ t: 'galat', pesan: 'Kelas sedang dikunci oleh gurumu.' }));
        return;
      }
      if (!lama && r.siswa.size >= MAKS_PEMAIN_PER_RUANG) {
        ws.send(JSON.stringify({ t: 'galat', pesan: 'Ruang sudah penuh (maksimum 40 siswa).' }));
        return;
      }
      // Nama yang diubah guru tetap dipakai walau siswa bergabung lagi.
      const nama = lama?.namaTetap ? lama.nama : String(msg.nama || 'Siswa').slice(0, 24);
      idSaya = idDiminta ?? idPemainBaru();
      const tampilan = {
        nama,
        gender: msg.gender === 'perempuan' ? 'perempuan' : 'laki-laki',
        warnaBaju: typeof msg.warnaBaju === 'number' ? msg.warnaBaju : undefined,
        warnaBawahan: typeof msg.warnaBawahan === 'number' ? msg.warnaBawahan : undefined,
        warnaHijab: typeof msg.warnaHijab === 'number' ? msg.warnaHijab : undefined,
      };
      if (lama) {
        // Siswa yang sama tersambung lagi: pakai baris lama, tutup koneksi lamanya.
        if (lama.ws && lama.ws !== ws && lama.ws.readyState === 1) lama.ws.close();
        Object.assign(lama, tampilan, { online: true, ws, lastSeen: new Date().toISOString() });
      } else {
        r.siswa.set(idSaya, {
          id: idSaya,
          ...tampilan,
          online: true,
          joinedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          noktah: null,
          x: 0,
          z: 0,
          rot: 0,
          sapa: undefined,
          progress: progresKosong(nama, msg.gender),
          ws,
        });
      }
      koneksi.set(idSaya, { ws, token });
      ws.send(JSON.stringify({ t: 'selamat', id: idSaya, token }));
      if (r.jeda) ws.send(JSON.stringify({ t: 'jeda', nilai: true }));
      if (namaDipakaiLain(r, nama, idSaya)) {
        ws.send(JSON.stringify({ t: 'kabar', kode: 'nama-ganda', teks: `Nama "${nama}" sedang dipakai siswa lain di kelas ini. Minta gurumu memastikan, ya.`, nama }));
      }
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
    // Koneksi lama yang sudah digantikan (siswa tersambung lagi) diabaikan.
    if (!info || info.ws !== ws) return;
    koneksi.delete(idSaya);
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
    let s = await stat(filePath);
    let berkas = filePath;
    if (s.isDirectory()) {
      // Folder tanpa garis miring (mis. /modeguru): arahkan ke /modeguru/ agar
      // alamat relatif di dalamnya benar. Folder ber-index.html: sajikan index-nya.
      const index = path.join(filePath, 'index.html');
      if (!existsSync(index)) throw new Error('dir');
      if (!urlPath.endsWith('/')) {
        const q = (req.url || '').includes('?') ? (req.url || '').slice((req.url || '').indexOf('?')) : '';
        res.writeHead(301, { location: `${urlPath}/${q}` });
        res.end();
        return;
      }
      berkas = index;
      s = await stat(berkas);
    }
    void s;
    const data = await readFile(berkas);
    res.writeHead(200, { 'content-type': MIME[path.extname(berkas)] || 'application/octet-stream' });
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
    // Pemulihan setelah server restart: guru mengirim token + kunci lamanya (dan salinan daftar siswa).
    const tokenLama = /^\d{4}$/.test(String(body.token)) ? String(body.token) : null;
    const ada = tokenLama ? ruang.get(tokenLama) : undefined;
    if (ada && kunciCocok(ada, body.kunci)) {
      kirimJson(res, 200, { token: ada.token, guru: ada.guru, dibuatPada: ada.dibuatPada, kunci: ada.kunci });
      return;
    }
    const pulihkan = Boolean(tokenLama) && !ada && /^[0-9a-f]{32}$/.test(String(body.kunci));
    const token = pulihkan ? tokenLama : buatTokenAcak(new Set(ruang.keys()));
    const kunci = pulihkan ? String(body.kunci) : buatKunci();
    const r = buatRuang(token, body.guru, kunci);
    if (pulihkan && Array.isArray(body.siswa)) {
      for (const s of body.siswa.slice(0, MAKS_PEMAIN_PER_RUANG)) {
        if (!s || !ID_SISWA_VALID.test(String(s.id))) continue;
        const nama = String(s.nama || 'Siswa').slice(0, 24);
        const gender = s.gender === 'perempuan' ? 'perempuan' : 'laki-laki';
        r.siswa.set(s.id, {
          id: s.id, nama, gender, online: false, joinedAt: String(s.joinedAt || new Date().toISOString()),
          lastSeen: String(s.lastSeen || new Date().toISOString()), noktah: null, x: 0, z: 0, rot: 0, sapa: undefined, ws: null,
          progress: s.progress && typeof s.progress === 'object' ? s.progress : progresKosong(nama, gender),
        });
      }
    }
    ruang.set(token, r);
    kirimJson(res, 200, { token, guru: r.guru, dibuatPada: r.dibuatPada, kunci });
    return;
  }

  // Cek token sebelum siswa bergabung: ada? penuh? nama sedang dipakai?
  const cocokCek = urlPath.match(/^\/api\/sesi\/([^/]+)\/cek$/);
  if (cocokCek && req.method === 'GET') {
    const r = ruang.get(decodeURIComponent(cocokCek[1]).trim());
    if (!r) {
      kirimJson(res, 404, { pesan: 'Token tidak ditemukan. Minta token yang benar ke gurumu.' });
      return;
    }
    const q = new URL(req.url || '/', 'http://x').searchParams;
    const idSiswa = q.get('id') || '';
    kirimJson(res, 200, {
      ada: true,
      penuh: !r.siswa.has(idSiswa) && r.siswa.size >= MAKS_PEMAIN_PER_RUANG,
      namaDipakai: namaDipakaiLain(r, q.get('nama') || '', idSiswa),
      terkunci: r.terkunci && !r.siswa.has(idSiswa),
      dikeluarkan: r.dikeluarkan.has(idSiswa),
    });
    return;
  }

  // Kendali guru (butuh kunci rahasia): kunci kelas, jeda, pengumuman, keluarkan, ubah nama, akhiri.
  const cocokKendali = urlPath.match(/^\/api\/sesi\/([^/]+)\/kendali$/);
  if (cocokKendali && req.method === 'POST') {
    const r = ruang.get(decodeURIComponent(cocokKendali[1]).trim());
    const body = await bacaBody(req);
    if (!r) return kirimJson(res, 404, { pesan: 'Sesi tidak ditemukan.' });
    if (!kunciCocok(r, body.kunci)) return kirimJson(res, 403, { pesan: 'Kunci guru tidak cocok.' });
    const kirimSemua = (obj) => {
      const teks = JSON.stringify(obj);
      for (const s of r.siswa.values()) if (s.ws && s.ws.readyState === 1) s.ws.send(teks);
    };
    const siswa = r.siswa.get(String(body.id || ''));
    switch (body.aksi) {
      case 'kunci':
        r.terkunci = Boolean(body.nilai);
        break;
      case 'jeda':
        r.jeda = Boolean(body.nilai);
        kirimSemua({ t: 'jeda', nilai: r.jeda });
        break;
      case 'umum': {
        const teks = String(body.teks || '').trim().slice(0, 120);
        if (!teks) return kirimJson(res, 400, { pesan: 'Pengumuman kosong.' });
        kirimSemua({ t: 'umum', teks });
        break;
      }
      case 'keluarkan':
        if (!siswa) return kirimJson(res, 404, { pesan: 'Siswa tidak ditemukan.' });
        r.dikeluarkan.add(siswa.id);
        if (siswa.ws && siswa.ws.readyState === 1) {
          siswa.ws.send(JSON.stringify({ t: 'dikeluarkan' }));
          siswa.ws.close();
        }
        koneksi.delete(siswa.id);
        r.siswa.delete(siswa.id);
        if (siswa.noktah) siarkanPemainNoktah(r.token, siswa.noktah);
        break;
      case 'nama': {
        const nama = String(body.nama || '').trim().slice(0, 24);
        if (!siswa || nama.length < 2) return kirimJson(res, 400, { pesan: 'Siswa atau nama tidak valid.' });
        siswa.nama = nama;
        siswa.namaTetap = true;
        siswa.progress = { ...siswa.progress, playerName: nama };
        break;
      }
      case 'akhiri':
        kirimSemua({ t: 'selesai' });
        for (const s of r.siswa.values()) {
          koneksi.delete(s.id);
          if (s.ws && s.ws.readyState === 1) s.ws.close();
        }
        ruang.delete(r.token);
        break;
      default:
        return kirimJson(res, 400, { pesan: 'Aksi tidak dikenal.' });
    }
    return kirimJson(res, 200, { ok: true });
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
  console.log(`[server] Survival Sains berjalan di http://localhost:${PORT}`);
  console.log(`[server] REST: POST /api/sesi, GET /api/sesi/:token | WS: /ws`);
});
