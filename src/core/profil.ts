import type { Progress } from '../../shared/types';
import { createDefaultProgress, mergeProgress } from './state';

/**
 * Profil pemain di satu perangkat.
 *
 * Progres yang sedang dimainkan tetap disimpan di kunci progres biasa
 * (lihat core/state.ts). Profil lain "diparkir" di sini:
 * - satu profil Bermain Sendiri, dan
 * - satu profil per (token kelas + nama siswa).
 *
 * Dengan begitu perangkat yang dipakai bergantian (mis. laptop di lab) bisa
 * menyimpan petualangan beberapa siswa sekaligus, dan bergabung ke kelas
 * selalu dimulai dari awal tanpa menghapus progres main sendiri.
 */

const KUNCI_PROFIL = 'survival-sains:profil-tersimpan:v1';

interface Simpanan {
  sendiri?: Partial<Progress>;
  kelas: Record<string, Partial<Progress>>;
}

function baca(): Simpanan {
  try {
    const raw = localStorage.getItem(KUNCI_PROFIL);
    const data = raw ? (JSON.parse(raw) as Partial<Simpanan>) : {};
    return { sendiri: data.sendiri, kelas: data.kelas && typeof data.kelas === 'object' ? data.kelas : {} };
  } catch {
    return { kelas: {} };
  }
}

function tulis(s: Simpanan): void {
  try {
    localStorage.setItem(KUNCI_PROFIL, JSON.stringify(s));
  } catch {
    /* localStorage penuh/diblokir: profil tidak diparkir */
  }
}

/** ID tetap profil kelas: "s-" + 16 huruf/angka acak. */
export function buatIdSiswa(): string {
  let acak = '';
  try {
    const b = new Uint8Array(12);
    crypto.getRandomValues(b);
    acak = Array.from(b, (x) => x.toString(36).padStart(2, '0')).join('');
  } catch {
    acak = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return `s-${acak.replace(/[^a-z0-9]/g, '').slice(0, 16).padEnd(8, '0')}`;
}

/** Kunci profil kelas: token + nama (tanpa beda huruf besar/kecil). */
export function kunciKelas(token: string, nama: string): string {
  return `${token}|${nama.trim().toLowerCase()}`;
}

/** Memarkir progres yang sedang dimainkan sebelum berganti profil. */
export function parkirProfil(p: Progress): void {
  const s = baca();
  if (p.token) s.kelas[kunciKelas(p.token, p.playerName)] = p;
  else s.sendiri = p;
  tulis(s);
}

/** Profil kelas yang pernah dipakai di perangkat ini untuk token + nama tersebut. */
export function cariProfilKelas(token: string, nama: string): Progress | null {
  const p = baca().kelas[kunciKelas(token, nama)];
  return p ? mergeProgress(p) : null;
}

/** Progres Bermain Sendiri yang diparkir, bila ada. */
export function ambilProfilSendiri(): Progress | null {
  const p = baca().sendiri;
  return p ? mergeProgress(p) : null;
}

/** Profil baru (mulai dari awal) yang mewarisi karakter & warna pakaian `dasar`. */
function profilBaru(dasar: Progress, nama: string): Progress {
  return {
    ...createDefaultProgress(nama, dasar.gender),
    warnaBaju: dasar.warnaBaju,
    warnaBawahan: dasar.warnaBawahan,
    warnaHijab: dasar.warnaHijab,
    kostum: dasar.kostum ? { ...dasar.kostum, warna: dasar.kostum.warna ? { ...dasar.kostum.warna } : undefined } : undefined,
    // Karakter sudah dipilih: langsung ke cerita pembuka, tanpa mengulang kartu anggota.
    introDone: true,
  };
}

/** Profil kelas baru: mulai dari awal, dengan ID tetap (ID lama dipakai lagi bila ada). */
export function profilKelasBaru(dasar: Progress, token: string, nama: string, idSiswa?: string): Progress {
  return { ...profilBaru(dasar, nama), token, idSiswa: idSiswa ?? buatIdSiswa() };
}

/** Profil main sendiri baru (dipakai bila siswa belum pernah main sendiri). */
export function profilSendiriBaru(dasar: Progress): Progress {
  return profilBaru(dasar, dasar.playerName);
}

/** Apakah petualangan di profil ini belum benar-benar dimulai. */
export function belumMulai(p: Progress): boolean {
  return !p.prologSelesai && p.visitedNoktah.length === 0 && p.answers.length === 0;
}

/* ------------------------------------------------------------------ */
/* Aksi kelas: didaftarkan oleh main.ts agar bisa dipanggil dari mana  */
/* saja (menu utama, ⚙️ Pengaturan) tanpa saling impor melingkar.      */
/* ------------------------------------------------------------------ */

export interface AksiKelas {
  /** Progres yang sedang dimainkan. */
  progres: () => Progress;
  /** Pindah ke profil kelas (baru atau lanjutan), lalu kembali ke menu utama. */
  gabung: (profil: Progress) => void;
  /** Keluar dari kelas: kembali ke profil Bermain Sendiri, lalu ke menu utama. */
  keluar: () => void;
}

let aksi: AksiKelas | null = null;

export function aturAksiKelas(a: AksiKelas): void {
  aksi = a;
}

export function aksiKelas(): AksiKelas | null {
  return aksi;
}
