# Pipeline Aset 3D — Petualangan di Pasar

Dokumen ini menjelaskan cara menyiapkan model 3D (glTF/GLB) agar ringan di HP,
mengikuti pendekatan eksperimen WebGL "Summer Afternoon" (DRACO + KTX2/Basis +
instancing + LOD).

## Di mana aset disimpan

```
public/assets/
├─ models/          # berkas .glb / .gltf (dimuat saat permainan)
└─ libs/
   ├─ draco/gltf/   # decoder kompresi geometri (sudah tersalin dari three)
   └─ basis/        # transcoder kompresi tekstur KTX2 (sudah tersalin)
```

Aset di `public/` **tidak ikut** ke dalam bundel JS, jadi tidak membengkakkan
kode utama. Hanya diunduh saat dibutuhkan.

## Alur ekspor yang disarankan

1. **Model di Blender** (low-poly, satuan meter, origin di kaki objek, +Y ke atas).
2. **Tekstur** disiapkan lalu dikompres ke **KTX2 (Basis/UASTC)** untuk GPU:
   - ETC1S: paling kecil, cocok untuk warna dasar/pola.
   - UASTC: kualitas lebih tinggi, cocok untuk normal map.
3. **Ekspor ke glTF 2.0 (.glb)** dengan pengaturan:
   - Centang **Draco** (kompresi geometri, level ~6).
   - Centang **+Y Up**, skala 1.0.
   - Tanpa kamera/lampu bawaan.
4. (Opsional) Kompresi mesh tambahan dengan **Meshopt** — sudah didukung loader.
5. Simpan berkas ke `public/assets/models/` (mis. `warung.glb`, `pohon.glb`).

## Cara memakai di kode

```ts
import { loadModel, klonModel } from './world/loaders';

// renderer dipakai agar KTX2 tahu dukungan GPU perangkat
const gltf = await loadModel('warung.glb', renderer);
const warung = klonModel(gltf);      // klon aman untuk banyak instance
warung.position.set(0, 0, -9);
scene.add(warung);
```

## Aturan agar tetap lancar di HP

- **Ukuran**: target < 2 MB per model setelah kompresi; total aset < ~15 MB.
- **Jumlah poligon**: 500–3.000 segitiga per objek kecil; hindari > 20.000.
- **Instancing**: untuk ribuan objek berulang (pohon, batu, peti) pakai
  `InstancedMesh` — lihat `src/world/instancing.ts`.
- **LOD**: sediakan versi ringkas untuk objek yang terlihat dari jauh.
- **Bahan**: utamakan **MeshStandardMaterial** sederhana; hindari banyak lampu.
- **Bayangan**: biarkan nonaktif (proyek ini memakai tone mapping + fog, bukan
  shadow map real-time) demi performa.

## Fallback

Bila decoder tidak tersedia atau model gagal dimuat, permainan tetap berjalan:
penghias bawaan dari geometri dasar (`instancing.ts`) selalu ada, sehingga dunia
tidak pernah kosong. Selalu bungkus `loadModel` dengan `try/catch` untuk aset
opsional.
