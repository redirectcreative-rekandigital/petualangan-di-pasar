/**
 * Menghasilkan bank soal IPAS Kelas 5 dari Bank_Soal_IPA_Kelas5_SD.md.
 *
 * Sumber: 9 bab × 10 soal pilihan ganda (A–D) = 90 soal.
 * Pemetaan bab -> noktah/balai:
 *   Bab 1 -> F01 (Cahaya & Mata)
 *   Bab 2 -> F02 (Bunyi & Telinga)
 *   Bab 3 -> H01 (Ekosistem)
 *   Bab 4 -> H02 (Rantai makanan)
 *   Bab 5 -> H03 (Simbiosis & hubungan antar makhluk hidup)
 *   Bab 6 -> H04 (Kelestarian ekosistem)
 *   Bab 7 -> F03 (Magnet)
 *   Bab 8 -> F04 (Listrik)
 *   Bab 9 -> E01/E02/E03 (Kenampakan bumi; soal dibagi per sub-tema)
 *
 * Babak puncak (FINAL / "Menara Kitab") mengambil 30 soal campuran dari
 * seluruh balai (dipilih merata lalu diacak secara deterministik).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = readFileSync(join(root, 'Bank_Soal_IPA_Kelas5_SD.md'), 'utf8');
const outDir = join(root, 'src', 'data', 'questions-ipa');
mkdirSync(outDir, { recursive: true });

/* ---------- Parsing markdown ---------- */

const babRe = /^# Bab (\d+): (.+)$/gm;
const babList = [];
let m;
while ((m = babRe.exec(src))) babList.push({ no: Number(m[1]), judul: m[2].trim(), index: m.index });

const soalRe = /^### \[(b(\d+)-s(\d+))\] (.+)$/gm;
const soal = [];
let s;
while ((s = soalRe.exec(src))) {
  const id = s[1];
  const bab = Number(s[2]);
  const prompt = s[4].trim();
  const start = s.index + s[0].length;
  const nextIdx = src.indexOf('### [', start);
  const block = src.slice(start, nextIdx === -1 ? src.length : nextIdx);
  const optRe = /^- ([A-D])\. (.+)$/gm;
  const options = [];
  let o;
  while ((o = optRe.exec(block))) options.push(o[2].trim());
  const jawab = /\*\*Jawaban:\*\*\s*([A-D])/.exec(block);
  if (!jawab) throw new Error(`Soal ${id}: jawaban tidak ditemukan`);
  const letter = jawab[1];
  const answer = options[letter.charCodeAt(0) - 65];
  if (options.length !== 4) throw new Error(`Soal ${id}: opsi bukan 4 (${options.length})`);
  soal.push({ id, bab, prompt, options, answer });
}

if (soal.length !== 90) throw new Error(`Jumlah soal tidak 90, dapat ${soal.length}`);

const byBab = (n) => soal.filter((q) => q.bab === n);

/* ---------- Metadata per bab ---------- */

const META = {
  1: { kodeMateri: 'F01', elemen: 'Fisika', submateri: 'Sifat cahaya & organ mata' },
  2: { kodeMateri: 'F02', elemen: 'Fisika', submateri: 'Sifat bunyi & organ telinga' },
  3: { kodeMateri: 'H01', elemen: 'Makhluk Hidup', submateri: 'Ekosistem' },
  4: { kodeMateri: 'H02', elemen: 'Makhluk Hidup', submateri: 'Rantai makanan & jaring-jaring makanan' },
  5: { kodeMateri: 'H03', elemen: 'Makhluk Hidup', submateri: 'Hubungan antar makhluk hidup' },
  6: { kodeMateri: 'H04', elemen: 'Makhluk Hidup', submateri: 'Kelestarian ekosistem' },
  7: { kodeMateri: 'F03', elemen: 'Fisika', submateri: 'Magnet' },
  8: { kodeMateri: 'F04', elemen: 'Fisika', submateri: 'Listrik' },
  9: { kodeMateri: 'E01', elemen: 'Bumi', submateri: 'Kenampakan bumi' },
};

