import type { BalaiId, Question, AnswerRecord } from '../../shared/types';
import { RULES, checkAnswer, checkReason, pickQuestions } from './scoring';

/**
 * Satu sesi bermain: baik sesi balai (3 soal) maupun sesi puncak
 * "Pasar Ramai" (30 soal). Aturan kesempatan menjawab sama:
 * tiap soal punya 3 kesempatan; habis 3x salah, soal dianggap gagal.
 */
export interface SessionState {
  balai: BalaiId;
  questions: Question[];
  index: number;
  /** Sisa kesempatan untuk soal yang sedang dikerjakan. */
  attemptsLeft: number;
  coins: number;
  correctCount: number;
  answered: AnswerRecord[];
  /** Soal tf-reason: jawaban utama sudah benar, menunggu alasan. */
  awaitingReason: boolean;
}

function shuffleOptions(options: string[] | undefined, rng: () => number): string[] | undefined {
  if (!options) return undefined;
  const copy = [...options];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i] as string;
    copy[i] = copy[j] as string;
    copy[j] = tmp;
  }
  return copy;
}

export function startSession(balai: BalaiId, pool: Question[], rng: () => number = Math.random): SessionState {
  const count = balai === 'FINAL' ? RULES.questionsPuncak : RULES.questionsPerBalai;
  const questions = pickQuestions(pool, count, rng).map((q) => ({
    ...q,
    options: shuffleOptions(q.options, rng),
    reasonOptions: shuffleOptions(q.reasonOptions, rng),
  }));
  return {
    balai,
    questions,
    index: 0,
    attemptsLeft: RULES.attemptsPerQuestion,
    coins: 0,
    correctCount: 0,
    answered: [],
    awaitingReason: false,
  };
}

export function currentQuestion(session: SessionState): Question | null {
  return session.questions[session.index] ?? null;
}

export interface SubmitResult {
  session: SessionState;
  correct: boolean;
  /** Soal saat ini berakhir (benar atau kesempatan habis) dan lanjut ke soal berikutnya. */
  advanced: boolean;
  isLast: boolean;
  /** Seluruh sesi selesai. */
  finished: boolean;
  awaitingReason: boolean;
}

/** Menyelesaikan soal saat ini (benar atau gagal) dan pindah ke soal berikutnya. */
function advance(session: SessionState, question: Question, correct: boolean): SubmitResult {
  const answered: AnswerRecord[] = [
    ...session.answered,
    {
      questionId: question.id,
      balai: session.balai,
      kodeMateri: question.meta.kodeMateri,
      correct,
      usedHint: false,
    },
  ];
  const coins = correct ? session.coins + RULES.coinsCorrect : session.coins;
  const nextIndex = session.index + 1;
  const isLast = nextIndex >= session.questions.length;
  return {
    session: {
      ...session,
      coins,
      correctCount: correct ? session.correctCount + 1 : session.correctCount,
      answered,
      index: nextIndex,
      attemptsLeft: RULES.attemptsPerQuestion,
      awaitingReason: false,
    },
    correct,
    advanced: true,
    isLast,
    finished: isLast,
    awaitingReason: false,
  };
}

/**
 * Tahap 1: memeriksa jawaban utama. Bila salah, kesempatan berkurang tetapi
 * pemain tetap di soal yang sama sampai kesempatan habis atau menjawab benar.
 */
export function submitAnswer(
  session: SessionState,
  response: number | string | string[] | number[],
): SubmitResult {
  const question = currentQuestion(session);
  if (!question) {
    return { session, correct: false, advanced: true, isLast: true, finished: true, awaitingReason: false };
  }
  const correct = checkAnswer(question, response);

  if (question.type === 'tf-reason' && correct) {
    // Lanjut ke tahap alasan, bukan menyelesaikan soal.
    return {
      session: { ...session, awaitingReason: true },
      correct: true,
      advanced: false,
      isLast: false,
      finished: false,
      awaitingReason: true,
    };
  }

  if (correct) return advance(session, question, true);

  const attemptsLeft = session.attemptsLeft - 1;
  if (attemptsLeft <= 0) return advance(session, question, false);
  return {
    session: { ...session, attemptsLeft },
    correct: false,
    advanced: false,
    isLast: false,
    finished: false,
    awaitingReason: false,
  };
}

/** Tahap 2 soal tf-reason: memeriksa alasan. */
export function submitReason(session: SessionState, reason: string): SubmitResult {
  const question = currentQuestion(session);
  if (!question) {
    return { session, correct: false, advanced: true, isLast: true, finished: true, awaitingReason: false };
  }
  if (checkReason(question, reason)) {
    return advance(session, question, true);
  }
  const attemptsLeft = session.attemptsLeft - 1;
  if (attemptsLeft <= 0) return advance(session, question, false);
  return {
    session: { ...session, attemptsLeft, awaitingReason: false },
    correct: false,
    advanced: false,
    isLast: false,
    finished: false,
    awaitingReason: false,
  };
}
