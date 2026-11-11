import * as THREE from 'three';

/**
 * Kamera orang ketiga dengan orbit (PRD v2 3D-03).
 * Kamera mengikuti pemain, sudut vertikal dibatasi agar tidak menembus tanah.
 */

/** Bidikan tetap (mis. saat percakapan), di luar orbit normal. */
export interface FokusKamera {
  posisi: THREE.Vector3;
  lihat: THREE.Vector3;
}

export type ModeKamera = 'normal' | 'dekat' | 'tangan';

const URUTAN_MODE: ModeKamera[] = ['normal', 'dekat', 'tangan'];
const KUNCI_MODE = 'ksp.kamera.v1';

export function modeBerikut(mode: ModeKamera): ModeKamera {
  return URUTAN_MODE[(URUTAN_MODE.indexOf(mode) + 1) % URUTAN_MODE.length] ?? 'normal';
}

/** Mode kamera tersimpan di perangkat; `normal` bila belum ada atau datanya asing. */
export function muatModeKamera(): ModeKamera {
  try {
    const nilai = localStorage.getItem(KUNCI_MODE);
    return URUTAN_MODE.find((m) => m === nilai) ?? 'normal';
  } catch {
    return 'normal'; // mode privat / tanpa localStorage
  }
}

export function simpanModeKamera(mode: ModeKamera): void {
  try {
    localStorage.setItem(KUNCI_MODE, mode);
  } catch {
    /* mode privat / kuota penuh: pilihan hanya berlaku sampai bab ditutup */
  }
}

/**
 * Titik dunia hasil `project()` menjadi piksel layar, dijepit agar tombol tetap
 * terlihat: titik di belakang kamera didorong ke tepi. Batasnya memberi ruang
 * untuk kartu kiri atas, joystick, dan lingkaran tombol kanan bawah.
 */
export function titikKeLayar(ndc: THREE.Vector3, lebar: number, tinggi: number): { x: number; y: number } {
  let { x, y } = ndc;
  if (ndc.z > 1) {
    const k = 1 / Math.max(Math.abs(x), Math.abs(y), 1e-3);
    x *= -k;
    y *= -k;
  }
  return {
    x: THREE.MathUtils.clamp(((x + 1) / 2) * lebar, 130, lebar - 130),
    y: THREE.MathUtils.clamp(((1 - y) / 2) * tinggi, 80, tinggi - 240),
  };
}

export interface CameraController {
  camera: THREE.PerspectiveCamera;
  /** Menggeser kamera (orbit) dari input drag. */
  orbit: (deltaYaw: number, deltaPitch: number) => void;
  /** Menghadapkan kamera ke suatu arah (radian). */
  setYaw: (yaw: number) => void;
  /** Arah kamera saat ini (radian), dipakai agar gerak joystick relatif ke kamera. */
  getYaw: () => number;
  /** Memperbarui posisi kamera mengikuti target tiap frame; `naik` = tinggi lompatan pemain. */
  update: (target: THREE.Vector3, dt: number, naik?: number) => void;
  /** Berganti halus antara Normal, Dekat, dan Tangan (sudut mata). */
  setMode: (mode: ModeKamera) => void;
  /** `true` bila kamera sudah berada di mata pemain (kepala model harus disembunyikan). */
  diMataPemain: () => boolean;
  /** Berpindah halus ke bidikan, atau kembali ke orbit normal bila `null`. */
  setFokus: (fokus: FokusKamera | null) => void;
  /** Mengatur sudut awal. */
  reset: () => void;
  dispose: () => void;
}

const MIN_PITCH = -0.15;
const MAX_PITCH = 0.95;
/** Laju transisi bidikan: makin besar makin cepat (±1 detik untuk mendekat). */
const LAJU_FOKUS = 3.5;
const LAJU_MODE = 6;
/** Jarak dan tinggi kamera orbit. Mode Tangan memakai posisi mata, nilainya hanya untuk transisi. */
const SETELAN_MODE: Record<ModeKamera, { jarak: number; tinggi: number }> = {
  normal: { jarak: 12.5, tinggi: 3.2 },
  dekat: { jarak: 6, tinggi: 1.8 },
  tangan: { jarak: 6, tinggi: 1.8 },
};
/** Tinggi mata di atas kaki pemain (m): wajah model tepat di atas pangkal kepala 1,13 m. */
const TINGGI_MATA = 1.25;
const MIN_PITCH_MATA = -0.9;
const MAX_PITCH_MATA = 1.1;

