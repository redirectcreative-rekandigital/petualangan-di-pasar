import { questionBankSchema } from './schema';
import type { Question, BalaiId } from '../../shared/types';
import bilangan from './questions/bilangan.json';
import geometri from './questions/geometri.json';
import data from './questions/data.json';
import puncak from './questions/puncak.json';

/**
 * Memuat dan memvalidasi seluruh bank soal. Jika data tidak valid,
 * melempar error yang jelas agar mudah diperbaiki oleh guru.
 */
export function loadQuestionBank(): Question[] {
  const raw = [...bilangan, ...geometri, ...data, ...puncak];
  const parsed = questionBankSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('\n');
    throw new Error(`Bank soal tidak valid:\n${message}`);
  }
  return parsed.data as Question[];
}

let cache: Question[] | null = null;

export function getQuestionBank(): Question[] {
  if (!cache) cache = loadQuestionBank();
  return cache;
}

/** Soal-soal untuk satu balai (atau seluruhnya untuk "FINAL"). */
export function getQuestionsByBalai(balai: BalaiId): Question[] {
  return getQuestionBank().filter((q) => q.balai === balai);
}

/** Soal-soal untuk seluruh balai dalam satu elemen. */
export function getQuestionsByElemen(elemen: string): Question[] {
  return getQuestionBank().filter((q) => q.meta.elemen === elemen);
}
