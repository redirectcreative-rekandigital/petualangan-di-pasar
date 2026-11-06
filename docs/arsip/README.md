# Arsip Dokumen Perencanaan

Folder ini menyimpan dokumen perencanaan **awal** yang sudah tidak lagi menggambarkan
karya yang dikirim. Keduanya disimpan sebagai catatan sejarah pengembangan, bukan acuan.

| Berkas | Keterangan |
| --- | --- |
| `prd-game-matematika-toko.md` | PRD awal "Misi Toko Pintar" (versi 2D pertama, 5 level, bos Raja Diskon). |
| `MisiTokoPintar.md` | PRD v2 "Pasar Amanah 3D" (4 kios, Mode Cadangan 2D, gerbang bos). |

## Bedanya dengan karya akhir

Karya yang dikirim berjudul **"Petualangan di Pasar"** dan memakai struktur:

- **16 balai** yang memetakan seluruh kode materi TKA Matematika SD/MI (B01–B06,
  G01–G08, D01–D02), dikelompokkan dalam **3 zona** (Bilangan, Geometri, Data).
- **Tanpa Mode 2D** — seluruh permainan 3D, dengan satu layar darurat ramah bila WebGL
  benar-benar tidak tersedia.
- Aturan **3 soal per balai** dengan **3 kesempatan menjawab per soal**.
- Babak puncak **"Pasar Ramai" (30 soal)** terbuka setelah semua balai selesai; Raja
  Diskon menjadi tokoh yang menantang siswa di babak ini (bukan bos terpisah).

Rujukan struktur materi yang dipakai: `materi_tka_matematika_sd_mi.md` (di akar proyek).
