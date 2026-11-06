import type { BalaiMeta, Elemen, NoktahMeta, NoktahId } from '../../shared/types';
import { noktahListSchema } from './schema';

/**
 * Peta belajar "Petualangan di Pasar" versi noktah.
 *
 * Peta besar menampilkan satu NOKTAH per kode materi TKA (B01..D02). Di dalam
 * tiap noktah terdapat satu atau beberapa BALAI (rumah/sub-materi). Saat ini
 * setiap noktah berisi satu balai, sehingga id balai sama dengan kode materi.
 *
 * Nama noktah & balai dibuat halus bergaya game; judul materi asli tetap
 * disimpan di kolom `materi` untuk bacaan dan laporan guru.
 */

/** Membuat balai tunggal di dalam noktah (dipakai sampai sub-materi dipecah). */
function balaiTunggal(
  kode: string,
  noktah: NoktahId,
  nama: string,
  penjaga: string,
  materi: string,
  elemen: Elemen,
  bacaan: string[],
  contoh: string,
  kunciJawab: string,
): BalaiMeta {
  return {
    kode,
    noktah,
    nama,
    penjaga,
    materi,
    elemen,
    urutan: 0,
    bacaan,
    contoh,
    kunciJawab,
    soalPerMain: 3,
  };
}

/** Posisi noktah pada peta (persen dari kiri/atas), ditata seperti peta harta karun. */
const PETA_POSISI: Record<string, { x: number; y: number }> = {
  // Pulau Bilangan (kiri-atas)
  B01: { x: 16, y: 20 },
  B02: { x: 27, y: 13 },
  B03: { x: 38, y: 21 },
  B04: { x: 22, y: 32 },
  B05: { x: 34, y: 34 },
  B06: { x: 46, y: 29 },
  // Pulau Bentuk (kanan-atas)
  G01: { x: 64, y: 15 },
  G02: { x: 75, y: 22 },
  G03: { x: 86, y: 16 },
  G04: { x: 70, y: 32 },
  G05: { x: 81, y: 33 },
  G06: { x: 92, y: 29 },
  // Pulau Catatan (tengah-bawah)
  G07: { x: 30, y: 48 },
  G08: { x: 50, y: 50 },
  D01: { x: 68, y: 48 },
  D02: { x: 84, y: 52 },
};

/** Noktah babak puncak Pasar Ramai di tengah-bawah peta. */
const FINAL_POSISI = { x: 50, y: 76 };

