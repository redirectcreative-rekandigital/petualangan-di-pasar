/**
 * Narasi suara (Text-to-Speech) bahasa Indonesia memakai Web Speech API
 * bawaan peramban/HP. Tidak ada berkas audio yang perlu diunduh.
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

let aktif = bacaPreferensi();
let suaraIndonesia: SpeechSynthesisVoice | null = null;
let sudahCari = false;

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

/** Mencari suara bahasa Indonesia (id-ID) yang tersedia di perangkat. */
function cariSuara(): SpeechSynthesisVoice | null {
  const s = sintesis();
  if (!s) return null;
  const daftar = s.getVoices();
  if (daftar.length === 0) return null;
  sudahCari = true;
  const id = daftar.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('id'));
  // Utamakan suara Google/online (biasanya lebih alami), lalu suara lokal.
  return id.find((v) => /google/i.test(v.name)) ?? id[0] ?? null;
}

const s0 = sintesis();
if (s0) {
  suaraIndonesia = cariSuara();
  s0.addEventListener?.('voiceschanged', () => {
    suaraIndonesia = cariSuara();
  });
}

/** Apakah perangkat mendukung TTS. */
export function ttsTersedia(): boolean {
  return sintesis() !== null;
}

/** Apakah ada suara bahasa Indonesia di perangkat (null = belum diketahui). */
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
    .replace(/→/g, ', lalu ')
    .replace(/\.\.\.\./g, ' titik-titik ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mengucapkan teks. Mengembalikan false bila suara mati/tidak tersedia. */
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
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(bersih);
    u.lang = 'id-ID';
    if (!suaraIndonesia) suaraIndonesia = cariSuara();
    if (suaraIndonesia) u.voice = suaraIndonesia;
    u.pitch = Math.max(0.1, Math.min(2, opsi.pitch ?? 1));
    u.rate = Math.max(0.5, Math.min(1.6, opsi.rate ?? 0.95));
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
    u.lang = 'id-ID';
    s.speak(u);
  } catch {
    /* abaikan */
  }
}
