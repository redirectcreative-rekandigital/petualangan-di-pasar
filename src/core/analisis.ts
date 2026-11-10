import type { ProgresSiswa } from '../../shared/net';
import type { Question } from '../../shared/types';
import { CERITA_ASLI as CERITA, URUTAN_BALAI } from '../data/cerita';

/**
 * Analisis hasil belajar untuk dasbor guru (fungsi murni, mudah diuji).
 *
 * Sumber data: ringkasan progres tiap siswa yang dikirim ke server kelas
 * (tahap misi, bintang, lama membaca, dan catatan jawaban per soal).
 */

export interface SiswaRingkas {
  nama: string;
  progress: ProgresSiswa;
}

export type StatusBalai = 'belum' | 'misi' | 'cerita' | 'lulus' | 'bantuan';

/** Status satu siswa di satu balai untuk matriks kelas. */
export function statusBalai(p: ProgresSiswa, kode: string): StatusBalai {
  const bintang = p.bintang?.[kode] ?? 0;
  const tahap = p.tahap?.[kode] ?? 0;
  const jawab = (p.jawaban ?? []).filter((j) => j.k === kode && !j.q.startsWith('final'));
  if (bintang >= 1 || tahap >= 3) {
    const benar = jawab.filter((j) => j.b).length;
    // Lulus tapi akurasi rendah (≤ 1/3) tetap ditandai perlu bantuan.
    if (jawab.length >= 3 && benar / jawab.length <= 1 / 3) return 'bantuan';
    return 'lulus';
  }
  if (jawab.length > 0) return 'bantuan';
  if (tahap >= 2) return 'cerita';
  if (tahap >= 1) return 'misi';
  return 'belum';
}

export const LABEL_STATUS: Record<StatusBalai, { ikon: string; teks: string }> = {
  belum: { ikon: '⬜', teks: 'Belum mulai' },
  misi: { ikon: '💬', teks: 'Menerima misi' },
  cerita: { ikon: '📖', teks: 'Sudah membaca cerita' },
  lulus: { ikon: '✅', teks: 'Lulus' },
  bantuan: { ikon: '🆘', teks: 'Perlu bantuan' },
};

export interface StatSoal {
  id: string;
  kode: string;
  prompt: string;
  indikator: string;
  dijawab: number;
  /** Persen siswa yang benar (pada percobaan mana pun). */
  persenBenar: number;
  /** Persen siswa yang benar pada percobaan pertama. */
  persenBenarPertama: number;
  rataPercobaan: number;
  /** Pilihan salah paling sering dipilih (miskonsepsi). */
  salahTerbanyak: { teks: string; persen: number } | null;
}

/** Statistik per soal dari seluruh siswa, diurutkan dari yang tersulit. */
export function statistikSoal(siswa: SiswaRingkas[], bank: Question[]): StatSoal[] {
  const peta = new Map<string, { dijawab: number; benar: number; pertama: number; percobaan: number; salah: Map<string, number> }>();
  for (const s of siswa) {
    for (const j of s.progress.jawaban ?? []) {
      const q = bank.find((x) => x.id === j.q);
      if (!q) continue;
      const st = peta.get(j.q) ?? { dijawab: 0, benar: 0, pertama: 0, percobaan: 0, salah: new Map<string, number>() };
      st.dijawab += 1;
      if (j.b) st.benar += 1;
      if (j.b && j.n === 1) st.pertama += 1;
      st.percobaan += j.n;
      for (const pilihan of j.p) {
        if (pilihan !== String(q.answer)) st.salah.set(pilihan, (st.salah.get(pilihan) ?? 0) + 1);
      }
      peta.set(j.q, st);
    }
  }
  const hasil: StatSoal[] = [];
  for (const [id, st] of peta) {
    const q = bank.find((x) => x.id === id);
    if (!q) continue;
    let salahTerbanyak: StatSoal['salahTerbanyak'] = null;
    for (const [teks, n] of st.salah) {
      const persen = Math.round((n / st.dijawab) * 100);
      if (!salahTerbanyak || persen > salahTerbanyak.persen) salahTerbanyak = { teks, persen };
    }
    hasil.push({
      id,
      kode: q.meta.kodeMateri,
      prompt: q.prompt,
      indikator: q.meta.indikator,
      dijawab: st.dijawab,
      persenBenar: Math.round((st.benar / st.dijawab) * 100),
      persenBenarPertama: Math.round((st.pertama / st.dijawab) * 100),
      rataPercobaan: Math.round((st.percobaan / st.dijawab) * 10) / 10,
      salahTerbanyak,
    });
  }
  return hasil.sort((a, b) => a.persenBenarPertama - b.persenBenarPertama || b.dijawab - a.dijawab);
}

