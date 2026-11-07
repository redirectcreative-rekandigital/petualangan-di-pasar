import './styles/main.css';
import './styles/cerita.css';
import './styles/tata-letak.css';
import './styles/menara.css';
import { el, mount } from './ui/components/dom';
import {
  loadProgress,
  saveProgress,
  resetProgress,
  isPuncakUnlocked,
  isBalaiUnlocked,
  balaiKey,
  balaiTujuan,
  tandaiNoktahDikunjungi,
  tahapMisi,
  setTahapMisi,
  tambahAlat,
  catatBaca,
  applyBalaiResult,
  KARAKTER,
} from './core/state';
import { getNoktah, getBalai } from './data/balai';
import { getCerita, balaiSesudah, isiNama, CERITA, URUTAN_BALAI, type CeritaBalai } from './data/cerita';
import { getQuestionBank, getQuestionsByBalai } from './data/bank';
import { createInputManager, type InputManager } from './input/controls';
import { isWebGLAvailable } from './world/webgl';
import type { SceneQuality } from './world/scene';
import type { NoktahWorldHandle, PeranTitik } from './world/noktahWorld';
import { createHud, type Hud } from './ui/hud';
import { showToast } from './ui/dialog';
import { pasangGambar, muatAwal } from './core/gambar';
import { showLoading } from './ui/loading';
import { bukaPercakapan, type Percakapan } from './ui/percakapan';
import { bukaHalamanCerita } from './ui/halamanCerita';
import { jalankanTantangan } from './ui/tantangan';
import { KlienMultiplayer, onlineTersedia, type StatusKlien } from './net/klien';
import { ringkasProgres } from './net/ringkas';
import { renderIntro } from './ui/screens/intro';
import { renderHowto } from './ui/screens/howto';
import { renderMap } from './ui/screens/map';
import { renderResult } from './ui/screens/result';
import { renderAbout } from './ui/screens/about';
import { renderGuru } from './ui/screens/guru';
import { renderFinal } from './ui/screens/final';
import { toggleMuted, isMuted, sfx } from './core/sound';
import { pasangLayarPenuhOtomatis } from './core/layarPenuh';
import { starsForCorrect } from './core/scoring';
import type { ScreenContext, ScreenName } from './ui/screens/context';
import type { NoktahId, Progress, TahapMisi } from '../shared/types';

const appRoot = document.getElementById('app');
if (!appRoot) throw new Error('Elemen #app tidak ditemukan di index.html');
const app: HTMLElement = appRoot;

let progress: Progress = loadProgress();

/* ---------- Klien multiplayer (aktif bila ada token kelas) ---------- */
let klien: KlienMultiplayer | null = null;
let statusKlien: StatusKlien = 'terputus';
let timerPosisi = 0;

function aktifkanKlien(): void {
  const token = progress.token;
  if (!token || !onlineTersedia()) {
    tutupKlien();
    return;
  }
  if (klien && statusKlien !== 'galat' && klien.tokenSaya === token) return;
  tutupKlien();
  klien = new KlienMultiplayer({
    token,
    nama: progress.playerName || 'Siswa',
    gender: progress.gender,
    warnaBaju: progress.warnaBaju,
    warnaBawahan: progress.warnaBawahan,
    warnaHijab: progress.gender === 'perempuan' ? progress.warnaHijab : undefined,
    onPemain: (daftar) => {
      if (session) {
        session.world.setPemainLain(daftar);
        session.hud.setJumlahTeman(daftar.length);
      }
    },
    onStatus: (status) => {
      statusKlien = status;
      if (status === 'terputus' && progress.token) showToast('Koneksi kelas terputus. Coba muat ulang halaman, ya.');
      if (status === 'tersambung') kirimProgresKeServer();
    },
    onKabar: (teks) => showToast(teks),
  });
}

function tutupKlien(): void {
  if (timerPosisi) {
    window.clearInterval(timerPosisi);
    timerPosisi = 0;
  }
  klien?.tutup();
  klien = null;
}

function kirimProgresKeServer(): void {
  if (!klien) return;
  klien.kirimProgres(ringkasProgres(progress, session?.kode ?? null));
}

function simpan(next: Progress): void {
  progress = next;
  saveProgress(progress);
  kirimProgresKeServer();
}

/* ---------- Ketersediaan bank soal ---------- */
function bankReady(): boolean {
  try {
    getQuestionBank();
    return true;
  } catch (err) {
    renderFatal(err instanceof Error ? err.message : String(err));
    return false;
  }
}

