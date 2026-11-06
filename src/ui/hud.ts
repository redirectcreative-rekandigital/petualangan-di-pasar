import { el } from './components/dom';
import type { Progress } from '../../shared/types';
import { totalStars, maxStars } from '../core/state';

/**
 * HUD dunia balai: baris misi di atas, tas survival & bintang, tombol aksi
 * (A = bicara/baca/tantangan, 🎒 = tas, ☰ = menu), joystick, dan sapaan
 * emoji untuk mode kelas.
 */
export interface HudHandlers {
  onInteract: () => void;
  onMenu: () => void;
  onTas: () => void;
  onSapa?: (emoji: string) => void;
}

export interface Hud {
  root: HTMLElement;
  setInteractVisible: (visible: boolean, label?: string) => void;
  updateStats: (progress: Progress) => void;
  /** Teks misi saat ini (mis. "Temui Mbok Sinar"). */
  setMisi: (teks: string, tahap: number) => void;
  setOnline: (aktif: boolean) => void;
  setJumlahTeman: (jumlah: number) => void;
  destroy: () => void;
}

const DAFTAR_SAPA = ['👋', '👍', '😀', '🎉', '❤️', '🙌'];
const LANGKAH = ['Misi', 'Cerita', 'Tantangan', 'Pulang'];

export function createHud(handlers: HudHandlers): Hud {
  const interactBtn = el('button', {
    class: 'btn-action interact hidden',
    text: '🅰️',
    attrs: { type: 'button', 'aria-label': 'Bicara atau berinteraksi' },
    on: { click: () => handlers.onInteract() },
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

  const misiTeks = el('div', { class: 'misi-teks' });
  const misiLangkah = el('div', { class: 'misi-langkah' });
  LANGKAH.forEach((l) => misiLangkah.append(el('span', { text: l })));
  const misiBar = el('div', { class: 'misi-bar', children: [misiLangkah, misiTeks] });

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

  const actions = el('div', { class: 'hud-actions', children: [interactBtn, sapaBtn, menuBtn] });
  const root = el('div', { class: 'hud-3d', children: [misiBar, stats, joystickHost, barSapa, actions] });

  return {
    root,
    setInteractVisible: (visible, label = '🅰️') => {
      interactBtn.classList.toggle('hidden', !visible);
      interactBtn.textContent = label;
    },
    updateStats: (progress) => {
      tasChip.textContent = `🎒 ${progress.alat.length}/11`;
      starChip.textContent = `⭐ ${totalStars(progress)}/${maxStars()}`;
    },
    setMisi: (teks, tahap) => {
      misiTeks.textContent = teks;
      Array.from(misiLangkah.children).forEach((c, i) => {
        c.classList.toggle('lewat', i < tahap);
        c.classList.toggle('aktif', i === tahap);
      });
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