export function createCameraController(camera: THREE.PerspectiveCamera): CameraController {
  let yaw = 0; // kamera di utara pemain, menghadap balai di selatan
  let pitch = 0.42;
  let mode: ModeKamera = 'normal';
  let distance = SETELAN_MODE.normal.jarak;
  let height = SETELAN_MODE.normal.tinggi;
  let pitchMata = 0.05;
  let campurMata = 0;
  const mata = new THREE.Vector3();
  const lihatMata = new THREE.Vector3();
  const current = new THREE.Vector3(0, 8, 16);
  const wish = new THREE.Vector3();
  const lihat = new THREE.Vector3();
  // Tetap disimpan setelah fokus dilepas: transisi kembali masih membutuhkannya.
  let bidikan: FokusKamera | null = null;
  let fokusAktif = false;
  let campur = 0;
  const kurangiGerak = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const orbit = (deltaYaw: number, deltaPitch: number): void => {
    yaw -= deltaYaw;
    if (mode === 'tangan') pitchMata = THREE.MathUtils.clamp(pitchMata + deltaPitch, MIN_PITCH_MATA, MAX_PITCH_MATA);
    else pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch + deltaPitch));
  };

  const setYaw = (nilai: number): void => {
    yaw = nilai;
  };

  const update = (target: THREE.Vector3, dt: number, naik = 0): void => {
    const setelan = SETELAN_MODE[mode];
    const kMode = kurangiGerak ? 1 : Math.min(1, dt * LAJU_MODE);
    distance += (setelan.jarak - distance) * kMode;
    height += (setelan.tinggi - height) * kMode;
    campurMata += ((mode === 'tangan' ? 1 : 0) - campurMata) * kMode;

    const horiz = Math.cos(pitch) * distance;
    wish.set(target.x + Math.sin(yaw) * horiz, target.y + height + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * horiz);
    lihat.set(target.x, target.y + 1.4, target.z);

    if (campurMata > 0) {
      const datar = Math.cos(pitchMata);
      mata.set(target.x, target.y + TINGGI_MATA + naik, target.z);
      lihatMata.set(mata.x - Math.sin(yaw) * datar * 10, mata.y - Math.sin(pitchMata) * 10, mata.z - Math.cos(yaw) * datar * 10);
      wish.lerp(mata, campurMata);
      lihat.lerp(lihatMata, campurMata);
    }

    const tujuan = fokusAktif ? 1 : 0;
    campur = kurangiGerak ? tujuan : campur + (tujuan - campur) * Math.min(1, dt * LAJU_FOKUS);
    if (bidikan) {
      wish.lerp(bidikan.posisi, campur);
      lihat.lerp(bidikan.lihat, campur);
    }

    // Peredaman halus supaya kamera tidak bergetar.
    // Di mata pemain peredaman dihapus: kamera yang tertinggal akan memperlihatkan badan sendiri.
    current.lerp(wish, kurangiGerak ? 1 : Math.min(1, dt * 8 + campurMata * campurMata));

    // Jangan sampai kamera menembus tanah.
    current.y = Math.max(current.y, 1.5 - campurMata * 0.5);

    camera.position.copy(current);
    camera.lookAt(lihat);
  };

  const setFokus = (fokus: FokusKamera | null): void => {
    fokusAktif = fokus !== null;
    if (fokus) bidikan = fokus;
  };

  const reset = (): void => {
    yaw = 0;
    pitch = 0.3;
  };

  const dispose = (): void => {
    /* tidak ada sumber daya GPU yang perlu dibersihkan */
  };

  return { camera, orbit, setYaw, getYaw: () => yaw, update, setFokus, reset,
    setMode: (m) => {
      mode = m;
    },
    diMataPemain: () => campurMata > 0.7 && campur < 0.3,
    dispose };
}
