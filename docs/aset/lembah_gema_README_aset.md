# Lembah Gema (Bab 2 · F02 Bunyi dan Pendengaran) – Aset v001

Gaya, skala, dan pipeline sama persis dengan Goa Sinar (blocky low-poly flat-shaded, Blender 4.2 prosedural).

```
blender -b --factory-startup --python _builder/build_lembah.py -- all     # atau: balai_gema | stasiun_bunyi | batu_gema | panggung_uji | panggung_bundar_v002 | gerbang_peta | jalan_lebar | kit
blender -b <aset>/source/<aset>_v001.blend --python _builder/render2.py -- <root> <aset> v001
blender -b --python _builder/overview_lembah.py
python3 _builder/finalize_lembah.py                                       # manifest, contact sheet, zip
```
Palet material bersama ada di `/workspace/aset_goa_sinar/_builder/aset_core.py` (ditambah: `Genteng_Ungu`, `Ungu_Aksen`, `Amber_Aksen`, `Batu_Lavender`, `Tebing`, `Rumput_Sage`, `Gelombang`, `Portal_Cyan`, `Bambu_Hijau`, dll). Nama material sama di semua GLB, jadi bisa di-cache per nama di three.js.

## Konvensi
- Meter, **glTF +Y atas, depan +Z, origin bawah-tengah**. Semua GLB: **gltf-validator 0 error / 0 warning / 0 info / 0 hint**.
- Warna aksen Bab 2 = `#7c3aed` (sama dengan `vn("F02")` di kode); langit/kabut kode `#d8ccf2`, tanah `#9fa88a`.

## NPC
| Tokoh di game | NPC kita |
|---|---|
| **Ki Gaung** (penjaga, 🥁) | **NPC 19 `kakek_kentongan`** (`/workspace/npc/19_kakek_kentongan/export/npc_kakek_kentongan_v001.glb`) |
| **Cantrik Gendhing** (perempuan) | **NPC 10 `cantrik_garpu_tala`** (`/workspace/npc/10_cantrik_garpu_tala/export/npc_cantrik_garpu_tala_v001.glb`) |
| **Mbok Sinar** (Bab 1, perempuan, 🕯️) | **NPC 18 `nenek_pelita`** (bukan NPC 01) |

## Aset & objek kode yang diganti
| Aset | Tris | Node | Mengganti (noktahWorld) |
|---|---|---|---|
| balai_gema | 2216 | `Balai_Gema`, `Papan_Nama` | rumah kios `so()` + papan `Ha(tempat)` + emblem. Kentongan + pemukul tergantung di balok depan, bedug di atas dudukan di dalam. `Papan_Nama` = papan kosong terpisah (`userData.text_face`) |
| stasiun_bunyi | 1728 | `Stasiun_Bunyi`, `Gelombang_Bunyi`, `Cahaya_Stasiun` | `fi()` alas + `Di()` (gong di gayor, pemukul, kotak corong, 3 cincin gelombang). `Gelombang_Bunyi` emissive kuning, node terpisah (toggle) + klip loop `Gelombang_Denyut` |
| batu_gema | 756 | `Batu_Gema` | landmark "Batu Gema" (tempat Cantrik Gendhing); tidak ada objeknya di kode. Ditaruh di belakang stasiun |
| panggung_uji | 1400 | lihat di bawah | `Hi()` arena uji, aksen ungu |
| tebing_lembah a/b/c | 192/240/240 | | 12 balok tebing kode (3.5 × 9–14 × 6.5 m). **Sisi panjang 6.5 m di sumbu X, muka depan +Z** → putar ±90° untuk dinding kiri/kanan |
| batu_lembah a/b/c | 80 masing-masing | | 12 batu tebing `#9a90b0` + 14 instance `batu` |
| lantai_lembah | 102 | | lantai rumput (ubin 4×4 m, tepi rata y=0.06, bisa disambung) |
| rumpun_bambu | 360 | | opsional, pengisi (bukan dari kode) |
| kit_lembah | 1578 | semua di atas + jalan_lebar | gabungan; **reset posisi setelah clone** |
| semak, tiang_obor, papan_nama, pagar_kayu | – | | dipakai ulang dari Goa Sinar (`semak`=6 instance, `tiang_obor`=6 `lampu`, pagar keliling `Pi()`) |
| gerbang_peta, jalan_lebar | 428 / 44–92 | | aset bersama di `/workspace/aset_bersama/` (lihat README di sana) |

## Arena uji (panggung_uji, juga Goa Sinar panggung_bundar_v002)
Sesuai kode `Hi()`: alas r 2.8 m abu `#9ca3af`, cincin aksen, 3 tiang 1.6 m di belakang (x = −1.6 / 0 / 1.6, z = −2.1), pagar 18 tiang r 2.9 m.
- `Arena_Uji` – alas + 3 tiang (statis)
- `Cincin_Aksen` – cincin warna bab; saat terbuka: `material.emissive = aksen; emissiveIntensity = 0.6` (seperti `setTerbuka`)
- `Pagar_Uji` – sembunyikan saat arena terbuka
- per tiang k = 1..3: `Api_k_Mati` (kerucut abu, **tampil default**) dan `Api_k_Nyala` (api emissive, **set `visible=false` saat load**). Tiap jawaban benar: `Api_k_Mati.visible=false; Api_k_Nyala.visible=true`. Klip `Api_k_Kedip` (loop 1 dtk) untuk api menyala. `Cahaya_Api_k` = light hint opsional (aktifkan PointLight hanya saat menyala)
- Catatan: glTF tidak punya status "hidden", jadi kedua status ada di file dan game yang mengatur visibilitas.

## Instancing & cahaya
Sama dengan Goa Sinar: tebing, batu, lantai, bambu, pagar, jalan → `InstancedMesh` (satu per sub-mesh/material). Emissive (`Api`, `Gelombang`, `Portal_Cyan`, `Cahaya_Senter`) hanya terlihat menyala; penerangan nyata pakai PointLight dari `light_hint` (batasi 4–6 aktif). Bab 2 terang (siang), jadi obor cukup emissive saja.

## Overview
`overview_scene.png` dan `overview_closeup.png`: tata letak persis koordinat kode F02 (layout `ke[1]`): muncul (0,17), Ki Gaung (6,7), cerita/stasiun (0,−6) dengan Batu Gema di belakangnya, arena uji (−12,−9) = "seberang lembah", gerbang (−14,12), balai (11,−12); dinding tebing di x = ±20…21, pagar keliling, jalan 2.2 m. NPC 19, NPC 10, dan player_boy untuk skala. Scene: `_builder/overview_scene.blend`.

## File
`<aset>/export/<aset>_v001.glb`, `<aset>/source/<aset>_v001.blend` (+ stats.json), `<aset>/preview/`, `contact_sheet.png`, `aset_lembah_gema_manifest_v001.json`, `_ref/konsep_balai_gema.png`, `_survey/` (bundle + catatan survei), zip `aset_lembah_gema_v001.zip` (berisi juga folder `aset_bersama/`).
