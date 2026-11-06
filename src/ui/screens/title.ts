import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { APP_INFO } from '../../core/state';
import type { ScreenContext } from './context';

/** Layar judul: judul, pembuat, jenjang, tujuan pembelajaran, tombol Mulai & Petunjuk. */
export function renderTitle(ctx: ScreenContext): HTMLElement {
  const progress = ctx.getProgress();
  const pernahMain = progress.answers.length > 0;

  const mulai = el('button', {
    class: 'btn block',
    text: pernahMain ? '▶️ Lanjut Bermain' : '▶️ Mulai Bermain',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate(pernahMain ? 'map' : 'howto');
      },
    },
  });

  const petunjuk = el('button', {
    class: 'btn secondary block',
    text: '📖 Petunjuk Bermain',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('howto');
      },
    },
  });

  const tentang = el('button', {
    class: 'btn ghost block',
    text: 'ℹ️ Tentang Karya',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('about');
      },
    },
  });

  const tujuanList = el('ul', {
    class: 'tujuan',
    children: APP_INFO.tujuan.map((t) => el('li', { text: t })),
  });

  return el('section', {
    class: 'screen',
    children: [
      el('header', {
        class: 'hero',
        children: [
          el('div', { class: 'emoji', text: '🏘️' }),
          el('h1', { text: APP_INFO.judul }),
          el('p', { class: 'subjudul', text: APP_INFO.subjudul }),
        ],
      }),
      el('div', {
        class: 'card',
        children: [
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Pembuat' }), el('span', { class: 'v', text: APP_INFO.pembuat })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Sekolah' }), el('span', { class: 'v', text: APP_INFO.sekolah })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Jenjang' }), el('span', { class: 'v', text: APP_INFO.jenjang })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Konteks' }), el('span', { class: 'v', text: APP_INFO.konteks })],
          }),
        ],
      }),
      el('div', {
        class: 'card info',
        children: [el('span', { class: 'pill', text: '🎯 Tujuan Pembelajaran' }), tujuanList],
      }),
      el('div', {
        class: 'card jujur',
        children: [
          el('span', { class: 'label-kecil', text: '💚 Nilai Karakter Muhammadiyah' }),
          el('p', { text: APP_INFO.nilaiKarakter }),
        ],
      }),
      el('div', { class: 'stack', children: [mulai, petunjuk, tentang] }),
      el('p', { class: 'footer-note', text: 'Lomba Game Edukasi Berbasis AI - Guru Muhammadiyah se-Cabang Blimbing 2026' }),
    ],
  });
}
