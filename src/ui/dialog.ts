import { el } from './components/dom';
import { t } from '../core/bahasa';

/**
 * Kotak dialog tokoh (HTML overlay di atas scene 3D).
 * Pemain membaca dialog singkat lalu menekan tombol untuk memulai misi.
 */
export interface DialogOptions {
  tokoh: string;
  teks: string;
  /** Ikon kecil di kepala dialog (🛡️ Penjaga, 📘 Tokoh Materi). */
  ikon?: string;
  /** Label tombol aksi utama. */
  aksi: string;
  onAksi: () => void;
  onBatal?: () => void;
}

export function showDialog(options: DialogOptions): { root: HTMLElement; close: () => void } {
  const root = el('div', { class: 'overlay dialog-overlay' });

  const aksiBtn = el('button', {
    class: 'btn block',
    text: options.aksi,
    attrs: { type: 'button' },
    on: {
      click: () => {
        close();
        options.onAksi();
      },
    },
  });

  const batalBtn = options.onBatal
    ? el('button', {
        class: 'btn ghost block',
        text: t('Nanti saja'),
        attrs: { type: 'button' },
        on: {
          click: () => {
            close();
            options.onBatal?.();
          },
        },
      })
    : null;

  const panel = el('div', {
    class: 'dialog-panel',
    children: [
      el('div', {
        class: 'dialog-head',
        children: [el('span', { class: 'dialog-avatar', text: options.ikon ?? '🛡️' }), el('strong', { text: options.tokoh })],
      }),
      el('p', { class: 'dialog-text', text: options.teks }),
      el('div', { class: 'stack', children: [aksiBtn, ...(batalBtn ? [batalBtn] : [])] }),
    ],
  });

  root.append(panel);

  const close = (): void => root.remove();

  return { root, close };
}

/** Toast kecil untuk pesan singkat (mis. "selesaikan balai lain dulu"). */
export function showToast(message: string, duration = 2600): void {
  const toast = el('div', { class: 'toast', text: message, attrs: { role: 'status' } });
  document.body.append(toast);
  setTimeout(() => toast.remove(), duration);
}
