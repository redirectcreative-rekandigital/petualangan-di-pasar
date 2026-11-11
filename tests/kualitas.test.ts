import { describe, it, expect, vi } from 'vitest';
import { perluRingan } from '../src/core/kualitas';

describe('mode ringan', () => {
  it('memutuskan dari URL, perangkat, dan simpanan', () => {
    expect(perluRingan('', { deviceMemory: 2, hardwareConcurrency: 8 }, false)).toBe(true);
    expect(perluRingan('', { deviceMemory: 4, hardwareConcurrency: 8 }, false)).toBe(true);
    expect(perluRingan('', { deviceMemory: 8, hardwareConcurrency: 4 }, false)).toBe(true);
    expect(perluRingan('', { deviceMemory: 8, hardwareConcurrency: 8 }, false)).toBe(false);
    // Safari/iOS tidak melapor deviceMemory: cukup jumlah inti.
    expect(perluRingan('', { hardwareConcurrency: 6 }, false)).toBe(false);
    expect(perluRingan('', { deviceMemory: 8, hardwareConcurrency: 8 }, true)).toBe(true);
    expect(perluRingan('?kualitas=rendah', { deviceMemory: 8, hardwareConcurrency: 8 }, false)).toBe(true);
    expect(perluRingan('?tanpaBayangan=1', { deviceMemory: 8, hardwareConcurrency: 8 }, false)).toBe(true);
    expect(perluRingan('?kualitas=tinggi', { deviceMemory: 2, hardwareConcurrency: 2 }, true)).toBe(false);
  });

  it('turun otomatis bila FPS rendah setelah pemanasan, lalu mengingatnya', async () => {
    vi.resetModules();
    localStorage.clear();
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
    const k = await import('../src/core/kualitas');
    expect(k.modeRingan()).toBe(false);
    const dipanggil = vi.fn();
    k.saatRingan(dipanggil);
    // 60 fps selama 8 detik: tetap kualitas penuh.
    let t = 1000;
    for (let i = 0; i < 480; i++) k.catatFrame((t += 1000 / 60));
    expect(k.modeRingan()).toBe(false);
    // 15 fps selama 8 detik: turun.
    for (let i = 0; i < 120; i++) k.catatFrame((t += 66));
    expect(k.modeRingan()).toBe(true);
    expect(dipanggil).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains('mode-ringan')).toBe(true);
    expect(localStorage.getItem('survival-sains:mode-ringan')).toBe('1');
  });

  it('HP sangat lambat (< 2 fps) tetap terdeteksi', async () => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.classList.remove('mode-ringan');
    const k = await import('../src/core/kualitas');
    let t = 1000;
    for (let i = 0; i < 20; i++) k.catatFrame((t += 650));
    expect(k.modeRingan()).toBe(true);
  });
});
