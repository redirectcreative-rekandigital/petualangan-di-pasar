import * as THREE from 'three';
import { createScene, siapkanRender, type SceneQuality, type SceneTheme } from './scene';
import { createPlayer, type PlayerBundle } from './player';
import { createCameraController, titikKeLayar, type ModeKamera } from './camera';
import { BAB, berkasNpc, buatNpc, type NpcGlb } from './asetBab';
import { loadModel, lepasModel } from './loaders';
import { buildTag } from './papan';
import type { InputManager } from '../input/controls';
import type { Progress } from '../../shared/types';
import { kostumDari } from '../core/kostumPemain';
import { FINAL_BAGIAN } from '../data/cerita';
import { sfx } from '../core/sound';
import { t } from '../core/bahasa';
import { modeRingan, saatRingan } from '../core/kualitas';

/**
 * Bagian dalam Mercusuar Tua (Final). Empat lantai bundar dihubungkan tangga
 * melingkar yang menempel di dinding, satu putaran per lantai. Pintu di awal
 * tiap putaran terkunci sampai soal lantai itu dijawab; Puncak Lampu ada di
 * lantai teratas.
 *
 * Sudut `a` diukur dari sumbu +x ke +z (atan2(z, x)). Lantai menempati
 * r < R_LANTAI, tangga menempati cincin R_LANTAI..R_DINDING.
 */

export const TINGGI_LANTAI = 4.5;
const R_DINDING = 7;
const R_LANTAI = 4.6;
const TEBAL_DINDING = 0.45;
const R_AREA = 16;
/** Beda tinggi terbesar yang bisa dilangkahi: lebih dari ini dianggap pagar/tepi. */
const LANGKAH = 0.3;
const SUDUT_PINTU = 0.5;
const LEBAR_PINTU = 0.1;
const SUDUT_MASUK = Math.PI;
const LEBAR_MASUK = 0.15;
/** Ujung tangga yang menyambung ke lantai (rad): di luar ini ada pagar. */
const SAMBUNG = 0.42;
const DUA_PI = Math.PI * 2;
const N = FINAL_BAGIAN.length;
const PUTARAN = N - 1;
const MOVE_SPEED = 2.1;
const RUN_SPEED = 4;
const R_PINTU = (R_LANTAI + R_DINDING) / 2;

export interface KeadaanPintu {
  masukTerbuka: boolean;
  /** Pintu di awal tangga lantai i (0..N-2). */
  terbuka: boolean[];
}

export function sudutDi(x: number, z: number): number {
  const a = Math.atan2(z, x);
  return a < 0 ? a + DUA_PI : a;
}

/**
 * Tinggi lantai/tangga yang bisa diinjak di (x, z) dari tinggi `y` sekarang,
 * atau `null` bila terhalang (dinding, pagar, pintu tertutup, tepi tangga).
 */
export function tinggiPermukaan(x: number, z: number, y: number, k: KeadaanPintu): number | null {
  const r = Math.hypot(x, z);
  const a = sudutDi(x, z);
  const diMasuk = Math.abs(a - SUDUT_MASUK) < LEBAR_MASUK;
  const calon: number[] = [];
  if (r > R_DINDING + TEBAL_DINDING) {
    if (r < R_AREA) calon.push(0);
  } else if (r > R_DINDING - TEBAL_DINDING) {
    if (diMasuk && k.masukTerbuka) calon.push(0);
  } else if (r < R_LANTAI) {
    // Alas lampu di tengah Puncak tidak bisa ditembus.
    for (let i = 0; i < N; i++) if (!(i === N - 1 && r < 1.1)) calon.push(i * TINGGI_LANTAI);
  } else {
    // Lorong dari pintu masuk ke lantai bawah, di kolong tangga.
    if (Math.abs(a - SUDUT_MASUK) < LEBAR_MASUK + 0.1) calon.push(0);
    for (let i = 0; i < PUTARAN; i++) {
      if (!k.terbuka[i] && Math.abs(a - SUDUT_PINTU) < LEBAR_PINTU) continue;
      calon.push((i + a / DUA_PI) * TINGGI_LANTAI);
    }
  }
  let terbaik: number | null = null;
  for (const h of calon) {
    if (Math.abs(h - y) <= LANGKAH && (terbaik === null || Math.abs(h - y) < Math.abs(terbaik - y))) terbaik = h;
  }
  return terbaik;
}

