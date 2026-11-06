import { readFileSync } from 'node:fs';
import { questionBankSchema } from '../src/data/schema.ts';

const files = ['H01', 'H02', 'H03', 'H04', 'F01', 'F02', 'F03', 'F04', 'E01', 'E02', 'E03', 'final'];
const all: unknown[] = [];
for (const f of files) {
  const raw = JSON.parse(readFileSync(`src/data/questions-ipa/${f}.json`, 'utf8'));
  all.push(...raw);
  console.log(`${f}.json: ${raw.length} soal`);
}

const parsed = questionBankSchema.safeParse(all);
if (!parsed.success) {
  console.log('\n=== VALIDASI GAGAL ===');
  for (const i of parsed.error.issues) console.log('-', i.message);
  process.exit(1);
}
console.log(`\nTotal: ${parsed.data.length} soal, skema OK`);

// Silang-cek
let errors = 0;
const ids = new Set<string>();
for (const q of parsed.data) {
  if (ids.has(q.id)) {
    console.log(`ID duplikat: ${q.id}`);
    errors++;
  }
  ids.add(q.id);

  if (typeof q.answer !== 'string') {
    console.log(`${q.id}: answer bukan string`);
    errors++;
  } else {
    const match = (q.options ?? []).filter((o) => o === q.answer).length;
    if (match !== 1) {
      console.log(`${q.id}: answer cocok ${match}x di opsi`);
      errors++;
    }
  }
}

// Jumlah soal per balai
const perBalai: Record<string, number> = {};
for (const q of parsed.data) perBalai[q.balai] = (perBalai[q.balai] || 0) + 1;
console.log('\nJumlah soal per balai:');
for (const [k, v] of Object.entries(perBalai).sort()) console.log(`  ${k}: ${v}`);

console.log(errors === 0 ? '\nSemua silang-cek LULUS' : `\n${errors} masalah ditemukan`);
process.exit(errors === 0 ? 0 : 1);
