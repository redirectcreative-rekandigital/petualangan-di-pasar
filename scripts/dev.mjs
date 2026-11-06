/**
 * Menjalankan DUA proses sekaligus untuk pengembangan:
 *   1. Server multiplayer (REST + WebSocket) di port 8787.
 *   2. Dev server Vite (hot reload) di port 5173.
 *
 * Frontend mendeteksi bahwa ia disajikan Vite dan otomatis mengarahkan
 * permintaan /api & WebSocket ke port 8787 (lihat src/net/klien.ts).
 *
 * Port bisa diubah lewat lingkungan: PORT (server) dan VITE_PORT (Vite).
 */
import { spawn } from 'node:child_process';

const PORT_SERVER = process.env.PORT || '8787';
const PORT_VITE = process.env.VITE_PORT || '5173';

const anak = [];

function jalankan(nama, perintah, argumen, env = {}, pakaiShell = true) {
  const proc = spawn(perintah, argumen, {
    stdio: 'inherit',
    shell: pakaiShell,
    env: { ...process.env, ...env },
  });
  proc.on('exit', (kode) => {
    // Bila salah satu proses berhenti, hentikan semuanya.
    if (kode !== 0 && kode !== null) {
      console.error(`[dev] ${nama} berhenti (kode ${kode}). Menghentikan proses lain...`);
      berhenti(kode);
    }
  });
  anak.push({ nama, proc });
  return proc;
}

let sedangBerhenti = false;
function berhenti(kode = 0) {
  if (sedangBerhenti) return;
  sedangBerhenti = true;
  for (const { proc } of anak) {
    try {
      proc.kill();
    } catch {
      /* abaikan */
    }
  }
  process.exit(kode);
}

process.on('SIGINT', () => berhenti(0));
process.on('SIGTERM', () => berhenti(0));

console.log(`[dev] Server multiplayer : http://localhost:${PORT_SERVER}`);
console.log(`[dev] Aplikasi (Vite)    : http://localhost:${PORT_VITE}`);
console.log('[dev] Buka alamat Vite di browser. Tekan Ctrl+C untuk berhenti.\n');

jalankan('server', process.execPath, ['server/index.mjs'], { PORT: PORT_SERVER }, false);
jalankan('vite', 'npx', ['vite', '--port', PORT_VITE, '--strictPort'], {}, true);
