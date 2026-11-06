import * as THREE from 'three';
import { SEMUA_BANGUNAN, MAP_SIZE, HALF, ZONA_WARNA, type BalaiConfig } from './mapConfig';
import { buatKios } from './kios';
import { buatKarakter, genderPenjaga } from './karakter';

/**
 * Membangun pasar balai dari bentuk dasar (tanpa model unduhan). Setiap balai
 * (B01..D02 + Pasar Ramai) mengembalikan penanda status (terkunci/aktif/selesai)
 * yang bisa diperbarui oleh HUD 3D.
 */

export interface BalaiVisual {
  config: BalaiConfig;
  group: THREE.Group;
  marker: THREE.Mesh;
  markerMat: THREE.MeshBasicMaterial;
  hint: THREE.Mesh;
  hintDot: THREE.Mesh;
  setHintVisible: (visible: boolean) => void;
  setStatus: (status: 'locked' | 'active' | 'done') => void;
  stars: THREE.Mesh[];
  setStars: (count: number) => void;
  dispose: () => void;
}

export interface MarketBundle {
  group: THREE.Group;
  balai: BalaiVisual[];
  dispose: () => void;
}

const STATUS_COLORS = {
  locked: 0x9ca3af,
  active: 0xf59e0b,
  done: 0x2f9e6b,
} as const;

export function buildMarket(): MarketBundle {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  const balai: BalaiVisual[] = SEMUA_BANGUNAN.map((config) => buildBalai(config, track, root));

  buildFences(root, track);
  buildDecor(root, track);
  buildZonaLantai(root, track);

  return {
    group: root,
    balai,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

function buildBalai(
  config: BalaiConfig,
  track: <T extends { dispose: () => void }>(o: T) => T,
  parent: THREE.Group,
): BalaiVisual {
  const g = new THREE.Group();
  g.position.set(config.position.x, 0, config.position.z);
  g.rotation.y = config.rotation;

  const isFinal = config.kode === 'FINAL';
  const scale = isFinal ? 1.6 : 1;

  // Bangunan kios (bentuk prosedural di kios.ts).
  const kios = buatKios({ warna: config.warnaAtap, meriah: isFinal }, track);
  g.add(kios.group);

  // Papan nama balai.
  const sign = buildSign(config.nama, config.warnaAtap, track);
  sign.position.set(0, 2.25, 1.55);
  g.add(sign);

  // Lencana kode TKA.
  const badge = buildBadge(config.kodeLabel, config.warnaAtap, track);
  badge.position.set(-1.6, 2.25, 1.55);
  badge.scale.set(0.55, 0.55, 1);
  g.add(badge);

  // NPC penjaga — gender mengikuti namanya (Bu → berhijab, Pak → berkemeja).
  const npcRig = buatKarakter({
    gender: genderPenjaga(config.penjaga),
    warnaPakaian: isFinal ? 0x9333ea : undefined,
    skala: isFinal ? 1.5 : 1,
    pakaiMarker: false,
  });
  npcRig.geometri.forEach((x) => track(x));
  npcRig.material.forEach((x) => track(x));
  npcRig.group.position.copy(kios.titikNpc);
  g.add(npcRig.group);

  // Penanda status melayang.
  const markerMat = track(new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked }));
  const markerGeo = track(new THREE.SphereGeometry(0.4, 16, 12));
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.set(0, kios.tinggiAtap + 1.2, 0);
  g.add(marker);

  // Tanda seru "!" saat pemain dekat.
  const hintMat = track(new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
  const hintGeo = track(new THREE.BoxGeometry(0.22, 0.8, 0.22));
  const hint = new THREE.Mesh(hintGeo, hintMat);
  hint.position.set(0, 3.2, 0.4);
  hint.visible = false;
  g.add(hint);
  const hintDotGeo = track(new THREE.SphereGeometry(0.16, 10, 8));
  const hintDot = new THREE.Mesh(hintDotGeo, hintMat);
  hintDot.position.set(0, 2.66, 0.4);
  hintDot.visible = false;
  g.add(hintDot);

  // Bintang melayang (mulai tersembunyi).
  const stars: THREE.Mesh[] = [];
  const starMat = track(new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  for (let i = 0; i < 3; i++) {
    const starGeo = track(new THREE.OctahedronGeometry(0.26));
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set((i - 1) * 0.7, kios.tinggiAtap + 1.9, 0);
    star.visible = false;
    g.add(star);
    stars.push(star);
  }

  g.scale.setScalar(scale);
  parent.add(g);

  return {
    config,
    group: g,
    marker,
    markerMat,
    hint,
    hintDot,
    setHintVisible: (visible: boolean) => {
      hint.visible = visible;
      hintDot.visible = visible;
    },
    setStatus: (status) => {
      markerMat.color.setHex(STATUS_COLORS[status]);
    },
    stars,
    setStars: (count) => {
      stars.forEach((s, i) => (s.visible = i < count));
    },
    dispose: () => {
      /* resource dilacak lewat track */
    },
  };
}

/** Papan nama dengan tekstur dari kanvas (teks tajam). */
export function buildSign(text: string, accent: number, track: <T extends { dispose: () => void }>(o: T) => T): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const accentCss = `#${accent.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = '#fff7e6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 0, canvas.width, 14);
    ctx.fillRect(0, canvas.height - 14, canvas.width, 14);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 46px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const geo = track(new THREE.PlaneGeometry(3.4, 0.85));
  const mat = track(new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  return new THREE.Mesh(geo, mat);
}

/** Lencana kode (mis. "B01") berbentuk kotak berwarna. */
export function buildBadge(text: string, accent: number, track: <T extends { dispose: () => void }>(o: T) => T): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const accentCss = `#${accent.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const geo = track(new THREE.PlaneGeometry(0.9, 0.9));
  const mat = track(new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  return new THREE.Mesh(geo, mat);
}

function buildFences(root: THREE.Group, track: <T extends { dispose: () => void }>(o: T) => T): void {
  const postGeo = track(new THREE.BoxGeometry(0.24, 1.2, 0.24));
  const postMat = track(new THREE.MeshLambertMaterial({ color: 0x9a6b3f }));
  const railGeo = track(new THREE.BoxGeometry(MAP_SIZE, 0.16, 0.16));
  const railMat = track(new THREE.MeshLambertMaterial({ color: 0xb88454 }));

  const edge = HALF - 0.5;
  for (const z of [-edge, edge]) {
    for (let x = -edge; x <= edge; x += 2.5) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0.6, z);
      root.add(post);
    }
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, 0.8, z);
    root.add(rail);
  }
  for (const x of [-edge, edge]) {
    for (let z = -edge; z <= edge; z += 2.5) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0.6, z);
      root.add(post);
    }
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.y = Math.PI / 2;
    rail.position.set(x, 0.8, 0);
    root.add(rail);
  }
}

