# Taman Bunga — Bab 5 (H03, simbiosis) — aset 3D v001

Folder: `/workspace/aset_taman_bunga/` · Zip: `aset_taman_bunga_v001.zip` · Manifest: `aset_taman_bunga_manifest_v001.json` · Konsep: `_ref/`

Tata letak mengikuti kode live, layout ke[1] dicermin X (urutan 5). Overview: `overview_scene.png`, `overview_uji.png`, `overview_rumah.png`, contact sheet: `contact_sheet.png`.

## Daftar aset
| Aset | Node | Tris | Mengganti / fungsi |
|---|---|---|---|
| `rumah_kembang` | Rumah_Kembang, Papan_Nama | 2564 | kios() rumah penjaga (roof = accent) |
| `pohon_besar` | Pohon_Besar | 472 | landmark akar pohon besar (tempat Nyai Kembang menunggu), dekat arena |
| `stasiun_simbiosis` | Stasiun_Simbiosis | 880 | ui() story station (simbiosis: bunga + lebah, pohon + anggrek, ulat) |
| `panggung_uji` | Arena_Uji, Cincin_Aksen, Pagar_Uji, Api_1_Mati, Api_1_Nyala, Cahaya_Api_1, Api_2_Mati, Api_2_Nyala … | 1400 | Hi() test arena |
| `bunga` | Bunga_A, Bunga_B, Bunga_C | 540 | 46 flowers (stem + icosa head) r9-20.5; colours #f472b6 #facc15 #f97316 #a78bfa white #ef4444 |
| `sarang_lebah` | Sarang_Lebah | 300 | beehive box + bees (taman dressing) |
| `lantai_taman` | lantai_taman | 102 | ground plane (grass #8fd27a), tile 4x4 m, top 0.06 |
| `kit_taman` | Bunga_A, Bunga_B, Bunga_C, Sarang_Lebah, lantai_taman | 942 |  |

## Aset bersama yang dipakai (tidak dibuat ulang)
- `aset_bersama/gerbang_peta`
- `aset_bersama/jalan_lebar (lurus, skala Y = panjang/3)`
- `aset_goa_sinar/tiang_obor`
- `aset_goa_sinar/pagar_kayu`
- `aset_goa_sinar/semak`
- `aset_bersama/pohon (6)`
- `aset_goa_sinar/batu_kecil`

## NPC
| Tokoh game | NPC kita |
|---|---|
| Nyai Kembang (penjaga, P) | **NPC 04 ibu_bunga** |
| Cantrik Tawon (L) | **NPC 15 cantrik_kenikir** |

## Catatan untuk programmer
- Satuan meter, glTF +Y atas, depan **+Z**, origin bawah-tengah. Tanpa tekstur (warna = material flat). Semua GLB lolos gltf-validator **0 error / 0 warning**.
- Posisi pakai koordinat kode (noktahWorld): rumah di `rumah`, stasiun di grup cerita (lokal 0,0,-2.2), arena di `uji`, gerbang di `gerbang`. Rotasi = `ee(a,b)` yang sama dengan kode (depan aset menghadap target).
- **panggung_uji**: pengganti `Hi()`. Node `Api_1..3_Mati` tampil default; `Api_1..3_Nyala` **sembunyikan saat load** (glTF tidak punya flag hidden), tampilkan per jawaban benar + putar clip `Api_k_Kedip`. Empty `Cahaya_Api_k` berisi `light_hint` (PointLight). `Pagar_Uji` disembunyikan saat terbuka; `Cincin_Aksen` diberi emissive aksen saat terbuka.
- **Papan_Nama** pada rumah punya property `text_face` (pusat & ukuran bidang teks) untuk nama tempat dari game.
- Empty dengan `light_hint` (JSON) = saran PointLight (warna/intensitas/jarak). Empty `attach_hint` = titik kait (mis. kabel).
- Material emissive (api, bara, bohlam, lava, matahari) sudah bercahaya; bila perlu redupkan `emissiveIntensity`.
- Builder: `/workspace/aset_bersama/_builder/build_bab.py` (`blender -b --factory-startup --python build_bab.py -- <KODE> <aset|all>`), palet: `/workspace/aset_goa_sinar/_builder/aset_core.py`.

## Kelemahan / catatan
- lebah di stasiun/sarang statis (kode punya lebah terbang - animasi dari kode)
- bunga = kepala icosphere sederhana
