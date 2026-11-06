import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { getBalai } from '../../data/balai';
import type { BalaiId, Stars } from '../../../shared/types';
import type { ScreenContext } from './context';

function bintangBesar(stars: Stars): HTMLElement {
  const out: HTMLElement[] = [];
  for (let i = 0; i < 3; i++) {
    out.push(el('span', { class: i < stars ? 'on' : 'off', text: i < stars ? '⭐' : '☆' }));
  }
  return el('div', { class: 'hasil-bintang', children: out });
}

/** Layar hasil satu balai (atau Pasar Ramai). */
export function renderBalaiResult(ctx: ScreenContext, options?: Record<string, unknown>): HTMLElement {
  const balai = (options?.balai as BalaiId | undefined) ?? 'B01';
  const correct = Number(options?.correct ?? 0);
  const total = Number(options?.total ?? 3);
  const stars = Number(options?.stars ?? 0) as Stars;
  const coins = Number(options?.coins ?? 0);
  const lulus = Boolean(options?.lulus ?? stars >= 1);
  const isFinal = balai === 'FINAL';
  const meta = isFinal ? null : getBalai(balai);
  const judul = isFinal ? 'Pasar Ramai' : (meta?.nama ?? balai);
  const progress = ctx.getProgress();

  const lanjut = el('button', {
    class: 'btn block',
    text: isFinal ? (lulus ? '🎓 Lihat Sertifikat' : '🔄 Ulangi Pasar Ramai') : lulus ? '🗺️ Lanjut Jelajah Peta' : '🔄 Ulangi Balai Ini',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        if (isFinal) {
          if (lulus) ctx.navigate('result');
          else ctx.navigate('quiz', { balai: 'FINAL' });
        } else if (lulus) {
          ctx.navigate('map');
        } else {
          ctx.navigate('quiz', { balai });
        }
      },
    },
  });

  const peta = el('button', {
    class: 'btn ghost block',
    text: '🗺️ Kembali ke Peta',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('map');
      },
    },
  });

  return el('section', {
    class: 'screen',
    children: [
      el('div', {
        class: 'card',
        children: [
          el('div', {
            class: 'hero',
            children: [
              el('div', { class: 'emoji', text: isFinal ? '👑' : lulus ? '🎉' : '💪' }),
              el('h1', { text: lulus ? (isFinal ? 'Kamu Lulus Pasar Ramai!' : 'Balai Selesai!') : 'Belum Lulus' }),
              el('p', { class: 'muted', text: judul }),
            ],
          }),
          bintangBesar(stars),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Jawaban benar' }), el('span', { class: 'v', text: `${correct} / ${total}` })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Koin sesi ini' }), el('span', { class: 'v', text: `🪙 ${coins}` })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Total koin' }), el('span', { class: 'v', text: `🪙 ${progress.coins}` })],
          }),
        ],
      }),
      lulus
        ? el('div', {
            class: 'card info',
            children: [
              el('span', { class: 'label-kecil', text: 'Selamat!' }),
              el('p', {
                text: isFinal
                  ? 'Luar biasa! Kamu menuntaskan seluruh petualangan di pasar. Sertifikatmu sudah terbuka!'
                  : 'Bagus! Kembali ke peta untuk menjelajah noktah lain, atau coba lagi untuk bintang penuh.',
              }),
            ],
          })
        : el('div', {
            class: 'card jujur',
            children: [
              el('span', { class: 'label-kecil', text: 'Semangat!' }),
              el('p', {
                text: isFinal
                  ? 'Kumpulkan minimal 1 bintang untuk lulus Pasar Ramai. Ayo coba lagi dari awal!'
                  : 'Kumpulkan minimal 1 bintang (1 jawaban benar) untuk lulus balai ini. Ayo coba lagi!',
              }),
            ],
          }),
      el('div', { class: 'stack', children: [lanjut, peta] }),
    ],
  });
}
