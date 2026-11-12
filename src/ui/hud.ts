import { el } from './components/dom';
import type { Progress } from '../../shared/types';
import { totalStars, maxStars } from '../core/state';
import { sfx } from '../core/sound';
import { t } from '../core/bahasa';
import { jadikanModalAktif, tombolTutupX } from './modal';

/**
 * HUD dunia balai.
 *
 * Kiri atas : kartu ⭐ bintang, lalu tepat di bawahnya tombol kartu
 *             "📜 Misi" (ketuk → modal berisi tahapan & tugas misi saat ini).
 * Kiri bawah: joystick; tombol kecil 🏃 di atasnya muncul saat bergerak untuk mengunci lari.
 * Kanan bawah: 🎒 Tas besar di pojok, dilingkari ⤴️ Lompat, 😊 sapa (mode kelas), dan 📷 kamera.
 * Melayang  : tombol aksi (bicara/baca/tantangan) di atas tokoh atau titik terdekat.
 * Kanan atas: ☰ menu.
 */
export interface HudHandlers {
  onInteract: () => void;
  onMenu: () => void;
  onTas: () => void;
  /** Membuka ringkasan bintang per bab. */
  onBintang?: () => void;
  onLompat: () => void;
  /** Tombol kecil di atas joystick: mengunci atau melepas lari. */
  onKunciLari?: () => void;
  /** Tombol 📷: berganti ke mode kamera berikutnya. */
  onKamera?: () => void;
  onSapa?: (emoji: string) => void;
}

export interface Hud {
  root: HTMLElement;
  setInteractVisible: (visible: boolean, label?: string) => void;
  /** Menempatkan tombol aksi pada posisi layar (px). */
  setInteractPos: (x: number, y: number) => void;
  setKunciLari: (tampil: boolean, terkunci: boolean) => void;
  setModeKamera: (label: string) => void;
  updateStats: (progress: Progress) => void;
  /** Teks misi saat ini (mis. "Temui Mbok Sinar"). */
  setMisi: (teks: string, tahap: number) => void;
  /** Membuka modal misi (juga dipakai tombol kartu Misi). */
  bukaMisi: () => void;
  setOnline: (aktif: boolean) => void;
  setJumlahTeman: (jumlah: number) => void;
  destroy: () => void;
}

const DAFTAR_SAPA = ['👋', '👍', '😀', '🎉', '😊', '🙌'];
const LANGKAH: Array<{ nama: string; ikon: string }> = [
  { nama: t('Misi'), ikon: '🗣️' },
  { nama: t('Cerita'), ikon: '📖' },
  { nama: t('Tantangan'), ikon: '🔥' },
  { nama: t('Pulang'), ikon: '🗺️' },
];

/**
 * pointerdown (bukan click) agar tombol terasa langsung di layar sentuh,
 * dan tetap bisa ditekan sambil jari lain memegang joystick.
 */
function saatDitekan(tombol: HTMLElement, fn: () => void): void {
  tombol.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    fn();
  });
  tombol.addEventListener('click', (ev) => {
    // Klik dari keyboard (Enter) tidak memicu pointerdown.
    if ((ev as MouseEvent).detail === 0) fn();
  });
}

const KUNCI_BILAH_CIUT = 'survival-sains:bilah-tujuan-ciut';

/**
 * Bilah "habis ini ngapain": satu baris 👉 berisi tugas saat ini. Ketuk untuk
 * menciutkan menjadi ikon 👉 saja; pilihan itu diingat di perangkat ini.
 */
export function buatBilahTujuan(): { root: HTMLElement; setTeks: (teks: string) => void } {
  const teks = el('span', { class: 'bilah-tujuan-teks' });
  const root = el('button', {
    class: 'bilah-tujuan',
    attrs: { type: 'button', 'aria-label': t('Tugasmu sekarang (ketuk untuk menciutkan)') },
    children: [el('span', { class: 'bilah-tujuan-ikon', text: '👉', attrs: { 'aria-hidden': 'true' } }), teks],
  });
  const terapkan = (ciut: boolean): void => {
    root.classList.toggle('ciut', ciut);
    root.setAttribute('aria-expanded', String(!ciut));
  };
  try {
    terapkan(localStorage.getItem(KUNCI_BILAH_CIUT) === '1');
  } catch {
    terapkan(false);
  }
  root.addEventListener('click', () => {
    sfx.click();
    const ciut = !root.classList.contains('ciut');
    terapkan(ciut);
    try {
      localStorage.setItem(KUNCI_BILAH_CIUT, ciut ? '1' : '0');
    } catch {
      /* penyimpanan diblokir: cukup untuk sesi ini */
    }
  });
  return {
    root,
    setTeks: (isi) => {
      if (teks.textContent !== isi) teks.textContent = isi;
    },
  };
}

