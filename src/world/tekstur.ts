import * as THREE from 'three';

/**
 * Tekstur prosedural kecil-kecilan (digambar di kanvas, tanpa berkas unduhan).
 *
 * Semua tekstur dibuat hemat (maks 128–256 px) dan memakai pola murah, karena
 * tujuan utamanya hanya memecah warna datar menjadi detail halus: rumput,
 * bercak tanah, dan sinar lampu. Dengan begitu dunia terasa lebih "nyata"
 * tanpa menambah unduhan maupun aset.
 */

/** Pembangkit acak deterministik agar hasil selalu sama tiap muat. */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function kanvas(w: number, h = w): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } | null {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  return g ? { c, g } : null;
}

/**
 * Tekstur rumput: dasar hijau dengan ribuan goresan kecil dan bercak tanah.
 * Dipakai berulang (repeat) sehingga bidang tanah tidak tampak polos.
 */
export function teksturRumput(ukuran = 256): THREE.Texture | null {

  const k = kanvas(ukuran);
  if (!k) return null;
  const { c, g } = k;
  const acak = rng(20240501);

  g.fillStyle = '#8fbf6d';
  g.fillRect(0, 0, ukuran, ukuran);

  // Bercak tanah / naungan yang lebih gelap.
  for (let i = 0; i < 26; i++) {
    const x = acak() * ukuran;
    const y = acak() * ukuran;
    const r = 8 + acak() * 22;
    g.fillStyle = `rgba(110, 140, 80, ${0.06 + acak() * 0.08})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Bercak terang (rumput kena sinar sore).
  for (let i = 0; i < 18; i++) {
    const x = acak() * ukuran;
    const y = acak() * ukuran;
    const r = 6 + acak() * 16;
    g.fillStyle = `rgba(220, 240, 160, ${0.05 + acak() * 0.06})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Goresan rumput pendek.
  for (let i = 0; i < 900; i++) {
    const x = acak() * ukuran;
    const y = acak() * ukuran;
    const panjang = 2 + acak() * 4;
    const gelap = acak() < 0.5;
    g.strokeStyle = gelap
      ? `rgba(80, 130, 60, ${0.18 + acak() * 0.2})`
      : `rgba(170, 205, 120, ${0.18 + acak() * 0.22})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (acak() - 0.5) * 2, y - panjang);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}


/** Makin besar nilainya, makin banyak ulangan tekstur pada bidang. */
export function ulangi(tex: THREE.Texture | null, n: number): void {
  if (!tex) return;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(n, n);
}