function buildDecor(root: THREE.Group, track: <T extends { dispose: () => void }>(o: T) => T): void {
  const trunkGeo = track(new THREE.CylinderGeometry(0.18, 0.22, 1.6, 8));
  const trunkMat = track(new THREE.MeshLambertMaterial({ color: 0x7a5230 }));
  const leafGeo = track(new THREE.SphereGeometry(1, 12, 10));
  const leafMat = track(new THREE.MeshLambertMaterial({ color: 0x2f9e6b }));

  const spots: Array<[number, number]> = [
    [-28, -28],
    [28, -28],
    [-28, 28],
    [28, 28],
    [0, 30],
  ];
  for (const [x, z] of spots) {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 0.8, z);
    root.add(trunk);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(x, 1.9, z);
    root.add(leaf);
  }

  const crateGeo = track(new THREE.BoxGeometry(0.9, 0.9, 0.9));
  const crateMat = track(new THREE.MeshLambertMaterial({ color: 0xcf9b52 }));
  const crateSpots: Array<[number, number]> = [
    [-4, 10],
    [4, 10],
    [-4, 14],
    [4, 14],
  ];
  for (const [x, z] of crateSpots) {
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(x, 0.45, z);
    root.add(crate);
  }
}

/** Lantai berwarna untuk menandai tiap zona elemen. */
function buildZonaLantai(root: THREE.Group, track: <T extends { dispose: () => void }>(o: T) => T): void {
  const zonaLantai: Array<{ x: number; z: number; w: number; d: number; elemen: keyof typeof ZONA_WARNA }> = [
    { x: 0, z: -12, w: 22, d: 34, elemen: 'Bilangan' },
    { x: -22, z: 6, w: 16, d: 60, elemen: 'Geometri' },
    { x: 22, z: 10, w: 16, d: 40, elemen: 'Data' },
  ];
  for (const zl of zonaLantai) {
    const geo = track(new THREE.PlaneGeometry(zl.w, zl.d));
    const mat = track(new THREE.MeshLambertMaterial({ color: ZONA_WARNA[zl.elemen], transparent: true, opacity: 0.18 }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(zl.x, 0.01, zl.z);
    root.add(mesh);
  }
}
