# Kostum warna: player_boy & player_girl (Kitab Sembilan Penjaga)

Dokumen ini untuk programmer game. Fitur ini hanya mengganti **warna kostum** saat game berjalan.
**Geometri, rig, animasi, dan file GLB tidak diubah.** GLB yang sudah terpasang di game tetap dipakai apa adanya.

## Isi folder
| File | Fungsi |
|---|---|
| `kostum.ts` | Modul utama: data preset, swatch, `terapkanKostum()`, simpan/muat localStorage |
| `preview/kostum_laki.png` | 8 preset laki-laki (render Blender, Idle, tampak 3/4 depan) |
| `preview/kostum_perempuan.png` | 8 preset perempuan |
| `preview/uji_picker_laki.png`, `preview/uji_picker_perempuan.png` | screenshot viewer dengan panel kostum (uji di Chrome headless) |
| `preview/warna_preset.json` | warna akhir tiap material untuk tiap preset (hasil hitungan `kostum.ts`) |
| `tests/test_kostum.mjs` | uji Node: nama material, warna bawaan = warna GLB, clone per instance, kontras |
| `tests/shot_kostum.mjs` | uji browser: klik preset dan swatch di viewer, lalu cek warna, simpan/muat, dan reset |
| `scripts/` | skrip render preview (Blender) dan pembuat lembar preview |

Uji dijalankan dari `/workspace/tools` (berisi `three`, `playwright-core`, dan salinan `kostum.mts`) dengan Node 24.

## Material di GLB (tidak perlu GLB v002)
Setiap bagian sudah punya material sendiri dengan nama yang jelas. Setiap material dipakai oleh satu primitive saja,
jadi **tidak perlu ekspor ulang**.

**Laki-laki (`player_boy_v001.glb` / di game `player_male.glb`)**
| Bagian kostum | Material | Keterangan |
|---|---|---|
| `baju` (Baju Koko) | `Shirt` | badan dan lengan |
| (turunan baju) | `ShirtTrim` | plaket, saku, pita keliman, belahan kerah (otomatis 5,5% lebih gelap dari baju) |
| `aksen` (Aksen/Yoke) | `Tan` | yoke bahu, garis manset, list saku |
| (turunan) | `Button` | kancing (campuran aksen + baju) |
| `celana` | `Pants` (+ `PantsSeam` lebih gelap untuk jahitan) | |
| `peci` | `Peci` | |
| `sepatu` | `ShoeDark` | |
| `sol` | `ShoeWhite` | sol, ujung, lidah, tumit |
| **tidak diubah** | `Face`, `Skin`, `Hair` | |

**Perempuan (`player_girl_v001.glb` / di game `player_female_hijab.glb`)**
| Bagian kostum | Material | Keterangan |
|---|---|---|
| `tunik` | `Shirt` (+ `Button` sedikit lebih terang) | |
| `aksen` (Aksen/Yoke) | `Brown` (+ `BrownDark` lebih gelap untuk belahan samping) | yoke, plaket, pita keliman, garis manset |
| `rok` | `Skirt` (+ `SkirtHem` lebih gelap untuk keliman dan garis panel) | |
| `kerudung` | `Hijab` (+ `HijabShade` untuk garis lipatan) | |
| `sepatu` | `ShoeDark` | |
| `sol` | `ShoeWhite` | |
| **tidak diubah** | `Face`, `Skin` | |

> Material dicari berdasarkan **nama**. Kalau GLB diproses dengan alat lain (misalnya gltf-transform, kompresi, atau
> optimizer) sebelum masuk game, pastikan nama material tidak berubah atau tergabung. Uji cepat:
> `terapkanKostum(...)` mengembalikan `jumlahMaterial`. Nilai normalnya 9 untuk laki-laki dan 10 untuk perempuan.

## Preset
**Laki-laki:** Krem Klasik (bawaan, sama persis dengan GLB), Putih Bersih, Biru Laut, Hijau Daun, Abu Tenang, Marun, Navy, Hitam-Emas.
**Perempuan:** Krem Klasik (bawaan), Merah Muda Lembut, Ungu Lavender, Biru Langit, Hijau Mint, Cokelat Susu, Navy, Maroon.

Setiap preset mengisi semua bagian (baju/tunik, aksen, celana/rok, peci/kerudung, sepatu, sol). Kontras baju/tunik
dibanding aksen pada semua preset ≥ 2,0 (rasio WCAG). Selain preset, setiap bagian punya 8–10 swatch.
Semua warna preset juga ada di daftar swatch.

## Cara pasang di project game
1. Salin `kostum.ts` ke **`src/world/kostum.ts`** (satu folder dengan `avatarModel.ts`). Butuh `three` (r170+)
   dan `@types/three`, yang biasanya sudah ada.
