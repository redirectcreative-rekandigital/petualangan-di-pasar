# Indeks Aset 3D – Game TKA (Reditech)
Semua disimpan di box (`/workspace`). Gaya blocky low-poly, meter, glTF +Y atas, depan +Z, origin bawah-tengah. Semua GLB lolos gltf-validator 0 error / 0 warning.
Diperbarui: 11 Nov 2026 (Bab 3–9c selesai).

## Karakter
| Set | Folder | Zip |
|---|---|---|
| Player (boy/girl) + kostum | `/workspace/character_player_boy/` (+ player_girl) | – |
| 20 NPC (penjaga 01–05, 17–20; cantrik 06–16) | `/workspace/npc/` | `/workspace/npc/npc_v001.zip` |

## Bab / lokasi
| Bab | Kode | Lokasi | Folder | Zip terkini | Status |
|---|---|---|---|---|---|
| Bab 1 | F01 | Goa Sinar | `/workspace/aset_goa_sinar/` | `aset_goa_sinar_v002.zip` (v001 disimpan) | ✅ final (ACC) |
| Bab 2 | F02 | Lembah Gema | `/workspace/aset_lembah_gema/` | `aset_lembah_gema_v001.zip` | ✅ final (ACC) |
| Bab 3 | H01 | Pondok Tepi Hutan | `/workspace/aset_pondok_hutan/` | `aset_pondok_hutan_v001.zip` | ✅ selesai |
| Bab 4 | H02 | Ladang dan Lumbung | `/workspace/aset_ladang_lumbung/` | `aset_ladang_lumbung_v001.zip` | ✅ selesai |
| Bab 5 | H03 | Taman Bunga | `/workspace/aset_taman_bunga/` | `aset_taman_bunga_v001.zip` | ✅ selesai |
| Bab 6 | H04 | Persemaian | `/workspace/aset_persemaian/` | `aset_persemaian_v001.zip` | ✅ selesai |
| Bab 7 | F03 | Bukit Batu Besi | `/workspace/aset_bukit_batu_besi/` | `aset_bukit_batu_besi_v001.zip` | ✅ selesai |
| Bab 8 | F04 | Sungai Kincir | `/workspace/aset_sungai_kincir/` | `aset_sungai_kincir_v001.zip` | ✅ selesai |
| Bab 9a | E01 | Tebing Berlapis | `/workspace/aset_tebing_berlapis/` | `aset_tebing_berlapis_v001.zip` | ✅ selesai |
| Bab 9b | E02 | Mata Air | `/workspace/aset_mata_air/` | `aset_mata_air_v001.zip` | ✅ selesai |
| Bab 9c | E03 | Pos Siaga | `/workspace/aset_pos_siaga/` | `aset_pos_siaga_v001.zip` | ✅ selesai (lihat catatan bug tata letak kode) |
| Bersama | – | gerbang_peta, jalan_lebar 2.2 m, pohon, tunggul, batang_kayu, kolam, awan | `/workspace/aset_bersama/` | `aset_bersama_v002.zip` (v001 disimpan) | ✅ final |

Setiap folder bab berisi: `<aset>/export/*.glb` (untuk game), `<aset>/source/*.blend + stats.json`, `<aset>/preview/*.png`, `overview_scene.png` / `overview_uji.png` / `overview_rumah.png`, `contact_sheet.png`, `README_aset.md`, manifest JSON, `_ref/konsep_*.png`, `_survey/`, `_builder/overview_scene.blend`. Zip bab Bab 3+ sudah menyertakan folder `aset_bersama`.

