/**
 * kostum.ts — Kustomisasi warna kostum untuk karakter Kitab Sembilan Penjaga.
 *
 * Dipakai untuk `player_boy_v001.glb` (laki-laki) dan `player_girl_v001.glb` (perempuan hijab).
 * Modul ini TIDAK mengubah geometri, rig, atau animasi. Yang diubah hanya warna dasar (`color`) dari
 * material yang namanya ada di tabel {@link PETA_MATERIAL}. Kulit, wajah, dan rambut tidak pernah diubah.
 *
 * Tidak memakai framework. Kompatibel dengan three.js r170 ke atas.
 *
 * @example
 * import { terapkanKostum, muatKostum, simpanKostum } from './kostum';
 * const pilihan = muatKostum('laki-laki') ?? { preset: 'krem-klasik' };
 * terapkanKostum(isi, 'laki-laki', pilihan);
 */
import * as THREE from 'three';

/** Jenis karakter. */
export type Gender = 'laki-laki' | 'perempuan';

/** Bagian kostum yang bisa diwarnai pada karakter laki-laki. */
export type BagianLaki = 'baju' | 'aksen' | 'celana' | 'peci' | 'sepatu' | 'sol';
/** Bagian kostum yang bisa diwarnai pada karakter perempuan. */
export type BagianPerempuan = 'tunik' | 'aksen' | 'rok' | 'kerudung' | 'sepatu' | 'sol';
/** Gabungan semua kunci bagian. */
export type Bagian = BagianLaki | BagianPerempuan;

/** Satu warna pilihan (swatch). `hex` dalam sRGB, misalnya `'#efe4d8'`. */
export interface Warna {
  /** Nama warna dalam Bahasa Indonesia, untuk ditampilkan ke pemain. */
  nama: string;
  /** Kode warna sRGB `#rrggbb`. */
  hex: string;
}

/** Keterangan satu bagian kostum: label untuk UI dan daftar swatch. */
export interface InfoBagian {
  /** Kunci bagian, misalnya `'baju'`. */
  id: Bagian;
  /** Label untuk UI, misalnya `'Baju Koko'`. */
  label: string;
  /** Pilihan warna (8–10 swatch). */
  swatch: Warna[];
}

/** Preset kostum: satu set warna lengkap untuk semua bagian. */
export interface PresetKostum {
  /** Id stabil untuk disimpan, misalnya `'krem-klasik'`. */
  id: string;
  /** Nama tampilan dalam Bahasa Indonesia. */
  nama: string;
  /** Warna setiap bagian (sRGB hex). */
  warna: Record<string, string>;
  /**
   * Opsional: warna khusus per *nama material*, untuk menimpa warna turunan otomatis
   * (dipakai preset bawaan supaya hasilnya persis sama dengan GLB asli).
   */
  khusus?: Record<string, string>;
}

/**
 * Pilihan kostum milik pemain.
 * - `preset`: id preset dasar. Kalau tidak diisi atau tidak dikenal, dipakai preset bawaan (`krem-klasik`).
 * - `warna`: warna per bagian yang menimpa warna preset (hasil pilihan swatch).
 */
export interface PilihanKostum {
  preset?: string;
  warna?: Partial<Record<Bagian, string>>;
}

// ---------------------------------------------------------------------------------------------
// Utilitas warna (sRGB hex)
// ---------------------------------------------------------------------------------------------

const POLA_HEX = /^#[0-9a-fA-F]{6}$/;

/** Mengecek apakah teks adalah warna `#rrggbb` yang valid. */
export function hexValid(hex: unknown): hex is string {
  return typeof hex === 'string' && POLA_HEX.test(hex);
}

function keRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function keHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

/**
 * Mencampur dua warna sRGB.
 * @param a warna pertama
 * @param b warna kedua
 * @param t porsi `b` (0 = semua `a`, 1 = semua `b`)
 */
