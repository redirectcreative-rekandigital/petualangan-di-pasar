import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { APP_INFO } from '../../core/state';
import type { ScreenContext } from './context';
import { t } from '../../core/bahasa';

/** Halaman "Tentang Game": informasi game, catatan penggunaan AI, dan atribusi aset. */
export function renderAbout(ctx: ScreenContext): HTMLElement {
  const kembali = el('button', {
    class: 'btn block',
    text: t('← Kembali'),
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('title');
      },
    },
  });

  return el('section', {
    class: 'screen',
    children: [
      el('div', { class: 'topbar', children: [el('h2', { text: t('ℹ️ Tentang Game') }) ] }),
      el('div', {
        class: 'card',
        children: [
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: t('Judul') }), el('span', { class: 'v', text: APP_INFO.judul })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: t('Pembuat') }), el('span', { class: 'v', text: APP_INFO.pembuat })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: t('Sekolah') }), el('span', { class: 'v', text: APP_INFO.sekolah })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: t('Jenjang') }), el('span', { class: 'v', text: APP_INFO.jenjang })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: t('Mata Pelajaran') }), el('span', { class: 'v', text: APP_INFO.mapel })],
          }),
        ],
      }),
      el('div', {
        class: 'card info',
        children: [
          el('span', { class: 'label-kecil', text: t('Pemanfaatan AI') }),
          el('p', {
            text:
              t('Game ini dikembangkan dengan bantuan AI untuk menyusun ide soal, rancangan kode, dan membantu proses debug. Seluruh kunci jawaban dihitung ulang dan diverifikasi manual oleh guru sebelum digunakan.'),
          }),
        ],
      }),
      el('div', {
        class: 'card',
        children: [
          el('span', { class: 'label-kecil', text: t('Atribusi Aset') }),
          el('ul', {
            class: 'tujuan',
            children: [
              el('li', {
                text:
                  t('Peta pulau 3D, 11 balai, 9 penjaga, cantrik, ilustrasi Halaman Cerita, dan karakter dibuat sendiri dari kode (Three.js & SVG), tanpa gambar unduhan.'),
              }),
              el('li', {
                text:
                  t('Pustaka 3D: Three.js (lisensi MIT). Diagram batang, tabel, dan papan data digambar sendiri memakai SVG/kanvas.'),
              }),
              el('li', { text: t('Efek suara dihasilkan sendiri melalui Web Audio API (tanpa berkas audio pihak ketiga).') }),
              el('li', { text: t('Tidak ada iklan, tidak ada pelacakan, dan tidak ada pengumpulan data pribadi siswa.') }),
            ],
          }),
        ],
      }),
      el('div', {
        class: 'card jujur',
        children: [
          el('span', { class: 'label-kecil', text: t('Privasi') }),
          el('p', {
            text:
              t('Nama pemain hanya dipakai untuk sertifikat digital dan disimpan di perangkat sendiri (localStorage). Nama boleh berupa panggilan atau inisial.'),
          }),
        ],
      }),
      el('div', { class: 'stack', children: [kembali] }),
      // Logo sekolah & mitra (berkas: public/assets/gambar/footer.png).
      el('div', {
        class: 'tentang-footer',
        children: [
          el('img', {
            attrs: {
              src: `${import.meta.env.BASE_URL}assets/gambar/footer.png`,
              alt: t('Logo SD Muhammadiyah Wonorejo dan mitra pendidikan'),
              loading: 'lazy',
              decoding: 'async',
            },
          }),
        ],
      }),
    ],
  });
}
