import { el } from './components/dom';
import { sfx } from '../core/sound';
import { ucapkan, berhenti, suaraAktif, setSuaraAktif, ttsTersedia } from '../core/suara';
import type { TokohCerita } from '../data/cerita';
import { pasangGambar } from '../core/gambar';
import type { PlayerGender } from '../../shared/types';
import { t } from '../core/bahasa';

/**
 * Kotak percakapan bergaya visual novel di bagian bawah layar.
 *
 * API berbasis Promise agar alur cerita mudah ditulis berurutan:
 *   const p = bukaPercakapan(host, pemain);
 *   await p.bicara(penjaga, 'Assalamu\'alaikum...');
 *   const i = await p.pilih(pemain, ['Siap!', 'Kenapa?']);
 *   p.tutup();
 */

export interface InfoPemain {
  nama: string;
  gender: PlayerGender;
}

export type Penutur = TokohCerita | 'pemain';

export interface OpsiPilih {
  /** Teks yang diucapkan penutur sebelum pilihan muncul. */
  teks?: string;
  /** Elemen tambahan (mis. obor & tombol "Ingat cerita") di atas pilihan. */
  tambahan?: HTMLElement | null;
  /** Gaya tombol: 'balas' (balasan pemain) atau 'jawab' (opsi soal A-D). */
  gaya?: 'balas' | 'jawab';
}

export interface Percakapan {
  root: HTMLElement;
  bicara: (siapa: Penutur, teks: string, opsi?: { tambahan?: HTMLElement | null; labelLanjut?: string }) => Promise<void>;
  pilih: (siapa: Penutur, pilihan: string[], opsi?: OpsiPilih) => Promise<number>;
  /** Menandai tombol pilihan (benar/salah) sesaat. */
  tandai: (indeks: number, status: 'benar' | 'salah') => void;
  tutup: () => void;
  tertutup: () => boolean;
}

const HURUF = ['A', 'B', 'C', 'D', 'E'];

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

