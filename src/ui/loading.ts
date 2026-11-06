import { el, mount } from './components/dom';

/**
 * Layar loading singkat dengan spinner. Dipakai setiap kali berpindah ke peta
 * besar, masuk noktah, atau masuk balai. Logo menyusul (saat ini teks judul).
 */
export interface LoadingOptions {
  /** Pesan utama, mis. "Memasuki noktah...". */
  pesan: string;
  /** Tip singkat di bawah spinner (opsional). */
  tip?: string;
  /** Durasi tampil dalam milidetik. */
  durasi?: number;
}

const TIPS: string[] = [
  'Tahukah kamu? FPB dipakai untuk membagi barang sama rata.',
  'Tahukah kamu? Luas persegi panjang = panjang × lebar.',
  'Tahukah kamu? 1 liter sama dengan 1.000 mililiter.',
  'Tahukah kamu? Persen artinya "per seratus".',
  'Tahukah kamu? Kecepatan = jarak ÷ waktu.',
  'Tahukah kamu? Diagram batang memudahkan membandingkan data.',
];

/** Menampilkan overlay loading singkat lalu memanggil `onSelesai`. */
export function showLoading(root: HTMLElement, options: LoadingOptions, onSelesai: () => void): void {
  const tip = options.tip ?? TIPS[Math.floor(Math.random() * TIPS.length)] ?? '';
  const durasi = options.durasi ?? 900;

  const overlay = el('div', {
    class: 'overlay loading-overlay',
    attrs: { role: 'status', 'aria-live': 'polite' },
    children: [
      el('div', {
        class: 'loading-box',
        children: [
          el('div', { class: 'loading-logo', text: '🏘️', attrs: { 'aria-hidden': 'true' } }),
          el('div', { class: 'spinner', attrs: { 'aria-hidden': 'true' } }),
          el('p', { class: 'loading-pesan', text: options.pesan }),
          el('p', { class: 'loading-tip muted', text: tip }),
        ],
      }),
    ],
  });

  mount(root, overlay);
  window.setTimeout(() => {
    overlay.classList.add('selesai');
    window.setTimeout(onSelesai, 220);
  }, durasi);
}
