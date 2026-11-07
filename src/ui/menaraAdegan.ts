import { el } from './components/dom';
import { createKarakterPreview, type KarakterPreview } from './components/karakterPreview';
import { FINAL_BAGIAN } from '../data/cerita';
import type { PlayerGender } from '../../shared/types';

/**
 * Panggung cerita Final "Malam Badai di Mercusuar Tua".
 *
 * Potongan menara bertingkat (Lantai Bawah → Puncak Lampu) di tengah badai.
 * Tiap lantai: tangga di kiri, PINTU TERKUNCI berpalang di kanan. Karakter
 * pilihan pemain (model 3D yang sama dengan pratinjau) …
 *   - naik tangga lalu berjalan ke depan pintu saat lantai dimulai,
 *   - berdiri TERHALANG di depan pintu selama menjawab (pintu bergetar saat
 *     salah, lampu kunci menyala & karakter melompat kecil saat benar),
 *   - masuk lewat pintu yang terbuka saat lantai selesai, lalu kamera naik ke
 *     lantai berikutnya, seolah karakter bergerak naik menara.
 *
 * Panggung berada di BELAKANG kotak percakapan: di HP tegak ia mengisi ruang di
 * atas kotak, di layar mendatar ia mengisi kolom kiri.
 */

export interface PenampilanTokoh {
  gender: PlayerGender;
  warnaPakaian?: number;
  warnaBawahan?: number;
  warnaHijab?: number;
}

export interface AdeganMenara {
  root: HTMLElement;
  /** Kamera ke lantai i, karakter naik tangga lalu berjalan ke depan pintu. */
  masukLantai: (i: number, jumlahSoal: number, perlu: number) => Promise<void>;
  /** Efek satu percobaan jawaban. */
  jawab: (benar: boolean) => void;
  /** Satu soal selesai (benar → satu lampu kunci menyala). */
  soalSelesai: (benar: boolean) => void;
  /** Pintu terbuka dan karakter masuk. `tuntas` = lantai lulus. */
  keluarLantai: (tuntas: boolean) => Promise<void>;
  /** Lampu puncak menyala (Final lulus). */
  nyalakanLampu: () => void;
  tutup: () => void;
}

/** Posisi horizontal (persen lebar panggung). */
const X_TANGGA = 9;
/** Berdiri di depan pintu, tidak menutupi palang (pintu mulai di 64%). */
const X_DEPAN_PINTU = 50;
const X_DALAM_PINTU = 76;
/** Lama berjalan per 10% lebar panggung (ms). */
const MS_PER_10 = 330;

const tunggu = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));
const gerakDikurangi = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Hiasan khas tiap lantai (ikon alat survival yang dipasang di lantai itu). */
const HIASAN: string[][] = [
  ['🪞', '🥁'],
  ['🌿', '🌾', '🌸', '🌱'],
  ['🧭', '⚡'],
  ['🌋', '💧', '☁️'],
];

