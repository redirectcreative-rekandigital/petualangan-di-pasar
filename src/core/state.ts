import type { BalaiId, NoktahId, Progress, BalaiProgress, AnswerRecord, Stars, PlayerGender, TahapMisi, CatatanBaca, IdPanduan } from '../../shared/types';
import { URUTAN_BALAI, balaiSebelum, FINAL_BAGIAN } from '../data/cerita';
import { SEMUA_BALAI, NOKTAH, noktahMateri, getNoktah } from '../data/balai';
import { isBalaiPassed, skorJawaban, starsForSkor } from './scoring';
import { t } from './bahasa';

const STORAGE_KEY = 'survival-sains:progress:v1';

export const APP_INFO = {
  judul: 'Survival Sains',
  subjudul: t('Petualangan bertahan hidup dengan ilmu IPA untuk Kelas 5 SD/MI'),
  pembuat: 'Rosyitania Yudha Astari, S.Pd',
  sekolah: t('Guru SD Muhammadiyah Wonorejo Polokarto'),
  jenjang: t('Kelas 5 SD/MI'),
  mapel: t('IPA (Ilmu Pengetahuan Alam)'),
  platformAi: 'Claude (Anthropic) untuk ide, naskah, kode, dan pengujian',
  konteks: t('Penguatan materi IPA kelas 5: cahaya, bunyi, ekosistem, rantai makanan, simbiosis, kelestarian, magnet, listrik, dan bumi'),
  nilaiKarakter:
    t('Rasa ingin tahu yang santun dan sayang pada alam. Alam adalah tanda kebesaran Allah, dan manusia adalah khalifah penjaga bumi.'),
  tujuan: [
    t('Memahami 9 bab IPA kelas 5 lewat 11 Halaman Cerita bergambar dan interaktif.'),
    t('Menerapkan konsep IPA untuk memecahkan masalah bertahan hidup di setiap balai.'),
    t('Menjawab soal pilihan ganda dengan umpan balik dan petunjuk yang merujuk ke cerita.'),
    t('Menyelesaikan Final di Mercusuar Tua (30 soal) dengan batas lulus 70%.'),
  ],
} as const;

/** Seluruh balai yang bisa dimainkan (untuk pencarian & statistik). */
export const BALAI_LIST = SEMUA_BALAI;

/** Seluruh noktah (11 balai materi + FINAL). */
export const NOKTAH_LIST = NOKTAH;

/** Nama karakter pemain berdasarkan pilihan jenis kelamin. */
export const KARAKTER: Record<PlayerGender, { label: string; emoji: string; warna: number }> = {
  'laki-laki': { label: t('Laki-laki'), emoji: '👦', warna: 0x2563eb },
  perempuan: { label: t('Perempuan (Hijab)'), emoji: '🧕', warna: 0xd946a6 },
};

export function balaiKey(id: BalaiId): string {
  return String(id);
}

function emptyBalaiProgress(): BalaiProgress {
  return { stars: 0, bestScore: 0, correct: 0, total: 3, unlocked: true };
}

/**
 * Balai dibuka BERURUTAN mengikuti bab buku: balai pertama (Goa Sinar) selalu
 * terbuka; balai berikutnya terbuka setelah balai sebelumnya lulus (≥1 bintang).
 * Berlaku sama untuk mode sendiri dan mode kelas.
 */
export function isBalaiUnlocked(progress: Progress, kode: BalaiId): boolean {
  if (kode === 'FINAL') return isPuncakUnlocked(progress);
  const sebelum = balaiSebelum(String(kode));
  if (!URUTAN_BALAI.includes(kode as (typeof URUTAN_BALAI)[number])) return false;
  return sebelum === null || isBalaiPassedIn(progress, sebelum);
}


/** Mercusuar Tua (FINAL) terbuka setelah ke-11 balai lulus (11 alat di tas). */
export function isPuncakUnlocked(progress: Progress): boolean {
  return URUTAN_BALAI.every((k) => isBalaiPassedIn(progress, k));
}

/** Balai terbuka berikutnya yang belum lulus (tujuan pemain), atau FINAL. */
export function balaiTujuan(progress: Progress): NoktahId {
  const belum = URUTAN_BALAI.find((k) => !isBalaiPassedIn(progress, k));
  return belum ?? 'FINAL';
}

/* ---------------- Misi per balai ---------------- */

export function tahapMisi(progress: Progress, kode: BalaiId): TahapMisi {
  if (isBalaiPassedIn(progress, kode)) return 3;
  return (progress.misi[balaiKey(kode)] ?? 0) as TahapMisi;
}

/** Menaikkan tahap misi (tidak pernah turun). */
export function setTahapMisi(progress: Progress, kode: BalaiId, tahap: TahapMisi): Progress {
  const kini = progress.misi[balaiKey(kode)] ?? 0;
  if (tahap <= kini) return progress;
  return { ...progress, misi: { ...progress.misi, [balaiKey(kode)]: tahap } };
}

