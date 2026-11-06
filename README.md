# Survival Sains

Game petualangan IPA 3D untuk kelas 5 SD/MI, disiapkan untuk **Lomba Pembuatan Game Edukasi
Berbasis AI - Guru Muhammadiyah se-Cabang Blimbing 2026**.

- **Pembuat:** Rosyitania Yudha Astari, S.Pd
- **Sekolah:** SD Muhammadiyah Wonorejo Polokarto
- **Jenjang:** Kelas 5 SD/MI
- **Mapel:** IPA (9 bab: cahaya, bunyi, ekosistem, rantai makanan, simbiosis, kelestarian, magnet, listrik, bumi)
- **Platform AI:** Claude (Anthropic) untuk ide, naskah, kode, dan pengujian

## Cerita

Pemain adalah anggota termuda Kapal Ekspedisi Sains yang terdampar di **Pulau Nusa Kawruh**
setelah badai. Untuk pulang, ia harus menyalakan **Mercusuar Tua** di puncak pulau. Sembilan
Penjaga pulau masing-masing menyimpan bekal ilmu dan satu **alat survival**. Setiap materi IPA
langsung dipakai untuk bertahan hidup: cahaya untuk keluar dari goa dan membuat sinyal, bunyi
untuk memanggil bantuan, magnet untuk membuat kompas, listrik untuk menyalakan lampu mercusuar.

Naskah lengkap: [`docs/naskah-survival-sains.md`](docs/naskah-survival-sains.md) (dibuat otomatis
dari data game dengan `npm run naskah`).

## Alur bermain

1. **Sampul → cutscene badai → Kartu Anggota Ekspedisi** (pilih karakter, warna pakaian, nama,
   mode sendiri/kelas).
2. **Prolog di Goa Sinar.** Pemain terbangun di dalam balai pertama; Mbok Sinar langsung menyapa.
   Balai pertama sekaligus tutorial.
3. **11 balai berurutan sesuai bab buku** di satu jalur keliling pulau. Balai berikutnya terbuka
   (kabut tersibak) setelah balai sebelumnya lulus.
4. **Pola 6 tahap di setiap balai:** tiba → misi dari Penjaga (percakapan + pilihan balasan) →
   **Halaman Cerita** bersama Cantrik (4 adegan animasi + interaksi) → **Tempat Uji** (terbuka
   setelah cerita dibaca; Penjaga berjalan ke sana) → hadiah alat survival → **gerbang ke peta**.
   Letak penjaga, ruang cerita, tempat uji, dan gerbang berbeda di tiap balai.
5. **Final: Malam Badai di Mercusuar Tua.** 30 soal dalam 4 lantai; lulus bila ≥ 21 benar (70%).
   Bila belum lulus, cukup mengulang lantai yang belum tuntas. Epilog → sertifikat
   **"Penyintas Sains"**.

## Fitur utama

- **Kuis pilihan ganda di dalam percakapan:** Penjaga mengajukan soal, 3 obor = 3 kesempatan,
  jawaban salah memberi petunjuk yang merujuk adegan cerita (tombol "Ingat cerita"), jawaban benar
  diberi penjelasan dari cerita.
- **Halaman Cerita** untuk 11 materi (44 adegan SVG beranimasi), ditutup Kunci Ingat, diagram
  interaktif, ringkasan materi lengkap, dan hikmah.
- **Narasi suara (TTS) bahasa Indonesia** bawaan HP, dengan nada & kecepatan berbeda per tokoh.
  Teks tetap tampil walau suara mati.
- **Nilai keislaman & kemuhammadiyahan:** salam di setiap pertemuan, basmalah sebelum tantangan,
  hamdalah setelah lulus, tadabbur alam, manusia sebagai khalifah penjaga bumi, ilmu untuk menolong
  sesama.
- **Tas Survival** (11 alat), bintang per balai, peta pulau 3D berkabut.
- **Mode kelas (multiplayer)** dengan token 4 digit: siswa menjelajah sesuai kecepatan masing-masing
  dan saling melihat di balai yang sama (sapaan emoji, tanpa obrolan bebas).
- **Dasbor guru** 3 tab: *Kelas* (matriks siswa × 11 balai + persen benar per bab), *Soal* (soal
  tersulit + pilihan salah terbanyak/miskonsepsi), *Siswa* (detail, lama membaca, rekomendasi).
  Ekspor **CSV Kelas** dan **CSV Jawaban** (satu baris per jawaban, untuk analisis butir soal).
- PWA (bisa dipasang & offline untuk mode sendiri), kontrol sentuh untuk HP.

## Menjalankan

```bash
npm install
npm run dev        # Vite (:5173) + server multiplayer (:8787)
npm run build      # build produksi (dist/)
npm run serve      # satu server menyajikan game + multiplayer + dasbor guru (:8787)
npm test           # uji unit Vitest
npm run verify:bank
npm run lint
npm run smoke      # uji asap 1 balai penuh di layar HP (butuh server berjalan)
node scripts/smoke-multiplayer.mjs   # uji guru + 2 siswa (butuh `npm run serve`)
```

Port bisa diganti: `PORT=9000 npm run serve` atau `npx vite --port 5180`.

## Hosting untuk juri

Server hanya butuh Node + WebSocket, jadi bisa di-hosting gratis (mis. Render): build command
`npm install && npm run build`, start command `npm run serve`. Tanpa server, game tetap berjalan
penuh sebagai mode sendiri.

## Struktur proyek

```
src/
├─ main.ts               # alur utama: peta, dunia balai, misi, hadiah, tas
├─ data/cerita.ts        # naskah: 9 penjaga, cantrik, alat, dialog, Final, epilog
├─ data/adegan.ts        # Halaman Cerita: 44 adegan + interaksi
├─ data/balai.ts         # materi, diagram, urutan jalur
├─ core/                 # state (misi, kunci berurutan), engine soal, suara (TTS), analisis guru
├─ ui/percakapan.ts      # kotak percakapan bergaya visual novel
├─ ui/tantangan.ts       # kuis di dalam percakapan (obor, petunjuk, catatan jawaban)
├─ ui/halamanCerita.ts   # buku cerita bergerak
├─ ui/cutscene.ts        # cutscene badai & epilog
├─ ui/screens/           # intro, final, guru, hasil, petunjuk, tentang
└─ world/                # peta pulau 3D, dunia balai 3D, karakter
server/ shared/ tests/ scripts/ docs/
```

## Privasi

Mode sendiri tidak mengirim data ke mana pun; progres disimpan di perangkat. Mode kelas mengirim
nama panggilan, posisi, dan ringkasan belajar ke server kelas selama sesi (disimpan di memori,
tidak dibagikan ke pihak ketiga). Guru dianjurkan meminta siswa memakai nama panggilan.

## Lisensi & atribusi

Lihat [`docs/atribusi.md`](docs/atribusi.md).
