// @vitest-environment node
/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any -- tes server Node murni; tsconfig proyek hanya untuk kode browser (tanpa tipe Node/ws). */
// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import WebSocket from 'ws';

const PORT = 18787;
const BASE = `http://127.0.0.1:${PORT}`;

const post = async (path: string, body: unknown): Promise<{ status: number; data: any }> => {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
};

/** Siswa tiruan: simpan semua pesan server yang diterima. */
function siswa(token: string, id: string, nama: string): Promise<{ pesan: any[]; ws: WebSocket }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    const pesan: any[] = [];
    ws.on('message', (m) => pesan.push(JSON.parse(String(m))));
    ws.on('open', () => {
      ws.send(JSON.stringify({ t: 'join', token, idSiswa: id, nama, gender: 'laki-laki' }));
      setTimeout(() => resolve({ pesan, ws }), 150);
    });
  });
}
const tunggu = (ms = 150) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  process.env.PORT = String(PORT);
  await import('../server/index.mjs');
});

describe('kendali guru di server', () => {
  it('kendali ditolak tanpa kunci guru yang benar', async () => {
    const { data } = await post('/api/sesi', { guru: 'Bu Guru' });
    expect(data.kunci).toMatch(/^[0-9a-f]{32}$/);
    const r = await post(`/api/sesi/${data.token}/kendali`, { kunci: 'salah', aksi: 'jeda', nilai: true });
    expect(r.status).toBe(403);
    // Kunci tidak bocor lewat dasbor yang terbuka dengan token.
    const buka = await (await fetch(`${BASE}/api/sesi/${data.token}`)).json();
    expect(JSON.stringify(buka)).not.toContain(data.kunci);
  });

  it('jeda, pengumuman, kunci kelas, ubah nama, dan keluarkan', async () => {
    const { data } = await post('/api/sesi', { guru: 'Bu Guru' });
    const { token, kunci } = data;
    const a = await siswa(token, 's-aaaaaaaa', 'Ani');
    const k = (aksi: string, ekstra: object = {}) => post(`/api/sesi/${token}/kendali`, { kunci, aksi, ...ekstra });

    await k('jeda', { nilai: true });
    await k('umum', { teks: '5 menit lagi' });
    await tunggu();
    expect(a.pesan).toContainEqual({ t: 'jeda', nilai: true });
    expect(a.pesan).toContainEqual({ t: 'umum', teks: '5 menit lagi' });

    // Siswa baru yang bergabung saat jeda langsung dijeda.
    const b = await siswa(token, 's-bbbbbbbb', 'Budi');
    expect(b.pesan).toContainEqual({ t: 'jeda', nilai: true });

    // Kelas dikunci: siswa baru ditolak, yang lama tetap boleh masuk lagi.
    await k('kunci', { nilai: true });
    const c = await siswa(token, 's-cccccccc', 'Cici');
    expect(c.pesan.find((m) => m.t === 'galat')?.pesan).toMatch(/dikunci/);
    const aLagi = await siswa(token, 's-aaaaaaaa', 'Ani');
    expect(aLagi.pesan.some((m) => m.t === 'selamat')).toBe(true);

    // Ubah nama bertahan walau siswa bergabung lagi.
    await k('nama', { id: 's-bbbbbbbb', nama: 'Budi S' });
    const b2 = await siswa(token, 's-bbbbbbbb', 'Budi');
    const roster = await (await fetch(`${BASE}/api/sesi/${token}`)).json();
    expect(roster.siswa.find((s: any) => s.id === 's-bbbbbbbb').nama).toBe('Budi S');
    expect(roster.terkunci).toBe(true);
    expect(roster.jeda).toBe(true);

    // Keluarkan: diberi tahu, dihapus dari daftar, dan tidak bisa masuk lagi.
    await k('keluarkan', { id: 's-bbbbbbbb' });
    await tunggu();
    expect(b2.pesan).toContainEqual({ t: 'dikeluarkan' });
    await k('kunci', { nilai: false });
    const bLagi = await siswa(token, 's-bbbbbbbb', 'Budi');
    expect(bLagi.pesan.find((m) => m.t === 'galat')?.pesan).toMatch(/dikeluarkan/);

    // Akhiri sesi: semua diberi tahu, ruang hilang.
    await k('akhiri');
    await tunggu();
    expect(aLagi.pesan).toContainEqual({ t: 'selesai' });
    expect((await fetch(`${BASE}/api/sesi/${token}`)).status).toBe(404);
  });

  it('pemulihan: token + kunci lama membangun ulang ruang beserta siswanya', async () => {
    const kunci = 'a'.repeat(32);
    const progress = { playerName: 'Ani', gender: 'perempuan', bintang: { F01: 2 }, nilai: { balai: { F01: 2 }, final: null, akhir: 20 } };
    const { data } = await post('/api/sesi', {
      guru: 'Bu Guru', token: '4321', kunci,
      siswa: [{ id: 's-aaaaaaaa', nama: 'Ani', gender: 'perempuan', progress }, { id: 'bukan-id', nama: 'X' }],
    });
    expect(data.token).toBe('4321');
    expect(data.kunci).toBe(kunci);
    const roster = await (await fetch(`${BASE}/api/sesi/4321`)).json();
    expect(roster.siswa).toHaveLength(1);
    expect(roster.siswa[0].online).toBe(false);
    expect(roster.siswa[0].progress.nilai.akhir).toBe(20);
    // Kunci dari pemulihan berlaku untuk kendali.
    expect((await post('/api/sesi/4321/kendali', { kunci, aksi: 'kunci', nilai: true })).status).toBe(200);
    // Pemulihan dengan kunci salah tidak merebut ruang yang sudah ada.
    const rebut = await post('/api/sesi', { guru: 'Penyusup', token: '4321', kunci: 'b'.repeat(32) });
    expect(rebut.data.token).not.toBe('4321');
  });
});
