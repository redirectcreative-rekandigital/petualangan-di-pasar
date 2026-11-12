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
  totalStars,
  maxStars,
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
  sudahPanduan,
  tandaiPanduan,
  ulangPanduan,
} from './core/state';
import { getNoktah, getBalai } from './data/balai';
import { getCerita, balaiSesudah, isiNama, CERITA, URUTAN_BALAI, type CeritaBalai } from './data/cerita';
import { getQuestionBank, getQuestionsByBalai } from './data/bank';
import { createInputManager, type InputManager } from './input/controls';
import { isWebGLAvailable } from './world/webgl';
import { catatFrame } from './core/kualitas';
import { pantauOverlay } from './ui/pantauOverlay';
import { putarPanduan, langkahPanduan } from './ui/panduan';
import { buatBilahTujuan } from './ui/hud';
import type { SceneQuality } from './world/scene';
import type { NoktahWorldHandle, PeranNpc, PeranTitik } from './world/noktahWorld';
import { createHud, type Hud } from './ui/hud';
import { showToast } from './ui/dialog';
import { pasangGambar, muatAwal } from './core/gambar';
import { tampilkanLoading } from './ui/loading';
import { bukaPercakapan, type InfoPemain, type Percakapan } from './ui/percakapan';
import { kostumDari } from './core/kostumPemain';
import { muatModeKamera, modeBerikut, simpanModeKamera } from './world/camera';
import { bukaHalamanCerita } from './ui/halamanCerita';
import { jalankanTantangan } from './ui/tantangan';
import { KlienMultiplayer, onlineTersedia, type StatusKlien } from './net/klien';
import { ringkasProgres } from './net/ringkas';
import { renderIntro } from './ui/screens/intro';
import { renderHowto, bukaPetunjukModal, type AsalPetunjuk } from './ui/screens/howto';
import { renderMap } from './ui/screens/map';
import { renderResult } from './ui/screens/result';
import { renderAbout } from './ui/screens/about';
import { renderGuru } from './ui/screens/guru';
import { bukaMercusuar, type SesiMercusuar } from './ui/mercusuar';
import { sfx } from './core/sound';
import { pasangLayarPenuhOtomatis } from './core/layarPenuh';
import { skorJawaban, starsForSkor } from './core/scoring';
import type { ScreenContext, ScreenName } from './ui/screens/context';
import type { IdPanduan, NoktahId, Progress, TahapMisi } from '../shared/types';
import { t, BAHASA, aturPenyimpanPosisi, ambilPosisiTersimpan } from './core/bahasa';
import { bukaKunciSuara } from './core/suara';
import { bukaPengaturan } from './ui/pengaturan';
import { jadikanModalAktif, pasangTutupUmum, tombolTutupX, tutupModalAktif } from './ui/modal';
import { aturAksiKelas, parkirProfil, ambilProfilSendiri, profilSendiriBaru, buatIdSiswa } from './core/profil';

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
  // Profil kelas lama (sebelum ada ID tetap): beri ID sekali, lalu simpan.
  if (!progress.idSiswa) {
    progress = { ...progress, idSiswa: buatIdSiswa() };
    saveProgress(progress);
  }
  klien = new KlienMultiplayer({
    token,
    idSiswa: progress.idSiswa,
    nama: progress.playerName || 'Siswa',
    gender: progress.gender,
    warnaBaju: progress.warnaBaju,
    warnaBawahan: progress.warnaBawahan,
    warnaHijab: progress.gender === 'perempuan' ? progress.warnaHijab : undefined,
    kostum: kostumDari(progress),
    onPemain: (daftar) => {
      if (session) {
        session.world.setPemainLain(daftar);
        session.hud.setJumlahTeman(daftar.length);
      }
    },
    onStatus: (status) => {
      statusKlien = status;
      if (status === 'terputus' && progress.token) showToast(t('Koneksi kelas terputus. Coba muat ulang halaman, ya.'));
      if (status === 'tersambung') kirimProgresKeServer();
    },
    onKabar: (teks) => showToast(teks),
    onJeda: tampilkanJeda,
    onUmum: (teks) => showToast(`📢 ${teks}`, 8000),
    onBerakhir: (alasan) => {
      showToast(alasan === 'selesai' ? t('Sesi kelas diakhiri guru. Terima kasih sudah belajar!') : t('Kamu dikeluarkan dari kelas ini oleh gurumu.'), 8000);
      if (alasan === 'dikeluarkan') progress = { ...progress, token: undefined };
      saveProgress(progress);
    },
  });
}

/** Lapisan jeda dari guru: menutup layar dan menahan sentuhan; jawaban yang sedang dikerjakan tidak hilang. */
function tampilkanJeda(jeda: boolean): void {
  document.getElementById('jeda-guru')?.remove();
  if (!jeda) return;
  const o = document.createElement('div');
  o.id = 'jeda-guru';
  o.setAttribute('role', 'alert');
  o.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;text-align:center;padding:24px;background:rgba(15,23,42,.94);color:#fff;font:700 1.6rem system-ui,sans-serif;touch-action:none';
  o.textContent = t('👀 Lihat ke depan, ya. Gurumu sedang menjelaskan.');
  document.body.append(o);
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
    const lama = progress;
    progress = resetProgress();
    // Mulai dari awal di kelas: tetap di kelas yang sama dengan ID yang sama
    // (satu baris di dasbor guru, progresnya diulang).
    if (lama.token) {
      progress = { ...progress, token: lama.token, idSiswa: lama.idSiswa };
      saveProgress(progress);
    }
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
  if (screen === 'final') {
    bukaFinal();
    return;
  }
  document.body.classList.remove('world-mode');
  const view = buildScreen(screen, options);
  if (view) {
    mount(app, view);
  }
}