### Aset per bab (Bab 3–9c)
| Bab | Rumah | Stasiun | Arena | Landmark penjaga | Isian khas |
|---|---|---|---|---|---|
| H01 | pondok_rimba | stasiun_ekosistem | panggung_uji (#2f9e6b) | Kolam_Kecil (tepi kolam) | jamur, batu_lumut, lantai_hutan, kit_hutan |
| H02 | rumah_ladang | stasiun_rantai_makanan | panggung_uji (#65a30d) | lumbung_padi | petak_ladang, orang_orangan_sawah, jerami, lantai_ladang, kit_ladang |
| H03 | rumah_kembang | stasiun_simbiosis | panggung_uji (#0d9488) | pohon_besar | bunga, sarang_lebah, lantai_taman, kit_taman |
| H04 | rumah_persemaian | stasiun_persemaian | panggung_uji (#15803d) | jembatan_rusak | bibit_pot, bedengan, tumpukan_kayu, lantai_persemaian, kit_persemaian |
| F03 | bengkel_empu | stasiun_magnet | panggung_uji (#dc2626) | bukit_puncak | magnet_raksasa, batu_besi, lantai_bukit, kit_bukit |
| F04 | rumah_kincir | stasiun_listrik | panggung_uji (#2563eb) | gardu_listrik | kincir_air (animasi), tiang_listrik, sungai, lantai_sungai, kit_sungai |
| E01 | pos_pendaki | stasiun_litosfer | panggung_uji (#78716c) | tebing_berlapis (varian Tangga) | gunung_api, batu_kapur, lantai_tebing, kit_tebing |
| E02 | rumah_mata_air | stasiun_hidrosfer | panggung_uji (#0ea5e9) | menara_cuaca (anemometer berputar) | air_terjun, lantai_mata_air, kit_mata_air |
| E03 | pos_siaga | stasiun_siklus_air | panggung_uji (#0891b2) | bukit_titik_kumpul | papan_evakuasi, karung_pasir, lantai_siaga, kit_siaga |

Dipakai ulang di semua bab (tidak dibuat ulang): `aset_bersama/gerbang_peta`, `aset_bersama/jalan_lebar`, `aset_bersama/{pohon,tunggul,batang_kayu,kolam,awan}`, `aset_goa_sinar/{tiang_obor,pagar_kayu,semak,batu_kecil}`.

## Builder
- Palet + helper dasar: `/workspace/aset_goa_sinar/_builder/aset_core.py` (dipakai semua bab; aksen & rumput per kode: `Aksen_<KODE>`, `Rumput_<KODE>`).
- Bab 2: `/workspace/aset_lembah_gema/_builder/build_lembah.py`.
- Bab 3–9c: `/workspace/aset_bersama/_builder/` → `aset_lib.py` (helper, rumah pendopo, alas stasiun, arena uji, lantai), `build_alam.py` (isian alam bersama), `build_bab.py -- <KODE> <aset|all|kit>`, `overview_bab.py -- <KODE>`, `finalize_bab.py <KODE>|bersama`, `validate_all.sh <folder…>`.

## Pemetaan NPC (semua cocok dengan 20 NPC yang ada — tidak perlu NPC baru)
| Bab | Penjaga (game) | NPC kita | Cantrik (game) | NPC kita |
|---|---|---|---|---|
| 1 F01 Goa Sinar | Mbok Sinar (P) | **18 nenek_pelita** | Cantrik Prisma (L) | **09 cantrik_prisma** |
| 2 F02 Lembah Gema | Ki Gaung (L) | **19 kakek_kentongan** | Cantrik Gendhing (P) | **10 cantrik_garpu_tala** |
| 3 H01 Pondok Tepi Hutan | Nini Rimba (P) | **02 nenek_kupu** | Cantrik Lumut (L) | **13 cantrik_kaca_pembesar** |
| 4 H02 Ladang dan Lumbung | Ki Lumbung (L) | **03 kakek_padi** | Cantrik Walang (P) | **14 cantrik_belalang** |
| 5 H03 Taman Bunga | Nyai Kembang (P) | **04 ibu_bunga** | Cantrik Tawon (L) | **15 cantrik_kenikir** |
| 6 H04 Persemaian | Eyang Wana (L) | **05 kakek_bibit** | Cantrik Tunas (P) | **16 cantrik_kecambah** |
| 7 F03 Bukit Batu Besi | Empu Wesi (L) | **20 kakek_pandai_besi** | Cantrik Kutub (L) | **11 cantrik_magnet** |
| 8 F04 Sungai Kincir | Mbah Kilat (L) | **01 penjaga_lentera** | Cantrik Dinamo (P) | **12 cantrik_lampu** |
| 9a E01 Tebing Berlapis | Ibu Pertiwi (P) | **17 ibu_batu** | Cantrik Watu (L) | **06 cantrik_batu** |
| 9b E02 Mata Air | Ibu Pertiwi (P) | **17 ibu_batu** | Cantrik Mega (P) | **07 cantrik_awan** |
| 9c E03 Pos Siaga | Ibu Pertiwi (P) | **17 ibu_batu** | Cantrik Banyu (L) | **08 cantrik_peta** |

## Catatan untuk programmer
- Arena `panggung_uji` (semua bab): sembunyikan `Api_k_Nyala` saat load (glTF tidak punya flag hidden), tampilkan per jawaban benar.
- **Bug tata letak di kode live (E03)**: danau `h(-12,-12)` dan bukit `(14,-14)` tidak ikut dicermin, sehingga menimpa rumah dan arena. Di overview bukit dipindah ke samping arena dan danau ke tanah kosong (lihat README Pos Siaga).
