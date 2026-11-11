/**
 * Kompres semua model 3D untuk HP RAM kecil:
 *   aset-sumber/models/**.glb  (asli, tidak ter-deploy)
 *     -> public/assets/models/**.glb  (yang dimuat game)
 *
 * Langkah per berkas:
 *   1. Tekstur -> KTX2/ETC1S, sisi maks 512 px. Tetap terkompresi di GPU
 *      (tekstur 1024 PNG = 5,6 MB VRAM; KTX2 512 = ~0,2 MB).
 *   2. Geometri & animasi -> Meshopt (EXT_meshopt_compression), KECUALI berkas
 *      isian/kit. Kuantisasi Meshopt memindahkan skala ke transform node,
 *      sedangkan `tanam()` di asetBab.ts memakai geometri kit tanpa transform
 *      nodenya (InstancedMesh), jadi kit akan salah ukuran/posisi.
 *
 * Prasyarat: `ktx` (KTX-Software 4.3+) ada di PATH. Unduh dari
 * https://github.com/KhronosGroup/KTX-Software/releases
 *
 * Jalankan:  npm run kompres:model            (semua berkas)
 *            npm run kompres:model -- npc     (hanya yang path-nya memuat "npc")
 */
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';

const SUMBER = 'aset-sumber/models';
const TUJUAN = 'public/assets/models';
const CLI = ['--yes', '@gltf-transform/cli@4.5.1'];
const PARALEL = 4;

if (spawnSync('ktx', ['--version'], { shell: true }).status !== 0) {
  console.error('[kompres] `ktx` tidak ditemukan di PATH. Pasang KTX-Software dulu (lihat komentar di atas berkas ini).');
  process.exit(1);
}

/** Berkas isian/kit (lihat ISIAN_BERSAMA & argumen isian `def(...)` di asetBab.ts). */
function berkasKit() {
  const src = readFileSync('src/world/asetBab.ts', 'utf8');
  const nama = [];
  const bersama = /const ISIAN_BERSAMA = \[([\s\S]*?)\];/.exec(src)?.[1] ?? '';
  for (const m of bersama.matchAll(/'([^']+)'/g)) nama.push(m[1]);
  for (const m of src.matchAll(/def\('([^']+)',[^[]*\[([^\]]*)\]/g)) {
    for (const isi of m[2].matchAll(/'([^']+)'/g)) nama.push(`${m[1]}/${isi[1]}`);
  }
  if (nama.length < 20) throw new Error(`Daftar kit dari asetBab.ts mencurigakan (${nama.length} berkas).`);
  return new Set(nama.map((p) => `lingkungan/${p}${/_v\d+$/.test(p) ? '' : '_v001'}.glb`));
}

function cariGlb(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name.startsWith('_') ? [] : cariGlb(p);
    return e.name.endsWith('.glb') ? [p] : [];
  });
}

function jalankan(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', [...CLI, ...args], { shell: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => (err += d));
    proc.on('exit', (kode) => (kode === 0 ? resolve() : reject(new Error(`${args.join(' ')}\n${err}`))));
  });
}

const kit = berkasKit();
const saring = process.argv[2];
const daftar = cariGlb(SUMBER).filter((p) => !saring || p.includes(saring));
const kerja = join(tmpdir(), `kompres-model-${process.pid}`);
mkdirSync(kerja, { recursive: true });
const q = (p) => `"${p}"`;

let total = [0, 0];
let i = 0;
async function pekerja() {
  while (i < daftar.length) {
    const asal = daftar[i++];
    const rel = relative(SUMBER, asal).split(sep).join('/');
    const tujuan = join(TUJUAN, rel);
    const sementara = join(kerja, rel.replaceAll('/', '__'));
    mkdirSync(dirname(tujuan), { recursive: true });
    await jalankan(['etc1s', q(asal), q(sementara), '--resize', '512', '--quality', '192']);
    if (kit.has(rel)) copyFileSync(sementara, tujuan);
    else await jalankan(['meshopt', q(sementara), q(tujuan)]);
    const [a, b] = [statSync(asal).size, statSync(tujuan).size];
    total = [total[0] + a, total[1] + b];
    console.log(`[kompres] ${rel}: ${(a / 1024).toFixed(0)} KB -> ${(b / 1024).toFixed(0)} KB${kit.has(rel) ? ' (kit: tekstur saja)' : ''}`);
  }
}
try {
  await Promise.all(Array.from({ length: PARALEL }, pekerja));
} finally {
  rmSync(kerja, { recursive: true, force: true });
}
console.log(`[kompres] ${daftar.length} berkas: ${(total[0] / 1048576).toFixed(1)} MB -> ${(total[1] / 1048576).toFixed(1)} MB`);
