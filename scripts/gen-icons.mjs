// Menghasilkan ikon PNG PWA sederhana (192 & 512) tanpa pustaka eksternal.
// Menggambar lingkaran hijau dengan simbol toko sederhana memakai RGBA mentah.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, drawPixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function makeIcon(size) {
  return png(size, (x, y) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.46;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist > r) return [0, 0, 0, 0];
    // Lingkaran hijau.
    const green = [31, 111, 74, 255];
    // Simbol tas putih di tengah.
    const bw = size * 0.42;
    const bh = size * 0.32;
    const bx = cx - bw / 2;
    const by = cy - bh / 2 + size * 0.04;
    if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) return [255, 247, 230, 255];
    // Gagang tas (busur).
    const gx = x - cx;
    const gy = y - (by - size * 0.03);
    const gr = size * 0.16;
    if (gy < 0 && Math.abs(Math.hypot(gx, gy) - gr) < size * 0.035) return [255, 247, 230, 255];
    return green;
  });
}

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'icon-192.png'), makeIcon(192));
writeFileSync(resolve(outDir, 'icon-512.png'), makeIcon(512));
console.log('Ikon PNG dibuat: icon-192.png, icon-512.png');
