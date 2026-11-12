import { el } from './components/dom';
import { sfx } from '../core/sound';
import { ucapkan, berhenti } from '../core/suara';
import { renderDiagramMateri } from './components/diagramMateri';
import { getAdegan, type Adegan, type Interaksi, type JenisBunyi, type Latar, type Sprite } from '../data/adegan';
import type { CeritaBalai } from '../data/cerita';
import { pasangGambar } from '../core/gambar';
import type { BalaiMeta } from '../../shared/types';
import { BAHASA, t } from '../core/bahasa';

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

/** Kecerahan relatif warna #rgb/#rrggbb (0 gelap … 1 terang). */
function kecerahan(warna: string): number {
  let h = warna.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const FONT_LABEL = '"Baloo 2", "Segoe UI", system-ui, sans-serif';

/**
 * Label adegan yang selalu terbaca.
 * - Label bebas diberi "pil" latar (putih + teks gelap, atau gelap + teks terang)
 *   sehingga tetap jelas di atas goa gelap, berkas sinar kuning, maupun langit.
 * - Label yang menempel di atas balok berwarna (kutub magnet, lapisan tanah)
 *   cukup teks tegas bergaris tepi gelap tipis, tanpa pil.
 */
function gambarLabel(svg: SVGSVGElement, s: Extract<Sprite, { t: 'label' }>, diAtasKotak: boolean, kelas: string, gaya: string): SVGGElement {
  const ukuran = Math.max(11, s.s ?? 11);
  const warnaTeks = s.w ?? '#0f172a';
  const terang = kecerahan(warnaTeks) > 0.6;
  const g = svgEl('g', { class: `${kelas} label-pil`.trim(), style: `${gaya};transform-origin:${s.x}px ${s.y}px;transform-box:view-box` });
  const t = svgEl('text', {
    x: s.x,
    y: s.y,
    'font-size': ukuran,
    'font-family': FONT_LABEL,
    'text-anchor': 'middle',
    'font-weight': 800,
    fill: warnaTeks,
    class: 'cerita-label',
  });
  t.textContent = s.teks;
  if (diAtasKotak) {
    t.setAttribute('stroke', terang ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.85)');
    t.setAttribute('stroke-width', '2.2');
    t.setAttribute('paint-order', 'stroke');
    t.setAttribute('stroke-linejoin', 'round');
    g.append(t);
    svg.append(g);
    return g;
  }
  // Lebar pil: perkiraan awal, lalu disesuaikan dengan ukuran teks sebenarnya
  // begitu SVG tampil di layar (dan sekali lagi setelah font selesai dimuat).
  const padX = ukuran * 0.55;
  const tinggi = ukuran * 1.35;
  const pil = svgEl('rect', {
    x: s.x - (s.teks.length * ukuran * 0.56) / 2 - padX,
    y: s.y - ukuran * 0.98,
    width: s.teks.length * ukuran * 0.56 + padX * 2,
    height: tinggi,
    rx: tinggi / 2,
    fill: terang ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.9)',
    stroke: terang ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.18)',
    'stroke-width': 1,
  });
  g.append(pil, t);
  svg.append(g);
  const pas = (): void => {
    if (!t.isConnected) return;
    try {
      const b = t.getBBox();
      if (b.width <= 0) return;
      pil.setAttribute('x', String(b.x - padX));
      pil.setAttribute('width', String(b.width + padX * 2));
      pil.setAttribute('y', String(b.y + b.height / 2 - tinggi / 2));
    } catch {
      /* getBBox tidak tersedia (lingkungan uji) */
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(pas));
  void document.fonts?.ready.then(pas);
  return g;
}

