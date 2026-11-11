# Tebing Berlapis — Bab 9a (E01, litosfer) — aset 3D v001

Folder: `/workspace/aset_tebing_berlapis/` · Zip: `aset_tebing_berlapis_v001.zip` · Manifest: `aset_tebing_berlapis_manifest_v001.json` · Konsep: `_ref/`

Tata letak mengikuti kode live, layout ke[2] (urutan 9). Overview: `overview_scene.png`, `overview_uji.png`, `overview_rumah.png`, contact sheet: `contact_sheet.png`.

## Daftar aset
| Aset | Node | Tris | Mengganti / fungsi |
|---|---|---|---|
| `pos_pendaki` | Pos_Pendaki, Papan_Nama | 2428 | kios() rumah penjaga (roof = accent) |
| `tebing_berlapis` | Tebing_Berlapis_A, Tebing_Berlapis_B, Tebing_Berlapis_Tangga | 964 | strata wall 9 cols x 5 layers of 5.2x1.6x4 boxes (#a16207 #78716c #57534e #ea580c #92400e) at z=-20.5 |
| `gunung_api` | Gunung_Api | 188 | volcano model (E01 dressing, mirip prop ki()) |
| `stasiun_litosfer` | Stasiun_Litosfer | 668 | ki() story station (litosfer: lapisan tanah, gunung api, kristal batuan, gunung bersalju) |
| `panggung_uji` | Arena_Uji, Cincin_Aksen, Pagar_Uji, Api_1_Mati, Api_1_Nyala, Cahaya_Api_1, Api_2_Mati, Api_2_Nyala … | 1400 | Hi() test arena |
| `batu_kapur` | Batu_Kapur_A, Batu_Kapur_B, Batu_Kapur_C | 240 | 12 rocks #a8a29e (E01) - juga dipakai E03 |
| `lantai_tebing` | lantai_tebing | 102 | ground plane (grass #c7a878), tile 4x4 m, top 0.06 |
| `kit_tebing` | Batu_Kapur_A, Batu_Kapur_B, Batu_Kapur_C, Gunung_Api, lantai_tebing | 530 |  |

## Aset bersama yang dipakai (tidak dibuat ulang)
- `aset_bersama/gerbang_peta`
- `aset_bersama/jalan_lebar (lurus, skala Y = panjang/3)`
- `aset_goa_sinar/tiang_obor`
- `aset_goa_sinar/pagar_kayu`
- `aset_goa_sinar/semak`

## NPC
| Tokoh game | NPC kita |
|---|---|
| Ibu Pertiwi (penjaga, P) | **NPC 17 ibu_batu** |
| Cantrik Watu (L) | **NPC 06 cantrik_batu** |

## Catatan untuk programmer
- Satuan meter, glTF +Y atas, depan **+Z**, origin bawah-tengah. Tanpa tekstur (warna = material flat). Semua GLB lolos gltf-validator **0 error / 0 warning**.
- Posisi pakai koordinat kode (noktahWorld): rumah di `rumah`, stasiun di grup cerita (lokal 0,0,-2.2), arena di `uji`, gerbang di `gerbang`. Rotasi = `ee(a,b)` yang sama dengan kode (depan aset menghadap target).
- **panggung_uji**: pengganti `Hi()`. Node `Api_1..3_Mati` tampil default; `Api_1..3_Nyala` **sembunyikan saat load** (glTF tidak punya flag hidden), tampilkan per jawaban benar + putar clip `Api_k_Kedip`. Empty `Cahaya_Api_k` berisi `light_hint` (PointLight). `Pagar_Uji` disembunyikan saat terbuka; `Cincin_Aksen` diberi emissive aksen saat terbuka.
- **Papan_Nama** pada rumah punya property `text_face` (pusat & ukuran bidang teks) untuk nama tempat dari game.
- Empty dengan `light_hint` (JSON) = saran PointLight (warna/intensitas/jarak). Empty `attach_hint` = titik kait (mis. kabel).
- Material emissive (api, bara, bohlam, lava, matahari) sudah bercahaya; bila perlu redupkan `emissiveIntensity`.
- Builder: `/workspace/aset_bersama/_builder/build_bab.py` (`blender -b --factory-startup --python build_bab.py -- <KODE> <aset|all>`), palet: `/workspace/aset_goa_sinar/_builder/aset_core.py`.

## Kelemahan / catatan
- dinding strata kode di x=-20+l*5 (jarak 5 m, kotak 5.2 m saling tumpang 0.2 m); segmen kita 5.2 m - pakai jarak 5 m seperti kode
- penjaga menunggu "atas tebing": di game arena tetap di tanah; tebing + tangga tali sebagai latar di belakang (tidak bisa didaki)
- tidak ada pohon (sesuai kode)
