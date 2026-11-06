import * as THREE from 'three';
import { createScene, type SceneQuality, QUALITY_HIGH, THEME_SORE_HANGAT } from './scene';
import { createPlayer, type PlayerBundle } from './player';
import { createCameraController, type CameraController } from './camera';
import { resolveAll, clampToMap } from './collision';
import { buildSign, buildBadge } from './market';
import { buatKios } from './kios';
import { buatKarakter, genderPenjaga, type KarakterRig } from './karakter';
import { createPengelolaPemainLain, type PengelolaPemainLain } from './pemainLain';
import { buildPenghias, type PenghiasHandle, type PenghiasTitik } from './instancing';
import { ZONA } from '../data/balai';
import type { InputManager } from '../input/controls';
import type { BalaiMeta, Progress } from '../../shared/types';
import type { PosisiPemain } from '../../shared/net';
import type { ColliderBox } from './mapConfig';

/**
 * Dunia 3D kecil untuk satu NOKTAH: pemain berjalan mengelilingi area tema
 * (sesuai elemen: Bilangan/Geometri/Data) yang berisi satu atau beberapa balai.
 *
 * Setiap noktah memakai salah satu dari tiga tata letak (per elemen); nama dan
 * warna balai disesuaikan dengan noktahnya.
 */

export interface NoktahWorldOptions {
  canvas: HTMLCanvasElement;
  input: InputManager;
  /** Balai-balai di dalam noktah ini. */
  balai: BalaiMeta[];
  /** Elemen noktah (menentukan tata letak & warna tema). */
  elemen: BalaiMeta['elemen'];
  getProgress: () => Progress;
  quality?: SceneQuality;
}

export interface NoktahWorldHandle {
  renderer: THREE.WebGLRenderer;
  update: (dt: number, elapsed: number) => void;
  /** Balai terdekat yang bisa disentuh (atau null). */
  getNearby: () => BalaiMeta | null;
  /** Menandai bintang sebuah balai (visual). */
  setBalaiStars: (kode: string, stars: number) => void;
  setPaused: (paused: boolean) => void;
  resetCamera: () => void;
  /** Perbarui daftar pemain lain (mode multiplayer). */
  setPemainLain: (daftar: PosisiPemain[]) => void;
  /** Posisi & arah pemain lokal (untuk dikirim ke server). */
  posisiPemain: () => { x: number; z: number; rot: number };
  debugState: () => { x: number; z: number; nearby: string | null };
  dispose: () => void;
}

const MOVE_SPEED = 7.5;
const INTERACTION_RADIUS = 4.2;
const PLAYER_RADIUS = 1;
const AREA = 40; // ukuran area noktah (persegi)
const SETENGAH = AREA / 2;

interface BalaiVisualKecil {
  meta: BalaiMeta;
  group: THREE.Group;
  markerMat: THREE.MeshBasicMaterial;
  hint: THREE.Mesh;
  hintDot: THREE.Mesh;
  stars: THREE.Mesh[];
  /** Rig NPC penjaga (untuk animasi diam). */
  npc: KarakterRig;
  setHintVisible: (visible: boolean) => void;
  setStars: (count: number) => void;
}

const WARNA_ELEMEN: Record<BalaiMeta['elemen'], number> = {
  Bilangan: 0x2f9e6b,
  Geometri: 0x2563eb,
  Data: 0xd97706,
};

/**
 * Tata letak balai per elemen. Balai diletakkan di posisi tetap; bila ada lebih
 * dari satu balai, posisi berikutnya diambil berurutan.
 */
const TATA_LETAK: Record<BalaiMeta['elemen'], Array<{ x: number; z: number; rot: number }>> = {
  Bilangan: [
    { x: 0, z: -9, rot: 0 },
    { x: -10, z: 8, rot: Math.PI / 3 },
    { x: 10, z: 8, rot: -Math.PI / 3 },
  ],
  Geometri: [
    { x: -9, z: -6, rot: Math.PI / 4 },
    { x: 9, z: -6, rot: -Math.PI / 4 },
    { x: 0, z: 10, rot: Math.PI },
  ],
  Data: [
    { x: 0, z: -10, rot: 0 },
    { x: 0, z: 9, rot: Math.PI },
    { x: -11, z: 0, rot: Math.PI / 2 },
  ],
};

