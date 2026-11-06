# Jurnal Penggunaan AI

Dokumen ini mencatat penggunaan kecerdasan artifisial (AI) selama pengembangan
**Petualangan di Pasar**, sesuai Lampiran 1 juknis lomba.

> Prinsip: AI dipakai sebagai alat bantu ide, rancangan, dan debug. **Semua kunci
> jawaban dihitung ulang dan diverifikasi manual**, dan seluruh keputusan desain
> akhir ada pada penulis.

## Ringkasan Pemanfaatan

| Tahap | Peran AI | Peran Penulis |
| --- | --- | --- |
| Ide & konsep | Menawarkan variasi tema pasar dan mekanik penjelajahan | Menetapkan struktur dua lapis (peta noktah + dunia balai) sesuai peta 16 materi TKA dan tujuan pembelajaran |
| Soal | Membantu menyusun draf soal, termasuk pilihan ganda kompleks dan HOTS | Memeriksa konteks, kesulitan, dan **menghitung ulang semua kunci** |
| Kode | Membantu menulis kerangka TypeScript, Three.js, dan CSS | Meninjau arsitektur, menguji di perangkat, dan memperbaiki bug |
| Desain | Menyarankan palet warna per zona dan tata letak | Menetapkan tampilan akhir dan keterbacaan |
| Dokumentasi | Membantu merapikan uraian | Menyesuaikan dengan juknis lomba |

## Contoh Prompt Penting

1. **Engine soal:** "Rancang mesin sesi balai TypeScript yang mendukung tipe soal pilihan
   ganda, pilihan ganda kompleks (pilih semua benar), isian angka, dan benar/salah +
   alasan, dengan aturan 3 kesempatan per soal dan habis 3× berarti soal gagal."
   - *Revisi penulis:* memisahkan pemeriksaan tahap alasan pada soal benar/salah agar
     kesempatan tidak berkurang dua kali dalam satu soal.

2. **Peta & dunia 3D:** "Buatlah peta besar 3D bergaya peta harta karun dengan 16 noktah
   yang dapat diklik, lalu dunia kecil 3D tiap noktah berisi balai dengan papan nama, lencana
   kode TKA, NPC penjaga, dan lantai tiga zona."
   - *Revisi penulis:* menata ulang posisi noktah pada peta, menyamarkan nama materi agar
     ramah anak, dan menyetel titik pandang kamera agar seluruh peta masuk di layar potret.

3. **Alur pembuka & transisi:** "Rancang alur cover → pilih karakter laki-laki/perempuan →
   isi nama panggilan → loading singkat → peta, dan tampilkan spinner singkat setiap pindah
   peta/balai."
   - *Revisi penulis:* memangkas durasi loading, menambah tip matematika acak, dan memastikan
     progres tersimpan di setiap perpindahan.

4. **Soal pilihan ganda kompleks:** "Buatlah soal yang meminta siswa memilih semua
   pernyataan benar berdasarkan data, dengan minimal satu pengecoh."
   - *Revisi penulis:* memastikan tiap pengecoh benar-benar salah secara matematis lewat
     perhitungan ulang, dan memisahkan kunci bertipe array dari kunci teks biasa.

5. **Bank soal TKA:** "Susun 48 soal balai (3 per balai) dan 30 soal babak puncak dengan
   metadata kode materi, indikator, level kognitif, dan tingkat kesulitan."
   - *Revisi penulis:* menandai tiap soal dengan kode materi TKA yang tepat dan menulis
     ulang beberapa soal agar sesuai tingkat kesulitan yang diniatkan.

## Verifikasi Manual Kunci Jawaban

Semua **78 soal** (48 soal balai + 30 soal Pasar Ramai) diverifikasi manual. Sebagai bukti,
tersedia uji otomatis pada `tests/bank.test.ts` yang **menghitung ulang** kunci dari data
soal, misalnya:

