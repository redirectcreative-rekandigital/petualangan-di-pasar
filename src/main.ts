import './styles/main.css';
import { el, mount } from './ui/components/dom';
import {
  loadProgress,
  saveProgress,
  resetProgress,
  isPuncakUnlocked,
  balaiKey,
  tandaiNoktahDikunjungi,
} from './core/state';
import { getNoktah } from './data/balai';
import { getQuestionBank } from './data/bank';
import { createInputManager, type InputManager } from './input/controls';
import { isWebGLAvailable } from './world/webgl';
import type { SceneQuality } from './world/scene';
import type { NoktahWorldHandle } from './world/noktahWorld';
import { createHud, type Hud } from './ui/hud';
import { showDialog, showToast } from './ui/dialog';
import { showLoading } from './ui/loading';
import { KlienMultiplayer, onlineTersedia, type StatusKlien } from './net/klien';
import { ringkasProgres } from './net/ringkas';
import { renderIntro } from './ui/screens/intro';
import { renderHowto } from './ui/screens/howto';
import { renderMap } from './ui/screens/map';
import { renderBalai } from './ui/screens/balai';
import { renderQuiz } from './ui/screens/quiz';
import { renderBalaiResult } from './ui/screens/balaiResult';
import { renderResult } from './ui/screens/result';
import { renderAbout } from './ui/screens/about';
import { renderGuru } from './ui/screens/guru';
import { toggleMuted, isMuted, sfx } from './core/sound';
import type { ScreenContext, ScreenName } from './ui/screens/context';
import type { BalaiId, NoktahId, Progress } from '../shared/types';

const appRoot = document.getElementById('app');
if (!appRoot) throw new Error('Elemen #app tidak ditemukan di index.html');
const app: HTMLElement = appRoot;

let progress: Progress = loadProgress();
let currentOptions: Record<string, unknown> = {};

/* ---------- Klien multiplayer (aktif bila ada token kelas) ---------- */
let klien: KlienMultiplayer | null = null;
let statusKlien: StatusKlien = 'terputus';
let timerPosisi = 0;

/** Menyalakan klien multiplayer berdasarkan token pada progres. */
function aktifkanKlien(): void {
  const token = progress.token;
  if (!token || !onlineTersedia()) {
    tutupKlien();
    return;
  }
  // Sudah tersambung dengan token yang sama: pakai ulang.
  if (klien && statusKlien !== 'galat' && klien.tokenSaya === token) {
    return;
  }
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
      if (status === 'terputus' && progress.token) {
        showToast('Koneksi kelas terputus. Coba muat ulang halaman, ya.');
      }
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

/** Kirim ringkasan progres ke server (untuk dasbor guru). */
function kirimProgresKeServer(): void {
  if (!klien) return;
  klien.kirimProgres(ringkasProgres(progress, session?.kode ?? null));
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
  setProgress: (next) => {
    progress = next;
    saveProgress(progress);
    kirimProgresKeServer();
  },
  persist: () => saveProgress(progress),
  reset: () => {
    progress = resetProgress();
    tutupKlien();
    return progress;
  },
};

function navigate(screen: ScreenName, options: Record<string, unknown> = {}): void {
  currentOptions = options;
  stopNoktahWorld();

  // Layar yang memicu 3D: peta besar & dunia noktah.
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
    case 'balai':
      return renderBalai(ctx, currentOptions);
    case 'quiz':
      return renderQuiz(ctx, { balai: normalizeBalaiId(currentOptions.balai) }).root;
    case 'balaiResult':
      return renderBalaiResult(ctx, currentOptions);
    case 'result':
      return renderResult(ctx);
    default:
      return renderIntro(ctx);
  }
}

/** Mengubah opsi balai apa pun menjadi BalaiId yang valid (fallback 'B01'). */
function normalizeBalaiId(value: unknown): BalaiId {
  const kode = typeof value === 'string' ? value : '';
  return kode || 'B01';
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
            el('p', { class: 'muted', text: 'Periksa berkas di src/data/questions/' }),
            el('pre', { text: message, attrs: { style: 'white-space:pre-wrap;font-size:0.85rem' } }),
          ],
        }),
      ],
    }),
  );
}

