import { lokalkan } from '../core/bahasa';
import type { MateriKode, PlayerGender } from '../../shared/types';
import type { BusanaNusantara } from '../world/karakter';

/**
 * Naskah cerita "Survival Sains".
 *
 * Pemain, anggota termuda Kapal Ekspedisi Sains, terdampar di Pulau Wonorejo
 * setelah badai. Untuk pulang, ia harus menyalakan Mercusuar Tua di
 * puncak pulau. Sembilan Penjaga pulau masing-masing menyimpan bekal ilmu dan
 * satu alat survival. Balai dibuka berurutan mengikuti bab buku IPAS kelas 5.
 *
 * Nilai keislaman & kemuhammadiyahan: salam di setiap pertemuan, basmalah
 * sebelum tantangan, hamdalah setelah lulus, alam sebagai tanda kebesaran
 * Allah (tadabbur alam), manusia sebagai khalifah penjaga bumi, dan ilmu yang
 * bermanfaat untuk menolong sesama.
 */

export interface SuaraTokoh {
  /** Nada TTS (0.5 – 1.6). */
  pitch: number;
  /** Kecepatan TTS (0.7 – 1.2). */
  rate: number;
}

export interface TokohCerita {
  nama: string;
  gender: PlayerGender;
  /** Peran singkat di bawah nama (mis. "Penjaga Goa Sinar"). */
  peran: string;
  /** Ikon dialog. */
  ikon: string;
  warnaBaju: number;
  warnaBawahan: number;
  /** Warna kerudung (perempuan) atau blangkon/ikat kepala (laki-laki). */
  warnaKepala: number;
  suara: SuaraTokoh;
  /** Nama berkas potret ilustrasi (tanpa akhiran), lihat core/gambar.ts. */
  gambar?: string;
  /** Busana Nusantara untuk sosok 3D. */
  busana?: BusanaNusantara;
}

export type Pembicara = 'penjaga' | 'cantrik' | 'pemain' | 'narator';

export interface Baris {
  siapa: Pembicara;
  teks: string;
}

/** Pilihan balasan siswa dalam percakapan. */
export interface PilihanBalas {
  teks: string;
  /** Tanggapan penjaga atas pilihan ini. */
  balasan: string;
  /** Pilihan yang menunjukkan rasa ingin tahu (dicatat untuk guru). */
  inginTahu?: boolean;
}

export interface AlatSurvival {
  nama: string;
  emoji: string;
  /** Kegunaan alat dalam cerita. */
  guna: string;
}

export interface CeritaBalai {
  kode: MateriKode;
  /** Urutan di jalur pulau (1..11) = urutan bab. */
  urutan: number;
  /** Label bab di buku (mis. "Bab 1"). */
  bab: string;
  /** Judul bab singkat. */
  judulBab: string;
  /** Nama tempat di jalur pulau. */
  tempat: string;
  penjaga: TokohCerita;
  cantrik: TokohCerita;
  alat: AlatSurvival;
  /** Percakapan pembuka dengan Penjaga (misi). */
  misi: Baris[];
  /** Pilihan balasan siswa setelah misi dijelaskan. */
  pilihan: PilihanBalas[];
  /** Kalimat penjaga yang memberi tugas (setelah pilihan). */
  tugas: string;
  /** Sapaan cantrik sebelum Halaman Cerita dibuka. */
  cantrikSapa: string;
  /** Kalimat cantrik setelah Halaman Cerita selesai. */
  cantrikTutup: string;
  /** Kalimat bila siswa mendatangi Tempat Uji sebelum membaca cerita. */
  ujiTerkunci: string;
  /** Kalimat penjaga di Tempat Uji sebelum soal pertama. */
  ujiBuka: string;
  /** Kalimat pembuka per soal (diacak/berurutan). */
  pembukaSoal: string[];
  /** Kalimat saat siswa berhasil. */
  lulus: Baris[];
  /** Kalimat saat siswa belum berhasil (0 benar). */
  gagal: string;
  /** Pesan hikmah: nilai islami & karakter. */
  hikmah: string;
}

/* ------------------------------------------------------------------ */
/* Tokoh                                                               */
/* ------------------------------------------------------------------ */

const tokoh = (
  nama: string,
  gender: PlayerGender,
  peran: string,
  ikon: string,
  warnaBaju: number,
  warnaBawahan: number,
  warnaKepala: number,
  suara: SuaraTokoh,
): TokohCerita => ({ nama, gender, peran, ikon, warnaBaju, warnaBawahan, warnaKepala, suara });

/** Ibu Pertiwi menjaga tiga halaman materi Bumi (Bab 9). */
const IBU_PERTIWI = tokoh('Ibu Pertiwi', 'perempuan', 'Penjaga Puncak Bumi', '⛰️', 0x166534, 0x78350f, 0xfef3c7, {
  pitch: 0.9,
  rate: 0.9,
});

/** Narator & kapten kapal (prolog/epilog). */
const NARATOR_ASLI: TokohCerita = tokoh('Narator', 'perempuan', 'Pencerita', '📜', 0x1e3a8a, 0x1e3a8a, 0xffffff, {
  pitch: 1,
  rate: 0.95,
});

const KAPTEN_ASLI: TokohCerita = tokoh('Kapten Bahari', 'laki-laki', 'Kapten Kapal Ekspedisi', '🧭', 0x1d4ed8, 0x1e293b, 0xffffff, {
  pitch: 0.75,
  rate: 1,
});

/* ------------------------------------------------------------------ */
/* Naskah per balai (urutan bab buku)                                  */
/* ------------------------------------------------------------------ */

