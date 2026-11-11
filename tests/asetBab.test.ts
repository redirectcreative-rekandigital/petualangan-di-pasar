import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
// @ts-expect-error -- @types/node sengaja tidak dipasang di proyek ini.
import { readFileSync } from 'node:fs';

/**
 * Uji daftar aset bab terhadap isi GLB sungguhan: setiap berkas ada dan setiap
 * node yang ditanam tata letak bab memang ada di berkasnya (tanam melempar
 * error bila tidak). loadModel diganti pembaca JSON GLB, tanpa WebGL.
 */
vi.mock('../src/world/loaders', () => ({
  loadModel: async (nama: string) => {
    const b = readFileSync(`public/assets/models/${nama}`);
    const g = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()) as {
      scenes: { nodes: number[] }[];
      nodes: { name: string; mesh?: number; translation?: [number, number, number]; extras?: Record<string, unknown> }[];
    };
    const scene = new THREE.Group();
    for (const i of g.scenes[0]!.nodes) {
      const n = g.nodes[i]!;
      const o = n.mesh === undefined ? new THREE.Object3D() : new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
      o.name = n.name;
      o.userData = n.extras ?? {};
      if (n.translation) o.position.fromArray(n.translation);
      scene.add(o);
    }
    return { scene, animations: [] };
  },
  klonModel: (gltf: { scene: THREE.Object3D }) => gltf.scene.clone(),
}));

describe('aset GLB tiap bab', () => {
  it('semua berkas dan node tata letak ke-11 bab tersedia', async () => {
    const { BAB, muatAsetBab, buatDuniaGlb } = await import('../src/world/asetBab');
    const { bangunLatar } = await import('../src/world/latarBalai');
    const track = <T>(o: T): T => o;
    expect(Object.keys(BAB)).toHaveLength(11);
    for (const kode of Object.keys(BAB)) {
      const scene = new THREE.Scene();
      const dunia = buatDuniaGlb(scene, await muatAsetBab(kode), 0xff0000, track);
      const pose = { x: 0, z: -6, rot: 0 };
      bangunLatar(kode, scene, dunia, track, [{ x: 0, z: 17 }, { x: -5, z: 9 }, pose], { ruang: pose, uji: { x: 10, z: -4, rot: 1 }, bebasJalur: () => true });
      dunia.selesai();
      expect(scene.children.length, kode).toBeGreaterThan(4);
    }
  });
});