export function campurWarna(a: string, b: string, t: number): string {
  const [r1, g1, b1] = keRgb(a); const [r2, g2, b2] = keRgb(b);
  return keHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
/** Menggelapkan warna sebanyak `t` (0–1). */
export const gelapkan = (hex: string, t: number) => campurWarna(hex, '#000000', t);
/** Mencerahkan warna sebanyak `t` (0–1). */
export const terangkan = (hex: string, t: number) => campurWarna(hex, '#ffffff', t);

/** Luminans relatif WCAG dari warna sRGB. */
export function luminans(hex: string): number {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = keRgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
/**
 * Rasio kontras WCAG antara dua warna (1–21). Untuk baju vs aksen, disarankan minimal 1,8
 * supaya aksen tetap terlihat.
 */
export function rasioKontras(a: string, b: string): number {
  const la = luminans(a), lb = luminans(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ---------------------------------------------------------------------------------------------
// Peta material (nama material di GLB -> warna dari bagian kostum)
// ---------------------------------------------------------------------------------------------

// Kunci bagian dibuat pasti (Record<Bagian, …>) agar lolos `noUncheckedIndexedAccess` di project.
type WarnaBagian = Record<Bagian, string>;
type Pemetaan = (w: WarnaBagian) => string;

/**
 * Nama material di GLB dan cara menghitung warnanya dari warna bagian.
 * Material yang tidak ada di sini (Face, Skin, Hair) tidak pernah diubah.
 */
export const PETA_MATERIAL: Record<Gender, Record<string, Pemetaan>> = {
  'laki-laki': {
    Shirt: (w) => w.baju,                                  // badan + lengan baju koko
    ShirtTrim: (w) => gelapkan(w.baju, 0.055),             // plaket, saku, pita keliman, belahan kerah
    Tan: (w) => w.aksen,                                   // yoke bahu, garis manset, list saku
    Button: (w) => campurWarna(w.aksen, w.baju, 0.3),      // kancing
    Pants: (w) => w.celana,
    PantsSeam: (w) => gelapkan(w.celana, 0.25),            // jahitan lutut + lipatan celana
    Peci: (w) => w.peci,
    ShoeDark: (w) => w.sepatu,
    ShoeWhite: (w) => w.sol,                               // sol, ujung, lidah, tumit sepatu
  },
  perempuan: {
    Shirt: (w) => w.tunik,                                 // badan + lengan tunik
    Button: (w) => terangkan(w.tunik, 0.03),               // 2 kancing di plaket
    Brown: (w) => w.aksen,                                 // yoke, plaket, pita keliman, garis manset
    BrownDark: (w) => gelapkan(w.aksen, 0.35),             // belahan samping
    Skirt: (w) => w.rok,                                   // rok + betis tersembunyi
    SkirtHem: (w) => gelapkan(w.rok, 0.22),                // pita keliman rok + garis panel
    Hijab: (w) => w.kerudung,
    HijabShade: (w) => gelapkan(w.kerudung, 0.08),         // garis lipatan hijab
    ShoeDark: (w) => w.sepatu,
    ShoeWhite: (w) => w.sol,
  },
};

/** Nama material yang selalu dibiarkan (kulit, wajah, rambut). */
export const MATERIAL_TETAP = ['Face', 'Skin', 'Hair'] as const;

// ---------------------------------------------------------------------------------------------
// Swatch per bagian
// ---------------------------------------------------------------------------------------------

const W = (nama: string, hex: string): Warna => ({ nama, hex });

const SOL_DASAR = (putih: string): Warna[] => [
  W('Putih', putih), W('Krem', '#e8dcc4'), W('Abu Muda', '#cfd2d6'), W('Hitam', '#2a2a2c'),
  W('Cokelat Karet', '#b07a45'), W('Biru Muda', '#cfe0f0'), W('Merah Muda', '#f2d3da'), W('Hijau Muda', '#d4ead8'),
];
const SOL = SOL_DASAR('#ece7e2');

/** Bagian kostum dan swatch untuk tiap karakter, urut sesuai tampilan UI. */
export const BAGIAN: Record<Gender, InfoBagian[]> = {
  'laki-laki': [
    { id: 'baju', label: 'Baju Koko', swatch: [
      W('Krem', '#efe4d8'), W('Putih', '#f7f7f4'), W('Biru Laut', '#8fb8d8'), W('Hijau Daun', '#a8cf9a'),
      W('Abu', '#c9ccd1'), W('Marun', '#8c2f3c'), W('Navy', '#23395b'), W('Hitam', '#26252a'),
      W('Kuning Lembut', '#f2e2a8'), W('Toska', '#7fc4bd')] },
    { id: 'aksen', label: 'Aksen / Yoke', swatch: [
      W('Cokelat Muda', '#c4956a'), W('Emas', '#d4af37'), W('Biru Tua', '#2f5f8a'), W('Hijau Tua', '#3f7a3a'),
      W('Abu Tua', '#5f6670'), W('Cokelat', '#7a4e30'), W('Perak', '#b9bec6'), W('Merah Bata', '#a5483a'),
      W('Putih', '#f4f2ec'), W('Biru Abu', '#9fb3c8')] },
    { id: 'celana', label: 'Celana', swatch: [
      W('Cokelat', '#5a3427'), W('Hitam', '#2e2b2a'), W('Navy', '#2a2f3a'), W('Abu Arang', '#3a3d42'),
      W('Krem Tua', '#b59f80'), W('Hijau Zaitun', '#4b5332'), W('Putih', '#ecebe6'), W('Biru Jeans', '#3e5675'),
      W('Cokelat Tua', '#3b2224'), W('Cokelat Kopi', '#4a3b2a')] },
    { id: 'peci', label: 'Peci', swatch: [
      W('Hitam', '#0e0d0d'), W('Putih', '#f1efe9'), W('Navy', '#1c2a44'), W('Marun', '#5a1e28'),
      W('Abu', '#4a4d52'), W('Cokelat', '#4a3020'), W('Hijau Tua', '#1f3a28'), W('Krem', '#d9cbb5')] },
    { id: 'sepatu', label: 'Sepatu', swatch: [
      W('Abu Tua', '#48474b'), W('Hitam', '#1d1c1f'), W('Cokelat', '#6c4632'), W('Navy', '#2a3550'),
      W('Putih', '#e9e7e3'), W('Merah', '#a83a3a'), W('Hijau', '#3f6a48'), W('Biru', '#3a5f9a'), W('Cokelat Tua', '#3a2a2a')] },
    { id: 'sol', label: 'Sol Sepatu', swatch: SOL },
  ],
  perempuan: [
    { id: 'tunik', label: 'Tunik', swatch: [
      W('Krem', '#efdfd1'), W('Putih', '#f7f5f0'), W('Merah Muda', '#fbe7ec'), W('Lavender', '#ece4f6'),
      W('Biru Langit', '#e6f1fa'), W('Mint', '#e5f6ee'), W('Cokelat Susu', '#ead9c4'), W('Kuning Lembut', '#f4e8bf'),
      W('Abu Muda', '#e2e3e6'), W('Navy', '#2b3d5e')] },
    { id: 'aksen', label: 'Aksen / Yoke', swatch: [
      W('Cokelat', '#8e5a3d'), W('Merah Muda Tua', '#c9657f'), W('Ungu', '#7a5ea8'), W('Biru', '#3f78b0'),
      W('Hijau', '#3f9474'), W('Navy', '#2b3d5e'), W('Maroon', '#7d2a3a'), W('Emas', '#c9a24a'),
      W('Abu', '#6a6e76'), W('Cokelat Susu', '#8a6240')] },
    { id: 'rok', label: 'Rok', swatch: [
      W('Cokelat Tua', '#633523'), W('Navy', '#1f2b44'), W('Hitam', '#262428'), W('Abu Arang', '#3a3d42'),
      W('Maroon', '#4e1c26'), W('Hijau Tua', '#2f5a4a'), W('Ungu Tua', '#4a3a6a'), W('Biru Jeans', '#2c4a6e'),
      W('Cokelat Kopi', '#5c4030'), W('Merah Muda Tua', '#7a3a4c')] },
    { id: 'kerudung', label: 'Kerudung', swatch: [
      W('Krem', '#eadbd0'), W('Putih', '#f6f4ef'), W('Merah Muda', '#f6d6de'), W('Lavender', '#ddd0ef'),
      W('Biru Langit', '#cfe3f3'), W('Mint', '#cdeee0'), W('Cokelat Susu', '#d9c2a7'), W('Navy', '#2b3d5e'),
      W('Maroon', '#7d2a3a'), W('Abu', '#b9bcc2')] },
    { id: 'sepatu', label: 'Sepatu', swatch: [
      W('Cokelat', '#6c4632'), W('Hitam', '#1d1c1f'), W('Navy', '#2a3550'), W('Merah Muda Tua', '#8a4a5c'),
      W('Ungu', '#5a4a7a'), W('Biru', '#35557a'), W('Hijau', '#3e6a58'), W('Putih', '#e9e7e3'), W('Maroon', '#5a2a32')] },
    { id: 'sol', label: 'Sol Sepatu', swatch: SOL_DASAR('#ece4de') },
  ],
};

// ---------------------------------------------------------------------------------------------
// Preset
// ---------------------------------------------------------------------------------------------

/** Id preset bawaan (warna asli GLB). */
export const PRESET_BAWAAN = 'krem-klasik';

/** Preset kostum untuk tiap karakter. Preset pertama adalah bawaan dan sama persis dengan GLB. */
export const PRESET: Record<Gender, PresetKostum[]> = {
  'laki-laki': [
    { id: 'krem-klasik', nama: 'Krem Klasik',
      warna: { baju: '#efe4d8', aksen: '#c4956a', celana: '#5a3427', peci: '#0e0d0d', sepatu: '#48474b', sol: '#ece7e2' },
      khusus: { ShirtTrim: '#e2d4c5', Button: '#b39a86', PantsSeam: '#432519' } },
    { id: 'putih-bersih', nama: 'Putih Bersih',
      warna: { baju: '#f7f7f4', aksen: '#9fb3c8', celana: '#3a3d42', peci: '#f1efe9', sepatu: '#2a3550', sol: '#ece7e2' } },
    { id: 'biru-laut', nama: 'Biru Laut',
      warna: { baju: '#8fb8d8', aksen: '#2f5f8a', celana: '#2a2f3a', peci: '#1c2a44', sepatu: '#2a3550', sol: '#ece7e2' } },
    { id: 'hijau-daun', nama: 'Hijau Daun',
      warna: { baju: '#a8cf9a', aksen: '#3f7a3a', celana: '#4a3b2a', peci: '#1f3a28', sepatu: '#6c4632', sol: '#e8dcc4' } },
    { id: 'abu-tenang', nama: 'Abu Tenang',
      warna: { baju: '#c9ccd1', aksen: '#5f6670', celana: '#3a3d42', peci: '#0e0d0d', sepatu: '#1d1c1f', sol: '#cfd2d6' } },
    { id: 'marun', nama: 'Marun',
      warna: { baju: '#8c2f3c', aksen: '#d4af37', celana: '#3b2224', peci: '#0e0d0d', sepatu: '#3a2a2a', sol: '#e8dcc4' } },
    { id: 'navy', nama: 'Navy',
      warna: { baju: '#23395b', aksen: '#d4af37', celana: '#2a2f3a', peci: '#0e0d0d', sepatu: '#1d1c1f', sol: '#ece7e2' } },
    { id: 'hitam-emas', nama: 'Hitam-Emas',
      warna: { baju: '#26252a', aksen: '#d4af37', celana: '#2e2b2a', peci: '#0e0d0d', sepatu: '#1d1c1f', sol: '#e8dcc4' } },
  ],
  perempuan: [
    { id: 'krem-klasik', nama: 'Krem Klasik',
      warna: { tunik: '#efdfd1', aksen: '#8e5a3d', rok: '#633523', kerudung: '#eadbd0', sepatu: '#6c4632', sol: '#ece4de' },
      khusus: { Button: '#efe0d2', BrownDark: '#5e3a27', SkirtHem: '#4c2819', HijabShade: '#d8c5b8' } },
    { id: 'merah-muda-lembut', nama: 'Merah Muda Lembut',
      warna: { tunik: '#fbe7ec', aksen: '#c9657f', rok: '#7a3a4c', kerudung: '#f6d6de', sepatu: '#8a4a5c', sol: '#f2d3da' } },
    { id: 'ungu-lavender', nama: 'Ungu Lavender',
      warna: { tunik: '#ece4f6', aksen: '#7a5ea8', rok: '#4a3a6a', kerudung: '#ddd0ef', sepatu: '#5a4a7a', sol: '#ece4de' } },
    { id: 'biru-langit', nama: 'Biru Langit',
      warna: { tunik: '#e6f1fa', aksen: '#3f78b0', rok: '#2c4a6e', kerudung: '#cfe3f3', sepatu: '#35557a', sol: '#cfe0f0' } },
    { id: 'hijau-mint', nama: 'Hijau Mint',
      warna: { tunik: '#e5f6ee', aksen: '#3f9474', rok: '#2f5a4a', kerudung: '#cdeee0', sepatu: '#3e6a58', sol: '#d4ead8' } },
    { id: 'cokelat-susu', nama: 'Cokelat Susu',
      warna: { tunik: '#ead9c4', aksen: '#8a6240', rok: '#5c4030', kerudung: '#d9c2a7', sepatu: '#6c4632', sol: '#e8dcc4' } },
    { id: 'navy', nama: 'Navy',
      warna: { tunik: '#e2e3e6', aksen: '#2b3d5e', rok: '#1f2b44', kerudung: '#2b3d5e', sepatu: '#2a3550', sol: '#ece4de' } },
    { id: 'maroon', nama: 'Maroon',
      warna: { tunik: '#f7f5f0', aksen: '#7d2a3a', rok: '#4e1c26', kerudung: '#7d2a3a', sepatu: '#5a2a32', sol: '#ece4de' } },
  ],
};

// ---------------------------------------------------------------------------------------------
// Inti
// ---------------------------------------------------------------------------------------------

/** Mencari preset berdasarkan id. Kalau id tidak ditemukan, yang dikembalikan preset bawaan. */
export function cariPreset(gender: Gender, id?: string): PresetKostum {
  const daftar = PRESET[gender];
  return daftar.find((p) => p.id === id) ?? (daftar[0] as PresetKostum);
}

/**
 * Menghitung warna akhir setiap bagian dan setiap nama material dari sebuah pilihan.
 * Tidak menyentuh scene, jadi aman dipakai untuk UI atau server.
 * @returns `bagian` (warna per bagian) dan `material` (warna per nama material GLB)
 */
export function hitungWarna(gender: Gender, pilihan: PilihanKostum = {}) {
  const preset = cariPreset(gender, pilihan.preset);
  const bagian: Record<string, string> = { ...preset.warna };
  let adaTimpaan = false;
  for (const info of BAGIAN[gender]) {
    const hex = pilihan.warna?.[info.id];
    if (hexValid(hex)) { if (hex.toLowerCase() !== bagian[info.id]) adaTimpaan = true; bagian[info.id] = hex.toLowerCase(); }
  }
  const material: Record<string, string> = {};
  for (const [nama, f] of Object.entries(PETA_MATERIAL[gender])) material[nama] = f(bagian as WarnaBagian);
  // warna khusus preset hanya dipakai kalau bagian sumbernya tidak diubah pemain
  if (preset.khusus) {
    const ulang = adaTimpaan ? hitungUlangTanpaKhusus(gender, preset, bagian) : null;
    for (const [nama, hex] of Object.entries(preset.khusus)) if (!ulang || !ulang.has(nama)) material[nama] = hex;
  }
  return { preset: preset.id, bagian, material };
}

// material turunan yang sumbernya berubah dari preset -> jangan pakai warna khusus
function hitungUlangTanpaKhusus(gender: Gender, preset: PresetKostum, bagian: Record<string, string>): Set<string> {
  const berubah = new Set<string>();
  for (const [nama, f] of Object.entries(PETA_MATERIAL[gender])) {
    if (f(bagian as WarnaBagian) !== f(preset.warna as WarnaBagian)) berubah.add(nama);
  }
  return berubah;
}

/**
 * Menerapkan kostum ke model yang sudah dimuat (hasil GLTFLoader, boleh sudah dibungkus Group atau di-clone).
 *
 * Material pada model ini di-*clone* lebih dulu, satu kali per instance (`root`), lalu warnanya diubah.
 * Jadi dua pemain yang memakai GLB yang sama (atau hasil `SkeletonUtils.clone`) tidak berbagi warna.
 * Kalau dipanggil lagi pada `root` yang sama, material clone yang sudah ada dipakai ulang (tidak menumpuk).
 *
 * @param root    objek akar model (misalnya `isi` setelah `klonModel()`)
 * @param gender  `'laki-laki'` atau `'perempuan'`
 * @param pilihan preset dan/atau warna per bagian
 * @returns warna akhir (lihat {@link hitungWarna}) dan jumlah material yang diwarnai
 */
export function terapkanKostum(root: THREE.Object3D, gender: Gender, pilihan: PilihanKostum = {}) {
  const hasil = hitungWarna(gender, pilihan);
  const kloningan = new Map<string, THREE.Material>();
  let jumlah = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const jamak = Array.isArray(mesh.material);
    const daftar = (jamak ? mesh.material : [mesh.material]) as THREE.Material[];
    let diganti = false;
    const baru = daftar.map((mat) => {
      const hex = hasil.material[mat.name];
      if (!hex) return mat;
      let milik = mat;
      if (mat.userData.kostumPemilik !== root.uuid) {
        milik = kloningan.get(mat.uuid) ?? mat.clone();
        milik.userData.kostumPemilik = root.uuid;
        kloningan.set(mat.uuid, milik);
        diganti = true;
      }
      const m = milik as THREE.MeshStandardMaterial;
      if (m.color) { m.color.set(hex); jumlah++; }
      return milik;
    });
    if (diganti) mesh.material = jamak ? baru : (baru[0] as THREE.Material);
  });
  root.userData.kostum = { gender, pilihan: salinPilihan(pilihan) };
  return { ...hasil, jumlahMaterial: jumlah };
}

/**
 * Membuang (dispose) material clone milik kostum pada model ini. Panggil saat pemain keluar atau model dibuang.
 * Tekstur tidak ikut dibuang, karena tekstur dipakai bersama dengan model asli.
 */
export function buangMaterialKostum(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const daftar = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
    for (const mat of daftar) if (mat && mat.userData.kostumPemilik === root.uuid) mat.dispose();
  });
}

