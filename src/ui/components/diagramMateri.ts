import { el } from './dom';
import type { DiagramMateri } from '../../../shared/types';

/** Ikon dekoratif berdasarkan bentuk diagram (disederhanakan). */
const IKON: Record<string, string> = {
  ekosistem: '🌳',
  rantai: '🔗',
  simbiosis: '🤝',
  daun: '🍃',
  mata: '👁️',
  telinga: '👂',
  magnet: '🧲',
  listrik: '💡',
  bumi: '🌍',
  atmosfer: '☁️',
  siklus: '💧',
  kitab: '📖',
};

/**
 * Diagram materi interaktif: deretan bagian yang bisa diketuk, lalu panel
 * kecil menampilkan fungsi bagian tersebut. Tidak memakai SVG rumit agar
 * ringan dan tetap jalan di perangkat kelas bawah.
 */
export function renderDiagramMateri(diagram: DiagramMateri): HTMLElement {
  const ikon = IKON[diagram.bentuk] ?? '🔎';

  const detailJudul = el('strong', { text: '' });
  const detailFungsi = el('p', { class: 'muted', text: 'Ketuk salah satu bagian untuk melihat fungsinya.' });
  const detail = el('div', {
    class: 'card info',
    attrs: { style: 'margin-top:10px', 'aria-live': 'polite' },
    children: [detailJudul, detailFungsi],
  });

  const chips = el('div', { class: 'opsi', attrs: { role: 'group', 'aria-label': `Bagian ${diagram.judul}` } });

  const tombol: HTMLButtonElement[] = [];
  for (const b of diagram.bagian) {
    const btn = el('button', { text: b.nama, attrs: { type: 'button' } });
    btn.addEventListener('click', () => {
      for (const t of tombol) t.classList.remove('dipilih');
      btn.classList.add('dipilih');
      detailJudul.textContent = b.nama;
      detailFungsi.textContent = b.fungsi;
      detailFungsi.classList.remove('muted');
    });
    tombol.push(btn);
    chips.append(btn);
  }

  return el('div', {
    class: 'card',
    children: [
      el('span', { class: 'label-kecil', text: `🔎 ${diagram.judul}` }),
      el('div', {
        attrs: { style: 'font-size:42px;text-align:center;line-height:1;margin:6px 0 10px' },
        children: [el('span', { attrs: { 'aria-hidden': 'true' }, text: ikon })],
      }),
      chips,
      detail,
    ],
  });
}
