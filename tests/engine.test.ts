import { describe, it, expect } from 'vitest';
import { startSession, submitAnswer, submitReason, currentQuestion } from '../src/core/engine';
import { RULES } from '../src/core/scoring';
import type { Question } from '../shared/types';

const meta = {
  kodeMateri: 'B02' as const,
  elemen: 'Bilangan' as const,
  submateri: 'Operasi bilangan cacah',
  indikator: 'Menghitung',
  levelKognitif: 'Penerapan' as const,
  tingkatKesulitan: 'Sedang' as const,
};

const fixed = (partial: Partial<Question>): Question => ({
  id: 'T-1',
  balai: 'B01',
  type: 'number',
  prompt: 'p',
  answer: 10,
  hint: 'h',
  explanation: ['e'],
  meta,
  ...partial,
});

function rng() {
  let seed = 1;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

describe('engine - sesi balai', () => {
  const pool: Question[] = [
    fixed({ id: 'A', answer: 10 }),
    fixed({ id: 'B', answer: 20 }),
    fixed({ id: 'C', answer: 30 }),
    fixed({ id: 'D', answer: 40 }),
    fixed({ id: 'E', answer: 50 }),
  ];

  it('mulai dengan 3 soal dan 3 kesempatan', () => {
    const s = startSession('B01', pool, rng());
    expect(s.questions).toHaveLength(3);
    expect(s.attemptsLeft).toBe(RULES.attemptsPerQuestion);
    expect(s.index).toBe(0);
  });

  it('jawaban benar menambah koin +10 dan lanjut soal', () => {
    const s = startSession('B01', pool, rng());
    const q = currentQuestion(s)!;
    const res = submitAnswer(s, q.answer);
    expect(res.correct).toBe(true);
    expect(res.advanced).toBe(true);
    expect(res.session.coins).toBe(RULES.coinsCorrect);
    expect(res.session.correctCount).toBe(1);
    expect(res.session.index).toBe(1);
  });

  it('jawaban salah mengurangi kesempatan dan tetap di soal sama', () => {
    const s = startSession('B01', pool, rng());
    const res = submitAnswer(s, -999);
    expect(res.correct).toBe(false);
    expect(res.advanced).toBe(false);
    expect(res.session.attemptsLeft).toBe(RULES.attemptsPerQuestion - 1);
    expect(res.session.index).toBe(0);
  });

  it('habis 3 kesempatan => soal gagal dan lanjut', () => {
    let s = startSession('B01', pool, rng());
    let advanced = false;
    for (let i = 0; i < RULES.attemptsPerQuestion; i++) {
      const res = submitAnswer(s, -999);
      s = res.session;
      advanced = res.advanced;
    }
    expect(advanced).toBe(true);
    expect(s.index).toBe(1);
    expect(s.attemptsLeft).toBe(RULES.attemptsPerQuestion);
    expect(s.answered.filter((a) => !a.correct).length).toBe(1);
  });

  it('sesi selesai setelah soal terakhir', () => {
    let s = startSession('B01', pool, rng());
    for (let i = 0; i < 3; i++) {
      const q = currentQuestion(s)!;
      const res = submitAnswer(s, q.answer);
      s = res.session;
      if (i === 2) expect(res.finished).toBe(true);
    }
    expect(s.correctCount).toBe(3);
  });
});

describe('engine - puncak Pasar Ramai', () => {
  const pool: Question[] = Array.from({ length: 40 }, (_, i) =>
    fixed({ id: `F-${i}`, balai: 'FINAL', answer: 10 }),
  );

  it('sesi FINAL memuat 30 soal', () => {
    const s = startSession('FINAL', pool, rng());
    expect(s.questions).toHaveLength(RULES.questionsPuncak);
  });
});

describe('engine - soal dua tahap tf-reason', () => {
  const pool: Question[] = [
    fixed({
      id: 'TR-1',
      type: 'tf-reason',
      answer: 'Salah',
      reasonOptions: ['A', 'B'],
      reasonAnswer: 'A',
    }),
    fixed({
      id: 'TR-2',
      type: 'tf-reason',
      answer: 'Benar',
      reasonOptions: ['A', 'B'],
      reasonAnswer: 'B',
    }),
    fixed({
      id: 'TR-3',
      type: 'tf-reason',
      answer: 'Salah',
      reasonOptions: ['A', 'B'],
      reasonAnswer: 'A',
    }),
  ];

  it('tahap 1 benar mengarah ke tahap alasan tanpa menambah koin', () => {
    const s = startSession('B01', pool, rng());
    const q = currentQuestion(s)!;
    const res = submitAnswer(s, q.answer as string);
    expect(res.correct).toBe(true);
    expect(res.awaitingReason).toBe(true);
    expect(res.session.awaitingReason).toBe(true);
    expect(res.session.coins).toBe(0);
  });

  it('alasan benar menambah koin dan lanjut soal', () => {
    let s = startSession('B01', pool, rng());
    const q = currentQuestion(s)!;
    s = submitAnswer(s, q.answer as string).session;
    const res = submitReason(s, q.reasonAnswer as string);
    expect(res.correct).toBe(true);
    expect(res.session.coins).toBe(RULES.coinsCorrect);
    expect(res.session.index).toBe(1);
  });

  it('alasan salah mengurangi kesempatan dan tetap di soal sama', () => {
    let s = startSession('B01', pool, rng());
    const q = currentQuestion(s)!;
    s = submitAnswer(s, q.answer as string).session;
    const res = submitReason(s, 'jawaban yang pasti salah');
    expect(res.correct).toBe(false);
    expect(res.advanced).toBe(false);
    expect(res.session.attemptsLeft).toBe(RULES.attemptsPerQuestion - 1);
    expect(res.session.index).toBe(0);
  });
});