/** Menebak gender dari material: model dengan material `Hijab` dianggap perempuan. */
export function tebakGender(root: THREE.Object3D): Gender {
  let perempuan = false;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const daftar = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
    if (daftar.some((m) => m && m.name === 'Hijab')) perempuan = true;
  });
  return perempuan ? 'perempuan' : 'laki-laki';
}

// ---------------------------------------------------------------------------------------------
// Simpan / muat (localStorage)
// ---------------------------------------------------------------------------------------------

/** Awalan kunci localStorage. */
export const KUNCI_SIMPAN = 'ksp.kostum.v1';

function salinPilihan(p: PilihanKostum): PilihanKostum {
  return { preset: p.preset, warna: p.warna ? { ...p.warna } : undefined };
}

/** Membersihkan pilihan dari data yang tidak valid (preset tak dikenal, bagian asing, hex salah). */
export function rapikanPilihan(gender: Gender, data: unknown): PilihanKostum {
  const out: PilihanKostum = {};
  if (!data || typeof data !== 'object') return out;
  const d = data as Record<string, unknown>;
  if (typeof d.preset === 'string' && PRESET[gender].some((p) => p.id === d.preset)) out.preset = d.preset;
  if (d.warna && typeof d.warna === 'object') {
    const ids = new Set<string>(BAGIAN[gender].map((b) => b.id));
    const w: Partial<Record<Bagian, string>> = {};
    for (const [k, v] of Object.entries(d.warna as Record<string, unknown>)) if (ids.has(k) && hexValid(v)) w[k as Bagian] = v.toLowerCase();
    if (Object.keys(w).length) out.warna = w;
  }
  return out;
}

