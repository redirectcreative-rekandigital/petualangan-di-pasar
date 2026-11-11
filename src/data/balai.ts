import { lokalkan } from '../core/bahasa';
import type {
  BalaiMeta,
  DiagramBagian,
  DiagramMateri,
  Elemen,
  MateriPoin,
  NoktahId,
  NoktahMeta,
  TokohMateri,
} from '../../shared/types';
import { CERITA, URUTAN_BALAI, getCerita } from './cerita';

/**
 * Peta belajar "Survival Sains" (IPA Kelas 5 SD/MI).
 *
 * Peta besar berbentuk kitab terbuka berisi 11 NOKTAH materi, dikelompokkan
 * ke 3 zona: Makhluk Hidup (H), Fisika (F), dan Bumi (E). Setiap noktah
 * berisi satu BALAI (rumah penjaga). Di dalam tiap balai ada dua tokoh:
 * Penjaga (dialog misi) dan Tokoh Materi (membawakan materi utuh) serta
 * sebuah diagram interaktif.
 *
 * Nama noktah & balai dibuat halus bergaya game; judul materi asli tetap
 * disimpan di kolom `materi` untuk bacaan dan laporan guru.
 */

interface BalaiInput {
  kode: string;
  nama: string;
  penjaga: string;
  dialogPenjaga: string;
  tokohMateri: TokohMateri;
  materi: string;
  elemen: Elemen;
  materiPoin: MateriPoin[];
  diagram: DiagramMateri;
  kunciJawab: string;
  soalPerMain?: number;
}

/** Membuat satu balai di dalam noktah (satu noktah = satu balai). */
function balaiTunggal(noktah: NoktahId, input: BalaiInput): BalaiMeta {
  return {
    kode: input.kode,
    noktah,
    nama: input.nama,
    penjaga: input.penjaga,
    dialogPenjaga: input.dialogPenjaga,
    tokohMateri: input.tokohMateri,
    materi: input.materi,
    elemen: input.elemen,
    urutan: 0,
    materiPoin: input.materiPoin,
    diagram: input.diagram,
    kunciJawab: input.kunciJawab,
    soalPerMain: input.soalPerMain ?? 3,
  };
}

/** Posisi noktah pada peta kitab (persen dari kiri/atas). */
const PETA_POSISI = {
  // Halaman kiri — Rimba Kehidupan (Makhluk Hidup)
  H01: { x: 18, y: 26 },
  H02: { x: 31, y: 20 },
  H03: { x: 22, y: 41 },
  H04: { x: 35, y: 37 },
  // Halaman kanan — Ngarai Gelombang (Fisika)
  F01: { x: 65, y: 22 },
  F02: { x: 78, y: 28 },
  F03: { x: 69, y: 41 },
  F04: { x: 83, y: 43 },
  // Bagian bawah — Puncak Bumi
  E01: { x: 41, y: 62 },
  E02: { x: 59, y: 62 },
  E03: { x: 50, y: 74 },
};

/** Noktah babak puncak Menara Kitab di tengah-bawah peta. */
const FINAL_POSISI = { x: 50, y: 90 };

/* ------------------------------------------------------------------ */
/* Diagram interaktif helpers                                           */
/* ------------------------------------------------------------------ */

function bagian(nama: string, fungsi: string): DiagramBagian {
  return { nama, fungsi };
}

function diagram(judul: string, bentuk: string, daftar: DiagramBagian[]): DiagramMateri {
  return { judul, bentuk, bagian: daftar };
}

