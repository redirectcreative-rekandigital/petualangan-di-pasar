import type { BalaiId, Elemen } from '../../shared/types';

/**
 * Konfigurasi peta pasar 3D versi balai TKA. Tiga zona (Bilangan, Geometri,
 * Data) mengelilingi Pasar Ramai di tengah. Setiap balai punya bangunan,
 * papan nama, lencana kode, dan NPC penjaga.
 *
 * Sistem koordinat: X ke kanan, Z ke depan, Y ke atas. Pasar berukuran 64 x 64.
 */

export const MAP_SIZE = 64;
export const HALF = MAP_SIZE / 2;

export interface BalaiConfig {
  kode: BalaiId;
  /** Nama halus bergaya game. */
  nama: string;
  /** Kode TKA (mis. B01) atau "FINAL". */
  kodeLabel: string;
  elemen: Elemen;
  /** Nama NPC penjaga. */
  penjaga: string;
  position: { x: number; z: number };
  rotation: number;
  warnaAtap: number;
  dialog: string;
}

const ZONA_BILANGAN_X = 0;
const ZONA_GEOMETRI_X = -22;
const ZONA_DATA_X = 22;

/** 16 balai + Pasar Ramai, tersusun per zona. */
export const BALAI_CONFIG: BalaiConfig[] = [
  // ---- Zona Bilangan (kolom utara-tengah) ----
  { kode: 'B01', nama: 'Balai Angka Awal', kodeLabel: 'B01', elemen: 'Bilangan', penjaga: 'Pak Nilai', position: { x: ZONA_BILANGAN_X - 6, z: -20 }, rotation: 0, warnaAtap: 0x2f9e6b, dialog: 'Setiap angka punya tempat. Mari kenali nilai tempat bersama!' },
  { kode: 'B02', nama: 'Pojok Hitung Cepat', kodeLabel: 'B02', elemen: 'Bilangan', penjaga: 'Bu Jumlah', position: { x: ZONA_BILANGAN_X + 6, z: -20 }, rotation: 0, warnaAtap: 0x2f9e6b, dialog: 'Hitung belanja dan kembalian dengan teliti, ya!' },
  { kode: 'B03', nama: 'Balai Berbagi Adil', kodeLabel: 'B03', elemen: 'Bilangan', penjaga: 'Pak Bagi', position: { x: ZONA_BILANGAN_X - 6, z: -12 }, rotation: 0, warnaAtap: 0x2f9e6b, dialog: 'Bagi sama rata itu adil. FPB dan KPK membantu kita.' },
  { kode: 'B04', nama: 'Pojok Serpihan Kue', kodeLabel: 'B04', elemen: 'Bilangan', penjaga: 'Bu Serpihan', position: { x: ZONA_BILANGAN_X + 6, z: -12 }, rotation: 0, warnaAtap: 0x2f9e6b, dialog: 'Seperdua, sepertiga... pecahan ada di mana-mana!' },
  { kode: 'B05', nama: 'Balai Adonan', kodeLabel: 'B05', elemen: 'Bilangan', penjaga: 'Bu Adon', position: { x: ZONA_BILANGAN_X - 6, z: -4 }, rotation: 0, warnaAtap: 0x2f9e6b, dialog: 'Menjumlah pecahan itu seperti menyatukan adonan.' },
  { kode: 'B06', nama: 'Pojok Label Harga', kodeLabel: 'B06', elemen: 'Bilangan', penjaga: 'Pak Diskon', position: { x: ZONA_BILANGAN_X + 6, z: -4 }, rotation: 0, warnaAtap: 0x2f9e6b, dialog: 'Persen dan diskon bikin harga lebih ramah di kantong.' },

  // ---- Zona Geometri (barat) ----
  { kode: 'G01', nama: 'Balai Bentuk', kodeLabel: 'G01', elemen: 'Geometri', penjaga: 'Bu Bentuk', position: { x: ZONA_GEOMETRI_X, z: -22 }, rotation: Math.PI / 2, warnaAtap: 0x2563eb, dialog: 'Kenali ciri bangun datar satu per satu.' },
  { kode: 'G02', nama: 'Pojok Pagar Taman', kodeLabel: 'G02', elemen: 'Geometri', penjaga: 'Pak Pagar', position: { x: ZONA_GEOMETRI_X, z: -14 }, rotation: Math.PI / 2, warnaAtap: 0x2563eb, dialog: 'Panjang pagar = keliling taman.' },
  { kode: 'G03', nama: 'Balai Lantai', kodeLabel: 'G03', elemen: 'Geometri', penjaga: 'Bu Keramik', position: { x: ZONA_GEOMETRI_X, z: -6 }, rotation: Math.PI / 2, warnaAtap: 0x2563eb, dialog: 'Luas lantai menentukan berapa keramik yang dibutuhkan.' },
  { kode: 'G04', nama: 'Pojok Kotak', kodeLabel: 'G04', elemen: 'Geometri', penjaga: 'Pak Kotak', position: { x: ZONA_GEOMETRI_X, z: 2 }, rotation: Math.PI / 2, warnaAtap: 0x2563eb, dialog: 'Kubus dan balok, mana yang rusuknya sama?' },
  { kode: 'G05', nama: 'Gudang Kapasitas', kodeLabel: 'G05', elemen: 'Geometri', penjaga: 'Bu Volume', position: { x: ZONA_GEOMETRI_X, z: 10 }, rotation: Math.PI / 2, warnaAtap: 0x2563eb, dialog: 'Volume menghitung ruang yang bisa ditampung.' },
  { kode: 'G06', nama: 'Balai Timbangan', kodeLabel: 'G06', elemen: 'Geometri', penjaga: 'Pak Timbang', position: { x: ZONA_GEOMETRI_X, z: 18 }, rotation: Math.PI / 2, warnaAtap: 0x2563eb, dialog: 'Timbangan harus adil. Tukar satuan dengan tepat.' },
  { kode: 'G07', nama: 'Pojok Jalan Cepat', kodeLabel: 'G07', elemen: 'Geometri', penjaga: 'Pak Kilat', position: { x: ZONA_GEOMETRI_X, z: 26 }, rotation: Math.PI / 2, warnaAtap: 0x2563eb, dialog: 'Jarak, waktu, kecepatan — tiga sahabat jalan.' },
  { kode: 'G08', nama: 'Balai Sudut Pandang', kodeLabel: 'G08', elemen: 'Geometri', penjaga: 'Bu Sudut', position: { x: ZONA_GEOMETRI_X, z: 34 }, rotation: Math.PI / 2, warnaAtap: 0x2563eb, dialog: 'Lancip, siku-siku, atau tumpul? Ayo tebak sudutnya.' },

  // ---- Zona Data (timur) ----
  { kode: 'D01', nama: 'Papan Catatan', kodeLabel: 'D01', elemen: 'Data', penjaga: 'Pak Catat', position: { x: ZONA_DATA_X, z: 4 }, rotation: -Math.PI / 2, warnaAtap: 0xd97706, dialog: 'Tabel, diagram, piktogram — semua jalan membaca data.' },
  { kode: 'D02', nama: 'Pojok Kesimpulan', kodeLabel: 'D02', elemen: 'Data', penjaga: 'Bu Simpul', position: { x: ZONA_DATA_X, z: 16 }, rotation: -Math.PI / 2, warnaAtap: 0xd97706, dialog: 'Kesimpulan hanya boleh berdasar data, bukan dugaan.' },
];

