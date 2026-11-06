import * as THREE from 'three';

/**
 * Kamera orang ketiga dengan orbit (PRD v2 3D-03).
 * Kamera mengikuti pemain, sudut vertikal dibatasi agar tidak menembus tanah.
 */

export interface CameraController {
  camera: THREE.PerspectiveCamera;
  /** Menggeser kamera (orbit) dari input drag. */
  orbit: (deltaYaw: number, deltaPitch: number) => void;
  /** Menghadapkan kamera ke suatu arah (radian). */
  setYaw: (yaw: number) => void;
  /** Memperbarui posisi kamera mengikuti target tiap frame. */
  update: (target: THREE.Vector3, dt: number) => void;
  /** Mengatur sudut awal. */
  reset: () => void;
  dispose: () => void;
}

const MIN_PITCH = -0.15;
const MAX_PITCH = 0.95;

export function createCameraController(camera: THREE.PerspectiveCamera): CameraController {
  let yaw = 0; // kamera di utara pemain, menghadap balai di selatan
  let pitch = 0.42;
  const distance = 12.5;
  const height = 3.2;
  const current = new THREE.Vector3(0, 8, 16);

  const orbit = (deltaYaw: number, deltaPitch: number): void => {
    yaw -= deltaYaw;
    pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch + deltaPitch));
  };

  const setYaw = (nilai: number): void => {
    yaw = nilai;
  };

  const update = (target: THREE.Vector3, dt: number): void => {
    const horiz = Math.cos(pitch) * distance;
    const wishX = target.x + Math.sin(yaw) * horiz;
    const wishZ = target.z + Math.cos(yaw) * horiz;
    const wishY = target.y + height + Math.sin(pitch) * distance;

    // Peredaman halus supaya kamera tidak bergetar.
    const lerp = Math.min(1, dt * 8);
    current.x += (wishX - current.x) * lerp;
    current.y += (wishY - current.y) * lerp;
    current.z += (wishZ - current.z) * lerp;

    // Jangan sampai kamera menembus tanah.
    current.y = Math.max(current.y, 1.5);

    camera.position.copy(current);
    camera.lookAt(target.x, target.y + 1.4, target.z);
  };

  const reset = (): void => {
    yaw = 0;
    pitch = 0.3;
  };

  const dispose = (): void => {
    /* tidak ada sumber daya GPU yang perlu dibersihkan */
  };

  return { camera, orbit, setYaw, update, reset, dispose };
}
