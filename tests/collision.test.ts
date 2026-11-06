import { describe, it, expect } from 'vitest';
import { closestPointOnBox, circleIntersectsBox, resolveCircleBox, resolveAll, clampToMap } from '../src/world/collision';

const box = (minX: number, maxX: number, minZ: number, maxZ: number) => ({ minX, maxX, minZ, maxZ });

describe('closestPointOnBox', () => {
  it('menemukan titik terdekat di dalam kotak', () => {
    expect(closestPointOnBox(box(0, 10, 0, 10), 5, 5)).toEqual({ x: 5, z: 5 });
  });
  it('menjepit titik di luar kotak ke tepi', () => {
    expect(closestPointOnBox(box(0, 10, 0, 10), -5, 12)).toEqual({ x: 0, z: 10 });
  });
});

describe('circleIntersectsBox', () => {
  it('bertabrakan saat tumpang tindih', () => {
    expect(circleIntersectsBox({ x: 5, z: 5, r: 1 }, box(0, 10, 0, 10))).toBe(true);
  });
  it('tidak bertabrakan saat jauh', () => {
    expect(circleIntersectsBox({ x: 20, z: 20, r: 1 }, box(0, 10, 0, 10))).toBe(false);
  });
  it('bertabrakan saat hanya menyentuh tepi', () => {
    expect(circleIntersectsBox({ x: 11, z: 5, r: 2 }, box(0, 10, 0, 10))).toBe(true);
  });
});

describe('resolveCircleBox', () => {
  it('tidak mengubah posisi jika tidak bertabrakan', () => {
    const out = resolveCircleBox({ x: 20, z: 20, r: 1 }, box(0, 10, 0, 10));
    expect(out).toEqual({ x: 20, z: 20 });
  });
  it('mendorong pemain keluar dari dinding', () => {
    const out = resolveCircleBox({ x: 11, z: 5, r: 2 }, box(0, 10, 0, 10));
    expect(out.x).toBeGreaterThanOrEqual(12 - 1e-6);
  });
});

describe('resolveAll', () => {
  it('pemain tidak berada di dalam kotak setelah collision diselesaikan', () => {
    const kotak = [box(-2, 2, -2, 2), box(4.5, 7.5, -1.5, 1.5)];
    for (const spot of [{ x: 0.5, z: 0.2, r: 1 }, { x: 6, z: 0.4, r: 1 }]) {
      const out = resolveAll(spot, kotak);
      for (const c of kotak) {
        const p = closestPointOnBox(c, out.x, out.z);
        expect(Math.hypot(out.x - p.x, out.z - p.z)).toBeGreaterThan(0.5);
      }
    }
  });
});

const HALF = 20;

describe('clampToMap', () => {
  it('menjepit posisi ke dalam batas area', () => {
    expect(clampToMap(100, 100, HALF, 1)).toEqual({ x: HALF - 1, z: HALF - 1 });
    expect(clampToMap(-100, -100, HALF, 1)).toEqual({ x: -(HALF - 1), z: -(HALF - 1) });
    expect(clampToMap(3, 4, HALF, 1)).toEqual({ x: 3, z: 4 });
  });
});

