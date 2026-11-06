import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import {
  NOKTAH_LIST,
  balaiKey,
  totalStars,
  maxStars,
  resetProgress,
  isPuncakUnlocked,
  sudahKunjungiNoktah,
  noktahDikunjungiCount,
} from '../../core/state';
import { ZONA } from '../../data/balai';
import type { NoktahMeta, Stars } from '../../../shared/types';
import type { ScreenContext } from './context';

function bintangEl(stars: Stars): HTMLElement {
  const parts: HTMLElement[] = [];
  for (let i = 0; i < 3; i++) {
    parts.push(el('span', { class: i < stars ? 'on' : 'off', text: i < stars ? '★' : '☆' }));
  }
  return el('div', { class: 'bintang', attrs: { 'aria-label': `Bintang: ${stars} dari 3` }, children: parts });
}

function noktahCard(ctx: ScreenContext, n: NoktahMeta, progress = ctx.getProgress()): HTMLElement {
  const balai = n.balai[0];
  const stars = balai ? (progress.balai[balaiKey(balai.kode)]?.stars ?? 0) : 0;
  const dikunjungi = sudahKunjungiNoktah(progress, n.kode);
  const isFinal = n.kode === 'FINAL';
  const terkunci = isFinal && !isPuncakUnlocked(progress);

  const card = el('button', {
    class: `level-card ${terkunci ? 'terkunci' : 'terbuka'}${isFinal ? ' boss' : ''}`,
    attrs: { type: 'button', disabled: terkunci },
    children: [
      el('div', { class: 'nomor', text: terkunci ? '🔒' : isFinal ? '👑' : '📍' }),
      el('div', {
        children: [
          el('h3', { text: n.nama }),
          el('p', { class: 'muted', text: n.materi }),
          isFinal
            ? el('p', {
                class: 'muted',
                text: terkunci
                  ? `Kunjungi semua 16 noktah dulu (${noktahDikunjungiCount(progress)}/16).`
                  : 'Siap dihadapi!',
              })
            : dikunjungi
              ? bintangEl(stars)
              : el('p', { class: 'muted', text: '✨ Belum dijelajahi' }),
        ],
      }),
      el('div', { text: terkunci ? '' : '▶️', attrs: { 'aria-hidden': 'true' } }),
    ],
  });
  if (!terkunci) {
    card.addEventListener('click', () => {
      sfx.click();
      ctx.navigate('noktah', { noktah: n.kode });
    });
  }
  return card;
}

/** Daftar noktah (versi layar) — alternatif dari peta 3D. */
export function renderMap(ctx: ScreenContext): HTMLElement {
  const progress = ctx.getProgress();

  const zonaBlok = ZONA.map((zona) => {
    const list = NOKTAH_LIST.filter((n) => n.elemen === zona.elemen && n.kode !== 'FINAL');
    return el('div', {
      class: 'card',
      attrs: { style: `border-left:6px solid #${zona.warna.toString(16).padStart(6, '0')}` },
      children: [
        el('span', { class: 'label-kecil', text: `Zona ${zona.nama}` }),
        el('div', { class: 'peta', attrs: { style: 'margin-top:10px' }, children: list.map((n) => noktahCard(ctx, n, progress)) }),
      ],
    });
  });

  const finalNoktah = NOKTAH_LIST.find((n) => n.kode === 'FINAL');
  const finalCard = el('div', {
    class: 'card',
    children: [
      el('span', { class: 'label-kecil', text: 'Babak Puncak' }),
      finalNoktah ? noktahCard(ctx, finalNoktah, progress) : el('span'),
    ],
  });

  const resetBtn = el('button', {
    class: 'btn danger block',
    text: '🗑️ Reset Progres',
    attrs: { type: 'button' },
    on: {
      click: () => {
        const yakin = window.confirm('Reset semua progres? Semua bintang dan koin akan dihapus.');
        if (!yakin) return;
        ctx.setProgress(resetProgress());
        sfx.click();
        ctx.navigate('map');
      },
    },
  });

  const hasilBtn = el('button', {
    class: 'btn secondary block',
    text: '🎓 Lihat Hasil Akhir',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('result');
      },
    },
  });

  return el('section', {
    class: 'screen',
    children: [
      el('div', {
        class: 'topbar',
        children: [
          el('h2', { text: '🗺️ Daftar Noktah' }),
          el('div', {
            class: 'hud',
            children: [
              el('span', { class: 'chip coin', text: `🪙 ${progress.coins}` }),
              el('span', { class: 'chip progress', text: `⭐ ${totalStars(progress)}/${maxStars()}` }),
            ],
          }),
        ],
      }),
      ...zonaBlok,
      finalCard,
      el('div', { class: 'stack', children: [hasilBtn, resetBtn] }),
      el('p', { class: 'footer-note', text: 'Ketuk noktah untuk masuk menjelajah. Semua noktah bebas dipilih.' }),
    ],
  });
}