function buildScreen(screen: ScreenName, options: Record<string, unknown> = {}): HTMLElement | null {
  if (!bankReady()) return null;
  switch (screen) {
    case 'intro':
      return renderIntro(ctx);
    case 'howto':
      return renderHowto(ctx, (options.dari as AsalPetunjuk | undefined) ?? 'map');
    case 'about':
      return renderAbout(ctx);
    case 'guru':
      return renderGuru(ctx);
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
            el('h2', { text: t('⚠️ Bank soal tidak valid') }),
            el('p', { class: 'muted', text: t('Periksa berkas di src/data/questions-ipa/') }),
            el('pre', { text: message, attrs: { style: 'white-space:pre-wrap;font-size:0.85rem' } }),
          ],
        }),
      ],
    }),
  );
}

/* ================================================================== */
/* LAPIS 1: PETA PULAU 3D                                              */
/* ================================================================== */

interface PetaSession {
  handle: import('./world/petaBesar').PetaBesarHandle;
  cleanup: () => void;
}
let petaSession: PetaSession | null = null;
/** Balai tempat pemain berdiri di peta (dipakai untuk memulihkan posisi). */
let petaDari: NoktahId | null = null;

/** Posisi pemain di dunia balai yang disimpan sebelum ganti bahasa. */
interface PosisiBalai {
  x: number;
  z: number;
  rot: number;
  yaw?: number;
}

/** Tempat pemain berada, disimpan sebelum game dimuat ulang (ganti bahasa). */
type PosisiLanjut =
  { layar: 'noktah'; noktah: NoktahId; posisi: PosisiBalai } | { layar: 'map'; dari: NoktahId | null };

function bukaPeta(options: Record<string, unknown> = {}): void {
  if (!bankReady()) return;
  aktifkanKlien();
  if (!isWebGLAvailable()) {
    renderEmergencyScreen();
    return;
  }
  void buildPeta(options);
}

async function buildPeta(options: Record<string, unknown>): Promise<void> {
  petaDari = (options.dari as NoktahId | undefined) ?? null;
  app.innerHTML = '';
  document.body.classList.add('world-mode');
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('aria-label', 'Peta Pulau Wonorejo 3D');
  app.append(canvas);
  // Loading bertahan sampai rumah GLB termuat dan shader siap (handle.siap).
  const loading = tampilkanLoading(app, { pesan: String(options.pesanLoading ?? t('Membuka peta Pulau Wonorejo...')) });

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
  await handle.siap.catch((err: unknown) => console.error(err));
  loading.tutup();
  if (petaSession?.handle !== handle) return;
  await panduan('peta');
  if (petaSession?.handle !== handle) return;

  const tujuan = balaiTujuan(progress);
  const namaTujuan = tujuan === 'FINAL' ? t('Mercusuar Tua') : (getCerita(tujuan)?.tempat ?? tujuan);
  if (options.pesan) showToast(String(options.pesan), 3600);
  else showToast(t('Tujuan berikutnya: {namaTujuan}. Ketuk penandanya!', { namaTujuan }), 3200);
}

function tambahkanBarPeta(): void {
  const tujuan = balaiTujuan(progress);
  const namaTujuan = tujuan === 'FINAL' ? `🗼 ${t('Mercusuar Tua')}` : `📍 ${getCerita(tujuan)?.tempat ?? tujuan}`;
  const bar = el('div', {
    class: 'peta-bar',
    children: [
      el('button', {
        class: 'chip tas',
        text: t('🎒 Tas {jumlah}/11', { jumlah: progress.alat.length }),
        attrs: { type: 'button', 'aria-label': t('Buka tas survival') },
        on: { click: () => bukaTas() },
      }),
      el('button', {
        class: 'chip progress',
        text: `⭐ ${totalStars(progress)}/${maxStars()}`,
        attrs: { type: 'button', 'aria-label': t('Lihat bintang belajar') },
        on: { click: () => bukaBintang() },
      }),
      el('button', {
        class: 'btn kecil peta-tujuan',
        text: `▶ ${namaTujuan}`,
        attrs: { type: 'button' },
        on: {
          click: () => {
            sfx.click();
            petaKeNoktah(tujuan);
          },
        },
      }),
      el('button', {
        class: 'btn kecil ghost',
        text: '☰',
        attrs: { type: 'button', 'aria-label': t('Menu') },
        on: {
          click: () => {
            sfx.click();
            menuPeta();
          },
        },
      }),
    ],
  });
  // Bilah 👉 "habis ini ngapain" di peta (sama dengan bilah tujuan di balai).
  const bilah = buatBilahTujuan();
  const tempatTujuan = tujuan === 'FINAL' ? t('Mercusuar Tua') : (getCerita(tujuan)?.tempat ?? tujuan);
  bilah.setTeks(t('Ketuk {tempat} di peta, atau tombol ▶ di atas.', { tempat: tempatTujuan }));
  app.append(bar, el('div', { class: 'peta-bilah', children: [bilah.root] }));
}

