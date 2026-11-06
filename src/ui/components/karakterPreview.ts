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
  /** Mengganti warna pakaian tanpa membangun ulang model. */
  setWarna: (warna: WarnaPenampilan) => void;
  dispose: () => void;
}

/** Warna pakaian yang bisa dipratinjau. */
export interface WarnaPenampilan {
  warnaPakaian?: number;
  warnaBawahan?: number;
  warnaHijab?: number;
}

const UKURAN = 240;

/** Bila WebGL tak tersedia (mis. lingkungan uji/gagal), pakai pratinjau kosong. */
function previewKosong(): KarakterPreview {
  const canvas = document.createElement('canvas');
  canvas.width = UKURAN;
  canvas.height = UKURAN;
  canvas.className = 'karakter-preview';
  canvas.setAttribute('aria-hidden', 'true');
  return {
    canvas,
    setGender: () => {},
    setWarna: () => {},
    dispose: () => {},
  };
}

export function createKarakterPreview(gender: PlayerGender, warnaAwal: WarnaPenampilan = {}): KarakterPreview {
  const canvas = document.createElement('canvas');
  canvas.width = UKURAN;
  canvas.height = UKURAN;
  canvas.className = 'karakter-preview';
  // Kanvas pratinjau hanya dipakai untuk menyalin gambar hasil render, jadi
  // pengaturan WebGL bebas dan tidak mengganggu kanvas dunia 3D.
  canvas.setAttribute('aria-hidden', 'true');

  let renderer: THREE.WebGLRenderer;
  try {
    // Probe dukungan WebGL dulu (lingkungan uji jsdom tidak memilikinya).
    const uji = document.createElement('canvas');
    const punyaWebgl = Boolean(uji.getContext('webgl2') ?? uji.getContext('webgl'));
    if (!punyaWebgl) return previewKosong();
    // Renderer lepas (tanpa kanvas terpasang). Kanvas WebGL bawaan three.js
    // sudah dibuat dengan `alpha: true`, `antialias: true`, dan
    // `premultipliedAlpha: false` — kombinasi yang membuat latar transparan
    // tampil benar saat digambar di atas latar CSS. Hasil render disalin ke
    // kanvas 2D biasa, sehingga tidak ada masalah dengan konteks WebGL statis.
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(UKURAN, UKURAN, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
  } catch {
    // Perangkat/lingkungan tanpa WebGL: jangan pernah menggagalkan layar.
    return previewKosong();
  }
  const ctx2d = canvas.getContext('2d');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);
  camera.position.set(0, 1.45, 4.2);
  camera.lookAt(0, 1.25, 0);

  // Lampu hangat senada tema "Sore Hangat".
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const sun = new THREE.DirectionalLight(0xffe0b8, 2.2);
  sun.position.set(2.5, 5, 3.5);
  scene.add(sun);
  // Cahaya isi dari sisi seberang agar sisi gelap karakter tidak pekat.
  const isi = new THREE.DirectionalLight(0xcfe4ff, 0.6);
  isi.position.set(-3, 2, -2);
  scene.add(isi);
  const hemi = new THREE.HemisphereLight(0xffe4bd, 0x6b7a4a, 0.85);
  scene.add(hemi);

  let rig: KarakterRig | null = null;
  let genderKini: PlayerGender = gender;
  let warnaKini: WarnaPenampilan = {
    warnaPakaian: warnaAwal.warnaPakaian,
    warnaBawahan: warnaAwal.warnaBawahan,
    warnaHijab: warnaAwal.warnaHijab,
  };

  function buangRig(): void {
    if (!rig) return;
    scene.remove(rig.group);
    rig.geometri.forEach((x) => x.dispose());
    rig.material.forEach((x) => x.dispose());
    rig = null;
  }

  function pasang(g: PlayerGender): void {
    genderKini = g;
    buangRig();
    rig = buatKarakter({
      gender: g,
      warnaPakaian: warnaKini.warnaPakaian,
      warnaBawahan: warnaKini.warnaBawahan,
      warnaHijab: warnaKini.warnaHijab,
      pakaiMarker: false,
    });
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
      renderer.forceContextLoss();
      return;
    }
    const t = (performance.now() - mulai) / 1000;
    if (rig) {
      rig.group.rotation.y = t * 0.6;
      rig.idle(t, 0);
    }
    renderer.render(scene, camera);
    // Salin hasil render ke kanvas 2D. Latar kanvas WebGL dibersihkan dengan
    // transparan penuh, dan `clearRect` menjaga sisa frame lama tidak tertinggal.
    if (ctx2d) {
      ctx2d.clearRect(0, 0, UKURAN, UKURAN);
      ctx2d.drawImage(renderer.domElement, 0, 0, UKURAN, UKURAN);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    canvas,
    setGender: (g) => {
      pasang(g);
      mulai = performance.now();
    },
    setWarna: (warna) => {
      warnaKini = {
        warnaPakaian: warna.warnaPakaian,
        warnaBawahan: warna.warnaBawahan,
        warnaHijab: warna.warnaHijab,
      };
      // Bangun ulang model: ukurannya kecil, jadi biayanya sepele dan pasti benar.
      buangRig();
      rig = buatKarakter({
        gender: genderKini,
        warnaPakaian: warnaKini.warnaPakaian,
        warnaBawahan: warnaKini.warnaBawahan,
        warnaHijab: warnaKini.warnaHijab,
        pakaiMarker: false,
      });
      rig.group.position.y = 0.1;
      scene.add(rig.group);
      mulai = performance.now();
    },
    dispose: () => {
      berjalan = false;
      if (rig) {
        rig.geometri.forEach((x) => x.dispose());
        rig.material.forEach((x) => x.dispose());
      }
      renderer.dispose();
      // Lepas konteks WebGL agar tidak menumpuk (browser membatasi jumlah
      // konteks aktif; pratinjau dibuat ulang setiap kali layar digambar).
      renderer.forceContextLoss();
    },
  };
}
