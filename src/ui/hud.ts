import { el } from './components/dom';
import type { Progress } from '../../shared/types';
import { totalStars, maxStars } from '../core/state';
import { sfx } from '../core/sound';

/**
 * HUD dunia balai.
 *
 * Kiri atas : kartu 🎒 tas & ⭐ bintang, lalu tepat di bawahnya tombol kartu
 *             "📜 Misi" (ketuk → modal berisi tahapan & tugas misi saat ini).
 * Kiri bawah: joystick.
 * Kanan bawah: tombol aksi (🅰️ bicara/baca/tantangan) dan ⤴️ Lompat; di atasnya
 *             👋 sapa (mode kelas) dan ☰ menu.
 */
export interface HudHandlers {
  onInteract: () => void;
  onMenu: () => void;
  onTas: () => void;
  onLompat: () => void;
  onSapa?: (emoji: string) => void;
}

export interface Hud {
  root: HTMLElement;
  setInteractVisible: (visible: boolean, label?: string) => void;
  updateStats: (progress: Progress) => void;
  /** Teks misi saat ini (mis. "Temui Mbok Sinar"). */
  setMisi: (teks: string, tahap: number) => void;
  /** Membuka modal misi (juga dipakai tombol kartu Misi). */
  bukaMisi: () => void;
  setOnline: (aktif: boolean) => void;
  setJumlahTeman: (jumlah: number) => void;
  destroy: () => void;
}

const DAFTAR_SAPA = ['👋', '👍', '😀', '🎉', '❤️', '🙌'];
const LANGKAH: Array<{ nama: string; ikon: string }> = [
  { nama: 'Misi', ikon: '🗣️' },
  { nama: 'Cerita', ikon: '📖' },
  { nama: 'Tantangan', ikon: '🔥' },
  { nama: 'Pulang', ikon: '🗺️' },
];

export function createHud(handlers: HudHandlers): Hud {
  const interactBtn = el('button', {
    class: 'btn-action interact hidden',
    text: '🅰️',
    attrs: { type: 'button', 'aria-label': 'Bicara atau berinteraksi' },
    on: { click: () => handlers.onInteract() },
  });

  const lompatBtn = el('button', {
    class: 'btn-action lompat',
    attrs: { type: 'button', 'aria-label': 'Lompat' },
    children: [el('span', { class: 'lompat-ikon', text: '⤴️' }), el('span', { class: 'lompat-label', text: 'Lompat' })],
  });
  // pointerdown (bukan click) agar lompat terasa langsung di layar sentuh,
  // dan tetap bisa ditekan sambil jari lain memegang joystick.
  lompatBtn.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    handlers.onLompat();
  });
  lompatBtn.addEventListener('click', (ev) => {
    // Klik dari keyboard (Enter) tidak memicu pointerdown.
    if ((ev as MouseEvent).detail === 0) handlers.onLompat();
  });

  const menuBtn = el('button', {
    class: 'btn-action menu',
    text: '☰',
    attrs: { type: 'button', 'aria-label': 'Menu' },
    on: { click: () => handlers.onMenu() },
  });

  const tasChip = el('button', {
    class: 'chip tas',
    text: '🎒 0/11',
    attrs: { type: 'button', 'aria-label': 'Buka tas survival' },
    on: { click: () => handlers.onTas() },
  });
  const starChip = el('span', { class: 'chip progress', text: '⭐ 0/33' });
  const onlineChip = el('span', { class: 'chip online hidden', text: '👥 0' });
  const stats = el('div', { class: 'hud-stats', children: [tasChip, starChip, onlineChip] });

  /* ---------- Kartu tombol Misi + modal ---------- */
  let misiTeksKini = '';
  let tahapKini = 0;
  const misiTahap = el('span', { class: 'misi-tombol-tahap', text: 'Misi' });
  const misiTitik = el('span', { class: 'misi-titik', attrs: { 'aria-hidden': 'true' } });
  const misiBtn = el('button', {
    class: 'misi-tombol',
    attrs: { type: 'button', 'aria-label': 'Lihat misi', 'aria-haspopup': 'dialog' },
    children: [el('span', { class: 'misi-tombol-ikon', text: '📜' }), el('span', { class: 'misi-tombol-label', children: [el('span', { text: 'Misi' }), misiTahap] }), misiTitik],
  });
  misiBtn.addEventListener('click', () => {
    sfx.click();
    bukaMisi();
  });
  const kiriAtas = el('div', { class: 'hud-kiri-atas', children: [stats, misiBtn] });

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
    const tutup = el('button', { class: 'btn block', text: 'Siap! 👍', attrs: { type: 'button' } });
    // Kelas `dialog-overlay` membuat dunia 3D otomatis dijeda selama modal terbuka.
    const overlay = el('div', {
      class: 'overlay dialog-overlay misi-overlay',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Misi saat ini' },
      children: [
        el('div', {
          class: 'dialog-panel misi-panel',
          children: [
            el('h3', { text: '📜 Misi Saat Ini' }),
            daftar,
            el('div', { class: 'misi-tugas', children: [el('span', { class: 'label-kecil', text: 'Tugasmu sekarang' }), el('p', { text: misiTeksKini })] }),
            tutup,
          ],
        }),
      ],
    });
    const tutupModal = (): void => {
      overlay.remove();
      modal = null;
    };
    tutup.addEventListener('click', () => {
      sfx.click();
      tutupModal();
    });
    // Ketuk area gelap di luar panel juga menutup.
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) tutupModal();
    });
    modal = overlay;
    (root.parentElement ?? document.body).append(overlay);
    tutup.focus({ preventScroll: true });
  }

  const joystickHost = el('div', { class: 'joystick-host' });

  const barSapa = el('div', { class: 'sapa-bar' });
  for (const emo of DAFTAR_SAPA) {
    barSapa.append(
      el('button', {
        class: 'btn-sapa',
        text: emo,
        attrs: { type: 'button', 'aria-label': `Sapa ${emo}` },
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
    text: '👋',
    attrs: { type: 'button', 'aria-label': 'Sapa teman' },
    on: { click: () => barSapa.classList.toggle('tampil') },
  });

  // Tombol utama (aksi & lompat) selalu di posisi tetap; tombol aksi muncul di
  // kiri tombol lompat sehingga lompat tidak bergeser saat aksi tampil.
  const actions = el('div', {
    class: 'hud-actions',
    children: [
      el('div', { class: 'hud-aksi-atas', children: [sapaBtn, menuBtn] }),
      el('div', { class: 'hud-aksi-utama', children: [interactBtn, lompatBtn] }),
    ],
  });
  const root = el('div', { class: 'hud-3d', children: [kiriAtas, joystickHost, barSapa, actions] });

  return {
    root,
    setInteractVisible: (visible, label = '🅰️') => {
      interactBtn.classList.toggle('hidden', !visible);
      if (interactBtn.textContent !== label) interactBtn.textContent = label;
    },
    updateStats: (progress) => {
      tasChip.textContent = `🎒 ${progress.alat.length}/11`;
      starChip.textContent = `⭐ ${totalStars(progress)}/${maxStars()}`;
    },
    setMisi: (teks, tahap) => {
      // Tandai titik "baru" bila tahap misi berubah, supaya anak tahu ada tugas baru.
      if (misiTeksKini && tahap !== tahapKini) misiBtn.classList.add('baru');
      misiTeksKini = teks;
      tahapKini = tahap;
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
