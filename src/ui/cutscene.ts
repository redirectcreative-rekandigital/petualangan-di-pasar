import { el } from './components/dom';
import { sfx } from '../core/sound';
import { ucapkan, berhenti } from '../core/suara';
import { KAPTEN, NARATOR, type AdeganCutscene } from '../data/cerita';
import { pasangGambar, muatAwal } from '../core/gambar';

/**
 * Cutscene 2D singkat (badai pembuka & epilog). Setiap adegan berupa latar CSS
 * beranimasi + teks narasi yang dibacakan. Pemain mengetuk "Lanjut" atau
 * "Lewati".
 */
const GAMBAR: Record<AdeganCutscene['latar'], string> = {
  kapal: '⛵',
  badai: '⛈️',
  ombak: '🌊',
  putih: '🫧',
  goa: '🕯️',
  mercusuar: '🗼',
  'kapal-datang': '🚢',
  pantai: '🏝️',
};

/** Adegan "sunyi" (putih) memakai ilustrasi ombak yang perlahan memudar menjadi putih. */
const namaGambar = (latar: AdeganCutscene['latar']): string => (latar === 'putih' ? 'cut-ombak' : `cut-${latar}`);

export function putarCutscene(host: HTMLElement, daftar: AdeganCutscene[]): Promise<void> {
  muatAwal(daftar.map((a) => namaGambar(a.latar)));
  return new Promise((resolve) => {
    let i = 0;
    const root = el('div', { class: 'cut-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
    host.append(root);

    const selesai = (): void => {
      berhenti();
      root.remove();
      resolve();
    };

    const render = (): void => {
      const a = daftar[i];
      if (!a) {
        selesai();
        return;
      }
      root.innerHTML = '';
      const tokoh = a.siapa === 'kapten' ? KAPTEN : NARATOR;
      const lanjut = el('button', { class: 'btn', text: i === daftar.length - 1 ? 'Mulai ▶' : 'Lanjut ▶', attrs: { type: 'button' } });
      lanjut.addEventListener('click', () => {
        sfx.click();
        i++;
        render();
      });
      const lewati = el('button', { class: 'btn ghost kecil', text: 'Lewati ⏭', attrs: { type: 'button' } });
      lewati.addEventListener('click', () => {
        sfx.click();
        selesai();
      });
      const ilustrasi = el('div', { class: 'cut-ilustrasi' });
      const buram = el('div', { class: 'cut-buram' });
      const adegan = el('div', {
        class: `cut-adegan cut-${a.latar}`,
        children: [el('div', { class: 'cut-hujan' }), el('div', { class: 'cut-gambar', text: GAMBAR[a.latar] }), el('div', { class: 'cut-laut' }), buram, ilustrasi],
      });
      pasangGambar(ilustrasi, namaGambar(a.latar), (url) => {
        buram.style.backgroundImage = `url("${url}")`;
        adegan.classList.add('dengan-gambar');
      });
      root.append(
        adegan,
        el('div', {
          class: 'cut-teks',
          children: [
            el('div', { class: 'cut-penutur', text: a.siapa === 'kapten' ? `${KAPTEN.ikon} ${KAPTEN.nama}` : '📜' }),
            el('p', { text: a.teks }),
            el('div', { class: 'cut-aksi', children: [lewati, lanjut] }),
          ],
        }),
      );
      ucapkan(a.teks, tokoh.suara);
    };
    render();
  });
}
