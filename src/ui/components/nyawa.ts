import { el } from './dom';

/** Menampilkan sisa nyawa sebagai hati (nyawa max 3). */
export function renderNyawa(lives: number, max = 3): HTMLElement {
  const items: string[] = [];
  for (let i = 0; i < max; i++) items.push(i < lives ? '❤️' : '🤍');
  return el('span', {
    class: 'nyawa',
    text: items.join(' '),
    attrs: { role: 'img', 'aria-label': `Sisa nyawa: ${lives} dari ${max}` },
  });
}

/** Kotak hint yang dapat dibuka. Callback dipanggil saat hint dipakai. */
export function renderHintBox(hint: string): HTMLElement {
  return el('div', {
    class: 'hint-box',
    attrs: { role: 'note' },
    children: [el('strong', { text: 'Petunjuk: ' }), hint],
  });
}
