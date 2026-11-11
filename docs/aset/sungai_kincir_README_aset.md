# Sungai Kincir — Bab 8 (F04, listrik) — aset 3D v001

Folder: `/workspace/aset_sungai_kincir/` · Zip: `aset_sungai_kincir_v001.zip` · Manifest: `aset_sungai_kincir_manifest_v001.json` · Konsep: `_ref/`

Tata letak mengikuti kode live, layout ke[1] (urutan 8). Overview: `overview_scene.png`, `overview_uji.png`, `overview_rumah.png`, contact sheet: `contact_sheet.png`.

## Daftar aset
| Aset | Node | Tris | Mengganti / fungsi |
|---|---|---|---|
| `rumah_kincir` | Rumah_Kincir, Papan_Nama, Cahaya_Lampu | 2464 | kios() rumah penjaga (roof = accent) |
| `kincir_air` | Kincir_Rangka, Roda_Kincir | 1044 | water wheel (torus r2.4 #8a5a32 + 8 paddles #a16207) at (-8, 2.6, -18.5), rotating |
| `gardu_listrik` | Gardu_Listrik | 508 | landmark gardu (tempat Mbah Kilat menunggu), di samping arena |
| `tiang_listrik` | Tiang_Listrik, Kabel_Ujung_1, Kabel_Ujung_2, Kabel_Ujung_3 | 136 | power pole (dressing; kabel antar tiang dibuat programmer pakai Kabel_Ujung_k) |
| `stasiun_listrik` | Stasiun_Listrik, Cahaya_Bohlam | 764 | yi() story station (listrik: papan rangkaian, baterai, bohlam menyala, kabel, saklar, petir) |
| `panggung_uji` | Arena_Uji, Cincin_Aksen, Pagar_Uji, Api_1_Mati, Api_1_Nyala, Cahaya_Api_1, Api_2_Mati, Api_2_Nyala … | 1400 | Hi() test arena |
| `sungai` | Sungai_Lurus, Sungai_Batu | 444 | river plane 46x4.5 at z=-19 (#38bdf8): tile 4 m panjang (X) x 4.5 m lebar, ulangi 12x |
| `lantai_sungai` | lantai_sungai | 102 | ground plane (grass #86c46a), tile 4x4 m, top 0.06 |
| `kit_sungai` | Sungai_Batu, Sungai_Lurus, Tiang_Listrik, lantai_sungai | 682 |  |

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
| Mbah Kilat (penjaga, L) | **NPC 01 penjaga_lentera (kakek_lentera)** |
| Cantrik Dinamo (P) | **NPC 12 cantrik_lampu** |

## Catatan untuk programmer
- Satuan meter, glTF +Y atas, depan **+Z**, origin bawah-tengah. Tanpa tekstur (warna = material flat). Semua GLB lolos gltf-validator **0 error / 0 warning**.
- Posisi pakai koordinat kode (noktahWorld): rumah di `rumah`, stasiun di grup cerita (lokal 0,0,-2.2), arena di `uji`, gerbang di `gerbang`. Rotasi = `ee(a,b)` yang sama dengan kode (depan aset menghadap target).
- **panggung_uji**: pengganti `Hi()`. Node `Api_1..3_Mati` tampil default; `Api_1..3_Nyala` **sembunyikan saat load** (glTF tidak punya flag hidden), tampilkan per jawaban benar + putar clip `Api_k_Kedip`. Empty `Cahaya_Api_k` berisi `light_hint` (PointLight). `Pagar_Uji` disembunyikan saat terbuka; `Cincin_Aksen` diberi emissive aksen saat terbuka.
- **Papan_Nama** pada rumah punya property `text_face` (pusat & ukuran bidang teks) untuk nama tempat dari game.
- Empty dengan `light_hint` (JSON) = saran PointLight (warna/intensitas/jarak). Empty `attach_hint` = titik kait (mis. kabel).
- Material emissive (api, bara, bohlam, lava, matahari) sudah bercahaya; bila perlu redupkan `emissiveIntensity`.
- Builder: `/workspace/aset_bersama/_builder/build_bab.py` (`blender -b --factory-startup --python build_bab.py -- <KODE> <aset|all>`), palet: `/workspace/aset_goa_sinar/_builder/aset_core.py`.

## Kelemahan / catatan
- kabel antar tiang listrik tidak dimodelkan (pakai empty Kabel_Ujung_k + garis di kode)
- air sungai statis (tanpa UV/scroll)