export function createHud(handlers: HudHandlers): Hud {
  const interactBtn = el('button', {
    class: 'btn-action interact hidden',
    text: '🅰️',
    attrs: { type: 'button', 'aria-label': t('Bicara atau berinteraksi') },
    on: { click: () => handlers.onInteract() },
  });

  const lompatBtn = el('button', {
    class: 'btn-action lompat',
    attrs: { type: 'button', 'aria-label': t('Lompat') },
    children: [el('span', { class: 'lompat-ikon', text: '⤴️' }), el('span', { class: 'lompat-label', text: t('Lompat') })],
  });
  saatDitekan(lompatBtn, () => handlers.onLompat());

  const kameraLabel = el('span', { class: 'kamera-label', text: t('Normal') });
  const kameraBtn = el('button', {
    class: 'btn-action kamera',
    attrs: { type: 'button', 'aria-label': t('Ganti mode kamera') },
    children: [el('span', { class: 'kamera-ikon', text: '📷' }), kameraLabel],
  });
  saatDitekan(kameraBtn, () => handlers.onKamera?.());

  const menuBtn = el('button', {
    class: 'btn-action menu hud-menu-kanan',
    text: '☰',
    attrs: { type: 'button', 'aria-label': t('Menu') },
    on: { click: () => handlers.onMenu() },
  });

  const tasJumlah = el('span', { class: 'tas-jumlah', text: '0/11' });
  const tasBtn = el('button', {
    class: 'btn-action tas-besar',
    attrs: { type: 'button', 'aria-label': t('Buka tas survival') },
    children: [el('span', { class: 'tas-ikon', text: '🎒' }), tasJumlah],
    on: { click: () => handlers.onTas() },
  });
  const starChip = el('button', {
    class: 'chip progress',
    text: '⭐ 0/33',
    attrs: { type: 'button', 'aria-label': t('Lihat bintang belajar') },
    on: { click: () => handlers.onBintang?.() },
  });
  const onlineChip = el('span', { class: 'chip online hidden', text: '👥 0' });
  const stats = el('div', { class: 'hud-stats', children: [starChip, onlineChip] });

  /* ---------- Kartu tombol Misi + modal ---------- */
  let misiTeksKini = '';
  let tahapKini = 0;
  const misiTahap = el('span', { class: 'misi-tombol-tahap', text: t('Misi') });
  const misiTitik = el('span', { class: 'misi-titik', attrs: { 'aria-hidden': 'true' } });
  const misiBtn = el('button', {
    class: 'misi-tombol',
    attrs: { type: 'button', 'aria-label': t('Lihat misi'), 'aria-haspopup': 'dialog' },
    children: [el('span', { class: 'misi-tombol-ikon', text: '📜' }), el('span', { class: 'misi-tombol-label', children: [el('span', { text: t('Misi') }), misiTahap] }), misiTitik],
  });
  misiBtn.addEventListener('click', () => {
    sfx.click();
    bukaMisi();
  });
  const bilah = buatBilahTujuan();
  const kiriAtas = el('div', { class: 'hud-kiri-atas', children: [stats, misiBtn, bilah.root] });

  let modal: HTMLElement | null = null;
  function bukaMisi(): void {
    if (modal) return;
    misiBtn.classList.remove('baru');
    const daftar = el('ol', { class: 'misi-daftar' });
    LANGKAH.forEach((l, i) => {
      const status = i < tahapKini ? 'lewat' : i === tahapKini ? 'aktif' : '';
      daftar.append(
        el('li', {
          class: `misi-item ${status}`,
          children: [
            el('span', { class: 'misi-item-ikon', text: i < tahapKini ? '✅' : l.ikon }),
            el('span', { class: 'misi-item-nama', text: `${i + 1}. ${l.nama}` }),
          ],
        }),
      );
    });
    const tutup = tombolTutupX(() => tutupModal());
    // Kelas `dialog-overlay` membuat dunia 3D otomatis dijeda selama modal terbuka.
    const overlay = el('div', {
      class: 'overlay dialog-overlay misi-overlay',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Misi saat ini') },
      children: [
        el('div', {
          class: 'dialog-panel misi-panel',
          children: [
            tutup,
            el('h3', { text: t('📜 Misi Saat Ini') }),
            daftar,
            el('div', { class: 'misi-tugas', children: [el('span', { class: 'label-kecil', text: t('Tugasmu sekarang') }), el('p', { text: misiTeksKini })] }),
          ],
        }),
      ],
    });
    const tutupModal = (): void => {
      overlay.remove();
      modal = null;
      document.removeEventListener('keydown', esc);
      lepas();
    };
    const lepas = jadikanModalAktif(tutupModal);
    const esc = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') tutupModal();
    };
    document.addEventListener('keydown', esc);
    // Ketuk area gelap di luar panel juga menutup.
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) tutupModal();
    });
    modal = overlay;
    (root.parentElement ?? document.body).append(overlay);
    tutup.focus({ preventScroll: true });
  }

  const kunciLariBtn = el('button', {
    class: 'btn-kunci-lari hidden',
    text: '🏃',
    attrs: { type: 'button', 'aria-label': t('Kunci lari'), 'aria-pressed': 'false' },
  });
  saatDitekan(kunciLariBtn, () => handlers.onKunciLari?.());
  const joystickHost = el('div', { class: 'joystick-host', children: [kunciLariBtn] });

  const barSapa = el('div', { class: 'sapa-bar' });
  for (const emo of DAFTAR_SAPA) {
    barSapa.append(
      el('button', {
        class: 'btn-sapa',
        text: emo,
        attrs: { type: 'button', 'aria-label': t('Sapa {emo}', { emo }) },
        on: {
          click: () => {
            handlers.onSapa?.(emo);
            barSapa.classList.remove('tampil');
          },
        },
      }),
    );
  }
  const sapaBtn = el('button', {
    class: 'btn-action sapa hidden',
    text: '😊',
    attrs: { type: 'button', 'aria-label': t('Sapa teman') },
    on: { click: () => barSapa.classList.toggle('tampil') },
  });

  // Tombol kecil melingkari Tas (posisinya di tata-letak.css).
  const actions = el('div', { class: 'hud-actions', children: [tasBtn, lompatBtn, sapaBtn, kameraBtn] });
  // Tombol ☰ berdiri sendiri di pojok kanan atas.
  const root = el('div', { class: 'hud-3d', children: [kiriAtas, menuBtn, joystickHost, barSapa, actions, interactBtn] });
  let posisiAksi = '';

  return {
    root,
    setInteractVisible: (visible, label = '🅰️') => {
      interactBtn.classList.toggle('hidden', !visible);
      if (interactBtn.textContent !== label) interactBtn.textContent = label;
    },
    setInteractPos: (x, y) => {
      // Dipanggil tiap frame: tulis gaya hanya bila posisinya berubah (hemat hitung ulang layout).
      const posisi = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
      if (posisi !== posisiAksi) interactBtn.style.transform = posisiAksi = posisi;
    },
    setModeKamera: (label) => {
      kameraLabel.textContent = label;
    },
    setKunciLari: (tampil, terkunci) => {
      kunciLariBtn.classList.toggle('hidden', !tampil);
      kunciLariBtn.classList.toggle('terkunci', terkunci);
      if (kunciLariBtn.getAttribute('aria-pressed') !== String(terkunci)) kunciLariBtn.setAttribute('aria-pressed', String(terkunci));
      const ikon = terkunci ? '🔒' : '🏃';
      if (kunciLariBtn.textContent !== ikon) kunciLariBtn.textContent = ikon;
    },
    updateStats: (progress) => {
      tasJumlah.textContent = `${progress.alat.length}/11`;
      starChip.textContent = `⭐ ${totalStars(progress)}/${maxStars()}`;
    },
    setMisi: (teks, tahap) => {
      // Tandai titik "baru" bila tahap misi berubah, supaya anak tahu ada tugas baru.
      if (misiTeksKini && tahap !== tahapKini) misiBtn.classList.add('baru');
      misiTeksKini = teks;
      tahapKini = tahap;
      bilah.setTeks(teks);
      misiTahap.textContent = `${Math.min(tahap + 1, LANGKAH.length)}/${LANGKAH.length} · ${LANGKAH[tahap]?.nama ?? ''}`;
    },
    bukaMisi,
    setOnline: (aktif) => {
      sapaBtn.classList.toggle('hidden', !aktif);
      onlineChip.classList.toggle('hidden', !aktif);
      if (!aktif) barSapa.classList.remove('tampil');
    },
    setJumlahTeman: (jumlah) => {
      onlineChip.textContent = `👥 ${jumlah}`;
    },
    destroy: () => {
      modal?.remove();
      modal = null;
      root.remove();
    },
  };
}
