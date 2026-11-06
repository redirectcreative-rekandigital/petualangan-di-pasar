import { el } from './components/dom';
import { sfx } from '../core/sound';
import { ucapkan, berhenti } from '../core/suara';
import { renderDiagramMateri } from './components/diagramMateri';
import { getAdegan, type Adegan, type Interaksi, type Latar, type Sprite } from '../data/adegan';
import type { CeritaBalai } from '../data/cerita';
import { pasangGambar } from '../core/gambar';
import type { BalaiMeta } from '../../shared/types';

/**
 * Halaman Cerita: buku cerita bergerak berisi 4 adegan per materi, ditutup
 * halaman "Kunci Ingat" + diagram interaktif + materi lengkap.
 *
 * Mengembalikan Promise yang selesai saat siswa menutup buku, beserta lama
 * membaca (detik) dan apakah seluruh adegan sudah dilalui.
 */

export interface HasilBaca {
  detik: number;
  tamat: boolean;
}

const NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/* ------------------------------------------------------------------ */
/* Latar                                                               */
/* ------------------------------------------------------------------ */

const LATAR: Record<Latar, { atas: string; bawah: string; tanah?: string; hiasan?: (svg: SVGSVGElement) => void }> = {
  goa: {
    atas: '#1c1917',
    bawah: '#44403c',
    tanah: '#292524',
    hiasan: (svg) => {
      svg.append(svgEl('path', { d: 'M0 0 L0 60 Q40 40 70 70 L100 30 Q140 55 170 20 L210 50 Q250 25 280 55 L320 30 L320 0 Z', fill: '#0c0a09' }));
    },
  },
  lembah: { atas: '#c4b5fd', bawah: '#ede9fe', tanah: '#a78bfa' },
  hutan: {
    atas: '#86efac',
    bawah: '#dcfce7',
    tanah: '#4d7c0f',
  },
  ladang: { atas: '#fde68a', bawah: '#fef9c3', tanah: '#a3e635' },
  taman: { atas: '#fbcfe8', bawah: '#fdf2f8', tanah: '#86efac' },
  gundul: { atas: '#d6d3d1', bawah: '#f5f5f4', tanah: '#a16207' },
  bukit: { atas: '#fecaca', bawah: '#fff1f2', tanah: '#78716c' },
  sungai: {
    atas: '#bae6fd',
    bawah: '#f0f9ff',
    tanah: '#65a30d',
    hiasan: (svg) => {
      svg.append(svgEl('path', { d: 'M0 175 Q80 160 160 178 T320 172 L320 200 L0 200 Z', fill: '#38bdf8', opacity: 0.85 }));
    },
  },
  tebing: { atas: '#fed7aa', bawah: '#fff7ed', tanah: '#a8a29e' },
  langit: { atas: '#1e3a8a', bawah: '#7dd3fc' },
  laut: {
    atas: '#7dd3fc',
    bawah: '#e0f2fe',
    hiasan: (svg) => {
      svg.append(svgEl('path', { d: 'M0 150 Q40 140 80 152 T160 150 T240 152 T320 148 L320 200 L0 200 Z', fill: '#0284c7', opacity: 0.85 }));
    },
  },
  kamar: { atas: '#fef3c7', bawah: '#fffbeb', tanah: '#d6b48a' },
};

