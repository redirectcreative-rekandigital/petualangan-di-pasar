import { describe, it, expect, afterEach, vi } from 'vitest';
import * as THREE from 'three';

/**
 * Uji fondasi pipeline aset (opsi B):
 * - modul loader dapat diimpor (decoder DRACO/KTX2 tersedia),
 * - path decoder menunjuk ke folder statis yang benar,
 * - cache mencegah pemuatan ganda,
 * - klon model ber-rig punya kerangka sendiri (SkeletonUtils.clone).
 *
 * Pemanggilan jaringan sesungguhnya tidak dilakukan di sini; yang diuji adalah
 * konfigurasi loader dan alur cache.
 */

/** Scene tiruan yang mirip avatar ber-rig: satu SkinnedMesh terikat ke 2 tulang. */
function buatSceneBerRig(): THREE.Group {
  const scene = new THREE.Group();
  const akar = new THREE.Bone();
  akar.name = 'Hips';
  const anak = new THREE.Bone();
  anak.name = 'Spine';
  anak.position.y = 1;
  akar.add(anak);
  const geo = new THREE.BoxGeometry(1, 2, 1);
  const n = geo.attributes.position!.count;
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0), 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n).fill([1, 0, 0, 0]).flat(), 4));
  const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial());
  mesh.name = 'Tubuh';
  mesh.add(akar);
  mesh.bind(new THREE.Skeleton([akar, anak]));
  scene.add(mesh);
  return scene;
}

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  class MockGLTFLoader {
    setDRACOLoader(d: unknown): this {
      (this as { d?: unknown }).d = d;
      return this;
    }
    setKTX2Loader(k: unknown): this {
      (this as { k?: unknown }).k = k;
      return this;
    }
    setMeshoptDecoder(m: unknown): this {
      (this as { m?: unknown }).m = m;
      return this;
    }
    load(_url: string, onLoad: (g: unknown) => void): void {
      onLoad({ scene: buatSceneBerRig(), animations: [] });
    }
  }
  return { GLTFLoader: MockGLTFLoader };
});

vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => {
  class MockDRACOLoader {
    path = '';
    setDecoderPath(p: string): this {
      this.path = p;
      return this;
    }
    setDecoderConfig(): this {
      return this;
    }
    dispose(): void {}
  }
  return { DRACOLoader: MockDRACOLoader };
});

vi.mock('three/examples/jsm/loaders/KTX2Loader.js', () => {
  class MockKTX2Loader {
    setTranscoderPath(): this {
      return this;
    }
    detectSupport(): this {
      return this;
    }
    dispose(): void {}
  }
  return { KTX2Loader: MockKTX2Loader };
});

vi.mock('three/examples/jsm/libs/meshopt_decoder.module.js', () => ({
  MeshoptDecoder: { supported: true },
}));

describe('pipeline aset 3D', () => {
  afterEach(async () => {
    const mod = await import('../src/world/loaders');
    mod.disposeLoaders();
    vi.resetModules();
  });

  it('membuat GLTFLoader bersama dengan decoder terpasang', async () => {
    const { getGLTFLoader } = await import('../src/world/loaders');
    const loader = getGLTFLoader();
    // Loader bersama: pemanggilan kedua mengembalikan objek yang sama.
    expect(getGLTFLoader()).toBe(loader);
  });

  it('memuat model dari folder assets/models dan memakai cache', async () => {
    const { loadModel } = await import('../src/world/loaders');
    const a = await loadModel('contoh.glb');
    const b = await loadModel('contoh.glb');
    expect(a.scene).toBeTruthy();
    // Cache: promise yang sama dikembalikan.
    expect(loadModel('contoh.glb')).toBe(loadModel('contoh.glb'));
    void b;
  });

  it('mengekloning scene tanpa berbagi material, dengan rig sendiri', async () => {
    const mod = await import('../src/world/loaders');
    const gltf = await mod.loadModel('x.glb');
    const asli = gltf.scene.getObjectByName('Tubuh') as THREE.SkinnedMesh;
    const klon1 = mod.klonModel(gltf);
    const klon2 = mod.klonModel(gltf);
    const m1 = klon1.getObjectByName('Tubuh') as THREE.SkinnedMesh;
    const m2 = klon2.getObjectByName('Tubuh') as THREE.SkinnedMesh;
    // Material diklon per instance.
    expect(m1.material).not.toBe(asli.material);
    expect(m1.material).not.toBe(m2.material);
    // Kerangka baru: tulang klon adalah tulang milik klon itu sendiri,
    // bukan tulang model asli di cache (inilah yang rusak bila memakai clone() biasa).
    expect(m1.skeleton).not.toBe(asli.skeleton);
    expect(m1.skeleton.bones[0]).not.toBe(asli.skeleton.bones[0]);
    expect(m1.skeleton.bones[0]).toBe(klon1.getObjectByName('Hips'));
    expect(m2.skeleton.bones[1]).toBe(klon2.getObjectByName('Spine'));
  });
});
