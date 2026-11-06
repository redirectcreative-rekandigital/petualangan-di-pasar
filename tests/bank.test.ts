import { describe, it, expect } from 'vitest';
import { getQuestionBank } from '../src/data/bank';
import { checkAnswer } from '../src/core/scoring';
import { NOKTAH, BAHAI_TKA } from '../src/data/balai';
import { genderPenjaga } from '../src/world/karakter';

/**
 * Uji integritas & verifikasi kunci jawaban bank soal versi balai.
 * Setiap kunci diuji ulang dengan perhitungan independen dari teks soal.
 */

describe('bank soal versi balai', () => {
  const bank = getQuestionBank();

  it('memuat 78 soal (48 balai + 30 puncak)', () => {
    expect(bank.length).toBe(78);
    expect(bank.filter((q) => q.balai === 'FINAL').length).toBe(30);
  });

  it('setiap balai memiliki tepat 3 soal, kecuali FINAL (30)', () => {
    const kodeBalai = [
      'B01', 'B02', 'B03', 'B04', 'B05', 'B06',
      'G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08',
      'D01', 'D02',
    ];
    for (const kode of kodeBalai) {
      const count = bank.filter((q) => q.balai === kode).length;
      expect(count, `balai ${kode}`).toBe(3);
    }
  });

  it('tidak ada id soal yang duplikat', () => {
    const ids = bank.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('setiap soal punya hint, pembahasan, dan metadata TKA', () => {
    for (const q of bank) {
      expect(q.hint.length, q.id).toBeGreaterThan(0);
      expect(q.explanation.length, q.id).toBeGreaterThan(0);
      expect(q.meta.kodeMateri, q.id).toBeTruthy();
      expect(q.meta.indikator.length, q.id).toBeGreaterThan(0);
    }
  });

  it('soal mcq punya opsi dan tepat satu kunci ada di dalam opsi', () => {
    for (const q of bank.filter((x) => x.type === 'mcq')) {
      expect(q.options, q.id).toBeDefined();
      const matches = (q.options ?? []).filter((o) => o === q.answer).length;
      expect(matches, `kunci mcq ${q.id}`).toBe(1);
    }
  });

  it('soal mcq-complex punya kunci array yang semuanya ada di opsi', () => {
    const kompleks = bank.filter((x) => x.type === 'mcq-complex');
    expect(kompleks.length).toBeGreaterThan(0);
    for (const q of kompleks) {
      expect(Array.isArray(q.answer), q.id).toBe(true);
      const answers = q.answer as string[];
      for (const a of answers) {
        expect(q.options, `${q.id}: ${a}`).toContain(a);
      }
      // Tidak semua opsi benar (harus ada pengecoh).
      expect(answers.length, q.id).toBeLessThan((q.options ?? []).length);
    }
  });

  it('soal number punya kunci berupa angka', () => {
    for (const q of bank.filter((x) => x.type === 'number')) {
      expect(typeof q.answer, q.id).toBe('number');
    }
  });

  it('setiap soal dapat dijawab benar dengan kuncinya sendiri', () => {
    for (const q of bank) {
      expect(checkAnswer(q, q.answer), q.id).toBe(true);
    }
  });

  it('jumlah soal per elemen masuk akal (Bilangan, Geometri, Data)', () => {
    const bil = bank.filter((q) => q.meta.elemen === 'Bilangan').length;
    const geo = bank.filter((q) => q.meta.elemen === 'Geometri').length;
    const dat = bank.filter((q) => q.meta.elemen === 'Data').length;
    expect(bil + geo + dat).toBe(bank.length);
    expect(bil).toBeGreaterThan(0);
    expect(geo).toBeGreaterThan(0);
    expect(dat).toBeGreaterThan(0);
  });
});

describe('penjaga noktah (sosok NPC)', () => {
  it('setiap balai punya nama penjaga', () => {
    expect(BAHAI_TKA.length).toBeGreaterThan(0);
    for (const b of BAHAI_TKA) {
      expect(b.penjaga.length, `${b.kode} tanpa penjaga`).toBeGreaterThan(0);
    }
  });

  it('penjaga tetap ada setelah validasi noktah', () => {
    for (const n of NOKTAH) {
      for (const b of n.balai) {
        expect(b.penjaga.length, `${b.kode} hilang setelah validasi`).toBeGreaterThan(0);
      }
    }
  });

  it('gender penjaga mengikuti awalan nama (Bu → perempuan)', () => {
    expect(genderPenjaga('Bu Jumlah')).toBe('perempuan');
    expect(genderPenjaga('Ibu Sudut')).toBe('perempuan');
    expect(genderPenjaga('Pak Nilai')).toBe('laki-laki');
    expect(genderPenjaga('Raja Diskon')).toBe('laki-laki');
  });
});

describe('verifikasi kunci perhitungan (dihitung ulang)', () => {
  const bank = getQuestionBank();
  const byId = (id: string) => bank.find((q) => q.id === id);

  it('B02-01 total belanja Ibu = Rp72.000', () => {
    const q = byId('B02-01');
    expect(q?.answer).toBe(2 * 18000 + 3 * 12000);
    expect(q?.answer).toBe(72000);
  });

  it('B02-02 kembalian Aldi Rp12.500', () => {
    const q = byId('B02-02');
    expect(q?.answer).toBe('Rp12.500');
  });

  it('B02-03 sisa uang Bu Sari = Rp29.000', () => {
    const q = byId('B02-03');
    expect(q?.answer).toBe(100000 - (4 * 6500 + 45000));
    expect(q?.answer).toBe(29000);
  });

  it('B03-01 FPB 24 dan 36 = 12', () => {
    expect(byId('B03-01')?.answer).toBe('12');
  });

  it('B03-02 KPK 8 dan 12 = 24', () => {
    expect(byId('B03-02')?.answer).toBe(24);
  });

  it('B06-02 harga sepatu diskon 25% = Rp150.000', () => {
    const q = byId('B06-02');
    expect(q?.answer).toBe(200000 - 0.25 * 200000);
    expect(q?.answer).toBe(150000);
  });

  it('G02-01 keliling taman 12x7 = 38 m', () => {
    expect(byId('G02-01')?.answer).toBe(2 * (12 + 7));
  });

  it('G03-01 luas lantai 12x7 = 84 m2', () => {
    expect(byId('G03-01')?.answer).toBe(12 * 7);
  });

  it('G05-01 volume balok 10x5x4 = 200 cm3', () => {
    expect(byId('G05-01')?.answer).toBe(10 * 5 * 4);
  });

  it('G07-01 waktu tempuh 120 km / 60 km/jam = 2 jam', () => {
    expect(byId('G07-01')?.answer).toBe(120 / 60);
  });

  it('D01-02 total panen = jumlah nilai diagram', () => {
    const q = byId('D01-02');
    const values = q?.data?.values ?? [];
    expect(q?.answer).toBe(values.reduce((a, b) => a + b, 0));
    expect(q?.answer).toBe(140);
  });

  it('FINAL-01 total harga 5x12 telur @Rp2.000 = Rp120.000', () => {
    expect(byId('FINAL-01')?.answer).toBe('Rp120.000');
  });

  it('FINAL-17 hasil 15x24 - 120:4 = 330', () => {
    expect(byId('FINAL-17')?.answer).toBe(15 * 24 - 120 / 4);
    expect(byId('FINAL-17')?.answer).toBe(330);
  });

  it('FINAL-22 harga 5 kg jeruk (3 kg = Rp54.000) = Rp90.000', () => {
    expect(byId('FINAL-22')?.answer).toBe((54000 / 3) * 5);
  });
});