export function bukaAdeganMenara(host: HTMLElement, tampilan: PenampilanTokoh): AdeganMenara {
  const N = FINAL_BAGIAN.length;
  const lantaiEl: Array<{
    root: HTMLElement;
    pintu: HTMLElement;
    lampu: HTMLElement;
    kunci: HTMLElement;
  }> = [];

  const menara = el('div', { class: 'ma-menara', attrs: { style: `--n:${N}` } });
  // Lantai teratas di atas (DOM urut dari puncak ke bawah).
  for (let i = N - 1; i >= 0; i--) {
    const b = FINAL_BAGIAN[i];
    const lampu = el('div', { class: 'ma-lampu-kunci', attrs: { 'aria-hidden': 'true' } });
    const kunci = el('div', { class: 'ma-kunci', text: '🔑 0/0' });
    const pintu = el('div', {
      class: 'ma-pintu',
      children: [
        el('div', { class: 'ma-ruang-balik', text: i === N - 1 ? '💡' : '🪜' }),
        el('div', { class: 'ma-daun', children: [el('span', { class: 'ma-gembok', text: '🔒' }), el('span', { class: 'ma-gagang' })] }),
        el('div', { class: 'ma-palang', attrs: { 'aria-hidden': 'true' } }),
      ],
    });
    const root = el('div', {
      class: `ma-lantai ${i === N - 1 ? 'puncak' : ''}`,
      attrs: { 'data-lantai': String(i) },
      children: [
        el('div', { class: 'ma-jendela', children: [el('div', { class: 'ma-hujan' })] }),
        el('div', { class: 'ma-papan', text: b?.tempat ?? '' }),
        el('div', { class: 'ma-hiasan', text: (HIASAN[i] ?? []).join(' ') }),
        el('div', { class: 'ma-tangga', attrs: { 'aria-hidden': 'true' } }),
        el('div', { class: 'ma-pintu-wadah', children: [kunci, lampu, pintu] }),
        el('div', { class: 'ma-lantai-dasar' }),
      ],
    });
    lantaiEl[i] = { root, pintu, lampu, kunci };
    menara.append(root);
  }

  // Karakter 3D pemain (kanvas transparan) yang digeser di atas panggung.
  const preview: KarakterPreview = createKarakterPreview(tampilan.gender, {
    warnaPakaian: tampilan.warnaPakaian,
    warnaBawahan: tampilan.warnaBawahan,
    warnaHijab: tampilan.warnaHijab,
  });
  preview.canvas.classList.add('ma-tokoh-kanvas');
  const tokoh = el('div', { class: 'ma-tokoh tersembunyi', children: [preview.canvas] });
  preview.setPose?.({ jalan: false, arah: 0 });

  const panggung = el('div', { class: 'ma-panggung', children: [menara, tokoh] });
  const root = el('div', {
    class: 'menara-adegan',
    attrs: { 'aria-hidden': 'true' },
    children: [el('div', { class: 'ma-langit' }), el('div', { class: 'ma-kilat' }), panggung],
  });
  host.append(root);
  document.body.classList.add('mode-menara');

  // Panggung mengisi ruang di atas kotak percakapan (HP tegak). Diukur terus
  // karena tinggi kotak berubah-ubah (teks pendek / soal dengan 4 pilihan).
  // Ukuran panggung dipertahankan saat kotak percakapan disembunyikan sesaat
  // (ketika karakter bergerak), supaya karakter tidak tiba-tiba membesar.
  let ruangTerakhir = Math.round(window.innerHeight * 0.42);
  const ukurRuang = (): void => {
    const mendatar = window.innerWidth > window.innerHeight && window.innerHeight <= 600;
    if (mendatar) {
      root.style.setProperty('--ruang-bawah', '0px');
      return;
    }
    const kotak = document.querySelector<HTMLElement>('.vn-overlay:not(.tersembunyi) .vn-kotak');
    const tinggi = kotak?.getBoundingClientRect().height ?? 0;
    // Abaikan perubahan kecil (teks sedang diketik) agar panggung tidak berkedut.
    if (tinggi > 0 && Math.abs(tinggi + 18 - ruangTerakhir) > 24) ruangTerakhir = Math.round(tinggi + 18);
    root.style.setProperty('--ruang-bawah', `${ruangTerakhir}px`);
  };
  const pengamat = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ukurRuang) : null;
  const pantauKotak = (): void => {
    const kotak = document.querySelector<HTMLElement>('.vn-kotak');
    if (kotak && pengamat) pengamat.observe(kotak);
    ukurRuang();
  };
  const intervalUkur = window.setInterval(pantauKotak, 400);
  window.addEventListener('resize', ukurRuang);
  pantauKotak();

  let lantaiKini = -1;
  let benarKini = 0;
  let perluKini = 0;
  let totalKini = 0;

  const geserKamera = (i: number, langsung = false): void => {
    // Lantai i ditampilkan: menara digeser sehingga lantai itu mengisi panggung.
    menara.classList.toggle('tanpa-transisi', langsung);
    menara.style.transform = `translateY(${-((N - 1 - i) * 100) / N}%)`;
  };

  const posisiTokoh = (x: number, ms: number, naik = 0): void => {
    tokoh.style.transitionDuration = `${ms}ms`;
    tokoh.style.left = `${x}%`;
    tokoh.style.setProperty('--naik', `${naik}%`);
  };

  /** Jalan dari posisi sekarang ke x (persen), menghadap arah gerak. */
  const jalanKe = async (dari: number, ke: number): Promise<void> => {
    const ms = gerakDikurangi() ? 0 : Math.round((Math.abs(ke - dari) / 10) * MS_PER_10);
    preview.setPose?.({ jalan: ms > 0, arah: ke >= dari ? Math.PI / 2 : -Math.PI / 2 });
    posisiTokoh(ke, ms);
    await tunggu(ms);
  };

  const gambarLampu = (): void => {
    const l = lantaiEl[lantaiKini];
    if (!l) return;
    l.lampu.innerHTML = '';
    for (let k = 0; k < totalKini; k++) {
      l.lampu.append(el('span', { class: k < benarKini ? 'nyala' : '' }));
    }
    l.kunci.textContent = `🔑 ${benarKini}/${perluKini}`;
    l.kunci.classList.toggle('cukup', benarKini >= perluKini);
  };

  return {
    root,
    masukLantai: async (i, jumlahSoal, perlu) => {
      const pertama = lantaiKini < 0;
      lantaiKini = i;
      benarKini = 0;
      perluKini = perlu;
      totalKini = jumlahSoal;
      const l = lantaiEl[i];
      if (l) {
        l.pintu.classList.remove('terbuka', 'tuntas');
        l.root.classList.add('aktif');
      }
      gambarLampu();
      geserKamera(i, pertama);
      if (!pertama && !gerakDikurangi()) await tunggu(1200);
      // Muncul dari bawah tangga, naik, lalu berjalan ke depan pintu.
      tokoh.classList.add('tanpa-transisi');
      posisiTokoh(X_TANGGA - 4, 0, -38);
      tokoh.classList.remove('tersembunyi');
      void tokoh.offsetWidth; // paksa gaya awal diterapkan sebelum transisi
      tokoh.classList.remove('tanpa-transisi');
      preview.setPose?.({ jalan: true, arah: -Math.PI / 4 });
      const msNaik = gerakDikurangi() ? 0 : 900;
      posisiTokoh(X_TANGGA + 4, msNaik, 0);
      await tunggu(msNaik);
      await jalanKe(X_TANGGA + 4, X_DEPAN_PINTU);
      // Berdiri menghadap pintu, sedikit serong agar wajah tetap terlihat.
      preview.setPose?.({ jalan: false, arah: Math.PI / 3 });
      tokoh.classList.add('terhalang');
    },
    jawab: (benar) => {
      const l = lantaiEl[lantaiKini];
      if (!l) return;
      const kelas = benar ? 'benar' : 'salah';
      l.pintu.classList.remove('benar', 'salah');
      tokoh.classList.remove('lompat', 'mundur');
      void l.pintu.offsetWidth;
      l.pintu.classList.add(kelas);
      tokoh.classList.add(benar ? 'lompat' : 'mundur');
    },
    soalSelesai: (benar) => {
      if (benar) benarKini++;
      gambarLampu();
    },
    keluarLantai: async (tuntas) => {
      const l = lantaiEl[lantaiKini];
      if (!l) return;
      tokoh.classList.remove('terhalang', 'lompat', 'mundur');
      l.pintu.classList.add('terbuka');
      l.pintu.classList.toggle('tuntas', tuntas);
      await tunggu(gerakDikurangi() ? 0 : 700);
      // Berjalan masuk ke balik pintu sambil memudar (seolah masuk ke dalam).
      tokoh.classList.add('masuk');
      await jalanKe(X_DEPAN_PINTU, X_DALAM_PINTU);
      tokoh.classList.add('tersembunyi');
      tokoh.classList.remove('masuk');
      preview.setPose?.({ jalan: false, arah: 0 });
      await tunggu(gerakDikurangi() ? 0 : 350);
      l.root.classList.remove('aktif');
    },
    nyalakanLampu: () => {
      root.classList.add('menyala');
    },
    tutup: () => {
      window.clearInterval(intervalUkur);
      window.removeEventListener('resize', ukurRuang);
      pengamat?.disconnect();
      preview.dispose();
      root.remove();
      document.body.classList.remove('mode-menara');
    },
  };
}