/* ---------- Router layar UI (non-3D) ---------- */
const ctx: ScreenContext = {
  navigate: (screen, options) => navigate(screen, options ?? {}),
  getProgress: () => progress,
  setProgress: (next) => simpan(next),
  persist: () => saveProgress(progress),
  reset: () => {
    progress = resetProgress();
    tutupKlien();
    return progress;
  },
};

function navigate(screen: ScreenName, options: Record<string, unknown> = {}): void {
  stopNoktahWorld();
  if (screen === 'map') {
    bukaPeta(options);
    return;
  }
  if (screen === 'noktah') {
    bukaNoktah(options);
    return;
  }
  document.body.classList.remove('world-mode');
  const view = buildScreen(screen);
  if (view) {
    mount(app, view);
    updateMuteButton();
  }
}

function buildScreen(screen: ScreenName): HTMLElement | null {
  if (!bankReady()) return null;
  switch (screen) {
    case 'intro':
      return renderIntro(ctx);
    case 'howto':
      return renderHowto(ctx);
    case 'about':
      return renderAbout(ctx);
    case 'guru':
      return renderGuru(ctx);
    case 'final':
      return renderFinal(ctx);
    case 'result':
      return renderResult(ctx);
    default:
      return renderIntro(ctx);
  }
}

function renderFatal(message: string): void {
  mount(
    app,
    el('section', {
      class: 'screen',
      children: [
        el('div', {
          class: 'card',
          children: [
            el('h2', { text: '⚠️ Bank soal tidak valid' }),
            el('p', { class: 'muted', text: 'Periksa berkas di src/data/questions-ipa/' }),
            el('pre', { text: message, attrs: { style: 'white-space:pre-wrap;font-size:0.85rem' } }),
          ],
        }),
      ],
    }),
  );
}

/* ---------- Tombol bisu efek suara ---------- */
let muteButton: HTMLButtonElement | null = null;
function updateMuteButton(): void {
  if (!muteButton) {
    muteButton = el('button', {
      class: 'mute-btn',
      attrs: { type: 'button', 'aria-label': 'Bisukan atau nyalakan efek suara' },
      on: {
        click: () => {
          const nowMuted = toggleMuted();
          updateMuteButton();
          if (!nowMuted) sfx.click();
        },
      },
    });
    document.body.append(muteButton);
  }
  muteButton.textContent = isMuted() ? '🔇' : '🔊';
}

/* ================================================================== */
/* LAPIS 1: PETA PULAU 3D                                              */
/* ================================================================== */

interface PetaSession {
  handle: import('./world/petaBesar').PetaBesarHandle;
  cleanup: () => void;
}
let petaSession: PetaSession | null = null;

function bukaPeta(options: Record<string, unknown> = {}): void {
  if (!bankReady()) return;
  aktifkanKlien();
  const mulai = (): void => {
    if (!isWebGLAvailable()) {
      renderEmergencyScreen();
      return;
    }
    void buildPeta(options);
  };
  if (options.dariIntro) showLoading(app, { pesan: 'Membuka peta Pulau Nusa Kawruh...' }, mulai);
  else mulai();
}

async function buildPeta(options: Record<string, unknown>): Promise<void> {
  app.innerHTML = '';
  document.body.classList.add('world-mode');
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('aria-label', 'Peta Pulau Nusa Kawruh 3D');
  app.append(canvas);

  const { createPetaBesar } = await import('./world/petaBesar');
  const handle = createPetaBesar(canvas, {
    onPilih: (kode) => {
      sfx.click();
      petaKeNoktah(kode);
    },
    getStatus: (kode) => ({
      terkunci: !isBalaiUnlocked(progress, kode),
      stars: progress.balai[balaiKey(kode)]?.stars ?? 0,
      dikunjungi: tahapMisi(progress, kode) >= 3,
    }),
    getPosisiPemain: () => (options.dari as NoktahId | undefined) ?? balaiTujuan(progress),
    getTujuan: () => balaiTujuan(progress),
    penampilanPemain: {
      gender: progress.gender,
      warnaPakaian: progress.warnaBaju,
      warnaBawahan: progress.warnaBawahan,
      warnaHijab: progress.gender === 'perempuan' ? progress.warnaHijab : undefined,
    },
  });
  petaSession = {
    handle,
    cleanup: () => {
      handle.dispose();
      canvas.remove();
    },
  };
  tambahkanBarPeta();
  tambahkanZoomPeta(handle);
  updateMuteButton();

  const tujuan = balaiTujuan(progress);
  const namaTujuan = tujuan === 'FINAL' ? 'Mercusuar Tua' : (getCerita(tujuan)?.tempat ?? tujuan);
  if (options.pesan) showToast(String(options.pesan), 3600);
  else showToast(`Tujuan berikutnya: ${namaTujuan}. Ketuk penandanya!`, 3200);
}

