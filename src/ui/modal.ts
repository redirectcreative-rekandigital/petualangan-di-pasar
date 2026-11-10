/**
 * Aturan "satu modal sekaligus".
 *
 * Setiap modal (Tas, Menu ☰, Misi, Pengaturan, Petunjuk, Gabung Kelas)
 * mendaftarkan fungsi tutupnya saat dibuka. Membuka modal baru otomatis
 * menutup modal sebelumnya lewat fungsi tutupnya sendiri, sehingga jeda dunia
 * (`sibuk`), pendengar tombol, dan lainnya ikut dibersihkan dengan benar.
 *
 * Dialog konfirmasi kecil (showDialog) tidak didaftarkan: ia boleh muncul di
 * atas modal yang memanggilnya.
 */

let tutupAktif: (() => void) | null = null;

/**
 * Menjadikan modal ini yang aktif (modal lain ditutup lebih dulu).
 * Mengembalikan fungsi `lepas` yang wajib dipanggil di dalam fungsi tutup modal.
 */
export function jadikanModalAktif(tutup: () => void): () => void {
  const lama = tutupAktif;
  tutupAktif = tutup;
  if (lama && lama !== tutup) lama();
  return () => {
    if (tutupAktif === tutup) tutupAktif = null;
  };
}

/** Menutup modal yang sedang terbuka (bila ada). */
export function tutupModalAktif(): void {
  tutupAktif?.();
}

/**
 * Pasang cara menutup yang umum: ketuk area gelap di luar panel & tombol Esc.
 * Mengembalikan fungsi untuk melepas pendengar Esc.
 */
export function pasangTutupUmum(overlay: HTMLElement, tutup: () => void): () => void {
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) tutup();
  });
  const esc = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') tutup();
  };
  document.addEventListener('keydown', esc);
  return () => document.removeEventListener('keydown', esc);
}
