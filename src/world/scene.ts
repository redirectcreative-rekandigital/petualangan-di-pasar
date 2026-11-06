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
  /** Apakah bayangan (shadow map) aktif pada kualitas ini. */
  pakaiBayangan: boolean;
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
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  const dpr = Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Tone mapping filmik: warna lebih "mahal", kontras lembut.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // Bayangan lembut (PCFSoft) membuat bentuk terasa punya volume/nyata.
  // Dimatikan bila kualitas rendah agar tetap lancar di HP kelas bawah.
  const pakaiBayangan = quality.pixelRatioCap > 1.2;
  renderer.shadowMap.enabled = pakaiBayangan;
  if (pakaiBayangan) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.fog, quality.fogNear, quality.fogFar);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.position.set(0, 8, 16);

  // Lampu: ambient lembut + matahari rendah (sore) + hemi langit/tanah.
  // Sedikit lebih redup dari sebelumnya agar bayangan punya peran (tidak flat).
  const ambient = new THREE.AmbientLight(0xffffff, theme.ambient * 0.72);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(theme.sun, 2.1);
  sun.position.set(18, 16, 12);
  if (pakaiBayangan) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    // Area bayangan utama (dunia noktah ±40 unit).
    const kam = sun.shadow.camera as THREE.OrthographicCamera;
    kam.left = -40;
    kam.right = 40;
    kam.top = 40;
    kam.bottom = -40;
    kam.near = 0.5;
    kam.far = 90;
    sun.shadow.bias = -0.0015;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
  }
  scene.add(sun);

  // Cahaya isi dari arah berlawanan agar sisi gelap tidak pekat.
  const isi = new THREE.DirectionalLight(0xfff2d8, 0.45);
  isi.position.set(-14, 9, -10);
  scene.add(isi);

  const hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, 0.75);
  scene.add(hemi);

  // Tanah rumput besar (menyembunyikan tepi area).
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
  const groundMat = new THREE.MeshStandardMaterial({ color: theme.grass, roughness: 0.95, metalness: 0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = pakaiBayangan;
  scene.add(ground);

  const extra: { dispose: () => void }[] = [groundGeo, groundMat];

  // Lantai plaza (opsional).
  if (options.plaza) {
    const plazaGeo = new THREE.PlaneGeometry(options.plaza.size, options.plaza.size);
    const plazaMat = new THREE.MeshStandardMaterial({ color: options.plaza.color, roughness: 0.9, metalness: 0 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.01;
    plaza.receiveShadow = pakaiBayangan;
    scene.add(plaza);
    extra.push(plazaGeo, plazaMat);
  }

  const handleResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener('resize', handleResize);

  // Beri tahu pemanggil apakah bayangan aktif (untuk mengatur castShadow objek).
  const dispose = (): void => {
    window.removeEventListener('resize', handleResize);
    extra.forEach((d) => d.dispose());
    renderer.dispose();
  };

  return { scene, renderer, camera, pakaiBayangan, dispose };
}
