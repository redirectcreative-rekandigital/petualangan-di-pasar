# Jurnal Penggunaan AI

Format mengikuti **Lampiran 1 Juknis Lomba**.

- **Nama peserta:** Rosyitania Yudha Astari, S.Pd
- **Satuan pendidikan:** SD Muhammadiyah Wonorejo Polokarto
- **Judul game:** Survival Sains
- **Jenjang/kelas sasaran:** Kelas 5 SD/MI
- **Platform AI yang digunakan:** Claude (Anthropic)
- **Tujuan pembelajaran:** memahami 9 bab IPA kelas 5 (cahaya, bunyi, ekosistem, rantai makanan, simbiosis, kelestarian lingkungan, magnet, listrik, bumi) melalui cerita bertahan hidup, latihan soal, dan umpan balik.

> Prinsip: AI dipakai sebagai alat bantu ide, naskah, kode, dan pengujian. Keputusan desain dan pemeriksaan materi ada pada penulis. Bagian bertanda **[diisi peserta]** perlu dilengkapi sendiri oleh penulis.

## 1. Catatan Pengembangan

| Tahap | Prompt/perintah atau tindakan | Hasil dari AI | Pemeriksaan/revisi oleh peserta |
| --- | --- | --- | --- |
| Ide dan konsep | "Cek project di folder ini, saya ingin diskusi." Lalu: "Saya ingin membuat storytelling dengan konsep game MMO RPG yang bisa dimainkan single dan multiple dan hasil analisa dipantau guru. Awalan karakter berada di dalam balai pertama; setiap balai ada misi membaca materi dan mengerjakan soal; setiap materi punya halaman tersendiri untuk storytelling; selalu ada percakapan; di setiap balai ada jalan menuju peta." | Analisis versi lama (Kitab Sembilan Penjaga) dan usulan rancangan: pola misi 6 tahap, Halaman Cerita, kuis dalam percakapan, Final, dasbor guru. Dokumen rancangan (GDD). | Menetapkan judul baru **Survival Sains**; memilih urutan balai **mengikuti bab buku**; menyetujui **9 penjaga**; memilih **TTS**; memilih nama tokoh **bernuansa Nusantara**; menetapkan mode kelas: siswa join dengan token lalu menjelajah sendiri-sendiri, guru memantau; menetapkan batas lulus Final **70%**. |
| Materi/soal | Bank soal IPA kelas 5 (90 soal balai + 30 soal Final) yang sudah ada dipakai ulang. AI diminta mengemas materi menjadi cerita bergambar 4 adegan per materi. | 44 adegan Halaman Cerita dengan narasi dan interaksi (kelompokkan, urutkan, pilih); kalimat pembuka soal; petunjuk yang merujuk adegan. | [diisi peserta] Memeriksa ketepatan konsep tiap adegan dan kunci jawaban dengan buku IPA kelas 5. |
| Desain atau aset | "Tambahkan nilai Islam dan Muhammadiyah." | Salam, basmalah, hamdalah, pesan hikmah per balai (tadabbur alam, khalifah, hemat, tolong-menolong, ikhtiar & tawakal); ilustrasi SVG; cutscene. | Menyetujui nilai-nilai tersebut. [diisi peserta] Memeriksa kesesuaian redaksi islami. |
| Pembuatan game/kode | Perombakan alur sesuai GDD. | Modul baru: naskah cerita, Halaman Cerita, percakapan bergaya visual novel, kuis dalam percakapan, TTS, dunia balai 3D dengan 5 titik, peta berkabut, Final 4 lantai, dasbor guru 3 tab, ekspor CSV jawaban. | [diisi peserta] Mencoba game di HP sekolah dan mencatat perbaikan. |
| Perbaikan dan pengujian | Uji otomatis & uji di browser ukuran HP. | 88 uji unit (Vitest), uji asap satu balai penuh, uji multiplayer guru + 2 siswa, uji Final sampai sertifikat. | Meminta agar pengujian tidak memakai port 5774 (dipakai Dapodik di komputer sekolah). [diisi peserta] Uji coba dengan siswa. |

## 2. Kendala yang ditemukan dan cara mengatasinya

1. **Alur versi lama kurang terarah:** semua balai bebas dipilih, materi hanya dibaca sebagai teks, dan soal terpisah dari cerita. *Solusi:* balai dibuka berurutan sesuai bab, setiap balai memakai pola misi 6 tahap, materi dikemas sebagai Halaman Cerita, dan soal dibawakan Penjaga dalam percakapan.
2. **Judul "Sembilan Penjaga" tidak cocok dengan 11 balai.** *Solusi:* tetap 9 penjaga sesuai 9 bab; Ibu Pertiwi menjaga tiga halaman Bab 9.
3. **Petunjuk soal lama langsung menyebut jawabannya.** *Solusi:* petunjuk diganti rujukan ke adegan cerita yang relevan, dicari otomatis dari kata kunci soal.
4. **Peta 3D di HP tampak pudar dan kecil.** *Solusi:* kabut dan jarak kamera disetel ulang untuk layar potret; balai terkunci ditutupi awan kabut.
5. **Tumpukan tombol HUD** (tombol peta tertimpa angka). *Solusi:* HUD baru dengan baris misi di atas dan tas survival.
6. **Data guru hanya benar/salah.** *Solusi:* setiap jawaban mencatat urutan pilihan dan jumlah percobaan, dan lama membaca cerita juga dicatat, sehingga guru bisa melihat miskonsepsi.
7. **Batas pengumpulan.** Juknis menulis 10 November 2026; panitia memberi informasi pengunduran ke 13 November 2026.

## 3. Bagian yang dikembangkan atau diperbaiki secara mandiri

- Penetapan konsep, judul, urutan materi, nama tokoh, aturan lulus, dan cara kerja mode kelas (lihat tabel tahap Ide dan konsep).
- Bank soal dan materi asal dari versi sebelumnya.
- [diisi peserta] Pemeriksaan materi, kunci jawaban, dan redaksi; uji coba di kelas; surat pernyataan orisinalitas.

## Verifikasi kunci jawaban

Skrip `npm run verify:bank` memeriksa seluruh 120 soal: validasi skema, kunci ada tepat satu kali di opsi, tidak ada id ganda, setiap balai minimal 3 soal, dan Final tepat 30 soal. Uji `tests/bank.test.ts` memeriksa contoh kunci secara eksplisit.

## Catatan etika

- Tidak ada nama atau data murid yang dimasukkan ke dalam prompt AI.
- Tidak ada gambar, model, atau suara pihak ketiga; semua aset dibuat dari kode.
- Mode kelas hanya mengirim nama panggilan, posisi, dan ringkasan belajar ke server kelas selama sesi berlangsung.
