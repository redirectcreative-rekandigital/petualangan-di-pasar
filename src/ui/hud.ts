import { el } from './components/dom';
import type { Progress } from '../../shared/types';
import { totalStars, maxStars } from '../core/state';

/**
 * HUD 3D: tombol interaksi (A), tombol menu/hint (B), status koin & bintang,
 * juga tempat menempelkan joystick. Semua memakai HTML/CSS di atas kanvas.
 */
export interface HudHandlers {
  onInteract: () => void;
  onMenu: () => void;
  /** Dipanggil saat pemain menekan tombol sapa (mode multiplayer). */
  onSapa?: (emoji: string) => void;
}

export interface Hud {
  root: HTMLElement;
  setInteractVisible: (visible: boolean, label?: string) => void;
  updateStats: (progress: Progress) => void;
  /** Aktifkan/matikan tampilan mode online (tombol sapa + chip online). */
  setOnline: (aktif: boolean) => void;
  /** Perbarui jumlah teman yang terlihat di noktah ini. */
  setJumlahTeman: (jumlah: number) => void;
  destroy: () => void;
}

const DAFTAR_SAPA = ['👋', '👍', '😀', '🎉', '❤️', '🙌'];

export function createHud(handlers: HudHandlers): Hud {
  const interactBtn = el('button', {
    class: 'btn-action interact hidden',
    text: '🅰️',
    attrs: { type: 'button', 'aria-label': 'Bicara dengan penjual' },
    on: { click: () => handlers.onInteract() },
  });

  const menuBtn = el('button', {
    class: 'btn-action menu',
    text: '🅱️',
    attrs: { type: 'button', 'aria-label': 'Menu dan petunjuk' },
    on: { click: () => handlers.onMenu() },
  });

  const coinChip = el('span', { class: 'chip coin', text: '🪙 0' });
  const starChip = el('span', { class: 'chip progress', text: '⭐ 0/15' });
  const onlineChip = el('span', { class: 'chip online', text: '👥 0' });

  const stats = el('div', { class: 'hud-stats', children: [coinChip, starChip, onlineChip] });

  const joystickHost = el('div', { class: 'joystick-host' });

  // Palang emoji sapaan (tersembunyi sampai mode online aktif).
  const barSapa = el('div', { class: 'sapa-bar' });
  for (const emo of DAFTAR_SAPA) {
    barSapa.append(
      el('button', {
        class: 'btn-sapa',
        text: emo,
        attrs: { type: 'button', 'aria-label': `Sapa ${emo}` },
        on: { click: () => handlers.onSapa?.(emo) },
      }),
    );
  }

  const sapaBtn = el('button', {
    class: 'btn-action sapa',
    text: '👋',
    attrs: { type: 'button', 'aria-label': 'Sapa teman' },
    on: {
      click: () => {
        barSapa.classList.toggle('tampil');
      },
    },
  });

  const actions = el('div', { class: 'hud-actions', children: [interactBtn, sapaBtn, menuBtn] });

  const root = el('div', {
    class: 'hud',
    children: [stats, joystickHost, barSapa, actions],
  });

  return {
    root,
    setInteractVisible: (visible, label = '🅰️') => {
      interactBtn.classList.toggle('hidden', !visible);
      interactBtn.textContent = label;
    },
    updateStats: (progress) => {
      coinChip.textContent = `🪙 ${progress.coins}`;
      starChip.textContent = `⭐ ${totalStars(progress)}/${maxStars()}`;
    },
    setOnline: (aktif) => {
      sapaBtn.classList.toggle('hidden', !aktif);
      onlineChip.classList.toggle('hidden', !aktif);
      if (!aktif) barSapa.classList.remove('tampil');
    },
    setJumlahTeman: (jumlah) => {
      onlineChip.textContent = `👥 ${jumlah}`;
    },
    destroy: () => root.remove(),
  };
}
