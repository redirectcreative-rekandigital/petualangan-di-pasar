# Deskripsi Karya

## Identitas

- **Judul:** Survival Sains
- **Pembuat:** Rosyitania Yudha Astari, S.Pd
- **Sekolah:** SD Muhammadiyah Wonorejo Polokarto
- **Jenjang/kelas sasaran:** Kelas 5 SD/MI
- **Mata pelajaran:** IPAS (Bab 1 sampai Bab 9)
- **Platform AI:** Claude (Anthropic)
- **Link Siswa (game):** <https://sains-edu.sdmuhwonorejo.com/>
- **Link Guru (dasbor):** <https://sains-edu.sdmuhwonorejo.com/modeguru>
- **Teknologi:** game web (HTML, CSS, TypeScript), Three.js untuk 3D, SVG untuk ilustrasi, Web Speech API untuk narasi suara, Node.js + WebSocket untuk mode kelas, PWA

## Cara Juri Melihat Mode Guru

1. Buka **Link Guru** di laptop, lalu buat sesi kelas. Token 4 digit akan muncul.
2. Buka **Link Siswa** di HP, pilih mode kelas, lalu masukkan token tersebut.
3. Mainkan satu balai. Dasbor guru langsung terisi: hasil siswa, soal tersulit, miskonsepsi, dan ekspor Excel.

Mode Guru juga bisa dibuka dari game: popup info awal (tautan "buka Mode Guru") atau menu ☰ Lainnya → Tentang Game → **Buka Mode Guru**.

## Ringkasan

Survival Sains adalah game petualangan 3D bergaya RPG. Siswa berperan sebagai penjelajah cilik yang terdampar di Pulau Wonorejo setelah badai. Untuk pulang, siswa harus menyalakan Mercusuar Tua di puncak pulau.

Sembilan Penjaga pulau menyimpan bekal ilmu dan alat survival. Setiap alat hanya diberikan setelah siswa memahami materinya: membaca Halaman Cerita lalu lulus tantangan soal. Materi IPAS dipakai langsung untuk bertahan hidup, sehingga siswa melihat gunanya belajar.

## Tujuan Pembelajaran

Setelah bermain, siswa mampu:

1. Menjelaskan sifat cahaya, bagian mata, dan cara menjaga kesehatan mata (Bab 1).
2. Menjelaskan sifat bunyi, bagian telinga, dan cara menjaga pendengaran (Bab 2).
3. Membedakan komponen biotik dan abiotik serta jenis ekosistem (Bab 3).
4. Menyusun rantai makanan dan menjelaskan perpindahan energi (Bab 4).
5. Membedakan mutualisme, komensalisme, dan parasitisme (Bab 5).
6. Menyebutkan penyebab kerusakan lingkungan dan cara menjaga kelestariannya (Bab 6).
7. Menjelaskan sifat magnet, cara membuat magnet, dan pemanfaatannya (Bab 7).
8. Menjelaskan rangkaian listrik seri dan paralel, konduktor-isolator, dan cara menghemat listrik (Bab 8).
9. Menjelaskan litosfer, hidrosfer, lapisan atmosfer, siklus air, serta cara aman menghadapi gempa dan tsunami (Bab 9).

## Materi

| No | Bab | Tempat di pulau | Penjaga | Alat survival |
| --- | --- | --- | --- | --- |
| 1 | Bab 1 Cahaya dan Mata | Goa Sinar | Mbok Sinar | Cermin Sinyal |
| 2 | Bab 2 Bunyi dan Pendengaran | Lembah Gema | Ki Gaung | Kentongan |
| 3 | Bab 3 Ekosistem | Pondok Tepi Hutan | Nini Rimba | Buku Catatan Penyintas |
| 4 | Bab 4 Rantai Makanan | Ladang dan Lumbung | Ki Lumbung | Keranjang Bekal |
| 5 | Bab 5 Simbiosis | Taman Bunga | Nyai Kembang | Kelambu Hutan |
| 6 | Bab 6 Kelestarian Lingkungan | Persemaian | Eyang Wana | Bibit Pohon |
| 7 | Bab 7 Magnet | Bukit Batu Besi | Empu Wesi | Kompas Buatan |
| 8 | Bab 8 Listrik | Sungai Kincir | Mbah Kilat | Dinamo Mercusuar |
| 9 | Bab 9a Litosfer | Tebing Berlapis | Ibu Pertiwi | Tali Pendaki |
| 10 | Bab 9b Hidrosfer dan Atmosfer | Mata Air | Ibu Pertiwi | Botol Air Bersih |
| 11 | Bab 9c Siklus Air dan Bencana | Pos Siaga | Ibu Pertiwi | Peta Jalur Aman |
| Final | Semua bab | Mercusuar Tua | Kesembilan penjaga | Lampu mercusuar menyala |

