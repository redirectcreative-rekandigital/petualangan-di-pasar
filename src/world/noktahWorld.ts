import * as THREE from 'three';
import { createScene, siapkanRender, type SceneQuality, QUALITY_HIGH, THEME_ZONA } from './scene';
import { createPlayer, type PlayerBundle } from './player';
import { createCameraController, titikKeLayar, type CameraController, type FokusKamera, type ModeKamera } from './camera';
import { resolveAll, clampToMap } from './collision';
import { buildTag, buildPlakat } from './papan';
import { buatDuniaGlb, buatNpc, type AsetBab, type DuniaGlb, type NpcGlb } from './asetBab';
import { buatBalonSapa, createPengelolaPemainLain, Y_BALON, type PengelolaPemainLain } from './pemainLain';
import { warnaBalai } from '../data/balai';
import { bangunLatar, TEMA_BALAI } from './latarBalai';
import type { CeritaBalai } from '../data/cerita';
import type { InputManager } from '../input/controls';
import { sfx } from '../core/sound';
import type { BalaiMeta, Progress, TahapMisi } from '../../shared/types';
import type { PosisiPemain } from '../../shared/net';
import type { ColliderBox } from './mapConfig';
import { t } from '../core/bahasa';
import { kostumDari } from '../core/kostumPemain';

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
export type PeranNpc = 'penjaga' | 'cantrik';

export interface NoktahWorldOptions {
  canvas: HTMLCanvasElement;
  input: InputManager;
  balai: BalaiMeta;
  cerita: CeritaBalai;
  tahap: TahapMisi;
  /** Prolog: pemain muncul di samping Penjaga, bukan di gerbang. */
  prolog?: boolean;
  /** Berkas GLB bab ini, sudah dimuat (`muatAsetBab`). */
  aset: AsetBab;
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
  /** Balon emoji di atas karakter sendiri. */
  sapaSendiri: (emoji: string) => void;
  posisiPemain: () => { x: number; z: number; rot: number };
  /** Sudut kamera orbit saat ini (radian). */
  yawKamera: () => number;
  /** Pemain memutar animasi interaksi (bicara/baca/tantangan/gerbang). */
  animasiInteraksi: () => void;
  /** NPC yang sedang berbicara (klip Talk), `null` bila dialog selesai. */
  npcBicara: (peran: PeranNpc | null) => void;
  /** Kamera mendekat ke pemain dan lawan bicara; `null` kembali ke kamera normal. */
  fokusPercakapan: (peran: PeranTitik | null) => void;
  setModeKamera: (mode: ModeKamera) => void;
  /** Posisi layar (px) untuk tombol aksi di atas tokoh/titik terdekat. */
  layarTitikDekat: () => { x: number; y: number } | null;
  /** NPC memberi alat atau tugas (klip Interact sekali main). */
  npcInteraksi: (peran: PeranNpc) => void;
  /** Adegan pembuka: pemain tidur lalu bangun. Selesai saat kembali Idle. */
  adeganBangun: () => Promise<void>;
  /** Meletakkan pemain di koordinat tertentu (mis. setelah ganti bahasa). */
  letakkanPemain: (pos: { x: number; z: number; rot: number; yaw?: number }) => void;
  /** Pintasan uji: letakkan pemain di dekat sebuah titik. */
  pindahKe: (peran: PeranTitik) => boolean;
  /** Pra-render: tunggu avatar, unggah tekstur & kompilasi shader sebelum loading ditutup. */
  siapkan: () => Promise<void>;
  debugState: () => {
    x: number;
    z: number;
    nearby: string | null;
    tahap: number;
    tinggi: number;
    yaw: number;
    animasi: { klip: string; timeScale: number } | null;
  };
  dispose: () => void;
}