/**
 * Menyimpan pilihan kostum ke localStorage (satu entri per gender).
 * @param slot opsional, misalnya id pemain/profil kalau ada beberapa pemain di satu perangkat
 * @returns `true` kalau berhasil disimpan
 */
export function simpanKostum(gender: Gender, pilihan: PilihanKostum, slot = 'default'): boolean {
  try {
    localStorage.setItem(`${KUNCI_SIMPAN}.${slot}.${gender}`, JSON.stringify(rapikanPilihan(gender, pilihan)));
    return true;
  } catch { return false; }  // mode privat / kuota penuh / tanpa localStorage
}

/**
 * Memuat pilihan kostum dari localStorage.
 * @returns pilihan yang sudah dirapikan, atau `null` kalau belum ada atau datanya rusak
 */
export function muatKostum(gender: Gender, slot = 'default'): PilihanKostum | null {
  try {
    const teks = localStorage.getItem(`${KUNCI_SIMPAN}.${slot}.${gender}`);
    if (!teks) return null;
    return rapikanPilihan(gender, JSON.parse(teks));
  } catch { return null; }
}

/** Menghapus pilihan kostum yang tersimpan. */
export function hapusKostum(gender: Gender, slot = 'default'): void {
  try { localStorage.removeItem(`${KUNCI_SIMPAN}.${slot}.${gender}`); } catch { /* abaikan */ }
}
