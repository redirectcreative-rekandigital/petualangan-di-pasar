import { questionBankSchema } from './schema';
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

/**
 * Memuat dan memvalidasi seluruh bank soal "Survival Sains".
 * Jika data tidak valid, melempar error yang jelas agar mudah diperbaiki.
 */
export function loadQuestionBank(): Question[] {
  const raw = [...H01, ...H02, ...H03, ...H04, ...F01, ...F02, ...F03, ...F04, ...E01, ...E02, ...E03, ...final];
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
