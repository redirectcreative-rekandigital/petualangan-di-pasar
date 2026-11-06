import type { BalaiId, Question, Stars, AnswerRecord } from '../../shared/types';

/** Aturan main versi balai (struktur TKA). */
export const RULES = {
  /** Kesempatan menjawab untuk tiap soal. Habis 3x salah = soal gagal. */
  attemptsPerQuestion: 3,
  /** Jumlah soal tiap balai. */
  questionsPerBalai: 3,
  /** Jumlah soal babak puncak "Pasar Ramai". */
  questionsPuncak: 30,
  coinsCorrect: 10,
} as const;

/** Bintang per balai: 3 benar = 3, 2 = 2, 1 = 1, 0 = 0. */
export function starsForCorrect(correct: number): Stars {
  if (correct >= 3) return 3;
  if (correct >= 2) return 2;
  if (correct >= 1) return 1;
  return 0;
}

/** Balai dianggap lulus bila mendapat minimal 1 bintang. */
export function isBalaiPassed(stars: Stars): boolean {
  return stars >= 1;
}

export interface AnswerCheck {
  correct: boolean;
}

/**
 * Memeriksa jawaban pemain terhadap kunci soal.
 * - mcq / tf-reason: cocokkan string (case-insensitive, trim).
 * - mcq-complex: semua opsi benar harus dipilih, tanpa pilihan salah.
 * - number: cocokkan angka.
 * - money-drag: total nilai uang yang disusun harus sama dengan target.
 */
export function checkAnswer(question: Question, response: number | string | string[] | number[]): boolean {
  switch (question.type) {
    case 'mcq':
    case 'tf-reason':
      return normalizeText(String(response)) === normalizeText(String(question.answer));
    case 'mcq-complex': {
      if (!Array.isArray(response)) return false;
      const expected = Array.isArray(question.answer) ? question.answer : [];
      const picked = new Set(response.map((r) => normalizeText(String(r))));
      const wanted = new Set(expected.map((r) => normalizeText(String(r))));
      if (picked.size !== wanted.size) return false;
      for (const w of wanted) if (!picked.has(w)) return false;
      return true;
    }
    case 'number': {
      const value = typeof response === 'number' ? response : parseNumber(String(response));
      if (value === null || Number.isNaN(value)) return false;
      const expected = typeof question.answer === 'number' ? question.answer : parseNumber(String(question.answer));
      if (expected === null || Number.isNaN(expected)) return false;
      return Math.abs(value - expected) < 1e-6;
    }
    case 'money-drag': {
      if (!Array.isArray(response)) return false;
      const total = (response as (number | string)[]).reduce<number>((sum, v) => sum + Number(v), 0);
      const target = question.moneyTarget ?? (typeof question.answer === 'number' ? question.answer : NaN);
      return Math.abs(total - target) < 1e-6;
    }
    default:
      return false;
  }
}

/** Memeriksa jawaban tahap alasan pada soal tf-reason. */
export function checkReason(question: Question, reason: string): boolean {
  if (!question.reasonAnswer) return true;
  return normalizeText(reason) === normalizeText(question.reasonAnswer);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Mengubah teks angka (boleh mengandung titik/koma pemisah ribuan) menjadi number. */
export function parseNumber(input: string): number | null {
  const cleaned = input
    .replace(/rp/gi, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(/,/g, '.')
    .trim();
  if (cleaned === '') return null;
  const value = Number(cleaned);
  return Number.isNaN(value) ? null : value;
}

/** Mengacak array (Fisher-Yates) tanpa mengubah array asli. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return result;
}

/** Memilih sejumlah soal acak untuk satu sesi. */
export function pickQuestions(pool: Question[], count: number, rng: () => number = Math.random): Question[] {
  return shuffle(pool, rng).slice(0, Math.min(count, pool.length));
}

export interface BalaiResult {
  balai: BalaiId;
  correct: number;
  total: number;
  stars: Stars;
  coins: number;
}

export function computeBalaiResult(
  balai: BalaiId,
  answers: AnswerRecord[],
  coinsEarned: number,
): BalaiResult {
  const relevant = answers.filter((a) => a.balai === balai);
  const correct = relevant.filter((a) => a.correct).length;
  const total = relevant.length;
  return {
    balai,
    correct,
    total,
    stars: starsForCorrect(correct),
    coins: coinsEarned,
  };
}