/** Naskah asli (Bahasa Indonesia); dipakai dasbor guru. */
export const CERITA_ASLI: CeritaBalai[] = [
  {
    kode: 'F01',
    urutan: 1,
    bab: 'Bab 1',
    judulBab: 'Cahaya dan Mata',
    tempat: 'Goa Sinar',
    penjaga: tokoh('Mbok Sinar', 'perempuan', 'Penjaga Goa Sinar', '🕯️', 0xb45309, 0x7c2d12, 0xfde68a, { pitch: 1.05, rate: 0.88 }),
    cantrik: tokoh('Cantrik Prisma', 'laki-laki', 'Murid Mbok Sinar', '🔦', 0xf59e0b, 0x334155, 0x92400e, { pitch: 1.3, rate: 1.05 }),
    alat: { nama: 'Cermin Sinyal', emoji: '🪞', guna: 'Memantulkan cahaya matahari sebagai tanda minta tolong.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum, {nama}. Alhamdulillah, kamu sudah sadar." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam. Di mana aku? Gelap sekali di sini." },
      { siapa: 'penjaga', teks: 'Ombak membawamu ke Pulau Wonorejo. Kamu ada di dalam Goa Sinar.' },
      { siapa: 'penjaga', teks: 'Untuk pulang, nyalakan Mercusuar Tua di puncak pulau. Kapal penyelamat akan melihatnya.' },
      { siapa: 'penjaga', teks: 'Tapi pertama, kita harus keluar dari goa gelap ini. Hanya ada satu berkas cahaya di sana.' },
    ],
    pilihan: [
      { teks: 'Kenapa cahayanya hanya sedikit?', balasan: 'Cahaya hanya masuk lewat celah atap. Cahaya merambat lurus, jadi tidak bisa membelok sendiri.', inginTahu: true },
      { teks: 'Siap, Mbok! Apa yang harus kulakukan?', balasan: 'Bagus, semangatmu besar sekali.' },
    ],
    tugas: 'Temui Cantrik Prisma di bawah berkas sinar. Pelajari sifat cahaya, lalu kembali padaku.',
    cantrikSapa: 'Halo! Aku Cantrik Prisma. Ayo kita pelajari rahasia cahaya, supaya kita bisa keluar dari goa!',
    cantrikTutup: 'Sekarang kamu paham cara cahaya bekerja. Temui Mbok Sinar di mulut goa untuk tantangannya!',
    ujiTerkunci: 'Sabar, Nak. Pelajari dulu cerita cahaya bersama Cantrik Prisma, ya.',
    ujiBuka: 'Mari kita mulai dengan Bismillahirrahmanirrahim. Jawab tiga tantangan ini, maka cermin akan menuntun kita keluar.',
    pembukaSoal: [
      'Cermin harus diarahkan dengan benar. Coba jawab ini.',
      'Sinar mulai memantul ke dinding goa. Satu lagi!',
      'Jalan keluar sudah terlihat. Tantangan terakhir!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Masya Allah, kamu berhasil! Lihat, pantulan cahaya menunjukkan jalan keluar goa.' },
      { siapa: 'penjaga', teks: 'Bawalah Cermin Sinyal ini. Pantulkan cahaya matahari bila kapal lewat.' },
      { siapa: 'pemain', teks: 'Alhamdulillah. Terima kasih, Mbok Sinar!' },
    ],
    gagal: 'Belum apa-apa, Nak. Baca lagi cerita cahayanya bersama Cantrik Prisma, lalu coba lagi.',
    hikmah: 'Cahaya dan mata adalah nikmat dari Allah. Jagalah matamu: membaca di tempat terang dan jangan terlalu lama menatap layar.',
  },
  {
    kode: 'F02',
    urutan: 2,
    bab: 'Bab 2',
    judulBab: 'Bunyi dan Pendengaran',
    tempat: 'Lembah Gema',
    penjaga: tokoh('Ki Gaung', 'laki-laki', 'Penjaga Lembah Gema', '🥁', 0x4c1d95, 0x1f2937, 0x7c2d12, { pitch: 0.6, rate: 0.85 }),
    cantrik: tokoh('Cantrik Gendhing', 'perempuan', 'Murid Ki Gaung', '🎶', 0x7c3aed, 0x334155, 0xede9fe, { pitch: 1.35, rate: 1.05 }),
    alat: { nama: 'Kentongan', emoji: '🪘', guna: 'Bunyinya terdengar jauh untuk memanggil bantuan.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum, anak muda. Aku Ki Gaung, penjaga lembah ini." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam, Ki. Aku ingin memanggil kapal. Bagaimana caranya?" },
      { siapa: 'penjaga', teks: 'Dengar! Suaramu memantul dari tebing. Bunyi bisa membawa pesanmu jauh sekali.' },
      { siapa: 'penjaga', teks: 'Tapi bunyi yang asal-asalan tidak akan sampai. Kamu harus paham cara bunyi merambat.' },
    ],
    pilihan: [
      { teks: 'Kenapa suaraku terdengar dua kali?', balasan: 'Itu gema, bunyi pantul dari tebing yang jauh. Kamu akan mempelajarinya sebentar lagi.', inginTahu: true },
      { teks: 'Baik, Ki. Aku siap belajar.', balasan: 'Telinga yang mau mendengar adalah awal ilmu.' },
    ],
    tugas: 'Cantrik Gendhing menunggu di Batu Gema. Belajarlah padanya, lalu temui aku di seberang lembah.',
    cantrikSapa: 'Hai! Aku Gendhing. Coba dengarkan baik-baik, bunyi punya banyak rahasia!',
    cantrikTutup: 'Hebat! Sekarang kamu tahu bunyi butuh perantara. Ki Gaung menunggumu di seberang lembah.',
    ujiTerkunci: 'Hmm, telingamu belum siap. Dengarkan dulu cerita bunyi bersama Gendhing.',
    ujiBuka: 'Bismillah. Jawablah dengan teliti. Setiap jawaban benar membuat kentongan siap berbunyi.',
    pembukaSoal: [
      'Dengarkan pertanyaan pertama ini.',
      'Gema mulai terdengar jelas. Lanjutkan!',
      'Satu lagi, kentongan hampir siap!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah, telingamu tajam dan pikiranmu jernih.' },
      { siapa: 'penjaga', teks: 'Ambillah Kentongan ini. Pukul kuat-kuat saat kapal mendekat.' },
      { siapa: 'pemain', teks: 'Terima kasih, Ki Gaung!' },
    ],
    gagal: 'Bunyi itu halus rahasianya. Dengarkan lagi ceritanya, lalu kembali ke sini.',
    hikmah: 'Telinga adalah amanah. Gunakan untuk mendengar hal yang baik, dan jaga dari suara yang terlalu keras.',
  },
  {
    kode: 'H01',
    urutan: 3,
    bab: 'Bab 3',
    judulBab: 'Ekosistem',
    tempat: 'Pondok Tepi Hutan',
    penjaga: tokoh('Nini Rimba', 'perempuan', 'Penjaga Hutan', '🌳', 0x15803d, 0x713f12, 0xdcfce7, { pitch: 0.85, rate: 0.85 }),
    cantrik: tokoh('Cantrik Lumut', 'laki-laki', 'Murid Nini Rimba', '🍃', 0x2f9e6b, 0x334155, 0x14532d, { pitch: 1.25, rate: 1.05 }),
    alat: { nama: 'Buku Catatan Penyintas', emoji: '📒', guna: 'Mencatat makhluk hidup dan benda di pulau.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum, penjelajah kecil. Selamat datang di tepi hutan." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam, Nini. Hutan ini luas sekali. Aku takut tersesat." },
      { siapa: 'penjaga', teks: 'Di hutan, semua saling membutuhkan: pohon, hewan, air, tanah, dan cahaya.' },
      { siapa: 'penjaga', teks: 'Bila kamu mengenal penghuninya, hutan akan menjadi rumah, bukan tempat menakutkan.' },
    ],
    pilihan: [
      { teks: 'Apakah batu juga penghuni hutan?', balasan: 'Pertanyaan bagus! Batu memang bagian hutan, tapi ia benda tak hidup. Nanti kamu akan tahu bedanya.', inginTahu: true },
      { teks: 'Aku mau mengenal hutan ini, Nini.', balasan: 'Niat yang baik. Allah menciptakan semuanya saling berpasangan.' },
    ],
    tugas: 'Cantrik Lumut ada di panggung kolam. Belajarlah tentang ekosistem, lalu temui aku di tepi kolam.',
    cantrikSapa: 'Halo! Aku Lumut. Yuk kita amati siapa saja yang tinggal di hutan ini!',
    cantrikTutup: 'Kamu sudah bisa membedakan biotik dan abiotik! Nini Rimba menunggu di tepi kolam.',
    ujiTerkunci: 'Pelan-pelan, Nak. Amati dulu hutan ini bersama Cantrik Lumut.',
    ujiBuka: 'Bismillah. Mari buktikan kamu sudah mengenal hutan ini.',
    pembukaSoal: [
      'Lihat sekelilingmu, lalu jawab.',
      'Hutan mulai terasa ramah. Lanjutkan!',
      'Tantangan terakhir dari hutan!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah. Kini hutan ini mengenalmu sebagai sahabat.' },
      { siapa: 'penjaga', teks: 'Terimalah Buku Catatan Penyintas. Catat semua yang kamu temui di pulau.' },
      { siapa: 'pemain', teks: 'Terima kasih, Nini Rimba!' },
    ],
    gagal: 'Hutan belum terbuka untukmu. Amati lagi ceritanya bersama Lumut, ya.',
    hikmah: 'Setiap makhluk punya peran yang Allah tetapkan. Tidak ada yang sia-sia di alam ini.',
  },
  {
    kode: 'H02',
    urutan: 4,
    bab: 'Bab 4',
    judulBab: 'Rantai Makanan',
    tempat: 'Ladang dan Lumbung',
    penjaga: tokoh('Ki Lumbung', 'laki-laki', 'Penjaga Ladang', '🌾', 0x854d0e, 0x3f3f46, 0x422006, { pitch: 0.7, rate: 0.9 }),
    cantrik: tokoh('Cantrik Walang', 'perempuan', 'Murid Ki Lumbung', '🦗', 0x65a30d, 0x334155, 0xecfccb, { pitch: 1.4, rate: 1.1 }),
    alat: { nama: 'Keranjang Bekal', emoji: '🧺', guna: 'Menyimpan makanan yang aman selama perjalanan.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum, Nak. Perutmu pasti lapar setelah keluar dari hutan." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam, Ki. Iya, aku lapar sekali." },
      { siapa: 'penjaga', teks: 'Di ladang ini, semua makhluk mencari makan. Ada yang makan tumbuhan, ada yang makan hewan lain.' },
      { siapa: 'penjaga', teks: 'Bila kamu paham siapa makan siapa, kamu tahu makanan mana yang aman dan tidak merusak alam.' },
    ],
    pilihan: [
      { teks: 'Dari mana tumbuhan mendapat makanan?', balasan: 'Tumbuhan membuat makanan sendiri dengan bantuan cahaya matahari. Itulah awal semua rantai.', inginTahu: true },
      { teks: 'Ajari aku, Ki!', balasan: 'Ayo. Makan secukupnya, dan selalu berdoa sebelum makan.' },
    ],
    tugas: 'Cantrik Walang ada di tengah ladang. Belajarlah rantai makanan, lalu temui aku di lumbung.',
    cantrikSapa: 'Hai! Aku Walang. Lihat belalang itu? Ayo ikuti ke mana energinya pergi!',
    cantrikTutup: 'Kamu sudah bisa menyusun rantai makanan! Ki Lumbung menunggu di lumbung.',
    ujiTerkunci: 'Isi dulu kepalamu dengan ilmu, baru isi keranjangmu. Temui Cantrik Walang.',
    ujiBuka: 'Bismillah. Jawab dengan benar, maka keranjangmu akan terisi bekal.',
    pembukaSoal: [
      'Siapa makan siapa? Jawab ini dulu.',
      'Keranjang mulai terisi. Lanjutkan!',
      'Satu soal lagi, bekalmu hampir lengkap!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah. Kamu paham bahwa energi berawal dari matahari.' },
      { siapa: 'penjaga', teks: 'Bawalah Keranjang Bekal ini. Ambil makanan secukupnya, jangan berlebihan.' },
      { siapa: 'pemain', teks: 'Terima kasih, Ki Lumbung!' },
    ],
    gagal: 'Rantainya belum tersusun. Ikuti lagi cerita belalang bersama Walang, ya.',
    hikmah: 'Makanlah secukupnya dan jangan berlebih-lebihan. Rezeki dari Allah harus disyukuri dan dibagi.',
  },
  {
    kode: 'H03',
    urutan: 5,
    bab: 'Bab 5',
    judulBab: 'Simbiosis',
    tempat: 'Taman Bunga',
    penjaga: tokoh('Nyai Kembang', 'perempuan', 'Penjaga Taman Bunga', '🌺', 0xbe185d, 0x581c87, 0xfce7f3, { pitch: 1.15, rate: 0.9 }),
    cantrik: tokoh('Cantrik Tawon', 'laki-laki', 'Murid Nyai Kembang', '🐝', 0x0d9488, 0x334155, 0x854d0e, { pitch: 1.3, rate: 1.1 }),
    alat: { nama: 'Kelambu Hutan', emoji: '🥅', guna: 'Melindungi dari gigitan nyamuk saat tidur.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum, Nak. Hati-hati, malam di pulau penuh nyamuk." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam, Nyai. Kenapa nyamuk suka menggigit?" },
      { siapa: 'penjaga', teks: 'Di taman ini, makhluk hidup saling berhubungan. Ada yang saling menolong, ada yang merugikan.' },
      { siapa: 'penjaga', teks: 'Kenali hubungan mereka, maka kamu tahu siapa sahabat dan siapa yang harus diwaspadai.' },
    ],
    pilihan: [
      { teks: 'Apakah lebah merugikan bunga?', balasan: 'Justru tidak. Lebah dan bunga saling menolong. Kamu akan melihatnya sendiri.', inginTahu: true },
      { teks: 'Aku ingin tahu, Nyai!', balasan: 'Semangat yang indah, seindah taman ini.' },
    ],
    tugas: 'Cantrik Tawon ada di antara bunga. Belajarlah tentang simbiosis, lalu temui aku di akar pohon besar.',
    cantrikSapa: 'Bzzz! Aku Tawon. Ayo lihat bagaimana makhluk hidup berteman dan bertengkar!',
    cantrikTutup: 'Kamu sudah mengenal mutualisme, komensalisme, dan parasitisme! Nyai Kembang menunggu.',
    ujiTerkunci: 'Kenali dulu penghuni taman bersama Cantrik Tawon, Nak.',
    ujiBuka: 'Bismillah. Mari kita uji pemahamanmu tentang hubungan makhluk hidup.',
    pembukaSoal: [
      'Perhatikan hubungan makhluk hidup ini.',
      'Kelambu mulai terajut. Lanjutkan!',
      'Soal terakhir di taman bunga!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah. Seperti lebah dan bunga, hiduplah saling menolong.' },
      { siapa: 'penjaga', teks: 'Ini Kelambu Hutan untukmu. Tidurlah dengan nyenyak dan aman.' },
      { siapa: 'pemain', teks: 'Terima kasih, Nyai Kembang!' },
    ],
    gagal: 'Belum tepat, Nak. Lihat lagi cerita taman bersama Tawon.',
    hikmah: 'Tolong-menolonglah dalam kebaikan, seperti lebah dan bunga. Jangan menjadi benalu bagi orang lain.',
  },
  {
    kode: 'H04',
    urutan: 6,
    bab: 'Bab 6',
    judulBab: 'Kelestarian Lingkungan',
    tempat: 'Persemaian',
    penjaga: tokoh('Eyang Wana', 'laki-laki', 'Penjaga Hutan Lestari', '🌲', 0x14532d, 0x44403c, 0xe7e5e4, { pitch: 0.55, rate: 0.82 }),
    cantrik: tokoh('Cantrik Tunas', 'perempuan', 'Murid Eyang Wana', '🌱', 0x15803d, 0x334155, 0xbbf7d0, { pitch: 1.3, rate: 1.05 }),
    alat: { nama: 'Bibit Pohon', emoji: '🌱', guna: 'Ditanam untuk memperbaiki jembatan alam ke bukit.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum, cucuku. Lihatlah hutan ini, banyak pohonnya hilang." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam, Eyang. Kenapa hutannya gundul?" },
      { siapa: 'penjaga', teks: 'Dulu ada yang menebang tanpa menanam lagi. Hewan pergi, tanah longsor, jembatan ke bukit putus.' },
      { siapa: 'penjaga', teks: 'Manusia diciptakan sebagai khalifah, penjaga bumi. Mari kita perbaiki bersama.' },
    ],
    pilihan: [
      { teks: 'Apa yang bisa dilakukan anak sepertiku?', balasan: 'Banyak sekali! Menanam pohon, membuang sampah pada tempatnya, dan hemat memakai barang.', inginTahu: true },
      { teks: 'Aku mau menolong hutan ini, Eyang.', balasan: 'Hatimu baik, cucuku. Ayo mulai.' },
    ],
    tugas: 'Cantrik Tunas ada di persemaian bibit. Belajarlah menjaga alam, lalu temui aku di jembatan rusak.',
    cantrikSapa: 'Halo! Aku Tunas. Ayo kita lihat apa yang terjadi pada hutan ini, dan cara memulihkannya!',
    cantrikTutup: 'Kamu sudah tahu cara menjaga alam! Eyang Wana menunggu di jembatan.',
    ujiTerkunci: 'Ilmu dulu, cucuku. Pelajari cerita hutan bersama Cantrik Tunas.',
    ujiBuka: 'Bismillah. Setiap jawaban benar menumbuhkan satu akar untuk jembatan.',
    pembukaSoal: [
      'Akar pertama mulai tumbuh. Jawab ini.',
      'Jembatan mulai tersambung. Lanjutkan!',
      'Satu akar lagi, jembatan akan kokoh!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah. Jembatan akar sudah tersambung ke bukit.' },
      { siapa: 'penjaga', teks: 'Bawalah Bibit Pohon ini. Tanamlah di mana pun kamu bisa.' },
      { siapa: 'pemain', teks: 'Terima kasih, Eyang Wana. Aku akan menjaga alam!' },
    ],
    gagal: 'Akarnya belum kuat, cucuku. Pelajari lagi bersama Tunas.',
    hikmah: 'Manusia adalah khalifah di bumi. Merawat alam termasuk ibadah, dan merusaknya dilarang.',
  },
  {
    kode: 'F03',
    urutan: 7,
    bab: 'Bab 7',
    judulBab: 'Magnet',
    tempat: 'Bukit Batu Besi',
    penjaga: tokoh('Empu Wesi', 'laki-laki', 'Pandai Besi Bukit', '⚒️', 0x7f1d1d, 0x1c1917, 0x292524, { pitch: 0.65, rate: 0.9 }),
    cantrik: tokoh('Cantrik Kutub', 'laki-laki', 'Murid Empu Wesi', '🧲', 0xdc2626, 0x334155, 0x450a0a, { pitch: 1.25, rate: 1.1 }),
    alat: { nama: 'Kompas Buatan', emoji: '🧭', guna: 'Menunjukkan arah utara agar tidak tersesat.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum. Aku Empu Wesi, pandai besi di bukit ini." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam, Empu. Aku bingung, ke mana arah mercusuar?" },
      { siapa: 'penjaga', teks: 'Kabut sering turun di bukit. Penjelajah sejati memakai kompas untuk menentukan arah.' },
      { siapa: 'penjaga', teks: 'Kompas dibuat dari jarum magnet. Kamu harus paham cara magnet bekerja.' },
    ],
    pilihan: [
      { teks: 'Kenapa jarum kompas selalu menunjuk ke utara?', balasan: 'Karena bumi kita seperti magnet raksasa. Kutub jarum ditarik oleh kutub bumi.', inginTahu: true },
      { teks: 'Ajari aku membuat kompas, Empu!', balasan: 'Tangan yang rajin dan pikiran yang teliti. Ayo.' },
    ],
    tugas: 'Cantrik Kutub ada di dekat batu magnet besar. Belajarlah padanya, lalu temui aku di puncak bukit.',
    cantrikSapa: 'Hai! Aku Kutub. Lihat paku-paku ini melompat ke batu! Ayo cari tahu kenapa!',
    cantrikTutup: 'Kamu sudah bisa membuat magnet! Empu Wesi menunggu di puncak bukit.',
    ujiTerkunci: 'Jarumnya belum bermagnet, Nak. Belajarlah dulu bersama Cantrik Kutub.',
    ujiBuka: 'Bismillah. Jawablah, dan jarum ini akan menjadi kompas.',
    pembukaSoal: [
      'Gosok jarumnya dengan jawaban yang benar.',
      'Jarum mulai bergetar. Lanjutkan!',
      'Satu lagi, jarum hampir menunjuk utara!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah. Lihat, jarumnya menunjuk utara dengan mantap.' },
      { siapa: 'penjaga', teks: 'Bawalah Kompas Buatan ini. Ia akan menuntunmu ke mercusuar.' },
      { siapa: 'pemain', teks: 'Terima kasih, Empu Wesi!' },
    ],
    gagal: 'Jarumnya belum mau menunjuk utara. Belajar lagi bersama Kutub, ya.',
    hikmah: 'Seperti kompas yang setia menunjuk arah, hati kita pun perlu arah yang lurus: jujur dan taat.',
  },
  {
    kode: 'F04',
    urutan: 8,
    bab: 'Bab 8',
    judulBab: 'Listrik',
    tempat: 'Sungai Kincir',
    penjaga: tokoh('Mbah Kilat', 'laki-laki', 'Penjaga Kincir Air', '⚡', 0x1e40af, 0x1f2937, 0xf1f5f9, { pitch: 0.8, rate: 1 }),
    cantrik: tokoh('Cantrik Dinamo', 'perempuan', 'Murid Mbah Kilat', '💡', 0x2563eb, 0x334155, 0xdbeafe, { pitch: 1.35, rate: 1.12 }),
    alat: { nama: 'Dinamo Mercusuar', emoji: '🔋', guna: 'Menghasilkan listrik untuk lampu mercusuar.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum, Nak! Kamu yang ingin menyalakan mercusuar, ya?" },
      { siapa: 'pemain', teks: "Wa'alaikumussalam, Mbah. Benar. Tapi lampunya butuh listrik." },
      { siapa: 'penjaga', teks: 'Kincir air ini bisa menghasilkan listrik. Air sungai memutar kincir, kincir memutar dinamo.' },
      { siapa: 'penjaga', teks: 'Tapi listrik harus dialirkan dengan benar. Salah sambung, lampu tidak menyala.' },
    ],
    pilihan: [
      { teks: 'Kenapa kabel dibungkus karet?', balasan: 'Karet tidak menghantarkan listrik. Ia melindungi tangan kita. Itulah isolator.', inginTahu: true },
      { teks: 'Aku siap, Mbah!', balasan: 'Bagus! Tapi ingat, jangan pernah bermain dengan stopkontak, ya.' },
    ],
    tugas: 'Cantrik Dinamo ada di tepi sungai. Belajarlah tentang listrik, lalu temui aku di gardu.',
    cantrikSapa: 'Halo! Aku Dinamo. Ayo kita nyalakan lampu dengan kabel dan baterai!',
    cantrikTutup: 'Kamu sudah paham rangkaian listrik! Mbah Kilat menunggu di gardu.',
    ujiTerkunci: 'Listrik itu berbahaya bila tidak paham. Belajarlah dulu bersama Cantrik Dinamo.',
    ujiBuka: 'Bismillah. Setiap jawaban benar menyambung satu kabel ke dinamo.',
    pembukaSoal: [
      'Sambung kabel pertama dengan jawaban ini.',
      'Lampu mulai berkedip. Lanjutkan!',
      'Kabel terakhir, ayo!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah, lampunya menyala terang!' },
      { siapa: 'penjaga', teks: 'Bawalah Dinamo Mercusuar ini. Pasang di puncak mercusuar nanti.' },
      { siapa: 'pemain', teks: 'Terima kasih, Mbah Kilat!' },
    ],
    gagal: 'Lampunya belum menyala. Pelajari lagi rangkaiannya bersama Dinamo.',
    hikmah: 'Hemat listrik berarti bersyukur atas nikmat Allah. Matikan lampu dan alat yang tidak dipakai.',
  },
  {
    kode: 'E01',
    urutan: 9,
    bab: 'Bab 9a',
    judulBab: 'Litosfer',
    tempat: 'Tebing Berlapis',
    penjaga: IBU_PERTIWI,
    cantrik: tokoh('Cantrik Watu', 'laki-laki', 'Murid Ibu Pertiwi', '🪨', 0x78716c, 0x334155, 0x44403c, { pitch: 1.15, rate: 1.05 }),
    alat: { nama: 'Tali Pendaki', emoji: '🪢', guna: 'Membantu mendaki tebing dengan aman.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum, penjelajah. Aku Ibu Pertiwi, penjaga Puncak Bumi." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam, Bu. Mercusuar ada di atas tebing itu, ya?" },
      { siapa: 'penjaga', teks: 'Benar. Tapi tebing ini berlapis-lapis. Pendaki harus tahu lapisan mana yang kuat.' },
      { siapa: 'penjaga', teks: 'Aku akan mengujimu tiga kali: tentang batuan, air dan udara, serta bumi yang bergerak.' },
    ],
    pilihan: [
      { teks: 'Kenapa tebingnya bergaris-garis?', balasan: 'Itu lapisan batuan yang terbentuk sangat lama. Setiap garis menyimpan cerita bumi.', inginTahu: true },
      { teks: 'Aku siap mendaki, Bu!', balasan: 'Berani itu baik, tapi harus disertai ilmu.' },
    ],
    tugas: 'Cantrik Watu ada di lapisan batuan yang terbuka. Belajarlah padanya, lalu temui aku di atas tebing.',
    cantrikSapa: 'Hai! Aku Watu. Ayo kita intip lapisan kulit bumi!',
    cantrikTutup: 'Kamu sudah mengenal litosfer! Ibu Pertiwi menunggumu di atas tebing.',
    ujiTerkunci: 'Kenali dulu batuannya bersama Cantrik Watu, Nak.',
    ujiBuka: 'Bismillah. Jawab dengan benar, dan tali pendaki akan kuat menahanmu.',
    pembukaSoal: [
      'Pegangan pertama. Jawablah.',
      'Kamu sudah setengah tebing. Lanjutkan!',
      'Hampir sampai di atas!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah, kamu sampai di atas tebing dengan selamat.' },
      { siapa: 'penjaga', teks: 'Bawalah Tali Pendaki ini. Perjalananmu masih dua langkah lagi.' },
      { siapa: 'pemain', teks: 'Terima kasih, Ibu Pertiwi!' },
    ],
    gagal: 'Pegangannya belum kuat. Pelajari lagi lapisan bumi bersama Watu.',
    hikmah: 'Gunung dan batuan adalah tanda kebesaran Allah. Kita diajak mengamati dan mensyukurinya.',
  },
  {
    kode: 'E02',
    urutan: 10,
    bab: 'Bab 9b',
    judulBab: 'Hidrosfer dan Atmosfer',
    tempat: 'Mata Air',
    penjaga: IBU_PERTIWI,
    cantrik: tokoh('Cantrik Mega', 'perempuan', 'Murid Ibu Pertiwi', '☁️', 0x0ea5e9, 0x334155, 0xe0f2fe, { pitch: 1.3, rate: 1.05 }),
    alat: { nama: 'Botol Air Bersih', emoji: '🫙', guna: 'Menyimpan air minum dari mata air.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum lagi, Nak. Kamu pasti haus setelah mendaki." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam. Iya, Bu. Di mana ada air bersih?" },
      { siapa: 'penjaga', teks: 'Air ada di mana-mana: laut, sungai, danau, bahkan di bawah tanah. Semua itu hidrosfer.' },
      { siapa: 'penjaga', teks: 'Di atas kita, udara menyelimuti bumi berlapis-lapis. Pahami keduanya sebelum mendaki lebih tinggi.' },
    ],
    pilihan: [
      { teks: 'Di lapisan mana awan dan hujan terjadi?', balasan: 'Di lapisan paling bawah, dekat dengan kita. Cantrik Mega akan menunjukkannya.', inginTahu: true },
      { teks: 'Aku mau belajar, Bu!', balasan: 'Ilmu itu seperti air, menghidupkan.' },
    ],
    tugas: 'Cantrik Mega ada di tepi sungai. Belajarlah tentang air dan udara, lalu temui aku di menara cuaca.',
    cantrikSapa: 'Halo! Aku Mega. Ayo kita ikuti air dari laut sampai ke langit!',
    cantrikTutup: 'Kamu sudah paham hidrosfer dan atmosfer! Ibu Pertiwi menunggu di menara cuaca.',
    ujiTerkunci: 'Pelajari dulu air dan udara bersama Cantrik Mega, Nak.',
    ujiBuka: 'Bismillah. Jawablah, dan botolmu akan terisi air bersih.',
    pembukaSoal: [
      'Tetes pertama. Jawablah.',
      'Botolnya mulai terisi. Lanjutkan!',
      'Satu lagi, botolmu hampir penuh!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah, botolmu penuh air jernih.' },
      { siapa: 'penjaga', teks: 'Minumlah sambil duduk dan bacalah basmalah. Jangan sia-siakan air.' },
      { siapa: 'pemain', teks: 'Terima kasih, Ibu Pertiwi!' },
    ],
    gagal: 'Botolmu masih kosong. Pelajari lagi bersama Mega, ya.',
    hikmah: 'Dari air Allah menjadikan segala sesuatu hidup. Hematlah air dan jangan mencemari sungai.',
  },
  {
    kode: 'E03',
    urutan: 11,
    bab: 'Bab 9c',
    judulBab: 'Siklus Air dan Bencana',
    tempat: 'Pos Siaga',
    penjaga: IBU_PERTIWI,
    cantrik: tokoh('Cantrik Banyu', 'laki-laki', 'Murid Ibu Pertiwi', '💧', 0x0891b2, 0x334155, 0x164e63, { pitch: 1.2, rate: 1.05 }),
    alat: { nama: 'Peta Jalur Aman', emoji: '🗺️', guna: 'Menunjukkan jalur evakuasi menuju tempat tinggi.' },
    misi: [
      { siapa: 'penjaga', teks: "Assalamu'alaikum, Nak. Ini halaman terakhirku untukmu." },
      { siapa: 'pemain', teks: "Wa'alaikumussalam. Mercusuar sudah dekat, Bu!" },
      { siapa: 'penjaga', teks: 'Benar. Tapi bumi kadang bergetar, dan laut bisa naik tiba-tiba. Penyintas harus siaga.' },
      { siapa: 'penjaga', teks: 'Pelajari perjalanan air dan cara aman menghadapi gempa dan tsunami.' },
    ],
    pilihan: [
      { teks: 'Kenapa laut bisa surut tiba-tiba?', balasan: 'Itu bisa jadi tanda tsunami. Bila melihatnya, segera lari ke tempat tinggi.', inginTahu: true },
      { teks: 'Aku ingin selalu siaga, Bu.', balasan: 'Siaga itu bagian dari ikhtiar. Setelah ikhtiar, kita bertawakal.' },
    ],
    tugas: 'Cantrik Banyu ada di tepi danau. Belajarlah padanya, lalu temui aku di bukit titik kumpul.',
    cantrikSapa: 'Hai! Aku Banyu. Ayo ikuti perjalanan air, lalu belajar tetap aman saat bumi bergerak!',
    cantrikTutup: 'Kamu sudah siaga bencana! Ibu Pertiwi menunggu di bukit titik kumpul.',
    ujiTerkunci: 'Keselamatan butuh ilmu. Belajarlah dulu bersama Cantrik Banyu.',
    ujiBuka: 'Bismillah. Inilah tantangan terakhirku sebelum mercusuar.',
    pembukaSoal: [
      'Bayangkan hujan turun. Jawablah.',
      'Jalur aman mulai tergambar. Lanjutkan!',
      'Satu lagi, peta hampir lengkap!',
    ],
    lulus: [
      { siapa: 'penjaga', teks: 'Alhamdulillah. Kamu sudah siap menghadapi alam dengan ilmu dan doa.' },
      { siapa: 'penjaga', teks: 'Bawalah Peta Jalur Aman ini. Mercusuar Tua sudah menunggumu.' },
      { siapa: 'pemain', teks: 'Terima kasih, Ibu Pertiwi!' },
    ],
    gagal: 'Petanya belum lengkap. Pelajari lagi bersama Banyu, ya.',
    hikmah: 'Ikhtiar dulu dengan ilmu dan kesiapsiagaan, lalu bertawakal kepada Allah. Tolonglah sesama saat bencana.',
  },
];

