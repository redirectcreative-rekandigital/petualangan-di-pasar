import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { APP_INFO, KARAKTER, adaProgresTersimpan } from '../../core/state';
import { showDialog } from '../dialog';
import { putarCutscene } from '../cutscene';
import { CUTSCENE_BADAI } from '../../data/cerita';
import { bukaKunciSuara } from '../../core/suara';
import { showLoading } from '../loading';
import { urlGambar } from '../../core/gambar';
import { createKarakterPreview, type KarakterPreview } from '../components/karakterPreview';
import {
  PALET_PILIHAN,
  warnaBawaan,
  type BagianWarna,
  type PilihanWarna,
} from '../../world/karakter';
import type { PlayerGender } from '../../../shared/types';
import type { ScreenContext } from './context';

/**
 * Layar pembuka: cover → pilih karakter → pilih warna pakaian → isi nama.
 * Setelah selesai, konteks dipanggil untuk lanjut ke peta + loading.
 */
export function renderIntro(ctx: ScreenContext): HTMLElement {
  const progress = ctx.getProgress();
  let gender: PlayerGender = progress.gender;
  let langkah: 'cover' | 'karakter' | 'warna' | 'nama' = 'cover';
  // Mode bermain dipilih di langkah nama; disimpan di sini agar tidak tereset
  // ketika layar digambar ulang saat siswa menekan pilihan mode.
  let mode: 'single' | 'multi' = progress.token ? 'multi' : 'single';
  // Draf nama & token agar tidak hilang saat layar digambar ulang.
  let namaDraft = progress.playerName;
  let tokenDraft = progress.token ?? '';

  // Warna pilihan per gender. Disimpan terpisah agar berganti karakter tidak
  // menghapus warna yang sudah dipilih untuk karakter lain.
  const warnaBajuDraft: Record<PlayerGender, number> = {
    'laki-laki': progress.warnaBaju ?? warnaBawaan('laki-laki', 'baju'),
    perempuan: progress.gender === 'perempuan' && progress.warnaBaju
      ? progress.warnaBaju
      : warnaBawaan('perempuan', 'baju'),
  };
  const warnaBawahanDraft: Record<PlayerGender, number> = {
    'laki-laki': progress.gender === 'laki-laki' && progress.warnaBawahan
      ? progress.warnaBawahan
      : warnaBawaan('laki-laki', 'bawahan'),
    perempuan: progress.gender === 'perempuan' && progress.warnaBawahan
      ? progress.warnaBawahan
      : warnaBawaan('perempuan', 'bawahan'),
  };
  let warnaHijabDraft = progress.gender === 'perempuan' && progress.warnaHijab
    ? progress.warnaHijab
    : warnaBawaan('perempuan', 'hijab');

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
          bukaKunciSuara();
          if (adaProgres) {
            // Lanjutkan: langsung ke peta (atau ke prolog bila belum selesai).
            const next = { ...ctx.getProgress(), introDone: true };
            ctx.setProgress(next);
            ctx.persist();
            masukPermainan();
            return;
          }
          void putarCutscene(document.body, CUTSCENE_BADAI).then(() => {
            langkah = 'karakter';
            renderLangkah();
          });
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
                tokoh: 'Kapten Bahari',
                teks: 'Mulai dari awal akan menghapus semua bintang, alat, dan catatan belajarmu. Yakin mau mulai baru?',
                aksi: 'Ya, mulai dari awal',
                onBatal: () => {},
                onAksi: () => {
                  ctx.reset();
                  bukaKunciSuara();
                  void putarCutscene(document.body, CUTSCENE_BADAI).then(() => {
                    langkah = 'karakter';
                    renderLangkah();
                  });
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

    const sampul = el('div', { class: 'sampul' });
    const emojiSampul = el('div', { class: 'emoji cover-emoji', text: '🏝️' });
    void urlGambar('sampul').then((url) => {
      if (!url) return;
      const img = el('img', { class: 'sampul-gambar', attrs: { src: url, alt: 'Pulau Nusa Kawruh dengan Mercusuar Tua di puncaknya' } });
      sampul.replaceChildren(img);
      sampul.classList.add('dengan-gambar');
      emojiSampul.remove();
    });
    replace([
      sampul,
      el('header', {
        class: 'hero cover-hero',
        children: [
          emojiSampul,
          el('h1', { class: 'cover-judul', text: APP_INFO.judul }),
          el('p', { class: 'subjudul', text: APP_INFO.subjudul }),
          el('p', { class: 'muted', text: `${APP_INFO.pembuat} · ${APP_INFO.sekolah}` }),
        ],
      }),
      sapaan,
      el('div', { class: 'stack', children: [mulai, mulaiBaru, petunjuk, tentang, guru] }),
      el('p', { class: 'footer-note', text: 'Lomba Game Edukasi Berbasis AI · Guru Muhammadiyah se-Cabang Blimbing 2026' }),
    ]);
  }

  function renderKarakter(): void {
    lepasPreview();
    // Dua pratinjau 3D: satu untuk tiap pilihan.
    const previewL = createKarakterPreview('laki-laki', {
      warnaPakaian: warnaBajuDraft['laki-laki'],
      warnaBawahan: warnaBawahanDraft['laki-laki'],
    });
    const previewP = createKarakterPreview('perempuan', {
      warnaPakaian: warnaBajuDraft.perempuan,
      warnaBawahan: warnaBawahanDraft.perempuan,
      warnaHijab: warnaHijabDraft,
    });
    preview = {
      canvas: previewL.canvas,
      setGender: () => {},
      setWarna: () => {},
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
          langkah = 'warna';
          renderLangkah();
        },
      },
    });

    replace([
      el('div', { class: 'topbar', children: [el('h2', { text: 'Kartu Anggota Ekspedisi' })] }),
      el('p', { class: 'muted center-text', text: 'Siapa penjelajah termuda Kapal Ekspedisi Sains? Pilih karaktermu.' }),
      el('div', { class: 'pilih-karakter-row', children: [kartu('laki-laki', previewL), kartu('perempuan', previewP)] }),
      el('div', { class: 'stack', children: [lanjut] }),
    ]);
  }

  /** Langkah kustomisasi warna: baju, bawahan (celana/rok), dan hijab. */
  function renderWarna(): void {
    lepasPreview();
    const previewSatu = createKarakterPreview(gender, {
      warnaPakaian: warnaBajuDraft[gender],
      warnaBawahan: warnaBawahanDraft[gender],
      warnaHijab: gender === 'perempuan' ? warnaHijabDraft : undefined,
    });
    preview = {
      canvas: previewSatu.canvas,
      setGender: () => {},
      setWarna: (w) => previewSatu.setWarna(w),
      dispose: () => previewSatu.dispose(),
    };
    previewSatu.canvas.classList.add('preview-besar');

    const segarkanPreview = (): void => {
      previewSatu.setWarna({
        warnaPakaian: warnaBajuDraft[gender],
        warnaBawahan: warnaBawahanDraft[gender],
        warnaHijab: gender === 'perempuan' ? warnaHijabDraft : undefined,
      });
    };

    /** Baris pilihan warna untuk satu bagian. */
    const barisWarna = (
      label: string,
      bagian: BagianWarna,
      ambil: () => number,
      pasang: (nilai: number) => void,
      daftar: PilihanWarna[],
    ): HTMLElement => {
      const tombol: HTMLElement[] = daftar.map((p) => {
        const aktif = ambil() === p.nilai;
        const b = el('button', {
          class: `warna-tombol ${aktif ? 'dipilih' : ''}`,
          attrs: {
            type: 'button',
            'aria-pressed': aktif ? 'true' : 'false',
            'aria-label': `${label}: ${p.nama}`,
            title: p.nama,
            'data-bagian': bagian,
          },
        });
        const bulatan = el('span', {
          class: 'warna-bulatan',
          attrs: { style: `background:#${p.nilai.toString(16).padStart(6, '0')}` },
        });
        b.append(bulatan, el('span', { class: 'warna-nama', text: p.nama }));
        b.addEventListener('click', () => {
          sfx.click();
          pasang(p.nilai);
          sfx.click();
          renderLangkah();
        });
        return b;
      });

      return el('div', {
        class: 'warna-baris',
        children: [el('div', { class: 'warna-label', text: label }), el('div', { class: 'warna-opsi', children: tombol })],
      });
    };

    const baju = barisWarna(
      '👕 Warna Baju',
      'baju',
      () => warnaBajuDraft[gender],
      (n) => {
        warnaBajuDraft[gender] = n;
      },
      PALET_PILIHAN[gender].baju,
    );

    const bawahan = barisWarna(
      gender === 'perempuan' ? '👗 Warna Gamis/Rok' : '👖 Warna Celana',
      'bawahan',
      () => warnaBawahanDraft[gender],
      (n) => {
        warnaBawahanDraft[gender] = n;
      },
      PALET_PILIHAN[gender].bawahan,
    );

    const hijab =
      gender === 'perempuan'
        ? barisWarna(
            '🧕 Warna Hijab',
            'hijab',
            () => warnaHijabDraft,
            (n) => {
              warnaHijabDraft = n;
            },
            PALET_PILIHAN.perempuan.hijab,
          )
        : null;

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
      el('div', { class: 'topbar', children: [el('h2', { text: 'Atur Pakaian' })] }),
      el('p', { class: 'muted center-text', text: 'Pilih warna pakaian penjelajahmu.' }),
      el('div', { class: 'warna-panggung', children: [previewSatu.canvas] }),
      baju,
      bawahan,
      hijab,
      el('div', { class: 'stack', children: [lanjut, kembali] }),
    ]);
    segarkanPreview();
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
      text: '🌊 Mulai Bertahan Hidup',
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
          const next = {
            ...ctx.getProgress(),
            playerName: nama,
            gender,
            warnaBaju: warnaBajuDraft[gender],
            warnaBawahan: warnaBawahanDraft[gender],
            warnaHijab: gender === 'perempuan' ? warnaHijabDraft : undefined,
            introDone: true,
            token: token || undefined,
          };
          ctx.setProgress(next);
          ctx.persist();
          masukPermainan();
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

  /** Masuk ke permainan: prolog di Goa Sinar bila belum, peta bila sudah. */
  function masukPermainan(): void {
    lepasPreview();
    const p = ctx.getProgress();
    if (!p.prologSelesai) {
      showLoading(document.getElementById('app') ?? document.body, { pesan: 'Kamu mulai sadar...', tip: 'Gelap... ada cahaya tipis dari atas.' }, () => {
        ctx.navigate('noktah', { noktah: 'F01', prolog: true });
      });
      return;
    }
    ctx.navigate('map', { dariIntro: true });
  }

  function renderLangkah(): void {
    if (langkah !== 'karakter' && langkah !== 'warna') lepasPreview();
    if (langkah === 'cover') renderCover();
    else if (langkah === 'karakter') renderKarakter();
    else if (langkah === 'warna') renderWarna();
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
