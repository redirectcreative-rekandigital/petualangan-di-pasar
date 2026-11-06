import { readFileSync } from 'node:fs';
import { questionBankSchema } from '../src/data/schema.ts';

const files = ['bilangan', 'geometri', 'data', 'puncak'];
let all = [];
for (const f of files) {
  const raw = JSON.parse(readFileSync(`src/data/questions/${f}.json`, 'utf8'));
  all = all.concat(raw);
  console.log(`${f}.json: ${raw.length} soal`);
}

const parsed = questionBankSchema.safeParse(all);
if (!parsed.success) {
  console.log('\n=== VALIDASI GAGAL ===');
  for (const i of parsed.error.issues) console.log('-', i.message);
  process.exit(1);
}
console.log(`\nTotal: ${all.length} soal, skema OK`);

// Cross-checks
let errors = 0;
const ids = new Set();
for (const q of all) {
  if (ids.has(q.id)) { console.log(`ID duplikat: ${q.id}`); errors++; }
  ids.add(q.id);

  if (q.type === 'mcq') {
    if (typeof q.answer !== 'string') { console.log(`${q.id}: mcq answer bukan string`); errors++; }
    else {
      const match = q.options.filter((o) => o === q.answer).length;
      if (match !== 1) { console.log(`${q.id}: mcq answer cocok ${match}x di opsi`); errors++; }
    }
  }
  if (q.type === 'mcq-complex') {
    if (!Array.isArray(q.answer)) { console.log(`${q.id}: mcq-complex answer bukan array`); errors++; }
    else {
      for (const a of q.answer) {
        if (!q.options.includes(a)) { console.log(`${q.id}: mcq-complex kunci "${a}" tak ada di opsi`); errors++; }
      }
      const uniq = new Set(q.answer);
      if (uniq.size !== q.answer.length) { console.log(`${q.id}: mcq-complex kunci duplikat`); errors++; }
      if (q.answer.length >= q.options.length) { console.log(`${q.id}: mcq-complex semua opsi benar`); errors++; }
    }
  }
  if (q.type === 'number' && typeof q.answer !== 'number') { console.log(`${q.id}: number answer bukan number`); errors++; }
}

// count per balai
const perBalai = {};
for (const q of all) perBalai[q.balai] = (perBalai[q.balai] || 0) + 1;
console.log('\nJumlah soal per balai:');
for (const [k, v] of Object.entries(perBalai).sort()) console.log(`  ${k}: ${v}`);

console.log(errors === 0 ? '\nSemua silang-cek LULUS' : `\n${errors} masalah ditemukan`);
process.exit(errors === 0 ? 0 : 1);
