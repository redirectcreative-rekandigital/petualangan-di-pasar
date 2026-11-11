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

/** Alur permainan dari awal sampai pulang (urutan sesuai layar sebenarnya). */
const LANGKAH: Langkah[] = [
  {
    ikon: '🪪',
    judul: t('1. Buat kartu penjelajah'),
    isi: t('Tekan ▶️ Mulai Petualangan, pilih karakter, atur warna kostum, lalu isi nama. Pilih 🎒 Bermain Sendiri, atau 👥 Multiplayer Kelas dengan token 4 angka dari guru. Tekan 🌊 Mulai Bertahan Hidup.'),
  },
  {
    ikon: '🌊',
    judul: t('2. Terdampar di pulau'),
    isi: t('Badai membawamu ke Pulau Wonorejo (tekan Lewati ⏭ bila ingin melewati cerita pembuka). Kamu terbangun di Goa Sinar. Untuk pulang, nyalakan Mercusuar Tua di puncak pulau.'),
  },
  {
    ikon: '💬',
    judul: t('3. Terima misi dari Penjaga'),
    isi: t('Ikuti panah kuning dan cincin di tanah. Dekati Penjaga sampai muncul tombol 💬 Bicara di atas kepalanya, lalu ketuk tombol itu (atau tekan E).'),
  },
  {
    ikon: '📖',
    judul: t('4. Baca Halaman Cerita'),
    isi: t('Datangi Cantrik dan ketuk 📖 Baca Cerita. Ikuti cerita bergambar dengan tombol Lanjut ▶ dan selesaikan tantangan kecil di dalamnya.'),
  },
  {
    ikon: '🔥',
    judul: t('5. Jawab tantangan di Tempat Uji'),
    isi: t('Tempat Uji terkunci 🔒 sampai cerita selesai dibaca. Ketuk 🔥 Tantangan: Penjaga memberi 3 soal, tiap soal punya 3 hati ❤️. Bila salah, pilih 🔁 Coba lagi atau 📖 Ingat cerita. Tiap jawaban benar menyalakan satu obor.'),
  },
  {
    ikon: '🗺️',
    judul: t('6. Pulang ke peta, buka balai berikutnya'),
    isi: t('Kamu mendapat satu alat survival 🎒. Lewati gerbang (🗺️ Ke Peta) untuk kembali ke peta. Kabut di balai berikutnya tersibak; ketuk nama balai itu atau tombol ▶ di atas peta.'),
  },
  {
    ikon: '🗼',
    judul: t('7. Nyalakan Mercusuar Tua'),
    isi: t('Dengan 11 alat, Mercusuar Tua terbuka. Ketuk 🚪 Buka Pintu, naiki tangga, dan buka pintu tiap lantai dengan menjawab soal. Di Puncak Lampu, ketuk 💡 Nyalakan Lampu. Lulus = 🎓 sertifikat.'),
  },
];

const KONTROL = (): Array<[string, string, string]> => [
  [t('Jalan'), t('Joystick kiri'), t('W A S D / panah')],
  [t('Putar kamera'), t('Geser jari kanan'), t('Seret mouse')],
  [t('Lompat'), t('Tombol ⤴️ Lompat'), t('Spasi')],
  [t('Lari'), t('Tombol 🏃 di dekat joystick'), '-'],
  [t('Interaksi / bicara'), t('Tombol aksi di atas tokoh'), 'E'],
  [t('Menu'), t('Tombol ☰'), 'H'],
];

