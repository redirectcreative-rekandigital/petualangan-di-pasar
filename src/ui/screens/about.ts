import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { APP_INFO } from '../../core/state';
import type { ScreenContext } from './context';

/** Halaman "Tentang Karya": catatan penggunaan AI dan atribusi aset. */
export function renderAbout(ctx: ScreenContext): HTMLElement {
  const kembali = el('button', {
    class: 'btn block',
    text: '← Kembali',
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
      el('div', { class: 'topbar', children: [el('h2', { text: 'ℹ️ Tentang Karya' }) ] }),
      el('div', {
        class: 'card',
        children: [
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Judul' }), el('span', { class: 'v', text: APP_INFO.judul })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Pembuat' }), el('span', { class: 'v', text: APP_INFO.pembuat })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [el('span', { class: 'k', text: 'Sekolah' }), el('span', { class: 'v', text: APP_INFO.sekolah })],
          }),
          el('div', {
            class: 'meta-baris',
            children: [
              el('span', { class: 'k', text: 'Lomba' }),
              el('span', { class: 'v', text: 'Game Edukasi Berbasis AI 2026' }),
            ],
          }),
        ],
      }),
      el('div', {
        class: 'card info',
        children: [
          el('span', { class: 'label-kecil', text: 'Pemanfaatan AI' }),
          el('p', {
            text:
              'Game ini dikembangkan dengan bantuan AI untuk menyusun ide soal, rancangan kode, dan membantu proses debug. Seluruh kunci jawaban dihitung ulang dan diverifikasi manual oleh guru sebelum digunakan.',
          }),
        ],
      }),
      el('div', {
        class: 'card',
        children: [
          el('span', { class: 'label-kecil', text: 'Atribusi Aset' }),
          el('ul', {
            class: 'tujuan',
            children: [
              el('li', {
                text:
                  'Peta pulau 3D, 11 balai, 9 penjaga, cantrik, ilustrasi Halaman Cerita, dan karakter dibuat sendiri dari kode (Three.js & SVG), tanpa gambar unduhan.',
              }),
              el('li', {
                text:
                  'Pustaka 3D: Three.js (lisensi MIT). Diagram batang, tabel, dan papan data digambar sendiri memakai SVG/kanvas.',
              }),
              el('li', { text: 'Efek suara dihasilkan sendiri melalui Web Audio API (tanpa berkas audio pihak ketiga).' }),
              el('li', { text: 'Tidak ada iklan, tidak ada pelacakan, dan tidak ada pengumpulan data pribadi siswa.' }),
            ],
          }),
        ],
      }),
      el('div', {
        class: 'card jujur',
        children: [
          el('span', { class: 'label-kecil', text: 'Privasi' }),
          el('p', {
            text:
              'Nama pemain hanya dipakai untuk sertifikat digital dan disimpan di perangkat sendiri (localStorage). Nama boleh berupa panggilan atau inisial.',
          }),
        ],
      }),
      el('div', { class: 'stack', children: [kembali] }),
    ],
  });
}
