/**
 * Mode ringan untuk HP lemah (RAM kecil / GPU murah).
 *
 * Aktif bila salah satu benar:
 *   - URL `?kualitas=rendah` (atau `?tanpaBayangan=1`, nama lama);
 *   - perangkat melapor RAM <= 4 GB atau <= 4 inti CPU;
 *   - sesi sebelumnya pernah turun otomatis karena FPS rendah (disimpan).
 * `?kualitas=tinggi` memaksa kualitas penuh (untuk uji).
 *
 * Saat bermain, `catatFrame()` mengukur FPS. Bila rata-rata di bawah
 * BATAS_FPS selama JENDELA_DETIK, mode ringan dinyalakan langsung (dunia
 * yang sedang berjalan menurunkan resolusi & mematikan bayangan) dan
 * diingat untuk sesi berikutnya.
 */

const KUNCI = 'survival-sains:mode-ringan';
const BATAS_FPS = 28;
const JENDELA_DETIK = 4;
/** Detik pertama tiap dunia diabaikan: kompilasi shader & unggah tekstur. */
const PEMANASAN_DETIK = 2;

interface InfoPerangkat {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/** Keputusan awal (murni, mudah diuji). */
export function perluRingan(cari: string, perangkat: InfoPerangkat, tersimpan: boolean): boolean {
  const q = new URLSearchParams(cari);
  if (q.get('kualitas') === 'tinggi') return false;
  if (q.get('kualitas') === 'rendah' || q.get('tanpaBayangan') === '1') return true;
  if (tersimpan) return true;
  const { deviceMemory: ram, hardwareConcurrency: inti } = perangkat;
  return (ram !== undefined && ram <= 4) || (inti !== undefined && inti > 0 && inti <= 4);
}

function bacaTersimpan(): boolean {
  try {
    return localStorage.getItem(KUNCI) === '1';
  } catch {
    return false;
  }
}

let ringan = typeof window === 'undefined' ? false : perluRingan(window.location.search, navigator as InfoPerangkat, bacaTersimpan());
const pendengar = new Set<() => void>();

function tandaiDokumen(): void {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('mode-ringan', ringan);
}
tandaiDokumen();

export function modeRingan(): boolean {
  return ringan;
}

/** Dipanggil sekali saat mode ringan menyala di tengah permainan. Mengembalikan pelepas. */
export function saatRingan(fn: () => void): () => void {
  pendengar.add(fn);
  return () => pendengar.delete(fn);
}

export function nyalakanRingan(): void {
  if (ringan) return;
  ringan = true;
  tandaiDokumen();
  try {
    localStorage.setItem(KUNCI, '1');
  } catch {
    /* penyimpanan diblokir: cukup untuk sesi ini */
  }
  for (const fn of [...pendengar]) fn();
}

let mulaiJendela = 0;
let frameJendela = 0;
let frameTerakhir = 0;
let pemanasanSampai = 0;

/**
 * Catat satu frame (panggil di awal tiap requestAnimationFrame dunia 3D).
 * Jeda > 3 detik (tab disembunyikan, dunia baru dimuat) memulai pengukuran ulang;
 * ambang ini sengaja longgar agar HP yang sangat lambat (< 2 fps) tetap terdeteksi.
 */
export function catatFrame(now: number): void {
  if (ringan) return;
  if (now - frameTerakhir > 3000) {
    pemanasanSampai = now + PEMANASAN_DETIK * 1000;
    mulaiJendela = 0;
  }
  frameTerakhir = now;
  if (now < pemanasanSampai) return;
  if (mulaiJendela === 0) {
    mulaiJendela = now;
    frameJendela = 0;
    return;
  }
  frameJendela++;
  const lama = (now - mulaiJendela) / 1000;
  if (lama < JENDELA_DETIK) return;
  const fps = frameJendela / lama;
  mulaiJendela = now;
  frameJendela = 0;
  if (fps < BATAS_FPS) nyalakanRingan();
}
