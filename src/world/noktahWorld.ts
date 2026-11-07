import * as THREE from 'three';
import { createScene, type SceneQuality, QUALITY_HIGH, THEME_ZONA } from './scene';
import { createPlayer, type PlayerBundle } from './player';
import { createCameraController, type CameraController } from './camera';
import { resolveAll, clampToMap } from './collision';
import { buildSign, buildBadge, buildTag, buildPlakat } from './papan';
import { buatKios } from './kios';
import { buildDiorama } from './diorama';
import { buatKarakter, type KarakterRig } from './karakter';
import { createPengelolaPemainLain, type PengelolaPemainLain } from './pemainLain';
import { buildPenghias, type PenghiasHandle, type PenghiasTitik } from './instancing';
import { warnaBalai } from '../data/balai';
import { bangunLatar, TEMA_BALAI } from './latarBalai';
import type { CeritaBalai } from '../data/cerita';
import type { InputManager } from '../input/controls';
import { sfx } from '../core/sound';
import type { BalaiMeta, Progress, TahapMisi } from '../../shared/types';
import type { PosisiPemain } from '../../shared/net';
import type { ColliderBox } from './mapConfig';

/**
 * Dunia 3D satu BALAI. Setiap balai punya lima titik yang dikunjungi
 * berurutan (pola misi 6 tahap):
 *
 *   gerbang masuk (titik muncul) → Penjaga (misi) → Ruang Cerita (Cantrik +
 *   panggung diorama) → Tempat Uji (terkunci sampai cerita dibaca; Penjaga
 *   pindah ke sini) → Gerbang Keluar (jalan kembali ke peta).
 *
 * Letak titik berbeda antar balai (tiga tata letak dicerminkan bergantian),
 * dan sebuah panah melayang + cincin di tanah selalu menunjuk tujuan berikutnya.
 */

export type PeranTitik = 'penjaga' | 'cantrik' | 'uji' | 'gerbang';

export interface NoktahWorldOptions {
  canvas: HTMLCanvasElement;
  input: InputManager;
  balai: BalaiMeta;
  cerita: CeritaBalai;
  tahap: TahapMisi;
  /** Prolog: pemain muncul di samping Penjaga, bukan di gerbang. */
  prolog?: boolean;
  getProgress: () => Progress;
  quality?: SceneQuality;
}

export interface TitikDekat {
  peran: PeranTitik;
}

export interface NoktahWorldHandle {
  renderer: THREE.WebGLRenderer;
  update: (dt: number, elapsed: number) => void;
  getNearby: () => TitikDekat | null;
  /** Menyetel tahap misi (memindah Penjaga, membuka Tempat Uji, arah panah). */
  setTahap: (tahap: TahapMisi) => void;
  /** Menyalakan obor Tempat Uji (0..3) sebagai efek kemajuan soal. */
  setOborUji: (jumlah: number) => void;
  setBalaiStars: (kode: string, stars: number) => void;
  setPaused: (paused: boolean) => void;
  resetCamera: () => void;
  setPemainLain: (daftar: PosisiPemain[]) => void;
  posisiPemain: () => { x: number; z: number; rot: number };
  /** Pintasan uji: letakkan pemain di dekat sebuah titik. */
  pindahKe: (peran: PeranTitik) => boolean;
  debugState: () => { x: number; z: number; nearby: string | null; tahap: number; tinggi: number; yaw: number };
  dispose: () => void;
}

const MOVE_SPEED = 7.5;
const PLAYER_RADIUS = 0.9;
const AREA = 44;
const SETENGAH = AREA / 2;
const RADIUS_BICARA = 3.4;

type Titik = { x: number; z: number };
interface TataLetak {
  muncul: Titik;
  penjaga: Titik;
  cerita: Titik;
  uji: Titik;
  gerbang: Titik;
  rumah: Titik;
}

