// Uji asap (Playwright, layar HP): menelusuri satu balai penuh tanpa error.
//   sampul → cutscene badai → kartu anggota → prolog di Goa Sinar
//   → misi Penjaga → Halaman Cerita (4 adegan + interaksi) → Tempat Uji
//   (1 salah lalu benar) → kartu hadiah → gerbang → peta pulau.
//
// Prasyarat: server berjalan (npm run dev / preview / serve) pada BASE.
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';
const errors = [];
const log = (m) => console.log(`[smoke] ${m}`);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, hasTouch: true });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
const t = (ms) => page.waitForTimeout(ms);
const api = (fn) => page.evaluate(fn);

/** Tekan "Lanjut" di kotak percakapan sampai tidak ada lagi. */
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

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Mulai Petualangan/ }).click();
  await page.waitForSelector('.cut-overlay');
  log('cutscene badai tampil');
  await page.getByRole('button', { name: /Lewati/ }).click();
  await page.getByRole('button', { name: /Lanjut/ }).click();
  await page.getByRole('button', { name: /Lanjut/ }).first().click();
  await page.fill('input.isian', 'Uji');
  await page.getByRole('button', { name: /Mulai Bertahan/ }).click();
  await page.waitForSelector('canvas.world-canvas', { timeout: 20000 });
  await page.waitForSelector('.vn-overlay', { timeout: 45000 }); // adegan Tidur-Bangun lambat di swiftshader
  log('prolog: terbangun di Goa Sinar, Mbok Sinar menyapa');

  await lanjutSemua();
  await page.locator('.vn-teks').click().catch(() => {});
  await page.locator('.vn-pilihan.balas').first().click();
  await lanjutSemua();
  let d = await api(() => window.__survivalSains.debug());
  if (d.tahap !== 1) throw new Error(`tahap setelah misi = ${d.tahap}`);
  log('misi diterima (tahap 1)');

  await api(() => { window.__survivalSains.pindahKe('uji'); window.__survivalSains.interaksi(); });
  await t(400);
  const terkunci = await page.locator('.vn-teks').innerText();
  await lanjutSemua(1);
  log(`Tempat Uji masih terkunci: "${terkunci.slice(0, 40)}..."`);

  await api(() => { window.__survivalSains.pindahKe('cantrik'); window.__survivalSains.interaksi(); });
  await t(400);
  await lanjutSemua(1);
  await page.waitForSelector('.cerita-overlay');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Lanjut ▶' }).click();
    await t(300);
  }
  await page.locator('.cerita-pilih button', { hasText: 'terang' }).click();
  await page.getByRole('button', { name: 'Lanjut ▶' }).click();
  await page.getByRole('button', { name: /Selesai membaca/ }).click();
  await lanjutSemua();
  d = await api(() => window.__survivalSains.debug());
  if (d.tahap !== 2) throw new Error(`tahap setelah cerita = ${d.tahap}`);
  log('Halaman Cerita tamat (tahap 2)');

  await t(1500);
  await api(() => { window.__survivalSains.pindahKe('uji'); window.__survivalSains.interaksi(); });
  await t(400);
  await lanjutSemua(1);
  const bank = await api(() => window.__survivalSains.bank());
  for (let s = 0; s < 3; s++) {
    await page.locator('.vn-teks').click().catch(() => {});
    await page.waitForSelector('.vn-pilihan.jawab');
    const teks = await page.locator('.vn-teks').innerText();
    const q = bank.find((x) => x.balai === 'F01' && teks.includes(x.prompt));
    if (!q) throw new Error(`soal tak dikenali: ${teks}`);
    if (s === 0) {
      await page.locator('.vn-pilihan', { hasText: q.options.find((o) => o !== q.answer) }).first().click();
      await page.locator('.vn-teks').click().catch(() => {});
      await page.locator('.vn-pilihan', { hasText: 'Coba lagi' }).click();
      await page.locator('.vn-teks').click().catch(() => {});
      await page.waitForSelector('.vn-pilihan.jawab');
    }
    await page.locator('.vn-pilihan', { hasText: q.answer }).first().click();
    await lanjutSemua(1);
  }
  await lanjutSemua();
  await page.waitForSelector('.hadiah-overlay', { timeout: 5000 });
  log('hadiah: Cermin Sinyal');
  await page.getByRole('button', { name: /Alhamdulillah/ }).click();
  const prog = await api(() => window.__survivalSains.progress());
  if (!prog.alat.includes('F01') || !prog.prologSelesai) throw new Error('alat/prolog tidak tersimpan');
  if (prog.answers[0].percobaan !== 2) throw new Error('percobaan tidak tercatat');

  await api(() => { window.__survivalSains.pindahKe('gerbang'); window.__survivalSains.interaksi(); });
  await t(400);
  await page.locator('.vn-teks').click().catch(() => {});
  await page.locator('.vn-pilihan', { hasText: 'Ya, ke peta' }).click();
  let mode = '';
  for (let i = 0; i < 30 && mode !== 'peta-3d'; i++) {
    await t(500);
    mode = await api(() => window.__survivalSains.mode());
  }
  if (mode !== 'peta-3d') throw new Error(`mode akhir ${mode}`);
  log('kembali ke peta pulau; Lembah Gema terbuka');

  if (errors.length) {
    console.error('[smoke] ERROR:');
    errors.forEach((e) => console.error('  - ' + e));
    process.exitCode = 1;
  } else log('SMOKE LULUS TANPA ERROR');
} catch (err) {
  console.error('[smoke] GAGAL:', err.message);
  errors.forEach((e) => console.error('  - ' + e));
  process.exitCode = 1;
} finally {
  await browser.close();
}
