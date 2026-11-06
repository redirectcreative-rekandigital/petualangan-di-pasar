# Petualangan di Pasar

Game edukasi matematika 3D untuk kelas 6 SD/MI, disiapkan untuk **Lomba Pembuatan Game
Edukasi Berbasis AI - Guru Muhammadiyah se-Cabang Blimbing 2026**.

- **Pembuat:** Rosyitania Yudha Astari, S.Pd
- **Sekolah:** Guru SD Muhammadiyah Wonorejo Polokarto
- **Jenjang:** Kelas 6 SD/MI
- **Konteks:** Persiapan Tes Kemampuan Akademik (TKA) - Numerasi

## Konsep

Petualangan di Pasar adalah permainan **dua lapis**:

1. **Peta besar 3D** bergaya peta harta karun. Peta berisi **16 noktah** (titik materi),
   satu noktah untuk setiap kode materi TKA Matematika SD/MI. Pemain cukup **mengetuk
   noktah** untuk memasukinya.
2. **Dunia noktah 3D**. Di dalam tiap noktah, pemain **berjalan-jalan** (kamera orang
   ketiga) menuju **balai** — rumah sub-materi. Mendekati balai lalu menekan A membuka
   **bacaan materi 1 halaman ringkas** dan latihan soal.

Noktah dikelompokkan ke **3 zona**:

| Zona | Elemen | Noktah |
| --- | --- | --- |
| Perkampungan Tukang Hitung (hijau) | Bilangan | B01–B06 |
| Alun-Alun Bentuk (biru) | Geometri | G01–G08 |
| Lorong Catatan (oranye) | Data | D01–D02 |

Semua noktah **bebas dipilih sejak awal** (tidak ada penguncian progresif). Setiap noktah
saat ini berisi **1 balai** dengan **3 soal**. Babak puncak **"Pasar Ramai"** terbuka setelah
pemain **pernah mengunjungi seluruh 16 noktah** (aturan A(ii), tanpa syarat bintang):
**30 soal** campuran pilihan ganda, pilihan ganda kompleks, dan penalaran HOTS. Lulus
Pasar Ramai membuka **sertifikat digital**.

Alur pembuka: **cover → pilih karakter (laki-laki/perempuan) → atur pakaian (warna baju,
celana/gamis, dan hijab) → isi nama panggilan → loading singkat → peta**. Setiap perpindahan
ke peta atau balai disertai **loading spinner** singkat.

Nilai karakter: **amanah dan jujur dalam berdagang**, muncul sebagai dialog penjaga.

## Fitur

- Peta besar 3D yang bisa diklik (peta harta karun) + dunia noktah 3D jelajah
- Tiga tata letak dunia (per zona) dengan nama & warna balai menyesuaikan noktahnya
- Karakter pemain low-poly, kamera orang ketiga, collision lingkaran-vs-kotak
- **Kustomisasi pakaian**: 3 pilihan warna untuk baju, 3 untuk celana/gamis, dan 3 untuk
  hijab (khusus perempuan), dengan pratinjau 3D langsung di layar
- **Material PBR (MeshStandard) + bayangan lembut (PCFSoft)** untuk kesan lebih halus dan
  nyata; otomatis dimatikan di perangkat kelas bawah agar tetap lancar
- Kontrol sentuh (joystick + geser kamera + tombol A/B) dan desktop (WASD + mouse + E)
- 78 soal: 48 soal balai (3 × 16) + 30 soal Pasar Ramai, semua dengan pembahasan
- Metadata TKA pada tiap soal (kode materi, indikator, level kognitif, tingkat kesulitan)
- Tipe soal **pilihan ganda kompleks** (pilih semua jawaban benar)
- **3 kesempatan menjawab per soal**; habis 3× berarti soal dianggap gagal
- Bintang per balai (3/2/1 benar), koin, dan sertifikat digital
- PWA: bisa dipasang dan jalan offline
- Efek suara sederhana (Web Audio API) dengan tombol bisu
- **Instancing + LOD** untuk penghias dunia (pohon, semak, batu, peti, lampu) agar ringan
- **Tone mapping filmik** & suasana "sore hangat" untuk kesan visual yang lebih hidup
- **Fondasi pipeline aset glTF** dengan DRACO + KTX2/Basis + Meshopt (lihat `docs/pipeline-aset-3d.md`)
- Font display ramah anak (Baloo 2) yang di-host sendiri agar tetap jalan offline
- Layar darurat ramah hanya bila perangkat benar-benar tanpa WebGL

## Mode Multiplayer & Mode Guru (opsional)

Selain **singleplayer** (bawaan, tanpa internet), game bisa dijalankan **multiplayer satu kelas**
bila server online dinyalakan. Cukup mendukung satu kelas (≤40 siswa) dengan satu guru.

- **Guru**: di halaman depan klik **👩‍🏫 Mode Guru** → **Buat Sesi Kelas** → muncul **token 4 digit**
  (hanya angka, mis. `5274`) untuk dibagikan ke siswa. Dasbor guru menampilkan daftar siswa yang
  join beserta **progress live** (noktah sekarang, bintang, persen benar, jumlah soal salah,
  lulus Pasar Ramai) dan tombol **Ekspor CSV** untuk analisa lanjutan.
- **Siswa**: saat mengisi nama, pilih **👥 Multiplayer Kelas** lalu masukkan **token** dari guru.
  Siswa yang berada di **noktah yang sama** akan **saling melihat** karakter temannya berjalan,
  lengkap dengan nama dan tombol **sapa** (emoji `👋 👍 😀 🎉 ❤️ 🙌`).
