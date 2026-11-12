import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { APP_INFO } from '../../core/state';
import { showDialog, showToast } from '../dialog';
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
  sebaranPerjalanan,
} from '../../core/analisis';
import { putarPanduan, type LangkahPanduan } from '../panduan';
import { kabarBaik, layarProyektor, type KabarKelas } from './proyektor';
import type { ScreenContext } from './context';
import { buatKelasContoh, type KelasContoh } from './kelasContoh';

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
const KUNCI_TUR = 'survival-sains:tur-guru';

/** Pengenalan layar awal Mode Guru. */
const LANGKAH_AWAL: LangkahPanduan[] = [
  { teks: '👋 Selamat datang di Mode Guru! Di sini guru memantau hasil belajar siswa yang bermain Survival Sains dalam satu kelas.' },
  { target: '.tombol-buat-sesi', teks: 'Buat sesi kelas untuk mendapatkan token 4 digit. Siswa memasukkan token ini di HP saat memilih mode kelas.' },
  { target: '.tombol-contoh', teks: 'Belum ada siswa? Buka Kelas Contoh: 31 siswa uji coba untuk mencoba semua fitur dasbor. Juri bisa mulai dari sini.' },
  { target: '.guru-pojok', teks: '❓ membuka panduan ini lagi. 🏝️ membuka halaman game siswa.' },
];