/** Tombol zoom besar di kanan bawah peta: anak tidak perlu mencubit layar. */
function tambahkanZoomPeta(handle: import('./world/petaBesar').PetaBesarHandle): void {
  const tombol = (teks: string, label: string, aksi: () => void): HTMLElement =>
    el('button', {
      class: 'peta-zoom-btn',
      text: teks,
      attrs: { type: 'button', 'aria-label': label, title: label },
      on: {
        click: () => {
          sfx.click();
          aksi();
        },
      },
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
  const menu = el('div', { class: 'overlay dialog-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
  const tutup = (): void => {
    menu.remove();
    lepasEsc();
    lepas();
  };
  const lepas = jadikanModalAktif(tutup);
  const lepasEsc = pasangTutupUmum(menu, tutup);
  const tombol = (teks: string, aksi: () => void, kelas = 'btn block'): HTMLElement =>
    el('button', {
      class: kelas,
      text: teks,
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          tutup();
          aksi();
        },
      },
    });
  menu.append(
    el('div', {
      class: 'dialog-panel menu-panel',
      children: [
        tombolTutupX(tutup),
        el('h3', { text: t('🏝️ Pulau Wonorejo') }),
        el('div', {
          class: 'menu-tombol',
          children: [
            tombol(t('📖 Petunjuk Bermain'), () => navigate('howto', { dari: 'map' })),
            tombol(t('⚙️ Pengaturan'), () => bukaPengaturan(app), 'btn secondary block'),
            tombol(t('🎓 Hasil Belajar'), () => navigate('result'), 'btn secondary block'),
            tombol(t('🧭 Ulangi Panduan'), ulangiPanduan, 'btn secondary block'),
            tombol(t('🏠 Kembali ke Menu Utama'), () => navigate('intro'), 'btn secondary block'),
          ],
        }),
      ],
    }),
  );
  app.append(menu);
}

function petaKeNoktah(kode: NoktahId): void {
  if (!isBalaiUnlocked(progress, kode)) {
    if (kode === 'FINAL') showToast(t('Mercusuar Tua terbuka setelah 11 alat survival terkumpul.'));
    else showToast(t('Jalan ke sana masih tertutup kabut. Selesaikan balai sebelumnya dulu.'));
    return;
  }
  const noktah = getNoktah(kode);
  if (!noktah) return;
  if (petaSession) {
    petaSession.cleanup();
    petaSession = null;
  }
  if (kode === 'FINAL') {
    navigate('final');
    return;
  }
  navigate('noktah', { noktah: kode });
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
/** Dunia 3D Mercusuar Tua (Final), terpisah dari dunia balai. */
let mercusuar: SesiMercusuar | null = null;

function bukaFinal(): void {
  if (!bankReady()) return;
  if (!isPuncakUnlocked(progress)) {
    navigate('map', { pesan: t('Mercusuar Tua terbuka setelah 11 alat survival terkumpul.') });
    return;
  }
  if (!isWebGLAvailable()) {
    renderEmergencyScreen();
    return;
  }
  app.innerHTML = '';
  document.body.classList.add('world-mode', 'balai-mode');
  mercusuar = bukaMercusuar({ app, ctx, onMenu: openMenu, onTas: bukaTas, onBintang: bukaBintang, onSiap: () => void panduan('mercusuar') });
}

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
    navigate('map', { pesan: t('Balai itu masih tertutup kabut.') });
    return;
  }
  simpan(tandaiNoktahDikunjungi(progress, kode));
  if (!isWebGLAvailable()) {
    renderEmergencyScreen();
    return;
  }
  void buildNoktahWorld(kode, Boolean(options.prolog), options.posisi as PosisiBalai | undefined);
}

/** Bertambah tiap kali dunia dibangun/ditutup, untuk membatalkan pemuatan yang basi. */
let bangunDuniaKe = 0;

async function buildNoktahWorld(kode: NoktahId, prolog: boolean, posisi?: PosisiBalai): Promise<void> {
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
  // Loading bertahan sampai aset dimuat dan shader/tekstur disiapkan (world.siapkan).
  const loading = tampilkanLoading(app, { pesan: t('Menuju {nama}...', { nama: getNoktah(kode)?.nama ?? cerita.tempat }) });

  // Mode ringan (core/kualitas.ts) mengatur DPR & bayangan; ini batas atas kualitas penuh.
  const quality: SceneQuality = { pixelRatioCap: 1.5, fogNear: 30, fogFar: 80 };
  const idBangun = ++bangunDuniaKe;
  let aset: import('./world/asetBab').AsetBab;
  let lepasAsetBab: typeof import('./world/asetBab').lepasAsetBab;
  let createNoktahWorld: typeof import('./world/noktahWorld').createNoktahWorld;
  try {
    const [modDunia, modAset] = await Promise.all([import('./world/noktahWorld'), import('./world/asetBab')]);
    createNoktahWorld = modDunia.createNoktahWorld;
    lepasAsetBab = modAset.lepasAsetBab;
    aset = await modAset.muatAsetBab(kode);
  } catch (err) {
    console.error(err);
    if (idBangun === bangunDuniaKe) navigate('map', { pesan: t('Gagal memuat {tempat}. Periksa koneksi lalu coba lagi.', { tempat: cerita.tempat }) });
    return;
  }
  // Pemain sudah berpindah layar selama aset dimuat.
  if (idBangun !== bangunDuniaKe) return;

  const input = createInputManager();
  const world = createNoktahWorld({
    canvas,
    input,
    balai: meta,
    cerita,
    tahap: tahapMisi(progress, kode),
    prolog,
    aset,
    getProgress: () => progress,
    quality,
  });
  let modeKamera = muatModeKamera();
  const labelKamera = (): string => ({ normal: t('Normal'), dekat: t('Dekat'), tangan: t('Tangan') })[modeKamera];
  const hud = createHud({
    onInteract: () => void handleInteract(),
    onMenu: openMenu,
    onTas: () => bukaTas(),
    onBintang: () => bukaBintang(),
    onLompat: () => {
      if (!session?.sibuk) input.pressJump();
    },
    onKunciLari: () => {
      sfx.click();
      input.toggleLari();
    },
    onKamera: () => {
      sfx.click();
      modeKamera = modeBerikut(modeKamera);
      simpanModeKamera(modeKamera);
      world.setModeKamera(modeKamera);
      hud.setModeKamera(labelKamera());
    },
    onSapa: (emoji) => {
      sfx.click();
      klien?.kirimSapa(emoji);
      world.sapaSendiri(emoji);
    },
  });
  world.setModeKamera(modeKamera);
  hud.setModeKamera(labelKamera());
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
  let kunciLariSampai = 0;
  const overlay = pantauOverlay();
  const loop = (now: number): void => {
    if (!session) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    input.endFrame();
    const sibuk = session.sibuk || overlay.adaOverlay();
    if (!sibuk && input.state.interactPressed) void handleInteract();
    if (!sibuk && input.state.menuPressed) openMenu();
    // Layar tertutup penuh (cutscene, Halaman Cerita di mode ringan): dunia 3D tak perlu digambar.
    if (overlay.tertutupPenuh()) {
      session.raf = requestAnimationFrame(loop);
      return;
    }
    catatFrame(now);
    world.setPaused(sibuk);
    world.update(dt, elapsed);
    const near = world.getNearby();
    hud.setInteractVisible(near !== null && !sibuk, labelInteraksi(near?.peran));
    const titikAksi = world.layarTitikDekat();
    if (titikAksi) hud.setInteractPos(titikAksi.x, titikAksi.y);
    // Bertahan 2,5 detik setelah berhenti: satu jempol sempat melepas joystick lalu mengetuknya.
    if (input.state.moving) kunciLariSampai = now + 2500;
    hud.setKunciLari(!sibuk && (input.state.lari || now < kunciLariSampai), input.state.lari);
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
      overlay.lepas();
      input.destroy();
      world.dispose();
      hud.destroy();
      // Sinkron: bila dibuat async, dunia berikutnya (balai sama) bisa ikut kehilangan asetnya.
      lepasAsetBab(kode);
    },
  };
  perbaruiMisi();
  muatAwal([cerita.penjaga.gambar, cerita.cantrik.gambar]);
  await world.siapkan().catch((err: unknown) => console.error(err));
  loading.tutup();
  if (session?.world !== world) return;
  last = performance.now();
  session.raf = requestAnimationFrame(loop);

  // Kembali dari ganti bahasa: letakkan pemain di tempat semula, tanpa sapaan awal.
  if (posisi) {
    world.letakkanPemain(posisi);
    void panduanBalai();
    return;
  }

  // Prolog: percakapan pertama dimulai otomatis begitu pemain terbangun.
  if (prolog && tahapMisi(progress, kode) === 0) {
    session.sibuk = true;
    void world.adeganBangun().then(() => {
      if (session?.world !== world) return;
      session.sibuk = false;
      window.setTimeout(() => void percakapanMisi(), 300);
    });
  } else {
    // Prolog menunggu dialog misi pertama (lihat percakapanMisi); balai lain langsung.
    // Sapaan menyusul setelah panduan agar tidak menutupi balonnya.
    void panduanBalai().then(() => {
      if (session?.world !== world || tahapMisi(progress, kode) !== 0) return;
      showToast(t('Selamat datang di {tempat}! Temui {nama}.', { tempat: cerita.tempat, nama: cerita.penjaga.nama }), 3000);
    });
  }
}

