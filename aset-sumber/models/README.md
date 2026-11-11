# aset-sumber/models/

Berkas model 3D **glTF/GLB asli** (belum dikompres). Folder ini **tidak ter-deploy**.
Setelah menambah atau mengubah berkas di sini, jalankan `npm run kompres:model`: hasilnya
(tekstur KTX2 512 px + Meshopt) ditulis ke `public/assets/models/`, yang dimuat game.
Prasyarat: `ktx` dari [KTX-Software](https://github.com/KhronosGroup/KTX-Software/releases) ada di PATH.

Folder `_backup_lama/` berisi cadangan dan tidak ikut dikompres.

Panduan ekspor & optimasi (DRACO + KTX2), cara memuat, dan aturan performa ada di
[`docs/pipeline-aset-3d.md`](../../docs/pipeline-aset-3d.md).

Catatan: permainan tetap berjalan meski folder ini kosong — penghias dunia dibuat
dari geometri dasar lewat `src/world/instancing.ts`.

## Avatar pemain (opsional)

Bila Anda punya model avatar hasil generator 3D (Meshy / Tripo3D / CSM), simpan
dengan nama **tepat** seperti ini:

| Berkas | Dipakai untuk |
| --- | --- |
| `player_male.glb` | Avatar laki-laki |
| `player_female_hijab.glb` | Avatar perempuan berhijab |

Syarat model agar tampil benar:

- Menghadap sumbu **+Z** (arah wajah).
- Berdiri di titik asal dengan **kaki di y = 0**.
- Tinggi bebas — otomatis diskalakan ke ±2.6 satuan.
- Animasi opsional; beri nama klip `Idle`, `Walk`, `Run`.

Bila berkas tidak ada, permainan otomatis memakai karakter prosedural dari
`src/world/karakter.ts`, jadi aman untuk di-deploy sebelum model siap.
Loader-nya ada di `src/world/avatarModel.ts`.
