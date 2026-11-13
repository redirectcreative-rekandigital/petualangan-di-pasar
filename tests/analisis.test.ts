import { describe, it, expect } from 'vitest';
import { statistikSoal, statistikMateri, balaiBelumTuntas, urutkanSiswa, tambahRiwayat, MAKS_RIWAYAT, type RingkasSesi } from '../src/core/analisis';
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

describe('urutkanSiswa', () => {
  const buat = (nama: string, online: boolean, akhir?: number): { nama: string; online: boolean; progress: ProgresSiswa } => ({
    nama,
    online,
    progress: { ...(akhir === undefined ? {} : { nilai: { akhir } }) } as unknown as ProgresSiswa,
  });
  const siswa = [buat('Citra', false, 90), buat('ani', true), buat('Budi', true, 40)];

  it('nama A–Z tanpa peduli huruf besar', () => {
    expect(urutkanSiswa(siswa, 'nama', 70).map((s) => s.nama)).toEqual(['ani', 'Budi', 'Citra']);
  });

  it('nilai terendah dulu, yang belum punya nilai di akhir', () => {
    expect(urutkanSiswa(siswa, 'nilai', 70).map((s) => s.nama)).toEqual(['Budi', 'Citra', 'ani']);
  });

  it('online dulu, lalu nama', () => {
    expect(urutkanSiswa(siswa, 'online', 70).map((s) => s.nama)).toEqual(['ani', 'Budi', 'Citra']);
  });
});

describe('tambahRiwayat', () => {
  it('terbaru di depan dan paling banyak 10', () => {
    let r: RingkasSesi[] = [];
    for (let i = 0; i < 12; i++) r = tambahRiwayat(r, { tanggal: '', token: String(i), siswa: 1, rata: 0, belum: 0, kkm: 70 });
    expect(r).toHaveLength(MAKS_RIWAYAT);
    expect(r[0]?.token).toBe('11');
    expect(r.at(-1)?.token).toBe('2');
  });
});
