import { el } from './dom';
import type { QuestionData } from '../../../shared/types';

/** Merender data soal sebagai tabel HTML. */
export function renderTabel(data: QuestionData): HTMLElement {
  const headerCells = data.labels.map((label) => el('th', { text: label, attrs: { scope: 'col' } }));
  const bodyCells = data.values.map((value) => el('td', { text: String(value) }));
  const thead = el('thead', { children: [el('tr', { children: headerCells })] });
  const tbody = el('tbody', {
    children: [
      el('tr', {
        children: [
          el('th', {
            text: data.unit ? `Jumlah (${data.unit})` : 'Jumlah',
            attrs: { scope: 'row' },
          }),
          ...bodyCells,
        ],
      }),
    ],
  });
  const table = el('table', { class: 'tabel-data', children: [thead, tbody] });
  return el('div', { class: 'tabel-wrap', children: [table] });
}