- B02-01: (2 × 18.000) + (3 × 12.000) = **72.000**.
- B03-01: FPB dari 24 dan 36 = **12**.
- B06-02: 25% × 200.000 = 50.000; 200.000 − 50.000 = **150.000**.
- G02-01: 2 × (12 + 7) = **38 m**.
- G03-01: 12 × 7 = **84 m²**.
- G05-01: 10 × 5 × 4 = **200 cm³**.
- G07-01: 120 : 60 = **2 jam**.
- D01-02: 25 + 30 + 20 + 35 + 30 = **140**.
- FINAL-17: (15 × 24) − (120 : 4) = 360 − 30 = **330**.
- FINAL-22: (54.000 : 3) × 5 = 18.000 × 5 = **90.000**.

Selain itu, skrip `npm run verify:bank` menyilang-cek seluruh bank: validasi skema,
kunci pilihan ganda tunggal, kunci pilihan ganda kompleks ada di dalam opsi, kunci angka
berupa number, tidak ada id duplikat, dan tepat 3 soal tiap balai.

## Bug yang Ditemukan dan Diperbaiki (dengan bantuan uji)

1. `locked` (pengunci input) tidak direset saat pindah soal, sehingga pemain tidak bisa
   menjawab soal berikutnya. **Diperbaiki** dan diuji lewat `tests/playthrough.test.ts`.
2. Hasil balai dapat diproses berkali-kali saat layar di-render ulang. **Diperbaiki**
   dengan penanda `finished`.
3. Jarak zona interaksi lebih kecil daripada kotak collision balai, sehingga tombol A
   tidak muncul. **Diperbaiki** dengan menyeimbangkan ukuran keduanya.
4. Progres tersimpan tidak diterapkan ke dunia 3D karena sinkronisasi dijalankan sebelum
   sesi dunia dibuat, sehingga status balai tidak sesuai. **Diperbaiki** dengan mengurutkan
   ulang inisialisasi.
5. Setelah menuntaskan balai, pemain terlempar keluar dari dunia 3D ke layar penuh,
   sehingga tidak bisa menjelajah lagi. **Diperbaiki** dengan menampilkan bacaan, soal, dan
   hasil sebagai panel di atas dunia 3D (diuji lewat `scripts/smoke.mjs`).
6. Satu soal babak puncak bertipe angka tetapi kuncinya berupa pecahan (`3/5`), sehingga
   validasi gagal. **Diperbaiki** dengan mengubah tipe soal menjadi pilihan ganda
   (ditemukan lewat `npm run verify:bank`).
7. Tombol pilihan ganda kompleks dengan teks yang saling mengandung (mis. "persegi" dan
   "persegi panjang") membuat pencocokan kunci meleset. **Diperbaiki** dengan pencocokan
   teks eksak pada komponen dan uji.
8. Pilihan mode bermain (sendiri/multiplayer) tereset setiap kali layar digambar ulang,
   sehingga token tidak pernah tervalidasi. **Diperbaiki** dengan mengangkat variabel mode
   dan draf nama/token ke lingkup layar pembuka.
9. Dasbor guru menghitung total soal dari seluruh balai, termasuk balai yang belum
   dikerjakan (default 3 soal), sehingga persentase kelas tampak rendah palsu.
   **Diperbaiki** dengan menghitung dari catatan jawaban (`answers`) sebagai sumber
   otoritatif.
10. Saat pengembangan (`npm run dev`), Mode Guru mengirim `POST /api/sesi` ke port Vite
   (:5173) yang tidak punya route API, sehingga muncul **404**. **Diperbaiki** dengan
   mendeteksi halaman yang disajikan Vite dan mengarahkan API/WebSocket ke server
   multiplayer (:8787); `npm run dev` kini sekaligus menyalakan kedua proses.
11. Karakter terasa "kurang smooth dan nyata" karena material Lambert tanpa bayangan.
   **Diperbaiki** dengan material PBR, pencahayaan berlapis, bayangan lembut, dan geometri
   lebih halus. Sekaligus ditambahkan **pilihan warna baju/celana/hijab** setelah memilih
   karakter (lihat bagian berikut).

## Fitur Mode Multiplayer & Mode Guru

