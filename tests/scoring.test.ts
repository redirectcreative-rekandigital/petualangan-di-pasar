import { describe, it, expect } from 'vitest';
import { checkAnswer, starsForCorrect, shuffle, pickQuestions } from '../src/core/scoring';
import type { Question } from '../shared/types';

const meta = {
  kodeMateri: 'F01' as const,
  elemen: 'Fisika' as const,
  submateri: 'Sifat cahaya',
  indikator: 'Mengenal sifat cahaya',
  levelKognitif: 'Pemahaman' as const,
  tingkatKesulitan: 'Mudah' as const,
};

const q = (partial: Partial<Question>): Question => ({
  id: 'X',
  balai: 'F01',
  type: 'mcq',
  prompt: 'p',
  options: ['a', 'b'],
  answer: 'a',
  hint: 'h',
  explanation: ['e'],
  meta,
  ...partial,
});

describe('checkAnswer (pilihan ganda)', () => {
  it('menerima kunci yang tepat', () => {
    expect(checkAnswer(q({ answer: 'lurus' }), 'lurus')).toBe(true);
  });
  it('cocok tanpa peduli besar/kecil huruf dan spasi', () => {
    expect(checkAnswer(q({ answer: 'Kamis' }), ' kamis ')).toBe(true);
  });
  it('menolak jawaban salah', () => {
    expect(checkAnswer(q({ answer: 'lurus' }), 'lengkung')).toBe(false);
  });
});


describe('starsForCorrect (per balai: 3 soal)', () => {
  it('3 benar = 3 bintang', () => expect(starsForCorrect(3)).toBe(3));
  it('2 benar = 2 bintang', () => expect(starsForCorrect(2)).toBe(2));
  it('1 benar = 1 bintang', () => expect(starsForCorrect(1)).toBe(1));
  it('0 benar = 0 bintang', () => expect(starsForCorrect(0)).toBe(0));
});

describe('shuffle & pickQuestions', () => {
  it('shuffle tidak mengubah jumlah elemen', () => {
    expect(shuffle([1, 2, 3, 4])).toHaveLength(4);
  });
  it('pickQuestions mengambil sejumlah yang diminta', () => {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => q({ id: `F01-0${n}` }));
    expect(pickQuestions(pool, 3)).toHaveLength(3);
  });
  it('pickQuestions tidak melebihi isi pool', () => {
    const pool = [1, 2].map((n) => q({ id: `F01-0${n}` }));
    expect(pickQuestions(pool, 5)).toHaveLength(2);
  });
});
