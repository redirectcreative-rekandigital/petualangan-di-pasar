# Goa Sinar – Aset Lingkungan v001

Gaya: blocky low-poly flat-shaded (sama dengan player & NPC). Semua dibuat prosedural di Blender 4.2 (script di `_builder/`), jadi bisa dibangun ulang kapan saja:

```
blender -b --factory-startup --python _builder/build_aset.py -- all      # atau: pendopo | tiang_obor | papan_nama | stasiun_cahaya | panggung_bundar | kit
blender -b <aset>/source/<aset>_v001.blend --python _builder/render_aset.py -- <aset>   # preview
blender -b --python _builder/overview.py                                  # overview_scene.png
python3 _builder/finalize.py                                              # manifest + contact sheet
```

## Konvensi
- **Skala meter** (player ≈ 1.6 m, NPC kakek ≈ 1.76 m). **glTF: +Y atas, depan = +Z.**
- **Origin di bawah-tengah** (tinggal taruh di y = 0 lantai). **Pengecualian: `stalaktit_*` origin di ATAS-tengah** → tempel ke langit-langit, ujung runcing mengarah ke −Y.
- **Palet material bersama** (nama sama di semua GLB: `Kayu_Jati`, `Genteng`, `Batu_Goa`, `Emas`, `Api`, `Pelangi_*`, …). Tanpa tekstur, cuma warna → di three.js buat cache `Map<nama, material>` dan ganti material hasil load dengan yang dari cache supaya semua aset berbagi material yang sama (lebih sedikit shader / draw-state switch).
- Semua GLB lolos **gltf-validator: 0 error, 0 warning**. Detail tris & dimensi ada di `aset_goa_sinar_manifest_v001.json`.

## Daftar aset
| Aset | Tris | Node | Catatan |
|---|---|---|---|
| pendopo | 1672 | `Pendopo`, `Papan_Nama` | `Papan_Nama` = papan kosong terpisah di balok depan. Tulis teks lewat CanvasTexture / troika-text; posisi & ukuran muka papan ada di `userData.text_face` |
| tiang_obor | 238 | `Tiang_Obor`, `Api`, `Cahaya_Obor` | Api emissive + klip loop `Api_Kedip` (1 dtk, scale/rotasi node `Api`). `Cahaya_Obor` = empty berisi `userData.light_hint` |
| papan_nama | 304 | `Papan_Nama_Tiang`, `Papan_Nama` | papan kosong terpisah untuk nama stasiun (`userData.text_face`) |
| stasiun_cahaya | 996 | `Stasiun_Cahaya`, `Senter_Lensa`, `Pelangi`, `Cahaya_Stasiun` | `Pelangi` & `Senter_Lensa` terpisah → bisa di-toggle/animasi saat eksperimen cahaya |
| panggung_bundar | 1504 | `Panggung_Bundar` | celah masuk pagar menghadap depan (+Z) |
| batu_kecil a/b/c | 80 / varian | | |
| bongkahan_dinding_goa a/b/c | 320 / varian | | 2.6–4 m, untuk dinding goa |
| stalaktit a/b/c | 100–120 | | origin atas |
| semak a/b | 80 / 160 | | |
| pagar_kayu segmen / ujung | 132 / 44 | | segmen 2 m: tiang di x = −1, rel −1…+1. Pasang berderet tiap 2 m, tutup ujung dengan `pagar_kayu_ujung` di x = +1 |
| jalan_setapak lurus / belok / pertigaan | 44 / 68 / 92 | | grid 2×2 m, lebar jalan 1.2 m, tebal 4 cm. Lurus = sepanjang Z; belok = depan↔kanan; pertigaan = depan-belakang + kanan. Putar kelipatan 90° |
| lantai_goa | 78 | | ubin 4×4 m, tepi rata (y = 0.06) → bisa disambung tanpa celah, tengah sedikit bergelombang |

File per grup kit berisi varian berjajar di sumbu X; `kit_lingkungan_v001.glb` berisi semua potongan dalam baris per grup. **Setelah clone, reset posisinya** (`obj.position.set(0,0,0)`) lalu taruh di tempat yang diinginkan.

