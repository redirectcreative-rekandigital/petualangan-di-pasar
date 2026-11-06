import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { APP_INFO } from '../../core/state';
import { showToast } from '../dialog';
import { ambilSesiGuru, buatSesiGuru, onlineTersedia, type RosterSiswa } from '../../net/klien';
import type { ScreenContext } from './context';

/**
 * Halaman "Mode Guru": membuat ruang kelas (token 4 digit) dan memantau
 * progres tiap siswa yang join, lengkap dengan ekspor CSV untuk analisa.
 *
 * Halaman ini hanya berfungsi bila server online dikonfigurasi. Bila tidak,
 * ditampilkan petunjuk singkat.
 */

const KUNCI_TOKEN = 'petualangan-di-pasar:token-guru';

interface StateGuru {
  token: string | null;
  guru: string;
  siswa: RosterSiswa[];
  pesan: string | null;
  timer: number;
  jalan: boolean;
}

export function renderGuru(ctx: ScreenContext): HTMLElement {
  const st: StateGuru = {
    token: bacaTokenGuru(),
    guru: APP_INFO.pembuat,
    siswa: [],
    pesan: null,
    timer: 0,
    jalan: true,
  };

  const root = el('section', { class: 'screen' });
  const panel = el('div', { class: 'guru-panel' });
  root.append(panel);

  const kembali = el('button', {
    class: 'btn ghost block',
    text: '← Kembali ke Pembuka',
    attrs: { type: 'button' },
    on: {
      click: () => {
        sfx.click();
        st.jalan = false;
        window.clearInterval(st.timer);
        ctx.navigate('intro');
      },
    },
  });

  function segarkan(): void {
    if (!st.jalan) return;
    if (!st.token) return;
    void ambilSesiGuru(st.token).then((res) => {
      if (!st.jalan) return;
      if ('pesan' in res) {
        st.pesan = res.pesan;
        st.siswa = [];
      } else {
        st.pesan = null;
        st.siswa = res.siswa;
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
              simpanTokenGuru(res.token);
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
                class: 'btn kecil ghost',
                text: '🔄 Ganti Sesi',
                attrs: { type: 'button' },
                on: {
                  click: () => {
                    sfx.click();
                    window.clearInterval(st.timer);
                    st.token = null;
                    st.siswa = [];
                    hapusTokenGuru();
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

    anak.push(
      el('button', {
        class: 'btn kecil secondary',
        text: '⬇️ Ekspor CSV',
        attrs: { type: 'button' },
        on: {
          click: () => {
            sfx.click();
            eksporCsv(st.siswa, st.token ?? '');
          },
        },
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
      const daftar = el('div', { class: 'daftar-siswa' });
      for (const s of st.siswa) daftar.append(kartuSiswa(s));
      anak.push(daftar);
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
      el('p', { class: 'subjudul', text: 'Pantau progres siswa di kelasmu' }),
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
          el('span', { text: `📍 ${p.noktah ?? 'peta'}` }),
          el('span', { text: `⭐ ${bintang}` }),
          el('span', { text: `🎯 ${persen}%` }),
          el('span', { text: `❌ ${salah}` }),
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
/* Token guru (disimpan di perangkat guru)                             */
/* ------------------------------------------------------------------ */

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
  const kepala = ['nama', 'gender', 'online', 'noktah', 'total_bintang', 'total_benar', 'total_soal', 'persen_benar', 'jumlah_salah', 'puncak_lulus', 'terakhir_dilihat'];
  const baris = siswa.map((s) => {
    const p = s.progress;
    const bintang = Object.values(p.bintang ?? {}).reduce<number>((a, b) => a + b, 0);
    const persen = p.totalSoal > 0 ? Math.round((p.totalBenar / p.totalSoal) * 100) : 0;
    return [
      s.nama,
      s.gender,
      s.online ? 'ya' : 'tidak',
      p.noktah ?? 'peta',
      String(bintang),
      String(p.totalBenar ?? 0),
      String(p.totalSoal ?? 0),
      String(persen),
      String(p.soalSalah?.length ?? 0),
      p.puncakLulus ? 'ya' : 'tidak',
      s.lastSeen,
    ];
  });
  const csv = [kepala, ...baris].map((r) => r.map(selCsv).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `progres-kelas-${token}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function selCsv(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
