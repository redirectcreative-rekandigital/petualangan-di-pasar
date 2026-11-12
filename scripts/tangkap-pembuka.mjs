// Tangkapan layar untuk halaman /pembuka (Playwright). Menelusuri game seperti uji
// asap, lalu menyimpan gambar WebP ke public/pembuka/gambar/.
//   - Pemain (ID & EN): kartu anggota, percakapan, dunia balai, Halaman Cerita,
//     kuis, hadiah, peta pulau, tas survival, sertifikat.
//   - Mode Guru (ID saja, dasbor memang berbahasa Indonesia): Kelas Contoh.
//   - Aset dari pembuat (logo, foto, latar) diperkecil ke WebP.
//
// Prasyarat: `npm run build`, lalu `npm run serve` (atau SMOKE_URL ke server lain).
// Jalankan: node scripts/tangkap-pembuka.mjs [id|en|guru|aset ...]
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:8787/';
const OUT = path.resolve('public/pembuka/gambar');
const pilih = process.argv.slice(2);
const mau = (x) => !pilih.length || pilih.includes(x);
const log = (m) => console.log(`[tangkap] ${m}`);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await mkdir(OUT, { recursive: true });

// Konversi PNG → WebP memakai canvas Chromium (tanpa dependensi tambahan).
const pengubah = await browser.newPage();
async function keWebp(png, nama, { lebarMaks = 0, mutu = 0.82 } = {}) {
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
  const hasil = await pengubah.evaluate(
    async ({ dataUrl, lebarMaks, mutu }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const s = lebarMaks && img.width > lebarMaks ? lebarMaks / img.width : 1;
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return { url: c.toDataURL('image/webp', mutu), w: c.width, h: c.height };
    },
    { dataUrl, lebarMaks, mutu },
  );
  await writeFile(path.join(OUT, `${nama}.webp`), Buffer.from(hasil.url.split(',')[1], 'base64'));
  log(`${nama}.webp ${hasil.w}×${hasil.h}`);
}

