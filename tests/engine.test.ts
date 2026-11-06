import { describe, it, expect } from 'vitest';
import { startSession, submitAnswer, currentQuestion } from '../src/core/engine';
import { RULES } from '../src/core/scoring';
import type { Question } from '../shared/types';

const meta = {
  kodeMateri: 'H01' as const,
  elemen: 'Makhluk Hidup' as const,
  submateri: 'Ekosistem',
  indikator: 'Mengenal komponen ekosistem',
  levelKognitif: 'Pemahaman' as const,
  tingkatKesulitan: 'Mudah' as const,
};

const fixed = (partial: Partial<Question>): Question => ({
  id: 'T-1',
  balai: 'H01',
  type: 'mcq',
  prompt: 'p',
  options: ['a', 'b', 'c', 'd'],
  answer: 'a',
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
    fixed({ id: 'A', answer: 'a' }),
    fixed({ id: 'B', answer: 'b' }),
    fixed({ id: 'C', answer: 'c' }),
    fixed({ id: 'D', answer: 'd' }),
    fixed({ id: 'E', answer: 'a' }),
  ];

  it('mulai dengan 3 soal dan 3 kesempatan', () => {
    const s = startSession('H01', pool, rng());
    expect(s.questions).toHaveLength(3);
    expect(s.attemptsLeft).toBe(RULES.attemptsPerQuestion);
    expect(s.index).toBe(0);
  });

  it('jawaban benar menambah nilai +10 dan lanjut soal', () => {
    const s = startSession('H01', pool, rng());
    const q = currentQuestion(s)!;
    const res = submitAnswer(s, q.answer);
    expect(res.correct).toBe(true);
    expect(res.advanced).toBe(true);
    expect(res.session.coins).toBe(RULES.coinsCorrect);
    expect(res.session.correctCount).toBe(1);
    expect(res.session.index).toBe(1);
  });

  it('jawaban salah mengurangi kesempatan dan tetap di soal sama', () => {
    const s = startSession('H01', pool, rng());
    const res = submitAnswer(s, 'jawaban salah');
    expect(res.correct).toBe(false);
    expect(res.advanced).toBe(false);
    expect(res.session.attemptsLeft).toBe(RULES.attemptsPerQuestion - 1);
    expect(res.session.index).toBe(0);
  });

  it('habis 3 kesempatan => soal gagal dan lanjut', () => {
    let s = startSession('H01', pool, rng());
    let advanced = false;
    for (let i = 0; i < RULES.attemptsPerQuestion; i++) {
      const res = submitAnswer(s, 'jawaban salah');
      s = res.session;
      advanced = res.advanced;
    }
    expect(advanced).toBe(true);
    expect(s.index).toBe(1);
    expect(s.attemptsLeft).toBe(RULES.attemptsPerQuestion);
    expect(s.answered.filter((a) => !a.correct).length).toBe(1);
  });

  it('sesi selesai setelah soal terakhir', () => {
    let s = startSession('H01', pool, rng());
    for (let i = 0; i < 3; i++) {
      const q = currentQuestion(s)!;
      const res = submitAnswer(s, q.answer);
      s = res.session;
      if (i === 2) expect(res.finished).toBe(true);
    }
    expect(s.correctCount).toBe(3);
  });
});

describe('engine - puncak Menara Kitab', () => {
  const pool: Question[] = Array.from({ length: 40 }, (_, i) =>
    fixed({ id: `F-${i}`, balai: 'FINAL', answer: 'a' }),
  );

  it('sesi FINAL memuat 30 soal', () => {
    const s = startSession('FINAL', pool, rng());
    expect(s.questions).toHaveLength(RULES.questionsPuncak);
  });
});
