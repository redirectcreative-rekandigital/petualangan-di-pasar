import { el } from './components/dom';
import { sfx } from '../core/sound';
import { t } from '../core/bahasa';
import type { IdPanduan } from '../../shared/types';

/**
 * Panduan awal: sorotan tombol bertahap. Layar digelapkan, satu tombol
 * disorot, dan balon kecil menjelaskan kegunaannya. "Oke" lanjut ke langkah
 * berikutnya; "Lewati panduan" menutup semuanya. Langkah tanpa target (atau
 * targetnya sedang tersembunyi) tampil sebagai balon di tengah layar.
 */

export interface LangkahPanduan {
  /** Selektor CSS tombol yang disorot (opsional). */
  target?: string;
  teks: string;
}

/** Layar sentuh (HP/tablet): teks menyebut joystick & ketuk, bukan keyboard. */
export function layarSentuh(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return true;
  }
}

/** Langkah panduan per layar. Teks menyesuaikan perangkat (sentuh vs keyboard). */
export function langkahPanduan(id: IdPanduan, opsi: { online?: boolean } = {}): LangkahPanduan[] {
  const hp = layarSentuh();
  const sapa: LangkahPanduan = {
    target: '.btn-action.sapa',
    teks: t('😊 Sapa: kirim emoji ke teman sekelas. 👥 di kiri atas menunjukkan jumlah teman yang sedang online.'),
  };
  switch (id) {
    case 'balai':
      return [
        {
          target: '.joystick-base',
          teks: hp
            ? t('Geser joystick ini untuk berjalan. Ikuti panah kuning menuju tujuanmu. Panah samar di bawah kakimu juga menunjuk arahnya.')
            : t('Tekan W A S D (atau tombol panah) untuk berjalan. Ikuti panah kuning menuju tujuanmu. Panah samar di bawah kakimu juga menunjuk arahnya.'),
        },
        {
          teks: hp
            ? t('Geser jari di sisi kanan layar untuk memutar kamera dan melihat sekeliling.')
            : t('Seret mouse untuk memutar kamera dan melihat sekeliling.'),
        },
        {
          target: '.hud-kiri-atas',
          teks: t('Bilah 👉 selalu memberi tahu apa yang harus kamu lakukan sekarang. Ketuk 📜 Misi untuk melihat semua langkah misi. ⭐ menunjukkan bintangmu.'),
        },
        {
          teks: hp
            ? t('Saat kamu dekat dengan tokoh atau tempat, tombol aksi muncul di atasnya (💬 Bicara, 📖 Baca Cerita, 🔥 Tantangan). Ketuk tombol itu.')
            : t('Saat kamu dekat dengan tokoh atau tempat, tombol aksi muncul di atasnya (💬 Bicara, 📖 Baca Cerita, 🔥 Tantangan). Tekan E atau klik tombol itu.'),
        },
        {
          target: '.btn-action.lompat',
          teks: hp
            ? t('⤴️ Lompat untuk melompat. Saat berjalan, tombol 🏃 muncul di dekat joystick: ketuk agar tokohmu berlari.')
            : t('Tekan Spasi untuk melompat. Saat berjalan, tombol 🏃 muncul di dekat joystick: klik agar tokohmu berlari.'),
        },
        { target: '.btn-action.kamera', teks: t('📷 Kamera mengganti sudut pandang: Normal, Dekat, atau Tangan (seperti mata tokohmu).') },
        { target: '.btn-action.tas-besar', teks: t('🎒 Tas menyimpan alat survival yang kamu kumpulkan dari tiap balai.') },
        ...(opsi.online ? [sapa] : []),
        {
          target: '.hud-menu-kanan',
          teks: hp
            ? t('☰ Menu: petunjuk, pengaturan, kembali ke peta, dan 🧭 Ulangi Panduan bila ingin melihat panduan ini lagi.')
            : t('☰ Menu (atau tekan H): petunjuk, pengaturan, kembali ke peta, dan 🧭 Ulangi Panduan bila ingin melihat panduan ini lagi.'),
        },
      ];
    case 'sapa':
      return [sapa];
    case 'peta':
      return [
        {
          teks: hp
            ? t('Ini peta Pulau Wonorejo. Panah kuning menunjuk tujuan berikutnya. Ketuk nama balai untuk masuk; balai berkabut belum terbuka.')
            : t('Ini peta Pulau Wonorejo. Panah kuning menunjuk tujuan berikutnya. Klik nama balai untuk masuk; balai berkabut belum terbuka.'),
        },
        { target: '.peta-tujuan', teks: t('Atau ketuk tombol ▶ ini untuk langsung menuju balai tujuan.') },
        {
          target: '.peta-zoom',
          teks: hp
            ? t('➕ ➖ memperbesar dan memperkecil peta (bisa juga cubit dua jari). Geser peta dengan satu jari. 🎯 kembali menyorot tujuan.')
            : t('➕ ➖ memperbesar dan memperkecil peta (bisa juga gulir mouse). Seret untuk menggeser peta. 🎯 kembali menyorot tujuan.'),
        },
        { target: '.peta-bar', teks: t('🎒 Tas, ⭐ Bintang, dan ☰ Menu ada di bilah atas.') },
      ];
    case 'uji':
      return [
        { teks: t('Selamat datang di Tempat Uji! Setiap soal punya 3 hati ❤️. Jawaban salah mengurangi satu hati.') },
        { teks: t('Bila jawabanmu salah, pilih 🔁 Coba lagi, atau 📖 Ingat cerita untuk melihat lagi adegannya di Halaman Cerita.') },
        { teks: t('Tiap jawaban benar menyalakan satu obor. 3 benar = ⭐⭐⭐. Semangat!') },
      ];
    case 'mercusuar':
      return [
        { teks: t('Kamu sampai di Mercusuar Tua! Dekati pintunya lalu ketuk 🚪 Buka Pintu untuk masuk.') },
        { teks: t('Naiki tangga melingkar. Di depan pintu tiap lantai, jawab soal dari penjaganya untuk membuka pintu itu.') },
        { teks: t('Di Puncak Lampu, ketuk 💡 Nyalakan Lampu. Kamu lulus bila minimal 21 dari 30 jawaban benar.') },
      ];
  }
}

