import { describe, it, expect } from 'vitest';
import { kabarBaik, sepuluhTeratas } from '../src/ui/screens/proyektor';
import type { RosterSiswa } from '../src/net/klien';

const s = (id: string, nama: string, alat: number, puncakLulus = false, diubahPada = '2026-01-01T00:00:00Z'): RosterSiswa => ({
  id, nama, gender: 'laki-laki', online: true, joinedAt: '', lastSeen: '',
  progress: { playerName: nama, gender: 'laki-laki', noktah: null, bintang: {}, totalBenar: 0, totalSoal: 0, visitedNoktah: [], puncakLulus, soalSalah: [], diubahPada, alat },
});

describe('tampilan proyektor', () => {
  it('kabarBaik: alat baru dan Mercusuar menyala; tanpa nilai; pembacaan pertama diam', () => {
    expect(kabarBaik([], [s('a', 'Ani', 3)])).toEqual([]);
    const k = kabarBaik([s('a', 'Ani', 3), s('b', 'Budi', 11)], [s('a', 'Ani', 4), s('b', 'Budi', 11, true)], 1000);
    expect(k.map((x) => x.teks)).toEqual(['Ani mendapat alat survival baru! 🎒', 'Budi menyalakan Mercusuar! 🎉']);
  });

  it('sepuluhTeratas: urut alat, seri → yang lebih dulu; maksimal 10', () => {
    const daftar = [s('a', 'A', 5, false, '2026-01-02T00:00:00Z'), s('b', 'B', 5, false, '2026-01-01T00:00:00Z'), s('c', 'C', 9)];
    expect(sepuluhTeratas(daftar).map((x) => x.nama)).toEqual(['C', 'B', 'A']);
    expect(sepuluhTeratas(Array.from({ length: 15 }, (_, i) => s(`s-${i}`, `N${i}`, i)))).toHaveLength(10);
  });
});
