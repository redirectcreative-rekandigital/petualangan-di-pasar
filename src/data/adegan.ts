import { lokalkan } from '../core/bahasa';
import type { MateriKode } from '../../shared/types';

/**
 * Halaman Cerita: materi IPAS dikemas sebagai cerita bergambar 4 adegan.
 *
 * Setiap adegan digambar sebagai SVG 320×200 (latar + sprite emoji/garis
 * beranimasi CSS) dengan narasi pendek yang dibacakan TTS. Adegan terakhir
 * berisi interaksi kecil (kelompokkan, urutkan, atau pilih) agar siswa aktif.
 *
 * `kata` dipakai untuk mencocokkan soal dengan adegan yang relevan, sehingga
 * Penjaga bisa berkata "Ingat adegan ...?" ketika siswa menjawab salah.
 */

export type Latar =
  | 'goa'
  | 'lembah'
  | 'hutan'
  | 'ladang'
  | 'taman'
  | 'gundul'
  | 'bukit'
  | 'sungai'
  | 'tebing'
  | 'langit'
  | 'laut'
  | 'kamar';

export type Animasi =
  | 'melayang'
  | 'geser'
  | 'geser-balik'
  | 'kedip'
  | 'putar'
  | 'denyut'
  | 'jatuh'
  | 'naik'
  | 'goyang'
  | 'getar'
  | 'muncul'
  | 'gambar'
  /** Garis: titik-titik berjalan sepanjang kabel (arus listrik mengalir). */
  | 'alir'
  /** Garis: arus mengalir, lalu berhenti di paruh kedua siklus 6 detik (karena lampu putus). */
  | 'alir-padam'
  /** Lampu/cahaya: menyala, lalu padam di paruh kedua siklus 6 detik. */
  | 'nyala-padam'
  /** Tanda ❌ "putus": tersembunyi, lalu muncul di paruh kedua siklus 6 detik. */
  | 'tanda-putus';

/** Jenis bunyi untuk gelombang: warna & kerapatan berbeda (infra = ungu renggang, ultra = jingga rapat). */
export type JenisBunyi = 'infra' | 'audio' | 'ultra';

export type Sprite =
  /** `n`: nama benda, muncul saat benda diketuk. */
  | { t?: 'emoji'; e: string; x: number; y: number; s?: number; a?: Animasi; d?: number; n?: string }
  /** Tiga busur yang memancar dari (x, y); `arah` 1 = ke kanan, -1 = ke kiri. */
  | { t: 'gelombang'; x: number; y: number; arah: 1 | -1; jenis: JenisBunyi; s?: number; d?: number }
  | { t: 'garis'; x1: number; y1: number; x2: number; y2: number; w?: string; tebal?: number; a?: Animasi; d?: number; putus?: boolean }
  | { t: 'label'; teks: string; x: number; y: number; s?: number; a?: Animasi; d?: number; w?: string }
  | { t: 'kotak'; x: number; y: number; lebar: number; tinggi: number; w: string; a?: Animasi; d?: number; r?: number };

export interface ItemKelompok {
  e: string;
  nama: string;
  /** Indeks kelompok yang benar. */
  k: number;
}

export type Interaksi =
  | { jenis: 'kelompok'; soal: string; kelompok: string[]; item: ItemKelompok[] }
  | { jenis: 'urut'; soal: string; item: Array<{ e: string; nama: string }>; selesai: string }
  | { jenis: 'pilih'; soal: string; opsi: Array<{ teks: string; benar: boolean; alasan: string }> };

export interface Adegan {
  judul: string;
  latar: Latar;
  narasi: string[];
  sprite: Sprite[];
  kata: string[];
  interaksi?: Interaksi;
}

/* Singkatan agar data ringkas. */
const e = (emo: string, x: number, y: number, s = 30, a?: Animasi, d?: number, n?: string): Sprite => ({ e: emo, x, y, s, a, d, n });
const gel = (x: number, y: number, arah: 1 | -1, jenis: JenisBunyi, s = 18, d = 0): Sprite => ({ t: 'gelombang', x, y, arah, jenis, s, d });
const g = (x1: number, y1: number, x2: number, y2: number, w = '#fde047', a: Animasi = 'gambar', d = 0, tebal = 4): Sprite => ({
  t: 'garis', x1, y1, x2, y2, w, a, d, tebal,
});
const l = (teks: string, x: number, y: number, s = 11, a: Animasi = 'muncul', d = 0, w = '#0f172a'): Sprite => ({
  t: 'label', teks, x, y, s, a, d, w,
});

/**
 * Kabel listrik: garis dasar abu-abu tua + lapisan titik kuning berjalan (arus).
 * `alir` = arus terus mengalir; `alir-padam` = arus berhenti saat lampu putus.
 */
const kabel = (x1: number, y1: number, x2: number, y2: number, alir: Animasi = 'alir'): Sprite[] => [
  { t: 'garis', x1, y1, x2, y2, w: '#334155', tebal: 5 },
  { t: 'garis', x1, y1, x2, y2, w: '#facc15', tebal: 3, a: alir },
];

/** Lampu dengan cahaya bulat di belakangnya; `padam` = ikut siklus putus/padam. */
const lampu = (x: number, y: number, padam = false, s = 26): Sprite[] => [
  { t: 'kotak', x: x - s * 0.75, y: y - s * 0.75, lebar: s * 1.5, tinggi: s * 1.5, r: s * 0.75, w: 'rgba(253, 224, 71, 0.55)', a: padam ? 'nyala-padam' : 'denyut' },
  e('💡', x, y, s, padam ? 'nyala-padam' : undefined),
];

