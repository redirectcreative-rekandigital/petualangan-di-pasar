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

