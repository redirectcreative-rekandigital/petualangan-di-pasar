import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { APP_INFO, KARAKTER, adaProgresTersimpan } from '../../core/state';
import { showDialog } from '../dialog';
import { createKarakterPreview, type KarakterPreview } from '../components/karakterPreview';
import type { PlayerGender } from '../../../shared/types';
import type { ScreenContext } from './context';

/**
 * Layar pembuka: cover, pilih karakter (laki-laki/perempuan), lalu isi nama
 * panggilan. Setelah selesai, konteks dipanggil untuk lanjut ke peta + loading.
 */
export function renderIntro(ctx: ScreenContext): HTMLElement {
  const progress = ctx.getProgress();
  let gender: PlayerGender = progress.gender;
  let langkah: 'cover' | 'karakter' | 'nama' = 'cover';
  // Mode bermain dipilih di langkah nama; disimpan di sini agar tidak tereset
  // ketika layar digambar ulang saat siswa menekan pilihan mode.
  let mode: 'single' | 'multi' = progress.token ? 'multi' : 'single';
  // Draf nama & token agar tidak hilang saat layar digambar ulang.
  let namaDraft = progress.playerName;
  let tokenDraft = progress.token ?? '';

  // Pratinjau 3D aktif (dibuang sebelum kartu dibangun ulang / layar berganti).
  let preview: KarakterPreview | null = null;
  const lepasPreview = (): void => {
    preview?.dispose();
    preview = null;
  };

  const root = el('section', { class: 'screen intro-screen' });

  function renderCover(): void {
    const progressKini = ctx.getProgress();
    const adaProgres = adaProgresTersimpan(progressKini);

    const mulai = el('button', {
      class: 'btn block',
      text: adaProgres ? '▶️ Lanjutkan Petualangan' : '▶️ Mulai Petualangan',
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          if (adaProgres) {
            // Lanjutkan: langsung ke peta tanpa mengulang isi nama.
            const next = { ...ctx.getProgress(), introDone: true };
            ctx.setProgress(next);
            ctx.persist();
            ctx.navigate('map');
            return;
          }
          langkah = 'karakter';
          renderLangkah();
        },
      },
    });

    const mulaiBaru = adaProgres
      ? el('button', {
          class: 'btn warn block',
          text: '🔄 Mulai dari Awal',
          attrs: { type: 'button' },
          on: {
            click: () => {
              sfx.click();
              const dlg = showDialog({
                penjual: 'Pasar Amanah',
                teks: 'Mulai dari awal akan menghapus semua bintang dan catatan belajarmu. Yakin mau mulai baru?',
                aksi: 'Ya, mulai dari awal',
                onBatal: () => {},
                onAksi: () => {
                  ctx.reset();
                  langkah = 'karakter';
                  renderLangkah();
                },
              });
              document.body.append(dlg.root);
            },
          },
        })
      : null;

    const petunjuk = el('button', {
      class: 'btn secondary block',
      text: '📖 Petunjuk Bermain',
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          ctx.navigate('howto');
        },
      },
    });
    const tentang = el('button', {
      class: 'btn ghost block',
      text: 'ℹ️ Tentang Karya',
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          ctx.navigate('about');
        },
      },
    });
    const guru = el('button', {
      class: 'btn ghost block',
      text: '👩‍🏫 Mode Guru',
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          ctx.navigate('guru');
        },
      },
    });

    // Sapaan singkat bila melanjutkan.
    const sapaan =
      adaProgres && progressKini.playerName
        ? el('p', {
            class: 'muted center-text',
            text: `Halo lagi, ${progressKini.playerName}! Lanjutkan petualanganmu, ya.`,
          })
        : null;

    replace([
      el('header', {
        class: 'hero cover-hero',
        children: [
          el('div', { class: 'emoji cover-emoji', text: '🗺️' }),
          el('h1', { class: 'cover-judul', text: APP_INFO.judul }),
          el('p', { class: 'subjudul', text: APP_INFO.subjudul }),
          el('p', { class: 'muted', text: `${APP_INFO.pembuat} · ${APP_INFO.sekolah}` }),
        ],
      }),
      sapaan,
      el('div', { class: 'stack', children: [mulai, mulaiBaru, petunjuk, tentang, guru] }),
      el('p', { class: 'footer-note', text: 'Lomba Game Edukasi Berbasis AI - Guru Muhammadiyah se-Cabang Blimbing 2026' }),
    ]);
  }

  function renderKarakter(): void {
    lepasPreview();
    // Dua pratinjau 3D: satu untuk tiap pilihan.
    const previewL = createKarakterPreview('laki-laki');
    const previewP = createKarakterPreview('perempuan');
    preview = {
      canvas: previewL.canvas,
      setGender: () => {},
      dispose: () => {
        previewL.dispose();
        previewP.dispose();
      },
    };

    const kartu = (g: PlayerGender, prev: KarakterPreview): HTMLElement => {
      const info = KARAKTER[g];
      const aktif = gender === g;
      const card = el('button', {
        class: `pilih-karakter ${aktif ? 'dipilih' : ''}`,
        attrs: { type: 'button', 'aria-pressed': aktif ? 'true' : 'false' },
        children: [
          prev.canvas,
          el('div', { class: 'karakter-label', text: info.label }),
          el('div', { class: 'karakter-tagline', text: g === 'perempuan' ? 'Berhijab & gamis' : 'Bercelana panjang' }),
        ],
      });
      card.addEventListener('click', () => {
        sfx.click();
        gender = g;
        renderLangkah();
      });
      return card;
    };

    const lanjut = el('button', {
      class: 'btn block',
      text: 'Lanjut →',
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          langkah = 'nama';
          renderLangkah();
        },
      },
    });

    replace([
      el('div', { class: 'topbar', children: [el('h2', { text: 'Pilih Karakter' })] }),
      el('p', { class: 'muted center-text', text: 'Pilih penjelajah yang akan kamu mainkan.' }),
      el('div', { class: 'pilih-karakter-row', children: [kartu('laki-laki', previewL), kartu('perempuan', previewP)] }),
      el('div', { class: 'stack', children: [lanjut] }),
    ]);
  }

  function renderNama(): void {
    const input = el('input', {
      class: 'isian',
      attrs: {
        type: 'text',
        placeholder: 'Tulis nama panggilanmu',
        value: namaDraft,
        maxlength: '20',
        'aria-label': 'Nama panggilan',
        autocomplete: 'off',
      },
    });

    const inputToken = el('input', {
      class: 'isian token-input',
      attrs: {
        type: 'text',
        inputmode: 'numeric',
        placeholder: 'Token 4 angka dari guru',
        value: tokenDraft,
        maxlength: '4',
        'aria-label': 'Token kelas',
        autocomplete: 'off',
      },
    });

    const pilihanMode = el('div', {
      class: 'pilih-mode',
      children: [
        modeKartu('single', '🎒 Bermain Sendiri', 'Tanpa internet, progres di perangkat ini'),
        modeKartu('multi', '👥 Multiplayer Kelas', 'Masuk dengan token dari guru'),
      ],
    });

    const blokToken = el('div', {
      class: 'card token-blok',
      children: [
        el('span', { class: 'label-kecil', text: 'Token kelas (4 angka)' }),
        inputToken,
        el('p', { class: 'muted kecil-teks', text: 'Minta token ini ke gurumu sebelum bermain bersama.' }),
      ],
    });

    function modeKartu(nilai: 'single' | 'multi', judul: string, ket: string): HTMLElement {
      const aktif = mode === nilai;
      const kartu = el('button', {
        class: `mode-kartu ${aktif ? 'dipilih' : ''}`,
        attrs: { type: 'button', 'aria-pressed': aktif ? 'true' : 'false' },
        children: [
          el('div', { class: 'mode-judul', text: judul }),
          el('div', { class: 'mode-ket', text: ket }),
        ],
      });
      kartu.addEventListener('click', () => {
        sfx.click();
        mode = nilai;
        renderLangkah();
      });
      return kartu;
    }

    const mulai = el('button', {
      class: 'btn block',
      text: '🚀 Mulai Berpetualang',
      attrs: { type: 'button' },
      on: {
        click: () => {
          const nama = input.value.trim();
          if (nama.length < 2) {
            input.classList.add('salah');
            input.focus();
            return;
          }
          let token = '';
          if (mode === 'multi') {
            token = inputToken.value.replace(/\D/g, '').slice(0, 4);
            if (token.length !== 4) {
              inputToken.classList.add('salah');
              inputToken.focus();
              return;
            }
          }
          sfx.click();
          const next = { ...ctx.getProgress(), playerName: nama, gender, introDone: true, token: token || undefined };
          ctx.setProgress(next);
          ctx.persist();
          ctx.navigate('map', { dariIntro: true });
        },
      },
    });

    input.addEventListener('keydown', (ev) => {
      if ((ev as KeyboardEvent).key === 'Enter') mulai.click();
    });
    input.addEventListener('input', () => {
      namaDraft = input.value;
      input.classList.remove('salah');
    });
    inputToken.addEventListener('input', () => {
      inputToken.value = inputToken.value.replace(/\D/g, '').slice(0, 4);
      tokenDraft = inputToken.value;
      inputToken.classList.remove('salah');
    });

    const kembali = el('button', {
      class: 'btn ghost block',
      text: '← Ganti Karakter',
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          langkah = 'karakter';
          renderLangkah();
        },
      },
    });

    replace([
      el('div', { class: 'topbar', children: [el('h2', { text: 'Nama & Mode Bermain' })] }),
      el('p', { class: 'muted center-text', text: 'Nama ini dipakai untuk sertifikat digital dan daftar kelas.' }),
      el('div', {
        class: 'card',
        children: [
          el('div', { class: 'karakter-emoji kecil', text: KARAKTER[gender].emoji, attrs: { 'aria-hidden': 'true' } }),
          input,
        ],
      }),
      pilihanMode,
      mode === 'multi' ? blokToken : null,
      el('div', { class: 'stack', children: [mulai, kembali] }),
    ]);
    input.focus();
  }

  function renderLangkah(): void {
    if (langkah !== 'karakter') lepasPreview();
    if (langkah === 'cover') renderCover();
    else if (langkah === 'karakter') renderKarakter();
    else renderNama();
  }

  function replace(children: Array<HTMLElement | null>): void {
    while (root.firstChild) root.removeChild(root.firstChild);
    for (const c of children) {
      if (c) root.append(c);
    }
  }

  renderLangkah();
  return root;
}