async function pemain(bahasa) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true });
  // Layar penuh otomatis membuat ukuran jendela tak bisa diubah (potret ↔ lanskap).
  await ctx.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.resolve(); });
  await ctx.addInitScript((b) => {
    if (!sessionStorage.getItem('tangkap-siap')) {
      localStorage.clear();
      localStorage.setItem('survival-sains:bahasa', b);
      sessionStorage.setItem('tangkap-siap', '1');
    }
  }, bahasa);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log(`pageerror: ${e.message}`));
  const t = (ms) => page.waitForTimeout(ms);
  const api = (fn) => page.evaluate(fn);
  const en = bahasa === 'en';
  const L = (id, eng) => (en ? eng : id);
  const foto = async (nama) => keWebp(await page.screenshot(), `${nama}-${bahasa}`, { lebarMaks: 1600 });

  async function lanjutSemua(maks = 12) {
    for (let i = 0; i < maks; i++) {
      await page.locator('.vn-teks').click().catch(() => {});
      await t(120);
      const l = page.locator('.vn-lanjut');
      if (!(await l.count())) return;
      await l.first().click();
      await t(220);
    }
  }
  async function lewatiPanduan(tunggu = 0) {
    if (tunggu) await page.waitForSelector('.panduan-overlay', { timeout: tunggu }).catch(() => {});
    for (let i = 0; i < 20 && (await page.locator('.panduan-overlay').count()); i++) {
      await page.locator('.panduan-aksi .btn:not(.ghost)').click();
      await t(150);
    }
  }

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await t(800);
  // Popup info karya di beranda: tutup bila ada.
  const tutup = page.locator('.kartu-tutup, [aria-label="Tutup"], [aria-label="Close"]').first();
  if (await tutup.isVisible().catch(() => false)) await tutup.click();
  await page.getByRole('button', { name: L(/Mulai Petualangan/, /Start Adventure/) }).click();
  await t(900);
  await foto('kartu');
  await page.getByRole('button', { name: L(/Lanjut/, /Next/) }).first().click();
  await page.getByRole('button', { name: L(/Lanjut/, /Next/) }).first().click();
  await page.fill('input.isian', 'Sari');
  await page.getByRole('button', { name: L(/Mulai Bertahan/, /Start Surviving/) }).click();
  await page.waitForSelector('.cut-overlay');
  await t(2500);
  await foto('badai');
  await page.getByRole('button', { name: L(/Lewati/, /Skip/) }).click();
  await page.waitForSelector('canvas.world-canvas', { timeout: 20000 });
  await page.waitForSelector('.vn-overlay', { timeout: 60000 });
  await t(600);
  await foto('percakapan');

  await lanjutSemua();
  await page.locator('.vn-teks').click().catch(() => {});
  await page.locator('.vn-pilihan.balas').first().click();
  await lanjutSemua();
  await lewatiPanduan();
  await t(1500);
  await foto('balai');

  await api(() => { window.__survivalSains.pindahKe('cantrik'); window.__survivalSains.interaksi(); });
  await t(400);
  await lanjutSemua(1);
  await page.waitForSelector('.cerita-overlay');
  await page.getByRole('button', { name: L('Lanjut ▶', 'Next ▶') }).click();
  await t(2500);
  await foto('cerita');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: L('Lanjut ▶', 'Next ▶') }).click();
    await t(300);
  }
  await page.locator('.cerita-pilih button').first().click().catch(() => {});
  // Interaksi adegan 4: klik pilihan sampai tombol Lanjut aktif.
  for (const b of await page.locator('.cerita-pilih button').all()) {
    if (await page.getByRole('button', { name: L('Lanjut ▶', 'Next ▶') }).isEnabled().catch(() => false)) break;
    await b.click().catch(() => {});
    await t(200);
  }
  await page.getByRole('button', { name: L('Lanjut ▶', 'Next ▶') }).click();
  await t(1500);
  await foto('kunci-ingat');
  await page.getByRole('button', { name: L(/Selesai membaca/, /Done reading/) }).click();
  await lanjutSemua();

  await t(1500);
  await api(() => { window.__survivalSains.pindahKe('uji'); window.__survivalSains.interaksi(); });
  await t(400);
  await lanjutSemua(1);
  await lewatiPanduan();
  const bank = await api(() => window.__survivalSains.bank());
  for (let s = 0; s < 3; s++) {
    await page.locator('.vn-teks').click().catch(() => {});
    await page.waitForSelector('.vn-pilihan.jawab');
    const teks = await page.locator('.vn-teks').innerText();
    const q = bank.find((x) => x.balai === 'F01' && teks.includes(x.prompt));
    if (!q) throw new Error(`soal tak dikenali: ${teks}`);
    if (s === 0) {
      await foto('kuis');
      await page.locator('.vn-pilihan', { hasText: q.options.find((o) => o !== q.answer) }).first().click();
      await page.locator('.vn-teks').click().catch(() => {});
      await t(400);
      await foto('kuis-salah');
      await page.locator('.vn-pilihan', { hasText: L('Coba lagi', 'Try again') }).click();
      await page.locator('.vn-teks').click().catch(() => {});
      await page.waitForSelector('.vn-pilihan.jawab');
    }
    await page.locator('.vn-pilihan', { hasText: q.answer }).first().click();
    await lanjutSemua(1);
  }
  await lanjutSemua();
  await page.waitForSelector('.hadiah-overlay', { timeout: 8000 });
  await t(900);
  await foto('hadiah');
  await page.getByRole('button', { name: /Alhamdulillah/ }).click();

  await api(() => { window.__survivalSains.pindahKe('gerbang'); window.__survivalSains.interaksi(); });
  await t(400);
  await page.locator('.vn-teks').click().catch(() => {});
  await page.locator('.vn-pilihan', { hasText: L('Ya, ke peta', 'Yes, to the map') }).click();
  for (let i = 0; i < 40 && (await api(() => window.__survivalSains.mode())) !== 'peta-3d'; i++) await t(500);
  await lewatiPanduan(8000);
  await page.setViewportSize({ width: 915, height: 412 });
  await t(1500);
  const kecil = page.locator('.peta-zoom-btn').nth(1);
  for (let i = 0; i < 2; i++) await kecil.click().catch(() => {});
  await t(3000); // kabut Lembah Gema tersibak
  await foto('peta');
  await page.locator('.chip.tas').click();
  await t(700);
  await foto('tas');

  // Sertifikat: luluskan semua balai + Final, lalu buka Hasil Belajar.
  await page.keyboard.press('Escape');
  await api(() => window.__survivalSains.luluskanSemua());
  await page.evaluate(() => {
    const k = 'survival-sains:progress:v1';
    const p = JSON.parse(localStorage.getItem(k));
    localStorage.setItem(k, JSON.stringify({ ...p, puncakLulus: true }));
  });
  await page.setViewportSize({ width: 412, height: 915 });
  await page.reload({ waitUntil: 'networkidle' });
  await t(1500);
  await foto('beranda');
  await page.getByRole('button', { name: L(/Lanjutkan Petualangan/, /Continue Adventure/) }).click();
  for (let i = 0; i < 40 && (await api(() => window.__survivalSains.mode())) !== 'peta-3d'; i++) await t(500);
  await lewatiPanduan(5000);
  await page.setViewportSize({ width: 915, height: 412 });
  await t(1500);
  for (let i = 0; i < 2; i++) await page.locator('.peta-zoom-btn').nth(1).click().catch(() => {});
  await t(3000);
  await foto('peta-penuh');
  await page.setViewportSize({ width: 412, height: 915 });
  await t(800);
  await page.locator('button:has-text("☰")').first().click();
  await t(400);
  await page.locator('.menu-panel .menu-tombol button').nth(2).click();
  await page.waitForSelector('.sertifikat', { timeout: 8000 });
  await t(800);
  await page.locator('.sertifikat').scrollIntoViewIfNeeded();
  await foto('sertifikat');
  await ctx.close();
}

