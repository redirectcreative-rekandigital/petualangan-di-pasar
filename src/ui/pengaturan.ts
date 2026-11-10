import { el } from './components/dom';
import { sfx, isMuted, setMuted } from '../core/sound';
import { BAHASA, gantiBahasa, t, type Bahasa } from '../core/bahasa';
import {
  adaSuaraIndonesia,
  berhenti,
  kecepatanSuara,
  setKecepatanSuara,
  setSuaraAktif,
  suaraAktif,
  ttsTersedia,
  ucapkan,
  type KecepatanSuara,
} from '../core/suara';
import { aksiKelas } from '../core/profil';
import { bukaGabungKelas, konfirmasiKeluarKelas } from './gabungKelas';
import { jadikanModalAktif } from './modal';

/**
 * Panel ⚙️ Pengaturan: bahasa (Indonesia/English), suara narasi, kecepatan
 * bicara, dan efek suara. Bisa dibuka dari menu utama maupun menu ☰ di game.
 *
 * Mengganti bahasa memuat ulang game ke menu utama; kemajuan tetap tersimpan.
 */

export interface OpsiPengaturan {
  /** Dipanggil saat panel ditutup (mis. untuk memperbarui tombol bisu). */
  onTutup?: () => void;
}

/** Sekelompok tombol pilihan; yang aktif diberi tanda. */
function grupPilihan<T extends string>(
  label: string,
  pilihan: Array<{ nilai: T; teks: string; lang?: string }>,
  aktif: () => T,
  pilih: (v: T) => void,
): HTMLElement {
  const tombol = pilihan.map((p) =>
    el('button', {
      class: 'atur-pilihan',
      text: p.teks,
      attrs: { type: 'button', lang: p.lang },
    }),
  );
  const segarkan = (): void => {
    tombol.forEach((b, i) => {
      const nyala = pilihan[i]?.nilai === aktif();
      b.classList.toggle('aktif', nyala);
      b.setAttribute('aria-pressed', nyala ? 'true' : 'false');
    });
  };
  tombol.forEach((b, i) =>
    b.addEventListener('click', () => {
      const p = pilihan[i];
      if (!p) return;
      sfx.click();
      pilih(p.nilai);
      segarkan();
    }),
  );
  segarkan();
  return el('div', {
    class: 'atur-baris',
    attrs: { role: 'group', 'aria-label': label },
    children: [el('span', { class: 'label-kecil', text: label }), el('div', { class: 'atur-grup', children: tombol })],
  });
}

/** Bagian 👥 Mode Bermain: status kelas + gabung / ganti siswa / keluar. */
function bagianModeBermain(host: HTMLElement): HTMLElement | null {
  const aksi = aksiKelas();
  if (!aksi) return null;
  const p = aksi.progres();
  const tombol = (teks: string, kelas: string, klik: () => void): HTMLElement =>
    el('button', { class: kelas, text: teks, attrs: { type: 'button' }, on: { click: () => { sfx.click(); klik(); } } });
  const status = p.token
    ? t('👥 Kelas {token} · {nama}', { token: p.token, nama: p.playerName || t('Penjelajah') })
    : t('🎒 Bermain Sendiri');
  const tombolTombol = p.token
    ? [
        tombol(t('🔄 Ganti siswa'), 'btn secondary block', () => bukaGabungKelas(host === document.body ? host : document.body, { jenis: 'ganti' })),
        tombol(t('🚪 Keluar dari Petualangan Bersama'), 'btn ghost block', konfirmasiKeluarKelas),
      ]
    : [tombol(t('👥 Gabung Kelas'), 'btn secondary block', () => bukaGabungKelas(document.body, { jenis: 'gabung' }))];
  return el('div', {
    class: 'atur-baris',
    children: [
      el('span', { class: 'label-kecil', text: t('👥 Mode Bermain') }),
      el('p', { class: 'atur-status', text: t('Sekarang: {status}', { status }) }),
      el('div', { class: 'stack', children: tombolTombol }),
    ],
  });
}

