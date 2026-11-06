import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import type { ScreenContext } from './context';

interface Langkah {
  ikon: string;
  judul: string;
  isi: string;
}

const LANGKAH: Langkah[] = [
  {
    ikon: '🗺️',
    judul: '1. Pilih noktah di peta',
    isi: 'Petualangan dimulai dari peta harta karun 3D. Ketuk salah satu noktah (titik materi) untuk memasukinya.',
  },
  {
    ikon: '🕹️',
    judul: '2. Jelajahi noktahnya',
    isi: 'Di HP, geser joystick kiri untuk berjalan. Di laptop, pakai tombol W A S D atau panah.',
  },
  {
    ikon: '🎥',
    judul: '3. Putar kamera',
    isi: 'Geser jari di sisi kanan layar (HP) atau seret mouse (laptop) untuk melihat sekeliling noktah.',
  },
  {
    ikon: '🏛️',
    judul: '4. Datangi balai',
    isi: 'Tiap noktah berisi balai (rumah sub-materi). Dekati balai lalu tekan A (atau E).',
  },
  {
    ikon: '📘',
    judul: '5. Baca materi (opsional)',
    isi: 'Tiap balai punya bacaan satu halaman ringkas. Boleh dibaca dulu, boleh langsung berlatih.',
  },
  {
    ikon: '👑',
    judul: '6. Hadapi Pasar Ramai',
    isi: 'Setelah kamu pernah mengunjungi seluruh 16 noktah, babak puncak 30 soal terbuka. Lulus berarti sertifikatmu terbuka!',
  },
];

const KONTROL: Array<[string, string, string]> = [
  ['Jalan', 'Joystick kiri', 'W A S D / panah'],
  ['Putar kamera', 'Geser jari kanan', 'Seret mouse'],
  ['Interaksi / bicara', 'Tombol A', 'E'],
  ['Menu', 'Tombol B', 'H / Esc'],
];

/** Petunjuk bermain dan kontrol versi balai. */
export function renderHowto(ctx: ScreenContext): HTMLElement {
  const lanjut = el('button', {
    class: 'btn block',
    text: 'Saya Siap! 🚀',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('map');
      },
    },
  });

  const kembali = el('button', {
    class: 'btn ghost block',
    text: '← Kembali',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('map');
      },
    },
  });

  const tabelKontrol = el('div', {
    class: 'tabel-wrap',
    children: [
      el('table', {
        class: 'tabel-data',
        children: [
          el('thead', {
            children: [
              el('tr', {
                children: [
                  el('th', { text: 'Aksi', attrs: { scope: 'col' } }),
                  el('th', { text: 'HP', attrs: { scope: 'col' } }),
                  el('th', { text: 'Laptop', attrs: { scope: 'col' } }),
                ],
              }),
            ],
          }),
          el('tbody', {
            children: KONTROL.map(([aksi, hp, desktop]) =>
              el('tr', {
                children: [el('th', { text: aksi, attrs: { scope: 'row' } }), el('td', { text: hp }), el('td', { text: desktop })],
              }),
            ),
          }),
        ],
      }),
    ],
  });

  return el('section', {
    class: 'screen',
    children: [
      el('div', { class: 'topbar', children: [el('h2', { text: '📖 Petunjuk Bermain' })] }),
      el('div', {
        class: 'stack',
        children: LANGKAH.map((l) =>
          el('div', {
            class: 'langkah',
            children: [
              el('div', { class: 'ikon', text: l.ikon, attrs: { 'aria-hidden': 'true' } }),
              el('div', { children: [el('h3', { text: l.judul }), el('p', { class: 'muted', text: l.isi })] }),
            ],
          }),
        ),
      }),
      el('div', {
        class: 'card',
        children: [el('span', { class: 'label-kecil', text: '🎮 Kontrol' }), tabelKontrol],
      }),
      el('div', {
        class: 'card info',
        children: [
          el('span', { class: 'label-kecil', text: 'Aturan Singkat' }),
          el('ul', {
            class: 'tujuan',
            children: [
              el('li', { text: 'Setiap noktah pada peta berisi balai (rumah sub-materi).' }),
              el('li', { text: 'Tiap balai berisi 3 soal. Tiap soal punya 3 kesempatan menjawab. Habis 3x salah = soal gagal, lanjut soal berikutnya.' }),
              el('li', { text: '3 benar = ⭐⭐⭐, 2 benar = ⭐⭐, 1 benar = ⭐. Minimal 1 bintang untuk lulus balai.' }),
              el('li', { text: 'Semua noktah bebas dipilih sejak awal — tidak perlu berurutan.' }),
              el('li', { text: 'Babak puncak "Pasar Ramai" (30 soal) terbuka setelah semua 16 noktah pernah dikunjungi.' }),
            ],
          }),
        ],
      }),
      el('div', {
        class: 'card jujur',
        children: [
          el('span', { class: 'label-kecil', text: '💡 Tips' }),
          el('p', {
            text:
              'Pasar seluruhnya 3D. Jika perangkatmu sangat tua dan belum mendukung 3D, aplikasi akan menampilkan layar darurat yang ramah. Untuk perangkat modern, grafik 3D akan berjalan lancar.',
          }),
        ],
      }),
      el('div', { class: 'stack', children: [lanjut, kembali] }),
    ],
  });
}
