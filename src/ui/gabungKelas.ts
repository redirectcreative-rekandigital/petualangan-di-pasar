import { el } from './components/dom';
import { sfx } from '../core/sound';
import { t } from '../core/bahasa';
import { totalStars } from '../core/state';
import { aksiKelas, cariProfilKelas, kunciKelas, profilKelasBaru } from '../core/profil';
import { cekTokenKelas } from '../net/klien';
import { showDialog, showToast } from './dialog';
import type { Progress } from '../../shared/types';
import { jadikanModalAktif, tombolTutupX } from './modal';

/**
 * Modal 👥 Gabung Kelas / 🔄 Ganti Siswa.
 *
 * - Bergabung ke kelas selalu memulai petualangan dari awal (dasbor guru
 *   hanya berisi hasil di kelas). Progres main sendiri tetap disimpan.
 * - Bila nama + token pernah dipakai di perangkat ini, siswa ditawari
 *   melanjutkan petualangannya sendiri (perangkat dipakai bergantian).
 * - Token dicek ke server dulu; nama yang sedang dipakai siswa lain diberi
 *   peringatan sebelum tetap bergabung.
 */

export interface OpsiGabungKelas {
  /** 'gabung' dari Bermain Sendiri, 'ganti' bila sudah di kelas (siswa lain). */
  jenis: 'gabung' | 'ganti';
}

