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
import { BAGIAN, PRESET, hitungWarna, rasioKontras, type Bagian, type PilihanKostum } from '../../world/kostum';
import { kostumDari, warnaTurunan } from '../../core/kostumPemain';
import type { PlayerGender } from '../../../shared/types';
import type { ScreenContext } from './context';
import { t } from '../../core/bahasa';
import { bukaPengaturan } from '../pengaturan';
import { bukaGabungKelas } from '../gabungKelas';
import { belumMulai, buatIdSiswa } from '../../core/profil';

/**
 * Layar pembuka: cover → pilih karakter → atur kostum (gaya + warna) → isi nama &
 * mode (sendiri/multiplayer) → cutscene badai → balai pertama (prolog).
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

  // Kostum pilihan per gender. Disimpan terpisah agar berganti karakter tidak
  // menghapus kostum yang sudah dipilih untuk karakter lain.
  const kostumDraft: Record<PlayerGender, PilihanKostum> = {
    'laki-laki': progress.gender === 'laki-laki' ? kostumDari(progress) : {},
    perempuan: progress.gender === 'perempuan' ? kostumDari(progress) : {},
  };

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
    // Profil yang karakternya sudah dipilih tapi petualangannya belum dimulai
    // (mis. baru bergabung ke kelas): mulai dengan cerita badai.
    const segar = adaProgres && belumMulai(progressKini);

    const mulai = el('button', {
      class: 'btn block',
      text: adaProgres && !segar ? t('▶️ Lanjutkan Petualangan') : t('▶️ Mulai Petualangan'),
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
            if (segar) {
              lepasPreview();
              (mulai as HTMLButtonElement).disabled = true;
              void putarCutscene(document.body, CUTSCENE_BADAI).then(() => masukPermainan());
            } else {
              masukPermainan();
            }
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
          text: t('🔄 Mulai dari Awal'),
          attrs: { type: 'button' },
          on: {
            click: () => {
              sfx.click();
              const dlg = showDialog({
                tokoh: 'Kapten Bahari',
                teks: t('Mulai dari awal akan menghapus semua bintang, alat, dan catatan belajarmu. Yakin mau mulai baru?'),
                aksi: t('Ya, mulai dari awal'),
                onBatal: () => {},
                onAksi: () => {
                  ctx.reset();
                  bukaKunciSuara();
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
      text: t('📖 Petunjuk Bermain'),
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          ctx.navigate('howto', { dari: 'intro' });
        },
      },
    });
    const pengaturan = el('button', {
      class: 'btn ghost block',
      text: t('⚙️ Pengaturan'),
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          bukaPengaturan(document.body);
        },
      },
    });
    const tentang = el('button', {
      class: 'btn ghost block',
      text: t('ℹ️ Tentang Game'),
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          ctx.navigate('about');
        },
      },
    });
    // Gabung kelas (dari Bermain Sendiri) atau ganti siswa (perangkat dipakai bergantian).
    const tombolKelas = progressKini.token
      ? el('button', {
          class: 'btn ghost block',
          text: t('🔄 Bukan saya — ganti siswa'),
          attrs: { type: 'button' },
          on: { click: () => { sfx.click(); bukaGabungKelas(document.body, { jenis: 'ganti' }); } },
        })
      : adaProgres
        ? el('button', {
            class: 'btn secondary block',
            text: t('👥 Gabung Kelas'),
            attrs: { type: 'button' },
            on: { click: () => { sfx.click(); bukaGabungKelas(document.body, { jenis: 'gabung' }); } },
          })
        : null;

    // Kartu identitas saat bermain di kelas.
    const kartuKelas = progressKini.token
      ? el('div', {
          class: 'card kelas-kartu',
          children: [
            el('span', { class: 'label-kecil', text: t('👥 Bermain sebagai') }),
            el('strong', { text: `${progressKini.playerName || t('Penjelajah')} · ${t('Kelas {token}', { token: progressKini.token })}` }),
          ],
        })
      : null;

    // Sapaan singkat bila melanjutkan.
    const sapaan =
      adaProgres && !segar && !progressKini.token && progressKini.playerName
        ? el('p', {
            class: 'muted center-text',
            text: t('Halo lagi, {playerName}! Lanjutkan petualanganmu, ya.', { playerName: progressKini.playerName }),
          })
        : null;

    const sampul = el('div', { class: 'sampul' });
    const emojiSampul = el('div', { class: 'emoji cover-emoji', text: '🏝️' });
    void urlGambar('sampul').then((url) => {
      if (!url) return;
      const img = el('img', { class: 'sampul-gambar', attrs: { src: url, alt: t('Pulau Wonorejo dengan Mercusuar Tua di puncaknya') } });
      sampul.replaceChildren(img);
      sampul.classList.add('dengan-gambar');
      emojiSampul.remove();
    });
    // `cover-isi` membungkus judul + tombol: di layar mendatar ia menjadi kolom
    // kanan, sementara gambar sampul mengisi kolom kiri.
    replace([
      sampul,
      el('div', {
        class: 'cover-isi',
        children: [
          el('header', {
            class: 'hero cover-hero',
            children: [
              emojiSampul,
              el('h1', { class: 'cover-judul', text: APP_INFO.judul }),
              el('p', { class: 'subjudul', text: APP_INFO.subjudul }),
            ],
          }),
          kartuKelas,
          sapaan,
          el('div', { class: 'stack cover-tombol', children: [mulai, mulaiBaru, tombolKelas, petunjuk, pengaturan, tentang] }),
          el('p', { class: 'footer-note', text: t('Game Edukasi IPA · {jenjang} · © 2026', { jenjang: APP_INFO.jenjang }) }),
        ],
      }),
    ]);
  }

  function renderKarakter(): void {
    lepasPreview();
    // Dua pratinjau 3D (avatar GLB asli dengan kostum masing-masing).
    const previewL = createKarakterPreview('laki-laki', {}, { kostum: kostumDraft['laki-laki'] });
    const previewP = createKarakterPreview('perempuan', {}, { kostum: kostumDraft.perempuan });
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
          el('div', { class: 'karakter-tagline', text: g === 'perempuan' ? t('Berhijab & gamis') : t('Bercelana panjang') }),
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
      text: t('Lanjut →'),
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
      el('div', { class: 'topbar', children: [el('h2', { text: t('Kartu Anggota Ekspedisi') })] }),
      el('p', { class: 'muted center-text intro-ket', text: t('Siapa penjelajah termuda Kapal Ekspedisi Sains? Pilih karaktermu.') }),
      el('div', { class: 'pilih-karakter-row', children: [kartu('laki-laki', previewL), kartu('perempuan', previewP)] }),
      el('div', { class: 'stack intro-aksi', children: [lanjut] }),
    ]);
  }

  /**
   * Langkah kostum: 8 gaya (preset) dalam satu slide, lalu warna per bagian
   * (tiap bagian satu baris slide). Pilihan langsung tampil di avatar GLB tanpa
   * menggambar ulang layar, sehingga pratinjau tidak berkedip.
   */
  function renderWarna(): void {
    lepasPreview();
    const g = gender;
    const previewSatu = createKarakterPreview(g, {}, { kostum: kostumDraft[g] });
    preview = previewSatu;
    previewSatu.canvas.classList.add('preview-besar');

    const pilihan = (): PilihanKostum => kostumDraft[g];
    const warnaKini = (): Record<string, string> => hitungWarna(g, pilihan()).bagian;
    const presetKini = (): string => hitungWarna(g, pilihan()).preset;

    /** Slide horizontal dengan tombol ‹ › (geser jari juga bisa). */
    const slide = (label: string, isi: HTMLElement[]): HTMLElement => {
      const jalur = el('div', { class: 'kostum-jalur', attrs: { role: 'group', 'aria-label': label }, children: isi });
      const geser = (arah: number): void => jalur.scrollBy({ left: arah * jalur.clientWidth * 0.8, behavior: 'smooth' });
      return el('div', {
        class: 'kostum-slide',
        children: [
          el('button', {
            class: 'kostum-panah',
            text: '‹',
            attrs: { type: 'button', 'aria-label': t('Geser ke kiri') },
            on: { click: () => geser(-1) },
          }),
          jalur,
          el('button', {
            class: 'kostum-panah',
            text: '›',
            attrs: { type: 'button', 'aria-label': t('Geser ke kanan') },
            on: { click: () => geser(1) },
          }),
        ],
      });
    };

    const peringatan = el('p', { class: 'kostum-peringatan', attrs: { role: 'status', 'aria-live': 'polite' } });
    const tombolReset = el('button', {
      class: 'btn ghost kecil kostum-reset',
      text: t('↺ Kembali ke warna gaya'),
      attrs: { type: 'button' },
    });

    // ---- Gaya (preset) ----
    const kartuPreset = PRESET[g].map((p) => {
      const titik = BAGIAN[g]
        .slice(0, 4)
        .map((b) => el('span', { class: 'kostum-titik', attrs: { style: `background:${p.warna[b.id] ?? '#ccc'}` } }));
      const btn = el('button', {
        class: 'kostum-preset',
        attrs: { type: 'button', 'data-preset': p.id, 'aria-pressed': 'false' },
        children: [
          el('span', { class: 'kostum-titik-baris', attrs: { 'aria-hidden': 'true' }, children: titik }),
          el('span', { class: 'kostum-preset-nama', text: t(p.nama) }),
        ],
      });
      btn.addEventListener('click', () => {
        sfx.click();
        kostumDraft[g] = { preset: p.id };
        perbarui();
      });
      return btn;
    });

    // ---- Warna per bagian ----
    const barisBagian = BAGIAN[g].map((info) => {
      const tombol = info.swatch.map((w) =>
        el('button', {
          class: 'kostum-swatch',
          attrs: {
            type: 'button',
            'data-hex': w.hex,
            'aria-pressed': 'false',
            'aria-label': `${t(info.label)}: ${t(w.nama)}`,
            title: t(w.nama),
          },
          children: [
            el('span', { class: 'kostum-bulatan', attrs: { style: `background:${w.hex}` } }),
            el('span', { class: 'kostum-swatch-nama', text: t(w.nama) }),
          ],
          on: {
            click: () => {
              sfx.click();
              const p = pilihan();
              kostumDraft[g] = { preset: p.preset, warna: { ...p.warna, [info.id]: w.hex } };
              perbarui();
            },
          },
        }),
      );
      return el('div', {
        class: 'kostum-bagian warna-baris',
        attrs: { 'data-bagian': info.id },
        children: [el('div', { class: 'warna-label', text: t(info.label) }), slide(t(info.label), tombol)],
      });
    });

    tombolReset.addEventListener('click', () => {
      sfx.click();
      kostumDraft[g] = { preset: presetKini() };
      perbarui();
    });

    /** Tandai gaya & warna yang aktif, perbarui avatar, dan cek kontras. */
    function perbarui(): void {
      const warna = warnaKini();
      const idPreset = presetKini();
      const adaUbahan = Object.keys(pilihan().warna ?? {}).length > 0;
      for (const b of kartuPreset) {
        const aktif = b.dataset.preset === idPreset;
        b.classList.toggle('dipilih', aktif);
        b.classList.toggle('diubah', aktif && adaUbahan);
        b.setAttribute('aria-pressed', aktif ? 'true' : 'false');
      }
      for (const baris of barisBagian) {
        const id = baris.dataset.bagian as Bagian;
        for (const sw of Array.from(baris.querySelectorAll<HTMLElement>('.kostum-swatch'))) {
          const aktif = sw.dataset.hex?.toLowerCase() === warna[id]?.toLowerCase();
          sw.classList.toggle('dipilih', aktif);
          sw.setAttribute('aria-pressed', aktif ? 'true' : 'false');
        }
      }
      tombolReset.hidden = !adaUbahan;
      // Baju/tunik vs aksen terlalu mirip: aksennya tidak terlihat.
      const utama = warna[g === 'perempuan' ? 'tunik' : 'baju'];
      const aksen = warna.aksen;
      peringatan.textContent =
        utama && aksen && rasioKontras(utama, aksen) < 1.8
          ? t('⚠️ Warna baju dan aksen terlalu mirip, aksennya jadi kurang terlihat.')
          : '';
      previewSatu.setKostum?.(pilihan());
    }

    const lanjut = el('button', {
      class: 'btn block',
      text: t('Lanjut →'),
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
      text: t('← Ganti Karakter'),
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
      el('div', { class: 'topbar', children: [el('h2', { text: t('Atur Kostum') })] }),
      el('p', { class: 'muted center-text intro-ket', text: t('Pilih gaya kostum, lalu atur warna tiap bagian bila ingin.') }),
      el('div', { class: 'warna-panggung', children: [previewSatu.canvas] }),
      el('div', {
        class: 'kostum-panel',
        children: [
          el('div', {
            class: 'kostum-kepala',
            children: [el('span', { class: 'label-kecil', text: t('🎨 Gaya Kostum') }), tombolReset],
          }),
          slide(t('🎨 Gaya Kostum'), kartuPreset),
          el('span', { class: 'label-kecil kostum-sub', text: t('✏️ Warna per bagian') }),
          ...barisBagian,
          peringatan,
        ],
      }),
      el('div', { class: 'stack intro-aksi', children: [lanjut, kembali] }),
    ]);
    perbarui();
    // Gulirkan slide gaya ke kartu yang aktif.
    kartuPreset.find((b) => b.classList.contains('dipilih'))?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }

  function renderNama(): void {
    const input = el('input', {
      class: 'isian',
      attrs: {
        type: 'text',
        placeholder: t('Tulis nama panggilanmu'),
        value: namaDraft,
        maxlength: '20',
        'aria-label': t('Nama panggilan'),
        autocomplete: 'off',
      },
    });

    const inputToken = el('input', {
      class: 'isian token-input',
      attrs: {
        type: 'text',
        inputmode: 'numeric',
        placeholder: t('Token 4 angka dari guru'),
        value: tokenDraft,
        maxlength: '4',
        'aria-label': t('Token kelas'),
        autocomplete: 'off',
      },
    });

    const pilihanMode = el('div', {
      class: 'pilih-mode',
      children: [
        modeKartu('single', t('🎒 Bermain Sendiri'), t('Tanpa internet, progres di perangkat ini')),
        modeKartu('multi', t('👥 Multiplayer Kelas'), t('Masuk dengan token dari guru')),
      ],
    });

    const blokToken = el('div', {
      class: 'card token-blok',
      children: [
        el('span', { class: 'label-kecil', text: t('Token kelas (4 angka)') }),
        inputToken,
        el('p', { class: 'muted kecil-teks', text: t('Minta token ini ke gurumu sebelum bermain bersama.') }),
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
      text: t('🌊 Mulai Bertahan Hidup'),
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
            // Kostum GLB per profil + tiga warna turunan untuk karakter prosedural.
            kostum: kostumDraft[gender],
            ...warnaTurunan(gender, kostumDraft[gender]),
            introDone: true,
            token: token || undefined,
            // Profil kelas mendapat ID tetap (dipakai lagi bila token sama).
            idSiswa: token ? (ctx.getProgress().token === token ? ctx.getProgress().idSiswa : undefined) ?? buatIdSiswa() : undefined,
          };
          ctx.setProgress(next);
          ctx.persist();
          // Alur cerita (badai) diputar setelah karakter, nama & mode dipilih,
          // lalu langsung masuk balai pertama.
          lepasPreview();
          (mulai as HTMLButtonElement).disabled = true;
          void putarCutscene(document.body, CUTSCENE_BADAI).then(() => masukPermainan());
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
      text: t('← Ganti Karakter'),
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
      el('div', { class: 'topbar', children: [el('h2', { text: t('Nama & Mode Bermain') })] }),
      el('p', { class: 'muted center-text intro-ket', text: t('Nama ini dipakai untuk sertifikat digital dan daftar kelas.') }),
      el('div', {
        class: 'card kartu-nama',
        children: [
          el('div', { class: 'karakter-emoji kecil', text: KARAKTER[gender].emoji, attrs: { 'aria-hidden': 'true' } }),
          input,
        ],
      }),
      pilihanMode,
      mode === 'multi' ? blokToken : null,
      el('div', { class: 'stack intro-aksi', children: [mulai, kembali] }),
    ]);
    input.focus();
  }

  /** Masuk ke permainan: prolog di Goa Sinar bila belum, peta bila sudah. */
  function masukPermainan(): void {
    lepasPreview();
    const p = ctx.getProgress();
    if (!p.prologSelesai) {
      showLoading(document.getElementById('app') ?? document.body, { pesan: t('Kamu mulai sadar...'), tip: t('Gelap... ada cahaya tipis dari atas.') }, () => {
        ctx.navigate('noktah', { noktah: 'F01', prolog: true });
      });
      return;
    }
    ctx.navigate('map', { dariIntro: true });
  }

  function renderLangkah(): void {
    // Dipakai CSS untuk menata tiap langkah (terutama layar mendatar/landscape).
    root.dataset.langkah = langkah;
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