export function bukaPercakapan(host: HTMLElement, pemain: InfoPemain): Percakapan {
  const potret = el('div', { class: 'vn-potret', attrs: { 'aria-hidden': 'true' } });
  const nama = el('div', { class: 'vn-nama' });
  const peran = el('div', { class: 'vn-peran' });
  const teks = el('p', { class: 'vn-teks', attrs: { 'aria-live': 'polite' } });
  const tambahanHost = el('div', { class: 'vn-tambahan' });
  const aksi = el('div', { class: 'vn-aksi' });

  const tombolSuara = el('button', {
    class: 'vn-suara',
    attrs: { type: 'button', 'aria-label': t('Ulangi suara') },
    text: '🔊',
  });
  const tombolSuaraOnOff = el('button', {
    class: 'vn-suara-onoff',
    attrs: { type: 'button', 'aria-label': t('Nyalakan atau matikan suara narasi') },
  });
  const perbaruiOnOff = (): void => {
    tombolSuaraOnOff.textContent = suaraAktif() ? t('🗣️ Suara: nyala') : t('🤫 Suara: mati');
  };
  perbaruiOnOff();
  if (!ttsTersedia()) {
    tombolSuara.classList.add('hidden');
    tombolSuaraOnOff.classList.add('hidden');
  }

  const kepala = el('div', {
    class: 'vn-kepala',
    children: [potret, el('div', { class: 'vn-identitas', children: [nama, peran] }), tombolSuara],
  });

  const kotak = el('div', {
    class: 'vn-kotak',
    children: [kepala, teks, tambahanHost, aksi, tombolSuaraOnOff],
  });
  // Tombol ✕ merah di dekat tombol suara: keluar dari percakapan/soal kapan saja.
  const tombolTutup = el('button', {
    class: 'tutup-x',
    text: '✕',
    attrs: { type: 'button', 'aria-label': t('Tutup'), title: t('Tutup') },
  });
  const root = el('div', { class: 'vn-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' }, children: [kotak, tombolTutup] });
  host.append(root);

  let ditutup = false;
  /** Menyelesaikan Promise `bicara`/`pilih` yang sedang menunggu saat percakapan ditutup. */
  let batalkan: (() => void) | null = null;
  let ucapanTerakhir: { teks: string; pitch: number; rate: number } | null = null;
  let timerKetik = 0;
  let selesaiKetik: (() => void) | null = null;

  tombolSuara.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (ucapanTerakhir) ucapkan(ucapanTerakhir.teks, ucapanTerakhir);
  });
  tombolSuaraOnOff.addEventListener('click', (ev) => {
    ev.stopPropagation();
    setSuaraAktif(!suaraAktif());
    perbaruiOnOff();
    if (suaraAktif() && ucapanTerakhir) ucapkan(ucapanTerakhir.teks, ucapanTerakhir);
  });

  function pasangPenutur(siapa: Penutur): { pitch: number; rate: number } {
    if (siapa === 'pemain') {
      potret.textContent = pemain.gender === 'perempuan' ? '🧕' : '👦';
      potret.style.backgroundImage = '';
      potret.classList.remove('ada-gambar');
      potret.style.setProperty('--warna-tokoh', '#f59e0b');
      nama.textContent = pemain.nama || t('Kamu');
      peran.textContent = t('Penjelajah');
      kotak.classList.add('pemain');
      return { pitch: pemain.gender === 'perempuan' ? 1.35 : 1.2, rate: 1.05 };
    }
    potret.textContent = siapa.ikon;
    potret.style.backgroundImage = '';
    potret.classList.remove('ada-gambar');
    potret.style.setProperty('--warna-tokoh', hex(siapa.warnaBaju));
    pasangGambar(potret, siapa.gambar, () => {
      potret.textContent = '';
    });
    nama.textContent = siapa.nama;
    peran.textContent = siapa.peran;
    kotak.classList.remove('pemain');
    return siapa.suara;
  }

  /** Menampilkan teks dengan efek mengetik + suara. */
  function tampilkanTeks(isi: string, suara: { pitch: number; rate: number }): Promise<void> {
    window.clearInterval(timerKetik);
    teks.textContent = '';
    ucapanTerakhir = { teks: isi, ...suara };
    ucapkan(isi, suara);
    return new Promise((resolve) => {
      let i = 0;
      const langkah = Math.max(1, Math.round(isi.length / 60));
      const selesai = (): void => {
        window.clearInterval(timerKetik);
        teks.textContent = isi;
        selesaiKetik = null;
        resolve();
      };
      selesaiKetik = selesai;
      timerKetik = window.setInterval(() => {
        i += langkah;
        if (i >= isi.length) selesai();
        else teks.textContent = isi.slice(0, i);
      }, 22);
    });
  }

  // Ketuk kotak saat mengetik = tampilkan seluruh teks.
  teks.addEventListener('click', () => selesaiKetik?.());

  function pasangTambahan(node?: HTMLElement | null): void {
    while (tambahanHost.firstChild) tambahanHost.removeChild(tambahanHost.firstChild);
    if (node) tambahanHost.append(node);
  }

  function bersihkanAksi(): void {
    aksi.classList.remove('jawab');
    while (aksi.firstChild) aksi.removeChild(aksi.firstChild);
  }

  const bicara: Percakapan['bicara'] = async (siapa, isi, opsi = {}) => {
    if (ditutup) return;
    bersihkanAksi();
    pasangTambahan(opsi.tambahan);
    const suara = pasangPenutur(siapa);
    await tampilkanTeks(isi, suara);
    if (ditutup) return;
    await new Promise<void>((resolve) => {
      batalkan = resolve;
      const lanjut = el('button', {
        class: 'btn block vn-lanjut',
        text: opsi.labelLanjut ?? t('Lanjut ▶'),
        attrs: { type: 'button' },
      });
      lanjut.addEventListener('click', () => {
        sfx.click();
        berhenti();
        resolve();
      });
      aksi.append(lanjut);
      lanjut.focus({ preventScroll: true });
    });
  };

  const pilih: Percakapan['pilih'] = async (siapa, pilihan, opsi = {}) => {
    if (ditutup) return 0;
    bersihkanAksi();
    pasangTambahan(opsi.tambahan);
    const suara = pasangPenutur(siapa);
    if (opsi.teks) await tampilkanTeks(opsi.teks, suara);
    else teks.textContent = siapa === 'pemain' ? t('Apa jawabanmu?') : '';
    if (ditutup) return 0;
    return new Promise<number>((resolve) => {
      // Ditutup tanpa memilih: kembalikan -1 (pemanggil memeriksa `tertutup()`).
      batalkan = () => resolve(-1);
      const gaya = opsi.gaya ?? 'balas';
      // Penanda untuk tata letak: pilihan jawaban soal (A–D) jadi grid 2×2 saat mendatar.
      aksi.classList.toggle('jawab', gaya === 'jawab');
      pilihan.forEach((p, i) => {
        const b = el('button', {
          class: `vn-pilihan ${gaya}`,
          attrs: { type: 'button', 'data-indeks': String(i) },
          children:
            gaya === 'jawab'
              ? [el('span', { class: 'vn-huruf', text: HURUF[i] ?? '•' }), el('span', { text: p })]
              : [el('span', { text: `💬 ${p}` })],
        });
        b.addEventListener('click', () => {
          if (aksi.classList.contains('terkunci')) return;
          sfx.click();
          berhenti();
          resolve(i);
        });
        aksi.append(b);
      });
    });
  };

  const tandai: Percakapan['tandai'] = (indeks, status) => {
    const b = aksi.querySelector(`[data-indeks="${indeks}"]`);
    if (!b) return;
    b.classList.add(status);
    aksi.classList.add('terkunci');
    window.setTimeout(() => aksi.classList.remove('terkunci'), 50);
  };

  const tutup = (): void => {
    if (ditutup) return;
    ditutup = true;
    window.clearInterval(timerKetik);
    berhenti();
    root.remove();
    selesaiKetik?.();
    const b = batalkan;
    batalkan = null;
    b?.();
  };

  tombolTutup.addEventListener('click', (ev) => {
    ev.stopPropagation();
    sfx.click();
    tutup();
  });

  return { root, bicara, pilih, tandai, tutup, tertutup: () => ditutup };
}
