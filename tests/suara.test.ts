import { describe, it, expect, vi, afterEach } from 'vitest';
import { pilihSuara } from '../src/core/suara';

const suara = (lang: string, name: string): SpeechSynthesisVoice => ({ lang, name, default: false, localService: true, voiceURI: name }) as SpeechSynthesisVoice;

describe('pilihSuara', () => {
  const inggris = suara('en-US', 'Google US English');
  it('mengutamakan suara Google Bahasa Indonesia', () => {
    expect(pilihSuara([inggris, suara('id-ID', 'Lokal ID'), suara('id-ID', 'Google Bahasa Indonesia')], 'id')?.name).toBe('Google Bahasa Indonesia');
  });
  it('mengenali kode lama Android in_ID / in-ID', () => {
    expect(pilihSuara([inggris, suara('in_ID', 'Indonesia lama')], 'id')?.name).toBe('Indonesia lama');
    expect(pilihSuara([suara('in-ID', 'Indonesia')], 'id')?.name).toBe('Indonesia');
  });
  it('tanpa suara Indonesia: null, tidak jatuh ke suara Inggris', () => {
    expect(pilihSuara([inggris, suara('en-GB', 'UK')], 'id')).toBeNull();
    expect(pilihSuara([], 'id')).toBeNull();
  });
  it('kode bahasa lain berawalan "in" (mis. Hindi hi-IN) tidak dianggap Indonesia', () => {
    expect(pilihSuara([suara('hi-IN', 'Hindi'), suara('en-IN', 'India English')], 'id')).toBeNull();
  });
  it('mode Inggris: en-US lebih dulu, tidak memakai suara Indonesia', () => {
    expect(pilihSuara([suara('en-GB', 'UK'), suara('en-US', 'US')], 'en')?.name).toBe('US');
    expect(pilihSuara([suara('id-ID', 'Google Bahasa Indonesia')], 'en')).toBeNull();
  });
});

/** speechSynthesis tiruan: daftar suara bisa kosong dulu lalu muncul (seperti Chrome Android). */
function pasangSintesis(awal: SpeechSynthesisVoice[]): { diucapkan: SpeechSynthesisUtterance[]; isi: (v: SpeechSynthesisVoice[]) => void } {
  let daftar = awal;
  const pendengar: Array<() => void> = [];
  const diucapkan: SpeechSynthesisUtterance[] = [];
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => daftar,
    addEventListener: (_: string, fn: () => void) => pendengar.push(fn),
    cancel: () => {},
    speak: (u: SpeechSynthesisUtterance) => diucapkan.push(u),
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      lang = '';
      voice: SpeechSynthesisVoice | null = null;
      pitch = 1;
      rate = 1;
      constructor(public text: string) {}
    },
  );
  return {
    diucapkan,
    isi: (v) => {
      daftar = v;
      pendengar.splice(0).forEach((fn) => fn());
    },
  };
}

describe('ucapkan', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('menunggu daftar suara yang kosong di awal, lalu bicara dengan suara Indonesia', async () => {
    vi.resetModules();
    const tts = pasangSintesis([]);
    const { ucapkan } = await import('../src/core/suara');
    expect(ucapkan('Halo')).toBe(true);
    expect(tts.diucapkan).toHaveLength(0);
    tts.isi([suara('en-US', 'US'), suara('id-ID', 'Google Bahasa Indonesia')]);
    await Promise.resolve();
    expect(tts.diucapkan).toHaveLength(1);
    expect(tts.diucapkan[0]?.voice?.name).toBe('Google Bahasa Indonesia');
    expect(tts.diucapkan[0]?.lang).toBe('id-ID');
  });

  it('tanpa suara Indonesia: diam, onSelesai tetap dipanggil, pesan dikirim sekali', async () => {
    vi.resetModules();
    const tts = pasangSintesis([suara('en-US', 'US')]);
    const pesan = vi.fn();
    window.addEventListener('suara-tidak-terpasang', pesan);
    const { ucapkan } = await import('../src/core/suara');
    const selesai = vi.fn();
    expect(ucapkan('Halo', { onSelesai: selesai })).toBe(false);
    ucapkan('Halo lagi');
    expect(tts.diucapkan).toHaveLength(0);
    expect(selesai).toHaveBeenCalledTimes(1);
    expect(pesan).toHaveBeenCalledTimes(1);
    window.removeEventListener('suara-tidak-terpasang', pesan);
  });

  it('daftar suara tetap kosong 1,5 detik: dianggap tidak ada, tidak bicara', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const tts = pasangSintesis([]);
    const { ucapkan } = await import('../src/core/suara');
    const selesai = vi.fn();
    ucapkan('Halo', { onSelesai: selesai });
    await vi.advanceTimersByTimeAsync(1600);
    expect(tts.diucapkan).toHaveLength(0);
    expect(selesai).toHaveBeenCalledTimes(1);
  });
});
