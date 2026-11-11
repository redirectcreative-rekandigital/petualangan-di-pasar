import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { APP_INFO } from '../../core/state';
import { showToast } from '../dialog';
import { ambilSesiGuru, buatSesiGuru, kendaliGuru, onlineTersedia, type RosterSiswa } from '../../net/klien';
import { getQuestionBankAsli as getQuestionBank } from '../../data/bank';
import { CERITA_ASLI as CERITA, URUTAN_BALAI } from '../../data/cerita';
import {
  statusBalai,
  statistikSoal,
  statistikMateri,
  rekomendasi,
  barisCsvSiswa,
  kepalaCsvBalai,
  LABEL_STATUS,
  KKM_BAWAAN,
  persenBalai,
  balaiBelumTuntas,
} from '../../core/analisis';
import { kabarBaik, layarProyektor, type KabarKelas } from './proyektor';
import type { ScreenContext } from './context';

/**
 * Halaman "Mode Guru": membuat ruang kelas (token 4 digit) dan memantau
 * progres tiap siswa yang join, lengkap dengan ekspor CSV untuk analisa.
 *
 * Halaman ini hanya berfungsi bila server online dikonfigurasi. Bila tidak,
 * ditampilkan petunjuk singkat.
 */

const KUNCI_TOKEN = 'survival-sains:token-guru';
const KUNCI_KKM = 'survival-sains:kkm-guru';
const KUNCI_RAHASIA = 'survival-sains:kunci-guru';
const KUNCI_SALINAN = 'survival-sains:salinan-kelas-guru';

/** Pengumuman cepat satu ketukan. */
const PENGUMUMAN_CEPAT = ['⏰ 5 menit lagi', '👀 Lihat ke depan', '💾 Simpan dan selesai', '🙋 Angkat tangan kalau butuh bantuan'];

/** KKM guru (disimpan di perangkat guru); nilai tidak valid jatuh ke bawaan. */
let kkm = bacaKkm();

function bacaKkm(): number {
  try {
    const n = Number(localStorage.getItem(KUNCI_KKM));
    return n >= 1 && n <= 100 ? Math.round(n) : KKM_BAWAAN;
  } catch {
    return KKM_BAWAAN;
  }
}

interface StateGuru {
  token: string | null;
  guru: string;
  siswa: RosterSiswa[];
  pesan: string | null;
  timer: number;
  jalan: boolean;
  tab: 'kelas' | 'soal' | 'siswa';
  dipilih: string | null;
  kunci: string | null;
  terkunci: boolean;
  jeda: boolean;
  proyektor: boolean;
  kabar: KabarKelas[];
}

