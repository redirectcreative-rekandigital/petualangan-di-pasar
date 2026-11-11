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
import { renderIntro } from '../src/ui/screens/intro';
import { renderMap } from '../src/ui/screens/map';
import { renderHowto } from '../src/ui/screens/howto';
import { renderResult } from '../src/ui/screens/result';
import { warnaBalai } from '../src/data/balai';
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

/** Melewati cutscene badai yang muncul setelah nama & mode dipilih (tombol "Mulai Bertahan Hidup"). */
async function lewatiCutscene(): Promise<void> {
  const lewati = Array.from(document.body.querySelectorAll('.cut-overlay button')).find((b) => b.textContent?.includes('Lewati'));
  (lewati as HTMLButtonElement | undefined)?.click();
  await Promise.resolve();
  await Promise.resolve();
}

describe('layar pembuka (intro)', async () => {
  it('menampilkan cover lalu alur karakter dan nama', async () => {
    const progress = createDefaultProgress();
    const { ctx, nav } = makeCtx(progress);
    const node = renderIntro(ctx);
    expect(node.textContent).toContain('Survival Sains');

    // Cover -> pilih karakter.
    const mulai = Array.from(node.querySelectorAll('button')).find((b) => b.textContent?.includes('Mulai Petualangan'));
    mulai?.dispatchEvent(new MouseEvent('click'));
    // Cerita belum diputar: pemain memilih karakter & nama dulu.
    expect(document.body.querySelector('.cut-overlay')).toBeNull();
    expect(node.textContent).toContain('Kartu Anggota Ekspedisi');
    expect(node.querySelectorAll('.pilih-karakter').length).toBe(2);

    // Karakter -> atur kostum (8 gaya + 6 bagian berwarna).
    const lanjut = Array.from(node.querySelectorAll('button')).find((b) => b.textContent?.includes('Lanjut'));
    lanjut?.dispatchEvent(new MouseEvent('click'));
    expect(node.textContent).toContain('Atur Kostum');
    expect(node.querySelectorAll('.kostum-preset').length).toBe(8);
    expect(node.querySelectorAll('.kostum-bagian').length).toBe(6);

    // Atur kostum -> nama.
    const lanjut2 = Array.from(node.querySelectorAll('button')).find((b) => b.textContent?.includes('Lanjut'));
    lanjut2?.dispatchEvent(new MouseEvent('click'));
    expect(node.textContent).toContain('Nama & Mode Bermain');

    // Isi nama -> prolog: pemain terbangun di dalam balai pertama (Goa Sinar).
    const input = node.querySelector<HTMLInputElement>('input.isian');
    if (input) input.value = 'Sari';
    const mulai2 = Array.from(node.querySelectorAll('button')).find((b) => b.textContent?.includes('Mulai Bertahan'));
    mulai2?.dispatchEvent(new MouseEvent('click'));
    // Baru sekarang cerita badai diputar, lalu masuk balai pertama.
    expect(document.body.querySelector('.cut-overlay')).not.toBeNull();
    expect(nav).not.toHaveBeenCalled();
    await lewatiCutscene();
    await new Promise((r) => setTimeout(r, 1300));
    expect(nav).toHaveBeenCalledWith('noktah', { noktah: 'F01', prolog: true });
  });

  it('menyediakan pilihan mode dan minta token saat multiplayer', async () => {
    const progress = createDefaultProgress();
    const { ctx, nav } = makeCtx(progress);
    const node = renderIntro(ctx);
    // Masuk ke langkah nama lewat cover -> karakter -> atur pakaian -> nama.
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Mulai Petualangan'))
      ?.dispatchEvent(new MouseEvent('click'));
    await lewatiCutscene();
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Lanjut'))
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
      .find((b) => b.textContent?.includes('Mulai Bertahan'))
      ?.dispatchEvent(new MouseEvent('click'));
    await lewatiCutscene();
    await new Promise((r) => setTimeout(r, 1300));
    expect(nav).toHaveBeenCalledWith('noktah', { noktah: 'F01', prolog: true });
    expect(ctx.getProgress().token).toBe('4260');
  });

  it('menolak mulai multipemain bila token belum 4 angka', async () => {
    const progress = createDefaultProgress();
    const { ctx, nav } = makeCtx(progress);
    const node = renderIntro(ctx);
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Mulai Petualangan'))
      ?.dispatchEvent(new MouseEvent('click'));
    await lewatiCutscene();
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Lanjut'))
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
      .find((b) => b.textContent?.includes('Mulai Bertahan'))
      ?.dispatchEvent(new MouseEvent('click'));
    expect(nav).not.toHaveBeenCalled();
    expect(node.querySelector<HTMLInputElement>('.token-input')?.classList.contains('salah')).toBe(true);
  });

  it('menyimpan kostum (gaya + warna per bagian) yang dipilih', async () => {
    const progress = createDefaultProgress();
    const { ctx, nav } = makeCtx(progress);
    const node = renderIntro(ctx);
    // Cover -> karakter perempuan.
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Mulai Petualangan'))
      ?.dispatchEvent(new MouseEvent('click'));
    await lewatiCutscene();
    Array.from(node.querySelectorAll('.pilih-karakter'))[1]?.dispatchEvent(new MouseEvent('click'));
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Lanjut'))
      ?.dispatchEvent(new MouseEvent('click'));

    // Langkah kostum perempuan: 8 gaya, 6 bagian (termasuk Kerudung).
    expect(node.textContent).toContain('Atur Kostum');
    expect(node.querySelectorAll('.kostum-preset').length).toBe(8);
    expect(node.querySelector('.kostum-bagian[data-bagian="kerudung"]')?.textContent).toContain('Kerudung');
    // Bawaan: Krem Klasik terpilih, tombol reset tersembunyi.
    expect(node.querySelector('.kostum-preset.dipilih')?.textContent).toContain('Krem Klasik');
    expect(node.querySelector<HTMLButtonElement>('.kostum-reset')?.hidden).toBe(true);

    // Pilih gaya Hijau Mint, lalu ganti warna kerudung (swatch terakhir: Abu).
    Array.from(node.querySelectorAll('.kostum-preset'))
      .find((b) => b.textContent?.includes('Hijau Mint'))
      ?.dispatchEvent(new MouseEvent('click'));
    const kerudung = Array.from(node.querySelectorAll('.kostum-bagian[data-bagian="kerudung"] .kostum-swatch'));
    kerudung[kerudung.length - 1]?.dispatchEvent(new MouseEvent('click'));
    expect(kerudung[kerudung.length - 1]?.classList.contains('dipilih')).toBe(true);
    expect(node.querySelector('.kostum-preset.dipilih')?.textContent).toContain('Hijau Mint');
    expect(node.querySelector<HTMLButtonElement>('.kostum-reset')?.hidden).toBe(false);

    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Lanjut'))
      ?.dispatchEvent(new MouseEvent('click'));
    const nama = node.querySelector<HTMLInputElement>('input.isian[aria-label="Nama panggilan"]');
    if (nama) nama.value = 'Ani';
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Mulai Bertahan'))
      ?.dispatchEvent(new MouseEvent('click'));
    await lewatiCutscene();

    await new Promise((r) => setTimeout(r, 1300));
    expect(nav).toHaveBeenCalledWith('noktah', { noktah: 'F01', prolog: true });
    const p = ctx.getProgress();
    expect(p.gender).toBe('perempuan');
    expect(p.kostum).toEqual({ preset: 'hijau-mint', warna: { kerudung: '#b9bcc2' } });
    // Warna turunan untuk karakter prosedural (cadangan, ikon peta, teman kelas).
    expect(p.warnaBaju).toBe(0xe5f6ee);
    expect(p.warnaBawahan).toBe(0x2f5a4a);
    expect(p.warnaHijab).toBe(0xb9bcc2);
  });

  it('pria tidak menampilkan pilihan kerudung', async () => {
    const progress = createDefaultProgress();
    const { ctx } = makeCtx(progress);
    const node = renderIntro(ctx);
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Mulai Petualangan'))
      ?.dispatchEvent(new MouseEvent('click'));
    await lewatiCutscene();
    Array.from(node.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Lanjut'))
      ?.dispatchEvent(new MouseEvent('click'));
    expect(node.querySelectorAll('.kostum-bagian').length).toBe(6);
    expect(node.textContent).toContain('Celana');
    expect(node.textContent).toContain('Peci');
    expect(node.textContent).not.toContain('Kerudung');
  });
});

describe('peta balai', () => {
  it('menampilkan 11 kartu balai + 1 kartu Mercusuar', () => {
    const progress = createDefaultProgress();
    const { ctx } = makeCtx(progress);
    const node = renderMap(ctx);
    const cards = node.querySelectorAll<HTMLButtonElement>('.level-card');
    // 11 noktah + 1 kartu Menara Kitab.
    expect(cards.length).toBe(12);
  });

  it('balai terbuka berurutan mengikuti bab (hanya Goa Sinar di awal)', () => {
    const progress = createDefaultProgress();
    expect(isBalaiUnlocked(progress, 'F01')).toBe(true);
    expect(isBalaiUnlocked(progress, 'F02')).toBe(false);
    expect(isBalaiUnlocked(progress, 'H01')).toBe(false);
    expect(isPuncakUnlocked(progress)).toBe(false);
    const node = renderMap(makeCtx(progress).ctx);
    const terbuka = node.querySelectorAll('.level-card.terbuka');
    expect(terbuka.length).toBe(1);
  });

  it('mengunjungi tanpa lulus tidak membuka Mercusuar', () => {
    let progress = createDefaultProgress();
    for (const k of ['F01', 'F02', 'H01', 'H02', 'H03', 'H04', 'F03', 'F04', 'E01', 'E02', 'E03'] as const) {
      progress = applyBalaiResult(progress, k, 0, 3, []);
    }
    expect(isPuncakUnlocked(progress)).toBe(false);
  });
});

describe('petunjuk', () => {
  it('memuat 6 langkah', () => {
    const progress = createDefaultProgress();
    const { ctx } = makeCtx(progress);
    const node = renderHowto(ctx);
    const langkah = node.querySelectorAll('.langkah');
    expect(langkah.length).toBe(7);
  });
});

describe('warna balai', () => {
  it('tiap balai punya warna aksen berbeda', () => {
    const aksen = (kode: string) => warnaBalai(kode);
    expect(new Set([aksen('H01'), aksen('F03'), aksen('E03')]).size).toBe(3);
  });
});

describe('layar hasil akhir', () => {
  it('menampilkan sertifikat terkunci sebelum Final lulus', () => {
    const progress = createDefaultProgress();
    const { ctx } = makeCtx(progress);
    const node = renderResult(ctx);
    expect(node.textContent).toContain('Sertifikat Terkunci');
  });

  it('menampilkan sertifikat setelah Final lulus', () => {
    let progress = createDefaultProgress();
    progress = { ...progress, puncakLulus: true };
    const { ctx } = makeCtx(progress);
    const node = renderResult(ctx);
    expect(node.textContent).toContain('Sertifikat Digital');
    expect(node.textContent).toContain('Penyintas Sains');
  });
});

describe('progres balai', () => {
  it('menghitung total bintang dan balai selesai', () => {
    let progress = createDefaultProgress();
    progress = applyBalaiResult(progress, 'H01', 3, 3, []);
    progress = applyBalaiResult(progress, 'H02', 2, 3, []);
    expect(totalStars(progress)).toBe(5);
    expect(progress.balai[balaiKey('H02')]?.stars).toBe(2);
    expect(balaiSelesaiCount(progress)).toBe(2);
  });

  it('Mercusuar Tua terbuka setelah semua 11 balai lulus', () => {
    let progress = createDefaultProgress();
    const kode = ['F01', 'F02', 'H01', 'H02', 'H03', 'H04', 'F03', 'F04', 'E01', 'E02', 'E03'] as const;
    for (const k of kode) progress = applyBalaiResult(progress, k, 1, 3, []);
    expect(isPuncakUnlocked(progress)).toBe(true);
  });
});
