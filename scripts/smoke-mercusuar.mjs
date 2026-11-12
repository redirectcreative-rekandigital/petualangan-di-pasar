// Uji asap Final (Playwright, layar HP): luluskan semua balai → Mercusuar Tua
//   → jalan ke pintu masuk → 3 lantai (1 salah lalu benar) → Puncak Lampu
//   → lampu menyala → epilog → hasil.
//
// Prasyarat: server berjalan (npm run dev / preview / serve) pada BASE.
// Opsi: BAHASA=en untuk menguji versi English; SHOTS=folder untuk menyimpan
// tangkapan layar (lantai Final, epilog, sertifikat), dipakai halaman /pembuka.
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';
const EN = process.env.BAHASA === 'en';
const SHOTS = process.env.SHOTS;
const L = (id, en) => (EN ? en : id);
const errors = [];
const log = (m) => console.log(`[mercusuar] ${m}`);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, deviceScaleFactor: SHOTS ? 2 : 1 });
// Layar penuh mengunci ukuran jendela; matikan saat mengambil gambar potret.
if (SHOTS) await page.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.resolve(); });
if (EN) await page.addInitScript(() => localStorage.setItem('survival-sains:bahasa', 'en'));
const foto = (nama, el = page) => (SHOTS ? el.screenshot({ path: `${SHOTS}/${nama}-${EN ? 'en' : 'id'}.png` }) : null);
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
const t = (ms) => page.waitForTimeout(ms);
const api = (fn, arg) => page.evaluate(fn, arg);
const debug = () => api(() => window.__survivalSains.debug());

