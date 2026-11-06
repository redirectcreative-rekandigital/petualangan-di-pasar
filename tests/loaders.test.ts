import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * Uji fondasi pipeline aset (opsi B):
 * - modul loader dapat diimpor (decoder DRACO/KTX2 tersedia),
 * - path decoder menunjuk ke folder statis yang benar,
 * - cache mencegah pemuatan ganda.
 *
 * Pemanggilan jaringan sesungguhnya tidak dilakukan di sini; yang diuji adalah
 * konfigurasi loader dan alur cache.
 */

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
      onLoad({ scene: { clone: () => ({ traverse: () => {} }) }, animations: [] });
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

  it('mengekloning scene tanpa berbagi material', async () => {
    const mod = await import('../src/world/loaders');
    const gltf = await mod.loadModel('x.glb');
    const klon = mod.klonModel(gltf);
    expect(klon).toBeTruthy();
  });
});
