/**
 * Deteksi dukungan WebGL dan pengukuran fps (PRD v2 bagian 8.3).
 */

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** Mengukur fps rata-rata selama durasi tertentu memakai requestAnimationFrame. */
export function measureFps(durationMs: number): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = (): void => {
      frames += 1;
      const now = performance.now();
      if (now - start >= durationMs) {
        resolve((frames / (now - start)) * 1000);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
