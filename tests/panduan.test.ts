import { describe, it, expect } from 'vitest';
import { createDefaultProgress, mergeProgress, sudahPanduan, tandaiPanduan, ulangPanduan } from '../src/core/state';
import { langkahPanduan, putarPanduan } from '../src/ui/panduan';

describe('panduan awal: status per siswa', () => {
  it('belum dilihat → ditandai sekali → diulang', () => {
    let p = createDefaultProgress('Ani');
    expect(sudahPanduan(p, 'balai')).toBe(false);
    p = tandaiPanduan(p, 'balai');
    expect(tandaiPanduan(p, 'balai')).toBe(p); // menandai dua kali tidak menggandakan
    expect(sudahPanduan(p, 'balai')).toBe(true);
    expect(sudahPanduan(p, 'peta')).toBe(false);
    expect(ulangPanduan(p).panduan).toEqual([]);
  });

  it('progres lama tanpa field panduan tetap terbaca (belum dilihat)', () => {
    const lama = mergeProgress({ playerName: 'Budi', introDone: true });
    expect(lama.panduan).toEqual([]);
  });
});

describe('panduan awal: isi langkah', () => {
  it('langkah 😊 Sapa hanya ikut saat Multiplayer Kelas', () => {
    const sendiri = langkahPanduan('balai');
    const online = langkahPanduan('balai', { online: true });
    expect(online.length).toBe(sendiri.length + 1);
    expect(online.some((l) => l.target === '.btn-action.sapa')).toBe(true);
    expect(sendiri.some((l) => l.target === '.btn-action.sapa')).toBe(false);
    for (const id of ['peta', 'uji', 'mercusuar', 'sapa'] as const) expect(langkahPanduan(id).length).toBeGreaterThan(0);
  });

  it('Oke maju per langkah, lalu overlay hilang', async () => {
    const selesai = putarPanduan([{ teks: 'satu' }, { teks: 'dua' }]);
    const oke = (): HTMLButtonElement => document.querySelector('.panduan-aksi .btn:not(.ghost)') as HTMLButtonElement;
    expect(document.querySelector('.panduan-teks')?.textContent).toBe('satu');
    expect(oke().textContent).toContain('1/2');
    oke().click();
    expect(document.querySelector('.panduan-teks')?.textContent).toBe('dua');
    oke().click();
    await selesai;
    expect(document.querySelector('.panduan-overlay')).toBeNull();
  });

  it('Lewati panduan menutup semuanya', async () => {
    const selesai = putarPanduan([{ teks: 'a' }, { teks: 'b' }, { teks: 'c' }]);
    (document.querySelector('.panduan-aksi .ghost') as HTMLButtonElement).click();
    await selesai;
    expect(document.querySelector('.panduan-overlay')).toBeNull();
  });
});
