// Skrip bantu: mengambil tangkapan layar tiap langkah utama untuk diperiksa
// secara visual (bukan bagian pipeline uji, hanya alat pengembangan).
//
// Pakai: node scripts/tangkap-layar.mjs [url]
// Hasil: folder .tangkapan/
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] ?? process.env.SMOKE_URL ?? 'http://localhost:5173/';
const KELUAR = '.tangkapan';

await mkdir(KELUAR, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 430, height: 880 }, deviceScaleFactor: 2 });

const galat = [];
page.on('pageerror', (e) => galat.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') galat.push(m.text());
});

async function jepret(nama) {
  await page.screenshot({ path: `${KELUAR}/${nama}.png` });
  console.log(`[tangkapan] ${nama}.png`);
}

// Bunyi langkah untuk beberapa detik agar relatif lama; jika ini memblokir
// thread utama, jumlah frame per detik akan turun drastis.
async function ukurFps(ms = 2000) {
  const r = await page.evaluate(
    (dur) =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - t0 < dur) requestAnimationFrame(tick);
          else res(n / ((performance.now() - t0) / 1000));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
  return r.toFixed(1);
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await jepret('01-cover');

  await page.locator('button', { hasText: 'Mulai Petualangan' }).click();
  await page.waitForTimeout(1200);
  await jepret('02-pilih-karakter');

  await page.locator('.pilih-karakter', { hasText: 'Perempuan' }).click();
  await page.waitForTimeout(600);
  await page.locator('button', { hasText: 'Lanjut' }).click();
  await page.waitForTimeout(1500);
  await jepret('03-atur-pakaian');

  // Coba tiap warna pada baris pertama untuk memastikan pratinjau berubah.
  const opsiBaju = page.locator('.warna-baris').first().locator('.warna-tombol');
  await opsiBaju.nth(2).click();
  await page.waitForTimeout(900);
  await jepret('04-warna-hijau');

  await page.locator('button', { hasText: 'Lanjut' }).click();
  await page.waitForTimeout(700);
  await jepret('05-nama');

  await page.locator('input.isian[aria-label="Nama panggilan"]').fill('Sari');
  await page.locator('button', { hasText: 'Mulai Berpetualang' }).click();
  await page.waitForSelector('canvas.world-canvas', { timeout: 20000 });
  await page.waitForTimeout(2500);
  await jepret('06-peta');

  await page.evaluate(() => window.__petualanganDiPasar?.masukNoktah?.('G01'));
  await page.waitForTimeout(3000);
  await jepret('07-dunia-noktah');
  console.log('[tangkapan] fps dunia noktah:', await ukurFps(), '(SwiftShader/software)');

  // Berjalan sebentar agar animasi & bayangan terlihat.
  await page.keyboard.down('w');
  await page.waitForTimeout(1600);
  await page.keyboard.up('w');
  await page.waitForTimeout(500);
  await jepret('08-jalan');

  if (galat.length) {
    console.error('[tangkapan] galat console:', galat.slice(0, 8));
  }
  console.log('[tangkapan] selesai');
} catch (err) {
  console.error('[tangkapan] GAGAL:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
