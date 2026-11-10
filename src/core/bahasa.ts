import kamusUi from '../i18n/en/ui.json';
import kamusCerita from '../i18n/en/cerita.json';
import kamusAdegan from '../i18n/en/adegan.json';
import kamusBalai from '../i18n/en/balai.json';
import kamusSoal from '../i18n/en/soal.json';
import kamusKostum from '../i18n/en/kostum.json';

/**
 * Pilihan bahasa game: Bahasa Indonesia (bawaan) atau English.
 *
 * Teks sumber selalu ditulis dalam Bahasa Indonesia. Terjemahan Inggris
 * disimpan di `src/i18n/en/*.json` dengan bentuk `{ "teks Indonesia": "English" }`.
 * Bila sebuah teks belum diterjemahkan, game memakai teks Indonesianya, jadi
 * tidak pernah tampil kosong. Jalankan `npm run cek:terjemahan` untuk melihat
 * teks yang belum diterjemahkan.
 *
 * Bahasa dibaca sekali saat game dimuat. Mengganti bahasa menyimpan pilihan
 * lalu memuat ulang game (kemajuan tetap tersimpan di perangkat).
 */

export type Bahasa = 'id' | 'en';

const KUNCI_BAHASA = 'survival-sains:bahasa';

function bacaBahasa(): Bahasa {
  try {
    return localStorage.getItem(KUNCI_BAHASA) === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
}

/** Bahasa aktif untuk sesi ini. */
export const BAHASA: Bahasa = bacaBahasa();

export function bahasaInggris(): boolean {
  return BAHASA === 'en';
}

const KUNCI_LANJUT = 'survival-sains:lanjut-setelah-ganti-bahasa';
let penyimpanPosisi: (() => unknown) | null = null;

/**
 * Mendaftarkan fungsi yang mengembalikan posisi pemain saat ini (layar, balai,
 * koordinat). Dipanggil tepat sebelum game dimuat ulang karena ganti bahasa.
 */
export function aturPenyimpanPosisi(fn: () => unknown): void {
  penyimpanPosisi = fn;
}

/** Posisi yang disimpan sebelum ganti bahasa (sekali pakai, lalu dihapus). */
export function ambilPosisiTersimpan(): unknown {
  try {
    const v = sessionStorage.getItem(KUNCI_LANJUT);
    sessionStorage.removeItem(KUNCI_LANJUT);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

/**
 * Menyimpan bahasa baru lalu memuat ulang game. Posisi pemain disimpan dulu
 * agar setelah dimuat ulang pemain kembali ke tempat yang sama.
 */
export function gantiBahasa(b: Bahasa): void {
  if (b === BAHASA) return;
  try {
    localStorage.setItem(KUNCI_BAHASA, b);
    const posisi = penyimpanPosisi?.();
    if (posisi) sessionStorage.setItem(KUNCI_LANJUT, JSON.stringify(posisi));
  } catch {
    /* abaikan: tetap muat ulang */
  }
  window.location.reload();
}

type Kamus = Record<string, string>;

/** Kamus konten (cerita, materi, soal). */
const KAMUS_KONTEN: Kamus = {
  ...(kamusCerita as Kamus),
  ...(kamusAdegan as Kamus),
  ...(kamusBalai as Kamus),
  ...(kamusSoal as Kamus),
};
/** Kamus antarmuka + nama gaya/bagian/warna kostum. */
const KAMUS_UI: Kamus = { ...(kamusKostum as Kamus), ...(kamusUi as Kamus) };

function cari(kamus: Kamus, s: string): string | undefined {
  const v = kamus[s];
  return v ? v : undefined;
}

function isi(teks: string, vars?: Record<string, string | number>): string {
  if (!vars) return teks;
  return teks.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/**
 * Menerjemahkan teks antarmuka. `s` adalah teks Indonesia (boleh berisi
 * `{nama}` sebagai tempat isian), `vars` mengisi tempat isian itu.
 */
export function t(s: string, vars?: Record<string, string | number>): string {
  if (BAHASA === 'id') return isi(s, vars);
  return isi(cari(KAMUS_UI, s) ?? cari(KAMUS_KONTEN, s) ?? s, vars);
}

/** Menerjemahkan satu teks konten (cerita/materi/soal). */
export function tk(s: string): string {
  if (BAHASA === 'id') return s;
  return cari(KAMUS_KONTEN, s) ?? cari(KAMUS_UI, s) ?? s;
}

/**
 * Kunci objek data yang berisi penanda/ID (bukan teks tampilan). Nilainya
 * tidak pernah diterjemahkan agar logika game tidak rusak.
 */
export const KUNCI_TETAP = new Set([
  'kode',
  'id',
  'balai',
  'noktah',
  'kodeMateri',
  'meta',
  'type',
  'kind',
  'gender',
  'latar',
  'jenis',
  'siapa',
  'elemen',
  'bentuk',
  'gambar',
  'busana',
  'ikon',
  'emoji',
  'kata',
  'a',
  't',
  'e',
  'w',
]);

/**
 * Apakah nilai di bawah kunci ini harus dibiarkan apa adanya. Daftar objek
 * (mis. `balai: BalaiMeta[]` milik noktah) tetap ditelusuri; yang dilewati
 * hanya penanda berupa teks/objek kecil (mis. `balai: 'F01'`, `meta: {...}`).
 */
export function kunciTetap(kunci: string | null, nilai: unknown): boolean {
  if (kunci === null || !KUNCI_TETAP.has(kunci)) return false;
  return !(Array.isArray(nilai) && nilai.some((x) => x !== null && typeof x === 'object'));
}

/** Menerjemahkan seluruh teks di dalam objek data (salinan baru). */
export function lokalkan<T>(data: T): T {
  if (BAHASA === 'id') return data;
  const jalan = (v: unknown, kunci: string | null): unknown => {
    if (kunciTetap(kunci, v)) return v;
    if (typeof v === 'string') return cari(KAMUS_KONTEN, v) ?? v;
    if (Array.isArray(v)) return v.map((x) => jalan(x, null));
    if (v && typeof v === 'object') {
      const hasil: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) hasil[k] = jalan(x, k);
      return hasil;
    }
    return v;
  };
  return jalan(data, null) as T;
}

let balik: Map<string, string> | null = null;

/**
 * Mengembalikan teks Inggris ke teks Indonesia aslinya (dipakai agar catatan
 * jawaban untuk dasbor guru tetap berbahasa Indonesia).
 */
export function keAsli(s: string): string {
  if (BAHASA === 'id') return s;
  if (!balik) {
    balik = new Map();
    for (const [id, en] of Object.entries(KAMUS_KONTEN)) if (en && !balik.has(en)) balik.set(en, id);
  }
  return balik.get(s) ?? s;
}

/** Kode bahasa untuk TTS & atribut `lang` dokumen. */
export function kodeBahasa(): string {
  return BAHASA === 'en' ? 'en-US' : 'id-ID';
}
