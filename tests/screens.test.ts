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

    // Karakter -> atur pakaian.
    const lanjut = Array.from(node.querySelectorAll('button')).find((b) => b.textContent?.includes('Lanjut'));
    lanjut?.dispatchEvent(new MouseEvent('click'));
    expect(node.textContent).toContain('Atur Pakaian');
    expect(node.querySelectorAll('.warna-baris').length).toBe(2); // pria: baju + celana

    // Atur pakaian -> nama.
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

  it('menyimpan warna baju, celana, dan hijab yang dipilih', async () => {
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

    // Langkah warna: perempuan punya 3 baris (baju, gamis, hijab).
    expect(node.textContent).toContain('Atur Pakaian');
    expect(node.querySelectorAll('.warna-baris').length).toBe(3);
    expect(node.querySelectorAll('.warna-baris')[2]?.textContent).toContain('Hijab');

    // Pilih warna terakhir pada tiap baris agar berbeda dari bawaan.
    for (const baris of Array.from(node.querySelectorAll('.warna-baris'))) {
      const opsi = Array.from(baris.querySelectorAll('.warna-tombol'));
      opsi[opsi.length - 1]?.dispatchEvent(new MouseEvent('click'));
    }

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
    expect(p.warnaBaju).toBe(0x3fbfa0);
    expect(p.warnaBawahan).toBe(0x6b4f3a);
    expect(p.warnaHijab).toBe(0x9b6bd6);
  });

  it('pria tidak menampilkan pilihan hijab', async () => {
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
    expect(node.querySelectorAll('.warna-baris').length).toBe(2);
    expect(node.textContent).toContain('Warna Celana');
    expect(node.textContent).not.toContain('Warna Hijab');
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
    expect(langkah.length).toBe(6);
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
