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
    ikon: '🌊',
    judul: '1. Terdampar di pulau',
    isi: 'Badai membawamu ke Pulau Nusa Kawruh. Untuk pulang, nyalakan Mercusuar Tua di puncak pulau.',
  },
  {
    ikon: '🕹️',
    judul: '2. Berjalan dan melihat',
    isi: 'Di HP, geser joystick kiri untuk berjalan dan geser jari di sisi kanan untuk memutar kamera. Di laptop pakai W A S D dan mouse.',
  },
  {
    ikon: '💬',
    judul: '3. Terima misi dari Penjaga',
    isi: 'Ikuti panah kuning. Dekati Penjaga lalu tekan tombol A (atau E) untuk bercakap dan menerima misi.',
  },
  {
    ikon: '📖',
    judul: '4. Baca Halaman Cerita',
    isi: 'Cantrik akan membacakan cerita bergambar tentang materi IPA. Selesaikan tantangan kecil di akhir cerita.',
  },
  {
    ikon: '🔥',
    judul: '5. Jawab tantangan di Tempat Uji',
    isi: 'Penjaga memberi 3 soal pilihan ganda. Setiap soal punya 3 obor (kesempatan). Bila salah, tekan "Ingat cerita" untuk melihat petunjuk.',
  },
  {
    ikon: '🗼',
    judul: '6. Kumpulkan 11 alat, nyalakan mercusuar',
    isi: 'Setiap balai memberi satu alat survival dan membuka jalan ke balai berikutnya. Dengan 11 alat, Mercusuar Tua terbuka untuk Final (30 soal).',
  },
];

const KONTROL: Array<[string, string, string]> = [
  ['Jalan', 'Joystick kiri', 'W A S D / panah'],
  ['Putar kamera', 'Geser jari kanan', 'Seret mouse'],
  ['Interaksi / bicara', 'Tombol A', 'E'],
  ['Menu', 'Tombol ☰', 'H / Esc'],
  ['Tas survival', 'Tombol 🎒', '-'],
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
              el('li', { text: 'Balai dibuka berurutan mengikuti bab buku IPA kelas 5 (Bab 1 Cahaya sampai Bab 9 Bumi).' }),
              el('li', { text: 'Setiap balai: misi dari Penjaga → Halaman Cerita → tantangan di Tempat Uji → pulang lewat gerbang.' }),
              el('li', { text: 'Tempat Uji terbuka setelah Halaman Cerita selesai dibaca.' }),
              el('li', { text: '3 soal per balai, 3 obor per soal. 3 benar = ⭐⭐⭐, 2 = ⭐⭐, 1 = ⭐. Minimal 1 bintang untuk lulus.' }),
              el('li', { text: 'Final di Mercusuar Tua: 30 soal dalam 4 lantai. Lulus bila minimal 21 benar (70%).' }),
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
              'Nyalakan suara agar para tokoh membacakan dialog dan cerita. Bila suara bahasa Indonesia belum ada di HP, pasang paket suara Google bahasa Indonesia di Setelan HP. Teks tetap tampil walau suara mati.',
          }),
        ],
      }),
      el('div', { class: 'stack', children: [lanjut, kembali] }),
    ],
  });
}
