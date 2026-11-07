import { describe, it, expect, beforeEach } from 'vitest';
import { CERITA, URUTAN_BALAI, FINAL_BAGIAN, BATAS_LULUS_FINAL, balaiSebelum, balaiSesudah, getCerita } from '../src/data/cerita';
import { ADEGAN, adeganUntukSoal, getAdegan } from '../src/data/adegan';
import { NOKTAH, getBalai } from '../src/data/balai';
import { getQuestionsByBalai } from '../src/data/bank';
import {
  createDefaultProgress,
  applyBalaiResult,
  isBalaiUnlocked,
  isPuncakUnlocked,
  balaiTujuan,
  tahapMisi,
  setTahapMisi,
  tambahAlat,
  catatBaca,
  catatFinalBagian,
} from '../src/core/state';
import { bukaPercakapan } from '../src/ui/percakapan';
import { jalankanTantangan } from '../src/ui/tantangan';
import { bukaHalamanCerita } from '../src/ui/halamanCerita';
import { tataLetakUntuk } from '../src/world/noktahWorld';

const BAB = ['F01', 'F02', 'H01', 'H02', 'H03', 'H04', 'F03', 'F04', 'E01', 'E02', 'E03'];

/** Menunggu sampai elemen yang cocok muncul (UI memakai efek mengetik). */
async function tunggu(sel: string, teks?: string, batas = 3000): Promise<HTMLElement> {
  const mulai = Date.now();
  while (Date.now() - mulai < batas) {
    const daftar = Array.from(document.querySelectorAll<HTMLElement>(sel));
    const hit = teks ? daftar.find((d) => d.textContent?.includes(teks)) : daftar[0];
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`Elemen tidak muncul: ${sel} ${teks ?? ''}`);
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('naskah cerita Survival Sains', () => {
  it('11 balai berurutan sesuai bab buku (Bab 1 Cahaya → Bab 9 Bumi)', () => {
    expect(URUTAN_BALAI).toEqual(BAB);
    expect(CERITA.map((c) => c.urutan).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('tepat 9 penjaga (Ibu Pertiwi menjaga tiga halaman Bumi)', () => {
    const nama = new Set(CERITA.map((c) => c.penjaga.nama));
    expect(nama.size).toBe(9);
    expect(CERITA.filter((c) => c.penjaga.nama === 'Ibu Pertiwi').map((c) => c.kode)).toEqual(['E01', 'E02', 'E03']);
  });

  it('setiap balai memuat nilai islami: salam, basmalah, hamdalah, dan hikmah', () => {
    for (const c of CERITA) {
      expect(c.misi[0]?.teks).toContain("Assalamu'alaikum");
      expect(c.ujiBuka.toLowerCase()).toContain('bismillah');
      expect(c.lulus.some((b) => b.teks.includes('Alhamdulillah'))).toBe(true);
      expect(c.hikmah.length).toBeGreaterThan(20);
      expect(c.pilihan.length).toBeGreaterThanOrEqual(2);
      expect(c.pembukaSoal.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('balai sebelum/sesudah mengikuti jalur', () => {
    expect(balaiSebelum('F01')).toBeNull();
    expect(balaiSebelum('H01')).toBe('F02');
    expect(balaiSesudah('F04')).toBe('E01');
    expect(balaiSesudah('E03')).toBeNull();
  });

  it('daftar noktah memakai urutan bab, nama tempat, dan nama penjaga baru', () => {
    expect(NOKTAH.map((n) => n.kode)).toEqual([...BAB, 'FINAL']);
    expect(getBalai('F01')?.penjaga).toBe('Mbok Sinar');
    expect(getBalai('F01')?.tokohMateri.nama).toBe('Cantrik Prisma');
    for (const n of NOKTAH) {
      expect(n.peta.x).toBeGreaterThan(0);
      expect(n.peta.x).toBeLessThan(100);
      expect(n.peta.y).toBeGreaterThan(0);
      expect(n.peta.y).toBeLessThan(100);
    }
  });

  it('Final: 4 bagian mencakup 30 soal dan semua 11 kode materi', () => {
    const pool = getQuestionsByBalai('FINAL');
    const total = FINAL_BAGIAN.reduce((s, b) => s + pool.filter((q) => b.kode.includes(q.meta.kodeMateri)).length, 0);
    expect(total).toBe(30);
    expect(new Set(FINAL_BAGIAN.flatMap((b) => b.kode)).size).toBe(11);
    expect(BATAS_LULUS_FINAL).toBe(21);
  });
});

describe('Halaman Cerita (adegan)', () => {
  it('setiap materi punya 4 adegan dan tepat satu interaksi di akhir', () => {
    for (const kode of BAB) {
      const daftar = getAdegan(kode);
      expect(daftar.length).toBe(4);
      expect(daftar.filter((a) => a.interaksi).length).toBe(1);
      expect(daftar[3]?.interaksi).toBeTruthy();
    }
  });

  it('data interaksi valid (kelompok, urut, pilih)', () => {
    for (const daftar of Object.values(ADEGAN)) {
      for (const a of daftar) {
        const ia = a.interaksi;
        if (!ia) continue;
        if (ia.jenis === 'kelompok') {
          expect(ia.item.length).toBeGreaterThanOrEqual(3);
          for (const it of ia.item) expect(it.k).toBeLessThan(ia.kelompok.length);
        } else if (ia.jenis === 'urut') {
          expect(ia.item.length).toBeGreaterThanOrEqual(3);
        } else {
          expect(ia.opsi.filter((o) => o.benar).length).toBe(1);
        }
      }
    }
  });

  it('mencocokkan soal dengan adegan yang relevan untuk petunjuk', () => {
    expect(adeganUntukSoal('F02', 'Bunyi pantul yang terdengar setelah bunyi asli disebut gema')).toBe(1);
    expect(adeganUntukSoal('E02', 'Lapisan atmosfer tempat terjadinya cuaca adalah troposfer')).toBe(2);
  });

  it('membuka buku, mengunci adegan interaksi, lalu tamat di halaman Kunci Ingat', async () => {
    const cerita = getCerita('F03');
    const meta = getBalai('F03');
    if (!cerita || !meta) throw new Error('data hilang');
    const janji = bukaHalamanCerita(document.body, { cerita, meta });
    for (let i = 0; i < 3; i++) (await tunggu('.cerita-navigasi .btn', 'Lanjut')).click();
    const kunci = await tunggu('.cerita-navigasi .btn', 'Selesaikan');
    expect((kunci as HTMLButtonElement).disabled).toBe(true);
    (await tunggu('.cerita-pilih button', 'Paku besi')).click();
    const lanjut = await tunggu('.cerita-navigasi .btn', 'Lanjut');
    expect((lanjut as HTMLButtonElement).disabled).toBe(false);
    lanjut.click();
    await tunggu('.cerita-kunci');
    expect(document.body.textContent).toContain(meta.kunciJawab);
    expect(document.body.textContent).toContain(cerita.hikmah);
    (await tunggu('.cerita-navigasi .btn', 'Selesai membaca')).click();
    const hasil = await janji;
    expect(hasil.tamat).toBe(true);
    expect(document.querySelector('.cerita-overlay')).toBeNull();
  });
});

describe('tantangan dalam percakapan', () => {
  it('mencatat pilihan & jumlah hati (nyawa) terpakai untuk guru', async () => {
    const c = getCerita('F01');
    if (!c) throw new Error('data hilang');
    const pool = getQuestionsByBalai('F01');
    const p = bukaPercakapan(document.body, { nama: 'Sari', gender: 'perempuan' });
    const percobaan: Array<[boolean, number]> = [];
    const janji = jalankanTantangan(p, {
      balai: 'F01',
      pool,
      jumlah: 3,
      penjaga: c.penjaga,
      pembuka: c.pembukaSoal,
      onPercobaan: (benar, sisa) => percobaan.push([benar, sisa]),
    });
    /** Teks percakapan lengkap (lewati efek mengetik) + jumlah hati ❤️/🤍 yang tampil. */
    const bacaKotak = (): { teks: string; ada: number; hilang: number } => {
      document.querySelector('.vn-teks')?.dispatchEvent(new MouseEvent('click'));
      return {
        teks: document.querySelector('.vn-teks')?.textContent ?? '',
        ada: document.querySelectorAll('.nyawa .ada').length,
        hilang: document.querySelectorAll('.nyawa .hilang').length,
      };
    };

    const soalSaatIni = async () => {
      const teks = (await tunggu('.vn-pilihan.jawab')) && document.querySelector('.vn-teks');
      // Tunggu efek mengetik selesai.
      teks?.dispatchEvent(new MouseEvent('click'));
      const isi = document.querySelector('.vn-teks')?.textContent ?? '';
      const q = pool.find((x) => isi.includes(x.prompt));
      if (!q) throw new Error(`soal tidak dikenali: ${isi}`);
      return q;
    };

    // Soal 1: salah sekali, lalu benar (2 percobaan).
    let q = await soalSaatIni();
    // Awal soal: 3 hati penuh, tidak ada ikon obor lagi.
    expect(bacaKotak()).toMatchObject({ ada: 3, hilang: 0 });
    expect(document.querySelector('.obor')).toBeNull();
    const salah = (q.options ?? []).find((o) => o !== q.answer) as string;
    (await tunggu('.vn-pilihan.jawab', salah)).click();
    await tunggu('.vn-pilihan', 'Coba lagi');
    // Satu hati hilang, dan teks (yang juga dibacakan TTS) menyebut sisa hati.
    const setelahSalah = bacaKotak();
    expect(setelahSalah).toMatchObject({ ada: 2, hilang: 1 });
    expect(setelahSalah.teks).toContain('Hatimu tinggal dua');
    (await tunggu('.vn-pilihan', 'Coba lagi')).click();
    q = await soalSaatIni();
    (await tunggu('.vn-pilihan.jawab', String(q.answer))).click();
    (await tunggu('.vn-lanjut')).click();

    // Soal 2: salah 3 kali (hati habis).
    q = await soalSaatIni();
    const salahSemua = (q.options ?? []).filter((o) => o !== q.answer);
    for (let i = 0; i < 3; i++) {
      (await tunggu('.vn-pilihan.jawab', salahSemua[i] as string)).click();
      if (i < 2) {
        (await tunggu('.vn-pilihan', 'Coba lagi')).click();
        q = await soalSaatIni();
      }
    }
    await tunggu('.vn-lanjut');
    const habis = bacaKotak();
    expect(habis.teks).toContain('Hatimu sudah habis');
    expect(habis).toMatchObject({ ada: 0, hilang: 3 });
    (await tunggu('.vn-lanjut')).click();

    // Soal 3: langsung benar.
    q = await soalSaatIni();
    (await tunggu('.vn-pilihan.jawab', String(q.answer))).click();
    (await tunggu('.vn-lanjut')).click();

    const hasil = await janji;
    p.tutup();
    expect(hasil.total).toBe(3);
    expect(hasil.benar).toBe(2);
    expect(hasil.jawaban.map((j) => j.percobaan)).toEqual([2, 3, 1]);
    expect(hasil.jawaban.map((j) => j.correct)).toEqual([true, false, true]);
    expect(hasil.jawaban[1]?.pilihan?.length).toBe(3);
    // Hook untuk panggung menara: tiap percobaan dilaporkan (benar?, sisa hati).
    expect(percobaan).toEqual([
      [false, 2],
      [true, 0],
      [false, 2],
      [false, 1],
      [false, 0],
      [true, 0],
    ]);
  }, 30000);
});

describe('misi & progres berurutan', () => {
  it('tahap misi hanya naik, alat tidak dobel, bacaan tercatat', () => {
    let p = createDefaultProgress();
    expect(tahapMisi(p, 'F01')).toBe(0);
    p = setTahapMisi(p, 'F01', 2);
    p = setTahapMisi(p, 'F01', 1);
    expect(tahapMisi(p, 'F01')).toBe(2);
    p = tambahAlat(tambahAlat(p, 'F01'), 'F01');
    expect(p.alat).toEqual(['F01']);
    p = catatBaca(catatBaca(p, 'F01', 30), 'F01', 12.4);
    expect(p.bacaan.F01).toEqual({ detik: 42, ulang: 1 });
  });

  it('lulus satu balai membuka balai berikutnya; tujuan ikut bergeser', () => {
    let p = createDefaultProgress();
    expect(balaiTujuan(p)).toBe('F01');
    p = applyBalaiResult(p, 'F01', 1, 3, []);
    expect(isBalaiUnlocked(p, 'F02')).toBe(true);
    expect(isBalaiUnlocked(p, 'H01')).toBe(false);
    expect(balaiTujuan(p)).toBe('F02');
    expect(tahapMisi(p, 'F01')).toBe(3);
  });

  it('Mercusuar terbuka saat 11 balai lulus; nilai Final per bagian disimpan terbaik', () => {
    let p = createDefaultProgress();
    for (const k of BAB) p = applyBalaiResult(p, k, 2, 3, []);
    expect(isPuncakUnlocked(p)).toBe(true);
    expect(balaiTujuan(p)).toBe('FINAL');
    p = catatFinalBagian(p, 1, 9);
    p = catatFinalBagian(p, 1, 6);
    expect(p.finalBagian).toEqual([0, 9, 0, 0]);
  });

  it('tata letak titik berbeda antar balai berurutan', () => {
    const a = tataLetakUntuk(1);
    const b = tataLetakUntuk(2);
    const d = tataLetakUntuk(4);
    expect(a.uji).not.toEqual(b.uji);
    expect(a.uji.x).toBe(-d.uji.x);
  });
});