## Instancing untuk potongan kit yang berulang
Batu, semak, pagar, jalan, lantai, stalaktit akan dipakai puluhan kali. Jangan `clone()` mesh-nya satu-satu untuk jumlah besar:
- **`THREE.InstancedMesh`**: ambil `geometry` + `material` dari node kit (mis. `lantai_goa`), buat `new InstancedMesh(geo, mat, N)` dan isi `setMatrixAt(i, m)`. 1 draw call untuk semua ubin lantai / semua batu kecil varian a, dst.
- Node yang punya >1 material (mis. `pagar_kayu_segmen` = Kayu_Jati + Kayu_Papan, `semak_b`, `stalaktit_*`) di three.js jadi Group berisi beberapa Mesh → buat satu InstancedMesh per sub-mesh dengan matriks yang sama.
- Untuk jumlah kecil (<10) `clone()` biasa sudah cukup; geometri tetap dibagi (tidak disalin).
- Aset statis: `matrixAutoUpdate = false` setelah ditempatkan.

## Emissive vs lampu sungguhan
- Material `Api`, `Api_Inti`, `Cahaya_Senter`, `Pelangi_*`, `Kaca` memakai **emissive** (KHR_materials_emissive_strength). Ini hanya membuat objeknya *terlihat* menyala, **tidak menerangi sekitar**. Kalau pakai post-processing **bloom** (UnrealBloomPass / selective bloom), emissive ini yang akan "glow".
- Cahaya yang menerangi lingkungan harus lampu three.js sungguhan. Di GLB tidak ada lampu (sengaja, agar tidak ada lampu mahal otomatis). Sebagai gantinya ada **empty "light hint"**:
  - `Cahaya_Obor` (di atas api, y ≈ 2.0 m) → `userData.light_hint` (string JSON): `PointLight`, warna `#ffa24a`, intensitas 3, distance 7, decay 2, flicker 0.8–1.15 @ 6–11 Hz, `castShadow: false`.
  - `Cahaya_Stasiun` (y ≈ 1.2 m) → opsional, lampu sorot lembut di atas meja stasiun.
- **Batasi jumlah lampu nyata** (mis. maks 4–6 PointLight aktif di sekitar pemain; obor yang jauh cukup emissive saja). Kedip lampu: `light.intensity = base * (0.9 + 0.15*noise(t))`, sinkron dengan klip `Api_Kedip` (`AnimationMixer`, `LoopRepeat`; beri `time` acak per obor supaya tidak kompak).
- Shadow sebaiknya hanya dari 1 DirectionalLight utama; PointLight shadow mahal (6 render per lampu).
- Catatan: exporter menormalkan warna emissive (kanal max = 1) dan menyesuaikan strength; `Pelangi_Hijau` keluar tanpa ekstensi strength (nilai efektif ~1), tampil sedikit kurang terang dari strip lain.

## File
- `<aset>/export/<aset>_v001.glb`, `<aset>/source/<aset>_v001.blend` (+ `stats.json`), `<aset>/preview/*_persp.png`, `*_front.png`
- `kit_lingkungan/export/kit_lingkungan_v001.glb` (semua potongan kit)
- `overview_scene.png` (semua aset + NPC 01 Kakek Lentera, NPC 09 Cantrik Prisma, player_boy untuk skala), `_builder/overview_scene.blend`
- `contact_sheet.png`, `aset_goa_sinar_manifest_v001.json`, `_ref/` (konsep)

## Pembaruan v002 (bersamaan dengan Bab 2)
- **`panggung_bundar/export/panggung_bundar_v002.glb`** (1400 tris) – arena uji dibangun ulang sesuai kode `Hi()`: 3 tiang api dengan status per tiang `Api_k_Mati` / `Api_k_Nyala` (k = 1..3, nyalakan satu per jawaban benar), `Cincin_Aksen` amber `#f59e0b` (glow saat terbuka), `Pagar_Uji` (sembunyikan saat terbuka), klip `Api_k_Kedip`. Detail di `/workspace/aset_lembah_gema/README_aset.md`. **v001 tetap disimpan.**
- Jalan lebar 2.2 m dan gerbang peta: lihat `/workspace/aset_bersama/`.
- **Mbok Sinar (penjaga Bab 1, perempuan) = NPC 18 `nenek_pelita`**, bukan NPC 01 (overview lama memakai NPC 01 hanya untuk skala).
- `overview_scene.png` dirender ulang (rotasi potongan kit sekarang benar).
- Manifest: `aset_goa_sinar_manifest_v002.json`; zip: `aset_goa_sinar_v002.zip` (v001 zip tetap).