/** Tiga tata letak dasar; balai genap memakai versi cermin (x dibalik). */
const TATA: TataLetak[] = [
  { muncul: { x: 0, z: 17 }, penjaga: { x: -5, z: 9 }, cerita: { x: -11, z: -3 }, uji: { x: 10, z: -4 }, gerbang: { x: 14, z: 13 }, rumah: { x: 0, z: -13 } },
  { muncul: { x: 0, z: 17 }, penjaga: { x: 6, z: 7 }, cerita: { x: 0, z: -6 }, uji: { x: -12, z: -9 }, gerbang: { x: -14, z: 12 }, rumah: { x: 11, z: -12 } },
  { muncul: { x: -12, z: 15 }, penjaga: { x: -7, z: 6 }, cerita: { x: 9, z: 6 }, uji: { x: 0, z: -9 }, gerbang: { x: 14, z: -12 }, rumah: { x: -11, z: -12 } },
];

export function tataLetakUntuk(urutan: number): TataLetak {
  const dasar = TATA[(urutan - 1) % TATA.length] as TataLetak;
  if (Math.floor((urutan - 1) / TATA.length) % 2 === 0) return dasar;
  const cermin = (t: Titik): Titik => ({ x: -t.x, z: t.z });
  return {
    muncul: cermin(dasar.muncul),
    penjaga: cermin(dasar.penjaga),
    cerita: cermin(dasar.cerita),
    uji: cermin(dasar.uji),
    gerbang: cermin(dasar.gerbang),
    rumah: cermin(dasar.rumah),
  };
}

function hadapKe(dari: Titik, ke: Titik): number {
  return Math.atan2(ke.x - dari.x, ke.z - dari.z);
}