async function guru() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const t = (ms) => page.waitForTimeout(ms);
  const foto = async (nama) => keWebp(await page.screenshot(), nama, { lebarMaks: 1920 });
  const lewati = async () => {
    for (let i = 0; i < 20 && (await page.locator('.panduan-overlay').count()); i++) {
      await page.locator('.panduan-aksi .btn:not(.ghost)').click();
      await t(150);
    }
  };
  await page.goto(new URL('modeguru/', BASE).href, { waitUntil: 'networkidle' });
  await t(800);
  await lewati();
  await page.locator('button', { hasText: 'Lihat Contoh Kelas' }).click();
  await t(1500);
  await lewati();
  await t(6000); // siswa contoh maju sedikit
  const kartu = async (sel, nama) => {
    const e = page.locator(sel).first();
    await e.scrollIntoViewIfNeeded();
    await t(300);
    await keWebp(await e.screenshot(), nama, { lebarMaks: 1600 });
  };
  await page.locator('.guru-panel .card').first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await t(300);
  await foto('guru-atas');
  await kartu('.kartu-perhatian', 'guru-perhatian');
  await kartu('.kartu-perjalanan', 'guru-perjalanan');
  await page.locator('.guru-tab').nth(1).click();
  await t(700);
  await kartu('.soal-guru', 'guru-soal');
  await page.locator('.guru-tab').nth(2).click();
  await t(700);
  await page.locator('.guru-tabs').evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await t(300);
  await foto('guru-siswa');
  await page.locator('button', { hasText: 'Proyektor' }).click();
  await page.waitForSelector('.proyektor-token');
  await t(800);
  await foto('guru-proyektor');
  await ctx.close();
}

async function aset() {
  const src = path.resolve('aset-sumber/pembuka'); // berkas asli dari pembuat (PNG besar)
  await keWebp(await readFile(path.join(src, 'bg.png')), 'sekolah', { lebarMaks: 1600, mutu: 0.75 });
  await keWebp(await readFile(path.join(src, 'pembuat.png')), 'pembuat', { lebarMaks: 360 });
  await keWebp(await readFile(path.join(src, 'logo-sdm.png')), 'logo-sdm', { lebarMaks: 160 });
  await keWebp(await readFile(path.join(src, 'logo-muh.png')), 'logo-muh', { lebarMaks: 160 });
}

try {
  if (mau('aset')) await aset();
  if (mau('guru')) await guru();
  if (mau('id')) await pemain('id');
  if (mau('en')) await pemain('en');
  log('selesai');
} catch (err) {
  console.error('[tangkap] GAGAL:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
