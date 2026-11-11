import { describe, it, expect } from 'vitest';
import { sudutDi, tinggiPermukaan, TINGGI_LANTAI } from '../src/world/mercusuarWorld';

const buka = { masukTerbuka: true, terbuka: [true, true, true] };
const titik = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];

/** Berjalan memutar di tengah tangga dari sudut a0 ke a1, mengikuti tinggi permukaan. */
function putar(y: number, a0: number, a1: number, k = buka): number | null {
  let h: number | null = y;
  for (let a = a0; a <= a1 && h !== null; a += 0.02) h = tinggiPermukaan(...titik(5.6, a), h, k);
  return h;
}

describe('tangga mercusuar', () => {
  it('sudut selalu 0..2π', () => {
    expect(sudutDi(0, -1)).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('satu putaran tangga menaikkan satu lantai', () => {
    const h = putar(0, 0.05, Math.PI * 2 - 0.05);
    expect(h).toBeCloseTo(TINGGI_LANTAI, 0);
    // Ujung tangga menyambung ke lantai berikutnya.
    expect(tinggiPermukaan(...titik(4, -0.1), h as number, buka)).toBe(TINGGI_LANTAI);
  });

  it('pintu tertutup menghalangi tangga', () => {
    expect(putar(0, 0.05, 1, { masukTerbuka: true, terbuka: [false, true, true] })).toBeNull();
  });

  it('dari lantai tidak bisa melompati pagar ke tangga yang lebih tinggi', () => {
    expect(tinggiPermukaan(...titik(4.7, 1.5), 0, buka)).toBeNull();
  });

  it('dinding hanya bisa dilewati lewat pintu masuk yang terbuka', () => {
    expect(tinggiPermukaan(...titik(7, Math.PI), 0, buka)).toBe(0);
    expect(tinggiPermukaan(...titik(7, Math.PI), 0, { ...buka, masukTerbuka: false })).toBeNull();
    expect(tinggiPermukaan(...titik(7, 2), 0, buka)).toBeNull();
  });
});
