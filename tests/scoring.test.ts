import { describe, it, expect } from 'vitest';
import { checkAnswer, checkReason, parseNumber, starsForCorrect, shuffle, pickQuestions } from '../src/core/scoring';
import type { Question } from '../shared/types';

const meta = {
  kodeMateri: 'B02' as const,
  elemen: 'Bilangan' as const,
  submateri: 'Operasi bilangan cacah',
  indikator: 'Menghitung',
  levelKognitif: 'Penerapan' as const,
  tingkatKesulitan: 'Sedang' as const,
};

const q = (partial: Partial<Question>): Question => ({
  id: 'X',
  balai: 'B01',
  type: 'number',
  prompt: 'p',
  answer: 0,
  hint: 'h',
  explanation: ['e'],
  meta,
  ...partial,
});

describe('checkAnswer - number', () => {
  it('menerima angka yang tepat', () => {
    expect(checkAnswer(q({ type: 'number', answer: 6500 }), 6500)).toBe(true);
  });
  it('menerima teks angka dengan titik ribuan', () => {
    expect(checkAnswer(q({ type: 'number', answer: 6500 }), '6.500')).toBe(true);
  });
  it('menolak jawaban salah', () => {
    expect(checkAnswer(q({ type: 'number', answer: 6500 }), 6000)).toBe(false);
  });
});

describe('checkAnswer - mcq', () => {
  it('cocok tanpa peduli besar/kecil huruf dan spasi', () => {
    expect(checkAnswer(q({ type: 'mcq', answer: 'Kamis', options: ['Senin', 'Kamis'] }), ' kamis ')).toBe(true);
  });
});

describe('checkAnswer - mcq-complex', () => {
  const kompleks = q({ type: 'mcq-complex', answer: ['2/4', '3/6'], options: ['2/4', '3/6', '4/6'] });

  it('benar bila semua kunci dipilih, tanpa pilihan salah', () => {
    expect(checkAnswer(kompleks, ['2/4', '3/6'])).toBe(true);
    expect(checkAnswer(kompleks, ['3/6', '2/4'])).toBe(true);
  });
  it('salah bila ada kunci yang belum dipilih', () => {
    expect(checkAnswer(kompleks, ['2/4'])).toBe(false);
  });
  it('salah bila memilih opsi yang salah', () => {
    expect(checkAnswer(kompleks, ['2/4', '3/6', '4/6'])).toBe(false);
  });
});

describe('checkAnswer - money-drag', () => {
  it('benar jika total uang sama dengan target', () => {
    expect(checkAnswer(q({ type: 'money-drag', answer: 4500, moneyTarget: 4500 }), [2000, 2000, 500])).toBe(true);
  });
  it('salah jika total tidak sama', () => {
    expect(checkAnswer(q({ type: 'money-drag', answer: 4500, moneyTarget: 4500 }), [2000, 2000])).toBe(false);
  });
});

describe('checkReason', () => {
  it('mencocokkan alasan yang sama', () => {
    const question = q({ type: 'tf-reason', answer: 'Salah', reasonAnswer: 'Karena harga akhir lebih murah' });
    expect(checkReason(question, 'karena harga akhir lebih murah')).toBe(true);
  });
});

describe('parseNumber', () => {
  it('membersihkan awalan Rp dan titik', () => {
    expect(parseNumber('Rp13.500')).toBe(13500);
  });
  it('mengembalikan null untuk teks kosong', () => {
    expect(parseNumber('   ')).toBeNull();
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
    const pool = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => q({ id: `B01-0${n}` }));
    expect(pickQuestions(pool, 3)).toHaveLength(3);
  });
  it('pickQuestions tidak melebihi isi pool', () => {
    const pool = [1, 2].map((n) => q({ id: `B01-0${n}` }));
    expect(pickQuestions(pool, 5)).toHaveLength(2);
  });
});