/* ---------- Panduan awal (ui/panduan.ts) ---------- */

function sedangOnline(): boolean {
  return Boolean(progress.token) && onlineTersedia();
}

/** Memutar panduan satu layar, sekali per siswa. Dunia dijeda selama panduan tampil. */
async function panduan(id: IdPanduan): Promise<void> {
  if (sudahPanduan(progress, id)) return;
  const dunia = session ?? mercusuar;
  const sibukLama = dunia?.sibuk ?? false;
  if (dunia) dunia.sibuk = true;
  const online = id === 'balai' && sedangOnline();
  try {
    await putarPanduan(langkahPanduan(id, { online }), app);
  } finally {
    if (dunia) dunia.sibuk = sibukLama;
  }
  let next = tandaiPanduan(progress, id);
  if (online) next = tandaiPanduan(next, 'sapa');
  simpan(next);
}

/** Menu "🧭 Ulangi Panduan": putar panduan layar ini sekarang; layar lain menyusul saat dikunjungi. */
function ulangiPanduan(): void {
  simpan(ulangPanduan(progress));
  if (session) void panduanBalai();
  else if (mercusuar) void panduan('mercusuar');
  else if (petaSession) void panduan('peta');
}

/** Panduan balai; bila sudah dilihat saat main sendiri, langkah 😊 Sapa muncul sekali saat online. */
async function panduanBalai(): Promise<void> {
  if (!session) return;
  await panduan('balai');
  if (session && sedangOnline()) await panduan('sapa');
}

function labelInteraksi(peran: PeranTitik | undefined): string {
  if (!session || !peran) return '🅰️';
  const tahap = tahapMisi(progress, session.kode);
  if (peran === 'penjaga') return t('💬 Bicara');
  if (peran === 'cantrik') return t('📖 Baca Cerita');
  if (peran === 'uji') return tahap >= 2 ? t('🔥 Tantangan') : t('🔒 Tempat Uji');
  return t('🗺️ Ke Peta');
}

function teksMisi(c: CeritaBalai, tahap: TahapMisi): string {
  if (tahap === 0) return t('Temui {nama} untuk menerima misi.', { nama: c.penjaga.nama });
  if (tahap === 1) return t('Baca Halaman Cerita bersama {nama}.', { nama: c.cantrik.nama });
  if (tahap === 2) return t('Jawab tantangan {nama} di Tempat Uji.', { nama: c.penjaga.nama });
  return t('Misi selesai! Lewati gerbang untuk kembali ke peta.');
}