Diminta tambahan agar satu kelas dapat bermain bersama dan guru dapat memantau. Rancangan
yang dipilih **server Node ringan** (`http` + `ws`), bukan layanan pihak ketiga:

- Guru menekan **Mode Guru** → membuat ruang kelas → memperoleh **token 4 digit acak**.
- Siswa memilih **Multiplayer Kelas** dan mengetik token; siswa di noktah yang sama saling
  melihat karakter 3D, nama, dan dapat menyapa dengan emoji dari daftar aman.
- Dasbor guru memantau noktah, bintang, persen benar, dan soal salah tiap siswa secara
  langsung, dengan **ekspor CSV**.
- Tanpa server, game tetap berjalan penuh sebagai **singleplayer** (server opsional).

Pengujian: `tests/net.test.ts` (ringkasan progres & token), `tests/screens.test.ts`
(alur pilih mode + validasi token), `scripts/smoke-multiplayer.mjs` (guru + 2 siswa
saling melihat dan tampil di dasbor).

## Peningkatan Visual & Kustomisasi Pakaian

Umpan balik pengguna: tampilan 3D terasa **kurang halus dan kurang "nyata"**, serta
diinginkan **pilihan warna** setelah memilih karakter. Perbaikan yang dilakukan:

1. **Material diubah dari Lambert ke MeshStandard (PBR)** untuk karakter, tanah, dan
   plaza. Lambert tidak memantulkan cahaya dari arah tertentu sehingga bentuk terlihat
   datar; PBR memberi gradasi terang-gelap yang membuat volume tubuh terbaca.
2. **Pencahayaan ditata ulang**: ambient dikurangi (x0,72) agar bayangan berperan, matahari
   diperkuat (2,1) dan memberi bayangan, ditambah **cahaya isi** dari arah berlawanan agar
   sisi gelap tidak pekat, serta hemisphere dipertegas.
3. **Bayangan lembut (PCFSoft)**: karakter, kios, dan penjaga kini melempar bayangan ke
   tanah; peta bayangan 1024 dengan `bias`/`normalBias` dihaluskan agar tidak bergaris.
   Bayangan hanya aktif bila kualitas cukup tinggi (`pixelRatioCap > 1.2`) supaya HP kelas
   bawah tetap lancar; status ini diekspos lewat `SceneBundle.pakaiBayangan`.
4. **Geometri dihaluskan**: segmen silinder/kapsul dinaikkan (12A-*18, 8A-*14), bola kepala
   24x20, mata diberi **sklera putih + pupil** agar ekspresi lebih hidup. Gamis perempuan
   dipecah menjadi **rok** (bawahan) dan **atasan** agar warna bawah dapat dipilih terpisah.
5. **Kustomisasi warna**: layar baru **"Atur Pakaian"** antara pemilihan karakter dan nama.
   Tersedia **3 warna baju**, **3 warna celana/gamis**, dan **3 warna hijab** (hanya tampil
   untuk karakter perempuan), dengan pratinjau 3D yang langsung berubah. Pilihan disimpan di
   `Progress` (`warnaBaju`, `warnaBawahan`, `warnaHijab`), dipakai di peta besar, dunia noktah,
   dan **dikirim ke server** agar teman di multiplayer melihat pakaian yang sama.

Pengujian: `tests/screens.test.ts` (alur 4 langkah, penyimpanan warna perempuan, pria tanpa
baris hijab), `scripts/smoke.mjs` (memilih warna di browser sungguhan), dan
`scripts/smoke-multiplayer.mjs` (warna ikut tersinkron).

## Catatan Etika

- Tidak pernah memasukkan nama atau data murid ke dalam prompt.
- Tidak memakai aset gambar/model bersangkutan lisensi tak jelas; semua bentuk dibuat
  sendiri dari kode.
- Mode multiplayer hanya mengirim nama panggilan, karakter, posisi, dan ringkasan progres
  ke server kelas selama sesi berlangsung (disimpan di memori, tidak dibagikan). Guru
  dianjurkan meminta siswa memakai nama panggilan atau inisial.