function gambarSprite(svg: SVGSVGElement, s: Sprite, kotakAdegan: Array<Extract<Sprite, { t: 'kotak' }>> = []): void {
  if (s.t === 'gelombang') {
    gambarGelombang(svg, s);
    return;
  }
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
        // Animasi skala (denyut) berpusat di tengah kotak, bukan di pojok kiri atas.
        style: `${gaya};transform-box:view-box;transform-origin:${s.x + s.lebar / 2}px ${s.y + s.tinggi / 2}px`,
      }),
    );
    return;
  }
  if (s.t === 'label') {
    const diAtasKotak = kotakAdegan.some((k) => s.x >= k.x && s.x <= k.x + k.lebar && s.y >= k.y && s.y <= k.y + k.tinggi + 4);
    gambarLabel(svg, s, diAtasKotak, kelas, gaya);
    return;
  }
  const ukuran = s.s ?? 30;
  const g = svgEl('g', { class: kelas, style: `${gaya};transform-origin:${s.x}px ${s.y}px;transform-box:view-box` });
  // Benda tanpa animasi muncul sendiri ikut "masuk" memantul, bergiliran.
  const masuk = svgEl('g', {
    class: s.a === 'muncul' ? '' : 'masuk',
    style: `animation-delay:${Math.min(urutanMasuk++ * 0.12, 1.2).toFixed(2)}s;transform-origin:${s.x}px ${s.y}px;transform-box:view-box`,
  });
  const t = svgEl('text', {
    x: s.x,
    y: s.y,
    'font-size': ukuran,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    style: `transform-origin:${s.x}px ${s.y}px;transform-box:view-box`,
  });
  t.textContent = s.e;
  masuk.append(t);
  g.append(masuk);
  svg.append(g);
  if (s.n) pasangKetuk(svg, g, t, s.n, s.x, s.y, ukuran);
}

/** Urutan benda dalam adegan (untuk jeda animasi masuk); direset tiap adegan. */
let urutanMasuk = 0;

const WARNA_BUNYI: Record<JenisBunyi, { w: string; durasi: number }> = {
  infra: { w: '#7c3aed', durasi: 2.4 },
  audio: { w: '#16a34a', durasi: 1.8 },
  ultra: { w: '#ea580c', durasi: 1.0 },
};

/** Tiga busur yang memancar dari sumber bunyi, membesar lalu memudar. */
function gambarGelombang(svg: SVGSVGElement, s: Extract<Sprite, { t: 'gelombang' }>): void {
  const { w, durasi } = WARNA_BUNYI[s.jenis];
  const r = s.s ?? 18;
  // Busur ±55° di sisi `arah`, berpusat di sumber bunyi.
  const dx = Math.cos(0.96) * r * s.arah;
  const dy = Math.sin(0.96) * r;
  const d = `M ${s.x + dx} ${s.y - dy} A ${r} ${r} 0 0 ${s.arah === 1 ? 1 : 0} ${s.x + dx} ${s.y + dy}`;
  for (let i = 0; i < 3; i++) {
    svg.append(
      svgEl('path', {
        d,
        fill: 'none',
        stroke: w,
        'stroke-width': 3.5,
        'stroke-linecap': 'round',
        'vector-effect': 'non-scaling-stroke',
        class: 'anim-gelombang',
        style: `animation-duration:${durasi}s;animation-delay:${((s.d ?? 0) + (durasi / 3) * i).toFixed(2)}s;transform-origin:${s.x}px ${s.y}px;transform-box:view-box`,
      }),
    );
  }
}

/** Benda bisa diketuk: melompat kecil dan namanya muncul sebentar. */
function pasangKetuk(svg: SVGSVGElement, g: SVGGElement, t: SVGTextElement, nama: string, x: number, y: number, ukuran: number): void {
  g.classList.add('bisa-ketuk');
  g.setAttribute('role', 'button');
  g.setAttribute('tabindex', '0');
  g.setAttribute('aria-label', nama);
  let label: SVGGElement | null = null;
  let jeda = 0;
  const tampil = (): void => {
    sfx.click();
    t.classList.remove('lompat');
    void t.getBoundingClientRect(); // paksa reflow agar animasi lompat diulang
    t.classList.add('lompat');
    label?.remove();
    window.clearTimeout(jeda);
    // Label di bawah benda; bila terlalu dekat tepi bawah, di atasnya.
    const bawah = y + ukuran * 0.62 + 12;
    const ly = bawah < 194 ? bawah : y - ukuran * 0.62 - 4;
    label = gambarLabel(svg, { t: 'label', teks: nama, x: Math.min(Math.max(x, 50), 270), y: ly, s: 12 }, false, 'anim-muncul label-ketuk', '');
    jeda = window.setTimeout(() => label?.remove(), 2500);
  };
  g.addEventListener('click', tampil);
  g.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      tampil();
    }
  });
}