export function renderGuru(_ctx: ScreenContext): HTMLElement {
  const st: StateGuru = {
    token: bacaTokenGuru(),
    guru: APP_INFO.pembuat,
    siswa: [],
    pesan: null,
    timer: 0,
    jalan: true,
    tab: 'kelas',
    dipilih: null,
    kunci: bacaSimpanan(KUNCI_RAHASIA),
    terkunci: false,
    jeda: false,
    proyektor: false,
    kabar: [],
  };

  const root = el('section', { class: 'screen' });
  const panel = el('div', { class: 'guru-panel' });
  root.append(panel);

  const kembali = el('button', {
    class: 'btn ghost block',
    text: '🏝️ Buka Halaman Siswa',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        st.jalan = false;
        window.clearInterval(st.timer);
        // Mode Guru punya alamat sendiri: kembali ke alamat game siswa (tanpa /modeguru, ?mode=guru).
        const akar = window.location.pathname.replace(/modeguru\/?$/i, '');
        window.location.href = akar || './';
      },
    },
  });

  function segarkan(): void {
    if (!st.jalan) return;
    if (!st.token) return;
    void ambilSesiGuru(st.token).then((res) => {
      if (!st.jalan) return;
      if ('pesan' in res) {
        // Server restart: bangun ulang ruang dengan token + kunci + salinan siswa dari browser ini.
        if (res.pesan === 'Sesi tidak ditemukan.' && st.kunci) {
          void buatSesiGuru(st.guru, { token: st.token!, kunci: st.kunci, siswa: bacaSalinan() }).then((r) => {
            if ('pesan' in r) st.pesan = r.pesan;
            else showToast('Sesi dipulihkan setelah server menyala ulang.');
            gambar();
          });
          return;
        }
        st.pesan = res.pesan;
        st.siswa = [];
      } else {
        st.pesan = null;
        st.kabar = [...st.kabar.filter((k) => k.sampai > Date.now()), ...kabarBaik(st.siswa, res.siswa)].slice(-6);
        st.siswa = res.siswa;
        st.terkunci = res.terkunci;
        st.jeda = res.jeda;
        if (res.siswa.length) simpanSimpanan(KUNCI_SALINAN, JSON.stringify(res.siswa));
      }
      gambar();
    });
  }

  function mulaiPolling(): void {
    window.clearInterval(st.timer);
    st.timer = window.setInterval(segarkan, 3000);
    segarkan();
  }

  function gambar(): void {
    const potong = panel.scrollTop;
    panel.replaceChildren(...isiPanel());
    panel.scrollTop = potong;
  }

  function isiPanel(): HTMLElement[] {
    if (!onlineTersedia()) {
      return [
        headerGuru(),
        el('div', {
          class: 'card warn',
          children: [
            el('span', { class: 'label-kecil', text: 'Mode online tidak aktif' }),
            el('p', {
              text:
                'Server online belum dikonfigurasi, jadi Mode Guru belum bisa membuat token. Game tetap bisa dimainkan sendiri (singleplayer).',
            }),
          ],
        }),
        el('div', { class: 'stack', children: [kembali] }),
      ];
    }

    if (!st.token) {
      const inputGuru = el('input', {
        class: 'isian',
        attrs: { type: 'text', placeholder: 'Nama guru (mis. Bu Rosy)', value: st.guru, maxlength: '30' },
      });
      const buat = el('button', {
        class: 'btn block',
        text: '🔑 Buat Sesi Kelas',
        attrs: { type: 'button' },
        on: {
          click: () => {
            sfx.click();
            st.guru = inputGuru.value.trim() || 'Guru';
            void buatSesiGuru(st.guru).then((res) => {
              if ('pesan' in res) {
                showToast(res.pesan);
                return;
              }
              st.token = res.token;
              st.kunci = res.kunci;
              simpanTokenGuru(res.token);
              simpanSimpanan(KUNCI_RAHASIA, res.kunci);
              hapusSimpanan(KUNCI_SALINAN);
              gambar();
              mulaiPolling();
            });
          },
        },
      });
      return [
        headerGuru(),
        el('div', {
          class: 'card info',
          children: [
            el('span', { class: 'label-kecil', text: 'Cara kerja' }),
            el('p', {
              text: 'Buat sesi kelas, lalu bagikan token 4 digit ke siswa. Siswa memilih "Multiplayer" saat masuk dan mengetik token itu.',
            }),
          ],
        }),
        el('div', { class: 'card', children: [inputGuru] }),
        el('div', { class: 'stack', children: [buat, kembali] }),
      ];
    }

    if (st.proyektor) {
      return [
        layarProyektor({
          token: st.token,
          siswa: st.siswa,
          kabar: st.kabar,
          urlGame: new URL(window.location.pathname.replace(/modeguru\/?$/i, '') || './', window.location.href).href,
          keluar: () => {
            st.proyektor = false;
            gambar();
          },
        }),
      ];
    }

    // Sudah punya token: tampilkan token besar + daftar siswa.
    const anak: HTMLElement[] = [
      headerGuru(),
      el('div', {
        class: 'card token-card',
        children: [
          el('span', { class: 'label-kecil', text: 'Token kelas (bagikan ke siswa)' }),
          el('div', { class: 'token-besar', text: st.token }),
          el('div', {
            class: 'row-tombol',
            children: [
              el('button', {
                class: 'btn kecil secondary',
                text: '📋 Salin',
                attrs: { type: 'button' },
                on: {
                  click: () => {
                    sfx.click();
                    void navigator.clipboard?.writeText(st.token ?? '').then(
                      () => showToast('Token disalin!'),
                      () => showToast(`Token: ${st.token}`),
                    );
                  },
                },
              }),
              el('button', {
                class: 'btn kecil secondary',
                text: '📽️ Proyektor',
                attrs: { type: 'button' },
                on: { click: () => { sfx.click(); st.proyektor = true; gambar(); } },
              }),
              el('button', {
                class: 'btn kecil ghost',
                text: '🔄 Ganti Sesi',
                attrs: { type: 'button' },
                on: {
                  click: () => {
                    sfx.click();
                    window.clearInterval(st.timer);
                    st.token = null;
                    st.kunci = null;
                    st.siswa = [];
                    hapusTokenGuru();
                    hapusSimpanan(KUNCI_RAHASIA);
                    hapusSimpanan(KUNCI_SALINAN);
                    gambar();
                  },
                },
              }),
            ],
          }),
        ],
      }),
    ];

    if (st.pesan) {
      anak.push(el('p', { class: 'muted center-text', text: st.pesan }));
    }

    const kendali = async (aksi: Parameters<typeof kendaliGuru>[2], data: Parameters<typeof kendaliGuru>[3] = {}): Promise<boolean> => {
      if (!st.token || !st.kunci) return false;
      const galat = await kendaliGuru(st.token, st.kunci, aksi, data);
      if (galat) showToast(galat);
      else segarkan();
      return !galat;
    };
    const tombolKendali = (teks: string, klik: () => void, gaya = 'secondary'): HTMLElement =>
      el('button', { class: `btn kecil ${gaya}`, text: teks, attrs: { type: 'button' }, on: { click: () => { sfx.click(); klik(); } } });
    const isiUmum = el('input', { class: 'isian', attrs: { type: 'text', maxlength: '120', placeholder: 'Tulis pengumuman', style: 'flex:1 1 12rem' } });
    anak.push(
      el('div', {
        class: 'card',
        children: [
          el('span', { class: 'label-kecil', text: 'Kendali kelas' }),
          el('div', {
            class: 'row-tombol',
            children: [
              tombolKendali(st.terkunci ? '🔓 Buka kunci kelas' : '🔒 Kunci kelas', () => void kendali('kunci', { nilai: !st.terkunci })),
              tombolKendali(st.jeda ? '▶️ Lanjutkan' : '⏸️ Jeda semua', () => void kendali('jeda', { nilai: !st.jeda }), st.jeda ? '' : 'secondary'),
            ],
          }),
          st.terkunci ? el('p', { class: 'muted kecil-teks', text: 'Kelas dikunci: siswa baru tidak bisa bergabung (yang sudah masuk tetap bisa).' }) : el('span'),
          el('span', { class: 'label-kecil', text: 'Pengumuman ke layar siswa' }),
          el('div', { class: 'row-tombol', children: PENGUMUMAN_CEPAT.map((teks) => tombolKendali(teks, () => void kendali('umum', { teks }))) }),
          el('div', {
            class: 'row-tombol',
            children: [isiUmum, tombolKendali('📢 Kirim', () => { const teks = isiUmum.value.trim(); if (teks) void kendali('umum', { teks }).then((ok) => { if (ok) isiUmum.value = ''; }); })],
          }),
          tombolKendali('🏁 Akhiri sesi', () => {
            const nilai = st.siswa.map((s) => s.progress.nilai?.akhir).filter((n): n is number => n !== undefined);
            const rata = nilai.length ? Math.round(nilai.reduce((x, y) => x + y, 0) / nilai.length) : 0;
            const belum = st.siswa.filter((s) => balaiBelumTuntas(s.progress, kkm).length > 0).length;
            const ringkasan = `${st.siswa.length} siswa · rata-rata nilai akhir ${rata} · ${belum} siswa punya balai belum tuntas (KKM ${kkm}).`;
            if (!window.confirm(`Akhiri sesi?
${ringkasan}
CSV kelas diunduh otomatis. Semua siswa dilepas dan data di server dihapus.`)) return;
            const snapshot = st.siswa;
            const tokenAkhir = st.token ?? '';
            void kendali('akhiri').then((ok) => {
              if (!ok) return;
              if (snapshot.length) eksporCsv(snapshot, tokenAkhir);
              window.clearInterval(st.timer);
              st.token = null;
              st.kunci = null;
              st.siswa = [];
              hapusTokenGuru();
              hapusSimpanan(KUNCI_RAHASIA);
              hapusSimpanan(KUNCI_SALINAN);
              showToast('Sesi diakhiri. CSV kelas sudah diunduh.');
              gambar();
            });
          }, 'ghost'),
        ],
      }),
    );

    const ringkas = ringkasKelas(st.siswa);
    anak.push(
      el('div', {
        class: 'ringkas-kelas',
        children: [
          chipRingkas('👥 Siswa', `${st.siswa.length}`),
          chipRingkas('🟢 Online', `${st.siswa.filter((s) => s.online).length}`),
          chipRingkas('⭐ Bintang', `${ringkas.totalBintang}`),
          chipRingkas('🎯 Benar', `${ringkas.persenBenar}%`),
        ],
      }),
    );

    const inputKkm = el('input', {
      class: 'isian',
      attrs: { type: 'number', min: '1', max: '100', value: String(kkm), 'aria-label': 'KKM', style: 'width:5rem' },
    });
    inputKkm.addEventListener('change', () => {
      const n = Math.round(Number(inputKkm.value));
      kkm = n >= 1 && n <= 100 ? n : KKM_BAWAAN;
      try {
        localStorage.setItem(KUNCI_KKM, String(kkm));
      } catch {
        /* abaikan */
      }
      gambar();
    });
    anak.push(
      el('div', {
        class: 'card',
        children: [
          el('span', { class: 'label-kecil', text: 'KKM (batas tuntas, 1–100)' }),
          inputKkm,
          el('p', { class: 'muted kecil-teks', text: 'Nilai resmi = percobaan pertama. Jawaban benar di kesempatan ke-2 dan ke-3 hanya dihitung separuh dan seperempat. Latihan ulang tidak mengubah nilai.' }),
        ],
      }),
    );

    anak.push(
      el('div', {
        class: 'row-tombol',
        children: [
          el('button', {
            class: 'btn kecil secondary',
            text: '⬇️ CSV Kelas',
            attrs: { type: 'button' },
            on: { click: () => { sfx.click(); eksporCsv(st.siswa, st.token ?? ''); } },
          }),
          el('button', {
            class: 'btn kecil secondary',
            text: '⬇️ CSV Jawaban',
            attrs: { type: 'button' },
            on: { click: () => { sfx.click(); eksporCsvJawaban(st.siswa, st.token ?? ''); } },
          }),
        ],
      }),
    );

    if (st.siswa.length === 0) {
      anak.push(
        el('p', {
          class: 'muted center-text',
          text: 'Belum ada siswa yang join. Mintalah siswa memasukkan token di atas.',
        }),
      );
    } else {
      const tabTombol = (id: StateGuru['tab'], label: string): HTMLElement =>
        el('button', {
          class: `guru-tab ${st.tab === id ? 'aktif' : ''}`,
          text: label,
          attrs: { type: 'button', 'aria-pressed': st.tab === id ? 'true' : 'false' },
          on: { click: () => { sfx.click(); st.tab = id; gambar(); } },
        });
      anak.push(el('div', { class: 'guru-tabs', children: [tabTombol('kelas', '📊 Kelas'), tabTombol('soal', '❓ Soal'), tabTombol('siswa', '🧒 Siswa')] }));
      const perhatian = st.siswa.filter((s) => URUTAN_BALAI.some((k) => statusBalai(s.progress, k) === 'bantuan') || balaiBelumTuntas(s.progress, kkm).length > 0);
      if (st.tab === 'kelas' && perhatian.length) {
        anak.push(
          el('div', {
            class: 'card warn',
            children: [
              el('span', { class: 'label-kecil', text: `🆘 Perlu perhatian (${perhatian.length})` }),
              ...perhatian.map((s) =>
                el('button', {
                  class: 'btn kecil ghost block',
                  text: `${s.nama} · ${s.online ? 'online' : 'offline'} · ${URUTAN_BALAI.filter((k) => statusBalai(s.progress, k) === 'bantuan').length} balai butuh bantuan, ${balaiBelumTuntas(s.progress, kkm).length} belum tuntas`,
                  attrs: { type: 'button' },
                  on: { click: () => { sfx.click(); st.tab = 'siswa'; st.dipilih = s.id; gambar(); } },
                }),
              ),
            ],
          }),
        );
      }
      if (st.tab === 'kelas') anak.push(...tabKelas(st.siswa));
      else if (st.tab === 'soal') anak.push(...tabSoal(st.siswa));
      else {
        const pilih = st.siswa.find((x) => x.id === st.dipilih);
        if (pilih) {
          anak.push(
            el('button', { class: 'btn kecil ghost', text: '← Semua siswa', attrs: { type: 'button' }, on: { click: () => { st.dipilih = null; gambar(); } } }),
            detailSiswa(pilih, {
              ubahNama: () => {
                const nama = window.prompt('Nama baru untuk siswa ini:', pilih.nama)?.trim();
                if (nama && nama.length >= 2) void kendali('nama', { id: pilih.id, nama });
              },
              keluarkan: () => {
                if (!window.confirm(`Keluarkan ${pilih.nama} dari kelas? Siswa ini tidak bisa bergabung lagi.`)) return;
                void kendali('keluarkan', { id: pilih.id }).then((ok) => { if (ok) { st.dipilih = null; gambar(); } });
              },
            }),
          );
        } else {
          const daftar = el('div', { class: 'daftar-siswa' });
          for (const s of st.siswa) {
            const k = kartuSiswa(s);
            k.setAttribute('role', 'button');
            k.setAttribute('tabindex', '0');
            k.addEventListener('click', () => { st.dipilih = s.id; gambar(); });
            daftar.append(k);
          }
          anak.push(el('p', { class: 'muted kecil-teks', text: 'Ketuk nama siswa untuk melihat detail dan rekomendasi.' }), daftar);
        }
      }
    }

    anak.push(el('div', { class: 'stack', children: [kembali] }));
    return anak;
  }

  if (st.token) mulaiPolling();
  gambar();
  return root;
}

