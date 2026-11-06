// Uji asap multiplayer (Playwright): guru buat sesi, dua siswa join,
// masuk noktah yang sama, dan dasbor guru menampilkan keduanya.
//
// Prasyarat: server berjalan (node server/index.mjs) pada BASE.
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:8787/';

const errors = [];
const log = (m) => console.log(`[multi] ${m}`);

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  // --- 1. Guru membuat sesi ---
  const ctxGuru = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const guru = await ctxGuru.newPage();
  guru.on('pageerror', (e) => errors.push(`guru pageerror: ${e.message}`));
  await guru.goto(BASE, { waitUntil: 'networkidle' });
  await guru.locator('button', { hasText: 'Mode Guru' }).click();
  await guru.locator('button', { hasText: 'Buat Sesi Kelas' }).click();
  await guru.waitForSelector('.token-besar', { timeout: 8000 });
  const token = (await guru.locator('.token-besar').textContent()).trim();
  log(`token kelas = ${token}`);
  if (!/^[0-9]{4}$/.test(token)) throw new Error('Token bukan 4 digit angka');

  // --- 2. Dua siswa join dengan token yang sama ---
  const rahasia = (nama) =>
    `(async () => {
       localStorage.setItem('petualangan-di-pasar:progress:v2', JSON.stringify({
         playerName: '${nama}', gender: 'laki-laki', introDone: true, coins: 0,
         visitedNoktah: [], unlocked: [], balai: {}, answers: [], puncakLulus: false, token: '${token}'
       }));
     })()`;

  async function siswa(nama) {
    const c = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push(`${nama} pageerror: ${e.message}`));
    await p.goto(BASE, { waitUntil: 'networkidle' });
    await p.evaluate(rahasia(nama));
    await p.reload({ waitUntil: 'networkidle' });
    // Progres sudah ada -> tombol "Lanjutkan Petualangan" menuju peta langsung.
    await p.locator('button', { hasText: 'Lanjutkan Petualangan' }).click();
    await p.waitForSelector('canvas.world-canvas', { timeout: 20000 });
    // Tunggu status online tersambung.
    for (let i = 0; i < 30; i++) {
      const st = await p.evaluate(() => window.__petualanganDiPasar?.online?.());
      if (st && st.status === 'tersambung') return { c, p, st };
      await p.waitForTimeout(300);
    }
    return { c, p, st: await p.evaluate(() => window.__petualanganDiPasar?.online?.()) };
  }

  const a = await siswa('Ani');
  log(`Ani online: ${JSON.stringify(a.st)}`);
  const b = await siswa('Budi');
  log(`Budi online: ${JSON.stringify(b.st)}`);

  // --- 3. Keduanya masuk noktah B01 dan saling lihat ---
  await a.p.evaluate(() => window.__petualanganDiPasar?.masukNoktah?.('B01'));
  await b.p.evaluate(() => window.__petualanganDiPasar?.masukNoktah?.('B01'));
  await a.p.waitForTimeout(2500);

  const temanA = await a.p.evaluate(() => window.__petualanganDiPasar?.online?.());
  const temanB = await b.p.evaluate(() => window.__petualanganDiPasar?.online?.());
  log(`teman Ani: ${JSON.stringify(temanA)} | teman Budi: ${JSON.stringify(temanB)}`);
  if (!temanA || temanA.teman < 1) throw new Error('Ani tidak melihat Budi');
  if (!temanB || temanB.teman < 1) throw new Error('Budi tidak melihat Ani');

  // --- 4. Dasbor guru menampilkan 2 siswa ---
  await guru.waitForTimeout(3500);
  const kartu = await guru.locator('.kartu-siswa').count();
  const namaKelas = await guru.locator('.kartu-siswa .nama-siswa').allTextContents();
  log(`dasbor: ${kartu} siswa -> ${namaKelas.join(', ')}`);
  if (kartu < 2) throw new Error('Dasbor guru tidak menampilkan 2 siswa');

  await a.c.close();
  await b.c.close();
  await ctxGuru.close();

  if (errors.length) {
    console.error('[multi] ERROR:');
    errors.forEach((e) => console.error('  - ' + e));
    process.exitCode = 1;
  } else {
    log('MULTIPLAYER LULUS TANPA ERROR');
  }
} catch (err) {
  console.error('[multi] GAGAL:', err.message);
  errors.forEach((e) => console.error('  - ' + e));
  process.exitCode = 1;
} finally {
  await browser.close();
}
