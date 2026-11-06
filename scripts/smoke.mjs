// Uji asap dengan Playwright: memuat game di Chromium (WebGL via SwiftShader),
// memeriksa tidak ada error console, lalu menelusuri alur baru:
//   pembuka (cover -> karakter -> nama) -> loading -> peta 3D
//   -> masuk noktah (dunia 3D) -> dialog balai -> panel balai -> panel soal.
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';

const errors = [];

function log(msg) {
  console.log(`[smoke] ${msg}`);
}

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push(`console.error: ${msg.text()}`);
  }
});
page.on('pageerror', (err) => {
  errors.push(`pageerror: ${err.message}`);
});

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  log('halaman dimuat');

  // Layar pembuka (cover) menampilkan judul baru.
  await page.waitForSelector('text=Petualangan di Pasar', { timeout: 10000 });
  log('layar pembuka tampil');

  // Langkah 1: cover -> pilih karakter.
  await page.locator('button', { hasText: 'Mulai Petualangan' }).click();
  await page.waitForSelector('text=Pilih Karakter', { timeout: 5000 });
  log('layar pilih karakter tampil');

  // Langkah 2: pilih perempuan lalu lanjut.
  await page.locator('.pilih-karakter', { hasText: 'Perempuan' }).click();
  await page.locator('button', { hasText: 'Lanjut' }).click();
  await page.waitForSelector('text=Nama & Mode Bermain', { timeout: 5000 });
  log('layar nama & mode tampil');

  // Langkah 3: pilih mode singleplayer (bawaan), isi nama lalu mulai.
  await page.locator('input.isian[aria-label="Nama panggilan"]').fill('Sari');
  await page.locator('button', { hasText: 'Mulai Berpetualang' }).click();
  log('menekan Mulai Berpetualang');

  // Loading singkat, lalu kanvas peta 3D muncul.
  await page.waitForSelector('canvas.world-canvas', { timeout: 20000 });
  log('kanvas peta 3D muncul');

  await page.waitForTimeout(1500);
  const modePeta = await page.evaluate(() => window.__petualanganDiPasar?.mode?.() ?? null);
  log(`mode setelah pembuka: ${modePeta}`);

  // Masuk ke noktah B01 lewat pintasan uji (raycast 3D sulit di otomasi).
  await page.evaluate(() => window.__petualanganDiPasar?.masukNoktah?.('B01'));
  await page.waitForSelector('canvas.world-canvas', { timeout: 20000 });
  await page.waitForTimeout(2000);
  const modeNoktah = await page.evaluate(() => window.__petualanganDiPasar?.mode?.() ?? null);
  log(`mode setelah masuk noktah: ${modeNoktah}`);

  // Berjalan ke depan agar mendekati balai (balai pertama di z ≈ -9).
  await page.keyboard.down('w');
  await page.waitForTimeout(3600);
  await page.keyboard.up('w');

  const dbg = await page.evaluate(() => window.__petualanganDiPasar?.debug?.() ?? null);
  log(`posisi pemain: ${JSON.stringify(dbg)}`);

  // Interaksi (tombol A) -> dialog balai.
  const interact = page.locator('.btn-action.interact');
  await interact.waitFor({ state: 'visible', timeout: 8000 });
  await interact.click();
  log('menekan tombol A');

  // Dialog penjaga -> buka balai.
  await page.locator('button', { hasText: 'Buka Balai' }).click();
  log('membuka balai dari dialog');

  // Panel balai harus muncul (bacaan + tombol mulai).
  await page.waitForSelector('.panel-overlay', { timeout: 5000 });
  await page.waitForSelector('text=Materi', { timeout: 5000 });
  log('panel balai (bacaan) terbuka');

  // Mulai berlatih -> panel soal.
  await page.locator('button', { hasText: 'Mulai Berlatih' }).click();
  await page.waitForSelector('.panel-overlay .soal-box', { timeout: 5000 });
  log('panel soal terbuka');

  if (errors.length > 0) {
    console.error('[smoke] ERROR TERDETEKSI:');
    errors.forEach((e) => console.error('  - ' + e));
    process.exitCode = 1;
  } else {
    log('SEMUA LANGKAH LULUS TANPA ERROR');
  }
} catch (err) {
  console.error('[smoke] GAGAL:', err.message);
  errors.forEach((e) => console.error('  - ' + e));
  process.exitCode = 1;
} finally {
  await browser.close();
}