/** Adegan asli (Bahasa Indonesia): kata kunci `kata` dicocokkan dengan teks soal asli. */
export const ADEGAN_ASLI: Record<MateriKode, Adegan[]> = {
  /* ============================ BAB 1 CAHAYA ============================ */
  F01: [
    {
      judul: 'Berkas Sinar di Dalam Goa',
      latar: 'goa',
      narasi: [
        'Di dalam goa yang gelap, sebuah berkas sinar masuk dari celah atap.',
        'Lihat! Sinarnya lurus. Cahaya selalu merambat lurus.',
      ],
      sprite: [e('☀️', 40, 26, 42, 'denyut', 0, 'Matahari'), g(52, 30, 200, 170, '#fde047', 'gambar', 0.3, 10), e('🧒', 218, 152, 50, undefined, undefined, 'Anak'), l('merambat lurus', 150, 95, 12, 'muncul', 1.2, '#fef9c3')],
      kata: ['lurus', 'merambat', 'cahaya'],
    },
    {
      judul: 'Cermin dan Air',
      latar: 'goa',
      narasi: [
        'Cantrik Prisma memegang cermin. Sinar mengenai cermin lalu dipantulkan.',
        'Saat sinar masuk ke air, jalannya membelok. Itu namanya pembiasan.',
      ],
      sprite: [
        g(20, 40, 120, 110, '#fde047', 'gambar', 0, 6),
        e('🪞', 125, 112, 40, undefined, undefined, 'Cermin'),
        g(128, 108, 230, 40, '#fde047', 'gambar', 0.8, 6),
        l('dipantulkan', 205, 30, 11, 'muncul', 1.2, '#fef9c3'),
        { t: 'kotak', x: 190, y: 140, lebar: 120, tinggi: 55, w: '#38bdf8', r: 6 },
        g(200, 100, 235, 140, '#fde047', 'gambar', 1.6, 5),
        g(235, 140, 250, 190, '#fde047', 'gambar', 2, 5),
        l('dibiaskan', 270, 132, 11, 'muncul', 2.2, '#fef9c3'),
      ],
      kata: ['pantul', 'cermin', 'bias', 'membelok', 'air', 'cekung', 'cembung', 'datar', 'bayangan'],
    },
    {
      judul: 'Cahaya Masuk ke Mata',
      latar: 'kamar',
      narasi: [
        'Kita bisa melihat karena cahaya dari benda masuk ke mata.',
        'Cahaya melewati kornea, pupil, lensa, lalu jatuh di retina. Saraf membawa pesannya ke otak.',
      ],
      sprite: [
        e('🌼', 30, 108, 44, undefined, undefined, 'Benda (bunga)'),
        g(50, 105, 150, 105, '#facc15', 'gambar', 0.2, 4),
        e('👁️', 170, 105, 66, 'denyut', 0, 'Mata'),
        g(195, 105, 270, 80, '#f472b6', 'gambar', 1.2, 3),
        e('🧠', 285, 72, 44, 'muncul', 1.6, 'Otak'),
        l('kornea → pupil → lensa → retina', 160, 170, 11, 'muncul', 0.8),
      ],
      kata: ['mata', 'kornea', 'pupil', 'iris', 'lensa', 'retina', 'saraf', 'melihat', 'otak'],
    },
    {
      judul: 'Menjaga Mata',
      latar: 'kamar',
      narasi: [
        'Mata adalah nikmat dari Allah yang harus dijaga.',
        'Ayo pilih kebiasaan yang baik untuk mata!',
      ],
      sprite: [e('📖', 85, 115, 56, undefined, undefined, 'Membaca buku'), e('💡', 150, 50, 46, 'kedip', 0, 'Cahaya terang'), e('🥕', 230, 120, 50, 'goyang', 0, 'Wortel (vitamin A)')],
      kata: ['menjaga', 'rabun', 'kacamata', 'gangguan', 'jarak', 'terang', 'vitamin'],
      interaksi: {
        jenis: 'pilih',
        soal: 'Mana kebiasaan yang menjaga kesehatan mata?',
        opsi: [
          { teks: 'Membaca di tempat terang dengan jarak sekitar 30 cm', benar: true, alasan: 'Benar! Cahaya cukup dan jarak yang pas membuat mata tidak lelah.' },
          { teks: 'Bermain gawai sambil berbaring dalam gelap', benar: false, alasan: 'Kurang tepat. Gelap dan jarak terlalu dekat membuat mata cepat lelah.' },
          { teks: 'Menatap matahari langsung', benar: false, alasan: 'Berbahaya! Cahaya matahari langsung bisa merusak retina.' },
        ],
      },
    },
  ],

  /* ============================= BAB 2 BUNYI ============================ */
  F02: [
    {
      judul: 'Bunyi Merambat',
      latar: 'lembah',
      narasi: [
        'Bunyi terjadi karena benda bergetar. Getarannya merambat lewat udara sampai ke telinga.',
        'Bunyi bisa merambat lewat benda padat, cair, dan gas, tapi tidak di ruang hampa.',
      ],
      sprite: [
        e('🥁', 55, 100, 62, 'getar', 0, 'Gendang bergetar'),
        gel(92, 98, 1, 'audio', 20),
        gel(160, 98, 1, 'audio', 20, 0.6),
        e('👂', 262, 98, 64, 'denyut', 0.8, 'Telinga'),
        e('🧱', 110, 150, 24, undefined, undefined, 'Padat'),
        e('💧', 160, 150, 24, undefined, undefined, 'Cair'),
        e('💨', 210, 150, 24, undefined, undefined, 'Gas (udara)'),
        l('padat · cair · gas', 160, 182, 12),
      ],
      kata: ['merambat', 'getar', 'medium', 'perantara', 'padat', 'cair', 'gas', 'hampa', 'udara', 'kecepatan'],
    },
    {
      judul: 'Gema di Lembah',
      latar: 'lembah',
      narasi: [
        'Pemain berteriak "Halo!" ke arah tebing. Bunyinya memantul kembali.',
        'Bunyi pantul yang terdengar setelah bunyi asli disebut gema. Bunyi bisa juga diserap benda lunak.',
      ],
      sprite: [
        e('⛰️', 262, 112, 104, undefined, undefined, 'Tebing'),
        e('🧒', 48, 135, 52, undefined, undefined, 'Pemain berteriak'),
        l('Halo!', 78, 92, 14, 'muncul', 0),
        gel(78, 120, 1, 'audio', 22),
        gel(205, 135, -1, 'audio', 20, 1),
        l('...halo!', 130, 172, 13, 'muncul', 1.6, '#7c3aed'),
      ],
      kata: ['gema', 'gaung', 'pantul', 'serap', 'tebing', 'peredam'],
    },
    {
      judul: 'Perjalanan Bunyi di Telinga',
      latar: 'kamar',
      narasi: [
        'Daun telinga menangkap bunyi. Gendang telinga ikut bergetar.',
        'Getaran diteruskan tulang pendengaran ke rumah siput, lalu saraf membawanya ke otak.',
      ],
      sprite: [
        gel(6, 95, 1, 'audio', 16),
        e('👂', 62, 95, 66, undefined, undefined, 'Daun telinga'),
        e('🥁', 132, 95, 36, 'getar', 0.5, 'Gendang telinga'),
        e('🦴', 185, 95, 34, 'muncul', 0.8, 'Tulang pendengaran'),
        e('🐌', 236, 95, 38, 'muncul', 1.1, 'Rumah siput (koklea)'),
        e('🧠', 290, 92, 42, 'muncul', 1.5, 'Otak (lewat saraf)'),
        l('daun telinga → gendang → tulang → rumah siput', 160, 170, 10),
      ],
      kata: ['telinga', 'gendang', 'koklea', 'rumah siput', 'tulang', 'martil', 'landasan', 'sanggurdi', 'saraf', 'mendengar'],
    },
    {
      judul: 'Mendengar dengan Telinga Sehat',
      latar: 'lembah',
      narasi: [
        'Manusia bisa mendengar bunyi audiosonik, yaitu 20 sampai 20.000 getaran per detik.',
        'Ayo kelompokkan bunyi berikut!',
      ],
      sprite: [
        e('🐘', 52, 125, 70, undefined, undefined, 'Gajah: infrasonik'),
        gel(92, 122, 1, 'infra', 14),
        e('🧒', 165, 130, 56, undefined, undefined, 'Manusia: audiosonik'),
        e('🦇', 268, 60, 56, 'melayang', 0, 'Kelelawar: ultrasonik'),
        gel(240, 60, -1, 'ultra', 14),
      ],
      kata: ['infrasonik', 'audiosonik', 'ultrasonik', 'frekuensi', 'kelelawar', 'lumba', 'jangkrik', 'amplitudo'],
      interaksi: {
        jenis: 'kelompok',
        soal: 'Bunyi ini bisa didengar manusia atau tidak?',
        kelompok: ['Bisa didengar', 'Tidak terdengar manusia'],
        item: [
          { e: '🗣️', nama: 'Suara teman bercakap', k: 0 },
          { e: '🦇', nama: 'Bunyi ultrasonik kelelawar', k: 1 },
          { e: '🔔', nama: 'Bunyi bel sekolah', k: 0 },
          { e: '🐘', nama: 'Bunyi infrasonik gajah', k: 1 },
        ],
      },
    },
  ],

  /* =========================== BAB 3 EKOSISTEM ========================== */
  H01: [
    {
      judul: 'Mengamati Hutan',
      latar: 'hutan',
      narasi: [
        'Di hutan ada pohon, kupu-kupu, rusa, jamur, batu, air, tanah, dan sinar matahari.',
        'Hubungan timbal balik antara makhluk hidup dan lingkungannya disebut ekosistem.',
      ],
      sprite: [e('☀️', 280, 28, 40, 'denyut', 0, 'Matahari'), e('🌳', 62, 104, 78, undefined, undefined, 'Pohon'), e('🦋', 155, 58, 36, 'melayang', 0, 'Kupu-kupu'), e('🦌', 205, 135, 58, undefined, undefined, 'Rusa'), e('🍄', 118, 160, 34, undefined, undefined, 'Jamur'), e('🪨', 268, 162, 36, undefined, undefined, 'Batu'), e('💧', 26, 168, 26, 'jatuh', 0, 'Air')],
      kata: ['ekosistem', 'timbal balik', 'lingkungan', 'hutan'],
    },
    {
      judul: 'Biotik dan Abiotik',
      latar: 'hutan',
      narasi: [
        'Yang hidup disebut biotik: tumbuhan, hewan, manusia, jamur, dan bakteri.',
        'Yang tidak hidup disebut abiotik: air, udara, tanah, batu, cahaya, dan suhu.',
      ],
      sprite: [
        { t: 'kotak', x: 15, y: 30, lebar: 140, tinggi: 150, w: '#bbf7d0', r: 10 },
        { t: 'kotak', x: 165, y: 30, lebar: 140, tinggi: 150, w: '#e2e8f0', r: 10 },
        l('BIOTIK', 85, 50, 13), l('ABIOTIK', 235, 50, 13),
        e('🌿', 50, 100, 38, 'muncul', 0.3, 'Tumbuhan'), e('🐿️', 115, 100, 38, 'muncul', 0.6, 'Hewan (tupai)'), e('🍄', 82, 148, 36, 'muncul', 0.9, 'Jamur'),
        e('💧', 200, 100, 36, 'muncul', 1.2, 'Air'), e('🪨', 265, 100, 36, 'muncul', 1.5, 'Batu'), e('☀️', 232, 148, 36, 'muncul', 1.8, 'Cahaya matahari'),
      ],
      kata: ['biotik', 'abiotik', 'tak hidup', 'komponen', 'tanah', 'batu', 'suhu'],
    },
    {
      judul: 'Produsen, Konsumen, Pengurai',
      latar: 'hutan',
      narasi: [
        'Tumbuhan hijau adalah produsen. Ia membuat makanan sendiri dengan fotosintesis.',
        'Hewan adalah konsumen. Jamur dan bakteri adalah pengurai yang mengembalikan sisa makhluk hidup ke tanah.',
      ],
      sprite: [e('🌱', 60, 118, 52, 'naik', 0, 'Tumbuhan hijau'), l('produsen', 60, 165), e('🐇', 160, 120, 52, undefined, undefined, 'Kelinci (hewan)'), l('konsumen', 160, 165, 11, 'muncul', 0.6), e('🍄', 260, 124, 48, 'muncul', 1, 'Jamur'), l('pengurai', 260, 165, 11, 'muncul', 1.2)],
      kata: ['produsen', 'konsumen', 'pengurai', 'fotosintesis', 'herbivora', 'karnivora', 'omnivora', 'jamur', 'bakteri', 'insektivora'],
    },
    {
      judul: 'Catat Penghuni Hutan',
      latar: 'hutan',
      narasi: ['Ekosistem ada di darat, di perairan, dan ada juga buatan manusia seperti sawah.', 'Ayo catat penghuni hutan di Buku Catatan!'],
      // Buku catatan + penghuni hutan yang akan dikelompokkan (biotik/abiotik).
      sprite: [
        e('📒', 160, 60, 50, 'denyut', 0, 'Buku Catatan'),
        e('🌳', 45, 140, 46, 'muncul', 0.2, 'Pohon'), e('🐿️', 102, 150, 38, 'muncul', 0.4, 'Tupai'), e('🍄', 152, 155, 34, 'muncul', 0.6, 'Jamur'),
        e('💧', 202, 152, 32, 'muncul', 0.8, 'Air'), e('☀️', 248, 140, 38, 'muncul', 1, 'Cahaya matahari'), e('🌬️', 292, 150, 34, 'muncul', 1.2, 'Angin (udara)'),
        l('biotik atau abiotik?', 160, 112, 12, 'muncul', 1.4),
      ],
      kata: ['darat', 'perairan', 'buatan', 'sawah', 'kolam', 'akuarium', 'laut'],
      interaksi: {
        jenis: 'kelompok',
        soal: 'Termasuk biotik atau abiotik?',
        kelompok: ['Biotik', 'Abiotik'],
        item: [
          { e: '🐸', nama: 'Katak', k: 0 },
          { e: '🪨', nama: 'Batu', k: 1 },
          { e: '🍄', nama: 'Jamur', k: 0 },
          { e: '💧', nama: 'Air', k: 1 },
          { e: '☀️', nama: 'Cahaya matahari', k: 1 },
        ],
      },
    },
  ],

  /* ========================= BAB 4 RANTAI MAKANAN ======================= */
  H02: [
    {
      judul: 'Energi dari Matahari',
      latar: 'ladang',
      narasi: [
        'Semua energi di ladang berawal dari matahari.',
        'Padi dan rumput menangkap cahaya matahari untuk membuat makanan. Mereka produsen.',
      ],
      sprite: [e('☀️', 40, 32, 50, 'denyut', 0, 'Matahari (sumber energi)'), g(62, 50, 145, 120, '#facc15', 'gambar', 0.3, 3), e('🌾', 165, 135, 62, 'goyang', 0, 'Padi (produsen)'), e('🌿', 240, 148, 44, 'goyang', 0.3, 'Rumput (produsen)'), l('produsen', 200, 185, 11, 'muncul', 1)],
      kata: ['matahari', 'energi', 'produsen', 'padi', 'rumput'],
    },
    {
      judul: 'Siapa Makan Siapa',
      latar: 'ladang',
      narasi: [
        'Belalang makan padi. Katak makan belalang. Ular makan katak. Elang makan ular.',
        'Peristiwa makan dan dimakan secara berurutan disebut rantai makanan.',
      ],
      sprite: [
        e('🌾', 30, 140, 38, undefined, undefined, 'Padi'), e('🦗', 90, 140, 36, 'muncul', 0.5, 'Belalang'), e('🐸', 150, 140, 38, 'muncul', 1, 'Katak'), e('🐍', 210, 140, 38, 'muncul', 1.5, 'Ular'), e('🦅', 275, 106, 46, 'muncul', 2, 'Elang'),
        g(45, 140, 75, 140, '#f97316', 'gambar', 0.5, 3), g(105, 140, 133, 140, '#f97316', 'gambar', 1, 3), g(167, 140, 193, 140, '#f97316', 'gambar', 1.5, 3), g(227, 135, 258, 115, '#f97316', 'gambar', 2, 3),
        l('konsumen I → II → III → puncak', 160, 185, 11, 'muncul', 2.3),
      ],
      kata: ['rantai makanan', 'makan dan dimakan', 'konsumen', 'tingkat', 'belalang', 'katak', 'ular', 'elang', 'tikus'],
    },
    {
      judul: 'Jaring-Jaring Makanan',
      latar: 'ladang',
      narasi: [
        'Di alam, satu makhluk bisa makan lebih dari satu jenis makanan.',
        'Beberapa rantai makanan yang saling berhubungan membentuk jaring-jaring makanan. Jamur menguraikan yang mati.',
      ],
      sprite: [e('🌾', 60, 152, 36, undefined, undefined, 'Padi'), e('🐭', 40, 90, 34, undefined, undefined, 'Tikus'), e('🦗', 110, 90, 34, undefined, undefined, 'Belalang'), e('🐸', 172, 60, 34, undefined, undefined, 'Katak'), e('🐍', 110, 30, 34, undefined, undefined, 'Ular'), e('🦅', 252, 42, 44, 'melayang', 0, 'Elang'), e('🍄', 252, 148, 42, 'muncul', 1.2, 'Jamur (pengurai)'),
        g(60, 140, 45, 105, '#f97316', 'gambar', 0.2, 2), g(65, 140, 105, 105, '#f97316', 'gambar', 0.4, 2), g(115, 80, 160, 65, '#f97316', 'gambar', 0.6, 2), g(45, 80, 100, 40, '#f97316', 'gambar', 0.8, 2), g(165, 50, 125, 35, '#f97316', 'gambar', 1, 2), g(125, 28, 230, 40, '#f97316', 'gambar', 1.2, 2)],
      kata: ['jaring', 'jaring-jaring', 'pengurai', 'keseimbangan', 'punah', 'populasi'],
    },
    {
      judul: 'Susun Rantai Makanan',
      latar: 'ladang',
      narasi: ['Sekarang giliranmu. Susun rantai makanan dari produsen sampai konsumen puncak!'],
      // Rantai yang belum lengkap: produsen → ? → ? → konsumen puncak.
      sprite: [
        e('🌾', 40, 100, 42, undefined, undefined, 'Padi (produsen)'), g(64, 100, 92, 100, '#ea580c', 'gambar', 0.2, 4),
        e('❓', 118, 100, 32, 'denyut', 0.4), g(140, 100, 170, 100, '#ea580c', 'gambar', 0.6, 4),
        e('❓', 196, 100, 32, 'denyut', 0.8), g(218, 100, 248, 100, '#ea580c', 'gambar', 1, 4),
        e('🦅', 278, 96, 46, undefined, undefined, 'Elang (konsumen puncak)'),
        l('produsen', 40, 140, 11, 'muncul', 0.3), l('konsumen puncak', 256, 140, 11, 'muncul', 1.2),
        l('susun dari bawah ke atas!', 160, 52, 12, 'muncul', 1.4),
      ],
      kata: ['urutan', 'susun'],
      interaksi: {
        jenis: 'urut',
        soal: 'Ketuk dari produsen sampai konsumen puncak.',
        item: [
          { e: '🌾', nama: 'Padi' },
          { e: '🐭', nama: 'Tikus' },
          { e: '🐍', nama: 'Ular' },
          { e: '🦅', nama: 'Elang' },
        ],
        selesai: 'Tepat! Padi → tikus → ular → elang. Energi mengalir dari produsen ke konsumen puncak.',
      },
    },
  ],

  /* =========================== BAB 5 SIMBIOSIS ========================== */
  H03: [
    {
      judul: 'Lebah dan Bunga',
      latar: 'taman',
      narasi: [
        'Lebah mengisap nektar dari bunga. Sambil terbang, lebah membantu penyerbukan bunga.',
        'Keduanya untung. Hubungan saling menguntungkan disebut simbiosis mutualisme.',
      ],
      sprite: [e('🌸', 90, 135, 60, undefined, undefined, 'Bunga'), e('🌼', 230, 140, 56, undefined, undefined, 'Bunga'), e('🐝', 160, 74, 46, 'melayang', 0, 'Lebah'), l('untung + untung', 160, 185, 12, 'muncul', 0.8, '#15803d')],
      kata: ['mutualisme', 'lebah', 'bunga', 'penyerbukan', 'menguntungkan', 'kupu'],
    },
    {
      judul: 'Anggrek di Batang Pohon',
      latar: 'taman',
      narasi: [
        'Anggrek menempel di batang pohon untuk mendapat cahaya. Pohonnya tidak dirugikan.',
        'Satu untung, yang lain tidak untung dan tidak rugi. Itu simbiosis komensalisme.',
      ],
      sprite: [e('🌳', 160, 104, 112, undefined, undefined, 'Pohon'), e('🌺', 188, 92, 34, 'denyut', 0, 'Anggrek'), l('untung + biasa saja', 160, 185, 12, 'muncul', 0.8, '#0369a1')],
      kata: ['komensalisme', 'anggrek', 'menempel', 'tidak dirugikan', 'ikan remora', 'hiu'],
    },
    {
      judul: 'Benalu dan Nyamuk',
      latar: 'taman',
      narasi: [
        'Benalu mengambil makanan dari pohon inangnya, sehingga pohon merugi. Nyamuk mengisap darah manusia.',
        'Satu untung, yang lain rugi. Itu simbiosis parasitisme. Ada juga predasi dan kompetisi.',
      ],
      sprite: [e('🌳', 85, 105, 92, undefined, undefined, 'Pohon inang'), e('🌿', 108, 72, 34, 'goyang', 0, 'Benalu'), e('🦟', 228, 66, 36, 'melayang', 0, 'Nyamuk'), e('🧒', 245, 135, 54, undefined, undefined, 'Manusia'), l('untung + rugi', 160, 185, 12, 'muncul', 0.8, '#b91c1c')],
      kata: ['parasitisme', 'benalu', 'nyamuk', 'kutu', 'tali putri', 'merugikan', 'inang', 'predasi', 'kompetisi', 'persaingan'],
    },
    {
      judul: 'Cocokkan Pasangan',
      latar: 'taman',
      narasi: ['Ayo tentukan jenis hubungan setiap pasangan makhluk hidup!'],
      // Tiga pasangan makhluk hidup; tanda tanya = jenis simbiosisnya.
      sprite: [
        e('🐝', 42, 78, 36, 'melayang', 0, 'Lebah'), e('🌸', 82, 90, 36, undefined, undefined, 'Bunga'), e('❓', 62, 140, 26, 'denyut', 0.3),
        e('🌳', 148, 82, 50, undefined, undefined, 'Pohon'), e('🌺', 174, 72, 24, undefined, undefined, 'Anggrek'), e('❓', 160, 140, 26, 'denyut', 0.6),
        e('🦟', 238, 70, 30, 'melayang', 0, 'Nyamuk'), e('🧒', 275, 92, 40, undefined, undefined, 'Manusia'), e('❓', 258, 140, 26, 'denyut', 0.9),
        l('mutualisme · komensalisme · parasitisme', 160, 30, 11, 'muncul', 1.2),
      ],
      kata: ['simbiosis', 'hubungan'],
      interaksi: {
        jenis: 'kelompok',
        soal: 'Termasuk simbiosis apa?',
        kelompok: ['Mutualisme', 'Komensalisme', 'Parasitisme'],
        item: [
          { e: '🐝🌸', nama: 'Lebah dan bunga', k: 0 },
          { e: '🌺🌳', nama: 'Anggrek dan pohon', k: 1 },
          { e: '🌿🌳', nama: 'Benalu dan pohon', k: 2 },
          { e: '🦟🧒', nama: 'Nyamuk dan manusia', k: 2 },
        ],
      },
    },
  ],

  /* ========================== BAB 6 KELESTARIAN ========================= */
  H04: [
    {
      judul: 'Hutan yang Terluka',
      latar: 'gundul',
      narasi: [
        'Pohon ditebang tanpa ditanam lagi. Sampah dibuang sembarangan. Hewan diburu.',
        'Akibatnya hewan kehilangan rumah, tanah longsor, dan banjir datang.',
      ],
      sprite: [e('🪓', 65, 115, 48, 'goyang', 0, 'Kapak (penebangan)'), e('🪵', 130, 158, 44, undefined, undefined, 'Kayu ditebang'), e('🗑️', 190, 158, 38, undefined, undefined, 'Sampah'), e('🌧️', 240, 44, 50, 'muncul', 0.8, 'Hujan deras'), e('🌊', 268, 148, 50, 'muncul', 1.4, 'Banjir')],
      kata: ['penebangan', 'liar', 'banjir', 'longsor', 'kerusakan', 'perburuan', 'sampah', 'pencemaran', 'gundul'],
    },
    {
      judul: 'Menanam dan 3R',
      latar: 'gundul',
      narasi: [
        'Kita bisa menanam kembali hutan yang gundul. Itu namanya reboisasi. Menebang pun harus tebang pilih.',
        'Kurangi sampah, pakai ulang, dan daur ulang barang. Itulah 3R: reduce, reuse, recycle.',
      ],
      sprite: [e('🌱', 45, 150, 38, 'naik', 0, 'Bibit pohon'), e('🌱', 95, 150, 38, 'naik', 0.4, 'Bibit pohon'), e('🌳', 150, 130, 62, 'muncul', 0.9, 'Pohon tumbuh (reboisasi)'), e('♻️', 252, 78, 56, 'putar', 0, 'Daur ulang (3R)'), l('reduce · reuse · recycle', 250, 138, 11, 'muncul', 1.2)],
      kata: ['reboisasi', 'tebang pilih', '3r', 'daur ulang', 'reduce', 'reuse', 'recycle', 'menanam', 'terasering'],
    },
    {
      judul: 'Rumah Aman bagi Satwa',
      latar: 'hutan',
      narasi: [
        'Indonesia punya cagar alam, suaka margasatwa, dan taman nasional untuk melindungi tumbuhan dan hewan.',
        'Satwa langka seperti komodo, orangutan, harimau sumatra, dan badak jawa harus kita jaga.',
      ],
      sprite: [e('🦎', 50, 138, 52, undefined, undefined, 'Komodo'), e('🦧', 122, 118, 56, undefined, undefined, 'Orangutan'), e('🐅', 198, 138, 54, undefined, undefined, 'Harimau sumatra'), e('🦏', 272, 138, 52, undefined, undefined, 'Badak jawa'), l('satwa langka Indonesia', 160, 50, 12)],
      kata: ['cagar alam', 'suaka', 'taman nasional', 'langka', 'komodo', 'orangutan', 'harimau', 'badak', 'konservasi', 'dilindungi'],
    },
    {
      judul: 'Pilih Tindakan Khalifah',
      latar: 'gundul',
      narasi: ['Sebagai khalifah di bumi, pilih tindakan yang menjaga alam!'],
      sprite: [e('🌱', 160, 100, 72, 'naik', 0, 'Menanam pohon')],
      kata: ['menjaga', 'lestari', 'khalifah'],
      interaksi: {
        jenis: 'kelompok',
        soal: 'Tindakan ini menjaga atau merusak alam?',
        kelompok: ['Menjaga alam', 'Merusak alam'],
        item: [
          { e: '🌱', nama: 'Menanam pohon di lahan gundul', k: 0 },
          { e: '🗑️', nama: 'Membuang sampah ke sungai', k: 1 },
          { e: '♻️', nama: 'Memakai ulang botol minum', k: 0 },
          { e: '🔥', nama: 'Membakar hutan untuk membuka lahan', k: 1 },
        ],
      },
    },
  ],

  /* ============================= BAB 7 MAGNET =========================== */
  F03: [
    {
      judul: 'Batu yang Menarik Paku',
      latar: 'bukit',
      narasi: [
        'Paku besi melompat dan menempel ke batu magnet. Magnet menarik benda dari besi, baja, nikel, dan kobalt.',
        'Kayu, plastik, dan kertas tidak ditarik magnet. Gaya tarik paling kuat ada di kedua kutubnya.',
      ],
      sprite: [e('🧲', 160, 92, 72, 'getar', 0, 'Magnet'), e('📌', 100, 148, 34, 'naik', 0, 'Paku besi'), e('📌', 222, 148, 34, 'naik', 0.4, 'Paku besi'), e('🪵', 50, 162, 38, undefined, undefined, 'Kayu (tidak ditarik)'), e('📄', 275, 162, 32, undefined, undefined, 'Kertas (tidak ditarik)'), l('kutub = paling kuat', 160, 30, 12)],
      kata: ['magnet', 'menarik', 'besi', 'baja', 'nikel', 'kobalt', 'magnetis', 'kutub', 'terkuat', 'benda'],
    },
    {
      judul: 'Kutub Utara dan Selatan',
      latar: 'bukit',
      narasi: [
        'Setiap magnet punya kutub utara (U) dan kutub selatan (S).',
        'Kutub yang sama saling tolak-menolak. Kutub yang berbeda saling tarik-menarik.',
      ],
      sprite: [
        // Merah = S (selatan), biru = U (utara). Tiap huruf ikut animasi baloknya
        // supaya tetap menempel saat magnet bergerak.
        // Atas: U menghadap U → kedua magnet saling menjauh (tolak-menolak).
        { t: 'kotak', x: 30, y: 50, lebar: 50, tinggi: 26, w: '#ef4444', r: 4, a: 'geser-balik' }, { t: 'kotak', x: 80, y: 50, lebar: 50, tinggi: 26, w: '#3b82f6', r: 4, a: 'geser-balik' },
        l('S', 55, 68, 14, 'geser-balik', 0, '#fff'), l('U', 105, 68, 14, 'geser-balik', 0, '#fff'),
        { t: 'kotak', x: 190, y: 50, lebar: 50, tinggi: 26, w: '#3b82f6', r: 4, a: 'geser' }, { t: 'kotak', x: 240, y: 50, lebar: 50, tinggi: 26, w: '#ef4444', r: 4, a: 'geser' },
        l('U', 215, 68, 14, 'geser', 0, '#fff'), l('S', 265, 68, 14, 'geser', 0, '#fff'),
        l('U bertemu U → tolak-menolak', 160, 104, 12),
        // Bawah: U menghadap S → menempel (tarik-menarik).
        { t: 'kotak', x: 70, y: 132, lebar: 45, tinggi: 24, w: '#ef4444', r: 4 }, { t: 'kotak', x: 115, y: 132, lebar: 45, tinggi: 24, w: '#3b82f6', r: 4 },
        l('S', 92, 149, 13, 'muncul', 0, '#fff'), l('U', 137, 149, 13, 'muncul', 0, '#fff'),
        { t: 'kotak', x: 165, y: 132, lebar: 45, tinggi: 24, w: '#ef4444', r: 4, a: 'muncul', d: 1 }, { t: 'kotak', x: 210, y: 132, lebar: 45, tinggi: 24, w: '#3b82f6', r: 4, a: 'muncul', d: 1 },
        l('S', 187, 149, 13, 'muncul', 1, '#fff'), l('U', 232, 149, 13, 'muncul', 1, '#fff'),
        l('U bertemu S → tarik-menarik', 160, 172, 12, 'muncul', 1.2),
      ],
      kata: ['kutub', 'utara', 'selatan', 'tolak', 'tarik', 'senama', 'sejenis', 'berbeda', 'sama'],
    },
    {
      judul: 'Membuat Magnet Sendiri',
      latar: 'bukit',
      narasi: [
        'Besi bisa dijadikan magnet dengan menggosoknya memakai magnet ke satu arah. Bisa juga dengan induksi, atau dengan arus listrik (elektromagnet).',
        'Kemagnetan bisa hilang bila magnet dipanaskan, dipukul-pukul, atau dijatuhkan berulang kali.',
      ],
      sprite: [e('📍', 80, 120, 44, undefined, undefined, 'Besi'), e('🧲', 122, 68, 44, 'geser', 0, 'Magnet'), l('gosok satu arah', 110, 160, 11), e('🔋', 225, 100, 44, undefined, undefined, 'Baterai'), e('🌀', 275, 100, 40, 'putar', 0, 'Kumparan kawat'), l('elektromagnet', 250, 160, 11, 'muncul', 0.8)],
      kata: ['membuat', 'menggosok', 'induksi', 'elektromagnet', 'arus', 'hilang', 'dipanaskan', 'dipukul', 'dijatuhkan', 'permanen', 'sementara'],
    },
    {
      judul: 'Jarum Kompas',
      latar: 'bukit',
      narasi: ['Jarum yang sudah bermagnet akan menunjuk arah utara-selatan. Itulah prinsip kompas.'],
      sprite: [e('🧭', 160, 100, 84, 'goyang', 0, 'Kompas')],
      kata: ['kompas', 'arah', 'pemanfaatan', 'dinamo', 'speaker', 'bel'],
      interaksi: {
        jenis: 'pilih',
        soal: 'Benda mana yang ditarik magnet?',
        opsi: [
          { teks: 'Paku besi', benar: true, alasan: 'Benar! Besi termasuk benda magnetis.' },
          { teks: 'Penggaris plastik', benar: false, alasan: 'Plastik tidak ditarik magnet. Ia benda nonmagnetis.' },
          { teks: 'Pensil kayu', benar: false, alasan: 'Kayu tidak ditarik magnet.' },
        ],
      },
    },
  ],

  /* ============================ BAB 8 LISTRIK =========================== */
  F04: [
    {
      judul: 'Kincir di Sungai',
      latar: 'sungai',
      narasi: [
        'Air sungai yang deras memutar kincir. Kincir memutar generator dan menghasilkan listrik.',
        'Inilah cara kerja pembangkit listrik tenaga air (PLTA). Ada juga tenaga surya, angin, dan uap.',
      ],
      sprite: [
        // Sumber listrik lain di baris atas.
        e('☀️', 34, 30, 28, undefined, undefined, 'Tenaga surya'), l('surya', 34, 58, 11), e('🌬️', 92, 30, 28, undefined, undefined, 'Tenaga angin'), l('angin', 92, 58, 11), e('🔋', 150, 30, 28, undefined, undefined, 'Baterai'), l('baterai', 150, 58, 11),
        // PLTA: air → kincir/generator → kabel berarus → lampu menyala.
        e('🌊', 48, 156, 48, 'geser', 0, 'Air sungai'), e('🎡', 130, 125, 60, 'putar', 0, 'Kincir dan generator'), l('generator', 130, 174, 11),
        ...kabel(158, 125, 230, 125), ...kabel(230, 125, 230, 96),
        ...lampu(240, 78, false, 32),
        l('listrik mengalir!', 262, 150, 11, 'muncul', 0.8),
      ],
      kata: ['pembangkit', 'plta', 'kincir', 'generator', 'sumber', 'surya', 'angin', 'baterai', 'aki', 'energi'],
    },
    {
      judul: 'Rangkaian Tertutup',
      latar: 'kamar',
      narasi: [
        'Arus listrik mengalir dari baterai, lewat kabel, ke lampu, lalu kembali ke baterai.',
        'Bila rangkaian terputus, lampu padam. Logam adalah konduktor; karet dan plastik adalah isolator.',
      ],
      // Satu lingkaran tertutup: baterai (+) → kabel → lampu → kabel → baterai (−).
      sprite: [
        ...kabel(60, 120, 60, 50), ...kabel(60, 50, 250, 50), ...kabel(250, 50, 250, 150), ...kabel(250, 150, 60, 150), ...kabel(60, 150, 60, 120),
        e('🔋', 60, 118, 40, undefined, undefined, 'Baterai'), l('+', 90, 100, 14), l('−', 90, 142, 14),
        ...lampu(250, 76, false, 32),
        e('➡️', 155, 50, 16, 'geser'), e('⬅️', 155, 150, 16, 'geser-balik'),
        l('rangkaian tertutup', 155, 104, 12, 'muncul', 0.4),
        l('konduktor · isolator', 155, 182, 11, 'muncul', 0.8),
      ],
      kata: ['arus', 'tertutup', 'terbuka', 'konduktor', 'isolator', 'kabel', 'saklar', 'sakelar', 'mengalir'],
    },
    {
      judul: 'Seri dan Paralel',
      latar: 'kamar',
      narasi: [
        'Pada rangkaian seri, lampu disusun berderet. Bila satu putus, semua padam.',
        'Pada rangkaian paralel, lampu disusun bercabang. Bila satu putus, yang lain tetap menyala.',
      ],
      // Siklus 6 detik: semua lampu menyala, lalu satu lampu PUTUS (❌).
      // SERI (kiri): satu jalur → semua lampu & arus ikut padam.
      // PARALEL (kanan): bercabang → hanya cabang yang putus yang padam.
      sprite: [
        // --- SERI: baterai di kiri, dua lampu berderet di kabel atas ---
        ...kabel(18, 105, 18, 60, 'alir-padam'), ...kabel(18, 60, 142, 60, 'alir-padam'), ...kabel(142, 60, 142, 150, 'alir-padam'),
        ...kabel(142, 150, 18, 150, 'alir-padam'), ...kabel(18, 150, 18, 105, 'alir-padam'),
        e('🔋', 18, 108, 26),
        ...lampu(58, 60, true), ...lampu(104, 60, true),
        e('❌', 104, 60, 16, 'tanda-putus'),
        l('SERI', 80, 26, 13),
        l('satu putus, semua padam', 80, 176, 11),
        // --- PARALEL: baterai di kiri, dua lampu di cabang masing-masing ---
        ...kabel(182, 105, 182, 50), ...kabel(182, 50, 240, 50), ...kabel(240, 50, 290, 50, 'alir-padam'),
        ...kabel(182, 160, 240, 160), ...kabel(240, 160, 290, 160, 'alir-padam'), ...kabel(182, 160, 182, 105),
        ...kabel(240, 50, 240, 160), ...kabel(290, 50, 290, 160, 'alir-padam'),
        e('🔋', 182, 108, 26),
        ...lampu(240, 100, false), ...lampu(290, 100, true),
        e('❌', 290, 100, 16, 'tanda-putus'),
        l('PARALEL', 240, 26, 13),
        l('yang lain tetap menyala', 240, 184, 11),
      ],
      kata: ['seri', 'paralel', 'berderet', 'bercabang', 'padam', 'menyala', 'rangkaian'],
    },
    {
      judul: 'Hemat Listrik',
      latar: 'kamar',
      narasi: ['Hemat listrik adalah wujud syukur. Pilih kebiasaan yang benar!'],
      sprite: [e('💡', 160, 100, 80, 'kedip', 0, 'Lampu')],
      kata: ['hemat', 'menghemat', 'mematikan', 'bahaya'],
      interaksi: {
        jenis: 'kelompok',
        soal: 'Kebiasaan ini hemat atau boros listrik?',
        kelompok: ['Hemat', 'Boros'],
        item: [
          { e: '💡', nama: 'Mematikan lampu saat siang hari', k: 0 },
          { e: '📺', nama: 'Membiarkan TV menyala tanpa ditonton', k: 1 },
          { e: '🔌', nama: 'Mencabut pengisi daya setelah penuh', k: 0 },
          { e: '❄️', nama: 'Membuka kulkas terlalu lama', k: 1 },
        ],
      },
    },
  ],

  /* =========================== BAB 9a LITOSFER ========================== */
  E01: [
    {
      judul: 'Tebing Berlapis',
      latar: 'tebing',
      narasi: [
        'Bumi tersusun dari lapisan-lapisan. Yang paling luar adalah kerak bumi.',
        'Lapisan batuan dan tanah yang menyusun kulit bumi disebut litosfer.',
      ],
      sprite: [
        { t: 'kotak', x: 40, y: 40, lebar: 240, tinggi: 30, w: '#a16207', r: 4 }, { t: 'kotak', x: 40, y: 70, lebar: 240, tinggi: 35, w: '#78716c', r: 4, a: 'muncul', d: 0.4 },
        { t: 'kotak', x: 40, y: 105, lebar: 240, tinggi: 40, w: '#57534e', r: 4, a: 'muncul', d: 0.8 }, { t: 'kotak', x: 40, y: 145, lebar: 240, tinggi: 40, w: '#ea580c', r: 4, a: 'muncul', d: 1.2 },
        l('tanah', 160, 60, 12, 'muncul', 0, '#fff'), l('batuan', 160, 92, 12, 'muncul', 0.5, '#fff'), l('litosfer (kerak)', 160, 130, 12, 'muncul', 0.9, '#fff'), l('lapisan dalam bumi', 160, 170, 12, 'muncul', 1.3, '#fff'),
      ],
      kata: ['litosfer', 'lapisan', 'batuan', 'kerak', 'kulit bumi', 'tanah', 'mantel', 'inti'],
    },
    {
      judul: 'Kenampakan Bumi',
      latar: 'tebing',
      narasi: [
        'Litosfer membentuk kenampakan alam: gunung, bukit, lembah, dataran rendah, dan dataran tinggi.',
        'Gunung lebih tinggi dari bukit. Lembah berada di antara gunung atau bukit.',
      ],
      sprite: [e('🏔️', 70, 98, 86, undefined, undefined, 'Gunung'), e('⛰️', 162, 116, 60, undefined, undefined, 'Bukit'), e('🏞️', 252, 126, 62, undefined, undefined, 'Lembah'), l('gunung', 70, 160), l('bukit', 160, 160, 11, 'muncul', 0.5), l('lembah', 250, 175, 11, 'muncul', 1)],
      kata: ['gunung', 'bukit', 'lembah', 'dataran', 'kenampakan', 'pegunungan'],
    },
    {
      judul: 'Batuan di Sekitar Kita',
      latar: 'tebing',
      narasi: [
        'Batuan dan tanah dimanfaatkan manusia untuk membangun rumah dan bercocok tanam.',
        'Tanah yang subur menumbuhkan tanaman. Kita harus menjaganya dari longsor dan pencemaran.',
      ],
      sprite: [e('🪨', 55, 130, 52, undefined, undefined, 'Batuan'), e('🧱', 128, 130, 46, undefined, undefined, 'Batu bata'), e('🏠', 205, 118, 60, 'muncul', 0.6, 'Rumah'), e('🌾', 278, 132, 50, 'goyang', 0, 'Tanaman di tanah subur')],
      kata: ['manfaat', 'subur', 'bangunan', 'tanah'],
    },
    {
      judul: 'Tunjukkan Lapisannya',
      latar: 'tebing',
      narasi: ['Ayo tentukan, mana yang termasuk litosfer?'],
      // Potongan tebing berlapis; salah satu lapisan diberi tanda tanya.
      sprite: [
        { t: 'kotak', x: 50, y: 42, lebar: 220, tinggi: 28, w: '#a16207', r: 4 },
        { t: 'kotak', x: 50, y: 72, lebar: 220, tinggi: 28, w: '#78716c', r: 4 },
        { t: 'kotak', x: 50, y: 102, lebar: 220, tinggi: 34, w: '#57534e', r: 4 },
        { t: 'kotak', x: 50, y: 138, lebar: 220, tinggi: 34, w: '#ea580c', r: 4 },
        l('tanah', 160, 61, 12, 'muncul', 0, '#fff'), l('batuan', 160, 91, 12, 'muncul', 0, '#fff'),
        l('? ? ?', 160, 124, 14, 'kedip', 0, '#fff'), l('lapisan dalam bumi', 160, 160, 12, 'muncul', 0, '#fff'),
        e('🧗', 296, 100, 30, 'naik', 0, 'Pendaki tebing'),
        l('mana yang litosfer?', 160, 22, 12, 'muncul', 0.6),
      ],
      kata: ['contoh', 'termasuk'],
      interaksi: {
        jenis: 'kelompok',
        soal: 'Bagian dari litosfer atau bukan?',
        kelompok: ['Litosfer', 'Bukan litosfer'],
        item: [
          { e: '⛰️', nama: 'Gunung', k: 0 },
          { e: '🌊', nama: 'Air laut', k: 1 },
          { e: '🪨', nama: 'Batuan', k: 0 },
          { e: '☁️', nama: 'Awan', k: 1 },
        ],
      },
    },
  ],

  /* ===================== BAB 9b HIDROSFER & ATMOSFER ==================== */
  E02: [
    {
      judul: 'Air di Seluruh Bumi',
      latar: 'sungai',
      narasi: [
        'Seluruh air di bumi disebut hidrosfer: laut, sungai, danau, air tanah, dan es di kutub.',
        'Sebagian besar air bumi ada di laut, dan rasanya asin.',
      ],
      sprite: [e('🌊', 55, 138, 58, 'geser', 0, 'Laut (air asin)'), e('🏞️', 145, 126, 56, undefined, undefined, 'Sungai dan danau'), e('💧', 218, 158, 38, 'jatuh', 0, 'Air tanah'), e('🧊', 280, 118, 48, undefined, undefined, 'Es di kutub'), l('hidrosfer', 160, 40, 14)],
      kata: ['hidrosfer', 'air', 'laut', 'sungai', 'danau', 'air tanah', 'es'],
    },
    {
      judul: 'Selimut Udara',
      latar: 'langit',
      narasi: [
        'Bumi diselimuti udara yang disebut atmosfer. Atmosfer melindungi kita dari panas matahari dan benda langit.',
        'Udara yang kita hirup mengandung oksigen. Tanpa atmosfer, tidak ada kehidupan.',
      ],
      sprite: [e('🌍', 160, 110, 88, 'putar', 0, 'Bumi'), { t: 'kotak', x: 80, y: 30, lebar: 160, tinggi: 160, w: 'rgba(125,211,252,0.35)', r: 80, a: 'denyut' }, e('☀️', 40, 40, 40, 'denyut', 0, 'Panas matahari'), e('☄️', 282, 44, 32, 'jatuh', 0, 'Benda langit'), l('atmosfer', 160, 25, 13)],
      kata: ['atmosfer', 'udara', 'oksigen', 'melindungi', 'selimut'],
    },
    {
      judul: 'Lapisan Atmosfer',
      latar: 'langit',
      narasi: [
        'Dari bawah ke atas: troposfer, stratosfer, mesosfer, termosfer, dan eksosfer.',
        'Awan, hujan, dan cuaca terjadi di troposfer. Lapisan ozon di stratosfer menahan sinar ultraviolet.',
      ],
      sprite: [
        l('eksosfer', 160, 25, 11), l('termosfer', 160, 55, 11, 'muncul', 0.3), l('mesosfer', 160, 85, 11, 'muncul', 0.6), l('stratosfer (ozon)', 160, 115, 11, 'muncul', 0.9), l('troposfer (cuaca)', 160, 150, 12, 'muncul', 1.2, '#1d4ed8'),
        e('🛰️', 270, 30, 28, 'melayang', 0, 'Satelit (eksosfer)'), e('☄️', 50, 85, 28, 'jatuh', 0, 'Meteor terbakar (mesosfer)'), e('✈️', 270, 115, 28, 'geser', 0, 'Pesawat'), e('☁️', 55, 150, 38, 'melayang', 0, 'Awan (troposfer)'), e('🌧️', 262, 155, 34, undefined, undefined, 'Hujan (troposfer)'),
      ],
      kata: ['troposfer', 'stratosfer', 'mesosfer', 'termosfer', 'eksosfer', 'ozon', 'cuaca', 'awan', 'ultraviolet', 'lapisan'],
    },
    {
      judul: 'Susun Lapisan Udara',
      latar: 'langit',
      narasi: ['Susun lapisan atmosfer dari yang paling dekat dengan bumi!'],
      // Lapisan langit kosong dari bawah (awan) ke atas (satelit), siap disusun.
      sprite: [
        e('🌍', 160, 178, 40, undefined, undefined, 'Bumi'),
        e('☁️', 60, 150, 34, 'geser', 0, 'Awan'), e('✈️', 250, 120, 30, 'geser-balik', 0, 'Pesawat'),
        e('☄️', 70, 70, 28, 'jatuh', 0, 'Meteor'), e('🛰️', 260, 36, 30, 'melayang', 0, 'Satelit'),
        l('1 ?', 160, 148, 12, 'muncul', 0.2, '#fff'), l('2 ?', 160, 118, 12, 'muncul', 0.4, '#fff'),
        l('3 ?', 160, 88, 12, 'muncul', 0.6, '#fff'), l('4 ?', 160, 58, 12, 'muncul', 0.8, '#fff'),
        l('5 ?', 160, 28, 12, 'muncul', 1, '#fff'),
      ],
      kata: ['susun'],
      interaksi: {
        jenis: 'urut',
        soal: 'Ketuk dari lapisan paling bawah ke paling atas.',
        item: [
          { e: '☁️', nama: 'Troposfer' },
          { e: '🛡️', nama: 'Stratosfer' },
          { e: '☄️', nama: 'Mesosfer' },
          { e: '🌌', nama: 'Termosfer' },
          { e: '🛰️', nama: 'Eksosfer' },
        ],
        selesai: 'Hebat! Troposfer paling dekat dengan bumi, tempat cuaca terjadi.',
      },
    },
  ],

  /* ==================== BAB 9c SIKLUS AIR & BENCANA ===================== */
  E03: [
    {
      judul: 'Perjalanan Air',
      latar: 'laut',
      narasi: [
        'Panas matahari membuat air laut menguap (evaporasi). Uap air naik dan mengembun menjadi awan (kondensasi).',
        'Awan menjadi hujan (presipitasi). Air hujan meresap ke tanah dan mengalir kembali ke laut. Begitu terus berputar.',
      ],
      sprite: [e('☀️', 40, 30, 42, 'denyut', 0, 'Matahari'), e('🌊', 70, 162, 50, 'geser', 0, 'Laut'), e('♨️', 90, 120, 32, 'naik', 0, 'Uap air'), e('☁️', 170, 40, 54, 'muncul', 0.8, 'Awan'), e('🌧️', 232, 70, 48, 'muncul', 1.4, 'Hujan'), e('💧', 242, 122, 26, 'jatuh', 1.8, 'Air hujan'), e('⛰️', 272, 158, 54, undefined, undefined, 'Gunung'),
        l('menguap', 90, 95, 10, 'muncul', 0.3), l('mengembun', 170, 75, 10, 'muncul', 1), l('hujan', 245, 105, 10, 'muncul', 1.6)],
      kata: ['siklus', 'evaporasi', 'penguapan', 'menguap', 'kondensasi', 'mengembun', 'presipitasi', 'hujan', 'infiltrasi', 'meresap', 'awan', 'uap'],
    },
    {
      judul: 'Bumi Bergetar',
      latar: 'bukit',
      narasi: [
        'Lapisan bumi bisa bergerak dan bergeser. Getaran yang terasa di permukaan bumi disebut gempa bumi.',
        'Saat gempa, lindungi kepala, berlindung di bawah meja yang kuat, jauhi kaca, lalu keluar ke tanah lapang.',
      ],
      sprite: [e('🏠', 85, 112, 66, 'getar', 0, 'Rumah bergetar'), e('🌳', 190, 110, 60, 'getar', 0, 'Pohon bergetar'), l('gempa bumi', 160, 40, 14, 'getar'), e('🧒', 262, 148, 44, undefined, undefined, 'Anak'), e('🙇', 262, 148, 0)],
      kata: ['gempa', 'getaran', 'bergeser', 'lempeng', 'tektonik', 'vulkanik', 'meja', 'kepala', 'kaca', 'lapang', 'evakuasi'],
    },
    {
      judul: 'Tanda Tsunami',
      latar: 'laut',
      narasi: [
        'Gempa di dasar laut bisa menimbulkan gelombang besar yang disebut tsunami.',
        'Bila air laut surut tiba-tiba setelah gempa, segera lari ke tempat yang tinggi. Jangan mendekati pantai!',
      ],
      sprite: [e('🌊', 62, 118, 84, 'geser', 0, 'Tsunami'), e('🏃', 212, 150, 44, 'geser', 0, 'Lari ke tempat tinggi'), e('⛰️', 276, 98, 64, undefined, undefined, 'Bukit'), g(230, 140, 268, 92, '#16a34a', 'gambar', 0.6, 3), l('ke tempat tinggi!', 245, 185, 11, 'muncul', 1)],
      kata: ['tsunami', 'surut', 'gelombang', 'pantai', 'tempat tinggi', 'bukit'],
    },
    {
      judul: 'Siaga Bencana',
      latar: 'bukit',
      narasi: ['Ikhtiar dengan ilmu, lalu bertawakal. Pilih langkah yang aman!'],
      sprite: [e('🗺️', 160, 100, 72, undefined, undefined, 'Peta jalur evakuasi')],
      kata: ['aman', 'siaga', 'mitigasi'],
      interaksi: {
        jenis: 'pilih',
        soal: 'Saat terjadi gempa di dalam kelas, apa yang kamu lakukan?',
        opsi: [
          { teks: 'Berlindung di bawah meja sambil melindungi kepala', benar: true, alasan: 'Tepat! Lindungi kepala dulu, lalu keluar ke tanah lapang setelah guncangan berhenti.' },
          { teks: 'Berdiri di dekat jendela kaca', benar: false, alasan: 'Berbahaya, kaca bisa pecah. Jauhi kaca saat gempa.' },
          { teks: 'Berlari sambil berdesakan', benar: false, alasan: 'Berdesakan bisa membuat jatuh. Tetap tenang dan ikuti arahan guru.' },
        ],
      },
    },
  ],
};

