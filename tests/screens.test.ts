import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDefaultProgress,
  applyBalaiResult,
  isBalaiUnlocked,
  balaiKey,
  totalStars,
  balaiSelesaiCount,
  isPuncakUnlocked,
} from '../src/core/state';
import { renderTitle } from '../src/ui/screens/title';
import { renderIntro } from '../src/ui/screens/intro';
import { renderMap } from '../src/ui/screens/map';
import { renderHowto } from '../src/ui/screens/howto';
import { renderResult } from '../src/ui/screens/result';
import { renderBalaiResult } from '../src/ui/screens/balaiResult';
import type { ScreenContext } from '../src/ui/screens/context';
import type { Progress } from '../shared/types';

/** Konteks palsu untuk merender layar tanpa router asli. */
function makeCtx(progress: Progress): { ctx: ScreenContext; nav: ReturnType<typeof vi.fn> } {
  const nav = vi.fn();
  const ctx: ScreenContext = {
    navigate: nav,
    getProgress: () => progress,
    setProgress: (p) => {
      Object.assign(progress, p);
    },
    persist: () => {},
    reset: () => progress,
  };
  return { ctx, nav };
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('layar judul', () => {
  it('menampilkan judul, pembuat, jenjang, dan tujuan', () => {
    const progress = createDefaultProgress();
    const { ctx } = makeCtx(progress);
    const node = renderTitle(ctx);
    const text = node.textContent ?? '';
    expect(text).toContain('Petualangan di Pasar');
    expect(text).toContain('Rosyitania Yudha Astari');
    expect(text).toContain('Kelas 6');
    expect(text).toContain('Tujuan Pembelajaran');
  });

  it('tombol Mulai mengarah ke petunjuk saat pertama kali', () => {
    const progress = createDefaultProgress();
    const { ctx, nav } = makeCtx(progress);
    const node = renderTitle(ctx);
    const buttons = node.querySelectorAll('button');
    const mulai = Array.from(buttons).find((b) => b.textContent?.includes('Mulai'));
    mulai?.dispatchEvent(new MouseEvent('click'));
    expect(nav).toHaveBeenCalledWith('howto');
  });
});

describe('layar pembuka (intro)', () => {
  it('menampilkan cover lalu alur karakter dan nama', () => {
    const progress = createDefaultProgress();
    const { ctx, nav } = makeCtx(progress);
    const node = renderIntro(ctx);
    expect(node.textContent).toContain('Petualangan di Pasar');

    // Cover -> pilih karakter.
    const mulai = Array.from(node.querySelectorAll('button')).find((b) => b.textContent?.includes('Mulai Petualangan'));
    mulai?.dispatchEvent(new MouseEvent('click'));
    expect(node.textContent).toContain('Pilih Karakter');
    expect(node.querySelectorAll('.pilih-karakter').length).toBe(2);

    // Karakter -> nama.
    const lanjut = Array.from(node.querySelectorAll('button')).find((b) => b.textContent?.includes('Lanjut'));
    lanjut?.dispatchEvent(new MouseEvent('click'));
    expect(node.textContent).toContain('Nama & Mode Bermain');

    // Isi nama -> memulai ke peta dengan penanda dariIntro.
    const input = node.querySelector<HTMLInputElement>('input.isian');
    if (input) input.value = 'Sari';
    const mulai2 = Array.from(node.querySelectorAll('button')).find((b) => b.textContent?.includes('Mulai Berpetualang'));
    mulai2?.dispatchEvent(new MouseEvent('click'));
    expect(nav).toHaveBeenCalledWith('map', { dariIntro: true });
  });

  it('menyediakan pilihan mode dan minta token saat multiplayer', () => {
    const progress = createDefaultProgress();
    const { ctx, nav } = makeCtx(progress);
    const node = renderIntro(ctx);
    // Masuk ke langkah nama lewat cover -> karakter -> lanjut.
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Mulai Petualangan'))
      ?.dispatchEvent(new MouseEvent('click'));
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Lanjut'))
      ?.dispatchEvent(new MouseEvent('click'));

    // Dua pilihan mode tampil.
    const kartuMode = Array.from(node.querySelectorAll('.mode-kartu'));
    expect(kartuMode.length).toBe(2);
    expect(node.textContent).toContain('Bermain Sendiri');
    expect(node.textContent).toContain('Multiplayer Kelas');
    // Token belum tampil selama mode single.
    expect(node.querySelector('.token-input')).toBeNull();

    // Pilih multiplayer -> input token muncul.
    kartuMode[1]?.dispatchEvent(new MouseEvent('click'));
    expect(node.querySelector('.token-input')).not.toBeNull();

    // Isi nama + token 4 digit -> mulai ke peta.
    const nama = node.querySelector<HTMLInputElement>('input.isian[aria-label="Nama panggilan"]');
    if (nama) nama.value = 'Ani';
    const token = node.querySelector<HTMLInputElement>('.token-input');
    if (token) token.value = '4260';
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Mulai Berpetualang'))
      ?.dispatchEvent(new MouseEvent('click'));
    expect(nav).toHaveBeenCalledWith('map', { dariIntro: true });
    expect(ctx.getProgress().token).toBe('4260');
  });

  it('menolak mulai multipemain bila token belum 4 angka', () => {
    const progress = createDefaultProgress();
    const { ctx, nav } = makeCtx(progress);
    const node = renderIntro(ctx);
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Mulai Petualangan'))
      ?.dispatchEvent(new MouseEvent('click'));
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Lanjut'))
      ?.dispatchEvent(new MouseEvent('click'));
    Array.from(node.querySelectorAll('.mode-kartu'))[1]?.dispatchEvent(new MouseEvent('click'));

    const nama = node.querySelector<HTMLInputElement>('input.isian[aria-label="Nama panggilan"]');
    if (nama) nama.value = 'Ani';
    const token = node.querySelector<HTMLInputElement>('.token-input');
    if (token) token.value = '12';
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Mulai Berpetualang'))
      ?.dispatchEvent(new MouseEvent('click'));
    expect(nav).not.toHaveBeenCalled();
    expect(token?.classList.contains('salah')).toBe(true);
  });
});

describe('peta balai', () => {
  it('nenampilkan 16 kartu noktah + 1 kartu Pasar Ramai', () => {
    const progress = createDefaultProgress();
    const { ctx } = makeCtx(progress);
    const node = renderMap(ctx);
    const cards = node.querySelectorAll<HTMLButtonElement>('.level-card');
    // 16 noktah + 1 kartu Pasar Ramai.
    expect(cards.length).toBe(17);
  });

  it('semua noktah bebas dipilih sejak awal (tanpa penguncian)', () => {
    const progress = createDefaultProgress();
    expect(isBalaiUnlocked(progress, 'B01')).toBe(true);
    expect(isBalaiUnlocked(progress, 'B02')).toBe(true);
    expect(isBalaiUnlocked(progress, 'G08')).toBe(true);
    expect(isBalaiUnlocked(progress, 'D02')).toBe(true);
    // Hanya Pasar Ramai yang masih terkunci sebelum semua noktah dikunjungi.
    expect(isPuncakUnlocked(progress)).toBe(false);
  });

  it('Pasar Ramai terbuka setelah semua 16 noktah PERNAH dikunjungi (aturan A(ii))', () => {
    let progress = createDefaultProgress();
    const kode = [
      'B01', 'B02', 'B03', 'B04', 'B05', 'B06',
      'G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08',
      'D01', 'D02',
    ] as const;
    // Mengunjungi noktah (tanpa harus lulus/minimal 1 bintang) sudah cukup.
    for (const k of kode) progress = applyBalaiResult(progress, k, 0, 3, []);
    expect(progress.visitedNoktah.length).toBe(16);
    expect(isPuncakUnlocked(progress)).toBe(true);
  });
});

describe('petunjuk', () => {
  it('memuat 6 langkah', () => {
    const progress = createDefaultProgress();
    const { ctx } = makeCtx(progress);
    const node = renderHowto(ctx);
    const langkah = node.querySelectorAll('.langkah');
    expect(langkah.length).toBe(6);
  });
});

describe('layar hasil balai', () => {
  it('menampilkan bintang dan tombol lanjut peta saat lulus', () => {
    const progress = createDefaultProgress();
    const { ctx, nav } = makeCtx(progress);
    const node = renderBalaiResult(ctx, { balai: 'B01', correct: 3, total: 3, stars: 3, coins: 30, lulus: true });
    expect(node.textContent).toContain('3 / 3');
    const buttons = Array.from(node.querySelectorAll('button'));
    const lanjut = buttons.find((b) => b.textContent?.includes('Lanjut'));
    lanjut?.dispatchEvent(new MouseEvent('click'));
    expect(nav).toHaveBeenCalledWith('map');
  });
});

describe('layar hasil akhir', () => {
  it('menampilkan sertifikat terkunci sebelum Pasar Ramai lulus', () => {
    const progress = createDefaultProgress();
    const { ctx } = makeCtx(progress);
    const node = renderResult(ctx);
    expect(node.textContent).toContain('Sertifikat Terkunci');
  });

  it('menampilkan sertifikat setelah Pasar Ramai lulus', () => {
    let progress = createDefaultProgress();
    progress = { ...progress, puncakLulus: true, coins: 200 };
    const { ctx } = makeCtx(progress);
    const node = renderResult(ctx);
    expect(node.textContent).toContain('Sertifikat Digital');
    expect(node.textContent).toContain('200 koin');
  });
});

describe('progres balai', () => {
  it('menghitung total bintang dan balai selesai', () => {
    let progress = createDefaultProgress();
    progress = applyBalaiResult(progress, 'B01', 3, 3, []);
    progress = applyBalaiResult(progress, 'B02', 2, 3, []);
    expect(totalStars(progress)).toBe(5);
    expect(progress.balai[balaiKey('B02')]?.stars).toBe(2);
    expect(balaiSelesaiCount(progress)).toBe(2);
  });

  it('Pasar Ramai terbuka setelah semua 16 balai pernah dimainkan', () => {
    let progress = createDefaultProgress();
    const kode = [
      'B01', 'B02', 'B03', 'B04', 'B05', 'B06',
      'G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08',
      'D01', 'D02',
    ] as const;
    for (const k of kode) progress = applyBalaiResult(progress, k, 1, 3, []);
    expect(isPuncakUnlocked(progress)).toBe(true);
  });
});