/** Busana 3D penjaga, disesuaikan dengan potret ilustrasinya. */
const BUSANA_PENJAGA: Record<string, BusanaNusantara> = {
  'Mbok Sinar': { jarik: 0x78350f },
  'Ki Gaung': { kepala: 'blangkon', warnaKepala: 0x6b3f1d, jenggot: true, jarik: 0x3b2a1a },
  'Nini Rimba': { jarik: 0x14532d },
  'Ki Lumbung': { kepala: 'caping', jarik: 0x5b3a1e },
  'Nyai Kembang': { jarik: 0x9d174d },
  'Eyang Wana': { kepala: 'blangkon', warnaKepala: 0x52525b, jenggot: true, jarik: 0x1c1917 },
  'Empu Wesi': { kepala: 'blangkon', warnaKepala: 0x1c1917, jarik: 0x450a0a },
  'Mbah Kilat': { kepala: 'blangkon', warnaKepala: 0xf1f5f9, jenggot: true, jarik: 0x1e3a8a },
  'Ibu Pertiwi': { selendang: 0x15803d, jarik: 0x365314 },
};

// Potret ilustrasi tiap tokoh: penjaga-<kode>, cantrik-<kode>; Ibu Pertiwi satu potret.
for (const c of CERITA_ASLI) {
  const k = c.kode.toLowerCase();
  c.penjaga.gambar = c.kode.startsWith('E') ? 'penjaga-e' : `penjaga-${k}`;
  c.cantrik.gambar = `cantrik-${k}`;
  c.penjaga.busana = BUSANA_PENJAGA[c.penjaga.nama];
  // Cantrik laki-laki memakai udeng batik seperti di potretnya.
  if (c.cantrik.gender === 'laki-laki') c.cantrik.busana = { kepala: 'udeng', warnaKepala: 0x7c4a1e };
}