function perbaruiMisi(): void {
  if (!session) return;
  const tahap = tahapMisi(progress, session.kode);
  session.hud.setMisi(`${session.cerita.alat.emoji} ${teksMisi(session.cerita, tahap)}`, tahap);
  session.world.setTahap(tahap);
}

function infoPemain(): InfoPemain {
  return { nama: progress.playerName || t('Penjelajah'), gender: progress.gender, kostum: kostumDari(progress) };
}

/**
 * Menjalankan satu percakapan dengan penanda sibuk (dunia dijeda).
 * Mengembalikan `true` bila pemain menutupnya lewat tombol ✕.
 */
async function denganPercakapan(fn: (p: Percakapan) => Promise<void>, npc: PeranNpc | null = 'penjaga'): Promise<boolean> {
  if (!session || session.sibuk) return true;
  session.sibuk = true;
  session.world.npcBicara(npc);
  session.world.fokusPercakapan(npc ?? 'gerbang');
  const p = bukaPercakapan(app, infoPemain());
  try {
    await fn(p);
    return p.tertutup();
  } finally {
    p.tutup();
    if (session) {
      session.sibuk = false;
      session.world.npcBicara(null);
      session.world.fokusPercakapan(null);
    }
    perbaruiMisi();
  }
}

async function handleInteract(): Promise<void> {
  if (!session || session.sibuk) return;
  const near = session.world.getNearby();
  if (!near) return;
  session.world.animasiInteraksi();
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
  const batal = await denganPercakapan(async (p) => {
    for (const b of c.misi) {
      if (p.tertutup()) return;
      const teks = isiNama(b.teks, progress.playerName);
      await p.bicara(b.siapa === 'pemain' ? 'pemain' : b.siapa === 'cantrik' ? c.cantrik : c.penjaga, teks);
    }
    const i = await p.pilih(
      'pemain',
      c.pilihan.map((x) => x.teks),
      { teks: t('Apa yang ingin kamu katakan?') },
    );
    const pilihan = c.pilihan[i];
    if (pilihan) await p.bicara(c.penjaga, pilihan.balasan);
    session?.world.npcInteraksi('penjaga');
    await p.bicara(c.penjaga, c.tugas, { labelLanjut: t('Siap! ▶') });
    if (p.tertutup()) return;
    simpan(setTahapMisi(progress, c.kode, 1));
  });
  if (batal) return;
  if (session) showToast(t('📖 Cari {nama}. Ikuti panah kuning!', { nama: session.cerita.cantrik.nama }), 3000);
  // Panduan kontrol tepat setelah misi pertama diterima: kini anak tahu harus ke mana.
  await panduanBalai();
}

async function percakapanPengingat(): Promise<void> {
  if (!session) return;
  const c = session.cerita;
  const tahap = tahapMisi(progress, c.kode);
  await denganPercakapan(async (p) => {
    if (tahap === 1) await p.bicara(c.penjaga, c.tugas);
    else
      await p.bicara(
        c.penjaga,
        t('Alhamdulillah, {playerName}. Perjalananmu masih panjang. Semangat!', { playerName: progress.playerName }),
      );
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
      await p.bicara(
        c.cantrik,
        t('Halo! Temui {nama} dulu, ya. Beliau punya misi penting untukmu.', { nama: c.penjaga.nama }),
      );
    }, 'cantrik');
    return;
  }
  const batal = await denganPercakapan(async (p) => {
    session?.world.npcInteraksi('cantrik');
    await p.bicara(c.cantrik, c.cantrikSapa, { labelLanjut: t('📖 Buka Halaman Cerita') });
  }, 'cantrik');
  if (batal || !session) return;
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
    }, 'cantrik');
    showToast(t('🔥 Tempat Uji terbuka! {nama} menunggumu.', { nama: c.penjaga.nama }), 3000);
  } else if (!hasil.tamat && tahap < 2) {
    showToast(t('Selesaikan Halaman Cerita sampai akhir untuk membuka Tempat Uji.'), 3000);
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
      const i = await p.pilih(c.penjaga, [t('🔥 Ya, latihan lagi'), t('Nanti saja')], {
        teks: t('Kamu sudah lulus di sini. Mau berlatih lagi untuk menambah bintang?'),
      });
      if (i !== 0) return;
    }
    await p.bicara(c.penjaga, c.ujiBuka, { labelLanjut: t('Bismillah ▶') });
    if (p.tertutup()) return;
    await panduan('uji');
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
    // Ditutup lewat ✕ di tengah soal: percobaan ini tidak dinilai.
    if (p.tertutup()) return;
    hasilBenar = hasil.benar;
    jawaban = hasil.jawaban;
    const bintang = starsForSkor(skorJawaban(hasil.jawaban));
    if (bintang >= 1) {
      for (const b of c.lulus)
        await p.bicara(b.siapa === 'pemain' ? 'pemain' : c.penjaga, isiNama(b.teks, progress.playerName));
    } else {
      await p.bicara(c.penjaga, c.gagal);
    }
  });
  if (hasilBenar < 0 || !session) return;

  const sebelumLulus = tahap === 3;
  let next = applyBalaiResult(progress, c.kode, hasilBenar, meta.soalPerMain, jawaban);
  const bintang = starsForSkor(jawaban.length ? skorJawaban(jawaban) : hasilBenar);
  if (bintang >= 1) {
    next = setTahapMisi(tambahAlat(next, c.kode), c.kode, 3);
    if (c.kode === URUTAN_BALAI[0]) next = { ...next, prologSelesai: true };
  }
  simpan(next);
  session.world.setBalaiStars(c.kode, progress.balai[balaiKey(c.kode)]?.stars ?? 0);
  perbaruiMisi();
  if (bintang >= 1) {
    sfx.win();
    session.world.npcInteraksi('penjaga');
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
      ? t('Jalan menuju {tempat} sudah terbuka!', { tempat: getCerita(berikut)?.tempat ?? berikut })
      : progress.alat.length >= URUTAN_BALAI.length
        ? t('Semua alat terkumpul! Mercusuar Tua sudah terbuka.')
        : t('Kumpulkan semua alat untuk membuka Mercusuar Tua.');
    const ok = el('button', { class: 'btn block', text: t('Alhamdulillah ✨'), attrs: { type: 'button' } });
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
                el('div', {
                  class: 'hadiah-label',
                  text: alatBaru ? t('🎒 Alat survival baru!') : t('⭐ Latihan selesai!'),
                }),
                el('div', { class: 'hadiah-emoji', text: c.alat.emoji }),
                el('h2', { text: c.alat.nama }),
                el('p', { class: 'muted', text: c.alat.guna }),
                el('div', { class: 'hadiah-bintang', text: `${'⭐'.repeat(bintang)}${'☆'.repeat(3 - bintang)}` }),
              ],
            }),
            el('div', {
              class: 'hadiah-kanan',
              children: [
                el('div', {
                  class: 'card jujur',
                  children: [el('span', { class: 'label-kecil', text: t('🤲 Hikmah') }), el('p', { text: c.hikmah })],
                }),
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
      showToast(t('🗺️ Ikuti panah ke gerbang untuk kembali ke peta.'), 3000);
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
    const teks =
      tahap === 3
        ? t('Gerbang menuju peta pulau. Lanjutkan perjalanan?')
        : t('Misimu di sini belum selesai. Tetap ingin kembali ke peta? Kemajuanmu tersimpan.');
    const i = await p.pilih('pemain', [t('🗺️ Ya, ke peta'), t('Belum, tetap di sini')], { teks });
    ke = i === 0;
  }, null);
  if (!ke) return;
  const dari = session.kode;
  const berikut = balaiSesudah(dari);
  const pesan =
    tahap === 3 && berikut
      ? t('Kabut tersibak! Jalan ke {tempat} terbuka.', { tempat: getCerita(berikut)?.tempat ?? berikut })
      : undefined;
  navigate('map', { pesan, pesanLoading: t('Kembali ke peta pulau...') });
}