export function bukaGabungKelas(host: HTMLElement, opsi: OpsiGabungKelas): void {
  const aksi = aksiKelas();
  if (!aksi) return;
  const sekarang = aksi.progres();

  const overlay = el('div', { class: 'overlay dialog-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
  const panel = el('div', { class: 'dialog-panel kelas-panel' });
  overlay.append(panel);
  const tutup = (): void => {
    overlay.remove();
    document.removeEventListener('keydown', tombolEsc);
    lepas();
  };
  const lepas = jadikanModalAktif(tutup);
  const tombolEsc = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') tutup();
  };
  document.addEventListener('keydown', tombolEsc);

  const tombol = (teks: string, kelas: string, klik: () => void): HTMLButtonElement =>
    el('button', {
      class: kelas,
      text: teks,
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          klik();
        },
      },
    });

  const selesai = (profil: Progress): void => {
    tutup();
    aksi.gabung(profil);
  };

  /* ---------- Langkah 1: nama & token ---------- */
  function langkahIsian(): void {
    const inputNama = el('input', {
      class: 'isian',
      attrs: {
        type: 'text',
        maxlength: 24,
        autocomplete: 'off',
        placeholder: t('Tulis nama panggilanmu'),
        'aria-label': t('Nama di daftar kelas'),
        value: opsi.jenis === 'gabung' ? sekarang.playerName : '',
      },
    });
    const inputToken = el('input', {
      class: 'isian token-input',
      attrs: {
        type: 'text',
        inputmode: 'numeric',
        maxlength: 4,
        autocomplete: 'off',
        placeholder: t('Token 4 angka dari guru'),
        'aria-label': t('Token kelas'),
        value: opsi.jenis === 'ganti' ? (sekarang.token ?? '') : '',
      },
    });
    const pesan = el('p', { class: 'kelas-pesan', attrs: { role: 'status', 'aria-live': 'polite' } });
    let setujuNamaGanda = '';

    const tampilPesan = (teks: string, jenis: 'galat' | 'peringatan' | ''): void => {
      pesan.textContent = teks;
      pesan.className = `kelas-pesan ${jenis}`;
    };

    const gabung = tombol(opsi.jenis === 'ganti' ? t('🔄 Masuk sebagai siswa ini') : t('👥 Gabung'), 'btn block', () => void kirim());
    const batal = tombol(t('Batal'), 'btn ghost block', tutup);

    async function kirim(): Promise<void> {
      const nama = inputNama.value.trim();
      const token = inputToken.value.replace(/\D/g, '').slice(0, 4);
      if (nama.length < 2) {
        inputNama.classList.add('salah');
        tampilPesan(t('Tulis namamu dulu (minimal 2 huruf).'), 'galat');
        inputNama.focus();
        return;
      }
      if (token.length !== 4) {
        inputToken.classList.add('salah');
        tampilPesan(t('Token kelas terdiri dari 4 angka.'), 'galat');
        inputToken.focus();
        return;
      }
      if (sekarang.token && kunciKelas(sekarang.token, sekarang.playerName) === kunciKelas(token, nama)) {
        tutup();
        showToast(t('Kamu sudah berada di kelas ini.'));
        return;
      }
      const lama = cariProfilKelas(token, nama);
      gabung.disabled = true;
      const labelAwal = gabung.textContent ?? '';
      gabung.textContent = t('Memeriksa token...');
      const hasil = await cekTokenKelas(token, nama, lama?.idSiswa);
      gabung.disabled = false;
      gabung.textContent = labelAwal;
      if (!hasil.ok) {
        tampilPesan(hasil.pesan, 'galat');
        return;
      }
      const kunci = kunciKelas(token, nama);
      if (hasil.namaDipakai && setujuNamaGanda !== kunci) {
        setujuNamaGanda = kunci;
        tampilPesan(
          t('Nama "{nama}" sedang dipakai siswa lain yang online di kelas ini. Kalau itu bukan kamu, tambahkan nama belakang atau inisial. Tekan tombol lagi untuk tetap bergabung.', { nama }),
          'peringatan',
        );
        gabung.textContent = t('Tetap gabung');
        return;
      }
      if (lama) langkahDitemukan(lama, token, nama);
      else selesai(profilKelasBaru(sekarang, token, nama));
    }

    for (const i of [inputNama, inputToken]) {
      i.addEventListener('input', () => {
        i.classList.remove('salah');
        if (i === inputToken) inputToken.value = inputToken.value.replace(/\D/g, '').slice(0, 4);
        tampilPesan('', '');
        setujuNamaGanda = '';
        gabung.textContent = opsi.jenis === 'ganti' ? t('🔄 Masuk sebagai siswa ini') : t('👥 Gabung');
      });
      i.addEventListener('keydown', (ev) => {
        if ((ev as KeyboardEvent).key === 'Enter') gabung.click();
      });
    }

    panel.replaceChildren(
      tombolTutupX(tutup),
      el('h3', { text: opsi.jenis === 'ganti' ? t('🔄 Ganti Siswa') : t('👥 Gabung Kelas') }),
      el('p', {
        class: 'card info kecil-teks',
        text:
          opsi.jenis === 'ganti'
            ? t('Setiap siswa punya petualangannya sendiri di perangkat ini. Tulis namamu dan token kelas dari guru.')
            : t('Di kelas, petualangan dimulai dari awal agar hasil belajarmu tercatat rapi untuk guru. Progres main sendirimu tetap tersimpan di perangkat ini.'),
      }),
      el('label', { class: 'kelas-label', children: [el('span', { class: 'label-kecil', text: t('Nama di daftar kelas') }), inputNama] }),
      el('label', { class: 'kelas-label', children: [el('span', { class: 'label-kecil', text: t('Token kelas (4 angka)') }), inputToken] }),
      pesan,
      el('div', { class: 'stack', children: [gabung, batal] }),
    );
    (opsi.jenis === 'ganti' ? inputNama : inputToken.value ? inputNama : inputToken).focus({ preventScroll: true });
  }

  /* ---------- Langkah 2: petualangan lama ditemukan ---------- */
  function langkahDitemukan(lama: Progress, token: string, nama: string): void {
    // Nama dicocokkan tanpa beda huruf besar/kecil; tetap pakai ejaan nama di profil.
    const lanjut = tombol(t('▶️ Lanjutkan petualanganku'), 'btn block', () => selesai(lama));
    const baru = tombol(t('🔄 Mulai dari awal'), 'btn secondary block', () => {
      const dlg = showDialog({
        tokoh: t('Mulai dari awal?'),
        ikon: '🔄',
        teks: t('Bintang, alat, dan catatan belajar {nama} di kelas ini akan dihapus dari perangkat ini.', { nama }),
        aksi: t('Ya, mulai dari awal'),
        onBatal: () => {},
        onAksi: () => selesai(profilKelasBaru(sekarang, token, nama, lama.idSiswa)),
      });
      document.body.append(dlg.root);
    });
    panel.replaceChildren(
      tombolTutupX(tutup),
      el('h3', { text: t('📒 Petualangan Ditemukan') }),
      el('p', { text: t('Petualangan {nama} di Kelas {token} pernah dimainkan di perangkat ini.', { nama: lama.playerName || nama, token }) }),
      el('p', {
        class: 'card jujur kecil-teks',
        text: t('⭐ {bintang} bintang · 🎒 {alat}/11 alat', { bintang: totalStars(lama), alat: lama.alat.length }),
      }),
      el('p', { class: 'muted kecil-teks', text: t('Pastikan ini petualanganmu sendiri, bukan milik temanmu.') }),
      el('div', { class: 'stack', children: [lanjut, baru, tombol(t('← Kembali'), 'btn ghost block', langkahIsian)] }),
    );
    lanjut.focus({ preventScroll: true });
  }

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) tutup();
  });
  langkahIsian();
  host.append(overlay);
}

/** Konfirmasi lalu keluar dari kelas (kembali ke Bermain Sendiri). */
export function konfirmasiKeluarKelas(): void {
  const aksi = aksiKelas();
  if (!aksi) return;
  const p = aksi.progres();
  const dlg = showDialog({
    tokoh: t('🚪 Keluar dari Petualangan Bersama?'),
    ikon: '👥',
    teks: t('Kamu akan kembali ke Bermain Sendiri. Petualangan {nama} di Kelas {token} tetap tersimpan di perangkat ini dan di dasbor guru.', {
      nama: p.playerName,
      token: p.token ?? '',
    }),
    aksi: t('Ya, keluar'),
    onBatal: () => {},
    onAksi: () => aksi.keluar(),
  });
  document.body.append(dlg.root);
}