/** Tombol di layar dan kegunaannya, per layar. */
const TOMBOL = (): Array<{ judul: string; baris: Array<[string, string]> }> => [
  {
    judul: t('🏠 Di Beranda'),
    baris: [
      [t('▶️ Mulai / Lanjutkan Petualangan'), t('Mulai baru, atau lanjut dari kemajuan terakhir.')],
      [t('🔄 Mulai dari Awal'), t('Menghapus semua bintang, alat, dan catatan belajar (ada konfirmasi).')],
      [t('👥 Gabung Kelas'), t('Masuk kelas guru dengan token 4 angka.')],
      [t('📖 Petunjuk Bermain'), t('Membuka halaman ini.')],
      [t('⚙️ Pengaturan'), t('Bahasa, suara narasi, kecepatan bicara, efek suara, dan mode bermain.')],
      [t('ℹ️ Tentang Game'), t('Info game dan pembuatnya.')],
    ],
  },
  {
    judul: t('🗺️ Di Peta Pulau'),
    baris: [
      [t('▶ (nama tujuan)'), t('Langsung menuju balai tujuan berikutnya.')],
      [t('Nama balai di peta'), t('Ketuk untuk masuk. Balai berkabut belum terbuka.')],
      [t('🎒 Tas'), t('Alat survival yang sudah terkumpul (dari 11).')],
      [t('⭐ Bintang'), t('Bintang yang didapat di tiap balai.')],
      [t('➕ ➖'), t('Perbesar / perkecil peta (bisa juga cubit dua jari).')],
      [t('🎯'), t('Kembali menyorot tujuan berikutnya.')],
      [t('☰ Menu'), t('Petunjuk, Pengaturan, Hasil Belajar, Menu Utama.')],
    ],
  },
  {
    judul: t('🏡 Di Balai & Mercusuar'),
    baris: [
      [t('📜 Misi'), t('Tugasmu sekarang dan 4 langkah misi: Misi, Cerita, Tantangan, Pulang. Bertanda titik bila ada tugas baru.')],
      [t('Tombol aksi'), t('Muncul di atas tokoh atau tempat terdekat: 💬 Bicara, 📖 Baca Cerita, 🔥 Tantangan, 🗺️ Ke Peta.')],
      [t('⤴️ Lompat'), t('Melompat.')],
      [t('🏃 Kunci lari'), t('Muncul saat berjalan. Ketuk agar tokoh berlari (🔒); ketuk lagi untuk berjalan biasa.')],
      [t('📷 Kamera'), t('Ganti sudut pandang: Normal → Dekat → Tangan (seperti mata tokoh).')],
      [t('🎒 Tas'), t('Alat survival yang sudah terkumpul.')],
      [t('⭐ Bintang'), t('Bintang yang didapat di tiap balai.')],
      [t('😊 Sapa · 👥'), t('Hanya di Multiplayer Kelas: kirim emoji ke teman, dan jumlah teman yang sedang online.')],
      [t('☰ Menu'), t('Petunjuk Kontrol, Pengaturan, Kembali ke Peta, Hasil Belajar, Menu Utama.')],
    ],
  },
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

/** Tabel sederhana: kolom pertama jadi judul baris. */
function tabel(kepala: string[], baris: string[][]): HTMLElement {
  return el('div', {
    class: 'tabel-wrap',
    children: [
      el('table', {
        class: 'tabel-data tabel-petunjuk',
        children: [
          el('thead', { children: [el('tr', { children: kepala.map((k) => el('th', { text: k, attrs: { scope: 'col' } })) })] }),
          el('tbody', {
            children: baris.map(([judul, ...sel]) =>
              el('tr', { children: [el('th', { text: judul ?? '', attrs: { scope: 'row' } }), ...sel.map((s) => el('td', { text: s }))] }),
            ),
          }),
        ],
      }),
    ],
  });
}

/** Isi petunjuk: alur bermain, tabel kontrol, tombol per layar, aturan singkat, dan tips. */
function isiPetunjuk(): HTMLElement[] {
  const tabelKontrol = tabel([t('Aksi'), t('HP'), t('Laptop')], KONTROL());

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
      ...TOMBOL().map((bagian) =>
        el('div', {
          class: 'card',
          children: [el('span', { class: 'label-kecil', text: bagian.judul }), tabel([t('Tombol'), t('Kegunaan')], bagian.baris)],
        }),
      ),
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
