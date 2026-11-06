import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import {
  APP_INFO,
  balaiKey,
  totalStars,
  maxStars,
  balaiSelesaiCount,
  isPuncakUnlocked,
} from '../../core/state';
import { getBalai } from '../../data/balai';
import { CERITA, URUTAN_BALAI } from '../../data/cerita';
import type { ScreenContext } from './context';

function bintangKecil(stars: number): string {
  return `${'⭐'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}`;
}

/** Layar hasil akhir: ringkasan per balai dan sertifikat digital. */
export function renderResult(ctx: ScreenContext): HTMLElement {
  const progress = ctx.getProgress();

  const ringkas = URUTAN_BALAI.map((kode) => {
    const meta = getBalai(kode);
    const c = CERITA.find((x) => x.kode === kode);
    const bp = progress.balai[balaiKey(kode)];
    const stars = bp?.stars ?? 0;
    const correct = bp?.correct ?? 0;
    const total = bp?.total ?? meta?.soalPerMain ?? 3;
    return el('div', {
      class: 'ringkas-baris',
      children: [
        el('span', { text: `${progress.alat.includes(kode) ? c?.alat.emoji ?? '✅' : '❔'} ${c?.bab ?? ''} ${c?.judulBab ?? kode}` }),
        el('span', { class: 'muted', text: `${correct}/${total} benar` }),
        el('span', { class: 'bintang', text: bintangKecil(stars) }),
      ],
    });
  });

  const totalFinal = progress.finalBagian.reduce((a, b) => a + b, 0);
  const totalBenar = progress.answers.filter((a) => a.correct).length;
  const totalSoal = progress.answers.length;
  const akurasi = totalSoal > 0 ? Math.round((totalBenar / totalSoal) * 100) : 0;

  const namaInput = el('input', {
    class: 'isian',
    attrs: {
      type: 'text',
      placeholder: 'Tulis nama atau panggilanmu',
      value: progress.playerName,
      maxlength: '40',
      'aria-label': 'Nama pemain untuk sertifikat',
    },
  });

  const namaPreview = el('p', { class: 'nama-pemain', text: progress.playerName || 'Nama Pemain' });

  namaInput.addEventListener('input', () => {
    progress.playerName = namaInput.value.trim();
    namaPreview.textContent = progress.playerName || 'Nama Pemain';
    ctx.persist();
  });

  const sertifikatTerbuka = progress.puncakLulus;

  const kartuSertifikat = sertifikatTerbuka
    ? el('div', {
        class: 'sertifikat',
        children: [
          el('p', { class: 'label-kecil', text: '🎓 Sertifikat Digital' }),
          el('h2', { text: APP_INFO.judul }),
          el('p', { class: 'muted', text: 'Sertifikat "Penyintas Sains" diberikan kepada' }),
          namaPreview,
          el('p', { class: 'muted', text: `atas keberhasilan menyalakan Mercusuar Tua dengan 11 bekal ilmu IPA.` }),
          el('p', { class: 'muted', text: `Total bintang: ${totalStars(progress)} dari ${maxStars()} · Final: ${totalFinal}/30` }),
          el('p', { class: 'muted', text: `Akurasi jawaban: ${akurasi}% (${totalBenar}/${totalSoal})` }),
          el('p', {
            class: 'muted',
            attrs: { style: 'margin-top:10px;font-style:italic' },
            text: `"${APP_INFO.nilaiKarakter}"`,
          }),
          el('p', { class: 'footer-note', text: `${APP_INFO.pembuat} · ${APP_INFO.sekolah}` }),
        ],
      })
    : el('div', {
        class: 'card jujur',
        children: [
          el('span', { class: 'label-kecil', text: 'Sertifikat Terkunci' }),
          el('p', {
            text: `Nyalakan Mercusuar Tua untuk membuka sertifikat "Penyintas Sains"! Alat terkumpul: ${balaiSelesaiCount(progress)}/11${isPuncakUnlocked(progress) ? '. Mercusuar sudah terbuka, ayo tuntaskan Final!' : '.'}`,
          }),
        ],
      });

  const kembaliPeta = el('button', {
    class: 'btn block',
    text: '🗺️ Kembali ke Peta',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        ctx.navigate('map');
      },
    },
  });

  const cetak = el('button', {
    class: 'btn secondary block',
    text: '🖨️ Cetak / Simpan Sertifikat',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        window.print();
      },
    },
  });

  return el('section', {
    class: 'screen',
    children: [
      el('div', {
        class: 'topbar',
        children: [el('h2', { text: '🏁 Hasil Akhir' })],
      }),
      el('div', {
        class: 'card',
        children: [
          el('span', { class: 'label-kecil', text: 'Ringkasan per Bab' }),
          el('div', { class: 'ringkas-level', attrs: { style: 'margin-top:10px' }, children: ringkas }),
        ],
      }),
      el('div', {
        class: 'card',
        children: [el('span', { class: 'label-kecil', text: 'Nama untuk Sertifikat' }), namaInput],
      }),
      kartuSertifikat,
      el('div', { class: 'stack', children: sertifikatTerbuka ? [cetak, kembaliPeta] : [kembaliPeta] }),
    ],
  });
}