export function bukaPengaturan(host: HTMLElement, opsi: OpsiPengaturan = {}): void {
  const overlay = el('div', { class: 'overlay dialog-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
  const tutup = (): void => {
    berhenti();
    overlay.remove();
    document.removeEventListener('keydown', tombolEsc);
    window.removeEventListener('profil-berganti', tutup);
    lepasModal();
    // Beri tahu bagian lain (mis. tombol bisu 🔊) bahwa pengaturan mungkin berubah.
    window.dispatchEvent(new Event('pengaturan-berubah'));
    opsi.onTutup?.();
  };
  const tombolEsc = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') tutup();
  };
  document.addEventListener('keydown', tombolEsc);
  const lepasModal = jadikanModalAktif(tutup);
  // Setelah bergabung/keluar kelas, game kembali ke menu utama: tutup panel ini.
  window.addEventListener('profil-berganti', tutup);

  // Nama bahasa ditulis dalam bahasanya sendiri agar mudah dikenali.
  const bahasa = grupPilihan<Bahasa>(
    t('🌐 Bahasa'),
    [
      { nilai: 'id', teks: 'Bahasa Indonesia', lang: 'id' },
      { nilai: 'en', teks: 'English', lang: 'en' },
    ],
    () => BAHASA,
    (b) => {
      if (b !== BAHASA) gantiBahasa(b);
    },
  );
  const catatanBahasa = el('p', {
    class: 'muted kecil-teks',
    text: t('Game akan dimuat ulang sebentar. Kamu tetap berada di tempat yang sama dan kemajuanmu tersimpan.'),
  });

  const bagian: HTMLElement[] = [bahasa, catatanBahasa];
  const kelas = bagianModeBermain(host);
  if (kelas) bagian.unshift(kelas);

  if (ttsTersedia()) {
    const narasi = grupPilihan<'nyala' | 'mati'>(
      t('🗣️ Suara narasi'),
      [
        { nilai: 'nyala', teks: t('Nyala') },
        { nilai: 'mati', teks: t('Mati') },
      ],
      () => (suaraAktif() ? 'nyala' : 'mati'),
      (v) => setSuaraAktif(v === 'nyala'),
    );
    const kecepatan = grupPilihan<KecepatanSuara>(
      t('⏩ Kecepatan bicara'),
      [
        { nilai: 'lambat', teks: t('Lambat') },
        { nilai: 'normal', teks: t('Normal') },
        { nilai: 'cepat', teks: t('Cepat') },
      ],
      kecepatanSuara,
      setKecepatanSuara,
    );
    const coba = el('button', {
      class: 'btn secondary block',
      text: t('🔊 Coba suara'),
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          if (!suaraAktif()) setSuaraAktif(true);
          ucapkan(t('Halo! Aku akan membacakan cerita dan soal untukmu.'));
          narasi.querySelectorAll('button').forEach((b, i) => b.classList.toggle('aktif', i === 0));
        },
      },
    });
    bagian.push(narasi, kecepatan, coba);
    if (adaSuaraIndonesia() === false) {
      bagian.push(
        el('p', {
          class: 'card jujur kecil-teks',
          text:
            BAHASA === 'en'
              ? t('Suara Bahasa Inggris belum terpasang di perangkat ini. Pasang paket suara bahasa Inggris di Setelan HP, atau baca teksnya saja.')
              : t('Suara Bahasa Indonesia belum terpasang di perangkat ini. Pasang paket suara Google bahasa Indonesia di Setelan HP, atau baca teksnya saja.'),
        }),
      );
    }
  }

  bagian.push(
    grupPilihan<'nyala' | 'mati'>(
      t('🎵 Efek suara'),
      [
        { nilai: 'nyala', teks: t('Nyala') },
        { nilai: 'mati', teks: t('Mati') },
      ],
      () => (isMuted() ? 'mati' : 'nyala'),
      (v) => setMuted(v === 'mati'),
    ),
  );

  const tombolTutup = el('button', {
    class: 'btn block',
    text: t('✔️ Selesai'),
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        tutup();
      },
    },
  });

  overlay.append(
    el('div', {
      class: 'dialog-panel atur-panel',
      children: [el('h3', { text: t('⚙️ Pengaturan') }), ...bagian, tombolTutup],
    }),
  );
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) tutup();
  });
  host.append(overlay);
  (overlay.querySelector('.atur-pilihan.aktif') as HTMLElement | null)?.focus({ preventScroll: true });
}
