import type { BalaiId, NoktahId, Progress, BalaiProgress, AnswerRecord, Stars, PlayerGender } from '../../shared/types';
import { BAHAI_TKA, NOKTAH, noktahMateri, getNoktah } from '../data/balai';
import { isBalaiPassed, starsForCorrect } from './scoring';

const STORAGE_KEY = 'petualangan-di-pasar:progress:v2';

export const APP_INFO = {
  judul: 'Petualangan di Pasar',
  judulLama: 'Pasar Amanah 3D',
  subjudul: 'Petualangan Jelajah Pasar 3D untuk Siap TKA Matematika',
  pembuat: 'Rosyitania Yudha Astari, S.Pd',
  sekolah: 'Guru SD Muhammadiyah Wonorejo Polokarto',
  jenjang: 'Kelas 6 SD/MI',
  konteks: 'Persiapan Tes Kemampuan Akademik (TKA) - Numerasi Matematika',
  nilaiKarakter:
    'Kejujuran dan amanah dalam berdagang: tidak mengurangi timbangan dan menghitung kembalian dengan jujur.',
  tujuan: [
    'Menjelajahi 16 noktah materi TKA pada peta petualangan: Bilangan, Geometri, dan Data.',
    'Memasuki noktah lalu belajar di balai (sub-materi) dengan bacaan ringkas dan 3 soal.',
    'Menyelesaikan babak puncak "Pasar Ramai" berisi 30 soal campuran.',
    'Melatih penalaran lewat soal cerita dan pengambilan kesimpulan berbasis data.',
  ],
} as const;

/** Seluruh balai yang bisa dimainkan (untuk pencarian & statistik). */
export const BALAI_LIST = BAHAI_TKA;

/** Seluruh noktah (16 materi + FINAL). */
export const NOKTAH_LIST = NOKTAH;

/** Nama karakter pemain berdasarkan pilihan jenis kelamin. */
export const KARAKTER: Record<PlayerGender, { label: string; emoji: string; warna: number }> = {
  'laki-laki': { label: 'Laki-laki', emoji: '👦', warna: 0x2563eb },
  perempuan: { label: 'Perempuan (Hijab)', emoji: '🧕', warna: 0xd946a6 },
};

export function balaiKey(id: BalaiId): string {
  return String(id);
}

function emptyBalaiProgress(): BalaiProgress {
  return { stars: 0, bestScore: 0, correct: 0, total: 3, unlocked: true };
}

/**
 * Semua noktah & balai terbuka sejak awal (bebas dipilih).
 * Tidak ada penguncian progresif seperti versi sebelumnya.
 */
export function isNoktahUnlocked(_progress: Progress, _kode: NoktahId): boolean {
  return true;
}

export function isBalaiUnlocked(_progress: Progress, _kode: BalaiId): boolean {
  return true;
}

/**
 * Pasar Ramai (FINAL) terbuka setelah semua 16 noktah materi PERNAH dimasuki,
 * tanpa memandang bintang atau benar/salah (aturan A(ii)).
 */
export function isPuncakUnlocked(progress: Progress): boolean {
  return noktahMateri().every((n) => progress.visitedNoktah.includes(n.kode));
}

export function sudahKunjungiNoktah(progress: Progress, kode: NoktahId): boolean {
  return progress.visitedNoktah.includes(kode);
}

export function isBalaiPassedIn(progress: Progress, kode: BalaiId): boolean {
  const prog = progress.balai[balaiKey(kode)];
  return Boolean(prog && isBalaiPassed(prog.stars));
}

/** Progres awal: semua terbuka, belum ada noktah dikunjungi. */
export function createDefaultProgress(playerName = '', gender: PlayerGender = 'laki-laki'): Progress {
  const balai: Record<string, BalaiProgress> = {};
  for (const meta of BALAI_LIST) {
    balai[balaiKey(meta.kode)] = emptyBalaiProgress();
  }
  return {
    playerName,
    gender,
    introDone: false,
    coins: 0,
    visitedNoktah: [],
    unlocked: BALAI_LIST.map((b) => b.kode),
    balai,
    answers: [],
    puncakLulus: false,
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return mergeProgress(parsed);
  } catch (err) {
    console.warn('Gagal memuat progres, memakai progres baru.', err);
    return createDefaultProgress();
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Gagal menyimpan progres (localStorage mungkin penuh/diblokir).', err);
  }
}

export function resetProgress(): Progress {
  const fresh = createDefaultProgress();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Gagal menghapus progres.', err);
  }
  saveProgress(fresh);
  return fresh;
}