/**
 * Narasi dengan kata kunci materi ditebalkan. Kata yang memuat salah satu
 * `kata` (mis. "pantul" → "memantul") ikut disorot.
 */
export function sorotKata(teks: string, kata: string[]): Array<Node> {
  // shortcut: `kata` hanya berbahasa Indonesia, jadi mode Inggris tanpa sorot; terjemahkan `kata` bila perlu.
  if (BAHASA !== 'id' || kata.length === 0) return [document.createTextNode(teks)];
  const pola = [...kata].sort((x, y) => y.length - x.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`[\\p{L}-]*(?:${pola.join('|')})[\\p{L}-]*`, 'giu');
  const hasil: Node[] = [];
  let akhir = 0;
  for (const m of teks.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > akhir) hasil.push(document.createTextNode(teks.slice(akhir, i)));
    hasil.push(el('strong', { class: 'kata-kunci', text: m[0] }));
    akhir = i + m[0].length;
  }
  if (akhir < teks.length) hasil.push(document.createTextNode(teks.slice(akhir)));
  return hasil;
}

/** Menggambar satu adegan menjadi elemen SVG. */
export function gambarAdegan(adegan: Adegan, id: string): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 320 200', class: 'cerita-svg', role: 'img', 'aria-label': adegan.judul });
  gambarLatar(svg, adegan.latar, id);
  urutanMasuk = 0;
  const kotak = adegan.sprite.filter((s): s is Extract<Sprite, { t: 'kotak' }> => s.t === 'kotak');
  for (const s of adegan.sprite) gambarSprite(svg, s, kotak);
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
        onTuntas(t('Semua sudah dikelompokkan dengan benar!'));
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
          umpan.textContent = t('Coba lagi. {item} bukan {kelompok}.', { item: item.nama, kelompok: nama.toLowerCase() });
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
          else umpan.textContent = t('Bagus! Lanjutkan.');
        } else {
          sfx.wrong();
          b.classList.remove('goyang');
          void b.offsetWidth;
          b.classList.add('goyang');
          umpan.textContent = t('Belum tepat. Pikirkan lagi urutannya.');
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
  // Tombol ✕ merah di dekat tombol suara: keluar dari materi kapan saja.
  const tombolTutup = el('button', {
    class: 'tutup-x',
    text: '✕',
    attrs: { type: 'button', 'aria-label': t('Tutup materi'), title: t('Tutup') },
  });
  root.append(buku, tombolTutup);
  host.append(root);

  return new Promise<HasilBaca>((resolve) => {
    const selesai = (): void => {
      berhenti();
      root.remove();
      resolve({ detik: (performance.now() - mulai) / 1000, tamat });
    };
    tombolTutup.addEventListener('click', () => {
      sfx.click();
      selesai();
    });

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
      a.narasi.forEach((n, i) => narasi.append(el('p', { children: sorotKata(n, a.kata), attrs: { 'data-i': String(i) } })));

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

      const ulang = el('button', { class: 'btn kecil ghost', text: t('🔊 Bacakan lagi'), attrs: { type: 'button' } });
      ulang.addEventListener('click', () => bacakan(0));

      const kembali = el('button', {
        class: 'btn ghost',
        text: opsi.modeIngat ? t('↩️ Kembali ke tantangan') : t('◀ Sebelumnya'),
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

      const lanjut = el('button', { class: 'btn', text: t('Lanjut ▶'), attrs: { type: 'button' } });
      lanjut.addEventListener('click', () => {
        sfx.click();
        indeks++;
        render();
      });

      let interaksiEl: HTMLElement | null = null;
      if (a.interaksi && !opsi.modeIngat) {
        const sudah = interaksiTuntas.has(indeks);
        lanjut.disabled = !sudah;
        if (!sudah) lanjut.textContent = t('🔒 Selesaikan tantangan kecil');
        const i0 = indeks;
        interaksiEl = bangunInteraksi(a.interaksi, (pesan) => {
          interaksiTuntas.add(i0);
          lanjut.disabled = false;
          lanjut.textContent = t('Lanjut ▶');
          ucapkan(pesan, opsi.cerita.cantrik.suara);
        });
      }

      // `ada-panggung`: di layar mendatar, gambar adegan di kiri & narasi di kanan.
      buku.classList.add('ada-panggung');
      const petunjukKetuk = a.sprite.some((s) => s.t !== 'gelombang' && 'n' in s && s.n)
        ? el('span', { class: 'cerita-petunjuk-ketuk', text: t('👆 Ketuk gambar untuk melihat namanya') })
        : null;
      buku.append(kepala(a.judul), el('div', { class: 'cerita-panggung', children: [svg] }), narasi, el('div', { class: 'cerita-alat', children: [petunjukKetuk, ulang] }));
      if (interaksiEl) buku.append(interaksiEl);
      buku.append(el('div', { class: 'cerita-navigasi', children: opsi.modeIngat ? [kembali] : [kembali, lanjut] }));
      window.setTimeout(() => bacakan(0), 250);
    };

    const renderPenutup = (): void => {
      tamat = true;
      buku.classList.remove('ada-panggung');
      const meta = opsi.meta;
      const lengkap = el('details', {
        class: 'cerita-lengkap',
        children: [
          // Tombol besar yang jelas terlihat (bukan sekadar teks tautan).
          el('summary', {
            class: 'lengkap-tombol',
            children: [
              el('span', { class: 'lengkap-ikon', attrs: { 'aria-hidden': 'true' }, text: '📚' }),
              el('span', {
                class: 'lengkap-teks',
                children: [
                  el('strong', { text: t('Baca ringkasan materi lengkap') }),
                  el('span', { class: 'lengkap-sub', text: t('{jumlah} poin penting untuk diingat', { jumlah: meta.materiPoin.length }) }),
                ],
              }),
              el('span', { class: 'lengkap-panah', attrs: { 'aria-hidden': 'true' }, text: '▾' }),
            ],
          }),
          el('ol', {
            class: 'lengkap-daftar',
            children: meta.materiPoin.map((p) =>
              el('li', { class: 'cerita-poin', children: [el('strong', { text: p.judul }), el('p', { text: p.teks })] }),
            ),
          }),
        ],
      });

      const ulangDariAwal = el('button', { class: 'btn ghost', text: t('🔁 Ulangi cerita'), attrs: { type: 'button' } });
      ulangDariAwal.addEventListener('click', () => {
        sfx.click();
        indeks = 0;
        render();
      });
      const tutup = el('button', { class: 'btn', text: t('✅ Selesai membaca'), attrs: { type: 'button' } });
      tutup.addEventListener('click', () => {
        sfx.click();
        selesai();
      });

      buku.append(
        kepala(t('Kunci Ingat')),
        el('div', {
          class: 'cerita-kunci',
          children: [el('span', { class: 'label-kecil', text: t('🔑 Kunci Ingat') }), el('p', { text: meta.kunciJawab })],
        }),
        renderDiagramMateri(meta.diagram),
        lengkap,
        el('div', {
          class: 'cerita-hikmah',
          children: [el('span', { class: 'label-kecil', text: t('🤲 Hikmah') }), el('p', { text: opsi.cerita.hikmah })],
        }),
        el('div', { class: 'cerita-navigasi', children: [ulangDariAwal, tutup] }),
      );
      ucapkan(`${t('Kunci ingat.')} ${meta.kunciJawab}`, opsi.cerita.cantrik.suara);
    };

    render();
  });
}