export function createNoktahWorld(options: NoktahWorldOptions): NoktahWorldHandle {
  const quality = options.quality ?? QUALITY_HIGH;
  const meta = options.balai;
  const cerita = options.cerita;
  const { scene, renderer, camera, dispose: disposeScene } = createScene(options.canvas, {
    quality,
    theme: TEMA_BALAI[meta.kode] ?? THEME_ZONA[meta.elemen] ?? THEME_ZONA['Makhluk Hidup'],
    groundSize: AREA + 60,
  });

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };
  const tata = tataLetakUntuk(cerita.urutan);
  const warna = warnaBalai(meta.kode);
  const colliders: ColliderBox[] = [];

  /* ---------------- Jalan setapak antar titik ---------------- */
  const jalanMat = track(new THREE.MeshLambertMaterial({ color: 0xd6b48a }));
  const jalur: Titik[] = [tata.muncul, tata.penjaga, tata.cerita, tata.uji, tata.gerbang];
  for (let i = 0; i < jalur.length - 1; i++) {
    const a = jalur[i] as Titik;
    const b = jalur[i + 1] as Titik;
    const panjang = Math.hypot(b.x - a.x, b.z - a.z);
    const geo = track(new THREE.PlaneGeometry(2.2, panjang));
    const m = new THREE.Mesh(geo, jalanMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(b.x - a.x, b.z - a.z);
    m.position.set((a.x + b.x) / 2, 0.012, (a.z + b.z) / 2);
    m.receiveShadow = true;
    scene.add(m);
  }

  /* ---------------- Rumah balai ---------------- */
  const rumah = new THREE.Group();
  rumah.position.set(tata.rumah.x, 0, tata.rumah.z);
  rumah.rotation.y = hadapKe(tata.rumah, tata.penjaga);
  const kios = buatKios({ warna, tanpaPalang: true }, track);
  kios.group.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  rumah.add(kios.group);
  const papanNama = buildSign(cerita.tempat, warna, track);
  papanNama.scale.setScalar(0.85);
  papanNama.position.set(0.55, 2.56, kios.dalam / 2 + 0.06);
  rumah.add(papanNama);
  const lencana = buildBadge(String(meta.kode), warna, track);
  lencana.position.set(-2.0, 2.56, kios.dalam / 2 + 0.06);
  lencana.scale.set(0.28, 0.28, 1);
  rumah.add(lencana);
  scene.add(rumah);
  colliders.push(kotak(tata.rumah.x, tata.rumah.z, 4.6, 4.6));

  // Bintang di atas rumah.
  const bintang: THREE.Mesh[] = [];
  const starMat = track(new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  const starGeo = track(new THREE.OctahedronGeometry(0.3));
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(starGeo, starMat);
    s.position.set((i - 1) * 0.8, kios.tinggiAtap + 1.4, 0);
    s.visible = false;
    rumah.add(s);
    bintang.push(s);
  }

  /* ---------------- Penjaga ---------------- */
  const penjagaRig = buatKarakter({
    gender: cerita.penjaga.gender,
    warnaPakaian: cerita.penjaga.warnaBaju,
    warnaBawahan: cerita.penjaga.warnaBawahan,
    warnaHijab: cerita.penjaga.warnaKepala,
    warnaRambut: cerita.penjaga.busana?.jenggot ? 0xd4d4d4 : undefined,
    warnaKulit: 0xe0ac7e,
    busana: cerita.penjaga.busana,
    pakaiMarker: false,
    skala: 1,
  });
  penjagaRig.geometri.forEach((x) => track(x));
  penjagaRig.material.forEach((x) => track(x));
  penjagaRig.group.traverse((o) => (o.castShadow = true));
  const tagPenjaga = buildTag('Penjaga', cerita.penjaga.nama, warna, track);
  tagPenjaga.scale.setScalar(0.9);
  tagPenjaga.position.set(0, 2.35, 0.2);
  penjagaRig.group.add(tagPenjaga);
  scene.add(penjagaRig.group);
  const posPenjaga = new THREE.Vector3();
  const targetPenjaga = new THREE.Vector3();

  /* ---------------- Ruang Cerita: panggung + Cantrik ---------------- */
  const ruang = new THREE.Group();
  ruang.position.set(tata.cerita.x, 0, tata.cerita.z);
  ruang.rotation.y = hadapKe(tata.cerita, tata.penjaga);
  const panggung = buildDiorama(meta.kode, warna, track);
  panggung.scale.setScalar(0.8);
  panggung.position.set(0, 0, -2.2);
  panggung.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  ruang.add(panggung);
  const plakat = buildPlakat(meta.materi, warna, track);
  plakat.scale.setScalar(0.55);
  plakat.position.set(-2.6, 1.9, -1.2);
  plakat.rotation.y = 0.35;
  ruang.add(plakat);
  scene.add(ruang);
  const pusatPanggung = posisiLokal(ruang, new THREE.Vector3(0, 0, -2.2));
  colliders.push(kotak(pusatPanggung.x, pusatPanggung.z, 3.8, 3.8));

  const cantrikRig = buatKarakter({
    gender: cerita.cantrik.gender,
    warnaPakaian: cerita.cantrik.warnaBaju,
    warnaBawahan: cerita.cantrik.warnaBawahan,
    warnaHijab: cerita.cantrik.warnaKepala,
    busana: cerita.cantrik.busana,
    pakaiMarker: false,
    skala: 0.86,
  });
  cantrikRig.geometri.forEach((x) => track(x));
  cantrikRig.material.forEach((x) => track(x));
  cantrikRig.group.traverse((o) => (o.castShadow = true));
  const posCantrik = posisiLokal(ruang, new THREE.Vector3(1.9, 0, 0.2));
  cantrikRig.group.position.set(posCantrik.x, 0, posCantrik.z);
  cantrikRig.group.rotation.y = ruang.rotation.y;
  const tagCantrik = buildTag('Halaman Cerita', cerita.cantrik.nama, warna, track);
  tagCantrik.scale.setScalar(0.85);
  tagCantrik.position.set(0, 2.1, 0.2);
  cantrikRig.group.add(tagCantrik);
  const buku = buatBuku(warna, track);
  buku.position.set(0.9, 1.7, 0.3);
  cantrikRig.group.add(buku);
  scene.add(cantrikRig.group);
  colliders.push(kotak(posCantrik.x, posCantrik.z, 1.1, 1.1));

  /* ---------------- Tempat Uji ---------------- */
  const uji = buatTempatUji(warna, track);
  uji.group.position.set(tata.uji.x, 0, tata.uji.z);
  uji.group.rotation.y = hadapKe(tata.uji, tata.cerita);
  scene.add(uji.group);

  /* ---------------- Gerbang keluar ---------------- */
  const gerbang = buatGerbang(track);
  gerbang.group.position.set(tata.gerbang.x, 0, tata.gerbang.z);
  gerbang.group.rotation.y = hadapKe(tata.gerbang, tata.uji);
  scene.add(gerbang.group);
  for (const sisi of [-1, 1]) {
    const p = posisiLokal(gerbang.group, new THREE.Vector3(sisi * 1.9, 0, 0));
    colliders.push(kotak(p.x, p.z, 0.9, 0.9));
  }

  /* ---------------- Penunjuk arah ---------------- */
  const panahMat = track(new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
  const panah = new THREE.Group();
  const kerucut = new THREE.Mesh(track(new THREE.ConeGeometry(0.45, 0.9, 16)), panahMat);
  kerucut.rotation.x = Math.PI;
  panah.add(kerucut);
  const batang = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 10)), panahMat);
  batang.position.y = 0.75;
  panah.add(batang);
  scene.add(panah);
  const cincinGeo = track(new THREE.RingGeometry(1.3, 1.7, 36));
  cincinGeo.rotateX(-Math.PI / 2);
  const cincinMat = track(new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.7, depthWrite: false }));
  const cincin = new THREE.Mesh(cincinGeo, cincinMat);
  cincin.position.y = 0.03;
  scene.add(cincin);

  /* ---------------- Pagar & penghias ---------------- */
  buildPagar(scene, track);
  colliders.push(
    kotak(0, SETENGAH, AREA, 1),
    kotak(0, -SETENGAH, AREA, 1),
    kotak(-SETENGAH, 0, 1, AREA),
    kotak(SETENGAH, 0, 1, AREA),
  );
  const dihindari: Titik[] = [tata.muncul, tata.penjaga, tata.cerita, tata.uji, tata.gerbang, tata.rumah];
  // Latar khas balai (goa, lembah, ladang, sungai, tebing, dst.).
  const latar = bangunLatar(String(meta.kode), scene, track, dihindari);
  colliders.push(...latar.colliders);
  const gersang = ['F01', 'F02', 'F03', 'E01'].includes(String(meta.kode));
  const penghias: PenghiasHandle[] = [
    buildPenghias(scene, 'pohon', sebar(gersang ? 0 : 10, 6, dihindari, jalur), track),
    buildPenghias(scene, 'semak', sebar(gersang ? 6 : 20, 3, dihindari, jalur), track),
    buildPenghias(scene, 'batu', sebar(gersang ? 14 : 6, 4, dihindari, jalur), track),
    buildPenghias(scene, 'lampu', sebar(6, 9, dihindari, jalur), track),
  ];

  /* ---------------- Pemain ---------------- */
  const prog = options.getProgress();
  const player: PlayerBundle = createPlayer({
    gender: prog.gender,
    warnaPakaian: prog.warnaBaju,
    warnaBawahan: prog.warnaBawahan,
    warnaHijab: prog.warnaHijab,
  });
  const arahMuncul = { x: tata.muncul.x - tata.penjaga.x, z: tata.muncul.z - tata.penjaga.z };
  const panjangArah = Math.hypot(arahMuncul.x, arahMuncul.z) || 1;
  // Prolog: pemain "terbangun" sekitar 3,6 langkah di depan Penjaga (tidak menutupi sosoknya).
  const awal = options.prolog
    ? { x: tata.penjaga.x + (arahMuncul.x / panjangArah) * 3.6 + 1.2, z: tata.penjaga.z + (arahMuncul.z / panjangArah) * 3.6 }
    : tata.muncul;
  player.setPosition(awal.x, awal.z);
  scene.add(player.group);
  void player.cobaPakaiGlb(renderer);
  const camCtrl: CameraController = createCameraController(camera);
  camCtrl.setYaw(Math.atan2(-(tata.penjaga.x - awal.x), -(tata.penjaga.z - awal.z)));

  const pemainLain: PengelolaPemainLain = createPengelolaPemainLain(scene);

  /* ---------------- Status ---------------- */
  let tahap: TahapMisi = options.tahap;
  let paused = false;
  let nearby: TitikDekat | null = null;

  const posisiPenjagaUntuk = (t: TahapMisi): Titik => {
    if (t >= 2) {
      const p = posisiLokal(uji.group, new THREE.Vector3(0, 0, -2.9));
      return p;
    }
    return tata.penjaga;
  };

  const terapkanTahap = (t: TahapMisi, langsung: boolean): void => {
    tahap = t;
    const p = posisiPenjagaUntuk(t);
    targetPenjaga.set(p.x, 0, p.z);
    if (langsung) {
      posPenjaga.copy(targetPenjaga);
      penjagaRig.group.position.copy(posPenjaga);
    }
    uji.setTerbuka(t >= 2);
  };
  terapkanTahap(tahap, true);

  function titikTujuan(): Titik {
    if (tahap === 0) return { x: posPenjaga.x, z: posPenjaga.z };
    if (tahap === 1) return posCantrik;
    if (tahap === 2) return { x: tata.uji.x, z: tata.uji.z };
    return tata.gerbang;
  }

  function posisiTitik(peran: PeranTitik): Titik {
    if (peran === 'penjaga') return { x: posPenjaga.x, z: posPenjaga.z };
    if (peran === 'cantrik') return posCantrik;
    if (peran === 'uji') return tata.uji;
    return tata.gerbang;
  }

  function cariDekat(): TitikDekat | null {
    let terbaik: TitikDekat | null = null;
    let jarakTerbaik = Infinity;
    for (const peran of ['penjaga', 'cantrik', 'uji', 'gerbang'] as const) {
      // Saat penjaga berdiri di Tempat Uji, keduanya satu titik interaksi: uji.
      if (peran === 'penjaga' && tahap >= 2) continue;
      const p = posisiTitik(peran);
      const batas = peran === 'uji' ? RADIUS_BICARA + 1 : RADIUS_BICARA;
      const d = Math.hypot(player.position.x - p.x, player.position.z - p.z);
      if (d < batas && d < jarakTerbaik) {
        jarakTerbaik = d;
        terbaik = { peran };
      }
    }
    return terbaik;
  }

  const update = (dt: number, elapsed: number): void => {
    const orbit = options.input.consumeOrbit();
    if (orbit.yaw !== 0 || orbit.pitch !== 0) camCtrl.orbit(orbit.yaw, orbit.pitch);

    if (!paused) {
      // Gerak relatif ke kamera: joystick "atas" = menjauh dari kamera (maju di
      // layar), "kanan" = ke kanan layar, ke mana pun kamera sedang menghadap.
      // Kamera berada di (sin yaw, cos yaw) dari pemain, jadi arah maju adalah
      // (-sin yaw, -cos yaw) dan arah kanan (cos yaw, -sin yaw).
      const yaw = camCtrl.getYaw();
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);
      const mx = options.input.state.moveX;
      const my = options.input.state.moveY;
      const wishX = (mx * cosY - my * sinY) * MOVE_SPEED * dt;
      const wishZ = (-mx * sinY - my * cosY) * MOVE_SPEED * dt;
      if (options.input.state.jumpPressed && player.lompat()) sfx.lompat();
      if (player.updateLompat(dt)) sfx.mendarat();
      if (options.input.state.moving) {
        const resolved = resolveAll({ x: player.position.x + wishX, z: player.position.z + wishZ, r: PLAYER_RADIUS }, colliders);
        const clamped = clampToMap(resolved.x, resolved.z, SETENGAH, PLAYER_RADIUS + 0.4);
        player.setPosition(clamped.x, clamped.z);
        player.faceDirection(wishX, wishZ, dt);
      }
      player.animate(options.input.state.moving ? MOVE_SPEED : 0, elapsed);
    }

    // Penjaga berjalan pelan menuju posisinya (mis. pindah ke Tempat Uji).
    const jarakPenjaga = posPenjaga.distanceTo(targetPenjaga);
    if (jarakPenjaga > 0.05) {
      const langkah = Math.min(jarakPenjaga, dt * 4);
      const arah = targetPenjaga.clone().sub(posPenjaga).normalize();
      posPenjaga.addScaledVector(arah, langkah);
      penjagaRig.group.position.copy(posPenjaga);
      penjagaRig.group.rotation.y = Math.atan2(arah.x, arah.z);
      penjagaRig.langkah(4, elapsed);
    } else {
      penjagaRig.idle(elapsed, 0.4);
      hadapkan(penjagaRig, posPenjaga, dt);
    }
    cantrikRig.idle(elapsed, 1.7);
    hadapkan(cantrikRig, new THREE.Vector3(posCantrik.x, 0, posCantrik.z), dt);
    buku.position.y = 1.7 + Math.sin(elapsed * 1.7) * 0.08;
    buku.rotation.y += dt * 0.8;

    nearby = cariDekat();

    // Panah tujuan melayang di atas titik berikutnya.
    const tujuan = titikTujuan();
    const tinggi = tahap === 3 ? 4.6 : 3.3;
    panah.position.set(tujuan.x, tinggi + Math.sin(elapsed * 3) * 0.25, tujuan.z);
    panah.rotation.y += dt * 2;
    cincin.position.set(tujuan.x, 0.03, tujuan.z);
    const denyut = 1 + Math.sin(elapsed * 3) * 0.1;
    cincin.scale.setScalar(denyut);
    panah.visible = nearby === null;

    uji.update(elapsed);
    latar.update(elapsed);
    gerbang.update(elapsed, tahap === 3);
    for (const p of penghias) p.update(player.position);
    pemainLain.update(dt, elapsed);
    camCtrl.update(player.position, dt);
    renderer.render(scene, camera);
  };

  function hadapkan(rig: KarakterRig, pos: THREE.Vector3, dt: number): void {
    const d = Math.hypot(player.position.x - pos.x, player.position.z - pos.z);
    if (d > 7) return;
    const target = Math.atan2(player.position.x - pos.x, player.position.z - pos.z);
    let beda = target - rig.group.rotation.y;
    while (beda > Math.PI) beda -= Math.PI * 2;
    while (beda < -Math.PI) beda += Math.PI * 2;
    rig.group.rotation.y += beda * Math.min(1, dt * 3);
  }

  return {
    renderer,
    update,
    getNearby: () => nearby,
    setTahap: (t) => terapkanTahap(t, false),
    setOborUji: (n) => uji.setObor(n),
    setBalaiStars: (_kode, stars) => bintang.forEach((s, i) => (s.visible = i < stars)),
    setPaused: (v) => {
      paused = v;
    },
    resetCamera: () => camCtrl.reset(),
    setPemainLain: (daftar) => pemainLain.set(daftar),
    posisiPemain: () => ({ x: player.position.x, z: player.position.z, rot: player.group.rotation.y }),
    pindahKe: (peran) => {
      const p = posisiTitik(peran);
      const dx = tata.muncul.x - p.x;
      const dz = tata.muncul.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      player.setPosition(p.x + (dx / len) * 2.2, p.z + (dz / len) * 2.2);
      nearby = cariDekat();
      return true;
    },
    debugState: () => ({
      x: Math.round(player.position.x * 100) / 100,
      z: Math.round(player.position.z * 100) / 100,
      nearby: nearby?.peran ?? null,
      tahap,
      tinggi: Math.round(player.group.position.y * 100) / 100,
      yaw: Math.round(camCtrl.getYaw() * 1000) / 1000,
    }),
    dispose: () => {
      player.dispose();
      pemainLain.dispose();
      camCtrl.dispose();
      for (const p of penghias) p.dispose();
      disposables.forEach((d) => d.dispose());
      disposeScene();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Pembuat objek                                                       */
/* ------------------------------------------------------------------ */

type Track = <T extends { dispose: () => void }>(o: T) => T;

function kotak(cx: number, cz: number, w: number, d: number): ColliderBox {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
}

function posisiLokal(g: THREE.Object3D, lokal: THREE.Vector3): Titik {
  const rot = g.rotation.y;
  return {
    x: g.position.x + lokal.x * Math.cos(rot) + lokal.z * Math.sin(rot),
    z: g.position.z - lokal.x * Math.sin(rot) + lokal.z * Math.cos(rot),
  };
}

/** Tempat Uji: lingkaran batu dengan 3 obor + pagar bambu saat terkunci. */
function buatTempatUji(aksen: number, track: Track): {
  group: THREE.Group;
  setTerbuka: (v: boolean) => void;
  setObor: (n: number) => void;
  update: (t: number) => void;
} {
  const g = new THREE.Group();
  const batuMat = track(new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 }));
  const alas = new THREE.Mesh(track(new THREE.CylinderGeometry(2.6, 2.8, 0.3, 28)), batuMat);
  alas.position.y = 0.15;
  alas.receiveShadow = true;
  g.add(alas);
  const cincinMat = track(new THREE.MeshStandardMaterial({ color: aksen, roughness: 0.6 }));
  const cincin = new THREE.Mesh(track(new THREE.TorusGeometry(2.3, 0.08, 8, 40)), cincinMat);
  cincin.rotation.x = Math.PI / 2;
  cincin.position.y = 0.32;
  g.add(cincin);

  // Tiga obor di belakang lingkaran.
  const kayuMat = track(new THREE.MeshLambertMaterial({ color: 0x6b4423 }));
  const apiMat = track(new THREE.MeshBasicMaterial({ color: 0xf97316 }));
  const apiPadamMat = track(new THREE.MeshBasicMaterial({ color: 0x475569 }));
  const tiangGeo = track(new THREE.CylinderGeometry(0.09, 0.12, 1.6, 8));
  const apiGeo = track(new THREE.ConeGeometry(0.22, 0.5, 10));
  const api: THREE.Mesh[] = [];
  [-1.6, 0, 1.6].forEach((x) => {
    const tiang = new THREE.Mesh(tiangGeo, kayuMat);
    tiang.position.set(x, 0.95, -2.1);
    tiang.castShadow = true;
    g.add(tiang);
    const a = new THREE.Mesh(apiGeo, apiPadamMat);
    a.position.set(x, 1.95, -2.1);
    g.add(a);
    api.push(a);
  });

  // Pagar bambu (tampak saat terkunci).
  const pagar = new THREE.Group();
  const bambuMat = track(new THREE.MeshLambertMaterial({ color: 0xa3a04a }));
  const bambuGeo = track(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 6));
  for (let i = 0; i < 18; i++) {
    const s = (i / 18) * Math.PI * 2;
    const b = new THREE.Mesh(bambuGeo, bambuMat);
    b.position.set(Math.cos(s) * 2.9, 0.65, Math.sin(s) * 2.9);
    pagar.add(b);
  }
  const talimGeo = track(new THREE.TorusGeometry(2.9, 0.04, 6, 40));
  const tali = new THREE.Mesh(talimGeo, bambuMat);
  tali.rotation.x = Math.PI / 2;
  tali.position.y = 1.0;
  pagar.add(tali);
  g.add(pagar);

  let terbuka = false;
  let nyala = 0;
  return {
    group: g,
    setTerbuka: (v) => {
      terbuka = v;
      pagar.visible = !v;
      cincinMat.emissive = new THREE.Color(v ? aksen : 0x000000);
      cincinMat.emissiveIntensity = v ? 0.6 : 0;
    },
    setObor: (n) => {
      nyala = Math.max(0, Math.min(3, n));
      api.forEach((a, i) => (a.material = i < nyala ? apiMat : apiPadamMat));
    },
    update: (t) => {
      api.forEach((a, i) => {
        if (i < nyala || terbuka) {
          a.scale.y = 1 + Math.sin(t * 9 + i) * 0.15;
        }
      });
    },
  };
}

