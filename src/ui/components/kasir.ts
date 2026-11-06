import { el } from './dom';
import { rupiah } from './dom';

/** Denominasi uang rupiah yang tersedia di mesin kasir. */
export interface Denom {
  value: number;
  kind: 'lembar' | 'koin';
}

export const DENOMINASI: Denom[] = [
  { value: 10000, kind: 'lembar' },
  { value: 5000, kind: 'lembar' },
  { value: 2000, kind: 'lembar' },
  { value: 1000, kind: 'lembar' },
  { value: 500, kind: 'koin' },
  { value: 200, kind: 'koin' },
  { value: 100, kind: 'koin' },
];

export interface KasirState {
  selected: number[];
}

export interface KasirHandlers {
  onChange: (state: KasirState) => void;
}

/**
 * Mesin kasir interaktif: pemain menyusun uang kembalian.
 * Mendukung ketuk (tap) untuk menambah, serta drag dari palet ke slot.
 * Ini memenuhi kebutuhan FR-05 (money-drag) dan mitigasi "drag sulit di HP".
 */
export function renderKasir(
  target: number,
  state: KasirState,
  handlers: KasirHandlers,
): { root: HTMLElement; getSelected: () => number[] } {
  const selected = [...state.selected];

  const totalEl = el('div', { class: 'angka', text: rupiah(0) });
  const targetCard = el('div', {
    class: 'kasir-target',
    children: [
      el('div', { class: 'muted', text: 'Target kembalian' }),
      el('div', { class: 'angka', text: rupiah(target) }),
      el('div', { class: 'muted', text: 'Tersusun saat ini' }),
      totalEl,
    ],
  });

  const slot = el('div', {
    class: 'kasir-slot',
    attrs: { 'aria-label': 'Uang yang sudah disusun' },
  });

  const palette = el('div', { class: 'uang-pilih', attrs: { role: 'group', 'aria-label': 'Pecahan uang' } });

  const refresh = (): void => {
    const total = selected.reduce((sum, v) => sum + v, 0);
    totalEl.textContent = rupiah(total);
    const ok = Math.abs(total - target) < 1e-6;
    targetCard.classList.toggle('ok', ok);

    // Render slot uang terpakai.
    slot.replaceChildren();
    if (selected.length === 0) {
      slot.append(el('span', { class: 'muted', text: 'Ketuk uang di bawah atau seret ke sini.' }));
    } else {
      selected.forEach((value, index) => {
        const chip = el('button', {
          class: 'uang dipakai',
          text: rupiah(value),
          attrs: { type: 'button', title: 'Ketuk untuk menghapus' },
          on: {
            click: () => {
              selected.splice(index, 1);
              refresh();
              handlers.onChange({ selected: [...selected] });
            },
          },
        });
        slot.append(chip);
      });
    }
    handlers.onChange({ selected: [...selected] });
  };

  for (const denom of DENOMINASI) {
    const btn = el('button', {
      class: `uang ${denom.kind}`,
      text: rupiah(denom.value),
      attrs: { type: 'button', 'data-value': denom.value, draggable: 'true' },
      on: {
        click: () => {
          selected.push(denom.value);
          refresh();
        },
      },
    });

    btn.addEventListener('dragstart', (ev) => {
      const dt = (ev as DragEvent).dataTransfer;
      if (dt) dt.setData('text/plain', String(denom.value));
    });
    palette.append(btn);
  }

  slot.addEventListener('dragover', (ev) => {
    ev.preventDefault();
    slot.classList.add('over');
  });
  slot.addEventListener('dragleave', () => slot.classList.remove('over'));
  slot.addEventListener('drop', (ev) => {
    ev.preventDefault();
    const raw = ev.dataTransfer?.getData('text/plain');
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) {
      selected.push(value);
      refresh();
    }
  });

  const resetBtn = el('button', {
    class: 'btn ghost',
    text: 'Ulangi susun uang',
    attrs: { type: 'button' },
    on: {
      click: () => {
        selected.length = 0;
        refresh();
      },
    },
  });

  const root = el('div', {
    class: 'kasir',
    children: [
      targetCard,
      el('div', { class: 'label-kecil', text: 'Uang kembalianmu' }),
      slot,
      el('div', { class: 'label-kecil', text: 'Pecahan uang' }),
      palette,
      el('div', { class: 'row center', children: [resetBtn] }),
    ],
  });

  refresh();

  return {
    root,
    getSelected: () => [...selected],
  };
}
