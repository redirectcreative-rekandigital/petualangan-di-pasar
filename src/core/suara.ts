import { BAHASA, kodeBahasa } from './bahasa';

/**
 * Narasi suara (Text-to-Speech) memakai Web Speech API bawaan peramban/HP.
 * Bahasanya mengikuti pilihan pemain: Indonesia (id-ID) atau Inggris (en-US).
 * Tidak ada berkas audio yang perlu diunduh.
 *
 * - Setiap tokoh punya nada (pitch) dan kecepatan (rate) sendiri.
 * - Teks selalu tetap tampil, jadi game tetap bisa dimainkan tanpa suara.
 * - Suara bisa dimatikan pemain; pilihan disimpan di perangkat.
 */

export interface OpsiUcap {
  pitch?: number;
  rate?: number;
  /** Dipanggil setiap kata mulai diucapkan (indeks karakter). */
  onKata?: (indeks: number) => void;
  onSelesai?: () => void;
}

const KUNCI_SUARA = 'survival-sains:suara';
const KUNCI_KECEPATAN = 'survival-sains:kecepatan-suara';

export type KecepatanSuara = 'lambat' | 'normal' | 'cepat';
const PENGALI_KECEPATAN: Record<KecepatanSuara, number> = { lambat: 0.8, normal: 1, cepat: 1.2 };

let aktif = bacaPreferensi();
let kecepatan: KecepatanSuara = bacaKecepatan();
/** Suara terpilih untuk bahasa aktif. */
let suaraIndonesia: SpeechSynthesisVoice | null = null;
let sudahCari = false;

function bacaKecepatan(): KecepatanSuara {
  try {
    const v = localStorage.getItem(KUNCI_KECEPATAN);
    return v === 'lambat' || v === 'cepat' ? v : 'normal';
  } catch {
    return 'normal';
  }
}

export function kecepatanSuara(): KecepatanSuara {
  return kecepatan;
}

export function setKecepatanSuara(v: KecepatanSuara): void {
  kecepatan = v;
  try {
    localStorage.setItem(KUNCI_KECEPATAN, v);
  } catch {
    /* abaikan */
  }
}

function bacaPreferensi(): boolean {
  try {
    return localStorage.getItem(KUNCI_SUARA) !== 'mati';
  } catch {
    return true;
  }
}

function sintesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return 'speechSynthesis' in window ? window.speechSynthesis : null;
}

/**
 * Memilih suara untuk sebuah bahasa dari daftar suara perangkat (murni, mudah diuji).
 * Android lama menamai bahasa Indonesia `in-ID` / `in_ID` (kode ISO lama), bukan `id-ID`.
 */
export function pilihSuara(daftar: readonly SpeechSynthesisVoice[], bahasa: 'id' | 'en'): SpeechSynthesisVoice | null {
  const kode = (v: SpeechSynthesisVoice): string => v.lang.toLowerCase().replace('_', '-').split('-')[0] ?? '';
  const cocok = daftar.filter((v) => (bahasa === 'id' ? kode(v) === 'id' || kode(v) === 'in' : kode(v) === 'en'));
  if (bahasa === 'en') {
    // Utamakan en-US, lalu en-GB, lalu suara Inggris lain.
    const urut = [...cocok].sort((a, b) => skorInggris(b) - skorInggris(a));
    return urut[0] ?? null;
  }
  // Utamakan suara Google/online (biasanya lebih alami), lalu suara lokal.
  return cocok.find((v) => /google/i.test(v.name)) ?? cocok[0] ?? null;
}

/** Mencari suara untuk bahasa aktif. `sudahCari` hanya true bila daftar suara sudah terisi. */
function cariSuara(): SpeechSynthesisVoice | null {
  const s = sintesis();
  if (!s) return null;
  const daftar = s.getVoices();
  if (daftar.length === 0) return null;
  sudahCari = true;
  return pilihSuara(daftar, BAHASA);
}

/**
 * Menunggu daftar suara terisi (Chrome Android sering kosong di awal), paling lama 1,5 detik.
 * Dipakai sekali; hasilnya disimpan di `suaraIndonesia`.
 */
let menungguSuara: Promise<void> | null = null;
function muatSuara(): Promise<void> {
  const s = sintesis();
  if (!s || sudahCari) return Promise.resolve();
  menungguSuara ??= new Promise<void>((resolve) => {
    const selesai = (): void => {
      suaraIndonesia = cariSuara();
      // Batas waktu habis dengan daftar tetap kosong: anggap memang tidak ada suara.
      sudahCari = true;
      resolve();
    };
    s.addEventListener?.('voiceschanged', selesai, { once: true });
    setTimeout(selesai, 1500);
  });
  return menungguSuara;
}

function skorInggris(v: SpeechSynthesisVoice): number {
  const l = v.lang.toLowerCase().replace('_', '-');
  return (l === 'en-us' ? 4 : l === 'en-gb' ? 3 : 1) + (/google|natural|online/i.test(v.name) ? 2 : 0);
}

const s0 = sintesis();
if (s0) {
  suaraIndonesia = cariSuara();
  s0.addEventListener?.('voiceschanged', () => {
    suaraIndonesia = cariSuara();
  });
}

