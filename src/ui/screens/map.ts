import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import {
  NOKTAH_LIST,
  balaiKey,
  totalStars,
  maxStars,
  resetProgress,
  isPuncakUnlocked,
  isBalaiUnlocked,
  balaiSelesaiCount,
} from '../../core/state';
import { getCerita } from '../../data/cerita';
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
  const isFinal = n.kode === 'FINAL';
  const terkunci = isFinal ? !isPuncakUnlocked(progress) : !isBalaiUnlocked(progress, n.kode);
  const dikunjungi = stars > 0;
  const c = getCerita(n.kode);

  const card = el('button', {
    class: `level-card ${terkunci ? 'terkunci' : 'terbuka'}${isFinal ? ' boss' : ''}`,
    attrs: { type: 'button', disabled: terkunci },
    children: [
      el('div', { class: 'nomor', text: terkunci ? '🔒' : isFinal ? '🗼' : String(c?.urutan ?? '📍') }),
      el('div', {
        children: [
          el('h3', { text: n.nama }),
          el('p', { class: 'muted', text: c ? `${c.bab}: ${c.judulBab}` : n.materi }),
          isFinal
            ? el('p', {
                class: 'muted',
                text: terkunci
                  ? `Kumpulkan 11 alat dulu (${balaiSelesaiCount(progress)}/11).`
                  : 'Siap dihadapi!',
              })
            : dikunjungi
              ? bintangEl(stars)
              : el('p', { class: 'muted', text: terkunci ? '🌫️ Tertutup kabut' : '✨ Belum dijelajahi' }),
        ],
      }),
      el('div', { text: terkunci ? '' : '▶️', attrs: { 'aria-hidden': 'true' } }),
    ],
  });
  if (!terkunci) {
    card.addEventListener('click', () => {
      sfx.click();
      ctx.navigate(isFinal ? 'final' : 'noktah', { noktah: n.kode });
    });
  }
  return card;
}

/** Daftar noktah (versi layar) — alternatif dari peta 3D. */
export function renderMap(ctx: ScreenContext): HTMLElement {
  const progress = ctx.getProgress();

  const zonaBlok = [
    el('div', {
      class: 'card',
      children: [
        el('span', { class: 'label-kecil', text: 'Jalur Pulau Nusa Kawruh (urut bab)' }),
        el('div', {
          class: 'peta',
          attrs: { style: 'margin-top:10px' },
          children: NOKTAH_LIST.filter((n) => n.kode !== 'FINAL').map((n) => noktahCard(ctx, n, progress)),
        }),
      ],
    }),
  ];

  const finalNoktah = NOKTAH_LIST.find((n) => n.kode === 'FINAL');
  const finalCard = el('div', {
    class: 'card',
    children: [
      el('span', { class: 'label-kecil', text: 'Final' }),
      finalNoktah ? noktahCard(ctx, finalNoktah, progress) : el('span'),
    ],
  });

  const resetBtn = el('button', {
    class: 'btn danger block',
    text: '🗑️ Reset Progres',
    attrs: { type: 'button' },
    on: {
      click: () => {
        const yakin = window.confirm('Reset semua progres? Semua bintang akan dihapus.');
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
          el('h2', { text: '🏝️ Daftar Balai' }),
          el('div', {
            class: 'hud-chips',
            children: [el('span', { class: 'progress chip', text: `⭐ ${totalStars(progress)}/${maxStars()}` })],
          }),
        ],
      }),
      ...zonaBlok,
      finalCard,
      el('div', { class: 'stack', children: [hasilBtn, resetBtn] }),
      el('p', { class: 'footer-note', text: 'Balai terbuka berurutan. Selesaikan balai sebelumnya untuk menyibak kabut.' }),
    ],
  });
}