2. Di `src/world/avatarModel.ts`, setelah model di-clone dengan `klonModel()` dan **sebelum/sesudah** dibungkus group,
   panggil `terapkanKostum` pada hasil clone (`isi`):

```ts
import { terapkanKostum, muatKostum, type Gender } from './kostum';

// ... di dalam fungsi yang membuat avatar:
const isi = klonModel(gltf.scene);                    // clone seperti sekarang
const gender: Gender = file.includes('female') ? 'perempuan' : 'laki-laki';
terapkanKostum(isi, gender, muatKostum(gender) ?? {}); // warna pilihan pemain (atau bawaan)
grup.add(isi);                                        // bungkus group seperti biasa
```

3. Di menu pilihan kostum:

```ts
import { PRESET, BAGIAN, terapkanKostum, simpanKostum, type PilihanKostum } from './kostum';

let pilihan: PilihanKostum = { preset: 'biru-laut' };                  // tombol preset
pilihan = { ...pilihan, warna: { ...pilihan.warna, sepatu: '#a83a3a' } }; // swatch per bagian
terapkanKostum(isi, 'laki-laki', pilihan);
simpanKostum('laki-laki', pilihan);
```

`PRESET[gender]` berisi `{ id, nama, warna }` untuk tombol, dan `BAGIAN[gender]` berisi `{ id, label, swatch: [{nama, hex}] }`
untuk baris swatch. Contoh UI lengkap (tanpa framework) ada di `character_player_boy/viewer/src/kostumPanel.js`.

### Hal penting
- **Clone material per instance:** `terapkanKostum` meng-clone material milik `isi` satu kali, lalu mengubah warnanya.
  Jadi dua pemain dari GLB yang sama tidak berbagi warna, dan model asli di cache loader tidak ikut berubah.
  Kalau dipanggil berulang (pemain ganti warna), clone yang sama dipakai ulang, jadi tidak ada kebocoran material.
- **Saat avatar dibuang:** panggil `buangMaterialKostum(isi)` untuk `dispose()` material clone. Tekstur wajah tidak ikut dibuang.
- **Animasi tetap jalan:** hanya `material.color` yang diubah. `AnimationMixer`, skeleton, dan clip tidak tersentuh.
- **Warna:** semua hex dalam sRGB. three r152+ (ColorManagement aktif) mengubahnya ke linear secara otomatis, jadi
  preset `krem-klasik` menghasilkan warna yang persis sama dengan GLB.
- **Multiplayer:** kirim objek `PilihanKostum` (JSON kecil, misalnya `{"preset":"navy","warna":{"sepatu":"#a83a3a"}}`) ke pemain lain.
  Di sisi penerima, bersihkan dulu dengan `rapikanPilihan(gender, data)`, lalu panggil `terapkanKostum`.
- **localStorage:** kuncinya `ksp.kostum.v1.<slot>.<gender>`. Parameter `slot` opsional (misalnya id profil).
  Data rusak atau tidak dikenal otomatis diabaikan.
- `tebakGender(isi)` mengembalikan `'perempuan'` kalau ada material `Hijab`, sebagai cadangan kalau gender tidak diketahui.
- `rasioKontras(a, b)` bisa dipakai untuk memberi peringatan di UI kalau pemain memilih baju dan aksen yang warnanya terlalu mirip.

## Fungsi yang diekspor
`PRESET`, `BAGIAN`, `PRESET_BAWAAN`, `PETA_MATERIAL`, `MATERIAL_TETAP`, `cariPreset`, `hitungWarna`, `terapkanKostum`,
`buangMaterialKostum`, `tebakGender`, `simpanKostum`, `muatKostum`, `hapusKostum`, `rapikanPilihan`, `KUNCI_SIMPAN`,
`hexValid`, `campurWarna`, `gelapkan`, `terangkan`, `luminans`, `rasioKontras`, serta tipe `Gender`, `Bagian`, `PilihanKostum`,
`PresetKostum`, `InfoBagian`, `Warna`.

## Hasil uji
- `tsc --strict --noEmit` dengan three r170 types: lolos.
- Node + GLTFLoader + SkeletonUtils.clone: semua material kostum ditemukan, warna bawaan sama persis dengan GLB,
  dua clone mendapat warna berbeda, model asli tidak berubah, kulit/wajah tetap, dan pemanggilan ulang tidak meng-clone lagi.
- Viewer di Chrome headless: 15/15 pemeriksaan lolos (klik preset, klik swatch, simpan → reload → warna kembali,
  ganti karakter, dan reset), tanpa error di konsol.

## Catatan
- Warna turunan (plaket, jahitan, lipatan hijab, keliman rok) dihitung otomatis dari warna bagian utamanya, jadi tidak bisa dipilih terpisah.
- Kalau GLB nanti diganti ke versi baru, nama material di atas harus tetap sama.
