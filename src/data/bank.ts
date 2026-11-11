import { lokalkan } from '../core/bahasa';
import type { Question, BalaiId } from '../../shared/types';
import H01 from './questions-ipa/H01.json';
import H02 from './questions-ipa/H02.json';
import H03 from './questions-ipa/H03.json';
import H04 from './questions-ipa/H04.json';
import F01 from './questions-ipa/F01.json';
import F02 from './questions-ipa/F02.json';
import F03 from './questions-ipa/F03.json';
import F04 from './questions-ipa/F04.json';
import E01 from './questions-ipa/E01.json';
import E02 from './questions-ipa/E02.json';
import E03 from './questions-ipa/E03.json';
import final from './questions-ipa/final.json';

/** Seluruh soal mentah, persis seperti di berkas JSON. */
export const SOAL_MENTAH: unknown[] = [...H01, ...H02, ...H03, ...H04, ...F01, ...F02, ...F03, ...F04, ...E01, ...E02, ...E03, ...final];

/**
 * Memuat seluruh bank soal "Survival Sains".
 *
 * Bank soal ikut dibundel saat build, jadi validasi Zod (schema.ts) dijalankan
 * di test (`tests/bank.test.ts`) dan `npm run verify:bank`, bukan di HP siswa:
 * Zod + validasi 120 soal memperlambat start dan menambah ukuran JS awal.
 */
export function loadQuestionBank(): Question[] {
  return SOAL_MENTAH as Question[];
}

let cacheAsli: Question[] | null = null;
let cache: Question[] | null = null;
let indeksAsli: Map<string, Question> | null = null;

/** Bank soal asli (Bahasa Indonesia), dipakai dasbor guru & pencocokan materi. */
export function getQuestionBankAsli(): Question[] {
  if (!cacheAsli) cacheAsli = loadQuestionBank();
  return cacheAsli;
}

/** Bank soal sesuai bahasa pilihan pemain (lihat core/bahasa.ts). */
export function getQuestionBank(): Question[] {
  if (!cache) cache = lokalkan(getQuestionBankAsli());
  return cache;
}

/** Versi Bahasa Indonesia dari sebuah soal (berdasarkan id). */
export function soalAsli(id: string): Question | undefined {
  if (!indeksAsli) indeksAsli = new Map(getQuestionBankAsli().map((q) => [q.id, q]));
  return indeksAsli.get(id);
}

/** Soal-soal untuk satu balai (atau seluruhnya untuk "FINAL"). */
export function getQuestionsByBalai(balai: BalaiId): Question[] {
  return getQuestionBank().filter((q) => q.balai === balai);
}