/* ------------------------------------------------------------------ */
/* Bantuan tampilan                                                    */
/* ------------------------------------------------------------------ */

function headerGuru(): HTMLElement {
  return el('header', {
    class: 'hero guru-hero',
    children: [
      el('div', { class: 'emoji', text: '👩‍🏫' }),
      el('h1', { class: 'cover-judul', text: 'Mode Guru' }),
      el('p', { class: 'subjudul', text: 'Pantau hasil belajar siswa di Survival Sains' }),
    ],
  });
}

function chipRingkas(label: string, nilai: string): HTMLElement {
  return el('div', {
    class: 'chip-guru',
    children: [el('span', { class: 'nilai', text: nilai }), el('span', { class: 'label', text: label })],
  });
}

function kartuSiswa(s: RosterSiswa): HTMLElement {
  const p = s.progress;
  const bintang = Object.values(p.bintang ?? {}).reduce<number>((a, b) => a + b, 0);
  const persen = p.totalSoal > 0 ? Math.round((p.totalBenar / p.totalSoal) * 100) : 0;
  const salah = p.soalSalah?.length ?? 0;

  return el('div', {
    class: `kartu-siswa ${s.online ? 'online' : ''}`,
    children: [
      el('div', {
        class: 'kepala-siswa',
        children: [
          el('span', { class: 'dot-status', attrs: { 'aria-hidden': 'true' } }),
          el('span', { class: 'nama-siswa', text: s.nama }),
          el('span', { class: 'muted kecil-teks', text: s.gender === 'perempuan' ? '👧' : '👦' }),
        ],
      }),
      el('div', {
        class: 'baris-stat',
        children: [
          el('span', { text: `📍 ${p.noktah ? (CERITA.find((c) => c.kode === p.noktah)?.tempat ?? p.noktah) : 'peta'}` }),
          el('span', { text: `🎒 ${p.alat ?? 0}/11` }),
          el('span', { text: `⭐ ${bintang}` }),
          el('span', { text: `🎯 ${persen}%` }),
          el('span', { text: `❌ ${salah}` }),
          el('span', { text: `📝 ${p.nilai ? p.nilai.akhir : '-'}` }),
          ...(balaiBelumTuntas(p, kkm).length ? [el('span', { class: 'miskonsepsi', text: `⚠️ ${balaiBelumTuntas(p, kkm).length} belum tuntas` })] : []),
        ],
      }),
    ],
  });
}