/** Naskah sesuai bahasa pilihan pemain (lihat core/bahasa.ts). */
export const CERITA: CeritaBalai[] = lokalkan(CERITA_ASLI);
export const NARATOR: TokohCerita = lokalkan(NARATOR_ASLI);
export const KAPTEN: TokohCerita = lokalkan(KAPTEN_ASLI);

/* ------------------------------------------------------------------ */
/* Prolog, Final, Epilog                                               */
/* ------------------------------------------------------------------ */

export interface AdeganCutscene {
  /** Kelas latar (lihat CSS .cut-*). */
  latar: 'kapal' | 'badai' | 'ombak' | 'putih' | 'goa' | 'mercusuar' | 'kapal-datang' | 'pantai';
  teks: string;
  siapa?: 'narator' | 'kapten';
}

const CUTSCENE_BADAI_ASLI: AdeganCutscene[] = [
  { latar: 'kapal', teks: 'Kapal Ekspedisi Sains berlayar membawa para penjelajah muda untuk mengamati alam Nusantara.', siapa: 'narator' },
  { latar: 'badai', teks: 'Semua berpegangan! Badai besar datang!', siapa: 'kapten' },
  { latar: 'ombak', teks: 'Ombak raksasa menghantam kapal. Penjelajah termuda terlempar ke laut.', siapa: 'narator' },
  { latar: 'putih', teks: 'Lalu, semuanya menjadi sunyi...', siapa: 'narator' },
];

