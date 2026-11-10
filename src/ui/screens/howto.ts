import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import type { ScreenContext } from './context';
import { t } from '../../core/bahasa';
import { jadikanModalAktif } from '../modal';

interface Langkah {
  ikon: string;
  judul: string;
  isi: string;
}

const LANGKAH: Langkah[] = [
  {
    ikon: '🌊',
    judul: t('1. Terdampar di pulau'),
    isi: t('Badai membawamu ke Pulau Wonorejo. Untuk pulang, nyalakan Mercusuar Tua di puncak pulau.'),
  },
  {
    ikon: '🕹️',
    judul: t('2. Berjalan dan melihat'),
    isi: t('Di HP, geser joystick kiri untuk berjalan dan geser jari di sisi kanan untuk memutar kamera. Di laptop pakai W A S D dan mouse.'),
  },
  {
    ikon: '💬',
    judul: t('3. Terima misi dari Penjaga'),
    isi: t('Ikuti panah kuning. Dekati Penjaga lalu tekan tombol A (atau E) untuk bercakap dan menerima misi.'),
  },
  {
    ikon: '📖',
    judul: t('4. Baca Halaman Cerita'),
    isi: t('Cantrik akan membacakan cerita bergambar tentang materi IPA. Selesaikan tantangan kecil di akhir cerita.'),
  },
  {
    ikon: '🔥',
    judul: t('5. Jawab tantangan di Tempat Uji'),
    isi: t('Penjaga memberi 3 soal pilihan ganda. Setiap soal punya 3 hati ❤️ (nyawa). Tiap jawaban salah, satu hati hilang. Bila salah, tekan "Ingat cerita" untuk melihat petunjuk.'),
  },
  {
    ikon: '🗼',
    judul: t('6. Kumpulkan 11 alat, nyalakan mercusuar'),
    isi: t('Setiap balai memberi satu alat survival dan membuka jalan ke balai berikutnya. Dengan 11 alat, Mercusuar Tua terbuka untuk Final (30 soal).'),
  },
];

const KONTROL = (): Array<[string, string, string]> => [
  [t('Jalan'), t('Joystick kiri'), t('W A S D / panah')],
  [t('Putar kamera'), t('Geser jari kanan'), t('Seret mouse')],
  [t('Interaksi / bicara'), t('Tombol A'), 'E'],
  [t('Menu'), t('Tombol ☰'), 'H / Esc'],
  [t('Tas survival'), t('Tombol 🎒'), '-'],
];

/** Asal pembukaan layar petunjuk: menentukan tujuan tombol Kembali. */
export type AsalPetunjuk = 'intro' | 'map';

/**
 * Layar petunjuk bermain (dibuka dari beranda atau peta).
 * Dari beranda: Kembali → beranda. Dari peta: Saya Siap / Kembali → peta.
 */
export function renderHowto(ctx: ScreenContext, dari: AsalPetunjuk = 'map'): HTMLElement {
  const tombol = (teks: string, kelas: string, ke: 'intro' | 'map'): HTMLElement =>
    el('button', {
      class: kelas,
      text: teks,
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          ctx.navigate(ke);
        },
      },
    });
  const aksi =
    dari === 'intro'
      ? [tombol(t('← Kembali'), 'btn block', 'intro')]
      : [tombol(t('Saya Siap! 🚀'), 'btn block', 'map'), tombol(t('← Kembali'), 'btn ghost block', 'map')];

  return el('section', {
    class: 'screen',
    children: [
      el('div', { class: 'topbar', children: [el('h2', { text: t('📖 Petunjuk Bermain') })] }),
      ...isiPetunjuk(),
      el('div', { class: 'stack', children: aksi }),
    ],
  });
}

/**
 * Petunjuk sebagai modal di atas arena game: dunia tidak ditutup, sehingga
 * tombol Tutup mengembalikan pemain ke posisinya di arena.
 */
export function bukaPetunjukModal(host: HTMLElement, onTutup?: () => void): void {
  const overlay = el('div', { class: 'overlay dialog-overlay', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('📖 Petunjuk Kontrol') } });
  const tutup = (): void => {
    overlay.remove();
    document.removeEventListener('keydown', tombolEsc);
    lepas();
    onTutup?.();
  };
  const lepas = jadikanModalAktif(tutup);
  const tombolEsc = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') tutup();
  };
  document.addEventListener('keydown', tombolEsc);
  const klikTutup = (): void => {
    sfx.click();
    tutup();
  };
  const tombolTutup = el('button', { class: 'btn block', text: t('✖️ Tutup'), attrs: { type: 'button' }, on: { click: klikTutup } });
  overlay.append(
    el('div', {
      class: 'dialog-panel petunjuk-panel',
      children: [
        el('h3', { text: t('📖 Petunjuk Kontrol') }),
        el('div', { class: 'petunjuk-isi', children: isiPetunjuk() }),
        tombolTutup,
      ],
    }),
    el('button', { class: 'tutup-x', text: '✕', attrs: { type: 'button', 'aria-label': t('Tutup'), title: t('Tutup') }, on: { click: klikTutup } }),
  );
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) tutup();
  });
  host.append(overlay);
  tombolTutup.focus({ preventScroll: true });
}

/** Isi petunjuk: langkah bermain, tabel kontrol, aturan singkat, dan tips. */
function isiPetunjuk(): HTMLElement[] {
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
                  el('th', { text: t('Aksi'), attrs: { scope: 'col' } }),
                  el('th', { text: t('HP'), attrs: { scope: 'col' } }),
                  el('th', { text: t('Laptop'), attrs: { scope: 'col' } }),
                ],
              }),
            ],
          }),
          el('tbody', {
            children: KONTROL().map(([aksi, hp, desktop]) =>
              el('tr', {
                children: [el('th', { text: aksi, attrs: { scope: 'row' } }), el('td', { text: hp }), el('td', { text: desktop })],
              }),
            ),
          }),
        ],
      }),
    ],
  });

  return [
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
        children: [el('span', { class: 'label-kecil', text: t('🎮 Kontrol') }), tabelKontrol],
      }),
      el('div', {
        class: 'card info',
        children: [
          el('span', { class: 'label-kecil', text: t('Aturan Singkat') }),
          el('ul', {
            class: 'tujuan',
            children: [
              el('li', { text: t('Balai dibuka berurutan mengikuti bab buku IPA kelas 5 (Bab 1 Cahaya sampai Bab 9 Bumi).') }),
              el('li', { text: t('Setiap balai: misi dari Penjaga → Halaman Cerita → tantangan di Tempat Uji → pulang lewat gerbang.') }),
              el('li', { text: t('Tempat Uji terbuka setelah Halaman Cerita selesai dibaca.') }),
              el('li', { text: t('3 soal per balai, 3 hati ❤️ per soal. 3 benar = ⭐⭐⭐, 2 = ⭐⭐, 1 = ⭐. Minimal 1 bintang untuk lulus.') }),
              el('li', { text: t('Final di Mercusuar Tua: 30 soal dalam 4 lantai. Lulus bila minimal 21 benar (70%).') }),
            ],
          }),
        ],
      }),
      el('div', {
        class: 'card jujur',
        children: [
          el('span', { class: 'label-kecil', text: t('💡 Tips') }),
          el('p', {
            text:
              t('Nyalakan suara agar para tokoh membacakan dialog dan cerita. Bila suara bahasa Indonesia belum ada di HP, pasang paket suara Google bahasa Indonesia di Setelan HP. Teks tetap tampil walau suara mati.'),
          }),
        ],
      }),
  ];
}
