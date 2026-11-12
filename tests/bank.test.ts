import { describe, it, expect } from 'vitest';
import { getQuestionBank, SOAL_MENTAH } from '../src/data/bank';
import { questionBankSchema, noktahListSchema } from '../src/data/schema';
import { checkAnswer } from '../src/core/scoring';
import { NOKTAH, SEMUA_BALAI, noktahMateri } from '../src/data/balai';
import { genderPenjaga } from '../src/world/karakter';

/**
 * Uji integritas & verifikasi kunci jawaban bank soal IPAS "Survival Sains".
 */

describe('bank soal IPAS', () => {
  const bank = getQuestionBank();

  // Validasi skema hanya di test/build (tidak lagi di HP siswa, lihat data/bank.ts).
  it('lolos skema Zod (soal & daftar noktah)', () => {
    const soal = questionBankSchema.safeParse(SOAL_MENTAH);
    expect(soal.success ? [] : soal.error.issues).toEqual([]);
    const noktah = noktahListSchema.safeParse(NOKTAH);
    expect(noktah.success ? [] : noktah.error.issues).toEqual([]);
  });

  it('memuat 120 soal (90 balai + 30 puncak)', () => {
    expect(bank.length).toBe(120);
    expect(bank.filter((q) => q.balai === 'FINAL').length).toBe(30);
  });

  it('setiap balai memiliki minimal 3 soal, FINAL 30', () => {
    for (const b of SEMUA_BALAI) {
      if (b.kode === 'FINAL') continue;
      const count = bank.filter((q) => q.balai === b.kode).length;
      expect(count, `balai ${b.kode}`).toBeGreaterThanOrEqual(3);
    }
    expect(bank.filter((q) => q.balai === 'FINAL').length).toBe(30);
  });

  it('tidak ada id soal yang duplikat', () => {
    const ids = bank.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('semua soal berjenis pilihan ganda dengan 4 opsi', () => {
    for (const q of bank) {
      expect(q.type, q.id).toBe('mcq');
      expect(q.options?.length, q.id).toBe(4);
    }
  });

  it('setiap soal punya hint, pembahasan, dan metadata', () => {
    for (const q of bank) {
      expect(q.hint.length, q.id).toBeGreaterThan(0);
      expect(q.explanation.length, q.id).toBeGreaterThan(0);
      expect(q.meta.kodeMateri, q.id).toBeTruthy();
      expect(q.meta.indikator.length, q.id).toBeGreaterThan(0);
    }
  });

  it('tepat satu kunci ada di dalam opsi', () => {
    for (const q of bank) {
      const matches = (q.options ?? []).filter((o) => o === q.answer).length;
      expect(matches, `kunci ${q.id}`).toBe(1);
    }
  });

  it('setiap soal dapat dijawab benar dengan kuncinya sendiri', () => {
    for (const q of bank) {
      expect(checkAnswer(q, q.answer), q.id).toBe(true);
    }
  });

  it('mencakup tiga elemen: Makhluk Hidup, Fisika, Bumi', () => {
    for (const elemen of ['Makhluk Hidup', 'Fisika', 'Bumi'] as const) {
      expect(bank.filter((q) => q.meta.elemen === elemen).length, elemen).toBeGreaterThan(0);
    }
  });
});

describe('peta noktah', () => {
  it('berisi 11 noktah materi + FINAL', () => {
    expect(noktahMateri()).toHaveLength(11);
    expect(NOKTAH.some((n) => n.kode === 'FINAL')).toBe(true);
  });

  it('setiap balai punya dua tokoh: penjaga dan tokoh materi', () => {
    for (const b of SEMUA_BALAI) {
      expect(b.penjaga.length, `${b.kode} tanpa penjaga`).toBeGreaterThan(0);
      expect(b.tokohMateri.nama.length, `${b.kode} tanpa tokoh materi`).toBeGreaterThan(0);
      expect(b.dialogPenjaga.length, `${b.kode} tanpa dialog`).toBeGreaterThan(0);
    }
  });

  it('setiap balai punya materi dan diagram interaktif', () => {
    for (const b of SEMUA_BALAI) {
      expect(b.materiPoin.length, `${b.kode} tanpa materi`).toBeGreaterThan(0);
      expect(b.diagram.bagian.length, `${b.kode} tanpa diagram`).toBeGreaterThan(0);
    }
  });
});

describe('gender penjaga mengikuti awalan nama', () => {
  it('Ibu / Bu → perempuan', () => {
    expect(genderPenjaga('Ibu Semesta')).toBe('perempuan');
    expect(genderPenjaga('Bu Cahaya')).toBe('perempuan');
  });
  it('Pak / Raja → laki-laki', () => {
    expect(genderPenjaga('Pak Gaung')).toBe('laki-laki');
    expect(genderPenjaga('Raja Rimba')).toBe('laki-laki');
  });
});

describe('verifikasi beberapa kunci (dicek ulang manual)', () => {
  const bank = getQuestionBank();
  const byId = (id: string) => bank.find((q) => q.id === id);

  it('b01-s01 cahaya merambat lurus = B', () => {
    expect(byId('b01-s01')?.answer).toBe('lurus');
  });
  it('b03-s01 hubungan timbal balik = ekosistem', () => {
    expect(byId('b03-s01')?.answer).toBe('ekosistem');
  });
  it('b07-s02 gaya tarik terkuat = kutub-kutub magnet', () => {
    expect(byId('b07-s02')?.answer).toBe('kutub-kutub magnet');
  });
  it('b09-s01 lapisan batuan kulit bumi = litosfer', () => {
    expect(byId('b09-s01')?.answer).toBe('litosfer');
  });
  it('FINAL memuat soal dari berbagai materi', () => {
    const final = bank.filter((q) => q.balai === 'FINAL');
    const kode = new Set(final.map((q) => q.meta.kodeMateri));
    expect(kode.size).toBeGreaterThan(5);
  });
});
