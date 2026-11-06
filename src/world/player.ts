import * as THREE from 'three';
import { buatKarakter, type KarakterRig } from './karakter';
import { cobaAvatarGlb } from './avatarModel';
import type { PlayerGender } from '../../shared/types';

/**
 * Karakter pemain low-poly. Bentuknya dibuat oleh `karakter.ts` (bergaya kartun,
 * sesuai konsep islami: pria bercelana panjang, perempuan berhijab & gamis).
 *
 * Modul ini hanya mengurus posisi, rotasi, dan animasi jalan; perhitungan gerak
 * ada di world/noktahWorld.
 */

export interface PlayerBundle {
  group: THREE.Group;
  /** Titik acuan posisi (kaki) untuk kamera dan collision. */
  position: THREE.Vector3;
  setPosition: (x: number, z: number) => void;
  /** Menghadap ke arah pergerakan. */
  faceDirection: (dx: number, dz: number, dt: number) => void;
  /** Animasi jalan sederhana (ayun kaki) berdasarkan kecepatan. */
  animate: (speed: number, elapsed: number) => void;
  /**
   * Coba ganti model dengan avatar GLB bila tersedia di `public/assets/models/`.
   * Bila berkas tidak ada, pemain tetap memakai karakter prosedural.
   */
  cobaPakaiGlb: (renderer?: THREE.WebGLRenderer) => Promise<boolean>;
  dispose: () => void;
}

/** Penampilan pemain (gender + warna pakaian pilihan). */
export interface Penampilan {
  gender: PlayerGender;
  warnaPakaian?: number;
  warnaBawahan?: number;
  warnaHijab?: number;
}

export function createPlayer(penampilan: PlayerGender | Penampilan = 'laki-laki'): PlayerBundle {
  const opsi: Penampilan = typeof penampilan === 'string' ? { gender: penampilan } : penampilan;
  const rig: KarakterRig = buatKarakter({
    gender: opsi.gender,
    warnaPakaian: opsi.warnaPakaian,
    warnaBawahan: opsi.warnaBawahan,
    warnaHijab: opsi.warnaHijab,
    pakaiMarker: true,
  });
  const group = rig.group;
  // Gabungkan: wadah luar (posisi & rotasi) berisi karakter prosedural + model GLB.
  // `rig.group` dipakai sebagai anak, bukan sebagai akar, supaya menyembunyikan
  // karakter prosedural tidak ikut menyembunyikan model GLB.
  const akar = new THREE.Group();
  akar.add(group);
  // Pemain adalah satu-satunya objek yang memberi bayangan "tokoh".
  akar.traverse((o) => {
    o.castShadow = true;
  });

  const position = new THREE.Vector3(0, 0, 0);
  let facing = 0;
  // Bila model GLB berhasil dimuat, `glb` menggantikan animasi prosedural.
  let glb: Awaited<ReturnType<typeof cobaAvatarGlb>> = null;

  const setPosition = (x: number, z: number): void => {
    position.set(x, 0, z);
    akar.position.set(x, 0, z);
  };

  const faceDirection = (dx: number, dz: number, dt: number): void => {
    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return;
    const target = Math.atan2(dx, dz);
    // Interpolasi rotasi secara halus (shortest angle).
    let diff = target - facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    facing += diff * Math.min(1, dt * 12);
    akar.rotation.y = facing;
  };

  let waktuTerakhir = 0;
  const animate = (speed: number, elapsed: number): void => {
    // Model GLB diayunkan lewat klip animasinya sendiri (bila ada).
    const dt = Math.max(0, Math.min(0.1, elapsed - waktuTerakhir));
    waktuTerakhir = elapsed;
    if (glb) {
      glb.update(speed, dt);
      return;
    }
    rig.langkah(speed, elapsed);
  };

  const cobaPakaiGlb = async (renderer?: THREE.WebGLRenderer): Promise<boolean> => {
    const model = await cobaAvatarGlb(opsi.gender, renderer);
    if (!model) return false;
    glb = model;
    // Sembunyikan karakter prosedural, tampilkan model GLB di grup yang sama.
    group.visible = false;
    akar.add(model.group);
    akar.traverse((o) => {
      o.castShadow = true;
    });
    return true;
  };

  const dispose = (): void => {
    glb?.dispose();
    rig.geometri.forEach((g) => g.dispose());
    rig.material.forEach((m) => m.dispose());
  };

  return { group: akar, position, setPosition, faceDirection, animate, cobaPakaiGlb, dispose };
}