/* ---------- Tombol bisu global ---------- */
let muteButton: HTMLButtonElement | null = null;
function updateMuteButton(): void {
  if (!muteButton) {
    muteButton = el('button', {
      class: 'mute-btn',
      attrs: { type: 'button', 'aria-label': 'Bisukan atau nyalakan suara' },
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
/* LAPIS 1: PETA BESAR 3D (klik noktah)                                */
/* ================================================================== */

interface PetaSession {
  handle: import('./world/petaBesar').PetaBesarHandle;
  canvas: HTMLCanvasElement;
  cleanup: () => void;
}

let petaSession: PetaSession | null = null;

async function bukaPeta(options: Record<string, unknown> = {}): Promise<void> {
  if (!bankReady()) return;
  stopNoktahWorld();
  // Mode online: pastikan klien kelas menyala (terdaftar di dasbor guru).
  aktifkanKlien();
  if (petaSession) {
    // Peta sudah hidup: cukup render ulang warnanya.
    petaSession.handle.render();
    document.body.classList.add('world-mode');
    return;
  }

  const mulaiPeta = (): void => {
    if (!isWebGLAvailable()) {
      renderEmergencyScreen();
      return;
    }
    void buildPeta();
  };

  if (options.dariIntro) {
    showLoading(app, { pesan: 'Menyiapkan peta petualangan...' }, mulaiPeta);
  } else {
    mulaiPeta();
  }
}

async function buildPeta(): Promise<void> {
  app.innerHTML = '';
  document.body.classList.add('world-mode');
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('aria-label', 'Peta petualangan 3D');
  app.append(canvas);

  const { createPetaBesar } = await import('./world/petaBesar');
  const handle = createPetaBesar(canvas, {
    onPilih: (kode) => {
      sfx.click();
      petaKeNoktah(kode);
    },
    getStatus: (kode) => ({
      terkunci: kode === 'FINAL' && !isPuncakUnlocked(progress),
      stars: starsFor(kode),
      dikunjungi: progress.visitedNoktah.includes(kode),
    }),
    getPosisiPemain: () => {
      const terakhir = progress.visitedNoktah[progress.visitedNoktah.length - 1];
      // Pemain yang baru mulai tetap punya posisi: berdiri di noktah pertama.
      return terakhir ?? 'B01';
    },
    penampilanPemain: {
      gender: progress.gender,
      warnaPakaian: progress.warnaBaju,
      warnaBawahan: progress.warnaBawahan,
      warnaHijab: progress.gender === 'perempuan' ? progress.warnaHijab : undefined,
    },
  });

  petaSession = {
    handle,
    canvas,
    cleanup: () => {
      handle.dispose();
      canvas.remove();
    },
  };

  tambahkanTombolPeta(canvas);
  updateMuteButton();
}

/** Tombol melayang di atas peta: petunjuk, hasil, tentang. */
function tambahkanTombolPeta(canvas: HTMLCanvasElement): void {
  void canvas;
  const bar = el('div', {
    class: 'peta-bar',
    children: [
      el('span', {
        class: 'chip progress',
        text: `📍 ${progress.visitedNoktah.filter((k) => k !== 'FINAL').length}/16 noktah`,
      }),
      el('button', {
        class: 'btn kecil secondary',
        text: '🎓 Hasil',
        attrs: { type: 'button' },
        on: { click: () => { sfx.click(); navigate('result'); } },
      }),
      el('button', {
        class: 'btn kecil ghost',
        text: '📖',
        attrs: { type: 'button', 'aria-label': 'Petunjuk bermain' },
        on: { click: () => { sfx.click(); navigate('howto'); } },
      }),
      el('button', {
        class: 'btn kecil ghost',
        text: '🚪',
        attrs: { type: 'button', 'aria-label': 'Keluar ke halaman depan' },
        on: { click: () => { sfx.click(); konfirmasiKeluar(); } },
      }),
    ],
  });
  app.append(bar);
}

/** Konfirmasi keluar dari peta menuju halaman pembuka (progres tetap tersimpan). */
function konfirmasiKeluar(): void {
  const dlg = showDialog({
    penjual: 'Pasar Amanah',
    teks: 'Mau keluar ke halaman depan? Progres belajar kamu sudah tersimpan dan bisa dilanjutkan nanti.',
    aksi: '🚪 Ya, keluar',
    onAksi: () => {
      navigate('intro');
    },
  });
  app.append(dlg.root);
}

function starsFor(kode: NoktahId): number {
  const noktah = getNoktah(kode);
  const first = noktah?.balai[0];
  return first ? (progress.balai[balaiKey(first.kode)]?.stars ?? 0) : 0;
}

/** Dari peta besar: masuk ke sebuah noktah lewat loading singkat. */
function petaKeNoktah(kode: NoktahId): void {
  const noktah = getNoktah(kode);
  if (!noktah) return;

  if (kode === 'FINAL' && !isPuncakUnlocked(progress)) {
    showToast('Pasar Ramai terbuka setelah kamu mengunjungi semua 16 noktah.');
    return;
  }

  if (petaSession) {
    petaSession.cleanup();
    petaSession = null;
  }

  showLoading(app, { pesan: `Memasuki noktah ${noktah.nama}...` }, () => {
    navigate('noktah', { noktah: kode });
  });
}

/* ================================================================== */
/* LAPIS 2: DUNIA NOKTAH 3D (jalan-jalan ke balai)                     */
/* ================================================================== */

interface NoktahSession {
  world: NoktahWorldHandle;
  hud: Hud;
  input: InputManager;
  raf: number;
  canvas: HTMLCanvasElement;
  kode: NoktahId;
  cleanup: () => void;
}

let session: NoktahSession | null = null;

async function bukaNoktah(options: Record<string, unknown>): Promise<void> {
  if (!bankReady()) return;
  const kode = (options.noktah as NoktahId | undefined) ?? 'B01';
  const noktah = getNoktah(kode);
  if (!noktah) {
    navigate('map');
    return;
  }

  // Tandai noktah sudah dikunjungi (kunci pembuka Pasar Ramai, aturan A(ii)).
  const withVisit = tandaiNoktahDikunjungi(progress, kode);
  if (withVisit !== progress) {
    progress = withVisit;
    saveProgress(progress);
  }

  // Pasar Ramai: langsung masuk babak puncak (tanpa dunia jalan-jalan).
  if (kode === 'FINAL') {
    stopNoktahWorld();
    navigate('balai', { balai: 'FINAL' });
    return;
  }

  if (!isWebGLAvailable()) {
    renderEmergencyScreen();
    return;
  }

  void buildNoktahWorld(noktah.balai, noktah.elemen, kode);
}

async function buildNoktahWorld(
  balai: import('../shared/types').BalaiMeta[],
  elemen: import('../shared/types').Elemen,
  kode: NoktahId,
): Promise<void> {
  stopNoktahWorld();
  app.innerHTML = '';
  document.body.classList.add('world-mode');
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('aria-label', 'Dunia noktah 3D');
  app.append(canvas);

  const quality: SceneQuality = { pixelRatioCap: 1.5, fogNear: 26, fogFar: 70 };
  const { createNoktahWorld } = await import('./world/noktahWorld');

  const input = createInputManager();
  const world = createNoktahWorld({
    canvas,
    input,
    balai,
    elemen,
    getProgress: () => progress,
    quality,
  });
  const hud = createHud({
    onInteract: handleInteract,
    onMenu: openMenu,
    onSapa: (emoji) => {
      sfx.click();
      klien?.kirimSapa(emoji);
    },
  });

  app.append(hud.root);
  input.mountJoystick(hud.root.querySelector('.joystick-host') as HTMLElement);
  hud.updateStats(progress);
  tambahkanTombolPetaKecil();

  // Mode online: nyalakan klien (bila ada token) & mulai kirim posisi.
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

  for (const b of balai) world.setBalaiStars(b.kode, progress.balai[balaiKey(b.kode)]?.stars ?? 0);

  let last = performance.now();
  let elapsed = 0;

  const loop = (now: number): void => {
    if (!session) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    input.endFrame();

    const panelOpen = document.body.querySelector('.panel-overlay, .dialog-overlay') !== null;
    if (!panelOpen) {
      if (input.state.interactPressed) handleInteract();
      else if (input.state.menuPressed) openMenu();
    }

    world.update(dt, elapsed);

    const near = world.getNearby();
    if (near) hud.setInteractVisible(true, '🅰️ Bicara');
    else hud.setInteractVisible(false);

    hud.updateStats(progress);
    session.raf = requestAnimationFrame(loop);
  };

  session = {
    world,
    hud,
    input,
    raf: 0,
    canvas,
    kode,
    cleanup: () => {
      cancelAnimationFrame(session?.raf ?? 0);
      input.destroy();
      world.dispose();
      hud.destroy();
    },
  };
  session.raf = requestAnimationFrame(loop);
  updateMuteButton();
}

function tambahkanTombolPetaKecil(): void {
  const btn = el('button', {
    class: 'btn kecil ghost noktah-back',
    text: '🗺️ Peta',
    attrs: { type: 'button' },
    on: { click: () => { sfx.click(); navigate('map'); } },
  });
  app.append(btn);
}

function stopNoktahWorld(): void {
  document.querySelectorAll('.noktah-back').forEach((n) => n.remove());
  if (session) {
    // Beri tahu server bahwa kita keluar dari noktah (teman tak lagi melihat kita).
    klien?.kirimPosisi(null, 0, 0, 0);
    session.cleanup();
    session = null;
  }
  if (petaSession) {
    petaSession.cleanup();
    petaSession = null;
  }
  document.body.classList.remove('world-mode');
}

function handleInteract(): void {
  if (!session) return;
  const near = session.world.getNearby();
  if (!near) return;

  session.world.setPaused(true);
  const dlg = showDialog({
    penjual: 'Penjaga Balai',
    teks: `Ayo baca materi dan berlatih di ${near.nama}!`,
    aksi: '📘 Buka Balai',
    onAksi: () => openBalaiPanel(near.kode),
    onBatal: () => session?.world.setPaused(false),
  });
  app.append(dlg.root);
}

function openBalaiPanel(kode: BalaiId): void {
  if (!session) return;
  session.world.setPaused(true);
  closePanel();

  const vctx: ScreenContext = {
    ...ctx,
    navigate: (screen, options) => {
      closePanel();
      session?.world.setPaused(false);
      syncWorldStars();
      if (screen === 'quiz' || screen === 'balaiResult') {
        showInWorldScreen(screen, options ?? {});
      } else if (screen === 'map' || screen === 'result') {
        navigate(screen, options ?? {});
      } else if (screen === 'balai') {
        showInWorldScreen('balai', options ?? {});
      }
    },
  };

  const view = renderBalai(vctx, { balai: kode });
  const panel = el('div', { class: 'overlay panel-overlay' });
  panel.append(view);
  app.append(panel);
}

function syncWorldStars(): void {
  if (!session) return;
  // Setelah kuis, perbarui bintang tiap balai di dunia noktah ini.
  const noktah = getNoktah(session.kode);
  if (!noktah) return;
  for (const b of noktah.balai) {
    session.world.setBalaiStars(b.kode, progress.balai[balaiKey(b.kode)]?.stars ?? 0);
  }
}

/** Menampilkan layar balai/kuis/hasil sebagai panel di atas dunia 3D. */
function showInWorldScreen(screen: ScreenName, options: Record<string, unknown>): void {
  if (!session) {
    navigate(screen, options);
    return;
  }
  session.world.setPaused(true);
  closePanel();

  if (screen === 'result' || screen === 'map') {
    navigate(screen, options);
    return;
  }

  const vctx: ScreenContext = {
    ...ctx,
    navigate: (next, opts) => {
      closePanel();
      session?.world.setPaused(false);
      syncWorldStars();
      if (next === 'quiz' || next === 'balaiResult' || next === 'balai') {
        showInWorldScreen(next, opts ?? {});
      } else if (next === 'result' || next === 'map') {
        navigate(next, opts ?? {});
      }
    },
  };

  let root: HTMLElement | null = null;
  if (screen === 'balai') root = renderBalai(vctx, options);
  else if (screen === 'quiz') root = renderQuiz(vctx, { balai: normalizeBalaiId(options.balai) }).root;
  else if (screen === 'balaiResult') root = renderBalaiResult(vctx, options);

  if (!root) return;
  const panel = el('div', { class: 'overlay panel-overlay' });
  panel.append(root);
  app.append(panel);
}

function closePanel(): void {
  app.querySelectorAll('.panel-overlay, .dialog-overlay').forEach((n) => n.remove());
}

/* ---------- Menu dari HUD dunia noktah ---------- */
function openMenu(): void {
  if (!session) return;
  session.world.setPaused(true);
  const menu = el('div', { class: 'overlay dialog-overlay' });
  const close = (): void => {
    menu.remove();
    session?.world.setPaused(false);
  };
  const noktah = getNoktah(session.kode);
  const buttons = [
    el('button', {
      class: 'btn block',
      text: '📖 Petunjuk Kontrol',
      attrs: { type: 'button' },
      on: { click: () => { close(); navigate('howto'); } },
    }),
    el('button', {
      class: 'btn secondary block',
      text: '🗺️ Kembali ke Peta',
      attrs: { type: 'button' },
      on: { click: () => { close(); navigate('map'); } },
    }),
    el('button', {
      class: 'btn secondary block',
      text: '🎓 Lihat Hasil Akhir',
      attrs: { type: 'button' },
      on: { click: () => { close(); navigate('result'); } },
    }),
    el('button', { class: 'btn ghost block', text: '✖️ Tutup', attrs: { type: 'button' }, on: { click: close } }),
  ];
  menu.append(
    el('div', {
      class: 'dialog-panel',
      children: [
        el('h3', { text: noktah ? `Noktah: ${noktah.nama}` : 'Menu' }),
        el('p', { class: 'muted', text: 'Dekati balai lalu tekan A untuk membaca materi dan berlatih.' }),
        ...buttons,
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
            el('p', {
              text: 'Petualangan di Pasar dimainkan dalam tampilan 3D. Peramban di perangkat ini belum mengaktifkan WebGL, sehingga dunia 3D tidak dapat ditampilkan.',
            }),
            el('p', { class: 'muted', text: 'Saran: coba peramban terbaru (Chrome/Edge), aktifkan akselerasi perangkat keras, atau gunakan perangkat lain.' }),
          ],
        }),
        el('div', {
          class: 'stack',
          children: [
            el('button', {
              class: 'btn block',
              text: '🔄 Coba Lagi',
              attrs: { type: 'button' },
              on: { click: () => { sfx.click(); navigate('map'); } },
            }),
            el('button', {
              class: 'btn ghost block',
              text: '🗺️ Daftar Noktah (tanpa 3D)',
              attrs: { type: 'button' },
              on: { click: () => { sfx.click(); mount(app, renderMap(ctx)); } },
            }),
          ],
        }),
      ],
    }),
  );
  updateMuteButton();
}

/* ---------- Titik masuk ---------- */
function boot(): void {
  if (!bankReady()) return;
  updateMuteButton();
  // Selalu mulai dari cover: pemain memilih "Lanjutkan" atau "Mulai dari awal".
  navigate('intro');
}

boot();

// Ekspos util debugging ringan.
(window as unknown as { __petualanganDiPasar?: unknown }).__petualanganDiPasar = {
  bank: () => getQuestionBank(),
  mode: () => (session ? 'noktah-3d' : petaSession ? 'peta-3d' : 'ui'),
  debug: () => session?.world.debugState() ?? null,
  progress: () => progress,
  /** Pintasan uji: masuk ke noktah tertentu tanpa mengetuk penanda 3D. */
  masukNoktah: (kode: NoktahId) => navigate('noktah', { noktah: kode }),
  /** Pintasan uji: kembali ke peta. */
  kePeta: () => navigate('map'),
  /** Status klien multiplayer untuk uji/debug. */
  online: () => ({ status: statusKlien, teman: klien ? klien.terakhirPosisi.length : 0 }),
  /** Sapa manual (untuk uji). */
  sapa: (emoji: string) => klien?.kirimSapa(emoji),
};
