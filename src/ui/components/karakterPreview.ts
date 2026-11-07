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
  /**
   * Pose adegan (opsional): `jalan` mengayun kaki & tangan, `arah` = sudut
   * hadap (radian; 0 = menghadap layar, +π/2 = menghadap kanan). `null`
   * kembali ke goyang pelan bawaan.
   */
  setPose?: (pose: { jalan: boolean; arah: number } | null) => void;
  dispose: () => void;
}

/** Warna pakaian yang bisa dipratinjau. */
export interface WarnaPenampilan {
  warnaPakaian?: number;
  warnaBawahan?: number;
  warnaHijab?: number;
}

/** Kanvas potret (lebih tinggi daripada lebar) agar badan utuh dari kepala sampai kaki. */
const LEBAR = 240;
const TINGGI = 340;
/** Jarak longgar di atas kepala & bawah kaki (1 = pas, 1.2 = lega 20%). */
const LONGGAR = 1.18;

/** Bila WebGL tak tersedia (mis. lingkungan uji/gagal), pakai pratinjau kosong. */
function previewKosong(): KarakterPreview {
  const canvas = document.createElement('canvas');
  canvas.width = LEBAR;
  canvas.height = TINGGI;
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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(LEBAR * dpr);
  const H = Math.round(TINGGI * dpr);
  canvas.width = W;
  canvas.height = H;
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
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
  } catch {
    // Perangkat/lingkungan tanpa WebGL: jangan pernah menggagalkan layar.
    return previewKosong();
  }
  const ctx2d = canvas.getContext('2d');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, LEBAR / TINGGI, 0.1, 50);

  /**
   * Arahkan kamera agar seluruh model (kepala, hijab, sampai kaki) masuk bingkai.
   * Memakai kotak batas model, jadi tetap pas walau tinggi karakter berbeda.
   */
  function bingkai(obj: THREE.Object3D): void {
    const kotak = new THREE.Box3().setFromObject(obj);
    const ukuran = kotak.getSize(new THREE.Vector3());
    const pusat = kotak.getCenter(new THREE.Vector3());
    const fovV = THREE.MathUtils.degToRad(camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
    // Lebar memakai diagonal tapak agar tangan tidak terpotong saat berputar.
    const lebar = Math.hypot(ukuran.x, ukuran.z);
    const jarakV = (ukuran.y * LONGGAR) / 2 / Math.tan(fovV / 2);
    const jarakH = (lebar * LONGGAR) / 2 / Math.tan(fovH / 2);
    const jarak = Math.max(jarakV, jarakH) + lebar / 2;
    camera.position.set(0, pusat.y + ukuran.y * 0.04, pusat.z + jarak);
    camera.lookAt(0, pusat.y, pusat.z);
  }

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
    bingkai(rig.group);
  }

  pasang(gender);

  let berjalan = true;
  let mulai = performance.now();
  let pose: { jalan: boolean; arah: number } | null = null;
  let terakhirGambar = 0;

  function frame(): void {
    if (!berjalan) return;
    // Berhenti otomatis bila kanvas sudah tidak di DOM (layar berganti).
    if (!canvas.isConnected) {
      berjalan = false;
      renderer.dispose();
      renderer.forceContextLoss();
      return;
    }
    // Batasi ±30 fps: tiap frame disalin dari WebGL ke kanvas 2D (cukup berat di HP murah).
    const kini = performance.now();
    if (kini - terakhirGambar < 32) {
      requestAnimationFrame(frame);
      return;
    }
    terakhirGambar = kini;
    const t = (kini - mulai) / 1000;
    if (rig && pose) {
      // Pose adegan: putar halus ke arah tujuan, lalu jalan atau diam bernapas.
      let beda = pose.arah - rig.group.rotation.y;
      while (beda > Math.PI) beda -= Math.PI * 2;
      while (beda < -Math.PI) beda += Math.PI * 2;
      rig.group.rotation.y += beda * 0.18;
      if (pose.jalan) {
        // Ayunan ±45°: langkah wajar (nilai besar membuat kaki mengangkang).
        rig.langkah(1.4, t);
      } else {
        // Berhenti: kaki & tangan kembali lurus perlahan, lalu bernapas.
        for (const bagian of [rig.kakiKiri, rig.kakiKanan, rig.lenganKiri, rig.lenganKanan]) bagian.rotation.x *= 0.8;
        rig.idle(t, 0);
      }
    } else if (rig) {
      // Bergoyang pelan kiri-kanan (±40°) agar wajah selalu menghadap pemain,
      // bukan berputar penuh yang sering memperlihatkan punggung.
      rig.group.rotation.y = Math.sin(t * 0.7) * 0.7;
      rig.idle(t, 0);
    }
    renderer.render(scene, camera);
    // Salin hasil render ke kanvas 2D. Latar kanvas WebGL dibersihkan dengan
    // transparan penuh, dan `clearRect` menjaga sisa frame lama tidak tertinggal.
    if (ctx2d) {
      ctx2d.clearRect(0, 0, W, H);
      ctx2d.drawImage(renderer.domElement, 0, 0, W, H);
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
      bingkai(rig.group);
      mulai = performance.now();
    },
    setPose: (p) => {
      pose = p;
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
