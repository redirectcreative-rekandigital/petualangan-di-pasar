import type { Question, Stars } from '../../shared/types';

/** Aturan main versi balai (struktur materi). */
export const RULES = {
  /** Kesempatan menjawab untuk tiap soal. Habis 3x salah = soal gagal. */
  attemptsPerQuestion: 3,
  /** Jumlah soal tiap balai. */
  questionsPerBalai: 3,
  /** Jumlah soal babak puncak "Menara Kitab". */
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
 * Semua soal berjenis pilihan ganda: cocokkan teks opsi (case-insensitive, trim).
 */
export function checkAnswer(question: Question, response: number | string | string[] | number[]): boolean {
  return normalizeText(String(response)) === normalizeText(String(question.answer));
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
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