const NOKTAH_ASLI: NoktahMeta[] = [
  /* ================= ZONA 1 — RIMBA KEHIDUPAN (H) ================= */
  {
    kode: 'H01',
    nama: 'Rimba Ekosistem',
    materi: 'Ekosistem: komponen biotik & abiotik',
    elemen: 'Makhluk Hidup',
    peta: PETA_POSISI.H01,
    balai: [
      balaiTunggal('H01', {
        kode: 'H01',
        nama: 'Balai Ekosistem',
        penjaga: 'Ibu Semesta',
        dialogPenjaga:
          'Selamat datang di Rimba Ekosistem. Di sini, hidup dan lingkungan saling merawat. Dengarkan baik-baik, lalu catat di kitabmu.',
        tokohMateri: {
          nama: 'Profesor Rumput',
          pengantar:
            'Aku akan membacakan rahasia ekosistem. Perhatikan komponen hidup dan tak hidup, ya.',
        },
        materi: 'Ekosistem: komponen biotik & abiotik',
        elemen: 'Makhluk Hidup',
        materiPoin: [
          {
            judul: 'Apa itu ekosistem',
            teks: 'Ekosistem adalah hubungan timbal balik antara makhluk hidup dengan makhluk hidup lain dan dengan lingkungannya.',
          },
          {
            judul: 'Komponen biotik',
            teks: 'Makhluk hidup: produsen (tumbuhan hijau yang berfotosintesis), konsumen (hewan dan manusia), dan pengurai (jamur dan bakteri).',
          },
          {
            judul: 'Komponen abiotik',
            teks: 'Benda tak hidup: air, udara, tanah, cahaya matahari, suhu, kelembapan, batu, dan angin.',
          },
          {
            judul: 'Jenis konsumen',
            teks: 'Herbivora pemakan tumbuhan, karnivora pemakan daging, omnivora pemakan keduanya, dan insektivora pemakan serangga.',
          },
          {
            judul: 'Jenis ekosistem',
            teks: 'Ekosistem darat (hutan, padang rumput, gurun), perairan (sungai, danau, laut, rawa), dan buatan (sawah, kebun, kolam ikan, akuarium).',
          },
        ],
        diagram: diagram('Komponen Ekosistem', 'ekosistem', [
          bagian('Produsen', 'Tumbuhan hijau yang membuat makanan sendiri lewat fotosintesis.'),
          bagian('Konsumen', 'Hewan dan manusia yang tidak dapat membuat makanan sendiri.'),
          bagian('Pengurai', 'Jamur dan bakteri yang menguraikan sisa makhluk hidup menjadi unsur hara.'),
          bagian('Abiotik', 'Air, udara, tanah, cahaya matahari, suhu, dan benda tak hidup lain.'),
        ]),
        kunciJawab: 'Ingat: biotik = makhluk hidup, abiotik = benda tak hidup.',
      }),
    ],
  },
  {
    kode: 'H02',
    nama: 'Ladang Rantai',
    materi: 'Rantai makanan dan jaring-jaring makanan',
    elemen: 'Makhluk Hidup',
    peta: PETA_POSISI.H02,
    balai: [
      balaiTunggal('H02', {
        kode: 'H02',
        nama: 'Ladang Rantai Makanan',
        penjaga: 'Pak Penghubung',
        dialogPenjaga:
          'Di ladang ini, energi berpindah dari satu makhluk ke makhluk lain. Ikuti alurnya, jangan sampai putus.',
        tokohMateri: {
          nama: 'Kakak Energi',
          pengantar:
            'Mari kita telusuri rantai makanan. Siapa memakan siapa, dan dari mana energinya berasal.',
        },
        materi: 'Rantai makanan dan jaring-jaring makanan',
        elemen: 'Makhluk Hidup',
        materiPoin: [
          {
            judul: 'Rantai makanan',
            teks: 'Perpindahan energi dari satu makhluk hidup ke makhluk hidup lain melalui peristiwa makan dan dimakan secara berurutan.',
          },
          {
            judul: 'Arah energi',
            teks: 'Sumber energi utama adalah matahari. Tanda panah (→) berarti "dimakan oleh" dan menunjukkan arah perpindahan energi.',
          },
          {
            judul: 'Tingkat konsumen',
            teks: 'Rantai selalu dimulai dari produsen, lalu konsumen tingkat I (herbivora), II, III, dan diakhiri pengurai. Contoh: padi → tikus → ular → elang.',
          },
          {
            judul: 'Jaring-jaring makanan',
            teks: 'Gabungan beberapa rantai makanan yang saling berhubungan. Satu makhluk bisa memakan atau dimakan lebih dari satu jenis.',
          },
          {
            judul: 'Keseimbangan ekosistem',
            teks: 'Semakin tinggi tingkat konsumen, jumlah individu dan energinya semakin sedikit. Jika satu mata rantai hilang, keseimbangan terganggu.',
          },
        ],
        diagram: diagram('Rantai Makanan', 'rantai', [
          bagian('Padi', 'Produsen — membuat makanan sendiri lewat fotosintesis.'),
          bagian('Tikus', 'Konsumen tingkat I (herbivora) — memakan produsen.'),
          bagian('Ular', 'Konsumen tingkat II (karnivora) — memakan tikus.'),
          bagian('Elang', 'Konsumen tingkat III — pemangsa puncak.'),
          bagian('Jamur', 'Pengurai — menguraikan sisa makhluk hidup menjadi unsur hara.'),
        ]),
        kunciJawab: 'Rantai makanan selalu mulai dari produsen; energi terbesar ada di produsen.',
      }),
    ],
  },
  {
    kode: 'H03',
    nama: 'Simpul Simbiosis',
    materi: 'Hubungan antar makhluk hidup dalam ekosistem',
    elemen: 'Makhluk Hidup',
    peta: PETA_POSISI.H03,
    balai: [
      balaiTunggal('H03', {
        kode: 'H03',
        nama: 'Balai Simbiosis',
        penjaga: 'Kakak Sutra',
        dialogPenjaga:
          'Setiap makhluk punya sahabat dan lawan. Ada yang saling menguntungkan, ada yang merugikan. Pelajari dengan teliti.',
        tokohMateri: {
          nama: 'Dokter Simbiosis',
          pengantar:
            'Kita akan mengenal mutualisme, komensalisme, parasitisme, dan persaingan. Perhatikan contohnya.',
        },
        materi: 'Hubungan antar makhluk hidup dalam ekosistem',
        elemen: 'Makhluk Hidup',
        materiPoin: [
          {
            judul: 'Simbiosis',
            teks: 'Hubungan erat antara dua makhluk hidup yang berbeda jenis. Ada tiga macam: mutualisme, komensalisme, dan parasitisme.',
          },
          {
            judul: 'Mutualisme',
            teks: 'Kedua pihak saling untung. Contoh: lebah dan bunga, ikan badut dan anemon laut, bakteri Rhizobium pada akar kacang-kacangan.',
          },
          {
            judul: 'Komensalisme',
            teks: 'Satu pihak untung, pihak lain tidak untung dan tidak rugi. Contoh: anggrek yang menempel pada pohon, ikan remora pada hiu.',
          },
          {
            judul: 'Parasitisme',
            teks: 'Satu pihak untung (parasit), pihak lain rugi (inang). Contoh: benalu pada pohon, cacing pita di usus manusia, kutu di kepala.',
          },
          {
            judul: 'Predasi & kompetisi',
            teks: 'Predasi adalah hubungan pemangsa dan mangsa (singa dan zebra). Kompetisi adalah persaingan memperebutkan sumber daya terbatas (jagung dan gulma).',
          },
        ],
        diagram: diagram('Bentuk Hubungan Antar Makhluk Hidup', 'simbiosis', [
          bagian('Mutualisme', 'Keduanya untung, misalnya lebah dan bunga.'),
          bagian('Komensalisme', 'Satu untung, satu netral, misalnya anggrek di pohon.'),
          bagian('Parasitisme', 'Satu untung, satu rugi, misalnya benalu pada pohon.'),
          bagian('Predasi', 'Pemangsa memakan mangsa, misalnya singa dan zebra.'),
          bagian('Kompetisi', 'Persaingan sumber daya, misalnya jagung dan gulma.'),
        ]),
        kunciJawab: 'Untung-untung mutualisme, untung-netral komensalisme, untung-rugi parasitisme.',
      }),
    ],
  },
  {
    kode: 'H04',
    nama: 'Taman Lestari',
    materi: 'Cara menjaga kelestarian ekosistem',
    elemen: 'Makhluk Hidup',
    peta: PETA_POSISI.H04,
    balai: [
      balaiTunggal('H04', {
        kode: 'H04',
        nama: 'Taman Lestari',
        penjaga: 'Raja Rimba',
        dialogPenjaga:
          'Alam ini titipan, bukan warisan. Tugas kita menjaganya tetap seimbang.',
        tokohMateri: {
          nama: 'Kakak Hijau',
          pengantar:
            'Aku tunjukkan cara menjaga kelestarian, dari reboisasi sampai 3R. Catat yang paling bisa kamu lakukan.',
        },
        materi: 'Cara menjaga kelestarian ekosistem',
        elemen: 'Makhluk Hidup',
        materiPoin: [
          {
            judul: 'Penyebab kerusakan',
            teks: 'Penebangan dan pembakaran hutan liar, perburuan hewan langka, pencemaran air/tanah/udara, pestisida berlebihan, dan alih fungsi lahan.',
          },
          {
            judul: 'Dampak kerusakan',
            teks: 'Banjir, tanah longsor, kekeringan, kepunahan hewan dan tumbuhan, serta pemanasan global.',
          },
          {
            judul: 'Upaya menjaga',
            teks: 'Reboisasi (penghijauan), tebang pilih, membuang sampah pada tempatnya, dan menerapkan 3R: reduce, reuse, recycle.',
          },
          {
            judul: 'Kawasan konservasi',
            teks: 'Cagar alam, suaka margasatwa, dan taman nasional dibuat untuk melindungi tumbuhan dan hewan agar tidak punah.',
          },
          {
            judul: 'Satwa langka Indonesia',
            teks: 'Harimau Sumatra, orangutan, badak Jawa, komodo, dan jalak Bali perlu dilindungi dari perburuan liar.',
          },
        ],
        diagram: diagram('Menjaga Ekosistem', 'daun', [
          bagian('Reboisasi', 'Menanam kembali hutan yang gundul.'),
          bagian('3R', 'Reduce (mengurangi), reuse (memakai ulang), recycle (mendaur ulang).'),
          bagian('Konservasi', 'Cagar alam, suaka margasatwa, dan taman nasional.'),
          bagian('Tebang pilih', 'Menebang hanya pohon yang sudah cukup umur, bukan tebang habis.'),
        ]),
        kunciJawab: 'Jaga alam dengan reboisasi, tebang pilih, dan 3R.',
      }),
    ],
  },

  /* ================= ZONA 2 — NGARAI GELOMBANG (F) ================= */
  {
    kode: 'F01',
    nama: 'Goa Sinar',
    materi: 'Sifat cahaya dan organ mata',
    elemen: 'Fisika',
    peta: PETA_POSISI.F01,
    balai: [
      balaiTunggal('F01', {
        kode: 'F01',
        nama: 'Balai Cahaya',
        penjaga: 'Bu Cahaya',
        dialogPenjaga:
          'Cahaya itu lurus, menerangi, dan bisa membelok. Masuklah ke goa ini untuk memahaminya.',
        tokohMateri: {
          nama: 'Profesor Prisma',
          pengantar:
            'Mari kita belajar sifat cahaya dan cara kerja mata. Termasuk bagian mata dan cara menjaganya.',
        },
        materi: 'Sifat cahaya dan organ mata',
        elemen: 'Fisika',
        materiPoin: [
          {
            judul: 'Sifat cahaya',
            teks: 'Cahaya merambat lurus, menembus benda bening, dapat dipantulkan, dibiaskan, dan diuraikan (pelangi).',
          },
          {
            judul: 'Benda terhadap cahaya',
            teks: 'Transparan (bening, semua cahaya lewat), translusen (sebagian cahaya lewat), dan opak (tidak ada cahaya yang lewat).',
          },
          {
            judul: 'Cermin',
            teks: 'Cermin datar membentuk bayangan sama besar. Cermin cembung memperkecil (spion). Cermin cekung memperbesar (senter, cermin dokter gigi).',
          },
          {
            judul: 'Bagian mata',
            teks: 'Kornea melindungi dan meneruskan cahaya, iris mengatur pupil, pupil mengatur cahaya masuk, lensa memfokuskan, retina menangkap bayangan, saraf optik mengirim ke otak.',
          },
          {
            judul: 'Gangguan mata',
            teks: 'Rabun jauh (miopi) ditolong lensa cekung, rabun dekat (hipermetropi) ditolong lensa cembung, katarak karena lensa keruh, rabun senja karena kurang vitamin A.',
          },
          {
            judul: 'Menjaga mata',
            teks: 'Membaca dengan cahaya cukup pada jarak sekitar 30 cm, tidak terlalu lama menatap layar, makan makanan bervitamin A, dan tidak mengucek mata dengan tangan kotor.',
          },
        ],
        diagram: diagram('Bagian Mata dan Fungsinya', 'mata', [
          bagian('Kornea', 'Lapisan bening di depan yang melindungi mata dan meneruskan cahaya.'),
          bagian('Iris', 'Selaput pelangi yang memberi warna mata dan mengatur ukuran pupil.'),
          bagian('Pupil', 'Lubang di tengah iris yang mengatur banyaknya cahaya masuk.'),
          bagian('Lensa mata', 'Bersifat cembung dan memfokuskan cahaya ke retina.'),
          bagian('Retina', 'Selaput jala, tempat jatuhnya bayangan benda.'),
          bagian('Saraf optik', 'Mengirim pesan dari retina ke otak.'),
        ]),
        kunciJawab: 'Jalur cahaya: kornea → pupil → lensa → retina → saraf optik → otak.',
      }),
    ],
  },
  {
    kode: 'F02',
    nama: 'Lembah Gema',
    materi: 'Sifat bunyi dan organ telinga',
    elemen: 'Fisika',
    peta: PETA_POSISI.F02,
    balai: [
      balaiTunggal('F02', {
        kode: 'F02',
        nama: 'Balai Bunyi',
        penjaga: 'Pak Gaung',
        dialogPenjaga:
          'Dengarkan suaramu memantul di lembah ini. Bunyi punya banyak rahasia.',
        tokohMateri: {
          nama: 'Dokter Telinga',
          pengantar:
            'Kita akan belajar sifat bunyi dan organ telinga, serta cara merawat pendengaran.',
        },
        materi: 'Sifat bunyi dan organ telinga',
        elemen: 'Fisika',
        materiPoin: [
          {
            judul: 'Sifat bunyi',
            teks: 'Bunyi berasal dari benda yang bergetar dan memerlukan medium untuk merambat. Bunyi tidak dapat merambat di ruang hampa.',
          },
          {
            judul: 'Kecepatan bunyi',
            teks: 'Paling cepat di zat padat, lalu zat cair, dan paling lambat di gas (udara).',
          },
          {
            judul: 'Pemantulan bunyi',
            teks: 'Gema adalah bunyi pantul yang terdengar setelah bunyi asli (lembah, tebing). Gaung terdengar bercampur dengan bunyi asli (ruangan tertutup).',
          },
          {
            judul: 'Frekuensi & amplitudo',
            teks: 'Frekuensi menentukan nada tinggi-rendah. Amplitudo menentukan keras-lemahnya bunyi. Infrasonik < 20 Hz, audiosonik 20–20.000 Hz, ultrasonik > 20.000 Hz.',
          },
          {
            judul: 'Bagian telinga',
            teks: 'Telinga luar: daun telinga dan saluran telinga. Telinga tengah: gendang telinga dan tiga tulang pendengaran (martil, landasan, sanggurdi). Telinga dalam: koklea dan saraf pendengaran.',
          },
          {
            judul: 'Menjaga telinga',
            teks: 'Bersihkan bagian luar dengan lembut, jangan mengorek dengan benda keras, jangan memakai headset terlalu keras, dan hindari suara bising.',
          },
        ],
        diagram: diagram('Bagian Telinga dan Fungsinya', 'telinga', [
          bagian('Daun telinga', 'Menangkap getaran bunyi dari luar.'),
          bagian('Gendang telinga', 'Selaput tipis yang bergetar saat bunyi tiba.'),
          bagian('Tulang pendengaran', 'Martil, landasan, dan sanggurdi menguatkan dan meneruskan getaran.'),
          bagian('Koklea', 'Rumah siput yang mengubah getaran menjadi sinyal saraf.'),
          bagian('Saraf pendengaran', 'Mengirim sinyal bunyi ke otak.'),
        ]),
        kunciJawab: 'Bunyi butuh medium; tidak dapat merambat di ruang hampa.',
      }),
    ],
  },
  {
    kode: 'F03',
    nama: 'Bukit Magnet',
    materi: 'Magnet: sifat, jenis, dan cara membuat',
    elemen: 'Fisika',
    peta: PETA_POSISI.F03,
    balai: [
      balaiTunggal('F03', {
        kode: 'F03',
        nama: 'Balai Magnet',
        penjaga: 'Kak Kutub',
        dialogPenjaga:
          'Di bukit ini, tarik-menarik sudah jadi kebiasaan. Pelajari gaya yang tak terlihat ini.',
        tokohMateri: {
          nama: 'Profesor Kutub',
          pengantar:
            'Aku jelaskan sifat magnet, kutubnya, jenis, dan cara membuat magnet sederhana.',
        },
        materi: 'Magnet: sifat, jenis, dan cara membuat',
        elemen: 'Fisika',
        materiPoin: [
          {
            judul: 'Sifat magnet',
            teks: 'Menarik besi, baja, nikel, dan kobalt. Memiliki kutub utara (U) dan selatan (S). Kutub senama tolak-menolak, kutub tidak senama tarik-menarik.',
          },
          {
            judul: 'Kekuatan magnet',
            teks: 'Gaya tarik terkuat ada di kutub-kutubnya dan paling lemah di bagian tengah. Magnet dapat menembus benda tipis seperti kertas, kain, dan kaca.',
          },
          {
            judul: 'Jenis magnet',
            teks: 'Magnet alam (batu magnetit) dan magnet buatan (batang, ladam, jarum, silinder, cincin, keping). Magnet permanen bertahan lama (baja); magnet sementara mudah hilang (besi lunak).',
          },
          {
            judul: 'Cara membuat magnet',
            teks: 'Menggosok satu arah berulang-ulang, induksi (menempelkan pada magnet kuat), dan elektromagnetik (melilitkan kawat berarus pada paku).',
          },
          {
            judul: 'Kemagnetan dapat hilang',
            teks: 'Bila magnet dipanaskan, dipukul, dijatuhkan berulang-ulang, atau disimpan sembarangan dalam waktu lama.',
          },
          {
            judul: 'Pemanfaatan magnet',
            teks: 'Kompas, pintu kulkas, speaker, bel listrik, dinamo, kereta maglev, dan derek magnet di tempat barang bekas.',
          },
        ],
        diagram: diagram('Kutub dan Gaya Magnet', 'magnet', [
          bagian('Kutub utara (U)', 'Salah satu ujung magnet; menunjuk ke arah utara bila digantung bebas.'),
          bagian('Kutub selatan (S)', 'Ujung lain magnet; menunjuk ke arah selatan bila digantung bebas.'),
          bagian('Bagian tengah', 'Bagian magnet dengan gaya tarik paling lemah.'),
          bagian('Kutub senama', 'Dua kutub U–U atau S–S akan tolak-menolak.'),
          bagian('Kutub tak senama', 'Kutub U–S akan tarik-menarik.'),
        ]),
        kunciJawab: 'Kutub senama tolak-menolak, kutub tidak senama tarik-menarik.',
      }),
    ],
  },
  {
    kode: 'F04',
    nama: 'Sungai Bercahaya',
    materi: 'Listrik: arus, pembangkit, dan rangkaian',
    elemen: 'Fisika',
    peta: PETA_POSISI.F04,
    balai: [
      balaiTunggal('F04', {
        kode: 'F04',
        nama: 'Balai Listrik',
        penjaga: 'Nenek Listrik',
        dialogPenjaga:
          'Sungai ini mengalirkan tenaga. Listrik ada di mana-mana; gunakan dengan bijak.',
        tokohMateri: {
          nama: 'Teknisi Kilat',
          pengantar:
            'Mari kita pelajari arus listrik, pembangkit, rangkaian, dan cara menghemat listrik.',
        },
        materi: 'Listrik: arus, pembangkit, dan rangkaian',
        elemen: 'Fisika',
        materiPoin: [
          {
            judul: 'Arus listrik',
            teks: 'Aliran muatan listrik (elektron) melalui penghantar. Syaratnya: sumber tegangan, penghantar, rangkaian tertutup, dan beban.',
          },
          {
            judul: 'Konduktor & isolator',
            teks: 'Konduktor menghantarkan listrik dengan baik (tembaga, aluminium, besi, air garam). Isolator tidak (plastik, karet, kaca, kayu kering).',
          },
          {
            judul: 'Pembangkit listrik',
            teks: 'PLTA (air), PLTU (uap batu bara), PLTD (diesel), PLTP (panas bumi), PLTS (matahari), PLTB (angin), PLTN (nuklir).',
          },
          {
            judul: 'Rangkaian seri & paralel',
            teks: 'Seri: satu jalur, jika satu lampu putus semua padam. Paralel: bercabang, jika satu putus lampu lain tetap menyala. Rumah memakai paralel.',
          },
          {
            judul: 'Menghemat listrik',
            teks: 'Matikan lampu/TV/kipas saat tidak dipakai, pakai lampu LED, cabut steker, dan manfaatkan cahaya matahari.',
          },
        ],
        diagram: diagram('Rangkaian Listrik Sederhana', 'listrik', [
          bagian('Baterai', 'Sumber tegangan yang mendorong arus listrik mengalir.'),
          bagian('Kabel', 'Penghantar yang menghubungkan komponen rangkaian.'),
          bagian('Saklar', 'Menutup dan membuka rangkaian agar lampu menyala atau padam.'),
          bagian('Lampu', 'Beban yang menyala ketika arus listrik mengalir.'),
        ]),
        kunciJawab: 'Rangkaian harus tertutup agar arus listrik dapat mengalir.',
      }),
    ],
  },

  /* ================= ZONA 3 — PUNCAK BUMI (E) ================= */
  {
    kode: 'E01',
    nama: 'Punggung Batuan',
    materi: 'Litosfer: lapisan batuan penyusun kulit bumi',
    elemen: 'Bumi',
    peta: PETA_POSISI.E01,
    balai: [
      balaiTunggal('E01', {
        kode: 'E01',
        nama: 'Balai Litosfer',
        penjaga: 'Pak Bumi',
        dialogPenjaga:
          'Aku menyimpan tanah dan batuan di punggungku. Inilah lapisan kulit bumi.',
        tokohMateri: {
          nama: 'Profesor Batuan',
          pengantar:
            'Kita akan mengenal litosfer dan contoh kenampakan bumi dari batuan.',
        },
        materi: 'Litosfer: lapisan batuan penyusun kulit bumi',
        elemen: 'Bumi',
        materiPoin: [
          {
            judul: 'Lapisan bumi',
            teks: 'Bumi memiliki lapisan batuan (litosfer), lapisan air (hidrosfer), dan lapisan udara (atmosfer).',
          },
          {
            judul: 'Litosfer',
            teks: 'Lapisan batuan dan tanah yang menyusun kulit bumi. Contohnya gunung, bukit, lembah, dataran rendah, dataran tinggi, pulau, tanah, dan batuan.',
          },
          {
            judul: 'Kenampakan bumi',
            teks: 'Gunung adalah bagian bumi yang menonjol tinggi. Lembah adalah cekungan di antara gunung. Dataran rendah dan dataran tinggi membentuk permukaan bumi yang beragam.',
          },
        ],
        diagram: diagram('Lapisan Bumi', 'bumi', [
          bagian('Litosfer', 'Lapisan batuan dan tanah yang menyusun kulit bumi.'),
          bagian('Hidrosfer', 'Seluruh air di bumi: laut, sungai, danau, rawa, air tanah, dan es.'),
          bagian('Atmosfer', 'Lapisan udara yang menyelubungi bumi.'),
        ]),
        kunciJawab: 'Litosfer = lapisan batuan dan tanah penyusun kulit bumi.',
      }),
    ],
  },
  {
    kode: 'E02',
    nama: 'Sungai & Langit',
    materi: 'Hidrosfer dan atmosfer',
    elemen: 'Bumi',
    peta: PETA_POSISI.E02,
    balai: [
      balaiTunggal('E02', {
        kode: 'E02',
        nama: 'Balai Hidrosfer & Atmosfer',
        penjaga: 'Ibu Awan',
        dialogPenjaga:
          'Air dan udara menyelimuti bumi ini. Keduanya menjaga kehidupan tetap berlangsung.',
        tokohMateri: {
          nama: 'Kakak Air',
          pengantar:
            'Aku ceritakan hidrosfer dan atmosfer, termasuk lapisan-lapisannya.',
        },
        materi: 'Hidrosfer dan atmosfer',
        elemen: 'Bumi',
        materiPoin: [
          {
            judul: 'Hidrosfer',
            teks: 'Seluruh air di bumi: laut, samudra, sungai, danau, rawa, air tanah, hujan, dan es di kutub.',
          },
          {
            judul: 'Atmosfer',
            teks: 'Lapisan udara yang menyelubungi bumi. Terdiri dari troposfer, stratosfer, mesosfer, termosfer, dan eksosfer.',
          },
          {
            judul: 'Lapisan atmosfer',
            teks: 'Troposfer: tempat cuaca, awan, dan hujan. Stratosfer: terdapat lapisan ozon. Mesosfer: tempat meteor terbakar. Termosfer dan eksosfer: lapisan terluar.',
          },
        ],
        diagram: diagram('Lapisan Atmosfer', 'atmosfer', [
          bagian('Troposfer', 'Tempat terjadinya cuaca, awan, dan hujan.'),
          bagian('Stratosfer', 'Tempat terdapatnya lapisan ozon yang melindungi bumi.'),
          bagian('Mesosfer', 'Tempat meteor terbakar saat memasuki atmosfer.'),
          bagian('Termosfer', 'Lapisan udara yang sangat panas.'),
          bagian('Eksosfer', 'Lapisan atmosfer paling luar.'),
        ]),
        kunciJawab: 'Cuaca, awan, dan hujan terjadi di troposfer.',
      }),
    ],
  },
  {
    kode: 'E03',
    nama: 'Puncak Siklus',
    materi: 'Siklus air dan bumi yang bergerak',
    elemen: 'Bumi',
    peta: PETA_POSISI.E03,
    balai: [
      balaiTunggal('E03', {
        kode: 'E03',
        nama: 'Balai Siklus Air & Bumi Bergerak',
        penjaga: 'Dewi Bumi',
        dialogPenjaga:
          'Air berputar tanpa henti, dan bumi bergerak pelan. Di puncak ini, kamu akan melihat semuanya bersatu.',
        tokohMateri: {
          nama: 'Kakak Siklus',
          pengantar:
            'Mari kita pelajari siklus air, gempa bumi, tsunami, dan cara aman menghadapinya.',
        },
        materi: 'Siklus air dan bumi yang bergerak',
        elemen: 'Bumi',
        materiPoin: [
          {
            judul: 'Siklus air',
            teks: 'Evaporasi (penguapan), transpirasi (tumbuhan melepas uap), kondensasi (pengembunan menjadi awan), presipitasi (hujan), lalu infiltrasi dan limpasan kembali ke laut.',
          },
          {
            judul: 'Pergerakan bumi',
            teks: 'Bumi memiliki lempeng yang selalu bergerak pelan. Indonesia berada di pertemuan lempeng Indo-Australia, Eurasia, dan Pasifik sehingga rawan gempa dan gunung berapi.',
          },
          {
            judul: 'Gempa bumi',
            teks: 'Getaran di permukaan bumi. Penyebabnya pergeseran lempeng (tektonik), letusan gunung berapi (vulkanik), dan runtuhnya tanah (runtuhan).',
          },
          {
            judul: 'Tsunami',
            teks: 'Gelombang laut sangat besar, biasanya akibat gempa di dasar laut, letusan gunung api laut, atau longsor bawah laut.',
          },
          {
            judul: 'Cara aman',
            teks: 'Saat gempa: berlindung di bawah meja kokoh, jauhi kaca, lalu menuju tanah lapang. Saat ada peringatan tsunami: segera menuju tempat yang tinggi.',
          },
        ],
        diagram: diagram('Siklus Air', 'siklus', [
          bagian('Evaporasi', 'Air laut, sungai, dan danau menguap karena panas matahari.'),
          bagian('Kondensasi', 'Uap air mendingin lalu membentuk awan.'),
          bagian('Presipitasi', 'Awan menjadi berat lalu turun sebagai hujan.'),
          bagian('Infiltrasi', 'Air hujan meresap ke tanah atau mengalir ke sungai dan kembali ke laut.'),
        ]),
        kunciJawab: 'Saat gempa: lindungi kepala, jauhi kaca, cari tanah lapang. Saat tsunami: menuju tempat tinggi.',
      }),
    ],
  },

  /* ================= BABAK PUNCAK — MENARA KITAB ================= */
  {
    kode: 'FINAL',
    nama: 'Menara Kitab',
    materi: 'Tantangan puncak: campuran semua materi IPA',
    elemen: 'Bumi',
    peta: FINAL_POSISI,
    balai: [
      {
        kode: 'FINAL',
        noktah: 'FINAL',
        nama: 'Menara Kitab',
        penjaga: 'Ibu Semesta',
        dialogPenjaga:
          'Kamu telah menemui para Penjaga dan mencatat rahasia mereka. Kini tuliskan halaman terakhir. Bila berhasil, kitab menjadi utuh kembali.',
        tokohMateri: {
          nama: 'Ibu Semesta',
          pengantar:
            'Bacalah setiap soal dengan teliti. Gunakan semua rahasia alam yang telah kamu catat.',
        },
        materi: 'Tantangan puncak: campuran semua materi IPA',
        elemen: 'Bumi',
        urutan: 0,
        materiPoin: [
          {
            judul: 'Sembilan rahasia alam',
            teks: 'Cahaya, bunyi, ekosistem, rantai makanan, hubungan antar makhluk hidup, kelestarian, magnet, listrik, dan kenampakan bumi.',
          },
          {
            judul: 'Cara menghadapi soal campuran',
            teks: 'Baca soal dengan teliti, tentukan materi yang dibahas, lalu pilih jawaban yang paling tepat.',
          },
        ],
        diagram: diagram('Peta Kitab', 'kitab', [
          bagian('Rimba Kehidupan', 'Ekosistem, rantai makanan, simbiosis, dan kelestarian.'),
          bagian('Ngarai Gelombang', 'Cahaya, bunyi, magnet, dan listrik.'),
          bagian('Puncak Bumi', 'Litosfer, hidrosfer, atmosfer, siklus air, dan bumi bergerak.'),
        ]),
        kunciJawab: 'Baca teliti, kenali materinya, pilih jawaban paling tepat.',
        soalPerMain: 30,
      },
    ],
  },
];

