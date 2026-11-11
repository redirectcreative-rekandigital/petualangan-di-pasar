// Ukur performa ala HP murah (Playwright): CPU diperlambat 6x + jaringan 4G.
//   - load awal: buka halaman sampai tombol "Mulai Petualangan" tampil
//   - masuk balai: dari perintah masuk sampai dunia siap dimainkan
//   - FPS saat berjalan 6 detik di balai, draw call, tekstur, DPR
//   - peta: dari perintah buka sampai siap
//
// Catatan: GPU memakai SwiftShader (perangkat lunak), jadi FPS mutlak tidak
// sama dengan HP asli; pakai untuk MEMBANDINGKAN sebelum/sesudah.
//
// Prasyarat: game tersaji di UKUR_URL (mis. `npx vite preview --port 4174`).
// Jalankan:  UKUR_URL=http://localhost:4174/ node scripts/ukur-performa.mjs
import { chromium } from 'playwright';

const BASE = process.env.UKUR_URL ?? 'http://localhost:4174/';
const KUALITAS = process.env.UKUR_KUALITAS; // 'rendah' | 'tinggi' | kosong (deteksi otomatis)
const url = KUALITAS ? `${BASE}?kualitas=${KUALITAS}` : BASE;

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: true });
const galat = [];
page.on('pageerror', (e) => galat.push(e.message));
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await cdp.send('Network.enable');
// "4G" DevTools: 4 Mbps turun, 3 Mbps naik, latensi 20 ms (cache dimatikan = kunjungan pertama).
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 20, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 });
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

const api = (fn, arg) => page.evaluate(fn, arg);
const siapDunia = (mode) =>
  page.waitForFunction((m) => window.__survivalSains?.mode() === m && !document.querySelector('.loading-overlay'), mode, { timeout: 180000, polling: 100 });
const hasil = {};

let mulai = Date.now();
await page.goto(url);
await page.getByRole('button', { name: /Mulai Petualangan/ }).waitFor({ timeout: 180000 });
hasil.loadAwal_s = (Date.now() - mulai) / 1000;
hasil.unduhAwal_KB = Math.round(await api(() => performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) / 1024));

mulai = Date.now();
await api(() => window.__survivalSains.masukBalai('F01'));
await siapDunia('balai-3d');
hasil.masukBalai_s = (Date.now() - mulai) / 1000;
await page.keyboard.down('w');
// 8 detik pertama setelah siap: rata-rata FPS dan frame terlama (tersendat saat shader/tekstur disiapkan).
const ukurFrame = () =>
  api(
    () =>
      new Promise((selesai) => {
        let n = 0;
        let maks = 0;
        const t0 = performance.now();
        let lalu = t0;
        const f = (t) => {
          maks = Math.max(maks, t - lalu);
          lalu = t;
          if (t - t0 < 8000) {
            n++;
            requestAnimationFrame(f);
          } else selesai({ fps: Math.round(((n * 1000) / (t - t0)) * 10) / 10, frameTerlama_ms: Math.round(maks) });
        };
        requestAnimationFrame(f);
      }),
  );
const frame = await ukurFrame();
await page.keyboard.up('w');
hasil.fpsBalai = frame.fps;
hasil.frameTerlamaBalai_ms = frame.frameTerlama_ms;
hasil.balai = await api(() => window.__survivalSains.info?.() ?? null);

mulai = Date.now();
await api(() => window.__survivalSains.kePeta());
await siapDunia('peta-3d');
hasil.bukaPeta_s = (Date.now() - mulai) / 1000;
hasil.frameTerlamaPeta_ms = (await ukurFrame()).frameTerlama_ms;
hasil.peta = await api(() => window.__survivalSains.info?.() ?? null);
hasil.heapJS_MB = Math.round((await api(() => performance.memory?.usedJSHeapSize ?? 0)) / 1048576);
hasil.galat = galat;

console.log(JSON.stringify(hasil, null, 2));
await browser.close();
