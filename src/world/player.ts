import * as THREE from 'three';
import { buatKarakter, type KarakterRig } from './karakter';
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
  dispose: () => void;
}

export function createPlayer(gender: PlayerGender = 'laki-laki'): PlayerBundle {
  const rig: KarakterRig = buatKarakter({ gender, pakaiMarker: true });
  const group = rig.group;

  const position = new THREE.Vector3(0, 0, 0);
  let facing = 0;

  const setPosition = (x: number, z: number): void => {
    position.set(x, 0, z);
    group.position.set(x, 0, z);
  };

  const faceDirection = (dx: number, dz: number, dt: number): void => {
    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return;
    const target = Math.atan2(dx, dz);
    // Interpolasi rotasi secara halus (shortest angle).
    let diff = target - facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    facing += diff * Math.min(1, dt * 12);
    group.rotation.y = facing;
  };

  const animate = (speed: number, elapsed: number): void => {
    rig.langkah(speed, elapsed);
  };

  const dispose = (): void => {
    rig.geometri.forEach((g) => g.dispose());
    rig.material.forEach((m) => m.dispose());
  };

  return { group, position, setPosition, faceDirection, animate, dispose };
}
