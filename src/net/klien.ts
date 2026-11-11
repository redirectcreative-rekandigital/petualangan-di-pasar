import type { NoktahId, PlayerGender } from '../../shared/types';
import { SAPAAN_EMOJI } from '../../shared/net';
import type {
  PesanKlien,
  PesanServer,
  KostumPemain,
  PosisiPemain,
  ProgresSiswa,
} from '../../shared/net';
import { t } from '../core/bahasa';

/**
 * Klien jaringan untuk mode multiplayer.
 *
 * Aplikasi tetap bisa dimainkan tanpa server (singleplayer). Klien ini hanya
 * aktif bila pemain memilih "Multiplayer" dan memasukkan token dari guru.
 *
 * Alamat server diambil dari (urutan prioritas):
 *  1. `window.__PASAR_SERVER__` (bisa diisi lewat skrip di index.html),
 *  2. `VITE_PASAR_SERVER` (saat build),
 *  3. origin halaman itu sendiri (bila aplikasi disajikan oleh server yang sama).
 */

export interface OpsiKlien {
  token: string;
  /** ID tetap profil siswa: satu siswa = satu baris di dasbor guru. */
  idSiswa?: string;
  nama: string;
  gender: PlayerGender;
  /** Warna pakaian pilihan (dikirim saat join agar teman melihat tampilan sama). */
  warnaBaju?: number;
  warnaBawahan?: number;
  warnaHijab?: number;
  kostum?: KostumPemain;
  onPemain: (daftar: PosisiPemain[]) => void;
  onKabar?: (teks: string) => void;
  onStatus?: (status: StatusKlien) => void;
}

export type StatusKlien = 'menghubungkan' | 'tersambung' | 'terputus' | 'galat';

declare global {
  interface Window {
    __PASAR_SERVER__?: string;
  }
}

/**
 * Port bawaan server multiplayer (harus sama dengan server/index.mjs).
 * Saat aplikasi disajikan oleh dev server Vite (5173), server multiplayer
 * berjalan terpisah di port ini.
 */
const PORT_SERVER_BAWAAN = 8787;

/**
 * Apakah halaman sedang disajikan oleh dev server Vite (bukan server kita)?
 * Ciri: `import.meta.env.DEV` aktif dan port halaman bukan port server bawaan.
 */
function disajikanViteDev(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  return window.location.port !== String(PORT_SERVER_BAWAAN);
}

/** Menentukan basis URL HTTP server. */
export function serverHttpUrl(): string {
  const override = (typeof window !== 'undefined' && window.__PASAR_SERVER__) || import.meta.env.VITE_PASAR_SERVER;
  if (override) return String(override).replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    // Dev: halaman dari Vite (mis. :5173) -> server multiplayer di :8787.
    if (disajikanViteDev()) {
      return `${window.location.protocol}//${window.location.hostname}:${PORT_SERVER_BAWAAN}`;
    }
    return window.location.origin;
  }
  return '';
}

/** Membuat URL WebSocket dari basis HTTP. */
export function serverWsUrl(): string {
  const base = serverHttpUrl();
  if (!base) return '';
  return base.replace(/^http/, 'ws') + '/ws';
}

/** Apakah fitur online tersedia (alamat server bisa ditentukan). */
export function onlineTersedia(): boolean {
  return serverHttpUrl().length > 0;
}

/** Pesan galat dari server (selalu Bahasa Indonesia) diterjemahkan untuk siswa. */
function pesanServer(p: string): string {
  const peta: Record<string, string> = {
    'Token tidak ditemukan. Minta token yang benar ke gurumu.': t('Token tidak ditemukan. Minta token yang benar ke gurumu.'),
    'Ruang sudah penuh (maksimum 40 siswa).': t('Ruang sudah penuh (maksimum 40 siswa).'),
  };
  return peta[p] ?? p;
}

export class KlienMultiplayer {
  private ws: WebSocket | null = null;
  private opsi: OpsiKlien;
  private selesai = false;
  private antre: string[] = [];

  idSaya = '';
  /** Token ruang yang sedang dipakai (untuk memeriksa koneksi bisa dipakai ulang). */
  tokenSaya = '';
  terakhirPosisi: PosisiPemain[] = [];

  constructor(opsi: OpsiKlien) {
    this.opsi = opsi;
    this.tokenSaya = opsi.token;
    this.hubungkan();
  }