/** Adegan sesuai bahasa pilihan pemain (lihat core/bahasa.ts). */
export const ADEGAN: Record<MateriKode, Adegan[]> = lokalkan(ADEGAN_ASLI);

export function getAdegan(kode: string): Adegan[] {
  return ADEGAN[kode as MateriKode] ?? [];
}

/** Adegan dalam Bahasa Indonesia (untuk pencocokan kata kunci). */
export function getAdeganAsli(kode: string): Adegan[] {
  return ADEGAN_ASLI[kode as MateriKode] ?? [];
}

/**
 * Mencari adegan yang paling relevan untuk sebuah soal (berdasarkan kata
 * kunci di teks soal & kunci). Dipakai Penjaga untuk memberi petunjuk.
 * `teks` harus teks soal asli (Bahasa Indonesia); indeks adegan sama di
 * semua bahasa.
 */
export function adeganUntukSoal(kode: string, teks: string): number {
  const daftar = getAdeganAsli(kode);
  const t = teks.toLowerCase();
  let terbaik = 0;
  let skorTerbaik = -1;
  daftar.forEach((a, i) => {
    const skor = a.kata.reduce((s, k) => (t.includes(k.toLowerCase()) ? s + k.length : s), 0);
    if (skor > skorTerbaik) {
      skorTerbaik = skor;
      terbaik = i;
    }
  });
  return terbaik;
}
