import { muatKamus } from './core/bahasa';

/**
 * Titik masuk: kamus bahasa (bila English) dimuat dulu, baru game. Banyak
 * modul memanggil `t()` saat diimpor, jadi main.ts harus menunggu kamus.
 */
await muatKamus();
await import('./main');
