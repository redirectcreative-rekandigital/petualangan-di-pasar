# Aset bersama (semua bab) v002 (v001 + isian alam)
- **gerbang_peta** (428 tris) – mengganti `_i()` gerbang "Jalan ke Peta" di semua bab: 2 pilar 0.9×3.4×0.9 m bata `#b45309` di x = ±1.9, tutup limas `#7c2d12`, ambang kayu.
  - `Portal` – bidang 2.9×3.1 m cyan emissive, alpha BLEND 0.45 (animasikan `material.opacity` 0.22–0.45 seperti kode).
  - `Papan_Gerbang` – papan kosong untuk teks (`userData.text_face`, default "Jalan ke Peta").
- **jalan_setapak lebar 2.2 m** (`jalan_lebar`: lurus 44 / belok 68 / pertigaan 92 tris) – lebar sama dengan bidang jalan di kode (2.2 m), sel 3×3 m, tebal 4 cm, material `Jalan_Pasir`. `jalan_lebar_lurus` boleh di-scale sepanjang Z untuk ruas panjang (seperti `PlaneGeometry(2.2, L)` di kode). Dipakai di Bab 1 dan Bab 2.
Konvensi: meter, glTF +Y atas, depan +Z, origin bawah-tengah, validator 0 error / 0 warning. Script: `/workspace/aset_lembah_gema/_builder/build_lembah.py -- gerbang_peta | jalan_lebar`.

## Isian alam bersama (baru v002, untuk Bab 3–9c)
- **pohon** (508 tris; {'Pohon_Bulat_A': 312, 'Pohon_Bulat_B': 128, 'Pohon_Cemara': 68}) – Pohon_Bulat_A (3 tajuk) / Pohon_Bulat_B (1 tajuk) / Pohon_Cemara – mengganti pohon B() kode (batang #7a5230, tajuk icosa r1.4)
- **tunggul** (288 tris; {'Tunggul_A': 144, 'Tunggul_B': 144}) – Tunggul_A / Tunggul_B – tunggul pohon (H01, H04 hutan gundul)
- **batang_kayu** (76 tris; ) – Batang_Kayu – kayu tumbang 2.4 m
- **kolam** (1716 tris; {'Kolam_Kecil': 724, 'Kolam_Besar': 992}) – Kolam_Kecil (1.6×1.1) / Kolam_Besar (2.6×1.8) – kolam dengan batu tepi, teratai, ekor kucing; air top 0.1 m. Skala Kolam_Besar 1.15 (E02) / 1.9 (danau E03)
- **awan** (560 tris; {'Awan_A': 320, 'Awan_B': 240}) – Awan_A / Awan_B – awan melayang (E02 y 11–13 m)

Script: `/workspace/aset_bersama/_builder/build_alam.py -- all`. Library bab: `aset_lib.py`, builder bab: `build_bab.py`, overview: `overview_bab.py`, finalisasi: `finalize_bab.py`. Manifest: `aset_bersama_manifest_v002.json`, zip `aset_bersama_v002.zip` (v001 tetap).