function tambahkanBarPeta(): void {
  const tujuan = balaiTujuan(progress);
  const namaTujuan = tujuan === 'FINAL' ? '🗼 Mercusuar Tua' : `📍 ${getCerita(tujuan)?.tempat ?? tujuan}`;
  const bar = el('div', {
    class: 'peta-bar',
    children: [
      el('button', {
        class: 'chip tas',
        text: `🎒 ${progress.alat.length}/11`,
        attrs: { type: 'button', 'aria-label': 'Buka tas survival' },
        on: { click: () => bukaTas() },
      }),
      el('button', {
        class: 'btn kecil',
        text: `▶ ${namaTujuan}`,
        attrs: { type: 'button' },
        on: { click: () => { sfx.click(); petaKeNoktah(tujuan); } },
      }),
      el('button', {
        class: 'btn kecil ghost',
        text: '🎓',
        attrs: { type: 'button', 'aria-label': 'Hasil belajar' },
        on: { click: () => { sfx.click(); navigate('result'); } },
      }),
      el('button', {
        class: 'btn kecil ghost',
        text: '☰',
        attrs: { type: 'button', 'aria-label': 'Menu' },
        on: { click: () => { sfx.click(); menuPeta(); } },
      }),
    ],
  });
  app.append(bar);
}

/** Tombol zoom besar di kanan bawah peta: anak tidak perlu mencubit layar. */
function tambahkanZoomPeta(handle: import('./world/petaBesar').PetaBesarHandle): void {
  const tombol = (teks: string, label: string, aksi: () => void): HTMLElement =>
    el('button', {
      class: 'peta-zoom-btn',
      text: teks,
      attrs: { type: 'button', 'aria-label': label, title: label },
      on: { click: () => { sfx.click(); aksi(); } },
    });
  app.append(
    el('div', {
      class: 'peta-zoom',
      children: [
        tombol('➕', 'Perbesar peta', () => handle.zoom(0.7)),
        tombol('➖', 'Perkecil peta', () => handle.zoom(1.4)),
        tombol('🎯', 'Lihat tujuan berikutnya', () => handle.fokusTujuan()),
      ],
    }),
  );
}

function menuPeta(): void {
  const menu = el('div', { class: 'overlay dialog-overlay' });
  const tutup = (): void => menu.remove();
  const tombol = (teks: string, aksi: () => void, kelas = 'btn block'): HTMLElement =>
    el('button', { class: kelas, text: teks, attrs: { type: 'button' }, on: { click: () => { sfx.click(); tutup(); aksi(); } } });
  menu.append(
    el('div', {
      class: 'dialog-panel',
      children: [
        el('h3', { text: '🏝️ Pulau Nusa Kawruh' }),
        tombol('📖 Petunjuk Bermain', () => navigate('howto')),
        tombol('🎓 Hasil Belajar', () => navigate('result'), 'btn secondary block'),
        tombol('🚪 Keluar ke Sampul', () => navigate('intro'), 'btn secondary block'),
        tombol('✖️ Tutup', () => {}, 'btn ghost block'),
      ],
    }),
  );
  app.append(menu);
}

function petaKeNoktah(kode: NoktahId): void {
  if (!isBalaiUnlocked(progress, kode)) {
    if (kode === 'FINAL') showToast('Mercusuar Tua terbuka setelah 11 alat survival terkumpul.');
    else showToast('Jalan ke sana masih tertutup kabut. Selesaikan balai sebelumnya dulu.');
    return;
  }
  const noktah = getNoktah(kode);
  if (!noktah) return;
  if (petaSession) {
    petaSession.cleanup();
    petaSession = null;
  }
  if (kode === 'FINAL') {
    showLoading(app, { pesan: 'Mendaki Mercusuar Tua...' }, () => navigate('final'));
    return;
  }
  showLoading(app, { pesan: `Menuju ${noktah.nama}...` }, () => navigate('noktah', { noktah: kode }));
}

/* ================================================================== */
/* LAPIS 2: DUNIA BALAI 3D                                             */
/* ================================================================== */

interface NoktahSession {
  world: NoktahWorldHandle;
  hud: Hud;
  input: InputManager;
  raf: number;
  kode: NoktahId;
  cerita: CeritaBalai;
  sibuk: boolean;
  cleanup: () => void;
}
let session: NoktahSession | null = null;

