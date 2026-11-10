import { el, mount } from './components/dom';
import { t } from '../core/bahasa';

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
  t('Tahukah kamu? Cahaya merambat lurus dan bisa dipantulkan cermin.'),
  t('Tahukah kamu? Bunyi tidak dapat merambat di ruang hampa.'),
  t('Tahukah kamu? Semua energi dalam rantai makanan berawal dari matahari.'),
  t('Tahukah kamu? Lebah dan bunga saling menguntungkan (mutualisme).'),
  t('Tahukah kamu? Kutub magnet yang sama saling tolak-menolak.'),
  t('Tahukah kamu? Pada rangkaian paralel, satu lampu putus yang lain tetap menyala.'),
  t('Tahukah kamu? Awan dan hujan terjadi di lapisan troposfer.'),
  t('Saat gempa, lindungi kepala dan berlindunglah di bawah meja yang kuat.'),
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
          el('div', { class: 'loading-logo', text: '🏝️', attrs: { 'aria-hidden': 'true' } }),
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
