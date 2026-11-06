import { describe, it, expect, beforeEach } from 'vitest';
import { createDefaultProgress } from '../src/core/state';
import { ringkasProgres } from '../src/net/ringkas';
import type { AnswerRecord } from '../shared/types';

describe('ringkasProgres (ringkasan untuk dasbor guru)', () => {
  it('meringkas bintang, jumlah soal, dan soal salah', () => {
    const progress = createDefaultProgress('Ani', 'perempuan');
    progress.balai['B01'] = { stars: 2, bestScore: 20, correct: 2, total: 3, unlocked: true };
    progress.balai['G01'] = { stars: 3, bestScore: 30, correct: 3, total: 3, unlocked: true };
    const answers: AnswerRecord[] = [
      { questionId: 'B01-q1', balai: 'B01', kodeMateri: 'B01', correct: true, usedHint: false },
      { questionId: 'B01-q2', balai: 'B01', kodeMateri: 'B01', correct: false, usedHint: true },
    ];
    progress.answers = answers;
    progress.visitedNoktah = ['B01', 'G01'];

    const r = ringkasProgres(progress, 'G01');
    expect(r.playerName).toBe('Ani');
    expect(r.gender).toBe('perempuan');
    expect(r.noktah).toBe('G01');
    expect(r.bintang['B01']).toBe(2);
    expect(r.bintang['G01']).toBe(3);
    // Total dihitung dari catatan jawaban (2 soal), bukan dari semua balai.
    expect(r.totalBenar).toBe(1);
    expect(r.totalSoal).toBe(2);
    expect(r.soalSalah).toEqual([{ questionId: 'B01-q2', kodeMateri: 'B01' }]);
    expect(r.visitedNoktah).toEqual(['B01', 'G01']);
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
    localStorage.setItem('petualangan-di-pasar:progress:v2', JSON.stringify(p));
    const dimuat = loadProgress();
    expect(dimuat.token).toBe('5274');
  });

  it('token kosong / tidak ada menjadi undefined', async () => {
    const { loadProgress, createDefaultProgress: buat } = await import('../src/core/state');
    const p = buat('Sari', 'perempuan');
    p.token = '';
    localStorage.setItem('petualangan-di-pasar:progress:v2', JSON.stringify(p));
    expect(loadProgress().token).toBeUndefined();

    localStorage.removeItem('petualangan-di-pasar:progress:v2');
    expect(loadProgress().token).toBeUndefined();
  });
});
