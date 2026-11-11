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

/** Skor satu soal: benar di kesempatan ke-1 = 1, ke-2 = 0,5, ke-3 = 0,25; salah = 0. */
export function skorSoal(correct: boolean, percobaan = 1): number {
  if (!correct) return 0;
  return [1, 0.5, 0.25][percobaan - 1] ?? 0.25;
}

/** Jumlah skor bertingkat sekumpulan jawaban. */
export function skorJawaban(answers: Array<{ correct: boolean; percobaan?: number }>): number {
  return answers.reduce((s, a) => s + skorSoal(a.correct, a.percobaan), 0);
}

/** Bintang per balai dari skor bertingkat (maks 3,0): 3,0 = 3 · ≥2 = 2 · ≥1 = 1. */
export function starsForSkor(skor: number): Stars {
  if (skor >= 3) return 3;
  if (skor >= 2) return 2;
  if (skor >= 1) return 1;
  return 0;
}

export interface NilaiResmi {
  /** Skor bertingkat percobaan pertama per kode balai (0..3). */
  balai: Record<string, number>;
  /** Skor bertingkat percobaan pertama Final (0..30), null bila belum pernah. */
  final: number | null;
  /** Nilai akhir 0..100 = rata nilai balai 60% + Final 40%. */
  akhir: number;
}

/**
 * Nilai resmi = percobaan pertama saja: 3 jawaban pertama tiap balai dan
 * jawaban pertama tiap soal Final. Latihan ulang tidak mengubahnya.
 */
export function nilaiResmi(
  answers: Array<{ questionId: string; balai: string; correct: boolean; percobaan?: number }>,
  kodeBalai: readonly string[],
): NilaiResmi {
  const balai: Record<string, number> = {};
  const jumlah: Record<string, number> = {};
  const finalDilihat = new Set<string>();
  let final = 0;
  for (const a of answers) {
    if (a.balai === 'FINAL') {
      if (finalDilihat.has(a.questionId)) continue;
      finalDilihat.add(a.questionId);
      final += skorSoal(a.correct, a.percobaan);
      continue;
    }
    if ((jumlah[a.balai] ?? 0) >= RULES.questionsPerBalai) continue;
    jumlah[a.balai] = (jumlah[a.balai] ?? 0) + 1;
    balai[a.balai] = (balai[a.balai] ?? 0) + skorSoal(a.correct, a.percobaan);
  }
  const rataBalai = kodeBalai.length
    ? (kodeBalai.reduce((s, k) => s + (balai[k] ?? 0), 0) / (kodeBalai.length * RULES.questionsPerBalai)) * 100
    : 0;
  const persenFinal = (final / RULES.questionsPuncak) * 100;
  return { balai, final: finalDilihat.size ? final : null, akhir: Math.round(0.6 * rataBalai + 0.4 * persenFinal) };
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