function ringkasKelas(siswa: RosterSiswa[]): { totalBintang: number; persenBenar: number } {
  let totalBintang = 0;
  let benar = 0;
  let soal = 0;
  for (const s of siswa) {
    totalBintang += Object.values(s.progress.bintang ?? {}).reduce<number>((a, b) => a + b, 0);
    benar += s.progress.totalBenar ?? 0;
    soal += s.progress.totalSoal ?? 0;
  }
  return { totalBintang, persenBenar: soal > 0 ? Math.round((benar / soal) * 100) : 0 };
}

/* ------------------------------------------------------------------ */
/* Tab analisis                                                        */
/* ------------------------------------------------------------------ */

function tabKelas(siswa: RosterSiswa[]): HTMLElement[] {
  const kepala = el('tr', {
    children: [el('th', { text: 'Siswa' }), ...URUTAN_BALAI.map((k) => el('th', { text: String(CERITA.find((c) => c.kode === k)?.urutan ?? k), attrs: { title: k } }))],
  });
  const baris = siswa.map((s) =>
    el('tr', {
      children: [
        el('td', { class: 'nama-sel', text: s.nama }),
        ...URUTAN_BALAI.map((k) => {
          const st = statusBalai(s.progress, k);
          return el('td', { class: `sel-${st}`, text: LABEL_STATUS[st].ikon, attrs: { title: `${k}: ${LABEL_STATUS[st].teks}` } });
        }),
      ],
    }),
  );
  const tabel = el('div', { class: 'tabel-gulir', children: [el('table', { class: 'matriks', children: [el('thead', { children: [kepala] }), el('tbody', { children: baris })] })] });
  const legenda = el('p', {
    class: 'muted kecil-teks',
    text: Object.values(LABEL_STATUS).map((l) => `${l.ikon} ${l.teks}`).join(' · '),
  });
  const materi = statistikMateri(siswa).map((m) =>
    el('div', {
      class: 'bar-materi',
      children: [
        el('span', { class: 'bar-label', text: m.judul }),
        el('span', { class: 'bar-isi', children: [el('span', { attrs: { style: `width:${m.persenBenar}%` } })] }),
        el('span', { class: 'bar-nilai', text: m.dijawab > 0 ? `${m.persenBenar}% · ${m.lulus} lulus` : '-' }),
      ],
    }),
  );
  return [
    el('div', { class: 'card', children: [el('span', { class: 'label-kecil', text: 'Kemajuan siswa per balai (urut bab)' }), tabel, legenda] }),
    el('div', { class: 'card', children: [el('span', { class: 'label-kecil', text: 'Persen benar kelas per bab' }), ...materi] }),
  ];
}