const EPILOG_ASLI: AdeganCutscene[] = [
  { latar: 'mercusuar', teks: 'Lampu Mercusuar Tua menyala terang, menyorot laut yang gelap.', siapa: 'narator' },
  { latar: 'kapal-datang', teks: 'Kami melihat cahayanya! Itu penjelajah kita! Alhamdulillah!', siapa: 'kapten' },
  { latar: 'pantai', teks: 'Sembilan Penjaga melambai dari pantai. Ilmu yang kamu pelajari telah menyelamatkanmu.', siapa: 'narator' },
];

/** Bagian Final di Mercusuar: penjaga pendamping & kode materi yang diuji. */
export interface BagianFinal {
  nama: string;
  tempat: string;
  penjaga: string[];
  kode: MateriKode[];
  pembuka: string;
  selesai: string;
}

const FINAL_BAGIAN_ASLI: BagianFinal[] = [
  {
    nama: 'Bagian 1',
    tempat: 'Lantai Bawah',
    penjaga: ['Mbok Sinar', 'Ki Gaung'],
    kode: ['F01', 'F02'],
    pembuka: 'Badai datang! Pasang Cermin Sinyal dan Kentongan di jendela menara. Bismillah!',
    selesai: 'Cermin dan kentongan sudah terpasang. Naik ke lantai tengah!',
  },
  {
    nama: 'Bagian 2',
    tempat: 'Lantai Tengah',
    penjaga: ['Nini Rimba', 'Ki Lumbung', 'Nyai Kembang', 'Eyang Wana'],
    kode: ['H01', 'H02', 'H03', 'H04'],
    pembuka: 'Angin mendorong pintu menara. Pakai ilmumu tentang makhluk hidup untuk menahannya!',
    selesai: 'Pintu sudah tertahan kuat. Terus naik!',
  },
  {
    nama: 'Bagian 3',
    tempat: 'Lantai Atas',
    penjaga: ['Empu Wesi', 'Mbah Kilat'],
    kode: ['F03', 'F04'],
    pembuka: 'Pasang kompas untuk mencari arah kapal, lalu hubungkan dinamo ke kabel lampu!',
    selesai: 'Kompas menunjuk arah kapal, dinamo sudah tersambung!',
  },
  {
    nama: 'Bagian 4',
    tempat: 'Puncak Lampu',
    penjaga: ['Ibu Pertiwi'],
    kode: ['E01', 'E02', 'E03'],
    pembuka: 'Tangga terakhir retak dan bumi bergetar. Tetap tenang, pakai ilmumu tentang bumi!',
    selesai: 'Lampu mercusuar siap dinyalakan!',
  },
];