- **Tanpa server**: semua fitur game tetap berjalan sebagai singleplayer; multiplayer hanya aktif
  bila server online dikonfigurasi.

### Menjalankan server online

Saat **pengembangan**, cukup satu perintah:

```bash
npm run dev        # menyalakan Vite (:5173) + server multiplayer (:8787) sekaligus
```

Buka **http://localhost:5173/**. Aplikasi mendeteksi bahwa ia disajikan Vite dan otomatis
mengarahkan permintaan `/api/*` serta WebSocket ke server multiplayer di port **8787**.

Untuk **produksi** (satu server menyajikan semuanya):

```bash
npm run build      # sekali saja (server menyajikan dist/)
npm run serve      # atau: npm run serve:dev (build + jalankan)
# Buka http://localhost:8787/
```

Setelan server:

- **Alamat server** ditentukan otomatis dari origin halaman (bila disajikan oleh server itu sendiri).
  Untuk hosting terpisah, isi `VITE_PASAR_SERVER` saat build atau tanam `window.__PASAR_SERVER__`
  di `index.html`.
- **Port** server default **8787** (ubah dengan variabel lingkungan `PORT`).
- Data ruang disimpan **di memori server** (cukup untuk satu sesi pembelajaran). Tidak ada
  basis data atau pengumpulan data pribadi.
- Cocok di-hosting gratis (Render/Railway/Fly.io) karena hanya butuh Node + WebSocket.

## Struktur Proyek

```
src/
├─ main.ts                 # titik masuk, alur intro/loading, peta 3D, dunia noktah 3D, jaringan
├─ core/                   # state (noktah/balai), engine soal, scoring, sound
├─ net/                    # klien.ts (WebSocket + REST), ringkas.ts (ringkasan progres)
├─ world/                  # scene, player, camera, collision, market, mapConfig,
│                          # petaBesar.ts (peta 3D), noktahWorld.ts (dunia per noktah),
│                          # karakter.ts/kios.ts (aset prosedural), pemainLain.ts (pemain lain),
│                          # instancing.ts (InstancedMesh + LOD), loaders.ts (glTF+DRACO+KTX2)
├─ input/                  # joystick, geser kamera, keyboard
├─ ui/                     # HUD, loading, panel balai/soal, layar hasil, sertifikat, guru.ts
├─ data/                   # schema.ts, balai.ts (NOKTAH), questions/*.json
├─ assets/fonts/           # font display (Baloo 2)
└─ styles/
server/                    # server Node: index.mjs (REST + WebSocket), rooms.mjs
shared/                    # types.ts, net.ts (tipe protokol bersama)
public/assets/
├─ models/                 # aset glTF/GLB (opsional; lihat docs/pipeline-aset-3d.md)
└─ libs/{draco,basis}/     # decoder kompresi geometri & tekstur
tests/                     # Vitest
docs/                      # jurnal AI, deskripsi karya, atribusi, pipeline aset 3D
scripts/                   # gen-icons, verify-bank, smoke, smoke-multiplayer
```

## Menjalankan

```bash
npm install
npm run dev        # Vite (:5173) + server multiplayer (:8787) sekaligus
npm run dev:vite   # hanya Vite (singleplayer / tanpa fitur online)
npm run dev:server # hanya server multiplayer
npm run build      # build produksi (dist/)
npm run preview    # pratinjau hasil build
npm test           # uji unit Vitest
npm run verify:bank # periksa validitas & kunci bank soal
npm run lint       # ESLint
npm run serve      # server online (multiplayer + dasbor guru) dari dist/
```

## Uji

- `npm test` - 89 uji: logika skor, kesempatan menjawab, collision, integritas bank soal,
  alur layar (termasuk intro, pilih karakter/mode, dan aturan A(ii)), fondasi loader aset 3D,
  dan putaran penuh balai.
- `npm run verify:bank` - memvalidasi 78 soal terhadap skema dan menyilang-cek tiap kunci.
- `npm run smoke` - uji asap Playwright (singleplayer): pembuka → peta 3D → masuk noktah →
  dialog → panel bacaan → panel soal, tanpa error console.
- `node scripts/smoke-multiplayer.mjs` - uji asap multiplayer: guru buat sesi, dua siswa join
  dengan token, masuk noktah yang sama, saling melihat, dan tampil di dasbor guru.
  (Perlu server berjalan: `npm run serve`.)
- `node scripts/smoke-dev-arah.mjs` - memastikan saat `npm run dev`, Mode Guru memanggil API
  ke server multiplayer (:8787), bukan ke dev server Vite (:5173).

Uji asap memerlukan server berjalan (`npm run dev`, `npm run preview`, atau `npm run serve`).

## Privasi

Tidak ada pengumpulan data pribadi untuk singleplayer: nama pemain hanya dipakai untuk sertifikat
digital dan disimpan di perangkat sendiri (localStorage). Nama boleh berupa panggilan atau inisial.

Pada **mode multiplayer**, nama panggilan, pilihan karakter, posisi di dunia, dan ringkasan
progres dikirim ke server kelas **hanya selama sesi berlangsung** (disimpan di memori server,
untuk dipantau guru) dan tidak dibagikan ke pihak ketiga. Guru sebaiknya meminta siswa memakai
nama panggilan atau inisial.

## Lisensi & Atribusi

Seluruh soal, dunia 3D, dan aset dibuat sendiri oleh penulis. Pustaka pihak ketiga:
Three.js (MIT), zod (MIT), Vite (MIT), Vitest (MIT), vite-plugin-pwa (MIT),
`ws` (MIT, server multiplayer), Playwright (Apache-2.0, pengembangan).