Bank soal: 90 soal balai dan 30 soal Final, semua pilihan ganda A–D dengan metadata (kode materi, indikator, level kognitif, tingkat kesulitan).

## Cara Bermain

1. Tekan **Mulai Petualangan**, tonton cutscene badai, lalu isi Kartu Anggota Ekspedisi (karakter, warna pakaian, nama panggilan, mode Sendiri atau Kelas).
2. Kamu terbangun di **Goa Sinar**. Mbok Sinar menyapa dan memberi misi pertama. Balai ini sekaligus tutorial.
3. Berjalan dengan joystick (HP) atau W A S D (laptop). Ikuti **panah kuning** ke tujuan berikutnya, lalu tekan tombol **A**.
4. Di setiap balai: terima **misi** dari Penjaga → baca **Halaman Cerita** bersama Cantrik → jawab **3 soal** di Tempat Uji → terima **alat survival** → lewati **gerbang** ke peta.
5. Tiap soal punya **3 hati ❤️** (nyawa); satu hati hilang tiap jawaban salah. Bila salah, Penjaga memberi petunjuk dan tombol **Ingat cerita** untuk membuka adegan yang relevan.
6. Setelah 11 alat terkumpul, naiki **Mercusuar Tua**: 30 soal dalam 4 lantai. Lulus bila minimal 21 benar, lalu sertifikat "Penyintas Sains" terbuka.

## Sistem Permainan

- **Urutan:** balai dibuka berurutan sesuai bab buku, di mode sendiri maupun mode kelas.
- **Tempat Uji** terbuka setelah Halaman Cerita selesai dibaca.
- **Bintang:** 3 benar = 3 bintang, 2 = 2, 1 = 1. Minimal 1 bintang untuk lulus balai. Balai boleh diulang untuk menambah bintang.
- **Final:** lulus bila ≥ 21 dari 30 (70%). Bila belum lulus, cukup ulangi lantai yang skornya di bawah 70%.
- **Umpan balik:** setiap jawaban ditanggapi Penjaga. Jawaban benar disertai penjelasan dari cerita, jawaban salah diberi petunjuk.

## Nilai Karakter, Keislaman, dan Kemuhammadiyahan

- Salam di setiap pertemuan, basmalah sebelum tantangan, hamdalah setelah berhasil.
- Alam dipandang sebagai tanda kebesaran Allah yang diajak untuk diamati (tadabbur alam).
- Manusia sebagai khalifah penjaga bumi (Bab 6 dan pesan hikmah tiap balai).
- Hemat air dan listrik sebagai wujud syukur; tolong-menolong seperti lebah dan bunga; ikhtiar dengan ilmu lalu bertawakal saat bencana.
- Semangat berkemajuan: ilmu dipakai untuk menyelamatkan diri dan menolong sesama.

## Mode Kelas dan Analisis Guru

Guru membuat sesi di **Mode Guru** dan membagikan token 4 digit. Siswa bergabung dengan token, lalu menjelajah sesuai kecepatan masing-masing. Siswa di balai yang sama saling melihat dan bisa menyapa dengan emoji. Tidak ada obrolan bebas dan tidak ada papan peringkat.

Dasbor guru memperbarui data setiap 3 detik:

- **Kelas:** matriks siswa × 11 balai (belum mulai, menerima misi, sudah membaca, lulus, perlu bantuan) dan persen benar kelas per bab.
- **Soal:** soal yang paling jarang dijawab benar pada percobaan pertama, beserta pilihan salah yang paling sering dipilih (miskonsepsi).
- **Siswa:** detail per bab (status, bintang, lama membaca, jumlah benar) dan rekomendasi tindak lanjut.
- Ekspor **Excel** (sheet Kelas dan Jawaban) untuk analisis lanjutan.

## Manfaat

- **Bagi siswa:** belajar IPAS lewat cerita yang runtut. Materi dibacakan dengan suara, dilengkapi gambar bergerak dan latihan langsung. Kesalahan menjadi bagian dari belajar.
- **Bagi guru:** dapat memantau ketuntasan per bab dan per siswa, menemukan miskonsepsi kelas, dan menyiapkan bimbingan ulang yang tepat sasaran.
- **Bagi sekolah:** media yang berjalan di HP siswa, bisa dipasang offline, dan tidak membutuhkan biaya lisensi.

## Pemanfaatan AI

AI (Claude) dipakai untuk merancang alur cerita, menyusun naskah dialog, membuat kode, dan menguji game. Semua keputusan desain dan pemeriksaan materi dilakukan penulis. Rincian ada di `docs/jurnal-ai.md`.