export const NOKTAH: NoktahMeta[] = [
  // ---------------- PULAU BILANGAN ----------------
  {
    kode: 'B01',
    nama: 'Angka Awal',
    materi: 'Bilangan cacah: nilai tempat, perbandingan, urutan',
    elemen: 'Bilangan',
    peta: PETA_POSISI.B01 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'B01',
        'B01',
        'Balai Angka Awal',
        'Pak Nilai',
        'Bilangan cacah: nilai tempat, perbandingan, urutan',
        'Bilangan',
        [
          'Setiap angka punya tempat, dan tempat menentukan nilainya. Pada bilangan 4.725, angka 4 bernilai 4.000 (ribuan), angka 7 bernilai 700 (ratusan), angka 2 bernilai 20 (puluhan), dan angka 5 bernilai 5 (satuan).',
          'Untuk membandingkan dua bilangan, bandingkan mulai dari tempat paling kiri. Jika angka di tempat kiri sama, lanjutkan ke tempat berikutnya. Untuk mengurutkan, susun dari yang terkecil ke terbesar, atau sebaliknya.',
        ],
        'Urutkan 3.408, 3.480, 3.084 dari terkecil. Mulai dari ribuan sama (3), lalu ratusan: 0 < 4 < 4, sehingga 3.084 < 3.408 < 3.480.',
        'Bandingkan selalu dari tempat paling kiri lebih dulu.',
      ),
    ],
  },
  {
    kode: 'B02',
    nama: 'Hitung Cepat',
    materi: 'Operasi bilangan cacah dan soal cerita',
    elemen: 'Bilangan',
    peta: PETA_POSISI.B02 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'B02',
        'B02',
        'Pojok Hitung Cepat',
        'Bu Jumlah',
        'Operasi bilangan cacah dan soal cerita',
        'Bilangan',
        [
          'Empat operasi dasar: penjumlahan, pengurangan, perkalian, dan pembagian. Urutan pengerjaan: kerjakan tanda kurung dulu, lalu perkalian dan pembagian, terakhir penjumlahan dan pengurangan.',
          'Pada soal cerita belanja, tentukan dulu apa yang ditanya, susun langkah hitungnya, lalu hitung dengan teliti dari langkah pertama ke berikutnya.',
        ],
        'Ibu membeli 3 buku Rp4.500 dan membayar Rp20.000. Total = 3 × 4.500 = 13.500. Kembalian = 20.000 − 13.500 = 6.500.',
        'Kerjakan perkalian/pembagian sebelum penjumlahan/pengurangan.',
      ),
    ],
  },
  {
    kode: 'B03',
    nama: 'Berbagi Adil',
    materi: 'Faktor, kelipatan, FPB, dan KPK',
    elemen: 'Bilangan',
    peta: PETA_POSISI.B03 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'B03',
        'B03',
        'Balai Berbagi Adil',
        'Pak Bagi',
        'Faktor, kelipatan, FPB, dan KPK',
        'Bilangan',
        [
          'Faktor adalah bilangan yang membagi habis. Kelipatan adalah hasil kali bilangan dengan 1, 2, 3, dan seterusnya. FPB (Faktor Persekutuan Terbesar) dipakai saat membagi menjadi beberapa kelompok sama banyak. KPK (Kelipatan Persekutuan Terkecil) dipakai saat dua kegiatan berulang bertemu bersamaan.',
          'Cara cepat: untuk memecahkan masalah "paket terbanyak tanpa sisa", gunakan FPB. Untuk masalah "kapan bertemu lagi", gunakan KPK.',
        ],
        'FPB 24 dan 36: faktor persekutuan terbesarnya 12. Jadi paling banyak 12 paket, tiap paket 2 pensil dan 3 penghapus.',
        'Bagi jadi kelompok → FPB. Bertemu berulang → KPK.',
      ),
    ],
  },
  {
    kode: 'B04',
    nama: 'Serpihan Kue',
    materi: 'Pecahan senilai, perbandingan, dan pengurutan',
    elemen: 'Bilangan',
    peta: PETA_POSISI.B04 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'B04',
        'B04',
        'Pojok Serpihan Kue',
        'Bu Serpihan',
        'Pecahan senilai, perbandingan, dan pengurutan',
        'Bilangan',
        [
          'Pecahan senilai adalah pecahan berbeda yang bernilai sama. Contoh: 1/2 = 2/4 = 3/6. Cara menemukannya: kalikan atau bagi pembilang dan penyebut dengan bilangan yang sama.',
          'Untuk membandingkan atau mengurutkan pecahan, samakan dulu penyebutnya, lalu bandingkan pembilangnya.',
        ],
        'Urutkan 3/4, 2/3, 5/6. Samakan penyebut jadi 12 → 9/12, 8/12, 10/12. Urutannya 2/3 < 3/4 < 5/6.',
        'Samakan penyebut, lalu bandingkan pembilang.',
      ),
    ],
  },
  {
    kode: 'B05',
    nama: 'Adonan',
    materi: 'Operasi pecahan',
    elemen: 'Bilangan',
    peta: PETA_POSISI.B05 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'B05',
        'B05',
        'Balai Adonan',
        'Bu Adon',
        'Operasi pecahan',
        'Bilangan',
        [
          'Untuk menjumlah atau mengurang pecahan, samakan penyebutnya lebih dulu. Untuk mengalikan pecahan dengan bilangan asli, kalikan pembilangnya saja. Untuk membagi pecahan dengan bilangan asli, penyebut dikalikan bilangan itu.',
          'Sederhanakan hasil akhir bila masih bisa.',
        ],
        'Rina memakai 3/4 meter pita lalu 1/8 meter. 3/4 = 6/8. Total = 6/8 + 1/8 = 7/8 meter.',
        'Samakan penyebut sebelum menjumlah/mengurang.',
      ),
    ],
  },
  {
    kode: 'B06',
    nama: 'Label Harga',
    materi: 'Desimal, persen, dan konversi',
    elemen: 'Bilangan',
    peta: PETA_POSISI.B06 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'B06',
        'B06',
        'Pojok Label Harga',
        'Pak Diskon',
        'Desimal, persen, dan konversi',
        'Bilangan',
        [
          'Pecahan, desimal, dan persen adalah tiga cara menulis nilai yang sama. Contoh: 1/4 = 0,25 = 25%. Untuk mengubah pecahan ke persen, kalikan 100%. Untuk ke desimal, bagi pembilang dengan penyebut.',
          'Pada label harga, diskon biasanya dalam persen. Harga diskon = harga awal − (persen × harga awal).',
        ],
        'Diskon 25% dari Rp200.000 = 25/100 × 200.000 = 50.000. Harga bayar = 200.000 − 50.000 = 150.000.',
        'Persen = pecahan × 100%.',
      ),
    ],
  },

  // ---------------- PULAU BENTUK ----------------
  {
    kode: 'G01',
    nama: 'Bentuk',
    materi: 'Bangun datar dan ciri-cirinya',
    elemen: 'Geometri',
    peta: PETA_POSISI.G01 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'G01',
        'G01',
        'Balai Bentuk',
        'Bu Bentuk',
        'Bangun datar dan ciri-cirinya',
        'Geometri',
        [
          'Bangun datar punya ciri khas. Persegi: 4 sisi sama panjang, 4 sudut siku-siku. Persegi panjang: sisi berhadapan sama panjang, 4 sudut siku-siku. Segitiga: 3 sisi dan 3 sudut. Trapesium: punya sepasang sisi sejajar. Jajargenjang: dua pasang sisi sejajar, sudut tidak siku-siku.',
          'Mengenal ciri bangun membantu memilih rumus keliling dan luas yang tepat.',
        ],
        'Bangun dengan 4 sisi sama panjang dan 4 sudut siku-siku adalah persegi.',
        'Kenali jumlah sisi, panjang sisi, dan jenis sudutnya.',
      ),
    ],
  },
  {
    kode: 'G02',
    nama: 'Pagar Taman',
    materi: 'Keliling bangun datar',
    elemen: 'Geometri',
    peta: PETA_POSISI.G02 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'G02',
        'G02',
        'Pojok Pagar Taman',
        'Pak Pagar',
        'Keliling bangun datar',
        'Geometri',
        [
          'Keliling adalah jumlah panjang seluruh sisi yang mengelilingi bangun. Persegi: keliling = 4 × sisi. Persegi panjang: keliling = 2 × (panjang + lebar). Segitiga: keliling = jumlah ketiga sisinya.',
          'Keliling dipakai untuk menghitung panjang pagar atau jalan yang mengelilingi suatu area.',
        ],
        'Taman persegi panjang 12 m × 7 m. Keliling = 2 × (12 + 7) = 2 × 19 = 38 m.',
        'Keliling = jumlah semua sisi yang mengelilingi.',
      ),
    ],
  },
  {
    kode: 'G03',
    nama: 'Lantai',
    materi: 'Luas bangun datar',
    elemen: 'Geometri',
    peta: PETA_POSISI.G03 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'G03',
        'G03',
        'Balai Lantai',
        'Bu Keramik',
        'Luas bangun datar',
        'Geometri',
        [
          'Luas adalah besar daerah yang ditutupi bangun, diukur dalam satuan persegi (m², cm²). Rumus penting: persegi = sisi × sisi. Persegi panjang = panjang × lebar. Segitiga = 1/2 × alas × tinggi.',
          'Luas dipakai menghitung kebutuhan keramik, cat, atau kain penutup.',
        ],
        'Lantai 12 m × 7 m. Luas = 12 × 7 = 84 m².',
        'Luas persegi panjang = panjang × lebar.',
      ),
    ],
  },
  {
    kode: 'G04',
    nama: 'Kotak',
    materi: 'Bangun ruang dan tampak',
    elemen: 'Geometri',
    peta: PETA_POSISI.G04 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'G04',
        'G04',
        'Pojok Kotak',
        'Pak Kotak',
        'Bangun ruang dan tampak',
        'Geometri',
        [
          'Bangun ruang punya panjang, lebar, dan tinggi. Kubus: semua rusuk sama panjang, 6 sisi persegi. Balok: 6 sisi persegi panjang, sisi berhadapan sama. Tampak atas/bawah/samping menunjukkan bentuk saat dilihat dari arah tertentu.',
          'Mengenal ciri bangun ruang membantu memilih rumus volume yang tepat.',
        ],
        'Susunan kubus dilihat dari atas tampak sebagai barisan persegi.',
        'Kubus semua rusuk sama; balok tidak.',
      ),
    ],
  },
  {
    kode: 'G05',
    nama: 'Kapasitas',
    materi: 'Volume kubus dan balok',
    elemen: 'Geometri',
    peta: PETA_POSISI.G05 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'G05',
        'G05',
        'Gudang Kapasitas',
        'Bu Volume',
        'Volume kubus dan balok',
        'Geometri',
        [
          'Volume adalah besar ruang yang ditempati bangun, diukur dalam satuan kubik (cm³, m³). Rumus: kubus = rusuk × rusuk × rusuk. Balok = panjang × lebar × tinggi.',
          'Volume dipakai menghitung kapasitas kotak atau jumlah air yang bisa ditampung.',
        ],
        'Balok 10 × 5 × 4 cm. Volume = 10 × 5 × 4 = 200 cm³.',
        'Volume balok = p × l × t.',
      ),
    ],
  },
  {
    kode: 'G06',
    nama: 'Timbangan',
    materi: 'Konversi satuan panjang, massa, kapasitas, waktu',
    elemen: 'Geometri',
    peta: PETA_POSISI.G06 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'G06',
        'G06',
        'Balai Timbangan',
        'Pak Timbang',
        'Konversi satuan panjang, massa, kapasitas, waktu',
        'Geometri',
        [
          'Satuan panjang: km, hm, dam, m, dm, cm, mm. Tiap turun satu tingkat dikali 10, tiap naik satu tingkat dibagi 10. Satuan massa: kg, hg, dag, g, dg, cg, mg dengan aturan yang sama. Kapasitas: 1 liter = 1.000 ml. Waktu: 1 jam = 60 menit, 1 menit = 60 detik.',
          'Selalu periksa apakah jawaban diminta dalam satuan yang lebih kecil atau lebih besar.',
        ],
        '2,5 meter = 2,5 × 100 = 250 cm.',
        'Turun 1 tingkat ×10, naik 1 tingkat ÷10.',
      ),
    ],
  },
  {
    kode: 'G07',
    nama: 'Jalan Cepat',
    materi: 'Hubungan jarak, waktu, dan kecepatan',
    elemen: 'Geometri',
    peta: PETA_POSISI.G07 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'G07',
        'G07',
        'Pojok Jalan Cepat',
        'Pak Kilat',
        'Hubungan jarak, waktu, dan kecepatan',
        'Geometri',
        [
          'Kecepatan = jarak ÷ waktu. Jarak = kecepatan × waktu. Waktu = jarak ÷ kecepatan. Perhatikan satuan: jika kecepatan km/jam, waktu dalam jam, dan jarak dalam km.',
          'Ubah satuan dulu bila berbeda (mis. 30 menit = 0,5 jam).',
        ],
        'Jarak 120 km, kecepatan 60 km/jam. Waktu = 120 ÷ 60 = 2 jam.',
        'Waktu = jarak ÷ kecepatan.',
      ),
    ],
  },
  {
    kode: 'G08',
    nama: 'Sudut Pandang',
    materi: 'Sudut dan penaksiran',
    elemen: 'Geometri',
    peta: PETA_POSISI.G08 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'G08',
        'G08',
        'Balai Sudut Pandang',
        'Bu Sudut',
        'Sudut dan penaksiran',
        'Geometri',
        [
          'Sudut lancip kurang dari 90°, sudut siku-siku tepat 90°, sudut tumpul antara 90° dan 180°, sudut lurus 180°. Penaksiran berarti memperkirakan ukuran dengan masuk akal, misalnya panjang meja sekitar 1 meter, bukan 1 cm.',
          'Untuk membandingkan sudut, bandingkan dengan sudut siku-siku sebagai patokan.',
        ],
        'Sudut 45° adalah sudut lancip karena kurang dari 90°.',
        'Lancip < 90° < tumpul.',
      ),
    ],
  },

  // ---------------- PULAU CATATAN ----------------
  {
    kode: 'D01',
    nama: 'Papan Catatan',
    materi: 'Membaca tabel, diagram batang, piktogram',
    elemen: 'Data',
    peta: PETA_POSISI.D01 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'D01',
        'D01',
        'Papan Catatan',
        'Pak Catat',
        'Membaca tabel, diagram batang, piktogram',
        'Data',
        [
          'Data bisa disajikan dalam tabel (baris dan kolom), diagram batang (tinggi batang menunjukkan nilai), dan piktogram (gambar/simbol dengan nilai tertentu). Bacalah legenda piktogram dengan hati-hati karena satu gambar bisa berarti lebih dari satu.',
          'Untuk pertanyaan "tertinggi/terendah/selisih", temukan nilai tiap data lebih dulu, lalu bandingkan.',
        ],
        'Diagram batang penjualan: Senin 20, Selasa 35. Selisih = 35 − 20 = 15.',
        'Jika piktogram 1 gambar = 5, hitung jumlah gambar × 5.',
      ),
    ],
  },
  {
    kode: 'D02',
    nama: 'Kesimpulan',
    materi: 'Interpretasi data dan kesimpulan',
    elemen: 'Data',
    peta: PETA_POSISI.D02 as { x: number; y: number },
    balai: [
      balaiTunggal(
        'D02',
        'D02',
        'Pojok Kesimpulan',
        'Bu Simpul',
        'Interpretasi data dan kesimpulan',
        'Data',
        [
          'Setelah membaca data, tarik kesimpulan yang benar-benar didukung data. Jangan memilih pernyataan yang terdengar bagus tetapi tidak ada di data. Perhatikan juga perbedaan kata "lebih banyak", "sama", "selisih", dan "total".',
          'Untuk soal "pilih semua yang benar", periksa satu per satu pernyataan terhadap data.',
        ],
        'Ani 5, Budi 8, Cici 6, Dodi 8. Pernyataan benar: Budi dan Dodi sama; total 27.',
        'Buktikan tiap pernyataan dengan angka dari data.',
      ),
    ],
  },

  // ---------------- BABAK PUNCAK ----------------
  {
    kode: 'FINAL',
    nama: 'Pasar Ramai',
    materi: 'Tantangan puncak: campuran semua materi',
    elemen: 'Bilangan',
    peta: FINAL_POSISI,
    balai: [
      {
        kode: 'FINAL',
        noktah: 'FINAL',
        nama: 'Pasar Ramai',
        penjaga: 'Raja Diskon',
        materi: 'Tantangan puncak: campuran semua materi',
        elemen: 'Bilangan',
        urutan: 0,
        bacaan: [
          'Pasar Ramai adalah babak puncak yang menggabungkan seluruh materi dari semua noktah. Soal-soalnya menuntut penalaran, bukan sekadar menghitung.',
          'Bacalah soal dengan teliti, temukan apa yang ditanya, lalu selesaikan langkah demi langkah.',
        ],
        contoh: 'Soal campuran bisa menggabungkan diskon, luas, dan data sekaligus.',
        kunciJawab: 'Baca teliti, tentukan yang ditanya, kerjakan bertahap.',
        soalPerMain: 30,
      },
    ],
  },
];

