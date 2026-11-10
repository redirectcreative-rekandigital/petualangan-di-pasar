// Uji cepat: di dev server Vite (:5173), Mode Guru harus memanggil API ke :8787.
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

try {
  const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  const permintaan = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) permintaan.push(`${r.method()} ${r.url()}`);
  });
  const gagal = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) gagal.push(`${r.status()} ${r.url()}`);
  });

  // Mode Guru punya alamat sendiri (tidak ada tombolnya di beranda siswa).
  await page.goto(new URL('modeguru/', BASE).href, { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: 'Buat Sesi Kelas' }).click();
  await page.waitForSelector('.token-besar', { timeout: 10000 });
  const token = (await page.locator('.token-besar').textContent()).trim();

  console.log('[dev] token =', token);
  console.log('[dev] permintaan API:', permintaan.join(' | ') || '(tidak ada)');
  if (gagal.length) console.log('[dev] respons gagal:', gagal.join(' | '));

  const semuaKe8787 = permintaan.length > 0 && permintaan.every((p) => p.includes(':8787/'));
  const adaKe5173 = permintaan.some((p) => p.includes(':5173/'));
  if (!/^[0-9]{4}$/.test(token)) throw new Error('Token tidak valid');
  if (!semuaKe8787 || adaKe5173) throw new Error('API masih diarahkan ke dev server Vite');
  if (gagal.length) throw new Error('Ada respons API gagal');

  console.log('[dev] LULUS: Mode Guru memakai server multiplayer di :8787');
  process.exitCode = 0;
} catch (err) {
  console.error('[dev] GAGAL:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