/** Bab 9 dipecah berurutan: s01-s03 litosfer, s04-s06 hidrosfer/atmosfer, s07-s10 siklus/bumi. */
const BAB9_SOAL_KODE = {
  'b09-s01': 'E01',
  'b09-s02': 'E01',
  'b09-s03': 'E01',
  'b09-s04': 'E02',
  'b09-s05': 'E02',
  'b09-s06': 'E02',
  'b09-s07': 'E03',
  'b09-s08': 'E03',
  'b09-s09': 'E03',
  'b09-s10': 'E03',
};

const LEVEL = {
  1: 'Pemahaman',
  2: 'Penerapan',
  3: 'Penalaran',
};

function metaFor(q) {
  const base = META[q.bab];
  const kodeMateri = q.bab === 9 ? BAB9_SOAL_KODE[q.id] : base.kodeMateri;
  const elemen = kodeMateri.startsWith('H') ? 'Makhluk Hidup' : kodeMateri.startsWith('F') ? 'Fisika' : 'Bumi';
  const no = Number(q.id.split('-s')[1]);
  return {
    kodeMateri,
    elemen,
    submateri: base.submateri,
    indikator: indikator(q, no),
    levelKognitif: LEVEL[no <= 4 ? 1 : no <= 7 ? 2 : 3],
    tingkatKesulitan: no <= 3 ? 'Mudah' : no <= 7 ? 'Sedang' : 'Sulit',
  };
}

function indikator(q, no) {
  if (no <= 3) return `Mengenal konsep dasar: ${q.prompt.replace(/\.\.\.\.$/, '').trim()}`;
  if (no <= 7) return `Menerapkan konsep pada situasi: ${q.prompt.replace(/\.\.\.\.$/, '').trim()}`;
  return `Menganalisis/menyimpulkan: ${q.prompt.replace(/\.\.\.\.$/, '').trim()}`;
}

function hintFor(q, meta) {
  const a = q.answer;
  return `Ingat kembali materi "${meta.submateri}"; jawaban yang paling tepat adalah "${a}".`;
}

function explanationFor(q, meta) {
  return [
    `Kunci: ${q.answer}.`,
    `Ini sesuai materi ${meta.submateri} (materi ${meta.kodeMateri}).`,
  ];
}

function buildQuestion(q, balai) {
  const meta = metaFor(q);
  return {
    id: q.id,
    balai,
    type: 'mcq',
    prompt: q.prompt,
    options: q.options,
    answer: q.answer,
    hint: hintFor(q, meta),
    explanation: explanationFor(q, meta),
    meta,
  };
}

/* ---------- Tulis per-balai ---------- */

const BAB_TO_BALAI = { 1: 'F01', 2: 'F02', 3: 'H01', 4: 'H02', 5: 'H03', 6: 'H04', 7: 'F03', 8: 'F04' };

const perBalai = {};
for (const [bab, balai] of Object.entries(BAB_TO_BALAI)) {
  perBalai[balai] = byBab(Number(bab)).map((q) => buildQuestion(q, balai));
}
for (const kode of ['E01', 'E02', 'E03']) {
  perBalai[kode] = byBab(9)
    .filter((q) => BAB9_SOAL_KODE[q.id] === kode)
    .map((q) => buildQuestion(q, kode));
}

for (const [balai, list] of Object.entries(perBalai)) {
  writeFileSync(join(outDir, `${balai}.json`), JSON.stringify(list, null, 2) + '\n', 'utf8');
}

/* ---------- FINAL: 30 soal campuran ---------- */

const totalSoalBalai = Object.values(perBalai).reduce((n, list) => n + list.length, 0);
// Ambil merata dari semua balai (round-robin) sampai 30 soal.
const finalSoal = [];
const sisa = Object.entries(perBalai).map(([balai, list]) => ({ balai, list: [...list] }));
let putaran = 0;
while (finalSoal.length < 30) {
  let ada = false;
  for (const { list } of sisa) {
    const q = list[putaran];
    if (!q) continue;
    ada = true;
    if (finalSoal.length >= 30) break;
    finalSoal.push({ ...q, id: `final-${q.id}`, balai: 'FINAL' });
  }
  if (!ada) break;
  putaran++;
}
writeFileSync(join(outDir, 'final.json'), JSON.stringify(finalSoal, null, 2) + '\n', 'utf8');

console.log(`Selesai: ${Object.keys(perBalai).length} balai, ${totalSoalBalai} soal balai, ${finalSoal.length} soal FINAL.`);