function mergeProgress(partial: Partial<Progress>): Progress {
  const gender: PlayerGender = partial.gender === 'perempuan' ? 'perempuan' : 'laki-laki';
  const base = createDefaultProgress(partial.playerName ?? '', gender);
  const balai: Record<string, BalaiProgress> = { ...base.balai };
  if (partial.balai) {
    for (const meta of BALAI_LIST) {
      const key = balaiKey(meta.kode);
      const incoming = partial.balai[key];
      if (incoming) {
        balai[key] = {
          stars: clampStars(incoming.stars),
          bestScore: Number(incoming.bestScore) || 0,
          correct: Number(incoming.correct) || 0,
          total: Number(incoming.total) || 3,
          unlocked: true,
        };
      }
    }
  }
  const visited = Array.isArray(partial.visitedNoktah)
    ? partial.visitedNoktah.filter((k): k is NoktahId => Boolean(getNoktah(k)))
    : [];
  return {
    playerName: partial.playerName ?? '',
    gender,
    introDone: Boolean(partial.introDone),
    coins: Number(partial.coins) || 0,
    visitedNoktah: visited,
    unlocked: BALAI_LIST.map((b) => b.kode),
    balai,
    answers: Array.isArray(partial.answers) ? partial.answers : [],
    puncakLulus: Boolean(partial.puncakLulus),
    completedAt: partial.completedAt,
    warnaBaju: typeof partial.warnaBaju === 'number' ? partial.warnaBaju : undefined,
    warnaBawahan: typeof partial.warnaBawahan === 'number' ? partial.warnaBawahan : undefined,
    warnaHijab: typeof partial.warnaHijab === 'number' ? partial.warnaHijab : undefined,
    token: typeof partial.token === 'string' && partial.token ? partial.token : undefined,
  };
}

function clampStars(value: unknown): Stars {
  const n = Number(value) || 0;
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  if (n >= 1) return 1;
  return 0;
}

/** Menandai sebuah noktah sudah pernah dikunjungi. */
export function tandaiNoktahDikunjungi(progress: Progress, kode: NoktahId): Progress {
  if (progress.visitedNoktah.includes(kode)) return progress;
  return { ...progress, visitedNoktah: [...progress.visitedNoktah, kode] };
}

/**
 * Menerapkan hasil sesi balai ke progres: bintang terbaik, koin, dan menandai
 * noktah induk sudah dikunjungi.
 */
export function applyBalaiResult(
  progress: Progress,
  kode: BalaiId,
  correct: number,
  total: number,
  answers: AnswerRecord[],
): Progress {
  const stars = starsForCorrect(correct);
  const key = balaiKey(kode);
  const current = progress.balai[key] ?? emptyBalaiProgress();
  const updated: BalaiProgress = {
    stars: Math.max(current.stars, stars) as Stars,
    bestScore: Math.max(current.bestScore, correct * 10),
    correct,
    total,
    unlocked: true,
  };
  const balai = { ...progress.balai, [key]: updated };
  const noktahInduk = BAHAI_TKA.find((b) => b.kode === kode)?.noktah;
  const withVisit = noktahInduk ? tandaiNoktahDikunjungi(progress, noktahInduk) : progress;
  return {
    ...withVisit,
    balai,
    answers: [...progress.answers, ...answers],
  };
}

/** Menandai lulus/tidak lulusnya Pasar Ramai. */
export function applyPuncakResult(progress: Progress, lulus: boolean, answers: AnswerRecord[]): Progress {
  const withVisit = tandaiNoktahDikunjungi(progress, 'FINAL');
  return {
    ...withVisit,
    puncakLulus: withVisit.puncakLulus || lulus,
    answers: [...withVisit.answers, ...answers],
    completedAt: lulus && !progress.puncakLulus ? new Date().toISOString() : withVisit.completedAt,
  };
}

export function totalStars(progress: Progress): number {
  return BALAI_LIST.reduce((sum, b) => sum + (progress.balai[balaiKey(b.kode)]?.stars ?? 0), 0);
}

/**
 * Apakah ada progres yang layak dilanjutkan? (sudah pernah masuk peta, atau
 * sudah pernah mengunjungi/menyelesaikan sesuatu.)
 */
export function adaProgresTersimpan(progress: Progress): boolean {
  return (
    progress.introDone ||
    progress.visitedNoktah.length > 0 ||
    totalStars(progress) > 0 ||
    progress.puncakLulus
  );
}

export function maxStars(): number {
  return noktahMateri().length * 3;
}

/** Jumlah noktah materi yang pernah dikunjungi. */
export function noktahDikunjungiCount(progress: Progress): number {
  return noktahMateri().filter((n) => progress.visitedNoktah.includes(n.kode)).length;
}

export function balaiSelesaiCount(progress: Progress): number {
  return BALAI_LIST.filter((b) => isBalaiPassedIn(progress, b.kode)).length;
}

/** Rata-rata bintang per noktah (dipakai untuk ringkasan/diagnostik guru). */
export function ringkasanNoktah(progress: Progress): Array<{ kode: NoktahId; nama: string; stars: number }> {
  return noktahMateri().map((n) => {
    const balai = n.balai[0];
    const stars = balai ? (progress.balai[balaiKey(balai.kode)]?.stars ?? 0) : 0;
    return { kode: n.kode, nama: n.nama, stars };
  });
}
