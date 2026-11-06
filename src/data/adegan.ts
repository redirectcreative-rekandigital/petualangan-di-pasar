import type { MateriKode } from '../../shared/types';

/**
 * Halaman Cerita: materi IPA dikemas sebagai cerita bergambar 4 adegan.
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
  | 'gambar';

export type Sprite =
  | { t?: 'emoji'; e: string; x: number; y: number; s?: number; a?: Animasi; d?: number }
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
const e = (emo: string, x: number, y: number, s = 30, a?: Animasi, d?: number): Sprite => ({ e: emo, x, y, s, a, d });
const g = (x1: number, y1: number, x2: number, y2: number, w = '#fde047', a: Animasi = 'gambar', d = 0, tebal = 4): Sprite => ({
  t: 'garis', x1, y1, x2, y2, w, a, d, tebal,
});
const l = (teks: string, x: number, y: number, s = 11, a: Animasi = 'muncul', d = 0, w = '#0f172a'): Sprite => ({
  t: 'label', teks, x, y, s, a, d, w,
});

export const ADEGAN: Record<MateriKode, Adegan[]> = {
  /* ============================ BAB 1 CAHAYA ============================ */
  F01: [
    {
      judul: 'Berkas Sinar di Dalam Goa',
      latar: 'goa',
      narasi: [
        'Di dalam goa yang gelap, sebuah berkas sinar masuk dari celah atap.',
        'Lihat! Sinarnya lurus. Cahaya selalu merambat lurus.',
      ],
      sprite: [e('☀️', 40, 22, 30, 'denyut'), g(52, 30, 200, 170, '#fde047', 'gambar', 0.3, 10), e('🧒', 210, 160, 34), l('merambat lurus', 150, 95, 12, 'muncul', 1.2, '#fef9c3')],
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
        e('🪞', 125, 112, 30),
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
        e('🌼', 30, 110, 34),
        g(50, 105, 150, 105, '#facc15', 'gambar', 0.2, 4),
        e('👁️', 170, 105, 54, 'denyut'),
        g(195, 105, 270, 80, '#f472b6', 'gambar', 1.2, 3),
        e('🧠', 285, 72, 34, 'muncul', 1.6),
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
      sprite: [e('📖', 90, 110, 40), e('💡', 140, 50, 34, 'kedip'), e('🥕', 220, 120, 34, 'goyang')],
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
      sprite: [e('🥁', 60, 120, 40, 'getar'), e('〰️', 120, 115, 28, 'geser'), e('〰️', 165, 115, 28, 'geser', 0.4), e('👂', 240, 115, 40, 'denyut', 0.8), l('padat · cair · gas', 160, 175, 12)],
      kata: ['merambat', 'getar', 'medium', 'perantara', 'padat', 'cair', 'gas', 'hampa', 'udara', 'kecepatan'],
    },
    {
      judul: 'Gema di Lembah',
      latar: 'lembah',
      narasi: [
        'Pemain berteriak "Halo!" ke arah tebing. Bunyinya memantul kembali.',
        'Bunyi pantul yang terdengar setelah bunyi asli disebut gema. Bunyi bisa juga diserap benda lunak.',
      ],
      sprite: [e('🧒', 50, 140, 36), l('Halo!', 85, 110, 13, 'muncul', 0), e('〰️', 140, 110, 26, 'geser'), e('⛰️', 270, 120, 70), e('〰️', 200, 135, 26, 'geser-balik', 1), l('...halo!', 120, 160, 12, 'muncul', 1.6, '#7c3aed')],
      kata: ['gema', 'gaung', 'pantul', 'serap', 'tebing', 'peredam'],
    },
    {
      judul: 'Perjalanan Bunyi di Telinga',
      latar: 'kamar',
      narasi: [
        'Daun telinga menangkap bunyi. Gendang telinga ikut bergetar.',
        'Getaran diteruskan tulang pendengaran ke rumah siput, lalu saraf membawanya ke otak.',
      ],
      sprite: [e('〰️', 40, 100, 30, 'geser'), e('👂', 110, 100, 60), e('🥁', 175, 100, 24, 'getar', 0.5), e('🐌', 225, 100, 30, 'muncul', 1), e('🧠', 285, 95, 32, 'muncul', 1.5), l('daun telinga → gendang → tulang → rumah siput', 160, 170, 10)],
      kata: ['telinga', 'gendang', 'koklea', 'rumah siput', 'tulang', 'martil', 'landasan', 'sanggurdi', 'saraf', 'mendengar'],
    },
    {
      judul: 'Mendengar dengan Telinga Sehat',
      latar: 'lembah',
      narasi: [
        'Manusia bisa mendengar bunyi audiosonik, yaitu 20 sampai 20.000 getaran per detik.',
        'Ayo kelompokkan bunyi berikut!',
      ],
      sprite: [e('🐘', 60, 120, 40), e('🧒', 160, 125, 36), e('🦇', 260, 70, 36, 'melayang')],
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
      sprite: [e('☀️', 280, 25, 30, 'denyut'), e('🌳', 60, 110, 56), e('🦋', 150, 60, 26, 'melayang'), e('🦌', 200, 140, 40), e('🍄', 110, 160, 24), e('🪨', 260, 165, 26), e('💧', 30, 170, 20, 'jatuh')],
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
        e('🌿', 50, 100, 30, 'muncul', 0.3), e('🐿️', 110, 100, 30, 'muncul', 0.6), e('🍄', 80, 150, 28, 'muncul', 0.9),
        e('💧', 200, 100, 28, 'muncul', 1.2), e('🪨', 260, 100, 28, 'muncul', 1.5), e('☀️', 230, 150, 28, 'muncul', 1.8),
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
      sprite: [e('🌱', 60, 120, 40, 'naik'), l('produsen', 60, 165), e('🐇', 160, 125, 40), l('konsumen', 160, 165, 11, 'muncul', 0.6), e('🍄', 260, 130, 36, 'muncul', 1), l('pengurai', 260, 165, 11, 'muncul', 1.2)],
      kata: ['produsen', 'konsumen', 'pengurai', 'fotosintesis', 'herbivora', 'karnivora', 'omnivora', 'jamur', 'bakteri', 'insektivora'],
    },
    {
      judul: 'Catat Penghuni Hutan',
      latar: 'hutan',
      narasi: ['Ekosistem ada di darat, di perairan, dan ada juga buatan manusia seperti sawah.', 'Ayo catat penghuni hutan di Buku Catatan!'],
      sprite: [e('📒', 160, 100, 50)],
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
      sprite: [e('☀️', 40, 30, 40, 'denyut'), g(60, 45, 150, 130, '#facc15', 'gambar', 0.3, 3), e('🌾', 160, 140, 46, 'goyang'), l('produsen', 160, 185, 11, 'muncul', 1)],
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
        e('🌾', 30, 140, 32), e('🦗', 90, 140, 30, 'muncul', 0.5), e('🐸', 150, 140, 32, 'muncul', 1), e('🐍', 210, 140, 32, 'muncul', 1.5), e('🦅', 275, 110, 36, 'muncul', 2),
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
      sprite: [e('🌾', 60, 150, 32), e('🐭', 40, 90, 28), e('🦗', 110, 90, 28), e('🐸', 170, 60, 28), e('🐍', 110, 30, 28), e('🦅', 250, 40, 34, 'melayang'), e('🍄', 250, 150, 30, 'muncul', 1.2),
        g(60, 140, 45, 105, '#f97316', 'gambar', 0.2, 2), g(65, 140, 105, 105, '#f97316', 'gambar', 0.4, 2), g(115, 80, 160, 65, '#f97316', 'gambar', 0.6, 2), g(45, 80, 100, 40, '#f97316', 'gambar', 0.8, 2), g(165, 50, 125, 35, '#f97316', 'gambar', 1, 2), g(125, 28, 230, 40, '#f97316', 'gambar', 1.2, 2)],
      kata: ['jaring', 'jaring-jaring', 'pengurai', 'keseimbangan', 'punah', 'populasi'],
    },
    {
      judul: 'Susun Rantai Makanan',
      latar: 'ladang',
      narasi: ['Sekarang giliranmu. Susun rantai makanan dari produsen sampai konsumen puncak!'],
      sprite: [e('🧺', 160, 100, 50)],
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
      sprite: [e('🌸', 100, 140, 46), e('🌼', 220, 145, 42), e('🐝', 160, 80, 30, 'melayang'), l('untung + untung', 160, 185, 12, 'muncul', 0.8, '#15803d')],
      kata: ['mutualisme', 'lebah', 'bunga', 'penyerbukan', 'menguntungkan', 'kupu'],
    },
    {
      judul: 'Anggrek di Batang Pohon',
      latar: 'taman',
      narasi: [
        'Anggrek menempel di batang pohon untuk mendapat cahaya. Pohonnya tidak dirugikan.',
        'Satu untung, yang lain tidak untung dan tidak rugi. Itu simbiosis komensalisme.',
      ],
      sprite: [e('🌳', 160, 110, 100), e('🌺', 185, 95, 26, 'denyut'), l('untung + biasa saja', 160, 185, 12, 'muncul', 0.8, '#0369a1')],
      kata: ['komensalisme', 'anggrek', 'menempel', 'tidak dirugikan', 'ikan remora', 'hiu'],
    },
    {
      judul: 'Benalu dan Nyamuk',
      latar: 'taman',
      narasi: [
        'Benalu mengambil makanan dari pohon inangnya, sehingga pohon merugi. Nyamuk mengisap darah manusia.',
        'Satu untung, yang lain rugi. Itu simbiosis parasitisme. Ada juga predasi dan kompetisi.',
      ],
      sprite: [e('🌳', 90, 110, 80), e('🌿', 110, 75, 26, 'goyang'), e('🦟', 230, 70, 26, 'melayang'), e('🧒', 240, 140, 36), l('untung + rugi', 160, 185, 12, 'muncul', 0.8, '#b91c1c')],
      kata: ['parasitisme', 'benalu', 'nyamuk', 'kutu', 'tali putri', 'merugikan', 'inang', 'predasi', 'kompetisi', 'persaingan'],
    },
    {
      judul: 'Cocokkan Pasangan',
      latar: 'taman',
      narasi: ['Ayo tentukan jenis hubungan setiap pasangan makhluk hidup!'],
      sprite: [e('🥅', 160, 100, 50)],
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
      sprite: [e('🪓', 70, 120, 34, 'goyang'), e('🪵', 130, 160, 32), e('🗑️', 200, 160, 28), e('🌧️', 240, 40, 36, 'muncul', 0.8), e('🌊', 260, 150, 36, 'muncul', 1.4)],
      kata: ['penebangan', 'liar', 'banjir', 'longsor', 'kerusakan', 'perburuan', 'sampah', 'pencemaran', 'gundul'],
    },
    {
      judul: 'Menanam dan 3R',
      latar: 'gundul',
      narasi: [
        'Kita bisa menanam kembali hutan yang gundul. Itu namanya reboisasi. Menebang pun harus tebang pilih.',
        'Kurangi sampah, pakai ulang, dan daur ulang barang. Itulah 3R: reduce, reuse, recycle.',
      ],
      sprite: [e('🌱', 60, 150, 30, 'naik'), e('🌱', 110, 150, 30, 'naik', 0.4), e('🌳', 160, 135, 46, 'muncul', 0.9), e('♻️', 250, 80, 46, 'putar'), l('reduce · reuse · recycle', 250, 135, 11, 'muncul', 1.2)],
      kata: ['reboisasi', 'tebang pilih', '3r', 'daur ulang', 'reduce', 'reuse', 'recycle', 'menanam', 'terasering'],
    },
    {
      judul: 'Rumah Aman bagi Satwa',
      latar: 'hutan',
      narasi: [
        'Indonesia punya cagar alam, suaka margasatwa, dan taman nasional untuk melindungi tumbuhan dan hewan.',
        'Satwa langka seperti komodo, orangutan, harimau sumatra, dan badak jawa harus kita jaga.',
      ],
      sprite: [e('🦎', 60, 140, 38), e('🦧', 130, 120, 40), e('🐅', 200, 140, 40), e('🦏', 270, 140, 38), l('satwa langka Indonesia', 160, 50, 12)],
      kata: ['cagar alam', 'suaka', 'taman nasional', 'langka', 'komodo', 'orangutan', 'harimau', 'badak', 'konservasi', 'dilindungi'],
    },
    {
      judul: 'Pilih Tindakan Khalifah',
      latar: 'gundul',
      narasi: ['Sebagai khalifah di bumi, pilih tindakan yang menjaga alam!'],
      sprite: [e('🌱', 160, 100, 50, 'naik')],
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
      sprite: [e('🧲', 160, 90, 56, 'getar'), e('📌', 100, 150, 24, 'naik'), e('📌', 220, 150, 24, 'naik', 0.4), e('🪵', 60, 165, 28), l('kutub = paling kuat', 160, 30, 12)],
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
        { t: 'kotak', x: 30, y: 50, lebar: 50, tinggi: 26, w: '#ef4444', r: 4, a: 'geser-balik' }, { t: 'kotak', x: 80, y: 50, lebar: 50, tinggi: 26, w: '#3b82f6', r: 4, a: 'geser-balik' },
        { t: 'kotak', x: 190, y: 50, lebar: 50, tinggi: 26, w: '#3b82f6', r: 4, a: 'geser' }, { t: 'kotak', x: 240, y: 50, lebar: 50, tinggi: 26, w: '#ef4444', r: 4, a: 'geser' },
        l('S   U', 80, 67, 12, 'muncul', 0, '#fff'), l('S   U', 240, 67, 12, 'muncul', 0, '#fff'),
        l('U bertemu U → tolak-menolak', 160, 110, 12),
        { t: 'kotak', x: 70, y: 140, lebar: 45, tinggi: 24, w: '#ef4444', r: 4 }, { t: 'kotak', x: 115, y: 140, lebar: 45, tinggi: 24, w: '#3b82f6', r: 4 },
        { t: 'kotak', x: 165, y: 140, lebar: 45, tinggi: 24, w: '#ef4444', r: 4, a: 'muncul', d: 1 }, { t: 'kotak', x: 210, y: 140, lebar: 45, tinggi: 24, w: '#3b82f6', r: 4, a: 'muncul', d: 1 },
        l('U bertemu S → tarik-menarik', 160, 185, 12, 'muncul', 1.2),
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
      sprite: [e('📍', 80, 120, 34), e('🧲', 120, 70, 34, 'geser'), l('gosok satu arah', 120, 160, 11), e('🔋', 230, 100, 34), e('🌀', 270, 100, 30, 'putar'), l('elektromagnet', 250, 160, 11, 'muncul', 0.8)],
      kata: ['membuat', 'menggosok', 'induksi', 'elektromagnet', 'arus', 'hilang', 'dipanaskan', 'dipukul', 'dijatuhkan', 'permanen', 'sementara'],
    },
    {
      judul: 'Jarum Kompas',
      latar: 'bukit',
      narasi: ['Jarum yang sudah bermagnet akan menunjuk arah utara-selatan. Itulah prinsip kompas.'],
      sprite: [e('🧭', 160, 100, 60, 'goyang')],
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
      sprite: [e('🌊', 60, 160, 40, 'geser'), e('🎡', 150, 110, 60, 'putar'), g(180, 110, 250, 80, '#facc15', 'gambar', 0.6, 3), e('💡', 265, 70, 36, 'kedip', 1)],
      kata: ['pembangkit', 'plta', 'kincir', 'generator', 'sumber', 'surya', 'angin', 'baterai', 'aki', 'energi'],
    },
    {
      judul: 'Rangkaian Tertutup',
      latar: 'kamar',
      narasi: [
        'Arus listrik mengalir dari baterai, lewat kabel, ke lampu, lalu kembali ke baterai.',
        'Bila rangkaian terputus, lampu padam. Logam adalah konduktor; karet dan plastik adalah isolator.',
      ],
      sprite: [e('🔋', 70, 140, 40), e('💡', 250, 60, 40, 'kedip', 1.2), g(85, 125, 85, 60, '#f97316', 'gambar', 0, 3), g(85, 60, 230, 60, '#f97316', 'gambar', 0.3, 3), g(255, 80, 255, 140, '#f97316', 'gambar', 0.6, 3), g(255, 140, 95, 140, '#f97316', 'gambar', 0.9, 3), l('konduktor · isolator', 170, 180, 11)],
      kata: ['arus', 'tertutup', 'terbuka', 'konduktor', 'isolator', 'kabel', 'saklar', 'sakelar', 'mengalir'],
    },
    {
      judul: 'Seri dan Paralel',
      latar: 'kamar',
      narasi: [
        'Pada rangkaian seri, lampu disusun berderet. Bila satu putus, semua padam.',
        'Pada rangkaian paralel, lampu disusun bercabang. Bila satu putus, yang lain tetap menyala.',
      ],
      sprite: [l('SERI', 80, 30, 13), e('💡', 50, 80, 28), e('💡', 110, 80, 28, 'kedip'), l('satu putus, semua padam', 80, 130, 10),
        l('PARALEL', 240, 30, 13), e('💡', 240, 65, 28), e('💡', 240, 110, 28, 'kedip'), l('yang lain tetap menyala', 240, 155, 10)],
      kata: ['seri', 'paralel', 'berderet', 'bercabang', 'padam', 'menyala', 'rangkaian'],
    },
    {
      judul: 'Hemat Listrik',
      latar: 'kamar',
      narasi: ['Hemat listrik adalah wujud syukur. Pilih kebiasaan yang benar!'],
      sprite: [e('💡', 160, 100, 56, 'kedip')],
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
      sprite: [e('🏔️', 70, 100, 70), e('⛰️', 160, 120, 50), e('🏞️', 250, 130, 50), l('gunung', 70, 160), l('bukit', 160, 160, 11, 'muncul', 0.5), l('lembah', 250, 175, 11, 'muncul', 1)],
      kata: ['gunung', 'bukit', 'lembah', 'dataran', 'kenampakan', 'pegunungan'],
    },
    {
      judul: 'Batuan di Sekitar Kita',
      latar: 'tebing',
      narasi: [
        'Batuan dan tanah dimanfaatkan manusia untuk membangun rumah dan bercocok tanam.',
        'Tanah yang subur menumbuhkan tanaman. Kita harus menjaganya dari longsor dan pencemaran.',
      ],
      sprite: [e('🪨', 70, 130, 40), e('🧱', 140, 130, 36), e('🏠', 210, 120, 44, 'muncul', 0.6), e('🌾', 275, 135, 36, 'goyang')],
      kata: ['manfaat', 'subur', 'bangunan', 'tanah'],
    },
    {
      judul: 'Tunjukkan Lapisannya',
      latar: 'tebing',
      narasi: ['Ayo tentukan, mana yang termasuk litosfer?'],
      sprite: [e('🪢', 160, 100, 50)],
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
      sprite: [e('🌊', 60, 140, 46, 'geser'), e('🏞️', 150, 130, 44), e('💧', 220, 160, 30, 'jatuh'), e('🧊', 280, 120, 36), l('hidrosfer', 160, 40, 14)],
      kata: ['hidrosfer', 'air', 'laut', 'sungai', 'danau', 'air tanah', 'es'],
    },
    {
      judul: 'Selimut Udara',
      latar: 'langit',
      narasi: [
        'Bumi diselimuti udara yang disebut atmosfer. Atmosfer melindungi kita dari panas matahari dan benda langit.',
        'Udara yang kita hirup mengandung oksigen. Tanpa atmosfer, tidak ada kehidupan.',
      ],
      sprite: [e('🌍', 160, 110, 70, 'putar'), { t: 'kotak', x: 80, y: 30, lebar: 160, tinggi: 160, w: 'rgba(125,211,252,0.35)', r: 80 }, l('atmosfer', 160, 25, 13)],
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
        e('🛰️', 270, 30, 22, 'melayang'), e('☄️', 50, 85, 22, 'jatuh'), e('✈️', 270, 115, 22, 'geser'), e('☁️', 60, 150, 28, 'melayang'), e('🌧️', 260, 155, 26),
      ],
      kata: ['troposfer', 'stratosfer', 'mesosfer', 'termosfer', 'eksosfer', 'ozon', 'cuaca', 'awan', 'ultraviolet', 'lapisan'],
    },
    {
      judul: 'Susun Lapisan Udara',
      latar: 'langit',
      narasi: ['Susun lapisan atmosfer dari yang paling dekat dengan bumi!'],
      sprite: [e('🫙', 160, 100, 50)],
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
      sprite: [e('☀️', 40, 30, 34, 'denyut'), e('🌊', 70, 165, 40), e('♨️', 90, 120, 26, 'naik'), e('☁️', 170, 40, 44, 'muncul', 0.8), e('🌧️', 230, 70, 40, 'muncul', 1.4), e('💧', 240, 120, 20, 'jatuh', 1.8), e('⛰️', 270, 160, 44),
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
      sprite: [e('🏠', 90, 110, 50, 'getar'), e('🌳', 200, 110, 46, 'getar'), l('gempa bumi', 160, 40, 14, 'getar'), e('🧒', 250, 150, 30)],
      kata: ['gempa', 'getaran', 'bergeser', 'lempeng', 'tektonik', 'vulkanik', 'meja', 'kepala', 'kaca', 'lapang', 'evakuasi'],
    },
    {
      judul: 'Tanda Tsunami',
      latar: 'laut',
      narasi: [
        'Gempa di dasar laut bisa menimbulkan gelombang besar yang disebut tsunami.',
        'Bila air laut surut tiba-tiba setelah gempa, segera lari ke tempat yang tinggi. Jangan mendekati pantai!',
      ],
      sprite: [e('🌊', 60, 120, 70, 'geser'), e('🏃', 220, 150, 34, 'geser'), e('⛰️', 280, 100, 60), g(230, 140, 275, 90, '#16a34a', 'gambar', 0.6, 3), l('ke tempat tinggi!', 250, 185, 11, 'muncul', 1)],
      kata: ['tsunami', 'surut', 'gelombang', 'pantai', 'tempat tinggi', 'bukit'],
    },
    {
      judul: 'Siaga Bencana',
      latar: 'bukit',
      narasi: ['Ikhtiar dengan ilmu, lalu bertawakal. Pilih langkah yang aman!'],
      sprite: [e('🗺️', 160, 100, 50)],
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

export function getAdegan(kode: string): Adegan[] {
  return ADEGAN[kode as MateriKode] ?? [];
}

/**
 * Mencari adegan yang paling relevan untuk sebuah soal (berdasarkan kata
 * kunci di teks soal & kunci). Dipakai Penjaga untuk memberi petunjuk.
 */
export function adeganUntukSoal(kode: string, teks: string): number {
  const daftar = getAdegan(kode);
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
