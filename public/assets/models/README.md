# models/

Letakkan berkas model 3D **glTF/GLB** di sini (mis. `warung.glb`, `pohon.glb`).

Panduan ekspor & optimasi (DRACO + KTX2), cara memuat, dan aturan performa ada di
[`docs/pipeline-aset-3d.md`](../../../docs/pipeline-aset-3d.md).

Catatan: permainan tetap berjalan meski folder ini kosong — penghias dunia dibuat
dari geometri dasar lewat `src/world/instancing.ts`.
