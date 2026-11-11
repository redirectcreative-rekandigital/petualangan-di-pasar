# Persemaian — Bab 6 (H04, konservasi / pelestarian) — aset 3D v001

Folder: `/workspace/aset_persemaian/` · Zip: `aset_persemaian_v001.zip` · Manifest: `aset_persemaian_manifest_v001.json` · Konsep: `_ref/`

Tata letak mengikuti kode live, layout ke[2] dicermin X (urutan 6). Overview: `overview_scene.png`, `overview_uji.png`, `overview_rumah.png`, contact sheet: `contact_sheet.png`.

## Daftar aset
| Aset | Node | Tris | Mengganti / fungsi |
|---|---|---|---|
| `rumah_persemaian` | Rumah_Persemaian, Papan_Nama | 2912 | kios() rumah penjaga (roof = accent) |
| `jembatan_rusak` | Jembatan_Rusak | 836 | landmark jembatan rusak (tempat Eyang Wana menunggu), di samping arena |
| `stasiun_persemaian` | Stasiun_Persemaian | 1006 | wi() story station (konservasi: bedeng bibit, 3 tong pilah, gembor, pagar kecil) |
| `panggung_uji` | Arena_Uji, Cincin_Aksen, Pagar_Uji, Api_1_Mati, Api_1_Nyala, Cahaya_Api_1, Api_2_Mati, Api_2_Nyala … | 1400 | Hi() test arena |
| `bibit_pot` | Bibit_Pot_A, Bibit_Pot_B | 100 | 12 seedling pots (#b45309 + cone #4ade80) at x -6..0, z 13-14.2 |
| `bedengan` | Bedengan | 344 | seedbed (persemaian dressing) |
| `tumpukan_kayu` | Tumpukan_Kayu | 280 | log pile (H04 dressing; also usable as tebangan) |
| `lantai_persemaian` | lantai_persemaian | 102 | ground plane (grass #a3a36a), tile 4x4 m, top 0.06 |
| `kit_persemaian` | Bibit_Pot_A, Bibit_Pot_B, Bedengan, Tumpukan_Kayu, lantai_persemaian | 826 |  |

## Aset bersama yang dipakai (tidak dibuat ulang)
- `aset_bersama/gerbang_peta`
- `aset_bersama/jalan_lebar (lurus, skala Y = panjang/3)`
- `aset_goa_sinar/tiang_obor`
- `aset_goa_sinar/pagar_kayu`
- `aset_goa_sinar/semak`
- `aset_bersama/tunggul (x<0, hutan gundul)`
- `aset_bersama/pohon (x>0)`
- `aset_goa_sinar/batu_kecil`

## NPC
| Tokoh game | NPC kita |
|---|---|
| Eyang Wana (penjaga, L) | **NPC 05 kakek_bibit** |
| Cantrik Tunas (P) | **NPC 16 cantrik_kecambah** |

## Catatan untuk programmer
- Satuan meter, glTF +Y atas, depan **+Z**, origin bawah-tengah. Tanpa tekstur (warna = material flat). Semua GLB lolos gltf-validator **0 error / 0 warning**.
- Posisi pakai koordinat kode (noktahWorld): rumah di `rumah`, stasiun di grup cerita (lokal 0,0,-2.2), arena di `uji`, gerbang di `gerbang`. Rotasi = `ee(a,b)` yang sama dengan kode (depan aset menghadap target).
- **panggung_uji**: pengganti `Hi()`. Node `Api_1..3_Mati` tampil default; `Api_1..3_Nyala` **sembunyikan saat load** (glTF tidak punya flag hidden), tampilkan per jawaban benar + putar clip `Api_k_Kedip`. Empty `Cahaya_Api_k` berisi `light_hint` (PointLight). `Pagar_Uji` disembunyikan saat terbuka; `Cincin_Aksen` diberi emissive aksen saat terbuka.
- **Papan_Nama** pada rumah punya property `text_face` (pusat & ukuran bidang teks) untuk nama tempat dari game.
- Empty dengan `light_hint` (JSON) = saran PointLight (warna/intensitas/jarak). Empty `attach_hint` = titik kait (mis. kabel).
- Material emissive (api, bara, bohlam, lava, matahari) sudah bercahaya; bila perlu redupkan `emissiveIntensity`.
- Builder: `/workspace/aset_bersama/_builder/build_bab.py` (`blender -b --factory-startup --python build_bab.py -- <KODE> <aset|all>`), palet: `/workspace/aset_goa_sinar/_builder/aset_core.py`.

## Kelemahan / catatan
- rumah_persemaian 2912 tris (mepet 3k)
- jembatan rusak statis (tidak ada state "diperbaiki"; kalau perlu, buat v002)
