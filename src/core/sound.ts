/**
 * Efek suara sederhana memakai Web Audio API (tanpa berkas audio,
 * sehingga tetap ringan dan offline). Ada tombol bisu di HUD.
 */

let ctx: AudioContext | null = null;
let muted = false;

const MUTE_KEY = 'misi-toko-pintar:muted';

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* abaikan jika localStorage diblokir */
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

function getCtx(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  delay?: number;
  gain?: number;
}

function tone({ freq, duration, type = 'sine', delay = 0, gain = 0.12 }: ToneOptions): void {
  const audio = getCtx();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(vol).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export const sfx = {
  click(): void {
    tone({ freq: 520, duration: 0.08, type: 'triangle', gain: 0.08 });
  },
  correct(): void {
    tone({ freq: 660, duration: 0.12, type: 'sine' });
    tone({ freq: 880, duration: 0.16, type: 'sine', delay: 0.1 });
  },
  wrong(): void {
    tone({ freq: 220, duration: 0.2, type: 'sawtooth', gain: 0.09 });
    tone({ freq: 160, duration: 0.22, type: 'sawtooth', delay: 0.08, gain: 0.09 });
  },
  coin(): void {
    tone({ freq: 1040, duration: 0.08, type: 'square', gain: 0.06 });
    tone({ freq: 1320, duration: 0.1, type: 'square', delay: 0.06, gain: 0.06 });
  },
  win(): void {
    [523, 659, 784, 1046].forEach((freq, i) => tone({ freq, duration: 0.18, delay: i * 0.12 }));
  },
  lose(): void {
    [392, 330, 262].forEach((freq, i) => tone({ freq, duration: 0.24, type: 'triangle', delay: i * 0.16 }));
  },
};