export type Dekat = { jenis: 'masuk' | 'peta' | 'lampu' } | { jenis: 'pintu'; lantai: number };

export interface MercusuarHandle {
  /** Pra-render: tunggu avatar & NPC, unggah tekstur, kompilasi shader. */
  siapkan: () => Promise<void>;
  update: (dt: number, elapsed: number) => void;
  setPaused: (v: boolean) => void;
  getNearby: () => Dekat | null;
  layarDekat: () => { x: number; y: number } | null;
  bukaPintuMasuk: () => void;
  setPintu: (i: number, terbuka: boolean) => void;
  /** Lampu kunci di atas pintu: `nyala` dari `total`. */
  setLampuPintu: (i: number, total: number, nyala: number) => void;
  /** Pintu bergetar (salah) atau pemain melompat kecil (benar). */
  jawab: (benar: boolean) => void;
  nyalakanLampu: () => void;
  /** Letakkan pemain di depan pintu lantai i (ulang lantai). */
  pindahKePintu: (i: number) => void;
  npcBicara: (lantai: number | null) => void;
  setModeKamera: (m: ModeKamera) => void;
  animasiInteraksi: () => void;
  debugState: () => { x: number; z: number; y: number; nearby: string | null; animasi: { klip: string; timeScale: number } | null };
  dispose: () => void;
}

const TEMA_BADAI: SceneTheme = {
  sky: 0x1e293b,
  fog: 0x1e293b,
  sun: 0xbfd4ff,
  hemiSky: 0x64748b,
  hemiGround: 0x1f2937,
  grass: 0x52525b,
  ambient: 1,
};

const pos = (r: number, a: number, y: number): THREE.Vector3 => new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));
const tinggiTangga = (i: number, a: number): number => (i + a / DUA_PI) * TINGGI_LANTAI;

