/**
 * Pemuat gambar ilustrasi (hasil Gemini) dengan cadangan otomatis.
 *
 * Urutan pencarian untuk sebuah nama (mis. "penjaga-f01"):
 *   1. assets/gambar-hp/<nama>.webp   (versi ringan untuk HP)
 *   2. assets/gambar/<nama>.jpeg|.jpg|.png  (berkas asli dari guru)
 * Bila tidak ada satu pun, hasilnya null dan tampilan memakai gambar kode/emoji.
 */

const BASE = (import.meta.env?.BASE_URL as string | undefined) ?? './';
const cache = new Map<string, Promise<string | null>>();

function kandidat(nama: string): string[] {
  return [
    `${BASE}assets/gambar-hp/${nama}.webp`,
    `${BASE}assets/gambar/${nama}.jpeg`,
    `${BASE}assets/gambar/${nama}.jpg`,
    `${BASE}assets/gambar/${nama}.png`,
  ];
}

function coba(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/** URL gambar yang tersedia, atau null. Hasil disimpan agar tidak dicari ulang. */
export function urlGambar(nama: string): Promise<string | null> {
  const ada = cache.get(nama);
  if (ada) return ada;
  const janji = (async () => {
    for (const url of kandidat(nama)) {
      if (await coba(url)) return url;
    }
    return null;
  })();
  cache.set(nama, janji);
  return janji;
}

/** Memasang gambar sebagai latar elemen bila tersedia; menambah kelas `ada-gambar`. */
export function pasangGambar(elemen: HTMLElement, nama: string | undefined, onAda?: (url: string) => void): void {
  if (!nama) return;
  void urlGambar(nama).then((url) => {
    if (!url) return;
    elemen.style.backgroundImage = `url("${url}")`;
    elemen.classList.add('ada-gambar');
    onAda?.(url);
  });
}

/** Memuat beberapa gambar lebih awal (mis. potret di balai berikutnya). */
export function muatAwal(nama: Array<string | undefined>): void {
  for (const n of nama) if (n) void urlGambar(n);
}
