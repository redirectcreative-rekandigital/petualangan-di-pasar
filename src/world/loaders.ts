import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Pemuatan aset model 3D (glTF/GLB) yang dioptimalkan.
 *
 * Terinspirasi dari eksperimen "Summer Afternoon" yang memakai DRACO (kompresi
 * geometri) dan KTX2/Basis (kompresi tekstur GPU). Modul ini menyiapkan satu
 * GLTFLoader bersama yang:
 *   - mengurai geometri terkompresi DRACO,
 *   - mengurai tekstur KTX2/Basis,
 *   - mendukung Meshopt (kompresi mesh ringan),
 *   - memakai cache agar model yang sama tidak diunduh dua kali.
 *
 * Decoder disajikan sebagai berkas statis di `public/assets/libs/` sehingga
 * tidak ikut membengkakkan bundel JS. Bila decoder tidak ada, loader tetap
 * berjalan untuk glTF biasa (tanpa kompresi).
 */

const BASIS_PATH = `${import.meta.env.BASE_URL}assets/libs/basis/`;
const DRACO_PATH = `${import.meta.env.BASE_URL}assets/libs/draco/gltf/`;
const MODEL_BASE = `${import.meta.env.BASE_URL}assets/models/`;

let gltfLoader: GLTFLoader | null = null;
let dracoLoader: DRACOLoader | null = null;
let ktx2Loader: KTX2Loader | null = null;

/** Mengembalikan GLTFLoader bersama (dibuat sekali). */
export function getGLTFLoader(renderer?: THREE.WebGLRenderer): GLTFLoader {
  if (gltfLoader) return gltfLoader;

  dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_PATH);
  dracoLoader.setDecoderConfig({ type: 'wasm' });

  gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  if (renderer) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(BASIS_PATH);
    ktx2Loader.detectSupport(renderer);
    gltfLoader.setKTX2Loader(ktx2Loader);
  }

  return gltfLoader;
}

/** Cache hasil pemuatan agar tidak diunduh dua kali. */
const cache = new Map<string, Promise<GLTF>>();

/**
 * Memuat model glTF/GLB dari `public/assets/models/<nama>`.
 * Mengembalikan salinan klon agar satu model bisa dipakai berulang.
 */
export function loadModel(nama: string, renderer?: THREE.WebGLRenderer): Promise<GLTF> {
  const url = `${MODEL_BASE}${nama}`;
  const ada = cache.get(url);
  if (ada) return ada;

  const loader = getGLTFLoader(renderer);
  const promise = new Promise<GLTF>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err instanceof Error ? err : new Error(`Gagal memuat ${url}`)),
    );
  });
  cache.set(url, promise);
  return promise;
}

/** Mengkloning scene glTF agar bisa dipakai banyak instance secara aman. */
export function klonModel(gltf: GLTF): THREE.Object3D {
  const scene = gltf.scene.clone(true);
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : (mesh.material as THREE.Material).clone();
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
  });
  return scene;
}

/** Membersihkan loader & decoder (dipanggil saat aplikasi dibongkar). */
export function disposeLoaders(): void {
  dracoLoader?.dispose();
  ktx2Loader?.dispose();
  dracoLoader = null;
  ktx2Loader = null;
  gltfLoader = null;
  cache.clear();
}