export function createNoktahWorld(options: NoktahWorldOptions): NoktahWorldHandle {
  const quality = options.quality ?? QUALITY_HIGH;
  const { scene, renderer, camera, dispose: disposeScene } = createScene(options.canvas, {
    quality,
    theme: THEME_SORE_HANGAT,
    groundSize: AREA + 60,
  });

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  const tema = WARNA_ELEMEN[options.elemen];
  const namaZona = ZONA.find((z) => z.elemen === options.elemen)?.nama ?? 'Noktah';

  // --- Lantai area noktah (warna tema) ---
  const areaGeo = track(new THREE.PlaneGeometry(AREA, AREA));
  const areaMat = track(new THREE.MeshLambertMaterial({ color: tema, transparent: true, opacity: 0.2 }));
  const areaLantai = new THREE.Mesh(areaGeo, areaMat);
  areaLantai.rotation.x = -Math.PI / 2;
  areaLantai.position.y = 0.005;
  scene.add(areaLantai);

  // --- Balai-balai ---
  const balaiVisuals: BalaiVisualKecil[] = [];
  const tata = TATA_LETAK[options.elemen];
  options.balai.forEach((meta, i) => {
    const pos = tata[i % tata.length] as { x: number; z: number; rot: number };
    const vis = buildBalaiKecil(meta, pos, track);
    scene.add(vis.group);
    balaiVisuals.push(vis);
  });

  // --- Papan nama zona di mulut area ---
  const zonaSign = buildSign(`${options.elemen} · ${namaZona}`, tema, track);
  zonaSign.position.set(0, 3.4, SETENGAH - 3);
  zonaSign.scale.set(1.4, 1.4, 1);
  scene.add(zonaSign);
  const tiangSignGeo = track(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8));
  const tiangSignMat = track(new THREE.MeshLambertMaterial({ color: 0x7c5a34 }));
  const tiangSign = new THREE.Mesh(tiangSignGeo, tiangSignMat);
  tiangSign.position.set(0, 1.7, SETENGAH - 3);
  scene.add(tiangSign);

  // --- Pagar keliling area ---
  buildPagar(scene, track);

  // --- Penghias (InstancedMesh + LOD sederhana) ---
  const penghias: PenghiasHandle[] = [
    buildPenghias(scene, 'pohon', sebar(24, 6, options.balai), track),
    buildPenghias(scene, 'semak', sebar(30, 3, options.balai), track),
    buildPenghias(scene, 'batu', sebar(14, 4, []), track),
    buildPenghias(scene, 'peti', sebar(6, 5, []), track),
    buildPenghias(scene, 'lampu', sebar(8, 9, []), track),
  ];

  // --- Penghalang ---
  const colliders: ColliderBox[] = [
    ...balaiVisuals.map((v) => box(v, 3.4, 3.0)),
    boxTepi(0, SETENGAH, AREA, 1),
    boxTepi(0, -SETENGAH, AREA, 1),
    boxTepi(-SETENGAH, 0, 1, AREA),
    boxTepi(SETENGAH, 0, 1, AREA),
  ];

  // --- Pemain ---
  const _prog = options.getProgress();
  const player: PlayerBundle = createPlayer({
    gender: _prog.gender,
    warnaPakaian: _prog.warnaBaju,
    warnaBawahan: _prog.warnaBawahan,
    warnaHijab: _prog.warnaHijab,
  });
  player.setPosition(0, SETENGAH - 6);
  scene.add(player.group);
  const camCtrl: CameraController = createCameraController(camera);

  // Pemain lain (mode multiplayer).
  const pemainLain: PengelolaPemainLain = createPengelolaPemainLain(scene);

  let paused = false;
  let nearby: BalaiMeta | null = null;

  const update = (dt: number, elapsed: number): void => {
    const orbit = options.input.consumeOrbit();
    if (orbit.yaw !== 0 || orbit.pitch !== 0) camCtrl.orbit(orbit.yaw, orbit.pitch);

    if (!paused) {
      const wishX = options.input.state.moveX * MOVE_SPEED * dt;
      const wishZ = -options.input.state.moveY * MOVE_SPEED * dt;
      if (options.input.state.moving) {
        const targetX = player.position.x + wishX;
        const targetZ = player.position.z + wishZ;
        const resolved = resolveAll({ x: targetX, z: targetZ, r: PLAYER_RADIUS }, colliders);
        const clamped = clampToMap(resolved.x, resolved.z, SETENGAH, PLAYER_RADIUS + 0.4);
        player.setPosition(clamped.x, clamped.z);
        player.faceDirection(wishX, wishZ, dt);
      }
      player.animate(options.input.state.moving ? MOVE_SPEED : 0, elapsed);
    }

    nearby = nearestBalai();
    for (const v of balaiVisuals) {
      const dekat = v.meta.kode === nearby?.kode;
      v.setHintVisible(dekat);

      // Animasi diam: tiap NPC punya irama sendiri (fase dari kodenya).
      v.npc.idle(elapsed, indeksFase(v.meta.kode));

      // Saat pemain dekat, NPC menoleh perlahan menghadap pemain (menyapa).
      // Hanya grup NPC yang diputar, bukan seluruh balai.
      const npc = v.npc.group;
      let target = 0;
      if (dekat) {
        const dx = player.position.x - v.group.position.x;
        const dz = player.position.z - v.group.position.z;
        // Sudut relatif terhadap rotasi balai (karena NPC anak dari grup balai).
        target = Math.atan2(dx, dz) - v.group.rotation.y;
      }
      let beda = target - npc.rotation.y;
      while (beda > Math.PI) beda -= Math.PI * 2;
      while (beda < -Math.PI) beda += Math.PI * 2;
      npc.rotation.y += beda * Math.min(1, dt * (dekat ? 3 : 1.2));
    }
    for (const p of penghias) p.update(player.position);

    pemainLain.update(dt, elapsed);

    camCtrl.update(player.position, dt);
    renderer.render(scene, camera);
  };

  function nearestBalai(): BalaiMeta | null {
    let best: BalaiMeta | null = null;
    let bestDist = INTERACTION_RADIUS;
    for (const v of balaiVisuals) {
      const lokasi = v.group.position;
      const dist = Math.hypot(player.position.x - lokasi.x, player.position.z - lokasi.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = v.meta;
      }
    }
    return best;
  }

  const dispose = (): void => {
    player.dispose();
    pemainLain.dispose();
    camCtrl.dispose();
    for (const p of penghias) p.dispose();
    disposables.forEach((d) => d.dispose());
    disposeScene();
  };

  return {
    renderer,
    update,
    getNearby: () => nearby,
    setBalaiStars: (kode, stars) => {
      const v = balaiVisuals.find((x) => x.meta.kode === kode);
      v?.setStars(stars);
    },
    setPaused: (value) => {
      paused = value;
    },
    resetCamera: () => camCtrl.reset(),
    setPemainLain: (daftar) => pemainLain.set(daftar),
    posisiPemain: () => ({
      x: player.position.x,
      z: player.position.z,
      rot: player.group.rotation.y,
    }),
    debugState: () => ({
      x: Math.round(player.position.x * 100) / 100,
      z: Math.round(player.position.z * 100) / 100,
      nearby: nearby ? String(nearby.kode) : null,
    }),
    dispose,
  };
}

