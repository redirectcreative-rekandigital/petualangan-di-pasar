# Pondok Tepi Hutan — Bab 3 (H01, ekosistem) — aset 3D v001

Folder: `/workspace/aset_pondok_hutan/` · Zip: `aset_pondok_hutan_v001.zip` · Manifest: `aset_pondok_hutan_manifest_v001.json` · Konsep: `_ref/`

Tata letak mengikuti kode live, layout ke[2] (urutan 3). Overview: `overview_scene.png`, `overview_uji.png`, `overview_rumah.png`, contact sheet: `contact_sheet.png`.

## Daftar aset
| Aset | Node | Tris | Mengganti / fungsi |
|---|---|---|---|
| `pondok_rimba` | Pondok_Rimba, Papan_Nama | 2896 | kios() rumah penjaga (roof = accent) |
| `stasiun_ekosistem` | Stasiun_Ekosistem | 888 | pi() story station (ekosistem: pohon, kolam mini, jamur, matahari, rumput) |
| `panggung_uji` | Arena_Uji, Cincin_Aksen, Pagar_Uji, Api_1_Mati, Api_1_Nyala, Cahaya_Api_1, Api_2_Mati, Api_2_Nyala … | 1400 | Hi() test arena |
| `jamur` | Jamur_A, Jamur_B | 432 | mushroom dressing (code pi jamur #ef4444) |
| `batu_lumut` | Batu_Lumut_A, Batu_Lumut_B, Batu_Lumut_C | 300 | forest rocks with moss |
| `lantai_hutan` | lantai_hutan | 102 | ground plane (grass #7fc46a), tile 4x4 m, top 0.06 |
| `kit_hutan` | Jamur_A, Jamur_B, Batu_Lumut_A, Batu_Lumut_B, Batu_Lumut_C, lantai_hutan | 834 |  |

## Aset bersama yang dipakai (tidak dibuat ulang)
- `aset_bersama/gerbang_peta`
- `aset_bersama/jalan_lebar (lurus, skala Y = panjang/3)`
- `aset_goa_sinar/tiang_obor`
- `aset_goa_sinar/pagar_kayu`
- `aset_goa_sinar/semak`
- `aset_bersama/pohon (26 pohon cincin r14-21)`
- `aset_bersama/kolam (Kolam_Besar di cerita+(4,4); Kolam_Kecil = kolam kedua di samping arena = "tepi kolam")`
- `aset_bersama/tunggul`
- `aset_bersama/batang_kayu`
- `aset_goa_sinar/batu_kecil`

## NPC
| Tokoh game | NPC kita |
|---|---|
| Nini Rimba (penjaga, P) | **NPC 02 nenek_kupu** |
| Cantrik Lumut (L) | **NPC 13 cantrik_kaca_pembesar** |

## Catatan untuk programmer
- Satuan meter, glTF +Y atas, depan **+Z**, origin bawah-tengah. Tanpa tekstur (warna = material flat). Semua GLB lolos gltf-validator **0 error / 0 warning**.
- Posisi pakai koordinat kode (noktahWorld): rumah di `rumah`, stasiun di grup cerita (lokal 0,0,-2.2), arena di `uji`, gerbang di `gerbang`. Rotasi = `ee(a,b)` yang sama dengan kode (depan aset menghadap target).
- **panggung_uji**: pengganti `Hi()`. Node `Api_1..3_Mati` tampil default; `Api_1..3_Nyala` **sembunyikan saat load** (glTF tidak punya flag hidden), tampilkan per jawaban benar + putar clip `Api_k_Kedip`. Empty `Cahaya_Api_k` berisi `light_hint` (PointLight). `Pagar_Uji` disembunyikan saat terbuka; `Cincin_Aksen` diberi emissive aksen saat terbuka.
- **Papan_Nama** pada rumah punya property `text_face` (pusat & ukuran bidang teks) untuk nama tempat dari game.
- Empty dengan `light_hint` (JSON) = saran PointLight (warna/intensitas/jarak). Empty `attach_hint` = titik kait (mis. kabel).
- Material emissive (api, bara, bohlam, lava, matahari) sudah bercahaya; bila perlu redupkan `emissiveIntensity`.
- Builder: `/workspace/aset_bersama/_builder/build_bab.py` (`blender -b --factory-startup --python build_bab.py -- <KODE> <aset|all>`), palet: `/workspace/aset_goa_sinar/_builder/aset_core.py`.

## Kelemahan / catatan
- rumah pondok_rimba 2896 tris (mepet budget 3k) karena dinding bambu
- jamur/batu lumut sangat sederhana (low-poly sengaja)
- kolam adalah mesh datar tanpa animasi air
