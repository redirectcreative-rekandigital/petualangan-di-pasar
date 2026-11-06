/**
 * Konstanta protokol bersama yang dipakai server Node (JavaScript murni).
 * Sisi frontend memakai tipe di `shared/net.ts`; nilai runtime yang sama
 * dijaga agar sinkron di sini.
 */

export const SAPAAN_EMOJI = ['👋', '👍', '😀', '🎉', '❤️', '🙌'];

/** Batas jumlah pemain per ruang. */
export const MAKS_PEMAIN_PER_RUANG = 40;

/** Panjang token (angka saja). */
export const PANJANG_TOKEN = 4;