/** Pita quad dari fungsi titik (u 0..1 sepanjang, v 0/1 melintang). */
function pita(titik: (u: number, v: 0 | 1) => THREE.Vector3, seg: number): THREE.BufferGeometry {
  const p: number[] = [];
  for (let s = 0; s < seg; s++) {
    const [a0, a1, b0, b1] = [titik(s / seg, 0), titik((s + 1) / seg, 0), titik(s / seg, 1), titik((s + 1) / seg, 1)];
    p.push(...a0.toArray(), ...b0.toArray(), ...a1.toArray(), ...a1.toArray(), ...b0.toArray(), ...b1.toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return g;
}

export function createMercusuarWorld(opsi: {
  canvas: HTMLCanvasElement;
  input: InputManager;
  getProgress: () => Progress;
  keadaan: KeadaanPintu;
  lampuMenyala: boolean;
  quality?: SceneQuality;
}): MercusuarHandle {
  const { scene, renderer, camera, dispose: disposeScene } = createScene(opsi.canvas, {
    quality: opsi.quality,
    theme: TEMA_BADAI,
    groundSize: 80,
  });
  renderer.localClippingEnabled = true;
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T): T => {
    disposables.push(o);
    return o;
  };
  const keadaan = opsi.keadaan;
  let dibuang = false;

  // Saat di dalam, semua yang lebih tinggi dari kepala dipotong supaya kamera melihat lantai pemain.
  const potong = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
  const bahan = (color: number, side: THREE.Side = THREE.FrontSide): THREE.MeshStandardMaterial =>
    track(new THREE.MeshStandardMaterial({ color, roughness: 0.9, side, clippingPlanes: [potong] }));
  const matDinding = bahan(0xd6d3d1);
  const matKayu = bahan(0x8b5a2b, THREE.DoubleSide);
  const matLantai = bahan(0x78716c);
  const matPagar = bahan(0x5b3a1e, THREE.DoubleSide);
  const tambah = (geo: THREE.BufferGeometry, mat: THREE.Material, y = 0): THREE.Mesh => {
    const m = new THREE.Mesh(track(geo), mat);
    m.position.y = y;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  /* ---------- Dinding: pita bawah berlubang untuk pintu masuk ---------- */
  // CylinderGeometry: sudut three = π/2 - a.
  const celah = LEBAR_MASUK + 0.05;
  const tinggiMenara = PUTARAN * TINGGI_LANTAI + 3.5;
  tambah(new THREE.CylinderGeometry(R_DINDING, R_DINDING, 2.8, 48, 1, true, -Math.PI / 2 + celah, DUA_PI - 2 * celah), matDinding, 1.4);
  tambah(new THREE.CylinderGeometry(R_DINDING, R_DINDING, tinggiMenara - 2.8, 48, 1, true), matDinding, 2.8 + (tinggiMenara - 2.8) / 2);
  // Atap & cincin merah hanya untuk tampak luar; dari dalam menutupi pandangan.
  const hiasLuar = [tambah(new THREE.ConeGeometry(R_DINDING + 0.6, 3, 48), bahan(0xb91c1c), tinggiMenara + 1.5)];
  for (let y = 1.5; y < tinggiMenara; y += 3) hiasLuar.push(tambah(new THREE.TorusGeometry(R_DINDING + 0.02, 0.12, 6, 48).rotateX(Math.PI / 2), bahan(0xdc2626), y));

  /* ---------- Lantai, tangga, pagar ---------- */
  tambah(new THREE.CircleGeometry(R_DINDING, 48).rotateX(-Math.PI / 2), matLantai, 0.02);
  for (let i = 1; i < N; i++) tambah(new THREE.CylinderGeometry(R_LANTAI, R_LANTAI, 0.3, 48), matLantai, i * TINGGI_LANTAI - 0.15);
  const rLuar = R_DINDING - 0.05;
  for (let i = 0; i < PUTARAN; i++) {
    const h = (u: number): number => tinggiTangga(i, u * DUA_PI);
    tambah(pita((u, v) => pos(v ? rLuar : R_LANTAI, u * DUA_PI, h(u)), 96), matKayu);
    tambah(pita((u, v) => pos(v ? rLuar : R_LANTAI, u * DUA_PI, h(u) - 0.3), 96), matKayu);
    tambah(pita((u, v) => pos(R_LANTAI, u * DUA_PI, h(u) - v * 0.3), 96), matKayu);
    const a0 = SAMBUNG;
    const a1 = DUA_PI - SAMBUNG;
    tambah(pita((u, v) => { const a = a0 + u * (a1 - a0); return pos(R_LANTAI, a, tinggiTangga(i, a) + v * 0.9); }, 80), matPagar);
  }
  const pagarLantai = (y: number, a0: number, a1: number): void => {
    tambah(pita((u, v) => pos(R_LANTAI - 0.02, a0 + u * (a1 - a0), y + v * 0.9), 60), matPagar);
  };
  pagarLantai(0, SAMBUNG, SUDUT_MASUK - 0.3);
  pagarLantai(0, SUDUT_MASUK + 0.3, DUA_PI);
  for (let i = 1; i < N; i++) pagarLantai(i * TINGGI_LANTAI, SAMBUNG, DUA_PI - SAMBUNG);

  /* ---------- Lampu ruangan & kilat ---------- */
  // Mode ringan: satu lampu yang ikut lantai pemain, bukan satu per lantai.
  const lampuLantai = Array.from({ length: modeRingan() ? 1 : N }, (_, i) => {
    const l = new THREE.PointLight(0xffc27a, 14, 14, 1.4);
    l.position.set(0, i * TINGGI_LANTAI + 3, 0);
    scene.add(l);
    return l;
  });
  track({ dispose: saatRingan(() => lampuLantai.splice(1).forEach((l) => scene.remove(l))) });
  const kilat = new THREE.AmbientLight(0xdbeafe, 0);
  scene.add(kilat);
  let kilatBerikut = 4;

  /* ---------- Pintu masuk ---------- */
  const engselMasuk = new THREE.Group();
  engselMasuk.position.copy(pos(R_DINDING, SUDUT_MASUK - celah, 0));
  const daunMasuk = new THREE.Mesh(track(new THREE.BoxGeometry(0.15, 2.6, 2 * celah * R_DINDING)), bahan(0x7c2d12));
  daunMasuk.position.set(0, 1.3, celah * R_DINDING);
  engselMasuk.add(daunMasuk);
  scene.add(engselMasuk);
  const papanMasuk = buildTag(t('Final'), t('Mercusuar Tua'), 0xfacc15, track);
  papanMasuk.position.copy(pos(R_DINDING + 0.4, SUDUT_MASUK, 3.4));
  scene.add(papanMasuk);
  const titikPeta = new THREE.Vector3(-12.5, 0, 3.5);
  const papanPeta = buildTag(t('Jalan'), t('🗺️ Jalan ke Peta'), 0x38bdf8, track);
  papanPeta.position.set(titikPeta.x, 2.2, titikPeta.z);
  scene.add(papanPeta);

  /* ---------- Pintu tiap lantai + lampu kunci ---------- */
  const pintu = Array.from({ length: PUTARAN }, (_, i) => {
    const y = tinggiTangga(i, SUDUT_PINTU);
    const engsel = new THREE.Group();
    engsel.position.copy(pos(rLuar, SUDUT_PINTU, y));
    engsel.rotation.y = -SUDUT_PINTU;
    const daun = new THREE.Mesh(track(new THREE.BoxGeometry(rLuar - R_LANTAI, 2.4, 0.15)), bahan(0x7c2d12));
    daun.position.set(-(rLuar - R_LANTAI) / 2, 1.2, 0);
    engsel.add(daun);
    scene.add(engsel);
    const lampu = new THREE.Group();
    lampu.position.copy(pos(R_PINTU, SUDUT_PINTU, y + 2.7));
    lampu.rotation.y = -SUDUT_PINTU;
    scene.add(lampu);
    const tag = buildTag(t('Pintu'), FINAL_BAGIAN[i]?.tempat ?? '', 0xfacc15, track);
    tag.scale.setScalar(0.8);
    tag.position.copy(pos(R_PINTU, SUDUT_PINTU, y + 3.4));
    scene.add(tag);
    return { engsel, daun, lampu, sudut: 0, getar: 0 };
  });
  const geoLampuKunci = track(new THREE.SphereGeometry(0.09, 10, 8));
  const matMati = track(new THREE.MeshBasicMaterial({ color: 0x334155 }));
  const matNyala = track(new THREE.MeshBasicMaterial({ color: 0xfacc15 }));

  /* ---------- Lampu puncak ---------- */
  const yPuncak = PUTARAN * TINGGI_LANTAI;
  tambah(new THREE.CylinderGeometry(0.7, 0.9, 1.1, 16), bahan(0x44403c), yPuncak + 0.55);
  const matBola = track(new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfacc15, emissiveIntensity: 0.1, clippingPlanes: [potong] }));
  const bola = new THREE.Mesh(track(new THREE.SphereGeometry(0.55, 20, 14)), matBola);
  bola.position.y = yPuncak + 1.6;
  scene.add(bola);
  const sorot = new THREE.Mesh(
    track(new THREE.ConeGeometry(1.6, 14, 24, 1, true).rotateZ(Math.PI / 2).translate(7, 0, 0)),
    track(new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })),
  );
  sorot.position.y = yPuncak + 1.6;
  sorot.visible = false;
  scene.add(sorot);
  const cahayaPuncak = new THREE.PointLight(0xfde68a, 0, 20, 1.2);
  cahayaPuncak.position.y = yPuncak + 1.8;
  scene.add(cahayaPuncak);
  let menyala = false;
  const nyalakan = (): void => {
    menyala = true;
    matBola.emissiveIntensity = 2.5;
    sorot.visible = true;
    cahayaPuncak.intensity = 30;
  };
  if (opsi.lampuMenyala) nyalakan();

  /* ---------- Penjaga tiap lantai ---------- */
  const npc: Array<{ lantai: number; rig: NpcGlb }> = [];
  const berkasPenjaga: string[] = [];
  const muatPenjaga: Promise<unknown>[] = [];
  FINAL_BAGIAN.forEach((b, i) => {
    b.penjaga.forEach((nama, j) => {
      const berkas = BAB[b.kode[j] ?? '']?.penjaga;
      if (!berkas) return;
      berkasPenjaga.push(berkasNpc(berkas));
      const janji = loadModel(berkasNpc(berkas)).then((gltf) => {
        if (dibuang) return;
        const rig = buatNpc(gltf, track);
        rig.group.position.copy(pos(2.6, 0.5 + j * 0.45, i * TINGGI_LANTAI));
        // Menghadap tempat pemain berdiri di depan pintu.
        const ke = pos(R_LANTAI - 0.8, 0.15, 0);
        rig.group.rotation.y = Math.atan2(ke.x - rig.group.position.x, ke.z - rig.group.position.z);
        const tag = buildTag(t('Penjaga'), nama, 0xfacc15, track);
        tag.scale.setScalar(0.6);
        tag.position.set(0, 2.2, 0.2);
        rig.group.add(tag);
        scene.add(rig.group);
        npc.push({ lantai: i, rig });
      }).catch(() => undefined);
      muatPenjaga.push(janji);
    });
  });

  /* ---------- Pemain ---------- */
  const prog = opsi.getProgress();
  const player: PlayerBundle = createPlayer({ gender: prog.gender, warnaPakaian: prog.warnaBaju, warnaBawahan: prog.warnaBawahan, warnaHijab: prog.warnaHijab, kostum: kostumDari(prog) });
  const awal = pos(11, SUDUT_MASUK, 0);
  player.setPosition(awal.x, awal.z);
  player.faceDirection(1, 0, 1);
  scene.add(player.group);
  const glbPemain = player.cobaPakaiGlb();
  const cam = createCameraController(camera);
  // Kamera di belakang pemain (sisi -x), menghadap menara.
  cam.setYaw(-Math.PI / 2);

  let paused = false;
  let nearby: Dekat | null = null;
  const titikPintu = (i: number): THREE.Vector3 => pos(R_PINTU, SUDUT_PINTU, i * TINGGI_LANTAI);

  function cariDekat(): Dekat | null {
    const p = player.position;
    const dekat = (q: THREE.Vector3, r: number): boolean => Math.hypot(p.x - q.x, p.z - q.z) < r && Math.abs(p.y - q.y) < 1.2;
    if (!keadaan.masukTerbuka && dekat(pos(R_DINDING, SUDUT_MASUK, 0), 2.8)) return { jenis: 'masuk' };
    if (dekat(titikPeta, 2.5)) return { jenis: 'peta' };
    // Seluruh lantai Puncak: lampu bisa dinyalakan dari mana saja di lantai itu.
    if (dekat(new THREE.Vector3(0, yPuncak, 0), R_LANTAI)) return { jenis: 'lampu' };
    for (let i = 0; i < PUTARAN; i++) if (!keadaan.terbuka[i] && dekat(titikPintu(i), 3)) return { jenis: 'pintu', lantai: i };
    return null;
  }

  const update = (dt: number, elapsed: number): void => {
    const orbit = opsi.input.consumeOrbit();
    if (orbit.yaw !== 0 || orbit.pitch !== 0) cam.orbit(orbit.yaw, orbit.pitch);
    const p = player.position;
    if (!paused) {
      const yaw = cam.getYaw();
      const s = opsi.input.state;
      const laju = s.lari ? RUN_SPEED : MOVE_SPEED;
      const wx = (s.moveX * Math.cos(yaw) - s.moveY * Math.sin(yaw)) * laju * dt;
      const wz = (-s.moveX * Math.sin(yaw) - s.moveY * Math.cos(yaw)) * laju * dt;
      if (s.jumpPressed && player.lompat()) sfx.lompat();
      if (player.updateLompat(dt)) sfx.mendarat();
      const [x0, z0] = [p.x, p.z];
      if (s.moving) {
        const coba = (x: number, z: number): boolean => {
          const h = tinggiPermukaan(x, z, p.y, keadaan);
          if (h === null) return false;
          player.setPosition(x, z, h);
          return true;
        };
        // Menggeser sepanjang dinding/pagar bila arah langsung terhalang.
        if (!coba(p.x + wx, p.z + wz) && !coba(p.x + wx, p.z)) coba(p.x, p.z + wz);
        player.faceDirection(wx, wz, dt);
      }
      player.animate(dt > 0 ? Math.hypot(p.x - x0, p.z - z0) / dt : 0, elapsed);
    } else {
      player.animate(0, elapsed);
    }

    const diDalam = Math.hypot(p.x, p.z) < R_DINDING;
    const tampakLantai = (i: number): boolean => i * TINGGI_LANTAI <= p.y + 2.9;
    if (lampuLantai.length === 1) (lampuLantai[0] as THREE.PointLight).position.y = Math.floor(p.y / TINGGI_LANTAI) * TINGGI_LANTAI + 3;
    for (const n of npc) {
      n.rig.group.visible = diDalam && tampakLantai(n.lantai);
      n.rig.update(dt, 0);
    }
    pintu.forEach((d, i) => {
      const tujuan = keadaan.terbuka[i] ? -Math.PI / 2 : 0;
      d.sudut += (tujuan - d.sudut) * Math.min(1, dt * 3);
      d.engsel.rotation.y = -SUDUT_PINTU + d.sudut;
      d.getar = Math.max(0, d.getar - dt);
      d.daun.position.z = Math.sin(d.getar * 60) * d.getar * 0.25;
      const tampak = !diDalam || tampakLantai(i);
      d.engsel.visible = tampak;
      d.lampu.visible = tampak;
    });
    engselMasuk.rotation.y += ((keadaan.masukTerbuka ? Math.PI / 2 : 0) - engselMasuk.rotation.y) * Math.min(1, dt * 3);

    for (const m of hiasLuar) m.visible = !diDalam;
    potong.constant = diDalam ? p.y + 2.9 : 1000;
    matDinding.side = diDalam ? THREE.BackSide : THREE.FrontSide;
    if (menyala) sorot.rotation.y += dt * 0.8;
    kilatBerikut -= dt;
    if (kilatBerikut <= 0) {
      kilat.intensity = 2.5;
      kilatBerikut = 5 + ((elapsed * 7.3) % 5);
    }
    kilat.intensity = Math.max(0, kilat.intensity - dt * 8);

    nearby = cariDekat();
    cam.update(p, dt, player.group.position.y - p.y);
    player.poseOrangPertama(cam.diMataPemain() ? camera : null);
    renderer.render(scene, camera);
  };

  return {
    siapkan: async () => {
      await Promise.all([glbPemain, ...muatPenjaga]);
      await siapkanRender(renderer, scene, camera);
    },
    update,
    setPaused: (v) => {
      paused = v;
    },
    getNearby: () => nearby,
    layarDekat: () => {
      if (!nearby) return null;
      const q =
        nearby.jenis === 'masuk' ? pos(R_DINDING + 0.6, SUDUT_MASUK, 0)
        : nearby.jenis === 'peta' ? titikPeta.clone()
        : nearby.jenis === 'lampu' ? new THREE.Vector3(0, yPuncak, 0)
        : titikPintu('lantai' in nearby ? nearby.lantai : 0);
      q.y += 2.6;
      return titikKeLayar(q.project(camera), renderer.domElement.clientWidth, renderer.domElement.clientHeight);
    },
    bukaPintuMasuk: () => {
      keadaan.masukTerbuka = true;
    },
    setPintu: (i, v) => {
      keadaan.terbuka[i] = v;
    },
    setLampuPintu: (i, total, nyala) => {
      const g = pintu[i]?.lampu;
      if (!g) return;
      g.clear();
      for (let k = 0; k < total; k++) {
        const m = new THREE.Mesh(geoLampuKunci, k < nyala ? matNyala : matMati);
        m.position.x = (k - (total - 1) / 2) * 0.24;
        g.add(m);
      }
    },
    jawab: (benar) => {
      const d = nearby?.jenis === 'pintu' ? pintu[nearby.lantai] : undefined;
      if (!benar && d) d.getar = 0.4;
      if (benar) player.lompat();
    },
    nyalakanLampu: nyalakan,
    pindahKePintu: (i) => {
      const q = pos(R_LANTAI - 0.8, 0.15, i * TINGGI_LANTAI);
      player.setPosition(q.x, q.z, q.y);
      const ke = titikPintu(i);
      player.faceDirection(ke.x - q.x, ke.z - q.z, 1);
      nearby = cariDekat();
    },
    npcBicara: (lantai) => {
      for (const n of npc) n.rig.setBicara(n.lantai === lantai);
    },
    setModeKamera: (m) => cam.setMode(m),
    animasiInteraksi: () => player.interaksi(),
    debugState: () => ({
      x: Math.round(player.position.x * 100) / 100,
      z: Math.round(player.position.z * 100) / 100,
      y: Math.round(player.position.y * 100) / 100,
      nearby: nearby ? (nearby.jenis === 'pintu' ? `pintu${nearby.lantai}` : nearby.jenis) : null,
      animasi: player.infoAnimasi(),
    }),
    dispose: () => {
      dibuang = true;
      player.dispose();
      cam.dispose();
      disposables.forEach((d) => d.dispose());
      disposeScene();
      berkasPenjaga.forEach(lepasModel);
    },
  };
}
