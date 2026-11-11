/**
 * Deteksi dukungan WebGL, sekali per sesi.
 *
 * Dulu tiap navigasi membuat konteks WebGL baru yang tidak pernah dilepas;
 * di HP RAM kecil konteks yang menumpuk ikut memakan memori GPU. Sekarang
 * konteks uji dibuat sekali, dipakai juga untuk membaca format tekstur
 * terkompresi yang didukung GPU (KTX2), lalu dilepas.
 */

export interface InfoWebgl {
  /** Nama ekstensi WebGL yang didukung (mis. 'WEBGL_compressed_texture_etc'). */
  ekstensi: Set<string>;
  /** Profil ASTC yang didukung ('ldr', 'hdr'). */
  profilAstc: string[];
}

let info: InfoWebgl | null | undefined;

export function infoWebgl(): InfoWebgl | null {
  if (info !== undefined) return info;
  info = null;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (gl) {
      const astc = gl.getExtension('WEBGL_compressed_texture_astc') as { getSupportedProfiles?: () => string[] } | null;
      info = { ekstensi: new Set(gl.getSupportedExtensions() ?? []), profilAstc: astc?.getSupportedProfiles?.() ?? [] };
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    info = null;
  }
  return info;
}

export function isWebGLAvailable(): boolean {
  return infoWebgl() !== null;
}
