import { describe, expect, it } from 'vitest';
import { buatKelasContoh } from '../src/ui/screens/kelasContoh';
import { sebaranPerjalanan, statistikSoal, statusBalai } from '../src/core/analisis';
import { getQuestionBankAsli } from '../src/data/bank';
import { URUTAN_BALAI } from '../src/data/cerita';

describe('kelas contoh Mode Guru', () => {
  it('31 siswa, nama maks 3 kata, data selalu sama', () => {
    const a = buatKelasContoh(0).siswa();
    const b = buatKelasContoh(0).siswa();
    expect(a).toHaveLength(31);
    expect(a.every((s) => s.nama.split(' ').length <= 3)).toBe(true);
    expect(a.map((s) => s.progress.nilai)).toEqual(b.map((s) => s.progress.nilai));
  });

  it('bervariasi: ada yang lulus Final, ada yang perlu bantuan, ada miskonsepsi', () => {
    const siswa = buatKelasContoh().siswa();
    expect(siswa.some((s) => s.progress.puncakLulus)).toBe(true);
    expect(siswa.some((s) => URUTAN_BALAI.some((k) => statusBalai(s.progress, k) === 'bantuan'))).toBe(true);
    expect(siswa.some((s) => (s.progress.alat ?? 0) < 4)).toBe(true);
    const stat = statistikSoal(siswa, getQuestionBankAsli());
    expect(stat.some((x) => x.salahTerbanyak)).toBe(true);
  });

  it('majukan, ubah nama, dan keluarkan mengubah daftar', () => {
    const kelas = buatKelasContoh();
    const total = (): string => JSON.stringify(kelas.siswa().map((s) => s.progress.jawaban?.length));
    const sebelum = total();
    kelas.majukan();
    expect(total()).not.toBe(sebelum);
    const id = kelas.siswa()[0]!.id;
    kelas.ubahNama(id, 'Nama Baru');
    expect(kelas.siswa()[0]!.nama).toBe('Nama Baru');
    kelas.keluarkan(id);
    expect(kelas.siswa()).toHaveLength(30);
  });

  it('sebaran perjalanan menghitung tiap siswa tepat sekali', () => {
    const siswa = buatKelasContoh().siswa();
    const sebaran = sebaranPerjalanan(siswa);
    expect(sebaran.reduce((n, b) => n + b.siswa.length, 0)).toBe(31);
    expect(sebaran.find((b) => b.kode === 'SELESAI')!.siswa.length).toBe(siswa.filter((s) => s.progress.puncakLulus).length);
  });
});
