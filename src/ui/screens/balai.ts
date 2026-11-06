import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { getBalai, ZONA } from '../../data/balai';
import { balaiKey, isBalaiUnlocked, isPuncakUnlocked } from '../../core/state';
import type { ScreenContext } from './context';
import type { BalaiId } from '../../../shared/types';

/**
 * Layar balai: menampilkan bacaan materi 1 halaman ringkas (opsional dibaca)
 * lalu tombol mulai berlatih. Dipakai juga untuk babak puncak "Pasar Ramai".
 */
export function renderBalai(ctx: ScreenContext, options?: Record<string, unknown>): HTMLElement {
  const balai = (options?.balai as BalaiId | undefined) ?? 'B01';

  if (balai === 'FINAL') {
    return renderFinalIntro(ctx);
  }

  const meta = getBalai(balai);
  if (!meta) return renderFallback(ctx);

  const progress = ctx.getProgress();
  if (!isBalaiUnlocked(progress, balai)) {
    return renderLocked(ctx);
  }

  const zona = ZONA.find((z) => z.elemen === meta.elemen);
  const warna = zona ? `#${zona.warna.toString(16).padStart(6, '0')}` : '#2f9e6b';
  const stars = progress.balai[balaiKey(balai)]?.stars ?? 0;

  const mulai = el('button', {
    class: 'btn block',
    text: stars > 0 ? '🔄 Latihan Lagi (3 soal)' : '▶️ Mulai Berlatih (3 soal)',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('quiz', { balai });
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
        class: 'topbar',
        attrs: { style: `border-left:6px solid ${warna}` },
        children: [
          el('div', {
            class: 'topbar-judul',
            children: [el('h2', { text: meta.nama }), el('span', { class: 'chip kode', text: meta.kode })],
          }),
          el('div', {
            class: 'hud',
            children: [
              el('span', { class: 'chip', text: `Zona ${meta.elemen}` }),
              el('span', { class: 'chip progress', text: `${'⭐'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}` }),
            ],
          }),
        ],
      }),
      el('div', {
        class: 'card info',
        children: [
          el('span', { class: 'label-kecil', text: '📘 Materi (boleh dibaca santai)' }),
          el('p', { class: 'muted', text: meta.materi }),
          ...meta.bacaan.map((p) => el('p', { text: p })),
          el('div', {
            class: 'card jujur',
            attrs: { style: 'margin-top:10px' },
            children: [
              el('span', { class: 'label-kecil', text: 'Contoh' }),
              el('p', { text: meta.contoh }),
              el('p', { class: 'muted', text: `Kunci ingat: ${meta.kunciJawab}` }),
            ],
          }),
        ],
      }),
      el('div', {
        class: 'card',
        children: [
          el('span', { class: 'label-kecil', text: 'Cara bermain di balai ini' }),
          el('ul', {
            class: 'tujuan',
            children: [
              el('li', { text: `${meta.soalPerMain} soal, masing-masing punya 3 kesempatan menjawab.` }),
              el('li', { text: 'Habis 3 kesempatan = soal dianggap gagal, lanjut ke soal berikutnya.' }),
              el('li', { text: '3 benar = ⭐⭐⭐, 2 benar = ⭐⭐, 1 benar = ⭐.' }),
              el('li', { text: 'Baca materi dulu boleh, langsung menjawab juga boleh.' }),
            ],
          }),
        ],
      }),
      el('div', { class: 'stack', children: [mulai, peta] }),
    ],
  });
}

function renderFinalIntro(ctx: ScreenContext): HTMLElement {
  const progress = ctx.getProgress();
  if (!isPuncakUnlocked(progress)) {
    return renderLocked(ctx, 'Pasar Ramai terbuka setelah kamu pernah mengunjungi semua 16 noktah materi di peta.');
  }

  const mulai = el('button', {
    class: 'btn block',
    text: progress.puncakLulus ? '🔄 Ulangi Pasar Ramai' : '👑 Hadapi Pasar Ramai (30 soal)',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('quiz', { balai: 'FINAL' });
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
        class: 'topbar',
        attrs: { style: 'border-left:6px solid #9333ea' },
        children: [
          el('div', {
            class: 'topbar-judul',
            children: [el('h2', { text: '👑 Pasar Ramai' }), el('span', { class: 'chip kode', text: 'Babak Puncak' })],
          }),
        ],
      }),
      el('div', {
        class: 'card info',
        children: [
          el('span', { class: 'label-kecil', text: 'Tantangan Puncak' }),
          el('p', {
            text: 'Selamat! Kamu sudah menjelajah seluruh balai. Kini Raja Diskon menantangmu dengan 30 soal campuran dari semua materi TKA.',
          }),
          el('ul', {
            class: 'tujuan',
            children: [
              el('li', { text: '30 soal: pilihan ganda, pilihan ganda kompleks, dan penalaran.' }),
              el('li', { text: 'Sama seperti balai: 3 kesempatan tiap soal.' }),
              el('li', { text: 'Lulus bila mendapat minimal 1 bintang. Bila gagal, ulang dari awal.' }),
              el('li', { text: 'Lulus Pasar Ramai membuka sertifikat digitalmu! 🎓' }),
            ],
          }),
        ],
      }),
      el('div', { class: 'stack', children: [mulai, peta] }),
    ],
  });
}

function renderLocked(ctx: ScreenContext, pesan?: string): HTMLElement {
  return el('section', {
    class: 'screen',
    children: [
      el('div', {
        class: 'card jujur',
        children: [
          el('span', { class: 'label-kecil', text: '🔒 Masih Terkunci' }),
          el('p', { text: pesan ?? 'Selesaikan balai sebelumnya di zona ini dulu untuk membukanya.' }),
        ],
      }),
      el('div', {
        class: 'stack',
        children: [
          el('button', {
            class: 'btn block',
            text: '🗺️ Kembali ke Peta',
            attrs: { type: 'button' },
            on: { click: () => ctx.navigate('map') },
          }),
        ],
      }),
    ],
  });
}

function renderFallback(ctx: ScreenContext): HTMLElement {
  return renderLocked(ctx, 'Balai tidak ditemukan.');
}