/* ---------- Tas survival ---------- */
function bukaTas(): void {
  if (session) session.sibuk = true;
  let tutupTas = (): void => {};
  const lepas = jadikanModalAktif(() => tutupTas());
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
  const tombolX = tombolTutupX(() => tutupTas());
  const overlay = el('div', {
    class: 'overlay dialog-overlay',
    children: [
      el('div', {
        class: 'dialog-panel tas-panel',
        children: [
          tombolX,
          el('h3', { text: t('🎒 Tas Survival ({length}/11)', { length: progress.alat.length }) }),
          el('p', { class: 'muted', text: t('Kumpulkan 11 alat untuk membuka Mercusuar Tua.') }),
          daftar,
        ],
      }),
    ],
  });
  let lepasEsc = (): void => {};
  tutupTas = (): void => {
    overlay.remove();
    lepasEsc();
    lepas();
    if (session) session.sibuk = false;
  };
  lepasEsc = pasangTutupUmum(overlay, tutupTas);
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  app.append(overlay);
  tombolX.focus({ preventScroll: true });
}

/* ---------- Bintang belajar per bab ---------- */
function bukaBintang(): void {
  sfx.click();
  if (session) session.sibuk = true;
  const baris = [...CERITA]
    .sort((a, b) => a.urutan - b.urutan)
    .map((c) => {
      const bintang = progress.balai[balaiKey(c.kode)]?.stars ?? 0;
      const terkunci = !isBalaiUnlocked(progress, c.kode);
      return el('li', {
        class: `bintang-item ${bintang > 0 ? 'dapat' : ''} ${terkunci ? 'terkunci' : ''}`,
        children: [
          el('div', {
            class: 'bintang-nama',
            children: [
              el('strong', { text: c.tempat }),
              el('span', { class: 'muted kecil-teks', text: `${c.bab}: ${c.judulBab}` }),
            ],
          }),
          el('span', {
            class: 'bintang-nilai',
            text: terkunci ? '🔒' : `${'⭐'.repeat(bintang)}${'☆'.repeat(3 - bintang)}`,
            attrs: {
              'aria-label': terkunci ? t('🌫️ Tertutup kabut') : t('Bintang: {stars} dari 3', { stars: bintang }),
            },
          }),
        ],
      });
    });
  const benarFinal = progress.finalBagian.reduce((a, b) => a + b, 0);
  const final = el('li', {
    class: `bintang-item final ${progress.puncakLulus ? 'dapat' : ''}`,
    children: [
      el('div', {
        class: 'bintang-nama',
        children: [
          el('strong', { text: `🗼 ${t('Mercusuar Tua')}` }),
          el('span', { class: 'muted kecil-teks', text: t('Final · {benar}/30 benar', { benar: benarFinal }) }),
        ],
      }),
      el('span', {
        class: 'bintang-nilai',
        text: progress.puncakLulus ? t('✅ Lulus') : isPuncakUnlocked(progress) ? t('🔓 Terbuka') : '🔒',
      }),
    ],
  });
  const tombolX = tombolTutupX(() => tutupBintang());
  const hasil = el('button', { class: 'btn secondary block', text: t('🎓 Hasil Belajar'), attrs: { type: 'button' } });
  const overlay = el('div', {
    class: 'overlay dialog-overlay',
    attrs: { role: 'dialog', 'aria-modal': 'true' },
    children: [
      el('div', {
        class: 'dialog-panel tas-panel bintang-panel',
        children: [
          tombolX,
          el('h3', {
            text: t('⭐ Bintang Belajar ({total}/{maks})', { total: totalStars(progress), maks: maxStars() }),
          }),
          el('p', {
            class: 'muted',
            text: t('3 benar = ⭐⭐⭐. Ulangi tantangan di Tempat Uji untuk menambah bintang.'),
          }),
          el('ol', { class: 'tas-grid bintang-daftar', children: [...baris, final] }),
          hasil,
        ],
      }),
    ],
  });
  let lepasEsc = (): void => {};
  const tutupBintang = (): void => {
    overlay.remove();
    lepasEsc();
    lepas();
    if (session) session.sibuk = false;
  };
  const lepas = jadikanModalAktif(tutupBintang);
  lepasEsc = pasangTutupUmum(overlay, tutupBintang);
  hasil.addEventListener('click', () => {
    sfx.click();
    tutupBintang();
    navigate('result');
  });
  app.append(overlay);
  tombolX.focus({ preventScroll: true });
}