/** Nama suara yang dipakai saat ini (untuk dicek di Pengaturan), atau null. */
export function namaSuaraTerpilih(): string | null {
  return suaraIndonesia?.name ?? null;
}

const KUNCI_PESAN_TANPA_SUARA = 'survival-sains:pesan-tanpa-suara';

/** Sekali per perangkat: beri tahu UI bahwa suara bahasa aktif belum terpasang (main.ts menampilkan toast). */
function beriTahuTanpaSuara(): void {
  try {
    if (localStorage.getItem(KUNCI_PESAN_TANPA_SUARA) === BAHASA) return;
    localStorage.setItem(KUNCI_PESAN_TANPA_SUARA, BAHASA);
  } catch {
    /* penyimpanan diblokir: pesan bisa muncul lagi, tidak apa-apa */
  }
  window.dispatchEvent(new Event('suara-tidak-terpasang'));
}

/** Apakah perangkat mendukung TTS. */
export function ttsTersedia(): boolean {
  return sintesis() !== null;
}

/** Apakah ada suara untuk bahasa aktif di perangkat (null = belum diketahui). */
export function adaSuaraIndonesia(): boolean | null {
  if (!ttsTersedia()) return false;
  if (!sudahCari) suaraIndonesia = cariSuara();
  if (!sudahCari) return null;
  return suaraIndonesia !== null;
}

export function suaraAktif(): boolean {
  return aktif && ttsTersedia();
}

export function setSuaraAktif(nilai: boolean): void {
  aktif = nilai;
  try {
    localStorage.setItem(KUNCI_SUARA, nilai ? 'nyala' : 'mati');
  } catch {
    /* abaikan */
  }
  if (!nilai) berhenti();
}

/** Membersihkan teks dari emoji & simbol agar dibaca wajar. */
export function bersihkanUntukSuara(teks: string): string {
  return teks
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\u{FE0F}|\u{200D}/gu, '')
    .replace(/→/g, BAHASA === 'en' ? ', then ' : ', lalu ')
    .replace(/\.\.\.\./g, BAHASA === 'en' ? ' blank ' : ' titik-titik ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nomor ucapan terakhir: ucapan yang masih menunggu daftar suara dibatalkan bila ada yang lebih baru. */
let nomorUcapan = 0;

/**
 * Mengucapkan teks. Mengembalikan false bila suara mati/tidak tersedia.
 * Tidak pernah memakai suara bawaan HP: tanpa suara untuk bahasa aktif, teks tidak dibacakan
 * (suara bawaan sering berbahasa Inggris sehingga teks Indonesia terdengar berlogat Inggris).
 */
export function ucapkan(teks: string, opsi: OpsiUcap = {}): boolean {
  const s = sintesis();
  if (!s || !aktif) {
    opsi.onSelesai?.();
    return false;
  }
  const bersih = bersihkanUntukSuara(teks);
  if (!bersih) {
    opsi.onSelesai?.();
    return false;
  }
  const nomor = ++nomorUcapan;
  if (!sudahCari) suaraIndonesia = cariSuara();
  if (!sudahCari) {
    // Daftar suara belum siap: hentikan ucapan lama, tunggu sebentar, lalu bicara.
    berhenti();
    void muatSuara().then(() => {
      if (nomor !== nomorUcapan) opsi.onSelesai?.();
      else ucapkanDengan(s, bersih, opsi);
    });
    return true;
  }
  return ucapkanDengan(s, bersih, opsi);
}

function ucapkanDengan(s: SpeechSynthesis, bersih: string, opsi: OpsiUcap): boolean {
  if (!suaraIndonesia) {
    beriTahuTanpaSuara();
    opsi.onSelesai?.();
    return false;
  }
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(bersih);
    u.lang = kodeBahasa();
    u.voice = suaraIndonesia;
    u.pitch = Math.max(0.1, Math.min(2, opsi.pitch ?? 1));
    u.rate = Math.max(0.5, Math.min(1.8, (opsi.rate ?? 0.95) * PENGALI_KECEPATAN[kecepatan]));
    u.onboundary = (ev) => {
      if (ev.name === 'word' || ev.name === undefined) opsi.onKata?.(ev.charIndex);
    };
    let selesai = false;
    const tutup = (): void => {
      if (selesai) return;
      selesai = true;
      opsi.onSelesai?.();
    };
    u.onend = tutup;
    u.onerror = tutup;
    s.speak(u);
    return true;
  } catch {
    opsi.onSelesai?.();
    return false;
  }
}

/** Menghentikan ucapan yang sedang berlangsung. */
export function berhenti(): void {
  try {
    sintesis()?.cancel();
  } catch {
    /* abaikan */
  }
}

/**
 * Beberapa peramban HP baru mengizinkan suara setelah sentuhan pertama.
 * Panggil fungsi ini di dalam handler klik pertama (mis. tombol Mulai).
 */
export function bukaKunciSuara(): void {
  const s = sintesis();
  if (!s || !aktif) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = kodeBahasa();
    s.speak(u);
  } catch {
    /* abaikan */
  }
}