function bukaNoktah(options: Record<string, unknown>): void {
  if (!bankReady()) return;
  const kode = (options.noktah as NoktahId | undefined) ?? 'F01';
  const meta = getBalai(kode);
  const cerita = getCerita(kode);
  if (!meta || !cerita) {
    navigate('map');
    return;
  }
  if (!isBalaiUnlocked(progress, kode)) {
    navigate('map', { pesan: 'Balai itu masih tertutup kabut.' });
    return;
  }
  simpan(tandaiNoktahDikunjungi(progress, kode));
  if (!isWebGLAvailable()) {
    renderEmergencyScreen();
    return;
  }
  void buildNoktahWorld(kode, Boolean(options.prolog));
}

async function buildNoktahWorld(kode: NoktahId, prolog: boolean): Promise<void> {
  const meta = getBalai(kode);
  const cerita = getCerita(kode);
  if (!meta || !cerita) return;
  stopNoktahWorld();
  app.innerHTML = '';
  document.body.classList.add('world-mode', 'balai-mode');
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('aria-label', `Dunia 3D ${cerita.tempat}`);
  app.append(canvas);

  const quality: SceneQuality = { pixelRatioCap: 1.5, fogNear: 30, fogFar: 80 };
  if (new URLSearchParams(window.location.search).get('tanpaBayangan') === '1') quality.pixelRatioCap = 1.1;
  const { createNoktahWorld } = await import('./world/noktahWorld');

  const input = createInputManager();
  const world = createNoktahWorld({
    canvas,
    input,
    balai: meta,
    cerita,
    tahap: tahapMisi(progress, kode),
    prolog,
    getProgress: () => progress,
    quality,
  });
  const hud = createHud({
    onInteract: () => void handleInteract(),
    onMenu: openMenu,
    onTas: () => bukaTas(),
    onLompat: () => {
      if (!session?.sibuk) input.pressJump();
    },
    onSapa: (emoji) => {
      sfx.click();
      klien?.kirimSapa(emoji);
    },
  });
  app.append(hud.root);
  input.mountJoystick(hud.root.querySelector('.joystick-host') as HTMLElement);
  hud.updateStats(progress);

  const online = Boolean(progress.token) && onlineTersedia();
  hud.setOnline(online);
  if (online) {
    aktifkanKlien();
    timerPosisi = window.setInterval(() => {
      if (!session || !klien) return;
      const p = session.world.posisiPemain();
      klien.kirimPosisi(session.kode, p.x, p.z, p.rot);
    }, 130);
    kirimProgresKeServer();
  }
  world.setBalaiStars(kode, progress.balai[balaiKey(kode)]?.stars ?? 0);

  let last = performance.now();
  let elapsed = 0;
  let tandaStat = '';
  const loop = (now: number): void => {
    if (!session) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    input.endFrame();
    const sibuk = session.sibuk || document.body.querySelector('.dialog-overlay, .vn-overlay, .cerita-overlay, .hadiah-overlay') !== null;
    if (!sibuk && input.state.interactPressed) void handleInteract();
    world.setPaused(sibuk);
    world.update(dt, elapsed);
    const near = world.getNearby();
    hud.setInteractVisible(near !== null && !sibuk, labelInteraksi(near?.peran));
    const tanda = `${progress.alat.length}|${progress.answers.length}`;
    if (tanda !== tandaStat) {
      tandaStat = tanda;
      hud.updateStats(progress);
    }
    session.raf = requestAnimationFrame(loop);
  };

  session = {
    world,
    hud,
    input,
    raf: 0,
    kode,
    cerita,
    sibuk: false,
    cleanup: () => {
      cancelAnimationFrame(session?.raf ?? 0);
      input.destroy();
      world.dispose();
      hud.destroy();
    },
  };
  perbaruiMisi();
  muatAwal([cerita.penjaga.gambar, cerita.cantrik.gambar]);
  session.raf = requestAnimationFrame(loop);
  updateMuteButton();

  // Prolog: percakapan pertama dimulai otomatis begitu pemain terbangun.
  if (prolog && tahapMisi(progress, kode) === 0) {
    window.setTimeout(() => void percakapanMisi(), 700);
  } else if (tahapMisi(progress, kode) === 0) {
    showToast(`Selamat datang di ${cerita.tempat}! Temui ${cerita.penjaga.nama}.`, 3000);
  }
}

