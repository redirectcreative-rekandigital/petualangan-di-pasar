import type { ColliderBox } from './mapConfig';

/**
 * Collision sederhana: lingkaran pemain vs kotak balai/pagar.
 * Pendekatan: cari titik terdekat pada kotak ke pusat lingkaran, lalu
 * dorong pemain keluar jika jaraknya lebih kecil dari radius.
 */

export interface Circle {
  x: number;
  z: number;
  r: number;
}

/** Titik terdekat pada kotak ke sebuah titik. */
export function closestPointOnBox(box: ColliderBox, x: number, z: number): { x: number; z: number } {
  return {
    x: Math.max(box.minX, Math.min(x, box.maxX)),
    z: Math.max(box.minZ, Math.min(z, box.maxZ)),
  };
}

export function circleIntersectsBox(circle: Circle, box: ColliderBox): boolean {
  const p = closestPointOnBox(box, circle.x, circle.z);
  const dx = circle.x - p.x;
  const dz = circle.z - p.z;
  return dx * dx + dz * dz < circle.r * circle.r;
}

/**
 * Menyelesaikan collision: jika lingkaran menembus kotak, geser pusatnya
 * ke tepi terdekat. Mengembalikan posisi baru.
 */
export function resolveCircleBox(circle: Circle, box: ColliderBox): { x: number; z: number } {
  if (!circleIntersectsBox(circle, box)) return { x: circle.x, z: circle.z };

  const p = closestPointOnBox(box, circle.x, circle.z);
  let dx = circle.x - p.x;
  let dz = circle.z - p.z;
  const distSq = dx * dx + dz * dz;

  // Jika pusat tepat di dalam kotak, dorong ke sisi terdekat.
  if (distSq < 1e-9) {
    const left = Math.abs(circle.x - box.minX);
    const right = Math.abs(box.maxX - circle.x);
    const top = Math.abs(circle.z - box.minZ);
    const bottom = Math.abs(box.maxZ - circle.z);
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: box.minX - circle.r, z: circle.z };
    if (min === right) return { x: box.maxX + circle.r, z: circle.z };
    if (min === top) return { x: circle.x, z: box.minZ - circle.r };
    return { x: circle.x, z: box.maxZ + circle.r };
  }

  const dist = Math.sqrt(distSq);
  dx /= dist;
  dz /= dist;
  const push = circle.r - dist;
  return { x: circle.x + dx * push, z: circle.z + dz * push };
}

/** Menyelesaikan collision terhadap beberapa kotak sekaligus. */
export function resolveAll(circle: Circle, boxes: ColliderBox[]): { x: number; z: number } {
  let current = { x: circle.x, z: circle.z };
  for (const b of boxes) {
    const next = resolveCircleBox({ x: current.x, z: current.z, r: circle.r }, b);
    current = next;
  }
  return current;
}

/** Membatasi posisi agar tetap di dalam area peta. */
export function clampToMap(x: number, z: number, half: number, margin: number): { x: number; z: number } {
  const limit = half - margin;
  return {
    x: Math.max(-limit, Math.min(limit, x)),
    z: Math.max(-limit, Math.min(limit, z)),
  };
}
