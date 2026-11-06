import * as THREE from 'three';

/**
 * Pengaturan dasar scene Three.js: renderer, kamera, lampu, kabut, latar langit.
 *
 * Terinspirasi dari eksperimen WebGL "Summer Afternoon": tone mapping filmik,
 * langit berkabut hangat, dan palet "sore cerah". Tetap ringan (tanpa bayangan
 * real-time, tanpa post-processing) agar lancar di HP kelas menengah.
 */

export interface SceneBundle {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  dispose: () => void;
}

export interface SceneQuality {
  /** Batas devicePixelRatio (1.0 = hemat, 1.5-2 = tajam). */
  pixelRatioCap: number;
  /** Jarak kabut. */
  fogNear: number;
  fogFar: number;
}

export const QUALITY_HIGH: SceneQuality = { pixelRatioCap: 1.75, fogNear: 26, fogFar: 58 };
export const QUALITY_LOW: SceneQuality = { pixelRatioCap: 1, fogNear: 18, fogFar: 42 };

/** Palet suasana "Sore Hangat" (langit, kabut, cahaya, rumput). */
export interface SceneTheme {
  sky: number;
  fog: number;
  sun: number;
  hemiSky: number;
  hemiGround: number;
  grass: number;
  ambient: number;
}

/** Sore hangat keemasan (mirip "Summer Afternoon"). */
export const THEME_SORE_HANGAT: SceneTheme = {
  sky: 0xffd9a0,
  fog: 0xffd9a0,
  sun: 0xffd0a0,
  hemiSky: 0xffe4bd,
  hemiGround: 0x6b7a4a,
  grass: 0x9ccf7a,
  ambient: 0.7,
};

export interface SceneOptions {
  quality?: SceneQuality;
  theme?: SceneTheme;
  /** Ukuran bidang tanah (default kecil untuk dunia noktah). */
  groundSize?: number;
  /** Warna lantai plaza di tengah (opsional). */
  plaza?: { size: number; color: number };
}

export function createScene(canvas: HTMLCanvasElement, options: SceneOptions = {}): SceneBundle {
  const quality = options.quality ?? QUALITY_HIGH;
  const theme = options.theme ?? THEME_SORE_HANGAT;
  const groundSize = options.groundSize ?? 120;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.pixelRatioCap > 1.2,
    powerPreference: 'high-performance',
    alpha: false,
  });
  const dpr = Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Tone mapping filmik: warna lebih "mahal", kontras lembut.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.fog, quality.fogNear, quality.fogFar);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.position.set(0, 8, 16);

  // Lampu: ambient hangat + matahari rendah (sore) + hemi langit/tanah.
  const ambient = new THREE.AmbientLight(0xffffff, theme.ambient);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(theme.sun, 1.5);
  sun.position.set(18, 16, 12);
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, 0.6);
  scene.add(hemi);

  // Tanah rumput besar (menyembunyikan tepi area).
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
  const groundMat = new THREE.MeshLambertMaterial({ color: theme.grass });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  const extra: { dispose: () => void }[] = [groundGeo, groundMat];

  // Lantai plaza (opsional).
  if (options.plaza) {
    const plazaGeo = new THREE.PlaneGeometry(options.plaza.size, options.plaza.size);
    const plazaMat = new THREE.MeshLambertMaterial({ color: options.plaza.color });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.01;
    scene.add(plaza);
    extra.push(plazaGeo, plazaMat);
  }

  const handleResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener('resize', handleResize);

  const dispose = (): void => {
    window.removeEventListener('resize', handleResize);
    extra.forEach((d) => d.dispose());
    renderer.dispose();
  };

  return { scene, renderer, camera, dispose };
}