/** Batas kecepatan agar klip Walk (0,71 m/s x timeScale maks 3) tidak meluncur. */
const MOVE_SPEED = 2.1;
/** Kecepatan saat lari dikunci (klip Run). */
const RUN_SPEED = 4;
/** Klip Walk NPC 0,5 m/s terlalu lambat untuk menyeberang arena: dipercepat 3x. */
const JALAN_NPC = 1.5;
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
  const { scene, renderer, camera, ground, dispose: disposeScene } = createScene(options.canvas, {
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

  const dunia: DuniaGlb = buatDuniaGlb(scene, options.aset, warna, track);

  /* ---------------- Lantai & jalan setapak antar titik ---------------- */
  // Ubin 4 m dengan tepi di y 0,06: diturunkan supaya permukaannya di y = 0.
  ground.position.y = -0.12;
  const lantai = [...options.aset.kit.keys()].find((k) => k.startsWith('lantai_')) as string;
  for (let x = -20; x <= 20; x += 4) {
    for (let z = -20; z <= 20; z += 4) dunia.tanam(lantai, x, -0.06, z);
  }
  const jalur: Titik[] = [tata.muncul, tata.penjaga, tata.cerita, tata.uji, tata.gerbang];
  for (let i = 0; i < jalur.length - 1; i++) {
    const a = jalur[i] as Titik;
    const b = jalur[i + 1] as Titik;
    const panjang = Math.hypot(b.x - a.x, b.z - a.z);
    // Ruas lurus 3 m (sumbu Z) direntang sepanjang jalan; tebal 4 cm menutup gelombang lantai.
    dunia.tanam('jalan_lebar_lurus', (a.x + b.x) / 2, 0, (a.z + b.z) / 2, [1, 1, panjang / 3], Math.atan2(b.x - a.x, b.z - a.z));
  }

  /* ---------------- Rumah balai ---------------- */
  const rumah = dunia.pasang(options.aset.rumah, tata.rumah.x, tata.rumah.z, hadapKe(tata.rumah, tata.penjaga), { teks: cerita.tempat }).root;
  colliders.push(kotak(tata.rumah.x, tata.rumah.z, 4.6, 4.6));
  const tinggiAtap = new THREE.Box3().setFromObject(rumah).max.y;

  // Bintang di atas rumah.
  const bintang: THREE.Mesh[] = [];
  const starMat = track(new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  const starGeo = track(new THREE.OctahedronGeometry(0.3));
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(starGeo, starMat);
    s.position.set((i - 1) * 0.8, tinggiAtap + 0.6, 0);
    s.visible = false;
    rumah.add(s);
    bintang.push(s);
  }

  /* ---------------- Penjaga ---------------- */
  const penjagaRig: NpcGlb = buatNpc(options.aset.penjaga, track);
  const tagPenjaga = buildTag(t('Penjaga'), cerita.penjaga.nama, warna, track);
  tagPenjaga.scale.setScalar(0.6);
  tagPenjaga.position.set(0, 2.2, 0.2);
  penjagaRig.group.add(tagPenjaga);
  scene.add(penjagaRig.group);
  const posPenjaga = new THREE.Vector3();
  const targetPenjaga = new THREE.Vector3();
  // Vektor kerja yang dipakai ulang tiap frame (tanpa sampah untuk GC).
  const _arah = new THREE.Vector3();
  const _layar = new THREE.Vector3();

  /* ---------------- Ruang Cerita: panggung + Cantrik ---------------- */
  const ruang = new THREE.Group();
  ruang.position.set(tata.cerita.x, 0, tata.cerita.z);
  ruang.rotation.y = hadapKe(tata.cerita, tata.penjaga);
  const plakat = buildPlakat(meta.materi, warna, track);
  plakat.scale.setScalar(0.55);
  plakat.position.set(-2.6, 1.9, -1.2);
  plakat.rotation.y = 0.35;
  ruang.add(plakat);
  scene.add(ruang);
  const pusatPanggung = posisiLokal(ruang, new THREE.Vector3(0, 0, -2.2));
  dunia.pasang(options.aset.stasiun, pusatPanggung.x, pusatPanggung.z, ruang.rotation.y);
  colliders.push(kotak(pusatPanggung.x, pusatPanggung.z, 3.8, 3.8));

  const cantrikRig: NpcGlb = buatNpc(options.aset.cantrik, track);
  const posCantrik = posisiLokal(ruang, new THREE.Vector3(1.9, 0, 0.2));
  cantrikRig.group.position.set(posCantrik.x, 0, posCantrik.z);
  cantrikRig.group.rotation.y = ruang.rotation.y;
  const tagCantrik = buildTag(t('Halaman Cerita'), cerita.cantrik.nama, warna, track);
  tagCantrik.scale.setScalar(0.85);
  tagCantrik.position.set(0, 2, 0.2);
  cantrikRig.group.add(tagCantrik);
  const buku = buatBuku(warna, track);
  buku.position.set(0.9, 1.7, 0.3);
  cantrikRig.group.add(buku);
  scene.add(cantrikRig.group);
  colliders.push(kotak(posCantrik.x, posCantrik.z, 1.1, 1.1));

  /* ---------------- Tempat Uji ---------------- */
  const uji = pasangTempatUji(dunia, options.aset, tata.uji.x, tata.uji.z, hadapKe(tata.uji, tata.cerita), warna);

  /* ---------------- Gerbang keluar ---------------- */
  const gerbang = pasangGerbang(dunia, options.aset, tata.gerbang.x, tata.gerbang.z, hadapKe(tata.gerbang, tata.uji));
  for (const sisi of [-1, 1]) {
    const p = posisiLokal(gerbang.root, new THREE.Vector3(sisi * 1.9, 0, 0));
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
  // Panah datar samar di tanah dekat kaki pemain, menunjuk tujuan berikutnya.
  const bentukKaki = new THREE.Shape();
  bentukKaki.moveTo(0, 0.55);
  bentukKaki.lineTo(0.4, 0.05);
  bentukKaki.lineTo(0.14, 0.05);
  bentukKaki.lineTo(0.14, -0.4);
  bentukKaki.lineTo(-0.14, -0.4);
  bentukKaki.lineTo(-0.14, 0.05);
  bentukKaki.lineTo(-0.4, 0.05);
  bentukKaki.closePath();
  const kakiGeo = track(new THREE.ShapeGeometry(bentukKaki));
  kakiGeo.rotateX(Math.PI / 2); // ujung panah menghadap +z lokal
  const kakiMat = track(new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  const panahKaki = new THREE.Mesh(kakiGeo, kakiMat);
  panahKaki.visible = false;
  scene.add(panahKaki);

  /* ---------------- Pagar & penghias ---------------- */
  tanamPagar(dunia);
  colliders.push(
    kotak(0, SETENGAH, AREA, 1),
    kotak(0, -SETENGAH, AREA, 1),
    kotak(-SETENGAH, 0, 1, AREA),
    kotak(SETENGAH, 0, 1, AREA),
  );
  const dihindari: Titik[] = [tata.muncul, tata.penjaga, tata.cerita, tata.uji, tata.gerbang, tata.rumah];
  // Latar khas balai (goa, lembah, ladang, sungai, tebing, dst.).
  const bebasJalur = (x: number, z: number, r: number): boolean =>
    dihindari.every((p) => Math.hypot(x - p.x, z - p.z) > r + 2) &&
    jalur.every((a, i) => i === jalur.length - 1 || jarakKeSegmen(x, z, a, jalur[i + 1] as Titik) > r + 1.1);
  const latar = bangunLatar(String(meta.kode), scene, dunia, track, dihindari, {
    ruang: { x: tata.cerita.x, z: tata.cerita.z, rot: ruang.rotation.y },
    uji: { x: tata.uji.x, z: tata.uji.z, rot: uji.root.rotation.y },
    bebasJalur,
  });
  colliders.push(...latar.colliders);
  const gersang = ['F01', 'F02', 'F03', 'E01'].includes(String(meta.kode));
  sebar(gersang ? 0 : 10, 6, dihindari, jalur).forEach((p, i) => dunia.tanam(i % 2 ? 'Pohon_Bulat_A' : 'Pohon_Bulat_B', p.x, 0, p.z, p.skala, p.rotasi));
  sebar(gersang ? 6 : 20, 3, dihindari, jalur).forEach((p, i) => dunia.tanam(i % 2 ? 'semak_a' : 'semak_b', p.x, 0, p.z, p.skala, p.rotasi));
  sebar(gersang ? 14 : 6, 4, dihindari, jalur).forEach((p, i) => dunia.tanam(`batu_kecil_${'abc'[i % 3]}`, p.x, 0, p.z, p.skala * 1.6, p.rotasi));
  for (const p of sebar(6, 9, dihindari, jalur)) dunia.pasang(options.aset.obor, p.x, p.z, p.rotasi);
  dunia.selesai();

  /* ---------------- Pemain ---------------- */
  const prog = options.getProgress();
  const player: PlayerBundle = createPlayer({
    gender: prog.gender,
    warnaPakaian: prog.warnaBaju,
    warnaBawahan: prog.warnaBawahan,
    warnaHijab: prog.warnaHijab,
    kostum: kostumDari(prog),
  });
  const arahMuncul = { x: tata.muncul.x - tata.penjaga.x, z: tata.muncul.z - tata.penjaga.z };
  const panjangArah = Math.hypot(arahMuncul.x, arahMuncul.z) || 1;
  // Prolog: pemain "terbangun" sekitar 3,6 langkah di depan Penjaga (tidak menutupi sosoknya).
  const awal = options.prolog
    ? { x: tata.penjaga.x + (arahMuncul.x / panjangArah) * 3.6 + 1.2, z: tata.penjaga.z + (arahMuncul.z / panjangArah) * 3.6 }
    : tata.muncul;
  player.setPosition(awal.x, awal.z);
  scene.add(player.group);
  const glbPemain = player.cobaPakaiGlb();
  const camCtrl: CameraController = createCameraController(camera);
  camCtrl.setYaw(Math.atan2(-(tata.penjaga.x - awal.x), -(tata.penjaga.z - awal.z)));

  const pemainLain: PengelolaPemainLain = createPengelolaPemainLain(scene, player.position);
  const balonSaya = track(buatBalonSapa());
  balonSaya.sprite.position.y = Y_BALON;
  player.group.add(balonSaya.sprite);

  /* ---------------- Status ---------------- */
  let tahap: TahapMisi = options.tahap;
  let paused = false;
  let nearby: TitikDekat | null = null;
  let fokusPeran: PeranTitik | null = null;
  let sisiFokus = 1;
  let modeKamera: ModeKamera = 'normal';

  const posisiPenjagaUntuk = (t: TahapMisi): Titik => {
    if (t >= 2) {
      const p = posisiLokal(uji.root, new THREE.Vector3(0, 0, -2.9));
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
    if (tahap === 0) return posPenjaga;
    if (tahap === 1) return posCantrik;
    if (tahap === 2) return tata.uji;
    return tata.gerbang;
  }

  function posisiTitik(peran: PeranTitik): Titik {
    if (peran === 'penjaga') return posPenjaga;
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

  /** Bidikan dari samping, condong ke sisi pemain agar wajah lawan bicara terlihat. */
  function bidikanPercakapan(peran: PeranTitik, sisi: number): FokusKamera {
    const titik = posisiTitik(peran);
    const dx = titik.x - player.position.x;
    const dz = titik.z - player.position.z;
    const jarak = Math.hypot(dx, dz) || 1;
    const ux = dx / jarak;
    const uz = dz / jarak;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // Keduanya muat melebar, dan muat di setengah atas layar (bawah tertutup kotak dialog).
    const mundur = Math.max((jarak / 2 + 1) / (tanV * camera.aspect), 1.9 / tanV);
    const tengahX = player.position.x + dx / 2;
    const tengahZ = player.position.z + dz / 2;
    return {
      posisi: new THREE.Vector3(tengahX - uz * sisi * mundur - ux * mundur * 0.35, 1.7, tengahZ + ux * sisi * mundur - uz * mundur * 0.35),
      lihat: new THREE.Vector3(tengahX, 0.3, tengahZ),
    };
  }

  /** Sisi kamera bebas bila titik kamera dan tengah pandangannya tidak di dalam penghalang. */
  function sisiBebas(peran: PeranTitik, sisi: number): boolean {
    const { posisi, lihat } = bidikanPercakapan(peran, sisi);
    return [1, 0.55].every((f) => {
      const x = lihat.x + (posisi.x - lihat.x) * f;
      const z = lihat.z + (posisi.z - lihat.z) * f;
      const r = resolveAll({ x, z, r: 0.4 }, colliders);
      const c = clampToMap(x, z, SETENGAH, 0.4);
      return Math.hypot(r.x - x, r.z - z) < 0.01 && c.x === x && c.z === z;
    });
  }

  const update = (dt: number, elapsed: number): void => {
    const orbit = options.input.consumeOrbit();
    if (!fokusPeran && (orbit.yaw !== 0 || orbit.pitch !== 0)) camCtrl.orbit(orbit.yaw, orbit.pitch);

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
      const laju = options.input.state.lari ? RUN_SPEED : MOVE_SPEED;
      const wishX = (mx * cosY - my * sinY) * laju * dt;
      const wishZ = (-mx * sinY - my * cosY) * laju * dt;
      if (options.input.state.jumpPressed && player.lompat()) sfx.lompat();
      if (player.updateLompat(dt)) sfx.mendarat();
      // Kecepatan NYATA (setelah tabrakan) dikirim ke animasi: berjalan menabrak
      // dinding tidak membuat kaki melangkah di tempat terlalu cepat.
      const xLama = player.position.x;
      const zLama = player.position.z;
      if (options.input.state.moving) {
        const resolved = resolveAll({ x: player.position.x + wishX, z: player.position.z + wishZ, r: PLAYER_RADIUS }, colliders);
        const clamped = clampToMap(resolved.x, resolved.z, SETENGAH, PLAYER_RADIUS + 0.4);
        player.setPosition(clamped.x, clamped.z);
        player.faceDirection(wishX, wishZ, dt);
      }
      const kecepatanNyata = dt > 0 ? Math.hypot(player.position.x - xLama, player.position.z - zLama) / dt : 0;
      player.animate(kecepatanNyata, elapsed);
      // Sudut mata: badan selalu searah kamera agar tangan tetap di depan pandangan.
      if (modeKamera === 'tangan') player.faceDirection(-sinY, -cosY, 1);
    } else {
      // Dijeda (percakapan/modal): animasi tetap hidup (Idle / Interact selesai main).
      player.animate(0, elapsed);
      if (fokusPeran) {
        const lawan = posisiTitik(fokusPeran);
        player.faceDirection(lawan.x - player.position.x, lawan.z - player.position.z, dt);
      }
    }

    // Penjaga berjalan pelan menuju posisinya (mis. pindah ke Tempat Uji).
    const jarakPenjaga = posPenjaga.distanceTo(targetPenjaga);
    if (jarakPenjaga > 0.05) {
      const langkah = Math.min(jarakPenjaga, dt * JALAN_NPC);
      const arah = _arah.subVectors(targetPenjaga, posPenjaga).normalize();
      posPenjaga.addScaledVector(arah, langkah);
      penjagaRig.group.position.copy(posPenjaga);
      penjagaRig.group.rotation.y = Math.atan2(arah.x, arah.z);
      penjagaRig.update(dt, JALAN_NPC);
    } else {
      penjagaRig.update(dt, 0);
      hadapkan(penjagaRig, posPenjaga, dt);
    }
    cantrikRig.update(dt, 0);
    hadapkan(cantrikRig, posCantrik, dt);
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

    // Panah kaki: muncul/hilang perlahan; disembunyikan saat dekat tujuan atau dunia dijeda.
    const dx = tujuan.x - player.position.x;
    const dz = tujuan.z - player.position.z;
    const jarakTujuan = Math.hypot(dx, dz);
    const tampilKaki = !paused && nearby === null && jarakTujuan > 3;
    const opasitasKaki = tampilKaki ? 0.4 + Math.sin(elapsed * 3) * 0.1 : 0;
    kakiMat.opacity += (opasitasKaki - kakiMat.opacity) * Math.min(1, dt * 6);
    panahKaki.visible = kakiMat.opacity > 0.01;
    if (jarakTujuan > 0.01) {
      panahKaki.position.set(player.position.x + (dx / jarakTujuan) * 1.1, 0.04, player.position.z + (dz / jarakTujuan) * 1.1);
      panahKaki.rotation.y = Math.atan2(dx, dz);
    }

    latar.update(elapsed);
    gerbang.update(elapsed, tahap === 3);
    dunia.update(dt, elapsed, player.position);
    pemainLain.update(dt);
    balonSaya.update(dt);
    if (fokusPeran) camCtrl.setFokus(bidikanPercakapan(fokusPeran, sisiFokus));
    camCtrl.update(player.position, dt, player.group.position.y);
    player.poseOrangPertama(camCtrl.diMataPemain() ? camera : null);
    renderer.render(scene, camera);
  };

  function hadapkan(rig: NpcGlb, pos: Titik, dt: number): void {
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
    sapaSendiri: (emoji) => balonSaya.tampilkan(emoji),
    posisiPemain: () => ({ x: player.position.x, z: player.position.z, rot: player.group.rotation.y }),
    animasiInteraksi: () => player.interaksi(),
    npcBicara: (peran) => {
      penjagaRig.setBicara(peran === 'penjaga');
      cantrikRig.setBicara(peran === 'cantrik');
    },
    fokusPercakapan: (peran) => {
      fokusPeran = peran;
      if (!peran) {
        camCtrl.setFokus(null);
        return;
      }
      // Tetap di sisi kamera sekarang agar tidak berputar jauh, kecuali sisi itu terhalang.
      const { posisi, lihat } = bidikanPercakapan(peran, 1);
      const dekat = camera.position.clone().sub(lihat).dot(posisi.sub(lihat)) >= 0 ? 1 : -1;
      sisiFokus = sisiBebas(peran, dekat) || !sisiBebas(peran, -dekat) ? dekat : -dekat;
    },
    setModeKamera: (mode) => {
      modeKamera = mode;
      camCtrl.setMode(mode);
    },
    layarTitikDekat: () => {
      if (!nearby) return null;
      // Di Tempat Uji yang sudah terbuka, tombol menempel pada penjaga yang menunggu di sana.
      const titik = nearby.peran === 'uji' && tahap >= 2 ? { x: posPenjaga.x, z: posPenjaga.z } : posisiTitik(nearby.peran);
      const atas = nearby.peran === 'gerbang' ? 3.4 : nearby.peran === 'uji' && tahap < 2 ? 2.6 : 2.1;
      const kanvas = renderer.domElement;
      return titikKeLayar(_layar.set(titik.x, atas, titik.z).project(camera), kanvas.clientWidth, kanvas.clientHeight);
    },
    npcInteraksi: (peran) => (peran === 'penjaga' ? penjagaRig : cantrikRig).interaksi(),
    // Adegan Tidur/Bangun harus terlihat utuh, apa pun mode kamera pilihan pemain.
    adeganBangun: async () => {
      camCtrl.setMode('normal');
      await glbPemain;
      await player.adeganBangun();
      camCtrl.setMode(modeKamera);
    },
    yawKamera: () => camCtrl.getYaw(),
    letakkanPemain: (pos) => {
      player.setPosition(pos.x, pos.z);
      player.faceDirection(Math.sin(pos.rot), Math.cos(pos.rot), 1);
      if (pos.yaw !== undefined) camCtrl.setYaw(pos.yaw);
      nearby = cariDekat();
    },
    siapkan: async () => {
      await glbPemain;
      // Satu frame update menempatkan kamera & pose sebelum shader dikompilasi.
      update(0, 0);
      await siapkanRender(renderer, scene, camera);
    },
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
      animasi: player.infoAnimasi(),
    }),
    dispose: () => {
      player.dispose();
      pemainLain.dispose();
      camCtrl.dispose();
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

/** Tempat Uji (`panggung_uji`): tiga api yang dinyalakan satu per jawaban benar. */
function pasangTempatUji(
  dunia: DuniaGlb,
  aset: AsetBab,
  x: number,
  z: number,
  rotY: number,
  aksen: number,
): { root: THREE.Object3D; setTerbuka: (v: boolean) => void; setObor: (n: number) => void } {
  const { root, mixer, klip } = dunia.pasang(aset.arena, x, z, rotY, { putar: false });
  const node = (nama: string): THREE.Object3D => {
    const o = root.getObjectByName(nama);
    if (!o) throw new Error(`Node arena tidak ada: ${nama}`);
    return o;
  };
  const api = [1, 2, 3].map((k) => ({
    mati: node(`Api_${k}_Mati`),
    nyala: node(`Api_${k}_Nyala`),
    aksi: (mixer as THREE.AnimationMixer).clipAction(klip(`Api_${k}_Kedip`)),
  }));
  for (const a of api) a.nyala.visible = false;
  const pagar = node('Pagar_Uji');
  const cincin = (node('Cincin_Aksen') as THREE.Mesh).material as THREE.MeshStandardMaterial;
  return {
    root,
    setTerbuka: (v) => {
      pagar.visible = !v;
      cincin.emissive.setHex(v ? aksen : 0x000000);
      cincin.emissiveIntensity = v ? 0.6 : 0;
    },
    setObor: (n) => {
      api.forEach((a, i) => {
        const menyala = i < n;
        a.mati.visible = !menyala;
        a.nyala.visible = menyala;
        if (!menyala) a.aksi.stop();
        else if (!a.aksi.isRunning()) a.aksi.reset().play();
      });
    },
  };
}

/** Gerbang keluar (`gerbang_peta`): Portal berdenyut, opacity tetap di 0,22..0,45. */
function pasangGerbang(
  dunia: DuniaGlb,
  aset: AsetBab,
  x: number,
  z: number,
  rotY: number,
): { root: THREE.Object3D; update: (t: number, menyala: boolean) => void } {
  const { root } = dunia.pasang(aset.gerbang, x, z, rotY, { teks: t('🗺️ Jalan ke Peta') });
  const portal = root.getObjectByName('Portal') as THREE.Mesh;
  const portalMat = portal.material as THREE.MeshStandardMaterial;
  return {
    root,
    update: (waktu, menyala) => {
      portalMat.opacity = (menyala ? 0.41 : 0.26) + Math.sin(waktu * 2.5) * 0.04;
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

function sebar(jumlah: number, seed: number, hindari: Titik[], jalur: Titik[]): Array<Titik & { skala: number; rotasi: number }> {
  const rng = acak(seed * 7919 + 13);
  const out: Array<Titik & { skala: number; rotasi: number }> = [];
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

/** Pagar keliling dari segmen 2 m (tiang di x = -1): 4 sisi saling menutup sudut. */
function tanamPagar(dunia: DuniaGlb): void {
  const tepi = 21;
  for (let i = -20; i <= 20; i += 2) {
    dunia.tanam('pagar_kayu_segmen', i, 0, -tepi);
    dunia.tanam('pagar_kayu_segmen', tepi, 0, i, 1, -Math.PI / 2);
    dunia.tanam('pagar_kayu_segmen', -i, 0, tepi, 1, Math.PI);
    dunia.tanam('pagar_kayu_segmen', -tepi, 0, -i, 1, Math.PI / 2);
  }
}
