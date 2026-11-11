import { describe, it, expect, beforeEach } from 'vitest';
import { createDefaultProgress } from '../src/core/state';
import { ringkasProgres } from '../src/net/ringkas';
import type { AnswerRecord } from '../shared/types';

describe('ringkasProgres (ringkasan untuk dasbor guru)', () => {
  it('meringkas bintang, jumlah soal, dan soal salah', () => {
    const progress = createDefaultProgress('Ani', 'perempuan');
    progress.balai['F01'] = { stars: 2, bestScore: 20, correct: 2, total: 3, unlocked: true };
    progress.balai['H01'] = { stars: 3, bestScore: 30, correct: 3, total: 3, unlocked: true };
    const answers: AnswerRecord[] = [
      { questionId: 'F01-q1', balai: 'F01', kodeMateri: 'F01', correct: true, usedHint: false },
      { questionId: 'F01-q2', balai: 'F01', kodeMateri: 'F01', correct: false, usedHint: true },
    ];
    progress.answers = answers;
    progress.visitedNoktah = ['F01', 'H01'];

    const r = ringkasProgres(progress, 'H01');
    expect(r.playerName).toBe('Ani');
    expect(r.gender).toBe('perempuan');
    expect(r.noktah).toBe('H01');
    expect(r.bintang['F01']).toBe(2);
    expect(r.bintang['H01']).toBe(3);
    // Total dihitung dari catatan jawaban (2 soal), bukan dari semua balai.
    expect(r.totalBenar).toBe(1);
    expect(r.totalSoal).toBe(2);
    expect(r.soalSalah).toEqual([{ questionId: 'F01-q2', kodeMateri: 'F01' }]);
    expect(r.visitedNoktah).toEqual(['F01', 'H01']);
    expect(typeof r.diubahPada).toBe('string');
  });

  it('memakai noktah null bila pemain berada di peta', () => {
    const progress = createDefaultProgress('Budi', 'laki-laki');
    const r = ringkasProgres(progress, null);
    expect(r.noktah).toBeNull();
    expect(r.totalSoal).toBe(0);
    expect(r.soalSalah).toEqual([]);
  });
});

describe('progres menyimpan token kelas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('memuat kembali token dari localStorage', async () => {
    const { loadProgress, createDefaultProgress: buat } = await import('../src/core/state');
    const p = buat('Sari', 'perempuan');
    p.token = '5274';
    localStorage.setItem('survival-sains:progress:v1', JSON.stringify(p));
    const dimuat = loadProgress();
    expect(dimuat.token).toBe('5274');
  });

  it('token kosong / tidak ada menjadi undefined', async () => {
    const { loadProgress, createDefaultProgress: buat } = await import('../src/core/state');
    const p = buat('Sari', 'perempuan');
    p.token = '';
    localStorage.setItem('survival-sains:progress:v1', JSON.stringify(p));
    expect(loadProgress().token).toBeUndefined();

    localStorage.removeItem('survival-sains:progress:v1');
    expect(loadProgress().token).toBeUndefined();
  });
});

describe('nilai resmi dalam ringkasan', () => {
  it('dihitung dari jawaban pertama, tidak terpotong batas 400', () => {
    const p = createDefaultProgress('Ani', 'perempuan');
    const rec = (questionId: string, correct: boolean, percobaan: number): AnswerRecord => ({ questionId, balai: 'F01', kodeMateri: 'F01', correct, usedHint: false, percobaan });
    p.answers = [rec('a', true, 1), rec('b', true, 2), rec('c', false, 3), ...Array.from({ length: 450 }, () => rec('a', true, 1))];
    const r = ringkasProgres(p, null);
    expect(r.nilai?.balai.F01).toBe(1.5);
    expect(r.nilai?.final).toBeNull();
  });
});
