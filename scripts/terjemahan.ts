/**
 * Pemeriksa terjemahan Bahasa Inggris "Survival Sains".
 *
 *   npm run cek:terjemahan            → laporkan teks yang belum diterjemahkan
 *   npm run cek:terjemahan -- --perbarui
 *       → tambahkan teks baru (bernilai "") ke src/i18n/en/*.json dan hapus
 *         teks yang sudah tidak dipakai lagi.
 *
 * Teks konten dikumpulkan langsung dari data game (cerita, adegan, balai,
 * soal). Teks antarmuka dikumpulkan dari panggilan t('...') di folder src.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CERITA, NARATOR, KAPTEN, CUTSCENE_BADAI, EPILOG, FINAL_BAGIAN } from '../src/data/cerita';
import { ADEGAN } from '../src/data/adegan';
import { NOKTAH, ZONA } from '../src/data/balai';
import { getQuestionBank } from '../src/data/bank';
import { PRESET, BAGIAN } from '../src/world/kostum';
import { kunciTetap } from '../src/core/bahasa';

const akar = join(dirname(fileURLToPath(import.meta.url)), '..');
const folderKamus = join(akar, 'src', 'i18n', 'en');
const perbarui = process.argv.includes('--perbarui');

/** Teks yang perlu diterjemahkan: memuat huruf. */
const perluTerjemah = (s: string): boolean => /\p{L}/u.test(s);

function kumpulkan(data: unknown, keluar: Set<string>, kunci: string | null = null): void {
  if (kunciTetap(kunci, data)) return;
  if (typeof data === 'string') {
    if (perluTerjemah(data)) keluar.add(data);
  } else if (Array.isArray(data)) {
    for (const x of data) kumpulkan(x, keluar);
  } else if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) kumpulkan(v, keluar, k);
  }
}

function teksUi(): Set<string> {
  const hasil = new Set<string>();
  const pola = /\bt\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  const jelajah = (dir: string): void => {
    for (const nama of readdirSync(dir)) {
      const p = join(dir, nama);
      if (statSync(p).isDirectory()) jelajah(p);
      else if (p.endsWith('.ts')) {
        const isi = readFileSync(p, 'utf8');
        for (const m of isi.matchAll(pola)) {
          const s = (m[2] ?? '').replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
          if (perluTerjemah(s)) hasil.add(s);
        }
      }
    }
  };
  jelajah(join(akar, 'src'));
  return hasil;
}

const sudah = new Set<string>();
function unik(s: Set<string>): string[] {
  const out: string[] = [];
  for (const x of s) {
    if (sudah.has(x)) continue;
    sudah.add(x);
    out.push(x);
  }
  return out;
}

const kelompok: Array<[string, () => Set<string>]> = [
  [
    'cerita',
    () => {
      const s = new Set<string>();
      kumpulkan([NARATOR, KAPTEN, CERITA, CUTSCENE_BADAI, EPILOG, FINAL_BAGIAN], s);
      return s;
    },
  ],
  ['adegan', () => {
    const s = new Set<string>();
    kumpulkan(ADEGAN, s);
    return s;
  }],
  ['balai', () => {
    const s = new Set<string>();
    kumpulkan([NOKTAH, ZONA], s);
    return s;
  }],
  ['soal', () => {
    const s = new Set<string>();
    kumpulkan(getQuestionBank(), s);
    return s;
  }],
  [
    'kostum',
    () => {
      // Hanya nama tampilan (preset, label bagian, nama warna), bukan kode hex.
      const s = new Set<string>();
      for (const daftar of Object.values(PRESET)) for (const p of daftar) s.add(p.nama);
      for (const daftar of Object.values(BAGIAN))
        for (const b of daftar) {
          s.add(b.label);
          for (const w of b.swatch) s.add(w.nama);
        }
      return s;
    },
  ],
  ['ui', teksUi],
];

let totalKosong = 0;
for (const [nama, ambil] of kelompok) {
  const berkas = join(folderKamus, `${nama}.json`);
  const lama = JSON.parse(readFileSync(berkas, 'utf8')) as Record<string, string>;
  const daftar = unik(ambil());
  const kosong = daftar.filter((s) => !lama[s]);
  const usang = Object.keys(lama).filter((k) => !daftar.includes(k));
  totalKosong += kosong.length;
  console.log(`${nama.padEnd(7)} ${daftar.length - kosong.length}/${daftar.length} diterjemahkan${usang.length ? `, ${usang.length} usang` : ''}`);
  if (!perbarui && process.argv.includes('--rinci')) for (const s of kosong) console.log(`   - ${s}`);
  if (perbarui) {
    const baru: Record<string, string> = {};
    for (const s of daftar) baru[s] = lama[s] ?? '';
    writeFileSync(berkas, `${JSON.stringify(baru, null, 2)}\n`);
  }
}
if (totalKosong > 0) {
  console.log(`\n${totalKosong} teks belum diterjemahkan (tampil dalam Bahasa Indonesia).`);
  if (!perbarui) process.exitCode = 1;
} else {
  console.log('\nSemua teks sudah diterjemahkan.');
}
