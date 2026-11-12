import { describe, it, expect } from 'vitest';
import { gambarAdegan, sorotKata } from '../src/ui/halamanCerita';
import { getAdegan } from '../src/data/adegan';

const teksSorot = (nodes: Node[]): string[] =>
  nodes.filter((n): n is HTMLElement => n instanceof HTMLElement).map((n) => n.textContent ?? '');

describe('Halaman Cerita: tampilan materi', () => {
  it('kata kunci ditebalkan, termasuk kata berimbuhan', () => {
    const hasil = sorotKata('Bunyinya dipantulkan kembali dan disebut gema.', ['gema', 'pantul']);
    expect(teksSorot(hasil)).toEqual(['dipantulkan', 'gema']);
    // Teks utuh tidak berubah.
    expect(hasil.map((n) => n.textContent).join('')).toBe('Bunyinya dipantulkan kembali dan disebut gema.');
  });

  it('tanpa kata kunci: teks polos', () => {
    expect(teksSorot(sorotKata('Halo semua.', []))).toEqual([]);
  });

  it('benda bernama bisa diketuk dan memunculkan labelnya', () => {
    const adegan = getAdegan('F02')[3];
    if (!adegan) throw new Error('adegan F02 tidak ada');
    const svg = gambarAdegan(adegan, 'uji');
    const benda = svg.querySelectorAll('.bisa-ketuk');
    expect(benda.length).toBe(3);
    (benda[0] as SVGGElement).dispatchEvent(new MouseEvent('click'));
    expect(svg.querySelector('.label-ketuk')?.textContent).toBe('Gajah: infrasonik');
    // Gelombang bunyi: 3 busur per sumber.
    expect(svg.querySelectorAll('.anim-gelombang').length).toBe(6);
  });
});
