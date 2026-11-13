import { describe, it, expect } from 'vitest';
import { buatXlsx, crc32 } from '../src/core/xlsx';

const teks = (b: Uint8Array) => new TextDecoder().decode(b);

describe('buatXlsx', () => {
  it('crc32 sesuai nilai acuan', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('angka jadi sel angka, sisanya teks', () => {
    const isi = teks(buatXlsx([{ nama: 'Kelas', baris: [['nama', 'nilai'], ['Ani & <Budi>', '85'], ['3/5', '007']] }]));
    expect(isi).toContain('<c r="A1" t="inlineStr"><is><t xml:space="preserve">nama</t></is></c>');
    expect(isi).toContain('<c r="B2"><v>85</v></c>');
    expect(isi).toContain('Ani &amp; &lt;Budi&gt;');
    expect(isi).toContain('<c r="A3" t="inlineStr"><is><t xml:space="preserve">3/5</t></is></c>');
    expect(isi).toContain('<c r="B3" t="inlineStr"><is><t xml:space="preserve">007</t></is></c>');
  });

  it('zip berisi 6 berkas untuk 2 sheet', () => {
    const b = buatXlsx([{ nama: 'Kelas', baris: [['a']] }, { nama: 'Jawaban', baris: [['b']] }]);
    const eocd = new DataView(b.buffer, b.length - 22);
    expect(eocd.getUint32(0, true)).toBe(0x06054b50);
    expect(eocd.getUint16(10, true)).toBe(6);
    expect(teks(b)).toContain('<sheet name="Jawaban" sheetId="2" r:id="rId2"/>');
  });
});