function gambarLatar(svg: SVGSVGElement, latar: Latar, id: string): void {
  const l = LATAR[latar];
  const defs = svgEl('defs', {});
  const grad = svgEl('linearGradient', { id: `lg-${id}`, x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.append(svgEl('stop', { offset: '0%', 'stop-color': l.atas }), svgEl('stop', { offset: '100%', 'stop-color': l.bawah }));
  defs.append(grad);
  svg.append(defs);
  svg.append(svgEl('rect', { x: 0, y: 0, width: 320, height: 200, fill: `url(#lg-${id})` }));
  if (l.tanah) svg.append(svgEl('rect', { x: 0, y: 178, width: 320, height: 22, fill: l.tanah }));
  l.hiasan?.(svg);
}

function gambarSprite(svg: SVGSVGElement, s: Sprite): void {
  const kelas = s.a ? `anim-${s.a}` : '';
  const gaya = s.d ? `animation-delay:${s.d}s` : '';
  if (s.t === 'garis') {
    const panjang = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    const garis = svgEl('line', {
      x1: s.x1,
      y1: s.y1,
      x2: s.x2,
      y2: s.y2,
      stroke: s.w ?? '#fde047',
      'stroke-width': s.tebal ?? 4,
      'stroke-linecap': 'round',
      opacity: 0.9,
      class: kelas,
      style: `--panjang:${panjang.toFixed(0)};${gaya}`,
    });
    svg.append(garis);
    return;
  }
  if (s.t === 'kotak') {
    svg.append(
      svgEl('rect', {
        x: s.x,
        y: s.y,
        width: s.lebar,
        height: s.tinggi,
        rx: s.r ?? 0,
        fill: s.w,
        class: kelas,
        style: gaya,
      }),
    );
    return;
  }
  if (s.t === 'label') {
    const t = svgEl('text', {
      x: s.x,
      y: s.y,
      'font-size': s.s ?? 11,
      'text-anchor': 'middle',
      'font-weight': 700,
      fill: s.w ?? '#0f172a',
      class: `cerita-label ${kelas}`,
      style: gaya,
    });
    t.textContent = s.teks;
    svg.append(t);
    return;
  }
  const g = svgEl('g', { class: kelas, style: `${gaya};transform-origin:${s.x}px ${s.y}px;transform-box:view-box` });
  const t = svgEl('text', {
    x: s.x,
    y: s.y,
    'font-size': s.s ?? 30,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
  });
  t.textContent = s.e;
  g.append(t);
  svg.append(g);
}

/** Menggambar satu adegan menjadi elemen SVG. */
export function gambarAdegan(adegan: Adegan, id: string): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 320 200', class: 'cerita-svg', role: 'img', 'aria-label': adegan.judul });
  gambarLatar(svg, adegan.latar, id);
  for (const s of adegan.sprite) gambarSprite(svg, s);
  return svg;
}

/* ------------------------------------------------------------------ */
/* Interaksi                                                           */
/* ------------------------------------------------------------------ */

function acak<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/** Membangun UI interaksi; memanggil `onTuntas` sekali saat semua benar. */
function bangunInteraksi(ia: Interaksi, onTuntas: (pesan: string) => void): HTMLElement {
  const wadah = el('div', { class: 'cerita-interaksi' });
  const soal = el('p', { class: 'cerita-soal', text: ia.soal });
  const umpan = el('p', { class: 'cerita-umpan', attrs: { 'aria-live': 'polite' } });
  wadah.append(soal);

  if (ia.jenis === 'kelompok') {
    const antrian = acak(ia.item);
    let posisi = 0;
    const kartu = el('div', { class: 'cerita-kartu' });
    const tombol = el('div', { class: 'cerita-kelompok' });
    const tampil = (): void => {
      const item = antrian[posisi];
      if (!item) {
        kartu.textContent = '✅';
        tombol.remove();
        onTuntas('Semua sudah dikelompokkan dengan benar!');
        return;
      }
      kartu.innerHTML = '';
      kartu.append(el('span', { class: 'cerita-kartu-emoji', text: item.e }), el('span', { class: 'cerita-kartu-nama', text: item.nama }));
      umpan.textContent = `${posisi + 1} dari ${antrian.length}`;
    };
    ia.kelompok.forEach((nama, k) => {
      const b = el('button', { class: 'btn secondary', text: nama, attrs: { type: 'button' } });
      b.addEventListener('click', () => {
        const item = antrian[posisi];
        if (!item) return;
        if (item.k === k) {
          sfx.correct();
          posisi++;
          kartu.classList.remove('goyang');
          tampil();
        } else {
          sfx.wrong();
          kartu.classList.remove('goyang');
          void kartu.offsetWidth;
          kartu.classList.add('goyang');
          umpan.textContent = `Coba lagi. ${item.nama} bukan ${nama.toLowerCase()}.`;
        }
      });
      tombol.append(b);
    });
    wadah.append(kartu, tombol, umpan);
    tampil();
    return wadah;
  }

  if (ia.jenis === 'urut') {
    const benar = ia.item.map((i) => i.nama);
    const susunan = el('div', { class: 'cerita-susunan' });
    const pilihan = el('div', { class: 'cerita-urut' });
    let langkah = 0;
    for (const item of acak(ia.item)) {
      const b = el('button', {
        class: 'cerita-urut-item',
        attrs: { type: 'button' },
        children: [el('span', { text: item.e }), el('span', { text: item.nama })],
      });
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (benar[langkah] === item.nama) {
          sfx.correct();
          b.disabled = true;
          b.classList.add('benar');
          susunan.append(el('span', { class: 'cerita-susunan-item', text: `${langkah > 0 ? '→ ' : ''}${item.e} ${item.nama}` }));
          langkah++;
          if (langkah === benar.length) onTuntas(ia.selesai);
          else umpan.textContent = 'Bagus! Lanjutkan.';
        } else {
          sfx.wrong();
          b.classList.remove('goyang');
          void b.offsetWidth;
          b.classList.add('goyang');
          umpan.textContent = 'Belum tepat. Pikirkan lagi urutannya.';
        }
      });
      pilihan.append(b);
    }
    wadah.append(susunan, pilihan, umpan);
    return wadah;
  }

  // jenis 'pilih'
  const daftar = el('div', { class: 'cerita-pilih' });
  for (const o of acak(ia.opsi)) {
    const b = el('button', { class: 'vn-pilihan jawab', text: o.teks, attrs: { type: 'button' } });
    b.addEventListener('click', () => {
      umpan.textContent = o.alasan;
      if (o.benar) {
        sfx.correct();
        b.classList.add('benar');
        daftar.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true));
        onTuntas(o.alasan);
      } else {
        sfx.wrong();
        b.classList.add('salah');
      }
    });
    daftar.append(b);
  }
  wadah.append(daftar, umpan);
  return wadah;
}

