import { el } from './dom';
import type { DiagramMateri } from '../../../shared/types';
import { t } from '../../core/bahasa';

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

let nomorDiagram = 0;

/**
 * Diagram materi interaktif berbentuk dropdown (akordeon): setiap bagian
 * adalah tombol, dan penjelasan fungsinya terbuka tepat di bawah tombol itu.
 * Hanya satu bagian terbuka sekaligus agar mudah dibaca anak.
 * Memakai <details>/<summary> bawaan: ringan, bisa dipakai keyboard &
 * pembaca layar, tanpa SVG rumit.
 */
export function renderDiagramMateri(diagram: DiagramMateri): HTMLElement {
  const ikon = IKON[diagram.bentuk] ?? '🔎';
  nomorDiagram += 1;
  const grup = `diagram-${nomorDiagram}`;

  const daftar = el('div', {
    class: 'diagram-daftar',
    attrs: { role: 'group', 'aria-label': t('Bagian {judul}', { judul: diagram.judul }) },
  });

  const semua: HTMLDetailsElement[] = [];
  for (const b of diagram.bagian) {
    const item = el('details', {
      class: 'diagram-item',
      // `name` membuat hanya satu yang terbuka (peramban baru); cadangan di bawah.
      attrs: { name: grup },
      children: [
        el('summary', {
          class: 'diagram-tombol',
          children: [
            b.ikon ? el('span', { class: 'diagram-bagian-ikon', attrs: { 'aria-hidden': 'true' }, text: b.ikon }) : null,
            el('span', { class: 'diagram-nama', text: b.nama }), el('span', { class: 'diagram-panah', attrs: { 'aria-hidden': 'true' }, text: '▾' })],
        }),
        el('p', { class: 'diagram-isi', text: b.fungsi }),
      ],
    });
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      for (const lain of semua) if (lain !== item) lain.open = false;
    });
    semua.push(item);
    daftar.append(item);
  }

  return el('div', {
    class: 'card diagram-materi',
    children: [
      el('div', {
        class: 'diagram-kepala',
        children: [
          el('span', { class: 'diagram-ikon', attrs: { 'aria-hidden': 'true' }, text: ikon }),
          el('div', {
            children: [
              el('span', { class: 'label-kecil', text: `🔎 ${diagram.judul}` }),
              el('p', { class: 'muted kecil-teks', text: t('Ketuk salah satu bagian untuk melihat fungsinya.') }),
            ],
          }),
        ],
      }),
      daftar,
    ],
  });
}