/** Pasar Ramai (babak puncak) di tengah peta. */
export const FINAL_CONFIG: BalaiConfig = {
  kode: 'FINAL',
  nama: 'Pasar Ramai',
  kodeLabel: 'FINAL',
  elemen: 'Bilangan',
  penjaga: 'Raja Diskon',
  position: { x: 0, z: 22 },
  rotation: Math.PI,
  warnaAtap: 0x9333ea,
  dialog: 'Selamat, kamu sudah menjelajah semua balai! Kini hadapi tantangan 30 soal Pasar Ramai!',
};

export const SEMUA_BANGUNAN: BalaiConfig[] = [...BALAI_CONFIG, FINAL_CONFIG];

/** Zona interaksi berbentuk lingkaran mengelilingi NPC. */
export const INTERACTION_RADIUS = 4.2;

/** Pagar pasar: kotak-kotak penghalang di tepi peta. */
export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function box(cx: number, cz: number, w: number, d: number): ColliderBox {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
}

/** Kotak collision untuk setiap balai (badan bangunan) dan pagar tepi. */
export const STATIC_COLLIDERS: ColliderBox[] = [
  ...SEMUA_BANGUNAN.map((b) => box(b.position.x, b.position.z, 3.4, 3.0)),
  // Pagar tepi pasar (4 sisi).
  box(0, HALF, MAP_SIZE, 1),
  box(0, -HALF, MAP_SIZE, 1),
  box(-HALF, 0, 1, MAP_SIZE),
  box(HALF, 0, 1, MAP_SIZE),
];

/** Titik awal pemain di tengah pasar. */
export const PLAYER_START = { x: 0, z: 0 };

/** Radius tubuh pemain untuk collision lingkaran-vs-kotak. */
export const PLAYER_RADIUS = 1;

export function getBangunan(kode: BalaiId): BalaiConfig | undefined {
  return SEMUA_BANGUNAN.find((b) => b.kode === kode);
}

/** Warna lantai zona pada peta, untuk penanda area. */
export const ZONA_WARNA: Record<Elemen, number> = {
  Bilangan: 0x2f9e6b,
  Geometri: 0x2563eb,
  Data: 0xd97706,
};
