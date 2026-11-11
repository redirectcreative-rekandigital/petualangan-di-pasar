import { describe, it, expect } from 'vitest';
import { checkAnswer, skorSoal, skorJawaban, starsForSkor, nilaiResmi, shuffle, pickQuestions } from '../src/core/scoring';
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


describe('skor bertingkat', () => {
  it('skorSoal: 1 / 0,5 / 0,25 / 0', () => {
    expect(skorSoal(true, 1)).toBe(1);
    expect(skorSoal(true, 2)).toBe(0.5);
    expect(skorSoal(true, 3)).toBe(0.25);
    expect(skorSoal(false, 3)).toBe(0);
  });
  it('bintang dari skor: 3 / 2 / 1 / 0', () => {
    expect(starsForSkor(3)).toBe(3);
    expect(starsForSkor(2.5)).toBe(2);
    expect(starsForSkor(1)).toBe(1);
    expect(starsForSkor(0.75)).toBe(0);
  });
  it('tiga soal benar di kesempatan ke-3 tidak dapat bintang 3', () => {
    const j = [3, 3, 3].map((percobaan) => ({ correct: true, percobaan }));
    expect(skorJawaban(j)).toBe(0.75);
    expect(starsForSkor(skorJawaban(j))).toBe(0);
  });
});

describe('nilaiResmi (percobaan pertama saja)', () => {
  const rec = (questionId: string, balai: string, correct: boolean, percobaan = 1) => ({ questionId, balai, correct, percobaan });
  it('latihan ulang tidak mengubah nilai balai', () => {
    const a = [rec('a', 'F01', false, 3), rec('b', 'F01', true), rec('c', 'F01', true), rec('a', 'F01', true), rec('b', 'F01', true), rec('c', 'F01', true)];
    expect(nilaiResmi(a, ['F01']).balai.F01).toBe(2);
  });
  it('Final: jawaban pertama per soal; akhir = 60% balai + 40% Final', () => {
    const a = [
      ...['a', 'b', 'c'].map((q) => rec(q, 'F01', true)),
      ...Array.from({ length: 30 }, (_, i) => rec(`f${i}`, 'FINAL', true)),
      rec('f0', 'FINAL', false, 3),
    ];
    const n = nilaiResmi(a, ['F01']);
    expect(n.final).toBe(30);
    expect(n.akhir).toBe(100);
  });
  it('Final belum pernah = null', () => {
    expect(nilaiResmi([], ['F01']).final).toBeNull();
  });
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
