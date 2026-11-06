# Deskripsi Karya

## Identitas

- **Judul:** Petualangan di Pasar
- **Pembuat:** Rosyitania Yudha Astari, S.Pd
- **Sekolah:** Guru SD Muhammadiyah Wonorejo Polokarto
- **Jenjang sasaran:** Kelas 6 SD/MI
- **Konteks:** Persiapan Tes Kemampuan Akademik (TKA) Matematika SD/MI
- **Kategori:** Game edukasi berbasis AI

## Ringkasan

Petualangan di Pasar adalah game web 3D **dua lapis** berbasis penjelajahan:

1. **Peta besar 3D** bergaya peta harta karun berisi **16 noktah** (titik materi), satu
   noktah untuk tiap kode materi TKA Matematika SD/MI. Pemain cukup **mengetuk noktah**
   untuk memasukinya.
2. **Dunia noktah 3D**: di dalam tiap noktah pemain **berjalan dengan kamera orang
   ketiga** menuju **balai** (rumah sub-materi), lalu membuka bacaan dan soal.

Noktah dikelompokkan menjadi **tiga zona**:

| Zona | Elemen | Noktah |
| --- | --- | --- |
| Perkampungan Tukang Hitung | Bilangan | B01–B06 (6 noktah) |
| Alun-Alun Bentuk | Geometri | G01–G08 (8 noktah) |
| Lorong Catatan | Data | D01–D02 (2 noktah) |

Setiap balai dijaga seorang **NPC penjaga**, punya **papan nama bergaya game**, **lencana
kode TKA**, dan **bacaan materi satu halaman ringkas** yang boleh dibaca santai. Di tiap
balai siswa berlatih **3 soal**. Semua noktah **bebas dipilih sejak awal**. Setelah pemain
**pernah mengunjungi seluruh 16 noktah** (aturan A(ii), tanpa syarat bintang), terbuka babak
puncak **"Pasar Ramai"**: **30 soal** campuran pilihan ganda, pilihan ganda kompleks, dan
penalaran HOTS yang dijaga **Raja Diskon**. Lulus Pasar Ramai membuka **sertifikat digital**.

## Tujuan Pembelajaran

Setelah bermain, siswa mampu:

1. Memahami nilai tempat, perbandingan, dan urutan bilangan cacah (B01).
2. Menghitung total belanja dan kembalian dengan operasi bilangan cacah/desimal (B02).
3. Menyelesaikan masalah FPB dan KPK dalam konteks berbagi adil dan jadwal berulang (B03).
4. Menyederhanakan, membandingkan, dan mengurutkan pecahan (B04–B05).
5. Menghitung persen, diskon, dan konversi pecahan–desimal–persen (B06).
6. Mengenali ciri bangun datar dan bangun ruang (G01, G04).
7. Menghitung keliling dan luas bangun datar (G02–G03).
8. Menghitung volume bangun ruang (G05).
9. Mengonversi satuan panjang, berat, dan kapasitas (G06).
10. Menyelesaikan soal jarak, waktu, dan kecepatan (G07).
11. Mengidentifikasi jenis sudut dan menaksir ukuran (G08).
12. Membaca tabel, diagram batang, dan piktogram (D01).
13. Menarik dan menilai kesimpulan yang sesuai dengan data (D02).
14. Menalar dan membandingkan beberapa pernyataan berbasis data (babak Pasar Ramai).

## Nilai Karakter

Tema **amanah dan jujur dalam berdagang** (timbangan tidak dikurangi, kembalian dihitung
benar) muncul sebagai dialog singkat tiap penjaga balai, selaras dengan nilai kejujuran
yang diajarkan Muhammadiyah.

## Fitur Unggulan

1. **Peta besar 3D yang dapat diklik** (bergaya peta harta karun) menuju dunia noktah 3D
   yang dapat dijelajahi dengan kamera orang ketiga, dibangun dari bentuk dasar (tanpa
   model unduhan) sehingga ringan dan bebas lisensi.
2. **16 noktah materi TKA + babak puncak** yang memetakan seluruh kode materi TKA SD/MI.
3. **Bacaan materi 1 halaman** di tiap balai sebagai pengantar sebelum berlatih.
4. **Metadata TKA pada setiap soal** (kode materi, indikator, level kognitif, tingkat
   kesulitan) untuk memudahkan pemetaan capaian.
5. **Soal pilihan ganda kompleks** (pilih semua jawaban benar) selain pilihan ganda,
   isian angka, dan penalaran.
6. **Papan data 3D**: tabel dan diagram batang dibuat otomatis dari data soal.
7. **Babak Pasar Ramai 30 soal** dengan alur ganda, termasuk soal penalaran (HOTS).
8. **Alur pembuka ramah anak**: cover → pilih karakter (laki-laki/perempuan) → isi nama
   panggilan → loading singkat → peta.
9. **Sertifikat digital** berisi nama pemain, total bintang, akurasi, dan pesan karakter.
10. **Layar darurat ramah** hanya bila perangkat benar-benar tanpa dukungan WebGL.

## Sistem Permainan

- **Struktur:** 2 lapis — peta besar (16 noktah + Pasar Ramai) → dunia noktah (balai).
- **Soal per balai:** 3 soal (babak Pasar Ramai: 30 soal).
- **Kesempatan menjawab:** 3 kali per soal. Habis 3× salah berarti soal dianggap gagal
  dan pemain lanjut ke soal berikutnya.
- **Bintang:** 3 benar = ⭐⭐⭐, 2 benar = ⭐⭐, 1 benar = ⭐. Minimal 1 bintang untuk lulus.
- **Kunci progres:** semua noktah bebas dipilih sejak awal (tidak ada penguncian progresif).
- **Babak Puncak:** Pasar Ramai terbuka setelah pemain **pernah mengunjungi seluruh 16
  noktah** (aturan A(ii), tanpa syarat bintang). Gagal berarti mengulang dari awal.
- **Koin:** +10 untuk tiap jawaban benar.
- **Sertifikat:** terbuka setelah lulus Pasar Ramai.
- **Progres:** tersimpan di perangkat (localStorage), bisa direset.

## Pemanfaatan AI

AI dipakai untuk membantu ide soal, kerangka kode, dan proses debug. Seluruh kunci
jawaban diverifikasi manual dan diuji otomatis. Rincian ada di `docs/jurnal-ai.md`.

## Teknologi

TypeScript 5, Vite 7, Three.js, zod, Pointer Events, SVG/kanvas, Web Audio API,
vite-plugin-pwa, Vitest. Tanpa server maupun basis data; hosting statis HTTPS.

## Petunjuk Bermain Singkat

1. Tekan **Mulai Petualangan**, pilih karakter, lalu isi nama panggilan.
2. Di **peta 3D**, ketuk salah satu dari **16 noktah** untuk masuk.
3. Di dalam noktah, berjalan dengan joystick (HP) atau WASD (laptop); putar kamera dengan menggeser.
4. Dekati balai yang ada tanda seru, tekan **A** (atau E) untuk membuka balai.
5. Baca materi singkat (opsional), lalu jawab 3 soal dengan 3 kesempatan tiap soal.
6. Kunjungi seluruh 16 noktah, lalu taklukkan **Pasar Ramai** dan raih sertifikat.