/** Jalani percakapan sampai tertutup: jawab soal dengan benar (kecuali `salahSekali`). */
async function jalaniPercakapan(bank, salahSekali = false) {
  let soal = 0;
  for (let i = 0; i < 200; i++) {
    if (!(await page.locator('.vn-overlay').count())) return soal;
    await page.locator('.vn-teks').click().catch(() => {});
    await t(150);
    if (await page.locator('.vn-pilihan.jawab').count()) {
      const teks = await page.locator('.vn-teks').innerText();
      const q = bank.find((x) => x.balai === 'FINAL' && teks.includes(x.prompt));
      if (!q) throw new Error(`soal tak dikenali: ${teks}`);
      if (salahSekali) {
        salahSekali = false;
        await page.locator('.vn-pilihan.jawab', { hasText: q.options.find((o) => o !== q.answer) }).first().click();
        await page.locator('.vn-teks').click().catch(() => {});
        await page.locator('.vn-pilihan', { hasText: L('Coba lagi', 'Try again') }).click();
        await page.locator('.vn-teks').click().catch(() => {});
        await page.waitForSelector('.vn-pilihan.jawab');
      }
      await page.locator('.vn-pilihan.jawab', { hasText: q.answer }).first().click();
      soal++;
    } else if (await page.locator('.vn-lanjut').count()) {
      await page.locator('.vn-lanjut').first().click();
    } else if (await page.locator('.vn-pilihan').count()) {
      throw new Error(`pilihan tak terduga: ${await page.locator('.vn-aksi').innerText()}`);
    }
    await t(200);
  }
  throw new Error('percakapan tidak selesai');
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await api(() => window.__survivalSains.luluskanSemua());
  if (!(await api(() => window.__survivalSains.isPuncakUnlocked()))) throw new Error('Mercusuar tetap terkunci');
  await api(() => window.__survivalSains.keFinal());
  await page.waitForSelector('canvas.world-canvas', { timeout: 20000 });
  if ((await api(() => window.__survivalSains.mode())) !== 'mercusuar-3d') throw new Error('tidak masuk mercusuar-3d');
  log(`masuk Mercusuar, posisi awal ${JSON.stringify(await debug())}`);
  // Panduan awal Mercusuar menahan gerak sampai ditutup.
  const lewati = page.getByRole('button', { name: L('Lewati panduan', 'Skip guide') });
  if (await lewati.waitFor({ timeout: 4000 }).then(() => true, () => false)) {
    await lewati.click();
    log('panduan dilewati');
  }

  // Jalan kaki ke pintu masuk (menguji kontrol + tabrakan di luar menara).
  await page.keyboard.down('KeyW');
  let d;
  for (let i = 0; i < 40; i++) {
    await t(250);
    d = await debug();
    if (d.nearby === 'masuk') break;
  }
  await page.keyboard.up('KeyW');
  if (d.nearby !== 'masuk') throw new Error(`gagal mencapai pintu masuk: ${JSON.stringify(d)}`);
  await api(() => window.__survivalSains.interaksi());
  await t(300);
  if ((await debug()).nearby === 'masuk') throw new Error('pintu masuk tidak terbuka');
  log('pintu masuk terbuka');

  const bank = await api(() => window.__survivalSains.bank());
  for (let lantai = 0; lantai < 3; lantai++) {
    await api((i) => window.__survivalSains.pintuMercusuar(i), lantai);
    await t(300);
    d = await debug();
    if (d.nearby !== `pintu${lantai}`) throw new Error(`tidak dekat pintu${lantai}: ${JSON.stringify(d)}`);
    void api(() => window.__survivalSains.interaksi());
    await page.waitForSelector('.vn-overlay');
    if (lantai === 0) {
      await page.locator('.vn-teks').click().catch(() => {});
      await page.waitForSelector('.vn-pilihan.jawab').catch(() => {});
      await t(400);
      await foto('final');
    }
    const n = await jalaniPercakapan(bank, lantai === 0);
    const skor = (await api(() => window.__survivalSains.progress())).finalBagian;
    log(`lantai ${lantai}: ${n} soal, skor bagian ${JSON.stringify(skor)}`);
    await api((i) => window.__survivalSains.pintuMercusuar(i), lantai);
    await t(300);
    if ((await debug()).nearby === `pintu${lantai}`) throw new Error(`pintu${lantai} masih terkunci`);
  }

  await api(() => window.__survivalSains.pintuMercusuar(3));
  await t(300);
  d = await debug();
  if (d.nearby !== 'lampu') throw new Error(`tidak di Puncak Lampu: ${JSON.stringify(d)}`);
  void api(() => window.__survivalSains.interaksi());
  await page.waitForSelector('.vn-overlay');
  const n = await jalaniPercakapan(bank);
  log(`Puncak Lampu: ${n} soal`);

  await page.waitForSelector('.cut-overlay', { timeout: 10000 });
  log('lampu menyala, epilog tampil');
  await t(2500);
  await foto('epilog');
  await page.getByRole('button', { name: L(/Lewati/, /Skip/) }).click();
  await t(1500);
  if (SHOTS) {
    await page.setViewportSize({ width: 412, height: 915 }).catch(() => {});
    const s = page.locator('.sertifikat');
    if (await s.count()) {
      await s.scrollIntoViewIfNeeded();
      await t(500);
      await foto('sertifikat', s);
    }
  }
  const prog = await api(() => window.__survivalSains.progress());
  const total = prog.finalBagian.reduce((a, b) => a + b, 0);
  if (!prog.puncakLulus) throw new Error('puncakLulus tidak tersimpan');
  log(`lulus Final, total ${total}/30, mode akhir ${await api(() => window.__survivalSains.mode())}`);

  if (errors.length) {
    console.error('[mercusuar] ERROR:');
    errors.forEach((e) => console.error('  - ' + e));
    process.exitCode = 1;
  } else log('SMOKE MERCUSUAR LULUS TANPA ERROR');
} catch (err) {
  console.error('[mercusuar] GAGAL:', err.message);
  await page.screenshot({ path: 'smoke-mercusuar-gagal.png' }).catch(() => {});
  errors.forEach((e) => console.error('  - ' + e));
  process.exitCode = 1;
} finally {
  await browser.close();
}