/** Pengenalan dasbor: data, tombol, dan alur tab. */
const LANGKAH_DASBOR: LangkahPanduan[] = [
  { target: '.token-card', teks: 'Token kelas. Bagikan ke siswa, atau tampilkan di layar kelas lewat 📽️ Proyektor (ada kode QR dan papan peringkat).' },
  { target: '.kartu-kendali', teks: 'Kendali kelas: kunci kelas agar siswa baru tidak bisa masuk, jeda semua layar siswa, dan kirim pengumuman singkat.' },
  { target: '.ringkas-kelas', teks: 'Ringkasan kelas: jumlah siswa, yang online, total bintang, dan persen jawaban benar. Diperbarui otomatis tiap 3 detik.' },
  { target: '.kartu-kkm', teks: 'KKM adalah batas tuntas. Nilai resmi diambil dari percobaan pertama; balai di bawah KKM ditandai belum tuntas.' },
  { target: '.tombol-csv', teks: 'Unduh CSV Kelas (nilai per balai tiap siswa) atau CSV Jawaban (setiap jawaban) untuk diolah di Excel.' },
  { target: '.guru-tabs', teks: 'Tiga tab: 📊 Kelas (perjalanan dan kemajuan per bab), ❓ Soal (soal tersulit dan miskonsepsi), 🧒 Siswa (detail dan rekomendasi tiap anak).' },
  { target: '.kartu-perhatian', teks: 'Perlu perhatian: siswa yang butuh bantuan atau belum tuntas, beserta bab-nya. Ketuk barisnya untuk membuka detail siswa.' },
  { target: '.kartu-perjalanan', teks: 'Perjalanan siswa: berapa siswa yang sedang berada di tiap bab. Ketuk batangnya untuk melihat nama siswanya.' },
  { target: '.matriks-kemajuan', teks: 'Tabel kemajuan: satu baris per siswa, satu kolom per bab. Ketuk ikon di tabel untuk melihat keterangannya.' },
];

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
  /** Kelas contoh (data uj, tanpa server); null = sesi asli. */
  contoh: KelasContoh | null;
  /** Waktu siswa contoh terakhir maju. */
  majuPada: number;
  /** Daftar "Perlu perhatian" dibuka semua (bukan 5 teratas). */
  perhatianSemua: boolean;
  /** Bab yang batangnya diketuk di diagram perjalanan. */
  babTerbuka: string | null;
  /** Panduan sedang diputar: dasbor tidak digambar ulang. */
  tur: boolean;
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
    contoh: null,
    majuPada: 0,
    perhatianSemua: false,
    babTerbuka: null,
    tur: false,
  };

  const root = el('section', { class: 'screen' });
  const panel = el('div', { class: 'guru-panel' });
  root.append(panel);

  const kembali = el('button', {
    class: 'btn kecil ghost',
    text: '🏝️',
    attrs: { type: 'button', 'aria-label': 'Buka Halaman Siswa', title: 'Buka Halaman Siswa' },
    on: {
      click: () => {
        sfx.click();
        const { root: dialog } = showDialog({
          tokoh: 'Buka Halaman Siswa?',
          ikon: '🏝️',
          teks: st.token && !st.contoh
            ? 'Dasbor guru akan ditutup. Sesi kelas tetap berjalan dan bisa dibuka lagi lewat Mode Guru di browser ini.'
            : 'Dasbor guru akan ditutup dan kamu pindah ke halaman game siswa.',
          aksi: '🏝️ Ya, buka halaman siswa',
          onBatal: () => sfx.click(),
          onAksi: () => {
            st.jalan = false;
            window.clearInterval(st.timer);
            // Mode Guru punya alamat sendiri: kembali ke alamat game siswa (tanpa /modeguru, ?mode=guru).
            const akar = window.location.pathname.replace(/modeguru\/?$/i, '');
            window.location.href = akar || './';
          },
        });
        document.body.append(dialog);
      },
    },
  });

  const pojok = el('div', {
    class: 'guru-pojok',
    children: [
      el('button', {
        class: 'btn kecil ghost',
        text: '❓',
        attrs: { type: 'button', 'aria-label': 'Panduan Mode Guru', title: 'Panduan Mode Guru' },
        on: { click: () => { sfx.click(); turGuru(st.token && st.siswa.length ? 'dasbor' : 'awal'); } },
      }),
      kembali,
    ],
  });
  root.append(pojok);

  function turGuru(jenis: 'awal' | 'dasbor'): void {
    if (st.tur) return;
    st.tur = true;
    if (jenis === 'dasbor') {
      st.tab = 'kelas';
      st.dipilih = null;
      gambar();
    }
    void putarPanduan(jenis === 'awal' ? LANGKAH_AWAL : LANGKAH_DASBOR).then(() => {
      st.tur = false;
      segarkan();
    });
  }

  /** Panduan otomatis sekali: layar awal, lalu dasbor saat pertama terisi. */
  function turOtomatis(): void {
    const jenis = !st.token ? 'awal' : st.siswa.length && !st.proyektor ? 'dasbor' : null;
    if (!jenis || st.tur || bacaSimpanan(`${KUNCI_TUR}-${jenis}`)) return;
    simpanSimpanan(`${KUNCI_TUR}-${jenis}`, '1');
    window.setTimeout(() => turGuru(jenis), 400);
  }

  function segarkan(): void {
    if (!st.jalan || st.tur) return;
    if (st.contoh) {
      // Kelas contoh terasa hidup: tiap ~8 detik satu siswa maju.
      if (Date.now() - st.majuPada >= 8000) {
        st.contoh.majukan();
        st.majuPada = Date.now();
      }
      const baru = st.contoh.siswa();
      st.kabar = [...st.kabar.filter((k) => k.sampai > Date.now()), ...kabarBaik(st.siswa, baru)].slice(-6);
      st.siswa = baru;
      gambar();
      return;
    }
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

  function mulaiContoh(): void {
    st.contoh = buatKelasContoh();
    st.token = '1234';
    st.kunci = null;
    st.siswa = st.contoh.siswa();
    st.majuPada = Date.now();
    st.tab = 'kelas';
    st.dipilih = null;
    gambar();
    mulaiPolling();
  }

  function keluarContoh(): void {
    window.clearInterval(st.timer);
    Object.assign(st, { contoh: null, token: null, siswa: [], terkunci: false, jeda: false, kabar: [], dipilih: null, proyektor: false });
    gambar();
  }

  const tombolContoh = el('button', {
    class: 'btn secondary block tombol-contoh',
    text: '👀 Lihat Contoh Kelas',
    attrs: { type: 'button' },
    on: { click: () => { sfx.click(); mulaiContoh(); } },
  });

  function gambar(): void {
    const potong = panel.scrollTop;
    panel.replaceChildren(...isiPanel());
    panel.scrollTop = potong;
    pojok.hidden = st.proyektor;
    turOtomatis();
  }

  function isiPanel(): HTMLElement[] {
    if (!onlineTersedia() && !st.contoh) {
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
        el('div', { class: 'stack', children: [tombolContoh] }),
      ];
    }

    if (!st.token) {
      const inputGuru = el('input', {
        class: 'isian',
        attrs: { type: 'text', placeholder: 'Nama guru (mis. Bu Rosy)', value: st.guru, maxlength: '30' },
      });
      const buat = el('button', {
        class: 'btn block tombol-buat-sesi',
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
        el('p', { class: 'muted kecil-teks center-text', text: 'Ingin melihat dasbor terisi dulu? Buka kelas contoh berisi 31 siswa uji coba.' }),
        el('div', { class: 'stack', children: [buat, tombolContoh] }),
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
      ...(st.contoh
        ? [
            el('div', {
              class: 'card warn',
              children: [
                el('span', { class: 'label-kecil', text: '🧪 MODE CONTOH' }),
                el('p', { text: 'Data uji coba 31 siswa untuk melihat cara kerja dasbor. Tidak tersimpan dan tidak dikirim ke server. Tombol kendali bisa dicoba.' }),
              ],
            }),
          ]
        : []),
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
                text: st.contoh ? '🚪 Keluar dari Contoh' : '🔄 Ganti Sesi',
                attrs: { type: 'button' },
                on: {
                  click: () => {
                    sfx.click();
                    if (st.contoh) return keluarContoh();
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
      if (st.contoh) {
        // Kelas contoh: kendali hanya mengubah layar ini.
        if (aksi === 'kunci') st.terkunci = !!data.nilai;
        else if (aksi === 'jeda') st.jeda = !!data.nilai;
        else if (aksi === 'umum') showToast(`📢 Terkirim (contoh): ${data.teks ?? ''}`);
        else if (aksi === 'nama' && data.id && data.nama) st.contoh.ubahNama(data.id, data.nama);
        else if (aksi === 'keluarkan' && data.id) st.contoh.keluarkan(data.id);
        if (aksi !== 'akhiri') segarkan();
        return true;
      }
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
        class: 'card kartu-kendali',
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
              st.contoh = null;
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
        class: 'card kartu-kkm',
        children: [
          el('span', { class: 'label-kecil', text: 'KKM (batas tuntas, 1–100)' }),
          inputKkm,
          el('p', { class: 'muted kecil-teks', text: 'Nilai resmi = percobaan pertama. Jawaban benar di kesempatan ke-2 dan ke-3 hanya dihitung separuh dan seperempat. Latihan ulang tidak mengubah nilai.' }),
        ],
      }),
    );

    anak.push(
      el('div', {
        class: 'row-tombol tombol-csv',
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
        const babDari = (k: string): string => CERITA.find((c) => c.kode === k)?.bab ?? k;
        const baris = (st.perhatianSemua ? perhatian : perhatian.slice(0, 5)).map((s, i) => {
          const buka = (): void => { sfx.click(); st.tab = 'siswa'; st.dipilih = s.id; gambar(); };
          return el('tr', {
            attrs: { role: 'button', tabindex: '0' },
            on: { click: buka, keydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); buka(); } } },
            children: [
              el('td', { text: String(i + 1) }),
              el('td', { class: 'nama-sel', text: s.nama }),
              el('td', { text: s.online ? '🟢 online' : '⚪ offline' }),
              el('td', { text: URUTAN_BALAI.filter((k) => statusBalai(s.progress, k) === 'bantuan').map(babDari).join(', ') || '-' }),
              el('td', { text: balaiBelumTuntas(s.progress, kkm).map(babDari).join(', ') || '-' }),
            ],
          });
        });
        anak.push(
          el('div', {
            class: 'card warn kartu-perhatian',
            children: [
              el('span', { class: 'label-kecil', text: `🆘 Perlu perhatian (${perhatian.length})` }),
              el('div', {
                class: 'tabel-gulir',
                children: [
                  el('table', {
                    class: 'matriks tabel-perhatian',
                    children: [
                      el('thead', { children: [el('tr', { children: ['No', 'Nama', 'Status', '🆘 Butuh bantuan', `⚠️ Belum tuntas (KKM ${kkm})`].map((h) => el('th', { text: h })) })] }),
                      el('tbody', { children: baris }),
                    ],
                  }),
                ],
              }),
              ...(perhatian.length > 5
                ? [el('button', {
                    class: 'btn kecil ghost',
                    text: st.perhatianSemua ? 'Tampilkan 5 saja' : `Lihat semua (${perhatian.length})`,
                    attrs: { type: 'button' },
                    on: { click: () => { sfx.click(); st.perhatianSemua = !st.perhatianSemua; gambar(); } },
                  })]
                : []),
            ],
          }),
        );
      }
      if (st.tab === 'kelas') {
        anak.push(...tabKelas(st.siswa, { babTerbuka: st.babTerbuka, pilihBab: (k) => { sfx.click(); st.babTerbuka = st.babTerbuka === k ? null : k; gambar(); } }));
      }
      else if (st.tab === 'soal') anak.push(...tabSoal(st.siswa));
      else {
        const pilih = st.siswa.find((x) => x.id === st.dipilih);
        if (pilih) {
          anak.push(
            el('button', { class: 'btn kecil secondary', text: '← Semua siswa', attrs: { type: 'button' }, on: { click: () => { st.dipilih = null; gambar(); } } }),
            detailSiswa(pilih, {
              ubahNama: () => {
                const isian = el('input', { class: 'isian', attrs: { type: 'text', value: pilih.nama, maxlength: '24', 'aria-label': 'Nama baru', style: 'width:100%;margin:0 0 12px' } });
                const { root: dialog } = showDialog({
                  tokoh: 'Ubah nama siswa',
                  ikon: '✏️',
                  teks: `Nama baru untuk ${pilih.nama}:`,
                  aksi: '💾 Simpan',
                  onBatal: () => sfx.click(),
                  onAksi: () => {
                    sfx.click();
                    const nama = isian.value.trim();
                    if (nama.length < 2) showToast('Nama minimal 2 huruf.');
                    else if (nama !== pilih.nama) void kendali('nama', { id: pilih.id, nama });
                  },
                });
                dialog.querySelector('.dialog-text')?.after(isian);
                isian.addEventListener('keydown', (e) => { if (e.key === 'Enter') dialog.querySelector<HTMLButtonElement>('.stack .btn')?.click(); });
                document.body.append(dialog);
                isian.focus();
                isian.select();
              },
              keluarkan: () => {
                const { root: dialog } = showDialog({
                  tokoh: `Keluarkan ${pilih.nama}?`,
                  ikon: '🚫',
                  teks: 'Siswa ini dikeluarkan dari kelas dan tidak bisa bergabung lagi dengan token ini.',
                  aksi: '🚫 Ya, keluarkan',
                  onBatal: () => sfx.click(),
                  onAksi: () => {
                    sfx.click();
                    void kendali('keluarkan', { id: pilih.id }).then((ok) => { if (ok) { st.dipilih = null; gambar(); } });
                  },
                });
                document.body.append(dialog);
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

/** Keterangan kecil di dekat sel yang diketuk (title tidak muncul di layar sentuh). */
function tampilkanTip(sel: HTMLElement): void {
  document.querySelector('.tip-sel')?.remove();
  const r = sel.getBoundingClientRect();
  const tip = el('div', { class: 'tip-sel', text: sel.dataset.tip ?? '', attrs: { role: 'status' } });
  document.body.append(tip);
  tip.style.left = `${Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2))}px`;
  tip.style.top = `${Math.max(8, r.top - tip.offsetHeight - 6)}px`;
  window.setTimeout(() => tip.remove(), 2500);
}

function diagramPerjalanan(siswa: RosterSiswa[], opsi: { babTerbuka: string | null; pilihBab: (kode: string) => void }): HTMLElement {
  const sebaran = sebaranPerjalanan(siswa);
  const maks = Math.max(1, ...sebaran.map((b) => b.siswa.length));
  return el('div', {
    class: 'card kartu-perjalanan',
    children: [
      el('span', { class: 'label-kecil', text: '🧭 Perjalanan siswa (posisi sekarang per bab)' }),
      ...sebaran.flatMap((b) => {
        const buka = opsi.babTerbuka === b.kode;
        const baris = el('button', {
          class: `bar-materi bar-perjalanan ${buka ? 'aktif' : ''}`,
          attrs: { type: 'button', 'aria-expanded': String(buka) },
          on: { click: () => opsi.pilihBab(b.kode) },
          children: [
            el('span', { class: 'bar-label', text: b.label }),
            el('span', { class: 'bar-isi', children: [el('span', { attrs: { style: `width:${(b.siswa.length / maks) * 100}%` } })] }),
            el('span', { class: 'bar-nilai', text: `${b.siswa.length} siswa` }),
          ],
        });
        return buka ? [baris, el('p', { class: 'muted kecil-teks nama-perjalanan', text: b.siswa.join(', ') || 'Tidak ada siswa di sini.' })] : [baris];
      }),
    ],
  });
}

function tabKelas(siswa: RosterSiswa[], opsi: { babTerbuka: string | null; pilihBab: (kode: string) => void }): HTMLElement[] {
  const kepala = el('tr', {
    children: [el('th', { text: 'Siswa' }), ...URUTAN_BALAI.map((k) => el('th', { text: String(CERITA.find((c) => c.kode === k)?.urutan ?? k), attrs: { title: k } }))],
  });
  const baris = siswa.map((s) =>
    el('tr', {
      children: [
        el('td', { class: 'nama-sel', text: s.nama }),
        ...URUTAN_BALAI.map((k) => {
          const st = statusBalai(s.progress, k);
          const c = CERITA.find((x) => x.kode === k);
          const tip = `${s.nama} · ${c ? `${c.bab} ${c.judulBab}` : k}: ${LABEL_STATUS[st].teks}`;
          return el('td', { class: `sel-${st}`, text: LABEL_STATUS[st].ikon, attrs: { title: tip, 'data-tip': tip } });
        }),
      ],
    }),
  );
  const tabel = el('div', {
    class: 'tabel-gulir',
    on: { click: (e) => { const td = (e.target as HTMLElement).closest<HTMLElement>('td[data-tip]'); if (td) tampilkanTip(td); } },
    children: [el('table', { class: 'matriks matriks-kemajuan', children: [el('thead', { children: [kepala] }), el('tbody', { children: baris })] })] });
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
    diagramPerjalanan(siswa, opsi),
    el('div', { class: 'card', children: [el('span', { class: 'label-kecil', text: 'Kemajuan siswa per balai (urut bab)' }), el('p', { class: 'muted kecil-teks', text: '👆 Ketuk ikon untuk melihat keterangan.' }), tabel, legenda] }),
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