export interface StatMateri {
  kode: string;
  judul: string;
  persenBenar: number;
  dijawab: number;
  lulus: number;
}

/** Ketuntasan kelas per materi (bab). */
export function statistikMateri(siswa: SiswaRingkas[]): StatMateri[] {
  return URUTAN_BALAI.map((kode) => {
    const c = CERITA.find((x) => x.kode === kode);
    let dijawab = 0;
    let benar = 0;
    let lulus = 0;
    for (const s of siswa) {
      const jawab = (s.progress.jawaban ?? []).filter((j) => j.k === kode);
      dijawab += jawab.length;
      benar += jawab.filter((j) => j.b).length;
      if ((s.progress.bintang?.[kode] ?? 0) >= 1) lulus += 1;
    }
    return {
      kode,
      judul: c ? `${c.bab} ${c.judulBab}` : kode,
      persenBenar: dijawab > 0 ? Math.round((benar / dijawab) * 100) : 0,
      dijawab,
      lulus,
    };
  });
}

/** Rekomendasi tindak lanjut untuk seorang siswa. */
export function rekomendasi(p: ProgresSiswa): string[] {
  const saran: string[] = [];
  for (const kode of URUTAN_BALAI) {
    const c = CERITA.find((x) => x.kode === kode);
    if (!c) continue;
    const jawab = (p.jawaban ?? []).filter((j) => j.k === kode);
    if (jawab.length === 0) continue;
    const benar = jawab.filter((j) => j.b).length;
    const akurasi = benar / jawab.length;
    const baca = p.bacaan?.[kode]?.detik ?? 0;
    if (akurasi < 0.6) {
      saran.push(`Perlu bimbingan ulang di ${c.bab} ${c.judulBab} (benar ${Math.round(akurasi * 100)}%).`);
    }
    if (baca > 0 && baca < 40 && akurasi < 0.7) {
      saran.push(`Membaca cerita ${c.judulBab} terlalu cepat (${Math.round(baca)} detik). Ajak membaca ulang.`);
    }
  }
  if (saran.length === 0 && (p.jawaban ?? []).length > 0) saran.push('Kemajuan baik. Beri tantangan tambahan atau minta menjelaskan ke teman.');
  return saran;
}

/** Ringkasan per siswa per balai untuk ekspor CSV. */
export function barisCsvSiswa(s: SiswaRingkas): string[] {
  const p = s.progress;
  const kolom: string[] = [];
  for (const kode of URUTAN_BALAI) {
    const jawab = (p.jawaban ?? []).filter((j) => j.k === kode && !j.q.startsWith('final'));
    const benar = jawab.filter((j) => j.b).length;
    kolom.push(
      String(p.bintang?.[kode] ?? 0),
      LABEL_STATUS[statusBalai(p, kode)].teks,
      String(Math.round(p.bacaan?.[kode]?.detik ?? 0)),
      jawab.length > 0 ? `${benar}/${jawab.length}` : '',
    );
  }
  return kolom;
}

export function kepalaCsvBalai(): string[] {
  return URUTAN_BALAI.flatMap((k) => [`${k}_bintang`, `${k}_status`, `${k}_baca_detik`, `${k}_benar`]);
}
