import * as THREE from 'three';
import { buatKarakter, type KarakterRig } from '../../world/karakter';
import type { PlayerGender } from '../../../shared/types';

/**
 * Pratinjau 3D kecil untuk layar "Pilih Karakter".
 *
 * Menampilkan model karakter yang berputar perlahan di dalam kartu, supaya
 * pemain melihat wujud aslinya (pria bercelana panjang / perempuan berhijab)
 * alih-alih hanya emoji. Ringan: satu scene kecil, tanpa bayangan, dan loop
 * render berhenti sendiri begitu kanvas dilepas dari DOM.
 */

export interface KarakterPreview {
  canvas: HTMLCanvasElement;
  /** Mengganti model (mis. saat pemain beralih pilihan). */
  setGender: (gender: PlayerGender) => void;
  dispose: () => void;
}

const UKURAN = 160;

/** Bila WebGL tak tersedia (mis. lingkungan uji/gagal), pakai pratinjau kosong. */
function previewKosong(): KarakterPreview {
  const canvas = document.createElement('canvas');
  canvas.width = UKURAN;
  canvas.height = UKURAN;
  canvas.className = 'karakter-preview';
  canvas.setAttribute('aria-hidden', 'true');
  return { canvas, setGender: () => {}, dispose: () => {} };
}

export function createKarakterPreview(gender: PlayerGender): KarakterPreview {
  const canvas = document.createElement('canvas');
  canvas.width = UKURAN;
  canvas.height = UKURAN;
  canvas.className = 'karakter-preview';
  canvas.setAttribute('aria-hidden', 'true');

  let renderer: THREE.WebGLRenderer;
  try {
    // Probe dukungan WebGL di kanvas sementara (jangan di kanvas asli, agar
    // atribut context canva asli ditentukan oleh three.js sendiri).
    const uji = document.createElement('canvas');
    const punyaWebgl = Boolean(uji.getContext('webgl2') ?? uji.getContext('webgl'));
    if (!punyaWebgl) return previewKosong();
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    // Perangkat/lingkungan tanpa WebGL: jangan pernah menggagalkan layar.
    return previewKosong();
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(UKURAN, UKURAN, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 1.5, 4.6);
  camera.lookAt(0, 1.3, 0);

  // Lampu hangat senada tema "Sore Hangat".
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xffd0a0, 1.6);
  sun.position.set(2.5, 5, 3.5);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffe4bd, 0x6b7a4a, 0.7);
  scene.add(hemi);

  let rig: KarakterRig | null = null;

  function pasang(g: PlayerGender): void {
    if (rig) {
      scene.remove(rig.group);
      rig.geometri.forEach((x) => x.dispose());
      rig.material.forEach((x) => x.dispose());
    }
    rig = buatKarakter({ gender: g, pakaiMarker: false });
    rig.group.position.y = 0.1;
    scene.add(rig.group);
  }

  pasang(gender);

  let berjalan = true;
  let mulai = performance.now();

  function frame(): void {
    if (!berjalan) return;
    // Berhenti otomatis bila kanvas sudah tidak di DOM (layar berganti).
    if (!canvas.isConnected) {
      berjalan = false;
      renderer.dispose();
      return;
    }
    const t = (performance.now() - mulai) / 1000;
    if (rig) {
      rig.group.rotation.y = t * 0.6;
      rig.idle(t, 0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    canvas,
    setGender: (g) => {
      pasang(g);
      mulai = performance.now();
    },
    dispose: () => {
      berjalan = false;
      if (rig) {
        rig.geometri.forEach((x) => x.dispose());
        rig.material.forEach((x) => x.dispose());
      }
      renderer.dispose();
    },
  };
}
