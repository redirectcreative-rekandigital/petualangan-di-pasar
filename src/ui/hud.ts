import { el } from './components/dom';
import type { Progress } from '../../shared/types';
import { totalStars, maxStars } from '../core/state';
import { sfx } from '../core/sound';
import { t } from '../core/bahasa';
import { jadikanModalAktif } from './modal';

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
  /** Membuka ringkasan bintang per bab. */
  onBintang?: () => void;
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
  { nama: t('Misi'), ikon: '🗣️' },
  { nama: t('Cerita'), ikon: '📖' },
  { nama: t('Tantangan'), ikon: '🔥' },
  { nama: t('Pulang'), ikon: '🗺️' },
];

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
    class: 'btn-action menu hud-menu-kanan',
    text: '☰',
    attrs: { type: 'button', 'aria-label': t('Menu') },
    on: { click: () => handlers.onMenu() },
  });

  const tasChip = el('button', {
    class: 'chip tas',
    text: t('🎒 Tas {jumlah}/11', { jumlah: 0 }),
    attrs: { type: 'button', 'aria-label': t('Buka tas survival') },
    on: { click: () => handlers.onTas() },
  });
  const starChip = el('button', {
    class: 'chip progress',
    text: '⭐ 0/33',
    attrs: { type: 'button', 'aria-label': t('Lihat bintang belajar') },
    on: { click: () => handlers.onBintang?.() },
  });
  const onlineChip = el('span', { class: 'chip online hidden', text: '👥 0' });
  const stats = el('div', { class: 'hud-stats', children: [tasChip, starChip, onlineChip] });

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
    const tutup = el('button', { class: 'btn block', text: t('Siap! 👍'), attrs: { type: 'button' } });
    // Kelas `dialog-overlay` membuat dunia 3D otomatis dijeda selama modal terbuka.
    const overlay = el('div', {
      class: 'overlay dialog-overlay misi-overlay',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Misi saat ini') },
      children: [
        el('div', {
          class: 'dialog-panel misi-panel',
          children: [
            el('h3', { text: t('📜 Misi Saat Ini') }),
            daftar,
            el('div', { class: 'misi-tugas', children: [el('span', { class: 'label-kecil', text: t('Tugasmu sekarang') }), el('p', { text: misiTeksKini })] }),
            tutup,
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
    text: '👋',
    attrs: { type: 'button', 'aria-label': t('Sapa teman') },
    on: { click: () => barSapa.classList.toggle('tampil') },
  });

  // Tombol utama (aksi & lompat) selalu di posisi tetap; tombol aksi muncul di
  // kiri tombol lompat sehingga lompat tidak bergeser saat aksi tampil.
  const actions = el('div', {
    class: 'hud-actions',
    children: [
      el('div', { class: 'hud-aksi-atas', children: [sapaBtn] }),
      el('div', { class: 'hud-aksi-utama', children: [interactBtn, lompatBtn] }),
    ],
  });
  // Tombol ☰ berdiri sendiri di pojok kanan atas.
  const root = el('div', { class: 'hud-3d', children: [kiriAtas, menuBtn, joystickHost, barSapa, actions] });

  return {
    root,
    setInteractVisible: (visible, label = '🅰️') => {
      interactBtn.classList.toggle('hidden', !visible);
      if (interactBtn.textContent !== label) interactBtn.textContent = label;
    },
    updateStats: (progress) => {
      tasChip.textContent = t('🎒 Tas {jumlah}/11', { jumlah: progress.alat.length });
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
