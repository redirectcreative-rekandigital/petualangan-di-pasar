# Mata Air — Bab 9b (E02, hidrosfer & atmosfer) — aset 3D v001

Folder: `/workspace/aset_mata_air/` · Zip: `aset_mata_air_v001.zip` · Manifest: `aset_mata_air_manifest_v001.json` · Konsep: `_ref/`

Tata letak mengikuti kode live, layout ke[0] dicermin X (urutan 10). Overview: `overview_scene.png`, `overview_uji.png`, `overview_rumah.png`, contact sheet: `contact_sheet.png`.

## Daftar aset
| Aset | Node | Tris | Mengganti / fungsi |
|---|---|---|---|
| `rumah_mata_air` | Rumah_Mata_Air, Papan_Nama | 2108 | kios() rumah penjaga (roof = accent) |
| `menara_cuaca` | Menara_Cuaca, Anemometer | 812 | landmark menara cuaca (tempat Ibu Pertiwi menunggu di E02), di samping arena |
| `air_terjun` | Air_Terjun | 352 | cliff 6x6x3 #78716c at (12,3,-19.5) with waterfall plane 1.8x6 #bae6fd |
| `stasiun_hidrosfer` | Stasiun_Hidrosfer | 1024 | Ri() story station (hidrosfer + atmosfer: bola bumi, cincin atmosfer, awan, hujan, genangan) |
| `panggung_uji` | Arena_Uji, Cincin_Aksen, Pagar_Uji, Api_1_Mati, Api_1_Nyala, Cahaya_Api_1, Api_2_Mati, Api_2_Nyala … | 1400 | Hi() test arena |
| `lantai_mata_air` | lantai_mata_air | 102 | ground plane (grass #8ccc8a), tile 4x4 m, top 0.06 |
| `kit_mata_air` | lantai_mata_air | 102 |  |

## Aset bersama yang dipakai (tidak dibuat ulang)
- `aset_bersama/gerbang_peta`
- `aset_bersama/jalan_lebar (lurus, skala Y = panjang/3)`
- `aset_goa_sinar/tiang_obor`
- `aset_goa_sinar/pagar_kayu`
- `aset_goa_sinar/semak`
- `aset_bersama/kolam (Kolam_Besar x1.15 di cerita+(-4,3.5))`
- `aset_bersama/awan (5 awan di ketinggian 11-13 m)`
- `aset_bersama/pohon (10)`
- `aset_goa_sinar/batu_kecil`

## NPC
| Tokoh game | NPC kita |
|---|---|
| Ibu Pertiwi (penjaga, P) | **NPC 17 ibu_batu** |
| Cantrik Mega (P) | **NPC 07 cantrik_awan** |

## Catatan untuk programmer
- Satuan meter, glTF +Y atas, depan **+Z**, origin bawah-tengah. Tanpa tekstur (warna = material flat). Semua GLB lolos gltf-validator **0 error / 0 warning**.
- Posisi pakai koordinat kode (noktahWorld): rumah di `rumah`, stasiun di grup cerita (lokal 0,0,-2.2), arena di `uji`, gerbang di `gerbang`. Rotasi = `ee(a,b)` yang sama dengan kode (depan aset menghadap target).
- **panggung_uji**: pengganti `Hi()`. Node `Api_1..3_Mati` tampil default; `Api_1..3_Nyala` **sembunyikan saat load** (glTF tidak punya flag hidden), tampilkan per jawaban benar + putar clip `Api_k_Kedip`. Empty `Cahaya_Api_k` berisi `light_hint` (PointLight). `Pagar_Uji` disembunyikan saat terbuka; `Cincin_Aksen` diberi emissive aksen saat terbuka.
- **Papan_Nama** pada rumah punya property `text_face` (pusat & ukuran bidang teks) untuk nama tempat dari game.
- Empty dengan `light_hint` (JSON) = saran PointLight (warna/intensitas/jarak). Empty `attach_hint` = titik kait (mis. kabel).
- Material emissive (api, bara, bohlam, lava, matahari) sudah bercahaya; bila perlu redupkan `emissiveIntensity`.
- Builder: `/workspace/aset_bersama/_builder/build_bab.py` (`blender -b --factory-startup --python build_bab.py -- <KODE> <aset|all>`), palet: `/workspace/aset_goa_sinar/_builder/aset_core.py`.

## Kelemahan / catatan
- air terjun = bidang alpha statis (tanpa animasi)
- kit_mata_air hanya lantai (sisanya pakai aset bersama)