/** Semua balai dari semua noktah (untuk pencarian id balai). */
export const BAHAI_TKA: BalaiMeta[] = NOKTAH.flatMap((n) => n.balai);

/** Definisi zona untuk tata letak dunia 3D & warna peta (nama disamarkan). */
export interface ZonaMeta {
  elemen: Elemen;
  nama: string;
  /** Warna bangunan zona (hex). */
  warna: number;
}

export const ZONA: ZonaMeta[] = [
  { elemen: 'Bilangan', nama: 'Perkampungan Tukang Hitung', warna: 0x2f9e6b },
  { elemen: 'Geometri', nama: 'Alun-Alun Bentuk', warna: 0x2563eb },
  { elemen: 'Data', nama: 'Lorong Catatan', warna: 0xd97706 },
];

export function getNoktah(kode: string): NoktahMeta | undefined {
  return NOKTAH.find((n) => n.kode === kode);
}

export function getBalai(kode: string): BalaiMeta | undefined {
  return BAHAI_TKA.find((b) => b.kode === kode);
}

/** Noktah (materi) tempat sebuah balai berada. */
export function noktahDariBalai(balaiKode: string): NoktahMeta | undefined {
  return NOKTAH.find((n) => n.balai.some((b) => b.kode === balaiKode));
}

export function noktahByElemen(elemen: Elemen): NoktahMeta[] {
  return NOKTAH.filter((n) => n.elemen === elemen);
}

/** 16 noktah materi (tanpa FINAL). */
export function noktahMateri(): NoktahMeta[] {
  return NOKTAH.filter((n) => n.kode !== 'FINAL');
}

/** Memvalidasi daftar noktah saat modul dimuat. */
export function validateNoktah(): NoktahMeta[] {
  const parsed = noktahListSchema.safeParse(NOKTAH);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('\n');
    throw new Error(`Daftar noktah tidak valid:\n${message}`);
  }
  return parsed.data as NoktahMeta[];
}
