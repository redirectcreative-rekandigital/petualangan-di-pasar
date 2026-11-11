/**
 * Tipe protokol jaringan (dipakai klien frontend DAN server Node).
 *
 * Model: satu TOKEN 4 digit = satu "kelas" (ruang). Guru membuat ruang lewat
 * `POST /api/sesi` dan memperoleh token. Siswa join dengan token itu.
 *
 * Yang disinkronkan:
 *  - posisi pemain di dunia noktah (agar siswa saling terlihat),
 *  - sapaan singkat (emoji) yang muncul di atas karakter,
 *  - ringkasan progres (untuk dasbor guru).
 *
 * Modul ini murni-tipe (tanpa runtime) sehingga aman diimpor di kedua sisi.
 */

import type { Elemen, NoktahId, PlayerGender, Stars } from './types';

/* ------------------------------------------------------------------ */
/* REST                                                                */
/* ------------------------------------------------------------------ */

export interface BuatSesiRequest {
  /** Nama guru (opsional, untuk ditampilkan di dasbor). */
  guru?: string;
  /** Pemulihan setelah server restart: token + kunci lama (dan salinan daftar siswa). */
  token?: string;
  kunci?: string;
  siswa?: BarisSiswa[];
}

export interface BuatSesiResponse {
  token: string;
  /** Kunci rahasia guru untuk kendali kelas; disimpan di browser guru. */
  kunci: string;
  guru: string;
  dibuatPada: string;
}

/* ------------------------------------------------------------------ */
/* DOMAIN                                                              */
/* ------------------------------------------------------------------ */

/** Ringkasan progres seorang siswa, dikirim ke server untuk dasbor guru. */
export interface ProgresSiswa {
  playerName: string;
  gender: PlayerGender;
  /** Noktah tempat siswa berada sekarang (null bila di peta). */
  noktah: NoktahId | null;
  /** Bintang per kode balai (ringkas). */
  bintang: Record<string, Stars>;
  /** Jumlah soal benar dari seluruh sesi. */
  totalBenar: number;
  /** Jumlah soal dikerjakan. */
  totalSoal: number;
  /** Noktah yang pernah dikunjungi. */
  visitedNoktah: NoktahId[];
  /** Apakah lulus babak puncak. */
  puncakLulus: boolean;
  /** Daftar soal yang pernah dijawab salah (id + kode materi). */
  soalSalah: Array<{ questionId: string; kodeMateri: string }>;
  /** Waktu pembaruan terakhir (ISO). */
  diubahPada: string;
  /** Tahap misi per balai (0 belum, 1 misi, 2 cerita dibaca, 3 lulus). */
  tahap?: Record<string, number>;
  /** Jumlah alat survival yang terkumpul. */
  alat?: number;
  /** Lama membaca Halaman Cerita per balai. */
  bacaan?: Record<string, { detik: number; ulang: number }>;
  /** Catatan jawaban ringkas: q=id soal, k=kode materi, b=benar, p=pilihan, n=percobaan. */
  jawaban?: Array<{ q: string; k: string; b: boolean; p: string[]; n: number }>;
  /** Nilai Final terbaik per bagian (4 bagian). */
  finalBagian?: number[];
  /** Nilai resmi (percobaan pertama, skor bertingkat). balai: 0..3 per kode; final: 0..30 atau null; akhir: 0..100. */
  nilai?: { balai: Record<string, number>; final: number | null; akhir: number };
}

/** Satu baris siswa pada dasbor guru. */
export interface BarisSiswa {
  id: string;
  nama: string;
  gender: PlayerGender;
  online: boolean;
  joinedAt: string;
  lastSeen: string;
  progress: ProgresSiswa;
}

/** Cuplikan posisi seorang pemain untuk sinkronisasi antar pemain. */
export interface PosisiPemain {
  id: string;
  nama: string;
  gender: PlayerGender;
  /** Warna pakaian pilihan (hex), bila ada. */
  warnaBaju?: number;
  /** Warna bawahan (celana/rok/gamis), bila ada. */
  warnaBawahan?: number;
  /** Warna hijab (khusus perempuan), bila ada. */
  warnaHijab?: number;
  noktah: NoktahId | null;
  /** Posisi di dalam dunia noktah (satuan dunia). */
  x: number;
  z: number;
  /** Arah hadap (radian). */
  rot: number;
  /** Emoji sapaan aktif (mis. '👋') beserta waktu kedaluwarsa (epoch ms). */
  sapa?: { emoji: string; sampai: number };
}

/* ------------------------------------------------------------------ */
/* WEBSOCKET                                                           */
/* ------------------------------------------------------------------ */

/** Pesan dari KLIEN ke SERVER. */
export type PesanKlien =
  | {
      t: 'join';
      token: string;
      /** ID tetap profil siswa di perangkat (lihat src/core/profil.ts). */
      idSiswa?: string;
      nama: string;
      gender: PlayerGender;
      warnaBaju?: number;
      warnaBawahan?: number;
      warnaHijab?: number;
    }
  | { t: 'pos'; noktah: NoktahId | null; x: number; z: number; rot: number }
  | { t: 'sapa'; emoji: string }
  | { t: 'progres'; progress: ProgresSiswa };

/** Pesan dari SERVER ke KLIEN. */
export type PesanServer =
  | { t: 'selamat'; id: string; token: string }
  | { t: 'galat'; pesan: string }
  /** Daftar pemain yang berada di noktah yang sama (untuk digambar). */
  | { t: 'pemain'; daftar: PosisiPemain[] }
  /** Kabar untuk siswa. `kode` dipakai klien untuk menerjemahkan pesan. */
  | { t: 'kabar'; teks: string; kode?: 'nama-ganda'; nama?: string }
  /** Guru menjeda/melanjutkan seluruh kelas. */
  | { t: 'jeda'; nilai: boolean }
  /** Pengumuman guru (maks 120 huruf). */
  | { t: 'umum'; teks: string }
  /** Guru mengeluarkan siswa ini / mengakhiri sesi. */
  | { t: 'dikeluarkan' }
  | { t: 'selesai' };

/** Rentang emoji sapaan yang diizinkan (aman untuk anak). */
export const SAPAAN_EMOJI = ['👋', '👍', '😀', '🎉', '❤️', '🙌'] as const;
export type SapaEmoji = (typeof SAPAAN_EMOJI)[number];

/** Batas jumlah pemain per ruang. */
export const MAKS_PEMAIN_PER_RUANG = 40;

/** Panjang token (angka saja). */
export const PANJANG_TOKEN = 4;

/** Elemen ringkas untuk pewarnaan ikon siswa di dasbor. */
export interface InfoElemen {
  elemen: Elemen;
  kode: string;
  nama: string;
}