function stopNoktahWorld(): void {
  bangunDuniaKe++;
  // Tutup modal yang terbuka lewat fungsi tutupnya (melepas pendengar & jeda).
  tutupModalAktif();
  if (session) {
    klien?.kirimPosisi(null, 0, 0, 0);
    session.cleanup();
    session = null;
  }
  if (petaSession) {
    petaSession.cleanup();
    petaSession = null;
  }
  if (mercusuar) {
    mercusuar.cleanup();
    mercusuar = null;
  }
  app.querySelectorAll('.vn-overlay, .cerita-overlay, .hadiah-overlay, .dialog-overlay').forEach((n) => n.remove());
  document.body.classList.remove('world-mode', 'balai-mode');
}

function openMenu(): void {
  const dunia = session ?? mercusuar;
  if (!dunia || dunia.sibuk) return;
  dunia.sibuk = true;
  const menu = el('div', { class: 'overlay dialog-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
  const close = (): void => {
    menu.remove();
    lepasEsc();
    lepas();
    dunia.sibuk = false;
  };
  const lepas = jadikanModalAktif(close);
  const lepasEsc = pasangTutupUmum(menu, close);
  const c = session?.cerita;
  const tombol = (teks: string, aksi: () => void, kelas = 'btn block'): HTMLElement =>
    el('button', {
      class: kelas,
      text: teks,
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          close();
          aksi();
        },
      },
    });
  menu.append(
    el('div', {
      class: 'dialog-panel menu-panel',
      children: [
        tombolTutupX(close),
        ...(c
          ? [
              el('h3', { text: `${c.alat.emoji} ${c.tempat}` }),
              el('p', { class: 'muted', text: `${c.bab} · ${c.judulBab}` }),
              el('p', { class: 'menu-misi', text: teksMisi(c, tahapMisi(progress, c.kode)) }),
            ]
          : [el('h3', { text: `🗼 ${t('Mercusuar Tua')}` })]),
        el('div', {
          class: 'menu-tombol',
          children: [
            // Di arena: petunjuk tampil sebagai modal, dunia tetap dijeda di tempatnya.
            tombol(t('📖 Petunjuk Kontrol'), () => {
              if (session) session.sibuk = true;
              bukaPetunjukModal(app, () => {
                if (session) session.sibuk = false;
              });
            }),
            tombol(
              t('⚙️ Pengaturan'),
              () => {
                // Dunia tetap dijeda selama panel pengaturan terbuka.
                if (session) session.sibuk = true;
                bukaPengaturan(app, {
                  onTutup: () => {
                    if (session) session.sibuk = false;
                  },
                });
              },
              'btn secondary block',
            ),
            tombol(t('🗺️ Kembali ke Peta'), () => navigate('map'), 'btn secondary block'),
            tombol(t('🎓 Hasil Belajar'), () => navigate('result'), 'btn secondary block'),
            tombol(t('🧭 Ulangi Panduan'), ulangiPanduan, 'btn secondary block'),
            tombol(t('🏠 Kembali ke Menu Utama'), () => navigate('intro'), 'btn secondary block'),
          ],
        }),
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
            el('div', {
              class: 'hero',
              children: [
                el('div', { class: 'emoji', text: '🖥️' }),
                el('h1', { text: t('Perangkat Belum Mendukung 3D') }),
              ],
            }),
            el('p', {
              text: t(
                'Survival Sains dimainkan dalam tampilan 3D. Peramban di perangkat ini belum mengaktifkan WebGL.',
              ),
            }),
            el('p', {
              class: 'muted',
              text: t('Saran: coba Chrome terbaru, aktifkan akselerasi perangkat keras, atau gunakan perangkat lain.'),
            }),
          ],
        }),
        el('div', {
          class: 'stack',
          children: [
            el('button', {
              class: 'btn block',
              text: t('🔄 Coba Lagi'),
              attrs: { type: 'button' },
              on: { click: () => navigate('map') },
            }),
            el('button', {
              class: 'btn ghost block',
              text: t('🗺️ Daftar Balai (tanpa 3D)'),
              attrs: { type: 'button' },
              on: { click: () => mount(app, renderMap(ctx)) },
            }),
          ],
        }),
      ],
    }),
  );
}

