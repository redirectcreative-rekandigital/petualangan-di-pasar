import { describe, it, expect } from 'vitest';
import { statistikSoal, statistikMateri, balaiBelumTuntas } from '../src/core/analisis';
import { getQuestionBankAsli } from '../src/data/bank';
import { URUTAN_BALAI } from '../src/data/cerita';
import type { ProgresSiswa } from '../shared/net';

const kode = URUTAN_BALAI[0] as string;
const bank = getQuestionBankAsli();
const soal = bank.find((q) => q.meta.kodeMateri === kode && !q.id.startsWith('final'))!;
const prog = (jawaban: NonNullable<ProgresSiswa['jawaban']>, extra: Partial<ProgresSiswa> = {}): ProgresSiswa => ({
  playerName: 'x', gender: 'laki-laki', noktah: null, bintang: {}, totalBenar: 0, totalSoal: 0, visitedNoktah: [], puncakLulus: false, soalSalah: [], diubahPada: '', jawaban, ...extra,
});

describe('analisis dasbor guru', () => {
  it('statistikSoal menghitung satu siswa sekali per soal (jawaban pertama)', () => {
    const j = [
      { q: soal.id, k: kode, b: false, p: ['a'], n: 3 },
      { q: soal.id, k: kode, b: true, p: ['b'], n: 1 },
    ];
    const [st] = statistikSoal([{ nama: 'A', progress: prog(j) }], bank);
    expect(st?.dijawab).toBe(1);
    expect(st?.persenBenar).toBe(0);
  });

  it('statistikMateri tidak ikut menghitung soal Final', () => {
    const j = [{ q: 'final-1', k: kode, b: true, p: [], n: 1 }];
    expect(statistikMateri([{ nama: 'A', progress: prog(j) }])[0]?.dijawab).toBe(0);
  });

  it('balaiBelumTuntas memakai KKM', () => {
    const p = prog([], { nilai: { balai: { [kode]: 1 }, final: null, akhir: 33 } });
    expect(balaiBelumTuntas(p, 70)).toEqual([kode]);
    expect(balaiBelumTuntas(p, 30)).toEqual([]);
  });
});