function labelInteraksi(peran: PeranTitik | undefined): string {
  if (!session || !peran) return '🅰️';
  const tahap = tahapMisi(progress, session.kode);
  if (peran === 'penjaga') return '💬 Bicara';
  if (peran === 'cantrik') return '📖 Baca Cerita';
  if (peran === 'uji') return tahap >= 2 ? '🔥 Tantangan' : '🔒 Tempat Uji';
  return '🗺️ Ke Peta';
}

function teksMisi(c: CeritaBalai, tahap: TahapMisi): string {
  if (tahap === 0) return `Temui ${c.penjaga.nama} untuk menerima misi.`;
  if (tahap === 1) return `Baca Halaman Cerita bersama ${c.cantrik.nama}.`;
  if (tahap === 2) return `Jawab tantangan ${c.penjaga.nama} di Tempat Uji.`;
  return `Misi selesai! Lewati gerbang untuk kembali ke peta.`;
}

function perbaruiMisi(): void {
  if (!session) return;
  const t = tahapMisi(progress, session.kode);
  session.hud.setMisi(`${session.cerita.alat.emoji} ${teksMisi(session.cerita, t)}`, t);
  session.world.setTahap(t);
}

function infoPemain(): { nama: string; gender: Progress['gender'] } {
  return { nama: progress.playerName || 'Penjelajah', gender: progress.gender };
}

/** Menjalankan satu percakapan dengan penanda sibuk (dunia dijeda). */
async function denganPercakapan(fn: (p: Percakapan) => Promise<void>): Promise<void> {
  if (!session || session.sibuk) return;
  session.sibuk = true;
  const p = bukaPercakapan(app, infoPemain());
  try {
    await fn(p);
  } finally {
    p.tutup();
    if (session) session.sibuk = false;
    perbaruiMisi();
  }
}

async function handleInteract(): Promise<void> {
  if (!session || session.sibuk) return;
  const near = session.world.getNearby();
  if (!near) return;
  const tahap = tahapMisi(progress, session.kode);
  if (near.peran === 'penjaga') {
    if (tahap === 0) await percakapanMisi();
    else await percakapanPengingat();
  } else if (near.peran === 'cantrik') {
    await bacaCerita();
  } else if (near.peran === 'uji') {
    await tantanganBalai();
  } else {
    await keluarLewatGerbang();
  }
}

/** Tahap 1: Penjaga menjelaskan misi; siswa memilih balasan. */
async function percakapanMisi(): Promise<void> {
  if (!session) return;
  const c = session.cerita;
  await denganPercakapan(async (p) => {
    for (const b of c.misi) {
      if (p.tertutup()) return;
      const teks = isiNama(b.teks, progress.playerName);
      await p.bicara(b.siapa === 'pemain' ? 'pemain' : b.siapa === 'cantrik' ? c.cantrik : c.penjaga, teks);
    }
    const i = await p.pilih('pemain', c.pilihan.map((x) => x.teks), { teks: 'Apa yang ingin kamu katakan?' });
    const pilihan = c.pilihan[i];
    if (pilihan) await p.bicara(c.penjaga, pilihan.balasan);
    await p.bicara(c.penjaga, c.tugas, { labelLanjut: 'Siap! ▶' });
    simpan(setTahapMisi(progress, c.kode, 1));
  });
  if (session) showToast(`📖 Cari ${session.cerita.cantrik.nama}. Ikuti panah kuning!`, 3000);
}

async function percakapanPengingat(): Promise<void> {
  if (!session) return;
  const c = session.cerita;
  const tahap = tahapMisi(progress, c.kode);
  await denganPercakapan(async (p) => {
    if (tahap === 1) await p.bicara(c.penjaga, c.tugas);
    else await p.bicara(c.penjaga, `Alhamdulillah, ${progress.playerName}. Perjalananmu masih panjang. Semangat!`);
  });
}

/** Tahap 2: Halaman Cerita bersama Cantrik. */
async function bacaCerita(): Promise<void> {
  if (!session || session.sibuk) return;
  const c = session.cerita;
  const meta = getBalai(c.kode);
  if (!meta) return;
  const tahap = tahapMisi(progress, c.kode);
  if (tahap === 0) {
    await denganPercakapan(async (p) => {
      await p.bicara(c.cantrik, `Halo! Temui ${c.penjaga.nama} dulu, ya. Beliau punya misi penting untukmu.`);
    });
    return;
  }
  await denganPercakapan(async (p) => {
    await p.bicara(c.cantrik, c.cantrikSapa, { labelLanjut: '📖 Buka Halaman Cerita' });
  });
  if (!session) return;
  session.sibuk = true;
  const hasil = await bukaHalamanCerita(app, { cerita: c, meta });
  if (!session) return;
  session.sibuk = false;
  let next = catatBaca(progress, c.kode, hasil.detik);
  if (hasil.tamat) next = setTahapMisi(next, c.kode, 2);
  simpan(next);
  perbaruiMisi();
  if (hasil.tamat && tahap < 2) {
    await denganPercakapan(async (p) => {
      await p.bicara(c.cantrik, c.cantrikTutup);
    });
    showToast(`🔥 Tempat Uji terbuka! ${c.penjaga.nama} menunggumu.`, 3000);
  } else if (!hasil.tamat) {
    showToast('Selesaikan Halaman Cerita sampai akhir untuk membuka Tempat Uji.', 3000);
  }
}