  private hubungkan(): void {
    const url = serverWsUrl();
    if (!url) {
      this.opsi.onStatus?.('galat');
      this.opsi.onKabar?.(t('Mode online belum dikonfigurasi. Bermain sendiri saja, ya.'));
      return;
    }
    this.opsi.onStatus?.('menghubungkan');
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.opsi.onStatus?.('galat');
      return;
    }
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.opsi.onStatus?.('tersambung');
      this.kirim({
        t: 'join',
        token: this.opsi.token,
        idSiswa: this.opsi.idSiswa,
        nama: this.opsi.nama,
        gender: this.opsi.gender,
        warnaBaju: this.opsi.warnaBaju,
        warnaBawahan: this.opsi.warnaBawahan,
        warnaHijab: this.opsi.warnaHijab,
        kostum: this.opsi.kostum,
      });
      for (const teks of this.antre) ws.send(teks);
      this.antre = [];
    });

    ws.addEventListener('message', (ev) => {
      let msg: PesanServer;
      try {
        msg = JSON.parse(String(ev.data)) as PesanServer;
      } catch {
        return;
      }
      if (msg.t === 'selamat') {
        this.idSaya = msg.id;
      } else if (msg.t === 'pemain') {
        // Buang diri sendiri dari daftar yang digambar.
        this.terakhirPosisi = msg.daftar.filter((p) => p.id !== this.idSaya);
        this.opsi.onPemain(this.terakhirPosisi);
      } else if (msg.t === 'galat') {
        this.opsi.onStatus?.('galat');
        this.opsi.onKabar?.(pesanServer(msg.pesan));
      } else if (msg.t === 'kabar') {
        this.opsi.onKabar?.(
          msg.kode === 'nama-ganda'
            ? t('Nama "{nama}" sedang dipakai siswa lain di kelas ini. Minta gurumu memastikan, ya.', { nama: msg.nama ?? '' })
            : msg.teks,
        );
      }
    });

    ws.addEventListener('close', () => {
      if (this.selesai) return;
      this.opsi.onStatus?.('terputus');
    });
    ws.addEventListener('error', () => {
      this.opsi.onStatus?.('terputus');
    });
  }

  private kirim(pesan: PesanKlien): void {
    const teks = JSON.stringify(pesan);
    if (this.ws && this.ws.readyState === 1) this.ws.send(teks);
    else this.antre.push(teks);
  }

  /** Kirim posisi pemain (dipanggil hemat, mis. 8x per detik). */
  kirimPosisi(noktah: NoktahId | null, x: number, z: number, rot: number): void {
    this.kirim({ t: 'pos', noktah, x, z, rot });
  }

  /** Kirim sapaan emoji. */
  kirimSapa(emoji: string): void {
    if (!SAPAAN_EMOJI.includes(emoji as (typeof SAPAAN_EMOJI)[number])) return;
    this.kirim({ t: 'sapa', emoji });
  }

  /** Kirim ringkasan progres (untuk dasbor guru). */
  kirimProgres(progress: ProgresSiswa): void {
    this.kirim({ t: 'progres', progress });
  }

  tutup(): void {
    this.selesai = true;
    this.ws?.close();
    this.ws = null;
  }
}

/** Hasil pengecekan token sebelum siswa bergabung ke kelas. */
export type HasilCekToken = { ok: true; namaDipakai: boolean } | { ok: false; pesan: string };

/** Memastikan token kelas ada & belum penuh, serta apakah nama sedang dipakai. */
export async function cekTokenKelas(token: string, nama: string, idSiswa?: string): Promise<HasilCekToken> {
  const base = serverHttpUrl();
  if (!base) return { ok: false, pesan: t('Mode online belum dikonfigurasi. Bermain sendiri saja, ya.') };
  try {
    const q = new URLSearchParams({ nama, id: idSiswa ?? '' });
    const res = await fetch(`${base}/api/sesi/${encodeURIComponent(token)}/cek?${q.toString()}`);
    if (res.status === 404) return { ok: false, pesan: t('Token tidak ditemukan. Minta token yang benar ke gurumu.') };
    if (!res.ok) return { ok: false, pesan: t('Server kelas sedang bermasalah. Coba lagi sebentar, ya.') };
    const data = (await res.json()) as { penuh?: boolean; namaDipakai?: boolean };
    if (data.penuh) return { ok: false, pesan: t('Ruang sudah penuh (maksimum 40 siswa).') };
    return { ok: true, namaDipakai: Boolean(data.namaDipakai) };
  } catch {
    return { ok: false, pesan: t('Tidak bisa menghubungi server kelas. Periksa internet atau minta gurumu menyalakan server.') };
  }
}

/** Membuat ruang guru lewat REST; mengembalikan token 4 digit. */
export async function buatSesiGuru(guru: string): Promise<{ token: string } | { pesan: string }> {
  const base = serverHttpUrl();
  if (!base) return { pesan: 'Server online belum dikonfigurasi.' };
  try {
    const res = await fetch(`${base}/api/sesi`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ guru }),
    });
    if (!res.ok) return { pesan: `Server menolak (${res.status}).` };
    return (await res.json()) as { token: string };
  } catch {
    return { pesan: 'Tidak bisa menghubungi server. Pastikan server online menyala.' };
  }
}

/** Mengambil data ruang (daftar siswa + progres) untuk dasbor guru. */
export async function ambilSesiGuru(token: string): Promise<
  | { token: string; guru: string; dibuatPada: string; jumlahSiswa: number; siswa: RosterSiswa[] }
  | { pesan: string }
> {
  const base = serverHttpUrl();
  if (!base) return { pesan: 'Server online belum dikonfigurasi.' };
  try {
    const res = await fetch(`${base}/api/sesi/${encodeURIComponent(token)}`);
    if (res.status === 404) return { pesan: 'Sesi tidak ditemukan.' };
    if (!res.ok) return { pesan: `Server menolak (${res.status}).` };
    return await res.json();
  } catch {
    return { pesan: 'Tidak bisa menghubungi server.' };
  }
}

export interface RosterSiswa {
  id: string;
  nama: string;
  gender: PlayerGender;
  online: boolean;
  joinedAt: string;
  lastSeen: string;
  progress: ProgresSiswa;
}