/* ------------------------------------------------------------------ */
/* Pembuat visual balai kecil                                          */
/* ------------------------------------------------------------------ */

/** Pembangkit acak deterministik sederhana (agar tata letak konsisten). */
function acak(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Menyebar titik penghias di dalam area noktah, menghindari zona balai dan
 * jalur masuk di mulut area.
 */
function sebar(jumlah: number, seed: number, balai: BalaiMeta[]): PenghiasTitik[] {
  const rng = acak(seed * 7919 + 13);
  const out: PenghiasTitik[] = [];
  const tata = TATA_LETAK[BilanganElemen(balai)] ?? [];
  let percobaan = 0;

  while (out.length < jumlah && percobaan < jumlah * 30) {
    percobaan++;
    const x = (rng() * 2 - 1) * (SETENGAH - 2.5);
    const z = (rng() * 2 - 1) * (SETENGAH - 2.5);

    // Hindari jalur masuk (dekat mulut area, z positif besar).
    if (z > SETENGAH - 8 && Math.abs(x) < 3) continue;
    // Hindari zona balai.
    if (balai.some((_, i) => {
      const p = tata[i % tata.length];
      return p ? Math.hypot(x - p.x, z - p.z) < 6 : false;
    })) continue;

    out.push({ x, z, skala: 0.75 + rng() * 0.55, rotasi: rng() * Math.PI * 2 });
  }
  return out;
}

/** Elemen default bila daftar balai kosong (penghias umum). */
function BilanganElemen(balai: BalaiMeta[]): BalaiMeta['elemen'] {
  return balai[0]?.elemen ?? 'Bilangan';
}

/** Fase idle deterministik dari kode balai, agar tiap NPC bernapas tak serempak. */
function indeksFase(kode: string): number {
  let h = 0;
  for (let i = 0; i < kode.length; i++) h = (h * 31 + kode.charCodeAt(i)) % 1000;
  return (h / 1000) * Math.PI * 2;
}

function buildBalaiKecil(
  meta: BalaiMeta,
  pos: { x: number; z: number; rot: number },
  track: <T extends { dispose: () => void }>(o: T) => T,
): BalaiVisualKecil {
  const g = new THREE.Group();
  g.position.set(pos.x, 0, pos.z);
  g.rotation.y = pos.rot;

  const warna = WARNA_ELEMEN[meta.elemen];

  // Bangunan kios (bentuk prosedural di kios.ts).
  const kios = buatKios({ warna }, track);
  kios.group.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  g.add(kios.group);

  const sign = buildSign(meta.nama, warna, track);
  sign.position.set(0, 2.25, 1.6);
  g.add(sign);

  const badge = buildBadge(String(meta.kode), warna, track);
  badge.position.set(-1.7, 2.25, 1.6);
  badge.scale.set(0.55, 0.55, 1);
  g.add(badge);

  // NPC penjaga — gender mengikuti nama penjaga (Bu → berhijab, Pak → berkemeja).
  const npcRig = buatKarakter({ gender: genderPenjaga(meta.penjaga), pakaiMarker: false });
  npcRig.geometri.forEach((x) => track(x));
  npcRig.material.forEach((x) => track(x));
  npcRig.group.position.copy(kios.titikNpc);
  npcRig.group.traverse((o) => {
    o.castShadow = true;
  });
  g.add(npcRig.group);

  const markerMat = track(new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
  const markerGeo = track(new THREE.SphereGeometry(0.4, 16, 12));
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.set(0, kios.tinggiAtap + 1.2, 0);
  g.add(marker);

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

  return {
    meta,
    group: g,
    markerMat,
    hint,
    hintDot,
    stars,
    npc: npcRig,
    setHintVisible: (visible) => {
      hint.visible = visible;
      hintDot.visible = visible;
    },
    setStars: (count) => stars.forEach((s, i) => (s.visible = i < count)),
  };
}

function buildPagar(scene: THREE.Scene, track: <T extends { dispose: () => void }>(o: T) => T): void {
  const postGeo = track(new THREE.BoxGeometry(0.24, 1.2, 0.24));
  const postMat = track(new THREE.MeshLambertMaterial({ color: 0x9a6b3f }));
  const railGeo = track(new THREE.BoxGeometry(AREA, 0.16, 0.16));
  const railMat = track(new THREE.MeshLambertMaterial({ color: 0xb88454 }));
  const edge = SETENGAH - 0.5;

  for (const z of [-edge, edge]) {
    for (let x = -edge; x <= edge; x += 2.5) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0.6, z);
      scene.add(post);
    }
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, 0.8, z);
    scene.add(rail);
  }
  for (const x of [-edge, edge]) {
    for (let z = -edge; z <= edge; z += 2.5) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0.6, z);
      scene.add(post);
    }
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.y = Math.PI / 2;
    rail.position.set(x, 0.8, 0);
    scene.add(rail);
  }
}

function box(v: BalaiVisualKecil, w: number, d: number): ColliderBox {
  const cx = v.group.position.x;
  const cz = v.group.position.z;
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
}

function boxTepi(cx: number, cz: number, w: number, d: number): ColliderBox {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
}