function tabSoal(siswa: RosterSiswa[]): HTMLElement[] {
  const daftar = statistikSoal(siswa, getQuestionBank()).slice(0, 15);
  if (daftar.length === 0) return [el('p', { class: 'muted center-text', text: 'Belum ada jawaban masuk.' })];
  return [
    el('p', { class: 'muted kecil-teks', text: 'Diurutkan dari soal yang paling jarang dijawab benar pada percobaan pertama.' }),
    ...daftar.map((q) =>
      el('div', {
        class: 'card soal-guru',
        children: [
          el('div', {
            class: 'baris-stat',
            children: [
              el('span', { class: 'chip', text: q.kode }),
              el('span', { text: `🎯 ${q.persenBenarPertama}% benar langsung` }),
              el('span', { text: `❤️ ${q.rataPercobaan} percobaan` }),
              el('span', { text: `👥 ${q.dijawab}` }),
            ],
          }),
          el('p', { text: q.prompt }),
          q.salahTerbanyak
            ? el('p', { class: 'miskonsepsi', text: `⚠️ ${q.salahTerbanyak.persen}% sempat memilih "${q.salahTerbanyak.teks}"` })
            : el('p', { class: 'muted kecil-teks', text: 'Tidak ada pilihan salah yang menonjol.' }),
          el('p', { class: 'muted kecil-teks', text: `Indikator: ${q.indikator}` }),
        ],
      }),
    ),
  ];
}

