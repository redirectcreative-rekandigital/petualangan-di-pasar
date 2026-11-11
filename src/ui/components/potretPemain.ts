import * as THREE from 'three';
import { cobaAvatarGlb } from '../../world/avatarModel';
import type { PilihanKostum } from '../../world/kostum';
import type { PlayerGender } from '../../../shared/types';
import { pasangLampuPreview } from './karakterPreview';

/** Sisi gambar (px): dua kali ukuran terbesar `.vn-potret` agar tajam di layar rapat. */
const SISI = 160;
const cache = new Map<string, Promise<string | null>>();

async function render(gender: PlayerGender, kostum?: PilihanKostum): Promise<string | null> {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  try {
    renderer.setSize(SISI, SISI, false);
    renderer.setClearColor(0x000000, 0);
    const model = await cobaAvatarGlb(gender, renderer, kostum);
    if (!model) return null;
    const scene = new THREE.Scene();
    pasangLampuPreview(scene);
    scene.add(model.group);
    model.group.rotation.y = 0.35;
    // 0,2 detik melewati fade-in Idle (0,18 detik), jadi bukan pose ikat.
    model.update(0, 0.2);
    const fov = 22;
    const pusatY = model.tinggi * 0.84;
    const jarak = (model.tinggi * 0.23) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 50);
    camera.position.set(0, pusatY, jarak);
    camera.lookAt(0, pusatY, 0);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    model.dispose();
    return url;
  } catch {
    return null;
  } finally {
    // Sekali pakai: browser membatasi jumlah konteks WebGL aktif.
    renderer.dispose();
    renderer.forceContextLoss();
  }
}

/** Gambar kepala avatar GLB pemain (data URL), atau null bila tidak bisa dirender. */
export function potretPemain(gender: PlayerGender, kostum?: PilihanKostum): Promise<string | null> {
  const kunci = `${gender}:${JSON.stringify(kostum ?? null)}`;
  const ada = cache.get(kunci);
  if (ada) return ada;
  const janji = render(gender, kostum).then((url) => {
    if (!url) cache.delete(kunci);
    return url;
  });
  cache.set(kunci, janji);
  return janji;
}