/** Semua balai dari semua noktah (untuk pencarian id balai). */
/**
 * Posisi balai di jalur pulau: spiral yang naik dari pantai (Goa Sinar) menuju
 * Mercusuar Tua di tengah pulau. Nilai dalam persen papan peta.
 */
function posisiJalur(urutan: number): { x: number; y: number } {
  const i = urutan - 1; // 0..10
  const sudut = Math.PI * 0.62 + i * ((Math.PI * 1.72) / 10);
  const jari = 40 - i * 2.1;
  return {
    x: Math.round((50 + Math.cos(sudut) * jari) * 10) / 10,
    y: Math.round((50 + Math.sin(sudut) * jari * 1.05) * 10) / 10,
  };
}

/**
 * Daftar noktah final: diurutkan sesuai bab buku (jalur pulau), dengan nama
 * penjaga & cantrik bernuansa Nusantara dari naskah cerita.
 */
export const NOKTAH: NoktahMeta[] = lokalkan([
  ...URUTAN_BALAI.map((kode) => {
    const asli = NOKTAH_ASLI.find((n) => n.kode === kode) as NoktahMeta;
    const c = getCerita(kode);
    if (!c) return asli;
    return {
      ...asli,
      nama: c.tempat,
      peta: posisiJalur(c.urutan),
      balai: asli.balai.map((b) => ({
        ...b,
        nama: c.tempat,
        penjaga: c.penjaga.nama,
        dialogPenjaga: c.tugas,
        tokohMateri: { nama: c.cantrik.nama, pengantar: c.cantrikSapa },
        urutan: c.urutan - 1,
      })),
    };
  }),
  ...NOKTAH_ASLI.filter((n) => n.kode === 'FINAL').map((n) => ({
    ...n,
    nama: 'Mercusuar Tua',
    peta: { x: 50, y: 50 },
    balai: n.balai.map((b) => ({ ...b, nama: 'Mercusuar Tua', penjaga: 'Sembilan Penjaga' })),
  })),
]);
void CERITA;

