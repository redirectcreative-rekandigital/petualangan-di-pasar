/**
 * Penulis .xlsx minimal tanpa dependensi: tiap sheet berisi sel polos
 * (inline string atau angka), dibungkus ZIP tanpa kompresi.
 */

export interface Sheet {
  nama: string;
  baris: string[][];
}

// Angka murni tanpa nol di depan (kode seperti "007" tetap teks), maks 15 digit agar presisi Excel aman.
const ANGKA = /^-?(0|[1-9]\d{0,14})(\.\d+)?$/;

function escXml(s: string): string {
  return s
    // eslint-disable-next-line no-control-regex -- karakter kontrol tidak sah di XML, sengaja dibuang
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function kolom(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function sel(v: string, ref: string): string {
  if (v === '') return '';
  if (ANGKA.test(v)) return `<c r="${ref}"><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;
}

function xmlSheet(baris: string[][]): string {
  const isi = baris
    .map((r, i) => `<row r="${i + 1}">${r.map((v, j) => sel(v, `${kolom(j)}${i + 1}`)).join('')}</row>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${isi}</sheetData></worksheet>`;
}

export function buatXlsx(sheets: Sheet[]): Uint8Array<ArrayBuffer> {
  const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const R_DOC = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const berkas: [string, string][] = [
    [
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    ],
    [
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_REL}"><Relationship Id="rId1" Type="${R_DOC}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R_DOC}"><sheets>${sheets.map((s, i) => `<sheet name="${escXml(s.nama)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    ],
    [
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_REL}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${R_DOC}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
    ],
    ...sheets.map((s, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, xmlSheet(s.baris)]),
  ];
  return zipTanpaKompresi(berkas);
}

let tabelCrc: Uint32Array | undefined;
export function crc32(data: Uint8Array): number {
  if (!tabelCrc) {
    tabelCrc = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tabelCrc[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of data) crc = tabelCrc[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipTanpaKompresi(berkas: [string, string][]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const lokal: Uint8Array[] = [];
  const pusat: Uint8Array[] = [];
  let offset = 0;
  for (const [nama, teks] of berkas) {
    const n = enc.encode(nama);
    const d = enc.encode(teks);
    const crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true); // nama berkas UTF-8
    h.setUint16(12, 0x21, true); // tanggal 1980-01-01; tanggal 0 tidak sah di format DOS
    h.setUint32(14, crc, true);
    h.setUint32(18, d.length, true);
    h.setUint32(22, d.length, true);
    h.setUint16(26, n.length, true);
    lokal.push(new Uint8Array(h.buffer), n, d);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, d.length, true);
    c.setUint32(24, d.length, true);
    c.setUint16(28, n.length, true);
    c.setUint32(42, offset, true);
    pusat.push(new Uint8Array(c.buffer), n);
    offset += 30 + n.length + d.length;
  }
  const ukuranPusat = pusat.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, berkas.length, true);
  e.setUint16(10, berkas.length, true);
  e.setUint32(12, ukuranPusat, true);
  e.setUint32(16, offset, true);
  const bagian = [...lokal, ...pusat, new Uint8Array(e.buffer)];
  const hasil = new Uint8Array(offset + ukuranPusat + 22);
  let p = 0;
  for (const b of bagian) {
    hasil.set(b, p);
    p += b.length;
  }
  return hasil;
}