function detailSiswa(s: RosterSiswa, aksi: { ubahNama: () => void; keluarkan: () => void }): HTMLElement {
  const p = s.progress;
  const baris = URUTAN_BALAI.map((k) => {
    const c = CERITA.find((x) => x.kode === k);
    const jawab = (p.jawaban ?? []).filter((j) => j.k === k && !j.q.startsWith('final'));
    const st = statusBalai(p, k);
    return el('tr', {
      children: [
        el('td', { text: `${c?.urutan}. ${c?.judulBab ?? k}` }),
        el('td', { text: LABEL_STATUS[st].ikon }),
        el('td', { text: '⭐'.repeat(p.bintang?.[k] ?? 0) || '-' }),
        el('td', { text: persenBalai(p, k) === null ? '-' : `${persenBalai(p, k)}${(persenBalai(p, k) ?? 100) < kkm ? ' ⚠️' : ''}` }),
        el('td', { text: p.bacaan?.[k] ? `${Math.round(p.bacaan[k]?.detik ?? 0)} dtk` : '-' }),
        el('td', { text: jawab.length ? `${jawab.filter((j) => j.b).length}/${jawab.length}` : '-' }),
      ],
    });
  });
  const tabel = el('div', {
    class: 'tabel-gulir',
    children: [
      el('table', {
        class: 'matriks detail',
        children: [
          el('thead', { children: [el('tr', { children: ['Bab', 'Status', 'Bintang', 'Nilai awal', 'Baca', 'Benar'].map((h) => el('th', { text: h })) })] }),
          el('tbody', { children: baris }),
        ],
      }),
    ],
  });
  const final = (p.finalBagian ?? []).reduce((a, b) => a + b, 0);
  return el('div', {
    class: 'card',
    children: [
      el('h3', { text: `${s.gender === 'perempuan' ? '👧' : '👦'} ${s.nama}` }),
      el('p', { class: 'muted', text: `Nilai akhir ${p.nilai?.akhir ?? '-'} (KKM ${kkm}) · Alat ${p.alat ?? 0}/11 · Final terbaik ${final}/30 · Final nilai awal ${p.nilai?.final ?? '-'}/30 · ${p.puncakLulus ? 'Mercusuar menyala ✅' : 'Belum lulus Final'}` }),
      tabel,
      el('div', {
        class: 'row-tombol',
        children: [
          el('button', { class: 'btn kecil secondary', text: '✏️ Ubah nama', attrs: { type: 'button' }, on: { click: aksi.ubahNama } }),
          el('button', { class: 'btn kecil ghost', text: '🚪 Keluarkan', attrs: { type: 'button' }, on: { click: aksi.keluarkan } }),
        ],
      }),
      el('span', { class: 'label-kecil', text: '💡 Rekomendasi' }),
      el('ul', { class: 'tujuan', children: rekomendasi(p).map((r) => el('li', { text: r })) }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Token guru (disimpan di perangkat guru)                             */
/* ------------------------------------------------------------------ */

function bacaSimpanan(kunci: string): string | null {
  try {
    return localStorage.getItem(kunci);
  } catch {
    return null;
  }
}

function simpanSimpanan(kunci: string, nilai: string): void {
  try {
    localStorage.setItem(kunci, nilai);
  } catch {
    /* abaikan */
  }
}

function hapusSimpanan(kunci: string): void {
  try {
    localStorage.removeItem(kunci);
  } catch {
    /* abaikan */
  }
}

function bacaSalinan(): RosterSiswa[] {
  try {
    const data = JSON.parse(bacaSimpanan(KUNCI_SALINAN) ?? '[]') as unknown;
    return Array.isArray(data) ? (data as RosterSiswa[]) : [];
  } catch {
    return [];
  }
}

function bacaTokenGuru(): string | null {
  try {
    return localStorage.getItem(KUNCI_TOKEN);
  } catch {
    return null;
  }
}

function simpanTokenGuru(token: string): void {
  try {
    localStorage.setItem(KUNCI_TOKEN, token);
  } catch {
    /* abaikan */
  }
}

function hapusTokenGuru(): void {
  try {
    localStorage.removeItem(KUNCI_TOKEN);
  } catch {
    /* abaikan */
  }
}

/* ------------------------------------------------------------------ */
/* Ekspor CSV                                                          */
/* ------------------------------------------------------------------ */

function eksporCsv(siswa: RosterSiswa[], token: string): void {
  const kepala = ['nama', 'gender', 'online', 'posisi', 'alat', 'total_bintang', 'total_benar', 'total_soal', 'persen_benar', 'jumlah_salah', 'final_benar', 'final_lulus', 'nilai_akhir', 'final_nilai_awal', 'kkm', 'balai_belum_tuntas', 'terakhir_dilihat', ...kepalaCsvBalai()];
  const baris = siswa.map((s) => {
    const p = s.progress;
    const bintang = Object.values(p.bintang ?? {}).reduce<number>((a, b) => a + b, 0);
    const persen = p.totalSoal > 0 ? Math.round((p.totalBenar / p.totalSoal) * 100) : 0;
    return [
      s.nama,
      s.gender,
      s.online ? 'ya' : 'tidak',
      p.noktah ?? 'peta',
      String(p.alat ?? 0),
      String(bintang),
      String(p.totalBenar ?? 0),
      String(p.totalSoal ?? 0),
      String(persen),
      String(p.soalSalah?.length ?? 0),
      String((p.finalBagian ?? []).reduce((a, b) => a + b, 0)),
      p.puncakLulus ? 'ya' : 'tidak',
      p.nilai ? String(p.nilai.akhir) : '',
      p.nilai?.final == null ? '' : String(p.nilai.final),
      String(kkm),
      balaiBelumTuntas(p, kkm).join(' '),
      s.lastSeen,
      ...barisCsvSiswa(s),
    ];
  });
  unduhCsv([kepala, ...baris], `progres-kelas-${token}-${new Date().toISOString().slice(0, 10)}.csv`);
}

/** Satu baris per jawaban siswa: cocok untuk analisis butir soal. */
function eksporCsvJawaban(siswa: RosterSiswa[], token: string): void {
  const bank = getQuestionBank();
  const kepala = ['nama', 'id_soal', 'kode_materi', 'indikator', 'level_kognitif', 'benar', 'percobaan', 'pilihan_berurutan', 'kunci'];
  const baris: string[][] = [];
  for (const s of siswa) {
    for (const j of s.progress.jawaban ?? []) {
      const q = bank.find((x) => x.id === j.q);
      baris.push([s.nama, j.q, j.k, q?.meta.indikator ?? '', q?.meta.levelKognitif ?? '', j.b ? 'ya' : 'tidak', String(j.n), j.p.join(' | '), String(q?.answer ?? '')]);
    }
  }
  unduhCsv([kepala, ...baris], `jawaban-kelas-${token}-${new Date().toISOString().slice(0, 10)}.csv`);
}

function unduhCsv(data: string[][], namaBerkas: string): void {
  const csv = data.map((r) => r.map(selCsv).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaBerkas;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function selCsv(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