export const SEMUA_BALAI: BalaiMeta[] = NOKTAH.flatMap((n) => n.balai);

/** Definisi zona untuk tata letak dunia 3D & warna peta. */
export interface ZonaMeta {
  elemen: Elemen;
  nama: string;
  /** Warna bangunan zona (hex). */
  warna: number;
}

export const ZONA: ZonaMeta[] = lokalkan([
  { elemen: 'Makhluk Hidup', nama: 'Rimba Kehidupan', warna: 0x2f9e6b },
  { elemen: 'Fisika', nama: 'Ngarai Gelombang', warna: 0x2563eb },
  { elemen: 'Bumi', nama: 'Puncak Bumi', warna: 0xd97706 },
]);

/**
 * Warna aksen khas tiap balai.
 *
 * Zona tetap punya warna induk, tetapi atap, cincin panggung materi, dan papan
 * nama tiap balai memakai warna sendiri supaya anak bisa membedakan balai satu
 * dengan yang lain hanya dengan melihatnya.
 */
export const WARNA_BALAI: Record<string, number> = {
  H01: 0x2f9e6b, // hijau ekosistem
  H02: 0x65a30d, // hijau limau rantai makanan
  H03: 0x0d9488, // teal simbiosis
  H04: 0x15803d, // hijau tua kelestarian
  F01: 0xf59e0b, // kuning cahaya
  F02: 0x7c3aed, // ungu bunyi
  F03: 0xdc2626, // merah magnet
  F04: 0x2563eb, // biru listrik
  E01: 0x78716c, // batu litosfer
  E02: 0x0ea5e9, // biru langit hidrosfer
  E03: 0x0891b2, // sian siklus air
  FINAL: 0x9333ea, // ungu menara kitab
};

/** Warna aksen sebuah balai; jatuh ke warna zona bila kodenya tak dikenal. */
export function warnaBalai(kode: string): number {
  const langsung = WARNA_BALAI[kode];
  if (langsung !== undefined) return langsung;
  const balai = getBalai(kode);
  const zona = balai ? ZONA.find((z) => z.elemen === balai.elemen) : undefined;
  return zona?.warna ?? 0x2f9e6b;
}

export function getNoktah(kode: string): NoktahMeta | undefined {
  return NOKTAH.find((n) => n.kode === kode);
}

export function getBalai(kode: string): BalaiMeta | undefined {
  return SEMUA_BALAI.find((b) => b.kode === kode);
}



/** 11 noktah materi (tanpa FINAL). */
export function noktahMateri(): NoktahMeta[] {
  return NOKTAH.filter((n) => n.kode !== 'FINAL');
}

