// Uji asap Mode Guru (Playwright, tanpa dunia 3D): siswa tiruan lewat WebSocket,
// guru di browser sungguhan. Menguji dasbor, KKM, kendali, proyektor+QR, dan
// pemulihan sesi setelah server dimatikan lalu dinyalakan lagi.
//
// Prasyarat: `npm run build` (server menyajikan dist/). Jalankan: node scripts/smoke-guru.mjs
// Opsi: SHOTS=folder untuk menyimpan tangkapan layar.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import WebSocket from 'ws';

const PORT = Number(process.env.PORT) || 8788;
const BASE = `http://127.0.0.1:${PORT}/`;
const SHOTS = process.env.SHOTS;
const log = (m) => console.log(`[guru] ${m}`);
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

let server;
function nyalakanServer() {
  server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  return tunggu(800);
}
async function matikanServer() {
  server.kill();
  await tunggu(500);
}

/** Siswa tiruan: bergabung, kirim progres, dan menyimpan pesan server. */
function siswa(token, id, nama, progress) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
  const pesan = [];
  ws.on('message', (m) => pesan.push(JSON.parse(String(m))));
  ws.on('open', () => {
    ws.send(JSON.stringify({ t: 'join', token, idSiswa: id, nama, gender: 'perempuan' }));
    ws.send(JSON.stringify({ t: 'progres', progress }));
  });
  return { ws, pesan };
}

const progres = (nama, alat, jawaban, nilai) => ({
  playerName: nama, gender: 'perempuan', noktah: null, bintang: { F01: alat > 0 ? 1 : 0 }, totalBenar: 1, totalSoal: 3,
  visitedNoktah: [], puncakLulus: false, soalSalah: [], diubahPada: new Date().toISOString(), tahap: { F01: 3 }, alat, jawaban, nilai,
});

const browser = await chromium.launch();
try {
  await nyalakanServer();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const guru = await ctx.newPage();
  guru.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await guru.goto(new URL('modeguru/', BASE).href, { waitUntil: 'networkidle' });
  await guru.locator('button', { hasText: 'Buat Sesi Kelas' }).click();
  await guru.waitForSelector('.token-besar');
  const token = (await guru.locator('.token-besar').textContent()).trim();
  log(`token ${token}`);

  // Dua siswa: Ani lemah (nilai awal rendah, banyak percobaan), Budi bagus.
  const ani = siswa(token, 's-aaaaaaaa', 'Ani', progres('Ani', 4, [
    { q: 'x1', k: 'F01', b: true, p: ['a', 'b', 'c'], n: 3 }, { q: 'x2', k: 'F01', b: false, p: ['a', 'b', 'c'], n: 3 }, { q: 'x3', k: 'F01', b: false, p: ['a'], n: 3 },
  ], { balai: { F01: 0.25 }, final: null, akhir: 3 }));
  const budi = siswa(token, 's-bbbbbbbb', 'Budi', progres('Budi', 9, [], { balai: { F01: 3 }, final: null, akhir: 60 }));
  await guru.waitForSelector('.kartu-siswa, .matriks tbody tr', { timeout: 8000 });
  await tunggu(3500);

  // --- Dasbor: KKM, nilai akhir, perlu perhatian ---
  const kartu = await guru.locator('.ringkas-kelas').textContent();
  log(`ringkas: ${kartu?.replace(/\s+/g, ' ')}`);
  if (!(await guru.locator('text=KKM (batas tuntas').count())) throw new Error('Kartu KKM tidak tampil');
  if (!(await guru.locator('text=Perlu perhatian').count())) throw new Error('Kartu "Perlu perhatian" tidak tampil');
  if (SHOTS) await guru.screenshot({ path: `${SHOTS}/1-dasbor.png`, fullPage: true });

  // KKM diubah → tersimpan dan dipakai
  await guru.locator('input[aria-label="KKM"]').fill('80');
  await guru.locator('input[aria-label="KKM"]').dispatchEvent('change');
  await tunggu(300);
  if ((await guru.evaluate(() => localStorage.getItem('survival-sains:kkm-guru'))) !== '80') throw new Error('KKM tidak tersimpan');

  // --- Kendali: jeda + pengumuman sampai ke siswa ---
  await guru.locator('button', { hasText: 'Jeda semua' }).click();
  await guru.locator('button', { hasText: '5 menit lagi' }).click();
  await tunggu(600);
  if (!ani.pesan.some((m) => m.t === 'jeda' && m.nilai)) throw new Error('Siswa tidak menerima jeda');
  if (!ani.pesan.some((m) => m.t === 'umum' && m.teks.includes('5 menit'))) throw new Error('Siswa tidak menerima pengumuman');
  log('jeda dan pengumuman diterima siswa');

  // --- Proyektor: token besar + QR + papan ---
  await guru.locator('button', { hasText: 'Proyektor' }).click();
  await guru.waitForSelector('.proyektor-token');
  if ((await guru.locator('.proyektor-qr svg').count()) !== 1) throw new Error('QR tidak tampil');
  if (!(await guru.locator('.proyektor-papan li', { hasText: 'Budi' }).count())) throw new Error('Papan tidak memuat Budi');
  const teksProyektor = await guru.locator('.proyektor').textContent();
  if (/nilai|%/i.test(teksProyektor?.replace('Peta kemajuan', '') ?? '')) log('PERINGATAN: proyektor memuat kata nilai/persen');
  if (SHOTS) await guru.screenshot({ path: `${SHOTS}/2-proyektor.png`, fullPage: true });
  await guru.locator('button', { hasText: 'Tutup proyektor' }).click();

  // --- Pemulihan: server dimatikan lalu dinyalakan lagi ---
  ani.ws.close();
  budi.ws.close();
  await matikanServer();
  await nyalakanServer();
  await tunggu(4500); // satu siklus polling guru
  const roster = await (await fetch(`${BASE}api/sesi/${token}`)).json();
  log(`setelah restart: ${roster.siswa?.length ?? 0} siswa, token ${roster.token}`);
  if (roster.token !== token || roster.siswa.length !== 2) throw new Error('Ruang tidak pulih setelah server restart');
  if (roster.siswa.find((s) => s.id === 's-bbbbbbbb')?.progress?.nilai?.akhir !== 60) throw new Error('Nilai siswa tidak pulih');
  if (SHOTS) await guru.screenshot({ path: `${SHOTS}/3-pulih.png`, fullPage: true });

  // --- Akhiri sesi ---
  guru.on('dialog', (d) => d.accept());
  await guru.locator('button', { hasText: 'Akhiri sesi' }).click();
  await guru.waitForSelector('button:has-text("Buat Sesi Kelas")', { timeout: 5000 });
  log('sesi diakhiri');
} catch (err) {
  console.error('[guru] GAGAL:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server?.kill();
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else if (!process.exitCode) log('MODE GURU LULUS');