/** Gapura keluar bergaya candi bentar + cahaya portal. */
function buatGerbang(track: Track): { group: THREE.Group; update: (t: number, menyala: boolean) => void } {
  const g = new THREE.Group();
  const bataMat = track(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 }));
  const atasMat = track(new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 }));
  for (const sisi of [-1, 1]) {
    const tiang = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 3.4, 0.9)), bataMat);
    tiang.position.set(sisi * 1.9, 1.7, 0);
    tiang.castShadow = true;
    g.add(tiang);
    const puncak = new THREE.Mesh(track(new THREE.ConeGeometry(0.62, 1.1, 4)), atasMat);
    puncak.position.set(sisi * 1.9, 3.95, 0);
    puncak.rotation.y = Math.PI / 4;
    g.add(puncak);
  }
  const portalMat = track(
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  const portal = new THREE.Mesh(track(new THREE.PlaneGeometry(2.9, 3.1)), portalMat);
  portal.position.set(0, 1.6, 0);
  g.add(portal);
  const papan = buildSign('🗺️ Jalan ke Peta', 0x0e7490, track);
  papan.scale.setScalar(0.7);
  papan.position.set(0, 3.7, 0.1);
  g.add(papan);
  return {
    group: g,
    update: (t, menyala) => {
      portalMat.opacity = (menyala ? 0.45 : 0.22) + Math.sin(t * 2.5) * 0.08;
    },
  };
}