/** Tahap 3: tantangan soal bersama Penjaga di Tempat Uji. */
async function tantanganBalai(): Promise<void> {
  if (!session) return;
  const c = session.cerita;
  const meta = getBalai(c.kode);
  if (!meta) return;
  const tahap = tahapMisi(progress, c.kode);
  if (tahap < 2) {
    await denganPercakapan(async (p) => {
      await p.bicara(c.penjaga, c.ujiTerkunci);
    });
    return;
  }

  let hasilBenar = -1;
  let jawaban: import('../shared/types').AnswerRecord[] = [];
  await denganPercakapan(async (p) => {
    if (tahap === 3) {
      const i = await p.pilih(c.penjaga, ['🔥 Ya, latihan lagi', 'Nanti saja'], {
        teks: 'Kamu sudah lulus di sini. Mau berlatih lagi untuk menambah bintang?',
      });
      if (i !== 0) return;
    }
    await p.bicara(c.penjaga, c.ujiBuka, { labelLanjut: 'Bismillah ▶' });
    session?.world.setOborUji(0);
    let benarSejauh = 0;
    const hasil = await jalankanTantangan(p, {
      balai: c.kode,
      pool: getQuestionsByBalai(c.kode),
      jumlah: meta.soalPerMain,
      penjaga: c.penjaga,
      pembuka: c.pembukaSoal,
      ingatCerita: async (kodeMateri, adegan) => {
        const cr = getCerita(kodeMateri) ?? c;
        const m = getBalai(cr.kode) ?? meta;
        p.root.classList.add('tersembunyi');
        await bukaHalamanCerita(app, { cerita: cr, meta: m, mulaiDari: adegan, modeIngat: true });
        p.root.classList.remove('tersembunyi');
      },
      onSoalSelesai: (benar) => {
        if (benar) benarSejauh++;
        session?.world.setOborUji(benarSejauh);
      },
    });
    hasilBenar = hasil.benar;
    jawaban = hasil.jawaban;
    if (p.tertutup()) return;
    const bintang = starsForCorrect(hasil.benar);
    if (bintang >= 1) {
      for (const b of c.lulus) await p.bicara(b.siapa === 'pemain' ? 'pemain' : c.penjaga, isiNama(b.teks, progress.playerName));
    } else {
      await p.bicara(c.penjaga, c.gagal);
    }
  });
  if (hasilBenar < 0 || !session) return;

  const sebelumLulus = tahap === 3;
  let next = applyBalaiResult(progress, c.kode, hasilBenar, meta.soalPerMain, jawaban);
  const bintang = starsForCorrect(hasilBenar);
  if (bintang >= 1) {
    next = setTahapMisi(tambahAlat(next, c.kode), c.kode, 3);
    if (c.kode === URUTAN_BALAI[0]) next = { ...next, prologSelesai: true };
  }
  simpan(next);
  session.world.setBalaiStars(c.kode, progress.balai[balaiKey(c.kode)]?.stars ?? 0);
  perbaruiMisi();
  if (bintang >= 1) {
    sfx.win();
    await tampilkanHadiah(c, bintang, !sebelumLulus);
  } else {
    sfx.lose();
  }
}

