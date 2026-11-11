# Pos Siaga — Bab 9c (E03, siklus air & mitigasi bencana) — aset 3D v001

Folder: `/workspace/aset_pos_siaga/` · Zip: `aset_pos_siaga_v001.zip` · Manifest: `aset_pos_siaga_manifest_v001.json` · Konsep: `_ref/`

Tata letak mengikuti kode live, layout ke[1] dicermin X (urutan 11). Overview: `overview_scene.png`, `overview_uji.png`, `overview_rumah.png`, contact sheet: `contact_sheet.png`.

## Daftar aset
| Aset | Node | Tris | Mengganti / fungsi |
|---|---|---|---|
| `pos_siaga` | Pos_Siaga, Papan_Nama | 2496 | kios() rumah penjaga (roof = accent) |
| `bukit_titik_kumpul` | Bukit_Titik_Kumpul | 632 | hill cone r6 h5 #6dbb4f at (14,-14) with 3 m pole #334155 + green flag #16a34a (titik kumpul) |
| `papan_evakuasi` | Papan_Evakuasi | 108 | evacuation arrow sign (dressing; panah menunjuk +X) |
| `karung_pasir` | Karung_Pasir_Dinding, Karung_Pasir_Tumpuk | 200 | sandbags (dressing tanggul/pos siaga) |
| `stasiun_siklus_air` | Stasiun_Siklus_Air | 804 | Si() story station (siklus air + bencana: matahari, awan, hujan, laut, danau, gunung, 4 panah) |
| `panggung_uji` | Arena_Uji, Cincin_Aksen, Pagar_Uji, Api_1_Mati, Api_1_Nyala, Cahaya_Api_1, Api_2_Mati, Api_2_Nyala … | 1400 | Hi() test arena |
| `lantai_siaga` | lantai_siaga | 102 | ground plane (grass #93b77d), tile 4x4 m, top 0.06 |
| `kit_siaga` | Papan_Evakuasi, Karung_Pasir_Dinding, Karung_Pasir_Tumpuk, lantai_siaga | 410 |  |

## Aset bersama yang dipakai (tidak dibuat ulang)
- `aset_bersama/gerbang_peta`
- `aset_bersama/jalan_lebar (lurus, skala Y = panjang/3)`
- `aset_goa_sinar/tiang_obor`
- `aset_goa_sinar/pagar_kayu`
- `aset_goa_sinar/semak`
- `aset_bersama/kolam (danau = Kolam_Besar x1.9 di (-12,-12))`
- `aset_bersama/pohon (12)`

## NPC
| Tokoh game | NPC kita |
|---|---|
| Ibu Pertiwi (penjaga, P) | **NPC 17 ibu_batu** |
| Cantrik Banyu (L) | **NPC 08 cantrik_peta** |

## Catatan untuk programmer
- Satuan meter, glTF +Y atas, depan **+Z**, origin bawah-tengah. Tanpa tekstur (warna = material flat). Semua GLB lolos gltf-validator **0 error / 0 warning**.
- Posisi pakai koordinat kode (noktahWorld): rumah di `rumah`, stasiun di grup cerita (lokal 0,0,-2.2), arena di `uji`, gerbang di `gerbang`. Rotasi = `ee(a,b)` yang sama dengan kode (depan aset menghadap target).
- **panggung_uji**: pengganti `Hi()`. Node `Api_1..3_Mati` tampil default; `Api_1..3_Nyala` **sembunyikan saat load** (glTF tidak punya flag hidden), tampilkan per jawaban benar + putar clip `Api_k_Kedip`. Empty `Cahaya_Api_k` berisi `light_hint` (PointLight). `Pagar_Uji` disembunyikan saat terbuka; `Cincin_Aksen` diberi emissive aksen saat terbuka.
- **Papan_Nama** pada rumah punya property `text_face` (pusat & ukuran bidang teks) untuk nama tempat dari game.
- Empty dengan `light_hint` (JSON) = saran PointLight (warna/intensitas/jarak). Empty `attach_hint` = titik kait (mis. kabel).
- Material emissive (api, bara, bohlam, lava, matahari) sudah bercahaya; bila perlu redupkan `emissiveIntensity`.
- Builder: `/workspace/aset_bersama/_builder/build_bab.py` (`blender -b --factory-startup --python build_bab.py -- <KODE> <aset|all>`), palet: `/workspace/aset_goa_sinar/_builder/aset_core.py`.

## Kelemahan / catatan
- BUG DI KODE LIVE: pada layout E03 (ke[1] dicermin) danau h(-12,-12) menimpa rumah (-11,-12) dan bukit (14,-14) menimpa arena uji (12,-9) karena dekorasi tidak ikut dicermin. Di overview bukit dipindah ke samping arena (titik kumpul) dan danau ke tanah kosong; programmer sebaiknya memakai posisi overview (lihat _builder/overview_scene.blend) atau mencermin X dekorasi lalu menggeser
- bukit titik kumpul bisa terlihat tinggi (7.7 m dengan bendera) - skala sesuai kode (r6 h5)
- tulisan papan (TITIK KUMPUL / JALUR EVAKUASI) belum ada, hanya text_face untuk teks dari game
