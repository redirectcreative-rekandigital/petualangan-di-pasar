/**
 * Alat bantu pengembangan: mengukur frame rate dunia noktah pada build produksi.
 *
 * Ini BUKAN bagian pipeline uji — hanya untuk membandingkan biaya visual
 * sebelum/sesudah perubahan. Di CI/mesin tanpa GPU angka ini memakai renderer
 * perangkat lunak (SwiftShader), jadi hasilnya jauh lebih rendah daripada
 * perangkat asli; gunakan untuk perbandingan relatif saja.
 *
 * Pakai: node scripts/ukur-fps.mjs [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:4173/';

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: 'Mulai Petualangan' }).click();
  await page.locator('.pilih-karakter', { hasText: 'Perempuan' }).click();
  await page.locator('button', { hasText: 'Lanjut' }).click();
  await page.locator('.warna-baris').first().locator('.warna-tombol').last().click();
  await page.locator('button', { hasText: 'Lanjut' }).click();
  await page.locator('input.isian[aria-label="Nama panggilan"]').fill('Uji');
  await page.waitForTimeout(300);
  await page.locator('button', { hasText: 'Mulai Berpetualang' }).click();
  await page.waitForSelector('canvas.world-canvas', { timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.__petualanganDiPasar?.masukNoktah?.('G01'));
  await page.waitForTimeout(3000);

  const ukur = (dur) =>
    page.evaluate(
      (d) =>
        new Promise((res) => {
          let n = 0;
          const t0 = performance.now();
          const tick = () => {
            n++;
            if (performance.now() - t0 < d) requestAnimationFrame(tick);
            else res(n / ((performance.now() - t0) / 1000));
          };
          requestAnimationFrame(tick);
        }),
      dur,
    );

  const hasil = [];
  for (let i = 0; i < 3; i++) hasil.push((await ukur(5000)).toFixed(1));
  console.log(`fps dunia noktah (${URL}): ${hasil.join(' / ')}`);
} catch (err) {
  console.error('GAGAL:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