/** Kartu hadiah: alat survival baru + bintang + hikmah. */
function tampilkanHadiah(c: CeritaBalai, bintang: number, alatBaru: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (session) session.sibuk = true;
    const berikut = balaiSesudah(c.kode);
    const teksBerikut = berikut
      ? `Jalan menuju ${getCerita(berikut)?.tempat ?? berikut} sudah terbuka!`
      : progress.alat.length >= URUTAN_BALAI.length
        ? 'Semua alat terkumpul! Mercusuar Tua sudah terbuka.'
        : 'Kumpulkan semua alat untuk membuka Mercusuar Tua.';
    const ok = el('button', { class: 'btn block', text: 'Alhamdulillah ✨', attrs: { type: 'button' } });
    const overlay = el('div', {
      class: 'overlay hadiah-overlay',
      children: [
        el('div', {
          class: 'hadiah-kartu',
          children: [
            // Dua kelompok: di HP tegak bertumpuk, di layar mendatar jadi dua kolom
            // (alat & bintang di kiri, hikmah & tombol di kanan).
            el('div', {
              class: 'hadiah-kiri',
              children: [
                potretHadiah(c),
                el('div', { class: 'hadiah-label', text: alatBaru ? '🎒 Alat survival baru!' : '⭐ Latihan selesai!' }),
                el('div', { class: 'hadiah-emoji', text: c.alat.emoji }),
                el('h2', { text: c.alat.nama }),
                el('p', { class: 'muted', text: c.alat.guna }),
                el('div', { class: 'hadiah-bintang', text: `${'⭐'.repeat(bintang)}${'☆'.repeat(3 - bintang)}` }),
              ],
            }),
            el('div', {
              class: 'hadiah-kanan',
              children: [
                el('div', { class: 'card jujur', children: [el('span', { class: 'label-kecil', text: '🤲 Hikmah' }), el('p', { text: c.hikmah })] }),
                el('p', { class: 'hadiah-berikut', text: teksBerikut }),
                ok,
              ],
            }),
          ],
        }),
      ],
    });
    ok.addEventListener('click', () => {
      sfx.click();
      overlay.remove();
      if (session) session.sibuk = false;
      showToast('🗺️ Ikuti panah ke gerbang untuk kembali ke peta.', 3000);
      resolve();
    });
    app.append(overlay);
  });
}

function potretHadiah(c: CeritaBalai): HTMLElement {
  const p = el('div', { class: 'hadiah-potret', attrs: { 'aria-hidden': 'true' } });
  pasangGambar(p, c.penjaga.gambar);
  return p;
}

async function keluarLewatGerbang(): Promise<void> {
  if (!session) return;
  const c = session.cerita;
  const tahap = tahapMisi(progress, c.kode);
  let ke = false;
  await denganPercakapan(async (p) => {
    const teks = tahap === 3 ? 'Gerbang menuju peta pulau. Lanjutkan perjalanan?' : 'Misimu di sini belum selesai. Tetap ingin kembali ke peta? Kemajuanmu tersimpan.';
    const i = await p.pilih('pemain', ['🗺️ Ya, ke peta', 'Belum, tetap di sini'], { teks });
    ke = i === 0;
  });
  if (!ke) return;
  const dari = session.kode;
  const berikut = balaiSesudah(dari);
  const pesan = tahap === 3 && berikut ? `Kabut tersibak! Jalan ke ${getCerita(berikut)?.tempat} terbuka.` : undefined;
  showLoading(app, { pesan: 'Kembali ke peta pulau...' }, () => navigate('map', { pesan }));
}

/* ---------- Tas survival ---------- */
function bukaTas(): void {
  if (session) session.sibuk = true;
  const daftar = el('div', { class: 'tas-grid' });
  for (const c of [...CERITA].sort((a, b) => a.urutan - b.urutan)) {
    const punya = progress.alat.includes(c.kode);
    daftar.append(
      el('div', {
        class: `tas-item ${punya ? 'punya' : ''}`,
        children: [
          el('div', { class: 'tas-emoji', text: punya ? c.alat.emoji : '❔' }),
          el('div', { class: 'tas-nama', text: punya ? c.alat.nama : c.tempat }),
          el('div', { class: 'tas-ket', text: punya ? c.alat.guna : `${c.bab}: ${c.judulBab}` }),
        ],
      }),
    );
  }
  const tutup = el('button', { class: 'btn block', text: 'Tutup', attrs: { type: 'button' } });
  const overlay = el('div', {
    class: 'overlay dialog-overlay',
    children: [
      el('div', {
        class: 'dialog-panel tas-panel',
        children: [el('h3', { text: `🎒 Tas Survival (${progress.alat.length}/11)` }), el('p', { class: 'muted', text: 'Kumpulkan 11 alat untuk membuka Mercusuar Tua.' }), daftar, tutup],
      }),
    ],
  });
  tutup.addEventListener('click', () => {
    sfx.click();
    overlay.remove();
    if (session) session.sibuk = false;
  });
  app.append(overlay);
}

function stopNoktahWorld(): void {
  if (session) {
    klien?.kirimPosisi(null, 0, 0, 0);
    session.cleanup();
    session = null;
  }
  if (petaSession) {
    petaSession.cleanup();
    petaSession = null;
  }
  app.querySelectorAll('.vn-overlay, .cerita-overlay, .hadiah-overlay, .dialog-overlay').forEach((n) => n.remove());
  document.body.classList.remove('world-mode', 'balai-mode');
}

