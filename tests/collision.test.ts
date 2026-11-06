import { describe, it, expect } from 'vitest';
import { closestPointOnBox, circleIntersectsBox, resolveCircleBox, resolveAll, clampToMap } from '../src/world/collision';
import {
  STATIC_COLLIDERS,
  BALAI_CONFIG,
  FINAL_CONFIG,
  SEMUA_BANGUNAN,
  PLAYER_START,
  HALF,
  getBangunan,
} from '../src/world/mapConfig';

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
  it('pemain tidak berada di dalam bangunan setelah collision diselesaikan', () => {
    const spots = SEMUA_BANGUNAN.map((b) => ({ x: b.position.x, z: b.position.z, r: 1.2 }));
    for (const spot of spots) {
      const out = resolveAll(spot, STATIC_COLLIDERS);
      for (const c of STATIC_COLLIDERS) {
        const p = closestPointOnBox(c, out.x, out.z);
        const dist = Math.hypot(out.x - p.x, out.z - p.z);
        expect(dist).toBeGreaterThan(0.5);
      }
    }
  });
});

describe('clampToMap', () => {
  it('menjepit posisi ke dalam batas pasar', () => {
    expect(clampToMap(100, 100, HALF, 1)).toEqual({ x: HALF - 1, z: HALF - 1 });
    expect(clampToMap(-100, -100, HALF, 1)).toEqual({ x: -(HALF - 1), z: -(HALF - 1) });
    expect(clampToMap(3, 4, HALF, 1)).toEqual({ x: 3, z: 4 });
  });
});

describe('konfigurasi peta versi balai', () => {
  it('memiliki 16 balai + 1 Pasar Ramai', () => {
    expect(BALAI_CONFIG).toHaveLength(16);
    expect(SEMUA_BANGUNAN).toHaveLength(17);
    expect(FINAL_CONFIG.kode).toBe('FINAL');
  });

  it('setiap bangunan punya penjaga dan dialog', () => {
    for (const b of SEMUA_BANGUNAN) {
      expect(b.penjaga.length, b.kode).toBeGreaterThan(0);
      expect(b.dialog.length, b.kode).toBeGreaterThan(0);
    }
  });

  it('kode balai unik', () => {
    const kode = SEMUA_BANGUNAN.map((b) => b.kode);
    expect(new Set(kode).size).toBe(kode.length);
  });

  it('getBangunan mengembalikan balai sesuai kode', () => {
    expect(getBangunan('B01')?.elemen).toBe('Bilangan');
    expect(getBangunan('G05')?.elemen).toBe('Geometri');
    expect(getBangunan('D02')?.elemen).toBe('Data');
    expect(getBangunan('FINAL')?.nama).toBe('Pasar Ramai');
  });

  it('titik awal pemain berada di dalam pasar dan tidak di dalam collider', () => {
    expect(Math.abs(PLAYER_START.x)).toBeLessThan(HALF);
    expect(Math.abs(PLAYER_START.z)).toBeLessThan(HALF);
    const inside = STATIC_COLLIDERS.some((c) =>
      circleIntersectsBox({ x: PLAYER_START.x, z: PLAYER_START.z, r: 1 }, c),
    );
    expect(inside).toBe(false);
  });
});