function buatBuku(aksen: number, track: Track): THREE.Group {
  const g = new THREE.Group();
  const koverMat = track(new THREE.MeshLambertMaterial({ color: aksen }));
  const halamanMat = track(new THREE.MeshBasicMaterial({ color: 0xfff7e6 }));
  for (const sisi of [-1, 1]) {
    const kover = new THREE.Mesh(track(new THREE.BoxGeometry(0.3, 0.38, 0.05)), koverMat);
    kover.position.set(sisi * 0.15, 0, 0);
    kover.rotation.y = sisi * 0.32;
    g.add(kover);
    const halaman = new THREE.Mesh(track(new THREE.BoxGeometry(0.25, 0.33, 0.035)), halamanMat);
    halaman.position.set(sisi * 0.15, 0, 0.045);
    halaman.rotation.y = sisi * 0.32;
    g.add(halaman);
  }
  return g;
}

function acak(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function jarakKeSegmen(px: number, pz: number, a: Titik, b: Titik): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const p2 = dx * dx + dz * dz;
  if (p2 === 0) return Math.hypot(px - a.x, pz - a.z);
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / p2));
  return Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz));
}

function sebar(jumlah: number, seed: number, hindari: Titik[], jalur: Titik[]): PenghiasTitik[] {
  const rng = acak(seed * 7919 + 13);
  const out: PenghiasTitik[] = [];
  let coba = 0;
  while (out.length < jumlah && coba < jumlah * 40) {
    coba++;
    const x = (rng() * 2 - 1) * (SETENGAH - 2);
    const z = (rng() * 2 - 1) * (SETENGAH - 2);
    if (hindari.some((p) => Math.hypot(x - p.x, z - p.z) < 6)) continue;
    let dekatJalan = false;
    for (let i = 0; i < jalur.length - 1; i++) {
      if (jarakKeSegmen(x, z, jalur[i] as Titik, jalur[i + 1] as Titik) < 3) dekatJalan = true;
    }
    if (dekatJalan) continue;
    out.push({ x, z, skala: 0.75 + rng() * 0.55, rotasi: rng() * Math.PI * 2 });
  }
  return out;
}

function buildPagar(scene: THREE.Scene, track: Track): void {
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