/* ---------- Titik masuk ---------- */
function boot(): void {
  // HP/tablet: layar penuh otomatis sejak ketukan pertama, tegak maupun mendatar.
  pasangLayarPenuhOtomatis(new URLSearchParams(window.location.search).get('layarpenuh') === '1');
  // Bahasa dokumen mengikuti pilihan pemain (pembaca layar & tanda hubung).
  document.documentElement.lang = BAHASA;
  aturPenyimpanPosisi(posisiSaatIni);
  aturAksiKelas({ progres: () => progress, gabung: gabungKelas, keluar: keluarKelas });
  if (!bankReady()) return;
  // Mode Guru punya alamat sendiri (domain/modeguru), tidak tampil di beranda siswa.
  if (halamanModeGuru()) {
    document.title = 'Mode Guru · Survival Sains';
    navigate('guru');
    return;
  }
  if (pulihkanPosisi()) return;
  navigate('intro');
}

/**
 * Berpindah ke profil lain (kelas atau main sendiri): profil sekarang diparkir
 * di perangkat, lalu menu utama digambar ulang untuk profil baru.
 */
function gantiProfil(baru: Progress, pesan: string): void {
  parkirProfil(progress);
  tutupKlien();
  progress = baru;
  saveProgress(progress);
  window.dispatchEvent(new Event('profil-berganti'));
  navigate('intro');
  if (progress.token) aktifkanKlien();
  showToast(pesan, 3000);
}

function gabungKelas(profil: Progress): void {
  gantiProfil(
    profil,
    t('✅ Bergabung dengan Kelas {token} sebagai {nama}', { token: profil.token ?? '', nama: profil.playerName }),
  );
}

function keluarKelas(): void {
  const sendiri = ambilProfilSendiri() ?? profilSendiriBaru(progress);
  gantiProfil(sendiri, t('🎒 Kembali ke Bermain Sendiri'));
}

/**
 * Apakah halaman dibuka sebagai Mode Guru: `domain/modeguru` (server dengan
 * fallback SPA), `?mode=guru` (diteruskan oleh public/modeguru/index.html di
 * hosting statis), atau `#modeguru`.
 */
function halamanModeGuru(): boolean {
  const { pathname, search, hash } = window.location;
  return (
    /\/modeguru\/?$/i.test(pathname) ||
    new URLSearchParams(search).get('mode') === 'guru' ||
    hash.toLowerCase() === '#modeguru'
  );
}

/** Posisi pemain sekarang: di dalam balai, di peta, atau null (layar biasa). */
function posisiSaatIni(): PosisiLanjut | null {
  if (session) {
    const p = session.world.posisiPemain();
    return { layar: 'noktah', noktah: session.kode, posisi: { ...p, yaw: session.world.yawKamera() } };
  }
  if (petaSession) return { layar: 'map', dari: petaDari };
  return null;
}

/**
 * Setelah ganti bahasa, kembalikan pemain ke tempat semula (bukan ke menu
 * utama). Mengembalikan true bila ada posisi yang dipulihkan.
 */
function pulihkanPosisi(): boolean {
  const data = ambilPosisiTersimpan() as PosisiLanjut | null;
  if (!data || typeof data !== 'object') return false;
  // Suara (TTS) baru boleh berbunyi setelah sentuhan pertama sesudah dimuat ulang.
  window.addEventListener('pointerdown', () => bukaKunciSuara(), { once: true });
  // core/suara.ts: HP tanpa suara bahasa aktif tidak dibacakan; beri tahu cara memasangnya (sekali).
  window.addEventListener('suara-tidak-terpasang', () =>
    showToast(
      BAHASA === 'en'
        ? t('Suara Bahasa Inggris belum terpasang. Buka Setelan > Text-to-speech > Speech Services by Google > unduh Bahasa Inggris.')
        : t('Suara Bahasa Indonesia belum terpasang. Buka Setelan > Text-to-speech > Speech Services by Google > unduh Bahasa Indonesia.'),
      8000,
    ),
  );
  const pesan = t('🌐 Bahasa: {nama}', { nama: BAHASA === 'en' ? 'English' : 'Bahasa Indonesia' });
  if (data.layar === 'noktah' && getNoktah(data.noktah) && isBalaiUnlocked(progress, data.noktah)) {
    navigate('noktah', { noktah: data.noktah, posisi: data.posisi });
    showToast(pesan, 2400);
    return true;
  }
  if (data.layar === 'map') {
    navigate('map', { dari: data.dari ?? undefined, pesan });
    return true;
  }
  return false;
}
boot();

// Util debug & pintasan uji otomatis.
(window as unknown as { __survivalSains?: unknown }).__survivalSains = {
  bank: () => getQuestionBank(),
  mode: () => (session ? 'balai-3d' : mercusuar ? 'mercusuar-3d' : petaSession ? 'peta-3d' : 'ui'),
  debug: () => session?.world.debugState() ?? mercusuar?.world.debugState() ?? null,
  /** Statistik render untuk uji performa (scripts/ukur-performa.mjs). */
  info: () => {
    const r = session?.world.renderer ?? petaSession?.handle.renderer;
    if (!r) return null;
    const { calls, triangles } = r.info.render;
    return { calls, triangles, ...r.info.memory, dpr: r.getPixelRatio(), bayangan: r.shadowMap.enabled, ringan: document.documentElement.classList.contains('mode-ringan') };
  },
  progress: () => progress,
  karakter: () => KARAKTER[progress.gender],
  masukBalai: (kode: NoktahId, prolog = false) => navigate('noktah', { noktah: kode, prolog }),
  pindahKe: (peran: PeranTitik) => session?.world.pindahKe(peran) ?? false,
  interaksi: () => (mercusuar ? mercusuar.interaksi() : handleInteract()),
  kePeta: () => navigate('map'),
  petaLayar: () => petaSession?.handle.posisiLayar() ?? null,
  keFinal: () => navigate('final'),
  pintuMercusuar: (i: number) => mercusuar?.world.pindahKePintu(i),
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