function openMenu(): void {
  if (!session || session.sibuk) return;
  session.sibuk = true;
  const menu = el('div', { class: 'overlay dialog-overlay' });
  const close = (): void => {
    menu.remove();
    if (session) session.sibuk = false;
  };
  const c = session.cerita;
  const tombol = (teks: string, aksi: () => void, kelas = 'btn block'): HTMLElement =>
    el('button', { class: kelas, text: teks, attrs: { type: 'button' }, on: { click: () => { sfx.click(); close(); aksi(); } } });
  menu.append(
    el('div', {
      class: 'dialog-panel',
      children: [
        el('h3', { text: `${c.alat.emoji} ${c.tempat}` }),
        el('p', { class: 'muted', text: `${c.bab} · ${c.judulBab}` }),
        el('p', { text: teksMisi(c, tahapMisi(progress, c.kode)) }),
        tombol('📖 Petunjuk Kontrol', () => navigate('howto')),
        tombol('🗺️ Kembali ke Peta', () => navigate('map'), 'btn secondary block'),
        tombol('🎓 Hasil Belajar', () => navigate('result'), 'btn secondary block'),
        tombol('✖️ Tutup', () => {}, 'btn ghost block'),
      ],
    }),
  );
  app.append(menu);
}

/* ---------- Layar darurat (hanya bila WebGL tidak ada) ---------- */
function renderEmergencyScreen(): void {
  stopNoktahWorld();
  mount(
    app,
    el('section', {
      class: 'screen center-screen',
      children: [
        el('div', {
          class: 'card',
          children: [
            el('div', { class: 'hero', children: [el('div', { class: 'emoji', text: '🖥️' }), el('h1', { text: 'Perangkat Belum Mendukung 3D' })] }),
            el('p', { text: 'Survival Sains dimainkan dalam tampilan 3D. Peramban di perangkat ini belum mengaktifkan WebGL.' }),
            el('p', { class: 'muted', text: 'Saran: coba Chrome terbaru, aktifkan akselerasi perangkat keras, atau gunakan perangkat lain.' }),
          ],
        }),
        el('div', {
          class: 'stack',
          children: [
            el('button', { class: 'btn block', text: '🔄 Coba Lagi', attrs: { type: 'button' }, on: { click: () => navigate('map') } }),
            el('button', { class: 'btn ghost block', text: '🗺️ Daftar Balai (tanpa 3D)', attrs: { type: 'button' }, on: { click: () => mount(app, renderMap(ctx)) } }),
          ],
        }),
      ],
    }),
  );
  updateMuteButton();
}

/* ---------- Titik masuk ---------- */
function boot(): void {
  // HP/tablet: layar penuh otomatis sejak ketukan pertama, tegak maupun mendatar.
  pasangLayarPenuhOtomatis(new URLSearchParams(window.location.search).get('layarpenuh') === '1');
  if (!bankReady()) return;
  updateMuteButton();
  navigate('intro');
}
boot();

// Util debug & pintasan uji otomatis.
(window as unknown as { __survivalSains?: unknown }).__survivalSains = {
  bank: () => getQuestionBank(),
  mode: () => (session ? 'balai-3d' : petaSession ? 'peta-3d' : 'ui'),
  debug: () => session?.world.debugState() ?? null,
  progress: () => progress,
  karakter: () => KARAKTER[progress.gender],
  masukBalai: (kode: NoktahId, prolog = false) => navigate('noktah', { noktah: kode, prolog }),
  pindahKe: (peran: PeranTitik) => session?.world.pindahKe(peran) ?? false,
  interaksi: () => handleInteract(),
  kePeta: () => navigate('map'),
  petaLayar: () => petaSession?.handle.posisiLayar() ?? null,
  keFinal: () => navigate('final'),
  isPuncakUnlocked: () => isPuncakUnlocked(progress),
  online: () => ({ status: statusKlien, teman: klien ? klien.terakhirPosisi.length : 0 }),
  sapa: (emoji: string) => klien?.kirimSapa(emoji),
  /** Pintasan uji: luluskan semua balai (untuk menguji Final). */
  luluskanSemua: () => {
    let next = progress;
    for (const k of URUTAN_BALAI) {
      next = applyBalaiResult(next, k, 3, 3, []);
      next = setTahapMisi(tambahAlat(next, k), k, 3);
    }
    simpan({ ...next, prologSelesai: true, introDone: true });
  },
};