/** Kotak target yang terlihat di layar, atau null (tidak ada / tersembunyi). */
function kotakTarget(selektor: string | undefined): DOMRect | null {
  if (!selektor) return null;
  const elemen = [...document.querySelectorAll<HTMLElement>(selektor)].find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
  elemen?.scrollIntoView?.({ block: 'center' });
  const r = elemen?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0 ? r : null;
}

/** Memutar langkah-langkah panduan. Selesai (resolve) saat langkah terakhir di-Oke atau dilewati. */
export function putarPanduan(langkah: LangkahPanduan[], host: HTMLElement = document.body): Promise<void> {
  return new Promise((selesai) => {
    if (langkah.length === 0) {
      selesai();
      return;
    }
    let i = 0;
    const sorot = el('div', { class: 'panduan-sorot', attrs: { 'aria-hidden': 'true' } });
    const teks = el('p', { class: 'panduan-teks' });
    const oke = el('button', { class: 'btn kecil', attrs: { type: 'button' } });
    const lewati = el('button', { class: 'btn kecil ghost', text: t('Lewati panduan'), attrs: { type: 'button' } });
    const balon = el('div', {
      class: 'panduan-balon',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('🧭 Panduan'), 'aria-live': 'polite' },
      children: [teks, el('div', { class: 'panduan-aksi', children: [lewati, oke] })],
    });
    const overlay = el('div', { class: 'panduan-overlay', children: [sorot, balon] });

    const tata = (): void => {
      const l = langkah[i] as LangkahPanduan;
      teks.textContent = l.teks;
      oke.textContent = i === langkah.length - 1 ? t('Oke, mengerti! 👍') : t('Oke ({n}/{total}) ▶', { n: i + 1, total: langkah.length });
      const r = kotakTarget(l.target);
      overlay.classList.toggle('tanpa-target', !r);
      if (!r) {
        balon.style.top = '';
        balon.style.bottom = '';
        return;
      }
      const jarak = 8;
      Object.assign(sorot.style, { left: `${r.left - jarak}px`, top: `${r.top - jarak}px`, width: `${r.width + jarak * 2}px`, height: `${r.height + jarak * 2}px` });
      // Balon di sisi yang lebih lega (atas/bawah target), tetap di dalam layar.
      const diBawah = r.top + r.height / 2 < window.innerHeight / 2;
      balon.style.top = diBawah ? `${Math.min(r.bottom + jarak * 2, window.innerHeight - 160)}px` : '';
      balon.style.bottom = diBawah ? '' : `${Math.max(window.innerHeight - r.top + jarak * 2, 12)}px`;
      // Target lebih tinggi dari layar (mis. HP landscape): balon jangan sampai keluar layar.
      const b = balon.getBoundingClientRect();
      if (b.top < 8 || b.bottom > window.innerHeight - 8) {
        balon.style.top = '';
        balon.style.bottom = '12px';
      }
    };

    const tutup = (): void => {
      window.removeEventListener('resize', tata);
      document.removeEventListener('keydown', tombol, true);
      overlay.remove();
      selesai();
    };
    const lanjut = (): void => {
      sfx.click();
      if (++i >= langkah.length) tutup();
      else {
        tata();
        oke.focus({ preventScroll: true });
      }
    };
    // Enter/Spasi sudah "mengklik" tombol Oke yang difokus. Esc = lewati, ditangkap
    // lebih dulu agar tidak ikut membuka menu game (H/Esc).
    const tombol = (ev: KeyboardEvent): void => {
      if (ev.key !== 'Escape') return;
      ev.preventDefault();
      ev.stopPropagation();
      tutup();
    };
    oke.addEventListener('click', lanjut);
    lewati.addEventListener('click', () => {
      sfx.click();
      tutup();
    });
    window.addEventListener('resize', tata);
    document.addEventListener('keydown', tombol, true);
    host.append(overlay);
    tata();
    oke.focus({ preventScroll: true });
  });
}
