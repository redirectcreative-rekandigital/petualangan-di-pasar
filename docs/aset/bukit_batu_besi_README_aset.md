# Bukit Batu Besi — Bab 7 (F03, magnet) — aset 3D v001

Folder: `/workspace/aset_bukit_batu_besi/` · Zip: `aset_bukit_batu_besi_v001.zip` · Manifest: `aset_bukit_batu_besi_manifest_v001.json` · Konsep: `_ref/`

Tata letak mengikuti kode live, layout ke[0] (urutan 7). Overview: `overview_scene.png`, `overview_uji.png`, `overview_rumah.png`, contact sheet: `contact_sheet.png`.

## Daftar aset
| Aset | Node | Tris | Mengganti / fungsi |
|---|---|---|---|
| `bengkel_empu` | Bengkel_Empu, Papan_Nama, Cahaya_Tungku | 2274 | kios() rumah penjaga (roof = accent) |
| `magnet_raksasa` | Magnet_Raksasa | 432 | giant magnet (two 2.4x3x2 boxes red/blue) at r16-19 facing centre |
| `bukit_puncak` | Bukit_Puncak | 468 | landmark puncak bukit (tempat Empu Wesi menunggu), di samping arena |
| `stasiun_magnet` | Stasiun_Magnet | 840 | xi() story station (magnet: tapal kuda, kompas, magnet batang, serbuk besi) |
| `panggung_uji` | Arena_Uji, Cincin_Aksen, Pagar_Uji, Api_1_Mati, Api_1_Nyala, Cahaya_Api_1, Api_2_Mati, Api_2_Nyala … | 1400 | Hi() test arena |
| `batu_besi` | Batu_Besi_A, Batu_Besi_B, Batu_Besi_C | 348 | 20 rocks (#7f4a3a / #6b6b6b, scale 1-2.8, r13-20.5) |
| `lantai_bukit` | lantai_bukit | 102 | ground plane (grass #9b8e86), tile 4x4 m, top 0.06 |
| `kit_bukit` | Batu_Besi_A, Batu_Besi_B, Batu_Besi_C, lantai_bukit | 450 |  |

## Aset bersama yang dipakai (tidak dibuat ulang)
- `aset_bersama/gerbang_peta`
- `aset_bersama/jalan_lebar (lurus, skala Y = panjang/3)`
- `aset_goa_sinar/tiang_obor`
- `aset_goa_sinar/pagar_kayu`
- `aset_goa_sinar/semak`

## NPC
| Tokoh game | NPC kita |
|---|---|
| Empu Wesi (penjaga, L) | **NPC 20 kakek_pandai_besi** |
| Cantrik Kutub (L) | **NPC 11 cantrik_magnet** |

## Catatan untuk programmer
- Satuan meter, glTF +Y atas, depan **+Z**, origin bawah-tengah. Tanpa tekstur (warna = material flat). Semua GLB lolos gltf-validator **0 error / 0 warning**.
- Posisi pakai koordinat kode (noktahWorld): rumah di `rumah`, stasiun di grup cerita (lokal 0,0,-2.2), arena di `uji`, gerbang di `gerbang`. Rotasi = `ee(a,b)` yang sama dengan kode (depan aset menghadap target).
- **panggung_uji**: pengganti `Hi()`. Node `Api_1..3_Mati` tampil default; `Api_1..3_Nyala` **sembunyikan saat load** (glTF tidak punya flag hidden), tampilkan per jawaban benar + putar clip `Api_k_Kedip`. Empty `Cahaya_Api_k` berisi `light_hint` (PointLight). `Pagar_Uji` disembunyikan saat terbuka; `Cincin_Aksen` diberi emissive aksen saat terbuka.
- **Papan_Nama** pada rumah punya property `text_face` (pusat & ukuran bidang teks) untuk nama tempat dari game.
- Empty dengan `light_hint` (JSON) = saran PointLight (warna/intensitas/jarak). Empty `attach_hint` = titik kait (mis. kabel).
- Material emissive (api, bara, bohlam, lava, matahari) sudah bercahaya; bila perlu redupkan `emissiveIntensity`.
- Builder: `/workspace/aset_bersama/_builder/build_bab.py` (`blender -b --factory-startup --python build_bab.py -- <KODE> <aset|all>`), palet: `/workspace/aset_goa_sinar/_builder/aset_core.py`.

## Kelemahan / catatan
- huruf N/S pada magnet raksasa dibuat dari balok (kasar)
- tidak ada pohon (sesuai kode F03: pohon 0)
