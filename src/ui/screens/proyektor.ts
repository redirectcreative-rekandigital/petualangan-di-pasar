import qrcode from 'qrcode-generator';
import { el } from '../components/dom';
import type { RosterSiswa } from '../../net/klien';
import { CERITA_ASLI as CERITA, URUTAN_BALAI } from '../../data/cerita';

/**
 * Tampilan Proyektor (dilihat seluruh kelas): token besar + QR, peta kemajuan
 * kelas, perayaan, dan 10 teratas menurut alat survival. Sengaja TANPA nilai
 * ujian per siswa supaya tidak mempermalukan siswa yang tertinggal.
 */

export interface KabarKelas {
  teks: string;
  sampai: number;
}

/** Kabar baik dari selisih dua pembacaan daftar siswa (alat baru, Mercusuar menyala). */
export function kabarBaik(lama: RosterSiswa[], baru: RosterSiswa[], sekarang = Date.now()): KabarKelas[] {
  if (lama.length === 0) return [];
  const peta = new Map(lama.map((s) => [s.id, s.progress]));
  const hasil: KabarKelas[] = [];
  for (const s of baru) {
    const sebelum = peta.get(s.id);
    if (!sebelum) continue;
    if (!sebelum.puncakLulus && s.progress.puncakLulus) hasil.push({ teks: `${s.nama} menyalakan Mercusuar! 🎉`, sampai: sekarang + 30000 });
    else if ((s.progress.alat ?? 0) > (sebelum.alat ?? 0)) hasil.push({ teks: `${s.nama} mendapat alat survival baru! 🎒`, sampai: sekarang + 20000 });
  }
  return hasil;
}

/** 10 teratas menurut alat; sama banyak: yang perubahan terakhirnya lebih awal (lebih dulu mencapai) di atas. */
export function sepuluhTeratas(siswa: RosterSiswa[]): RosterSiswa[] {
  return [...siswa]
    .sort((a, b) => (b.progress.alat ?? 0) - (a.progress.alat ?? 0) || a.progress.diubahPada.localeCompare(b.progress.diubahPada))
    .slice(0, 10);
}

function gambarQr(url: string): HTMLElement {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const kotak = el('div', { class: 'proyektor-qr' });
  kotak.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  return kotak;
}

export function layarProyektor(opsi: { token: string; siswa: RosterSiswa[]; kabar: KabarKelas[]; urlGame: string; keluar: () => void }): HTMLElement {
  const { siswa } = opsi;
  const online = siswa.filter((s) => s.online).length;
  const totalAlat = siswa.reduce((a, s) => a + (s.progress.alat ?? 0), 0);

  const peta = URUTAN_BALAI.map((kode) => {
    const c = CERITA.find((x) => x.kode === kode);
    const lulus = siswa.filter((s) => (s.progress.bintang?.[kode] ?? 0) >= 1).length;
    const disini = siswa.filter((s) => s.online && s.progress.noktah === kode).length;
    return el('div', {
      class: 'proyektor-baris',
      children: [
        el('span', { class: 'proyektor-nama', text: `${c?.urutan ?? ''}. ${c?.tempat ?? kode}` }),
        el('span', { class: 'bar-isi', children: [el('span', { attrs: { style: `width:${siswa.length ? Math.round((lulus / siswa.length) * 100) : 0}%` } })] }),
        el('span', { class: 'proyektor-angka', text: `${lulus}/${siswa.length}${disini ? ` · 👥${disini}` : ''}` }),
      ],
    });
  });

  const papan = sepuluhTeratas(siswa).map((s, i) =>
    el('li', { text: `${i + 1}. ${s.nama} · 🎒 ${s.progress.alat ?? 0}/11${s.progress.puncakLulus ? ' · 🗼' : ''}` }),
  );

  const sekarang = Date.now();
  const kabar = opsi.kabar.filter((k) => k.sampai > sekarang).slice(-3);

  return el('div', {
    class: 'proyektor',
    children: [
      el('button', { class: 'btn kecil ghost proyektor-keluar', text: '✕ Tutup proyektor', attrs: { type: 'button' }, on: { click: opsi.keluar } }),
      el('div', {
        class: 'proyektor-gabung',
        children: [
          el('div', {
            children: [el('span', { class: 'label-kecil', text: 'Token kelas' }), el('div', { class: 'proyektor-token', text: opsi.token })],
          }),
          gambarQr(opsi.urlGame),
          el('p', { class: 'muted', text: 'Pindai QR untuk membuka game, lalu pilih Kelas dan ketik token.' }),
        ],
      }),
      el('div', { class: 'proyektor-ringkas', text: `👥 ${online} online dari ${siswa.length} siswa · 🎒 ${totalAlat}/${siswa.length * 11} alat terkumpul` }),
      ...(kabar.length ? [el('div', { class: 'proyektor-kabar', attrs: { 'aria-live': 'polite' }, children: kabar.map((k) => el('p', { text: k.teks })) })] : []),
      el('div', { class: 'card', children: [el('span', { class: 'label-kecil', text: 'Peta kemajuan kelas (siswa yang sudah lulus tiap balai)' }), ...peta] }),
      el('div', { class: 'card', children: [el('span', { class: 'label-kecil', text: '🏆 10 petualang terdepan (alat survival)' }), el('ol', { class: 'proyektor-papan', children: papan })] }),
    ],
  });
}
