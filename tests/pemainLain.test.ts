import { describe, it, expect } from 'vitest';
import { buatBalonSapa, pilihTerdekat } from '../src/world/pemainLain';
import type { PosisiPemain } from '../shared/net';

const pemain = (id: string, x: number): PosisiPemain => ({ id, nama: id, gender: 'laki-laki', noktah: 'F01', x, z: 0, rot: 0 });

describe('pemain lain', () => {
  it('hanya 5 terdekat yang digambar', () => {
    const daftar = [9, 1, 7, 3, 5, 2, 8].map((x) => pemain(`p${x}`, x));
    expect(pilihTerdekat(daftar, 0, 0, new Set()).map((p) => p.x)).toEqual([1, 2, 3, 5, 7]);
  });

  it('yang sedang tampil tidak tergeser oleh selisih jarak kecil', () => {
    const daftar = [pemain('lama', 5), pemain('baru', 4)];
    expect(pilihTerdekat(daftar, 0, 0, new Set(['lama']), 1).map((p) => p.id)).toEqual(['lama']);
    expect(pilihTerdekat([pemain('lama', 8), pemain('baru', 4)], 0, 0, new Set(['lama']), 1).map((p) => p.id)).toEqual(['baru']);
  });

  it('balon sapaan muncul lalu memudar', () => {
    const balon = buatBalonSapa();
    balon.tampilkan('👋');
    for (let i = 0; i < 30; i++) balon.update(1 / 30);
    expect(balon.sprite.material.opacity).toBeGreaterThan(0.9);
    for (let i = 0; i < 150; i++) balon.update(1 / 30);
    expect(balon.sprite.material.opacity).toBeLessThan(0.05);
    balon.dispose();
  });
});
