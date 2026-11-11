# Ladang dan Lumbung — Bab 4 (H02, rantai makanan) — aset 3D v001

Folder: `/workspace/aset_ladang_lumbung/` · Zip: `aset_ladang_lumbung_v001.zip` · Manifest: `aset_ladang_lumbung_manifest_v001.json` · Konsep: `_ref/`

Tata letak mengikuti kode live, layout ke[0] dicermin X (urutan 4). Overview: `overview_scene.png`, `overview_uji.png`, `overview_rumah.png`, contact sheet: `contact_sheet.png`.

## Daftar aset
| Aset | Node | Tris | Mengganti / fungsi |
|---|---|---|---|
| `rumah_ladang` | Rumah_Ladang, Papan_Nama | 2500 | kios() rumah penjaga (roof = accent) |
| `lumbung_padi` | Lumbung_Padi | 848 | landmark tempat Ki Lumbung menunggu (lumbung) di samping arena uji |
| `stasiun_rantai_makanan` | Stasiun_Rantai_Makanan | 972 | Qi() story station (rantai makanan: padi > tikus > ular > elang, 3 panah) |
| `panggung_uji` | Arena_Uji, Cincin_Aksen, Pagar_Uji, Api_1_Mati, Api_1_Nyala, Cahaya_Api_1, Api_2_Mati, Api_2_Nyala … | 1400 | Hi() test arena |
| `petak_ladang` | Petak_Ladang_A, Petak_Ladang_B | 504 | field tiles 4x0.15x4 (#c4d25a / #e0c84a) with crop cones, 4.5 m grid outside r13 |
| `orang_orangan_sawah` | Orang_Orangan_Sawah | 248 | scarecrow (field dressing) |
| `jerami` | Jerami_Tumpuk, Jerami_Satu | 272 | hay bales dressing |
| `lantai_ladang` | lantai_ladang | 102 | ground plane (grass #a9cf5c), tile 4x4 m, top 0.06 |
| `kit_ladang` | Petak_Ladang_A, Petak_Ladang_B, Orang_Orangan_Sawah, Jerami_Satu, Jerami_Tumpuk, lantai_ladang | 1126 |  |

## Aset bersama yang dipakai (tidak dibuat ulang)
- `aset_bersama/gerbang_peta`
- `aset_bersama/jalan_lebar (lurus, skala Y = panjang/3)`
- `aset_goa_sinar/tiang_obor`
- `aset_goa_sinar/pagar_kayu`
- `aset_goa_sinar/semak`
- `aset_bersama/pohon (10)`
- `aset_goa_sinar/batu_kecil`

## NPC
| Tokoh game | NPC kita |
|---|---|
| Ki Lumbung (penjaga, L) | **NPC 03 kakek_padi** |
| Cantrik Walang (P) | **NPC 14 cantrik_belalang** |

## Catatan untuk programmer
- Satuan meter, glTF +Y atas, depan **+Z**, origin bawah-tengah. Tanpa tekstur (warna = material flat). Semua GLB lolos gltf-validator **0 error / 0 warning**.
- Posisi pakai koordinat kode (noktahWorld): rumah di `rumah`, stasiun di grup cerita (lokal 0,0,-2.2), arena di `uji`, gerbang di `gerbang`. Rotasi = `ee(a,b)` yang sama dengan kode (depan aset menghadap target).
- **panggung_uji**: pengganti `Hi()`. Node `Api_1..3_Mati` tampil default; `Api_1..3_Nyala` **sembunyikan saat load** (glTF tidak punya flag hidden), tampilkan per jawaban benar + putar clip `Api_k_Kedip`. Empty `Cahaya_Api_k` berisi `light_hint` (PointLight). `Pagar_Uji` disembunyikan saat terbuka; `Cincin_Aksen` diberi emissive aksen saat terbuka.
- **Papan_Nama** pada rumah punya property `text_face` (pusat & ukuran bidang teks) untuk nama tempat dari game.
- Empty dengan `light_hint` (JSON) = saran PointLight (warna/intensitas/jarak). Empty `attach_hint` = titik kait (mis. kabel).
- Material emissive (api, bara, bohlam, lava, matahari) sudah bercahaya; bila perlu redupkan `emissiveIntensity`.
- Builder: `/workspace/aset_bersama/_builder/build_bab.py` (`blender -b --factory-startup --python build_bab.py -- <KODE> <aset|all>`), palet: `/workspace/aset_goa_sinar/_builder/aset_core.py`.

## Kelemahan / catatan
- hewan di stasiun (tikus/ular/elang) sangat simbolik, skala kecil
- petak ladang tidak bisa disambung mulus (tile 4x4 dengan pematang)
