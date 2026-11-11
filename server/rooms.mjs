/**
 * Penyimpanan ruang (kelas) di memori server.
 *
 * Satu ruang = satu token 4 digit yang dibuat guru. Di dalamnya tersimpan
 * daftar siswa beserta ringkasan progres mereka. Data hanya hidup selama
 * proses server berjalan (cukup untuk satu sesi pembelajaran); tidak ada
 * basis data eksternal yang dibutuhkan.
 */

import { randomInt, randomBytes, timingSafeEqual } from 'node:crypto';

export function buatKunci() {
  return randomBytes(16).toString('hex');
}

export function kunciCocok(r, kunci) {
  const a = Buffer.from(String(kunci || ''));
  const b = Buffer.from(r.kunci);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Rentang token 4 digit: 1000..9999 (angka saja, mudah diketik anak). */
const TOKEN_MIN = 1000;
const TOKEN_MAX = 9999;

export function buatTokenAcak(yangDipakai) {
  for (let i = 0; i < 200; i++) {
    const token = String(randomInt(TOKEN_MIN, TOKEN_MAX + 1));
    if (!yangDipakai.has(token)) return token;
  }
  // Fallback: token berurutan bila (sangat tidak mungkin) acak terus bentrok.
  for (let t = TOKEN_MIN; t <= TOKEN_MAX; t++) {
    const token = String(t);
    if (!yangDipakai.has(token)) return token;
  }
  throw new Error('Token habis');
}

/** Membuat struktur ruang kosong. */
export function buatRuang(token, guru, kunci) {
  return {
    token,
    /** Kunci rahasia guru: hanya pemegangnya boleh menjalankan kendali. */
    kunci,
    terkunci: false,
    jeda: false,
    /** ID siswa yang dikeluarkan guru (tidak boleh bergabung lagi). */
    dikeluarkan: new Set(),
    guru: guru || 'Guru',
    dibuatPada: new Date().toISOString(),
    /** Map id-pemain → data siswa. */
    siswa: new Map(),
  };
}

/** Ringkasan progres kosong (dipakai sebelum siswa mengirim progres pertama). */
export function progresKosong(nama, gender) {
  return {
    playerName: nama,
    gender,
    noktah: null,
    bintang: {},
    totalBenar: 0,
    totalSoal: 0,
    visitedNoktah: [],
    puncakLulus: false,
    soalSalah: [],
    diubahPada: new Date().toISOString(),
  };
}