export const CUTSCENE_BADAI: AdeganCutscene[] = lokalkan(CUTSCENE_BADAI_ASLI);
export const EPILOG: AdeganCutscene[] = lokalkan(EPILOG_ASLI);
export const FINAL_BAGIAN: BagianFinal[] = lokalkan(FINAL_BAGIAN_ASLI);

/** Batas lulus Final: 21 dari 30 (70%). */
export const BATAS_LULUS_FINAL = 21;

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

export function getCerita(kode: string): CeritaBalai | undefined {
  return CERITA.find((c) => c.kode === kode);
}

/** Kode balai dalam urutan jalur (bab 1 → bab 9c). */
export const URUTAN_BALAI: MateriKode[] = [...CERITA].sort((a, b) => a.urutan - b.urutan).map((c) => c.kode);

/** Balai sebelum kode ini di jalur (null bila balai pertama). */
export function balaiSebelum(kode: string): MateriKode | null {
  const i = URUTAN_BALAI.indexOf(kode as MateriKode);
  return i > 0 ? (URUTAN_BALAI[i - 1] ?? null) : null;
}

/** Balai sesudah kode ini di jalur (null bila terakhir). */
export function balaiSesudah(kode: string): MateriKode | null {
  const i = URUTAN_BALAI.indexOf(kode as MateriKode);
  return i >= 0 && i < URUTAN_BALAI.length - 1 ? (URUTAN_BALAI[i + 1] ?? null) : null;
}

/** Mengganti {nama} dengan nama pemain. */
export function isiNama(teks: string, nama: string): string {
  return teks.replace(/\{nama\}/g, nama || 'Penjelajah');
}
