# NPC Kitab Sembilan Penjaga — v001

20 NPC kotak-kotak (blocky), dibangun prosedural di Blender 4.2 (headless) dari skrip yang sama dengan
player_boy/player_girl. **Kerangka tulang identik (19 bone, nama sama dengan pemain)**, jadi semua
NPC bisa memakai kode animasi/penanganan yang sama di game.

| Tipe | NPC | Klip |
|---|---|---|
| Penjaga (dewasa/lansia, 9) | 01–05, 17–20 | `Idle`, `Walk` (0,5 m/s), `Talk` (loop), `Interact` (sekali) |
| Cantrik (anak, 11) | 06–16 | `Idle`, `Talk` (loop), `Interact` (sekali) — tanpa Walk |

* `Idle`, `Walk`, `Talk` → `LoopRepeat`; `Interact` → `LoopOnce` + `clampWhenFinished = true`, lalu kembali ke `Idle`
  (frame terakhir Interact = frame 0 Idle, jadi crossfade mulus).
* `Interact`: salam (tangan bebas ke dada + menunduk sedikit), lalu **menyodorkan properti ke arah pemain** (+Z), kembali ke Idle. 3,0 dtk.
* Properti = mesh terpisah bernama `Prop_<jenis>` yang menjadi child node tulang `RightHand`/`LeftHand`
  (bisa disembunyikan: `model.getObjectByName('Prop_lantern').visible = false`).
  Kaca lentera, bohlam, pelita, prisma, dll. memakai emissive (`KHR_materials_emissive_strength`) — tambahkan
  PointLight di game bila ingin cahaya nyata.
* Skala: Penjaga lansia ×1,10, ibu ×1,07, cantrik ×1,00 (= ukuran pemain). Skala ada di node root rig;
  kecepatan Walk sudah dikompensasi supaya 0,5 m/s di dunia.
* Menghadap +Z, berdiri di y = 0, satuan meter. Semua < 8k segitiga, validator glTF 0 error
  (1 warning `NODE_SKINNED_MESH_NON_ROOT`, sama seperti GLB pemain yang sudah disetujui — aman di three.js).

## File
* `npc_manifest_v001.json` — daftar file, tipe, klip, segitiga, properti, tinggi.
* `npc_3d_contact_sheet.png` — 20 render 3D.
* `<NN_nama>/export/npc_<nama>_v001.glb`, `source/*.blend`, `source/textures/`, `preview/{front,threequarter,side,back}.png`,
  `preview/contact_sheet_vs_konsep.png` (konsep + potret + 4 tampilan).
* NPC 01 tetap di folder pilot `penjaga_01_lentera/` dengan nama `npc_penjaga_lentera_v001.glb` (+ `walk_preview.mp4`, `animation_preview.mp4`).
* `reference/contact_sheet_npc.png`, `reference/npc_mapping.md` — peta 20 potret.

## Builder parametris (`builder/`)
* `npc_configs.py` — satu config per karakter: warna kulit, wajah (kacamata, alis, kerutan, mulut), penutup kepala
  (`udeng` / `blangkon` / `hijab` / `caping`), rambut, jenggot (`full`/`long`/`goatee`/`short`), atasan (`shirt`/`tunic`/`tunic_short`/`coat`,
  lengan panjang/pendek, motif `stripes`/`lurik`/`batik`), bawahan (`pants`/`skirt`), sepatu, ekstra (`sash`, `selendang`, `toolbelt`,
  `cloud`, `grasshopper`, `bee`), gaya pegangan (`hang_r`, `front_both`, `front_r`, `two`, `pot_cane`), dan properti.
* `npc_props.py` — pustaka 24 properti. `npc_anim.py` — klip + IK lengan numerik (tangan memegang target, properti tetap tegak).
* `npc_core.py`, `npc_anim_utils.py` — helper yang diambil apa adanya dari skrip pemain (bevel box, weight, IK kaki, make_action).
* Bangun satu NPC: `builder/run_npc.sh <nama_config>`; render: `blender -b <blend> --python builder/render_npc.py -- <nama> views`.
  NPC baru = tambah satu entri `add(...)`/`kid(...)` di `npc_configs.py`.

## Viewer
`character_player_boy/viewer` → menu tarik-turun "— NPC —" memuat ke-20 NPC (panel kostum disembunyikan untuk NPC).