/** Menambah alat survival dari balai ke tas. */
export function tambahAlat(progress: Progress, kode: BalaiId): Progress {
  const k = balaiKey(kode);
  if (progress.alat.includes(k)) return progress;
  return { ...progress, alat: [...progress.alat, k] };
}

/** Mencatat lama membaca Halaman Cerita. */
export function catatBaca(progress: Progress, kode: BalaiId, detik: number): Progress {
  const k = balaiKey(kode);
  const lama: CatatanBaca = progress.bacaan[k] ?? { detik: 0, ulang: 0 };
  const sudahPernah = lama.detik > 0;
  return {
    ...progress,
    bacaan: {
      ...progress.bacaan,
      [k]: { detik: Math.round(lama.detik + Math.max(0, detik)), ulang: lama.ulang + (sudahPernah ? 1 : 0) },
    },
  };
}

/** Menyimpan hasil terbaik per bagian Final. */
export function catatFinalBagian(progress: Progress, bagian: number, benar: number): Progress {
  const arr = [...progress.finalBagian];
  while (arr.length < FINAL_BAGIAN.length) arr.push(0);
  arr[bagian] = Math.max(arr[bagian] ?? 0, benar);
  return { ...progress, finalBagian: arr };
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
    prologSelesai: false,
    misi: {},
    alat: [],
    bacaan: {},
    finalBagian: [0, 0, 0, 0],
    panduan: [],
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

/** Merapikan progres dari penyimpanan (mengisi bagian yang hilang). */
export function mergeProgress(partial: Partial<Progress>): Progress {
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
    kostum:
      partial.kostum && typeof partial.kostum === 'object'
        ? { preset: typeof partial.kostum.preset === 'string' ? partial.kostum.preset : undefined, warna: partial.kostum.warna && typeof partial.kostum.warna === 'object' ? { ...partial.kostum.warna } : undefined }
        : undefined,
    token: typeof partial.token === 'string' && partial.token ? partial.token : undefined,
    idSiswa: typeof partial.idSiswa === 'string' && partial.idSiswa ? partial.idSiswa : undefined,
    prologSelesai: Boolean(partial.prologSelesai),
    misi: partial.misi && typeof partial.misi === 'object' ? { ...partial.misi } : {},
    alat: Array.isArray(partial.alat) ? partial.alat.filter((k) => typeof k === 'string') : [],
    bacaan: partial.bacaan && typeof partial.bacaan === 'object' ? { ...partial.bacaan } : {},
    finalBagian: Array.isArray(partial.finalBagian) ? partial.finalBagian.map((n) => Number(n) || 0) : [0, 0, 0, 0],
    panduan: Array.isArray(partial.panduan) ? partial.panduan.filter((x): x is IdPanduan => typeof x === 'string') : [],
  };
}

/* ---------- Panduan awal (sorotan tombol) ---------- */

export function sudahPanduan(progress: Progress, id: IdPanduan): boolean {
  return progress.panduan?.includes(id) ?? false;
}

export function tandaiPanduan(progress: Progress, id: IdPanduan): Progress {
  return sudahPanduan(progress, id) ? progress : { ...progress, panduan: [...(progress.panduan ?? []), id] };
}

/** "Ulangi Panduan": semua panduan muncul lagi saat layarnya dikunjungi. */
export function ulangPanduan(progress: Progress): Progress {
  return { ...progress, panduan: [] };
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
 * Menerapkan hasil sesi balai ke progres: bintang terbaik, nilai, dan menandai
 * noktah induk sudah dikunjungi.
 */
export function applyBalaiResult(
  progress: Progress,
  kode: BalaiId,
  correct: number,
  total: number,
  answers: AnswerRecord[],
): Progress {
  // Jawaban kosong (uji/pintasan) memakai `correct` sebagai skor.
  const stars = starsForSkor(answers.length ? skorJawaban(answers) : correct);
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
  const noktahInduk = SEMUA_BALAI.find((b) => b.kode === kode)?.noktah;
  const withVisit = noktahInduk ? tandaiNoktahDikunjungi(progress, noktahInduk) : progress;
  return {
    ...withVisit,
    balai,
    answers: [...progress.answers, ...answers],
  };
}

/** Menandai lulus/tidak lulusnya Menara Kitab. */
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
    progress.prologSelesai ||
    progress.visitedNoktah.length > 0 ||
    totalStars(progress) > 0 ||
    progress.puncakLulus
  );
}

export function maxStars(): number {
  return noktahMateri().length * 3;
}


export function balaiSelesaiCount(progress: Progress): number {
  return BALAI_LIST.filter((b) => isBalaiPassedIn(progress, b.kode)).length;
}