/* ------------------------------------------------------------------ */
/* Halaman Cerita                                                      */
/* ------------------------------------------------------------------ */

export interface OpsiHalaman {
  cerita: CeritaBalai;
  meta: BalaiMeta;
  /** Buka langsung pada adegan tertentu (mode "Ingat cerita"). */
  mulaiDari?: number;
  /** Mode ingat: hanya satu adegan, tombol "Kembali ke tantangan". */
  modeIngat?: boolean;
}

export function bukaHalamanCerita(host: HTMLElement, opsi: OpsiHalaman): Promise<HasilBaca> {
  const daftar = getAdegan(opsi.cerita.kode);
  const mulai = performance.now();
  let indeks = Math.max(0, Math.min(daftar.length, opsi.mulaiDari ?? 0));
  let tamat = false;
  const interaksiTuntas = new Set<number>();

  const root = el('div', { class: 'cerita-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
  const buku = el('div', { class: 'cerita-buku', attrs: { style: `--aksen:#${opsi.cerita.cantrik.warnaBaju.toString(16).padStart(6, '0')}` } });
  root.append(buku);
  host.append(root);

  return new Promise<HasilBaca>((resolve) => {
    const selesai = (): void => {
      berhenti();
      root.remove();
      resolve({ detik: (performance.now() - mulai) / 1000, tamat });
    };

    const kepala = (judul: string): HTMLElement => {
      const titik = el('div', { class: 'cerita-titik' });
      for (let i = 0; i <= daftar.length; i++) {
        titik.append(el('span', { class: i === indeks ? 'aktif' : i < indeks ? 'lewat' : '' }));
      }
      const potret = el('div', { class: 'cerita-potret', attrs: { 'aria-hidden': 'true' }, text: opsi.cerita.cantrik.ikon });
      pasangGambar(potret, opsi.cerita.cantrik.gambar, () => (potret.textContent = ''));
      return el('div', {
        class: 'cerita-kepala',
        children: [
          potret,
          el('div', {
            class: 'cerita-kepala-teks',
            children: [
              el('div', { class: 'cerita-bab', text: `📖 ${opsi.cerita.bab} · ${opsi.cerita.judulBab}` }),
              el('h2', { class: 'cerita-judul', text: judul }),
            ],
          }),
          opsi.modeIngat ? null : titik,
        ],
      });
    };

    const render = (): void => {
      berhenti();
      buku.innerHTML = '';
      buku.scrollTop = 0;
      if (indeks >= daftar.length) {
        renderPenutup();
        return;
      }
      const a = daftar[indeks] as Adegan;
      const svg = gambarAdegan(a, `${opsi.cerita.kode}-${indeks}`);
      const narasi = el('div', { class: 'cerita-narasi' });
      a.narasi.forEach((n, i) => narasi.append(el('p', { text: n, attrs: { 'data-i': String(i) } })));

      // Bacakan narasi berurutan, sorot paragraf yang sedang dibaca.
      const bacakan = (i: number): void => {
        const p = narasi.querySelector(`[data-i="${i}"]`);
        narasi.querySelectorAll('p').forEach((x) => x.classList.remove('dibaca'));
        if (!p) return;
        p.classList.add('dibaca');
        ucapkan(a.narasi[i] ?? '', {
          pitch: opsi.cerita.cantrik.suara.pitch,
          rate: opsi.cerita.cantrik.suara.rate * 0.95,
          onSelesai: () => {
            if (root.isConnected && daftar[indeks] === a) bacakan(i + 1);
          },
        });
      };

      const ulang = el('button', { class: 'btn kecil ghost', text: '🔊 Bacakan lagi', attrs: { type: 'button' } });
      ulang.addEventListener('click', () => bacakan(0));

      const kembali = el('button', {
        class: 'btn ghost',
        text: opsi.modeIngat ? '↩️ Kembali ke tantangan' : '◀ Sebelumnya',
        attrs: { type: 'button' },
      });
      kembali.disabled = !opsi.modeIngat && indeks === 0;
      kembali.addEventListener('click', () => {
        sfx.click();
        if (opsi.modeIngat) {
          selesai();
          return;
        }
        indeks = Math.max(0, indeks - 1);
        render();
      });

      const lanjut = el('button', { class: 'btn', text: 'Lanjut ▶', attrs: { type: 'button' } });
      lanjut.addEventListener('click', () => {
        sfx.click();
        indeks++;
        render();
      });

      let interaksiEl: HTMLElement | null = null;
      if (a.interaksi && !opsi.modeIngat) {
        const sudah = interaksiTuntas.has(indeks);
        lanjut.disabled = !sudah;
        if (!sudah) lanjut.textContent = '🔒 Selesaikan tantangan kecil';
        const i0 = indeks;
        interaksiEl = bangunInteraksi(a.interaksi, (pesan) => {
          interaksiTuntas.add(i0);
          lanjut.disabled = false;
          lanjut.textContent = 'Lanjut ▶';
          ucapkan(pesan, opsi.cerita.cantrik.suara);
        });
      }

      buku.append(kepala(a.judul), el('div', { class: 'cerita-panggung', children: [svg] }), narasi, el('div', { class: 'cerita-alat', children: [ulang] }));
      if (interaksiEl) buku.append(interaksiEl);
      buku.append(el('div', { class: 'cerita-navigasi', children: opsi.modeIngat ? [kembali] : [kembali, lanjut] }));
      window.setTimeout(() => bacakan(0), 250);
    };

    const renderPenutup = (): void => {
      tamat = true;
      const meta = opsi.meta;
      const lengkap = el('details', {
        class: 'cerita-lengkap',
        children: [
          el('summary', { text: '📚 Baca ringkasan materi lengkap' }),
          ...meta.materiPoin.map((p) =>
            el('div', { class: 'cerita-poin', children: [el('strong', { text: p.judul }), el('p', { text: p.teks })] }),
          ),
        ],
      });

      const ulangDariAwal = el('button', { class: 'btn ghost', text: '🔁 Ulangi cerita', attrs: { type: 'button' } });
      ulangDariAwal.addEventListener('click', () => {
        sfx.click();
        indeks = 0;
        render();
      });
      const tutup = el('button', { class: 'btn', text: '✅ Selesai membaca', attrs: { type: 'button' } });
      tutup.addEventListener('click', () => {
        sfx.click();
        selesai();
      });

      buku.append(
        kepala('Kunci Ingat'),
        el('div', {
          class: 'cerita-kunci',
          children: [el('span', { class: 'label-kecil', text: '🔑 Kunci Ingat' }), el('p', { text: meta.kunciJawab })],
        }),
        renderDiagramMateri(meta.diagram),
        lengkap,
        el('div', {
          class: 'cerita-hikmah',
          children: [el('span', { class: 'label-kecil', text: '🤲 Hikmah' }), el('p', { text: opsi.cerita.hikmah })],
        }),
        el('div', { class: 'cerita-navigasi', children: [ulangDariAwal, tutup] }),
      );
      ucapkan(`Kunci ingat. ${meta.kunciJawab}`, opsi.cerita.cantrik.suara);
    };

    render();
  });
}
