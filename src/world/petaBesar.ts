import * as THREE from 'three';
import { NOKTAH } from '../data/balai';
import { URUTAN_BALAI } from '../data/cerita';
import { buatPulau3D, posisiDiPulau, DIAMETER_PULAU } from './pulau';
import { buatKios } from './kios';
import { berkasRumah } from './asetBab';
import { loadModel, klonModel, lepasModel } from './loaders';
import { buangRenderer, siapkanRender } from './scene';
import { modeRingan, saatRingan, catatFrame } from '../core/kualitas';
import { buatKarakter, type KarakterRig } from './karakter';
import { cobaAvatarGlb, type AvatarModel } from './avatarModel';
import type { PilihanKostum } from './kostum';
import { sfx } from '../core/sound';
import type { Elemen, NoktahId, NoktahMeta } from '../../shared/types';

/**
 * Peta besar 3D bergaya "peta harta karun" versi interaktif.
 *
 * Berbeda dari versi pertama yang statis, peta ini bisa DIJELAJAH:
 *   - seret satu jari / klik kiri untuk MENGGESER peta (ke balai mana pun),
 *   - putar dua jari, atau klik kanan / Shift + seret, untuk memutar peta,
 *   - gulir roda / cubit dua jari untuk zoom,
 *   - tombol 🎯 untuk kembali memusatkan kamera ke tujuan berikutnya,
 *   - ketuk bulat-bulat noktah untuk masuk ke dunianya.
 *
 * Bila pemain diam beberapa saat, peta berputar perlahan sendiri supaya terasa
 * hidup. Semua penghias memakai aset prosedural yang sama dengan dunia noktah
 * (`kios.ts`, `karakter.ts`, bentuk dasar) agar gaya visualnya seragam.
 */

export interface PetaBesarOptions {
  /** Dipanggil saat sebuah noktah diketuk. */
  onPilih: (kode: NoktahId) => void;
  /** Info status tiap noktah (terkunci/bintang) untuk pewarnaan. */
  getStatus: (kode: NoktahId) => { terkunci: boolean; stars: number; dikunjungi: boolean };
  /**
   * Noktah tempat pemain berada sekarang (biasanya noktah terakhir yang
   * dikunjungi). Ikon karakter kecil akan berdiri di sana.
   */
  getPosisiPemain: () => NoktahId | null;
  /**
   * Tujuan berikutnya (balai yang harus dikunjungi). Kamera mendekat ke sini
   * dan sebuah panah kuning melayang di atasnya.
   */
  getTujuan?: () => NoktahId | null;
  /** Penampilan ikon pemain di peta (mengikuti pilihan karakter). */
  penampilanPemain?: {
    gender: 'laki-laki' | 'perempuan';
    warnaPakaian?: number;
    warnaBawahan?: number;
    warnaHijab?: number;
    /** Kostum avatar GLB (sama dengan di balai). */
    kostum?: PilihanKostum;
  };
  /**
   * Balai yang baru terbuka: kabutnya tetap tampil sampai `sibakKabut()`
   * dipanggil, lalu tersibak dengan animasi.
   */
  kabutTersibak?: NoktahId;
  /** Batas devicePixelRatio. */
  pixelRatioCap?: number;
}

export interface PetaBesarHandle {
  renderer: THREE.WebGLRenderer;
  /** Render satu frame + perbarui warna status. */
  render: () => void;
  /** Zoom bertahap: < 1 mendekat, > 1 menjauh. */
  zoom: (faktor: number) => void;
  /** Kembali menyorot tujuan berikutnya dari dekat. */
  fokusTujuan: () => void;
  /** Memutar animasi kabut tersibak (`kabutTersibak`); selesai saat kabut hilang. */
  sibakKabut: () => Promise<void>;
  /** Posisi layar (px) tiap balai, untuk uji otomatis. */
  posisiLayar: () => Array<{ kode: NoktahId; x: number; y: number }>;
  /** Selesai saat rumah GLB termuat dan shader/tekstur sudah disiapkan (tutup loading). */
  siap: Promise<void>;
  dispose: () => void;
}

/** Ukuran papan peta dalam satuan dunia. */
const BOARD_W = 64;
const BOARD_H = 84;

/** Mengubah persen (0..100) menjadi koordinat dunia di bidang papan. */
function persenKeDunia(peta: { x: number; y: number }): { x: number; z: number } {
  return {
    x: ((peta.x - 50) / 100) * BOARD_W,
    z: ((peta.y - 50) / 100) * BOARD_H,
  };
}

const WARNA_ELEMEN: Record<Elemen, number> = {
  'Makhluk Hidup': 0x2f9e6b,
  Fisika: 0x2563eb,
  Bumi: 0xd97706,
};

const WARNA_FINAL = 0x9333ea;

/** Urutan noktah untuk menggambar rute perjalanan. */
const RUTE: NoktahId[] = [...URUTAN_BALAI, 'FINAL'];

interface PulauNoktah {
  kode: NoktahId;
  group: THREE.Group;
  pin: THREE.Mesh;
  pinMat: THREE.MeshStandardMaterial;
  label: THREE.Sprite;
  labelMat: THREE.SpriteMaterial;
  bendera: THREE.Mesh;
  baseWarna: number;
  /** Fase animasi mengapung. */
  fase: number;
  /** Ketinggian dasar pin (untuk animasi mengapung). */
  basePinY: number;
  /** Awan kabut yang menutupi balai terkunci. */
  kabut: THREE.Group;
  /** Rumah GLB sudah terpasang (atau gagal, kios tetap tampil). */
  siap: Promise<void>;
}

export function createPetaBesar(canvas: HTMLCanvasElement, options: PetaBesarOptions): PetaBesarHandle {
  const pixelRatioCap = options.pixelRatioCap ?? 1.5;
  const ringan = modeRingan();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !ringan, alpha: false });
  renderer.setPixelRatio(ringan ? 1 : Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8f2fb);
  scene.fog = new THREE.Fog(0xeaf3fb, 220, 460);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  // --- Cahaya sore hangat ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffe6bd, 1.25);
  sun.position.set(28, 46, 18);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x155f8f, 0.55));

  // --- Papan peta (kertas tua) di atas laut ---
  // Pulau Wonorejo: teras bertingkat + jalan setapak melingkar.
  scene.add(buatPulau3D(track));
  void buatTeksturPapan;
  void persenKeDunia;

  // --- Laut beriak (bidang grid dengan gelombang lembut) ---
  const seaGeo = track(new THREE.PlaneGeometry(480, 480, 48, 48));
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = track(new THREE.MeshLambertMaterial({ color: 0x1a6fa6, flatShading: false }));
  // Ombak dihitung di GPU (dulu 2.401 vertex + normal dihitung ulang di CPU tiap frame).
  const waktuLaut = { value: 0 };
  seaMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWaktu = waktuLaut;
    shader.vertexShader = `uniform float uWaktu;\n${shader.vertexShader}`
      .replace(
        '#include <beginnormal_vertex>',
        `float fx = position.x * 0.08 + uWaktu * 1.1;
        float fz = position.z * 0.09 + uWaktu * 0.9;
        vec3 objectNormal = normalize(vec3(-0.028 * cos(fx), 1.0, 0.027 * sin(fz)));`,
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.x, sin(fx) * 0.35 + cos(fz) * 0.3, position.z);');
  };
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.y = -1.4;
  scene.add(sea);

  // --- Awan lembut melayang di langit peta ---
  const awan: THREE.Group[] = [];
  {
    const geoAwan = track(new THREE.IcosahedronGeometry(1, 1));
    const matAwan = track(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        fog: false,
      }),
    );
    let s = 4242;
    const acakAwan = (): number => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const bagian = 3 + Math.floor(acakAwan() * 3);
      for (let j = 0; j < bagian; j++) {
        const m = new THREE.Mesh(geoAwan, matAwan);
        m.position.set((j - bagian / 2) * 4 + acakAwan() * 2, acakAwan() * 1.5, acakAwan() * 2 - 1);
        const sk = 4 + acakAwan() * 4;
        m.scale.set(sk * 1.6, sk * 0.6, sk);
        g.add(m);
      }
      g.position.set((acakAwan() * 2 - 1) * 140, 95 + acakAwan() * 20, -160 + acakAwan() * 80);
      g.userData.kecepatan = 0.4 + acakAwan() * 0.5;
      scene.add(g);
      awan.push(g);
    }
  }

  // --- Pulau-pulau noktah ---
  const pulauList: PulauNoktah[] = [];
  const titikRute: THREE.Vector3[] = [];

  NOKTAH.forEach((n, i) => {
    const pos = posisiDiPulau(n.kode);
    const pulau = buatPulau(n, pos, i, track);
    pulau.group.position.y = pos.y;
    pulau.group.scale.setScalar(n.kode === 'FINAL' ? 0.75 : 0.55);
    pulau.label.scale.multiplyScalar(1.9);
    pulau.label.position.y += 1.2;
    scene.add(pulau.group);
    pulauList.push(pulau);
    titikRute.push(new THREE.Vector3(pos.x, pos.y, pos.z));
  });
  void buildRute;
  void RUTE;

  // --- Kapal layar penghias ---
  const kapal = buildKapal(track);
  kapal.position.set(-30, 0, -34);
  scene.add(kapal);
  const kapal2 = buildKapal(track);
  kapal2.position.set(34, 0, 40);
  kapal2.scale.setScalar(0.8);
  scene.add(kapal2);

  // --- Mercusuar penghias ---
  void buildMercusuar;

  // --- Ikon pemain: karakter kecil berdiri di noktah tempat ia berada. ---
  type PenampilanPemain = {
    gender: 'laki-laki' | 'perempuan';
    warnaPakaian?: number;
    warnaBawahan?: number;
    warnaHijab?: number;
    kostum?: PilihanKostum;
  };
  let pemainRig: KarakterRig | null = null;
  /** Avatar GLB berkostum (sama dengan di balai); null = masih karakter prosedural. */
  let pemainGlb: AvatarModel | null = null;
  let pemainRing: THREE.Mesh | null = null;
  const pemainGroup = new THREE.Group();
  pemainGroup.visible = false;
  scene.add(pemainGroup);

  // Peta kode → koordinat dunia (untuk menaruh ikon tepat di atas pulau).
  const posDunia: Partial<Record<NoktahId, { x: number; y: number; z: number }>> = {};
  for (const n of NOKTAH) posDunia[n.kode] = posisiDiPulau(n.kode);

  function pastikanPemain(): { rig: KarakterRig; ring: THREE.Mesh } {
    if (!pemainRig || !pemainRing) {
      const tampilan: PenampilanPemain = options.penampilanPemain ?? { gender: 'laki-laki' };
      const rig = buatKarakter({
        gender: tampilan.gender,
        warnaPakaian: tampilan.warnaPakaian,
        warnaBawahan: tampilan.warnaBawahan,
        warnaHijab: tampilan.warnaHijab,
        pakaiMarker: false,
        skala: 1.15,
      });
      rig.geometri.forEach((g) => disposables.push(g));
      rig.material.forEach((m) => disposables.push(m));
      pemainGroup.add(rig.group);

      // Cincin penanda berdenyut agar ikon mudah ditemukan.
      const ringGeo = track(new THREE.RingGeometry(1.1, 1.7, 28));
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 1.05;
      pemainGroup.add(ring);

      pemainRig = rig;
      pemainRing = ring;

      // Ganti dengan avatar GLB sesuai karakter & kostum pilihan (prosedural = cadangan).
      void cobaAvatarGlb(tampilan.gender, tampilan.kostum, 1.85).then((model) => {
        if (!model) return;
        if (!berjalan) {
          model.dispose();
          return;
        }
        pemainGlb = model;
        disposables.push(model);
        pemainGroup.remove(rig.group);
        pemainGroup.add(model.group);
      });
    }
    return { rig: pemainRig, ring: pemainRing };
  }

  function perbaruiPemain(): void {
    const kode = options.getPosisiPemain();
    const pos = kode ? posDunia[kode] : null;
    if (!kode || !pos) {
      pemainGroup.visible = false;
      return;
    }
    pastikanPemain();
    pemainGroup.visible = true;
    // Sedikit ke samping kios agar karakter tidak menutupi pin.
    pemainGroup.position.set(pos.x + 1.4, pos.y + 0.6, pos.z + 1.4);
  }

  perbaruiPemain();

  let tahanKabut: NoktahId | null = options.kabutTersibak ?? null;
  let sibak: { p: PulauNoktah; mulai: number; selesai: () => void } | null = null;
  const LAMA_SIBAK = 2.2;

  function perbaruiWarna(): void {
    for (const p of pulauList) {
      const st = options.getStatus(p.kode);
      p.kabut.visible = st.terkunci || p.kode === tahanKabut;
      p.labelMat.opacity = st.terkunci ? 0.45 : 0.95;
      if (st.terkunci) {
        p.pinMat.color.setHex(0x9ca3af);
        p.pinMat.emissive.setHex(0x111111);
        p.pinMat.emissiveIntensity = 0.4;
      } else if (p.kode === 'FINAL') {
        p.pinMat.color.setHex(WARNA_FINAL);
        p.pinMat.emissive.setHex(0x3a1263);
        p.pinMat.emissiveIntensity = 0.6;
      } else {
        p.pinMat.color.setHex(p.baseWarna);
        p.pinMat.emissive.setHex(st.dikunjungi ? 0x14532d : 0x0a1a12);
        p.pinMat.emissiveIntensity = st.dikunjungi ? 0.5 : 0.15;
      }
    }
  }
  perbaruiWarna();

  /* ------------------------------------------------------------------ */
  /* Kamera orbit + interaksi                                           */
  /* ------------------------------------------------------------------ */

  // --- Panah kuning melayang di atas tujuan berikutnya ---
  const panahTujuan = new THREE.Group();
  {
    const matPanah = track(new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xb45309, emissiveIntensity: 0.45, roughness: 0.45 }));
    const kepala = new THREE.Mesh(track(new THREE.ConeGeometry(1.5, 2.4, 20)), matPanah);
    kepala.rotation.x = Math.PI; // ujung menunjuk ke bawah
    const batang = new THREE.Mesh(track(new THREE.CylinderGeometry(0.55, 0.55, 2, 14)), matPanah);
    batang.position.y = 2.1;
    panahTujuan.add(kepala, batang);
    // Cincin berdenyut di tanah tujuan.
    const cincinGeo = track(new THREE.RingGeometry(3.6, 4.6, 36));
    cincinGeo.rotateX(-Math.PI / 2);
    const cincin = new THREE.Mesh(
      cincinGeo,
      track(new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })),
    );
    cincin.name = 'cincin';
    panahTujuan.add(cincin);
  }
  panahTujuan.visible = false;
  scene.add(panahTujuan);
  const cincinTujuan = panahTujuan.getObjectByName('cincin') as THREE.Mesh;

  /** Titik dunia sebuah balai (dasar pulau kecilnya). */
  const titikBalai = (kode: NoktahId | null | undefined): THREE.Vector3 | null => {
    const p = kode ? posDunia[kode] : undefined;
    return p ? new THREE.Vector3(p.x, p.y, p.z) : null;
  };

  // Sudut pandang peta. Kamera mengorbit sebuah titik FOKUS: saat dekat, fokus
  // ada di tujuan berikutnya; saat zoom menjauh, fokus bergeser ke tengah pulau
  // supaya seluruh pulau terlihat.
  let yaw = 0;
  let pitch = 0.95; // radian dari horizontal (agak dari atas: semua balai mudah diketuk)
  let jarak = 0;
  let jarakDasar = 100;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let targetJarak = 0;
  const PUSAT_PULAU = new THREE.Vector3(0, 4, 0);
  const fokus = new THREE.Vector3().copy(PUSAT_PULAU);
  /** Fokus pilihan pemain setelah menggeser peta (null = ikuti tujuan otomatis). */
  let fokusGeser: THREE.Vector3 | null = null;
  /** Batas geser: titik fokus tetap di sekitar pulau, tidak lari ke laut kosong. */
  const RADIUS_GESER = DIAMETER_PULAU / 2 + 4;
  /** Mode seret: geser peta (bawaan) atau putar (klik kanan / Shift). */
  let modeSeret: 'geser' | 'putar' = 'geser';

  let menyeret = false;
  let gerakTotal = 0;
  let pointerDownAt: { x: number; y: number } | null = null;
  let hovered: PulauNoktah | null = null;
  let berjalan = true;
  // Jari yang sedang menyentuh: dua jari = cubit (zoom), bukan ketuk/putar.
  const jariAktif = new Set<number>();
  let pernahDuaJari = false;

  const FOV_MIN = 30;
  /** Batas zoom, kelipatan jarakDasar (jarak yang memperlihatkan seluruh pulau). */
  const JARAK_MIN = 0.26;
  /** Zoom terjauh = seluruh pulau pas di layar (HP tegak butuh mundur lebih jauh). */
  const jarakMaks = (): number => (camera.aspect < 1 ? 1.15 : 0.85);
  /** Zoom awal: dekat ke tujuan berikutnya. */
  const JARAK_DEKAT = 0.5;
  /** Radius ketuk (px): jari anak cukup mengenai sekitar pulau, tidak harus tepat di bola. */
  const RADIUS_KETUK = 46;

  function hitungJarakDasar(): number {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const aspect = w / h;
    const fovRad = (camera.fov * Math.PI) / 180;
    const perluTinggi = DIAMETER_PULAU / Math.tan(fovRad / 2);
    const perluLebar = DIAMETER_PULAU / aspect / Math.tan(fovRad / 2);
    // Potret (HP): cukup pas lebar papan agar pulau tampak besar dan jelas.
    return (aspect < 1 ? perluLebar * 0.4 : Math.max(perluTinggi, perluLebar) * 0.5) + 4;
  }

  function aturKamera(pertama = false): void {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = Math.max(FOV_MIN, 50);
    const dasarLama = jarakDasar;
    jarakDasar = hitungJarakDasar();
    if (pertama || jarak === 0) {
      jarak = jarakDasar * JARAK_DEKAT;
      targetJarak = jarak;
    } else if (dasarLama > 0) {
      // Layar diputar (tegak ↔ mendatar): pertahankan tingkat zoom relatif.
      jarak = (jarak / dasarLama) * jarakDasar;
      targetJarak = (targetJarak / dasarLama) * jarakDasar;
    }
    camera.updateProjectionMatrix();
  }

  const batasJarak = (d: number): number => Math.max(jarakDasar * JARAK_MIN, Math.min(jarakDasar * jarakMaks(), d));

  /** Titik fokus yang diinginkan: tujuan saat dekat, tengah pulau saat jauh. */
  /** Dipanggil tiap frame: hasilnya vektor bersama (tanpa alokasi), salin bila perlu disimpan. */
  const _fokus = new THREE.Vector3();
  function fokusDiinginkan(): THREE.Vector3 {
    const rasio = jarak / jarakDasar;
    if (fokusGeser) {
      // Sudah digeser pemain: tetap di situ, kecuali zoom paling jauh (lihat seluruh pulau).
      const tj = Math.max(0, Math.min(1, (rasio - 0.75) / 0.2));
      return _fokus.copy(fokusGeser).lerp(PUSAT_PULAU, tj);
    }
    const kode = options.getTujuan?.() ?? options.getPosisiPemain();
    const p = kode ? posDunia[kode] : undefined;
    if (!p) return PUSAT_PULAU;
    // 0 (dekat, ≤ 0.55) → fokus di tujuan; 1 (jauh, ≥ 0.8) → fokus di tengah pulau.
    const t = Math.max(0, Math.min(1, (rasio - 0.55) / 0.25));
    return _fokus.set(p.x, p.y + 2, p.z).lerp(PUSAT_PULAU, t);
  }

  function terapkanKamera(): void {
    const d = batasJarak(jarak);
    const cp = Math.max(0.3, Math.min(1.3, pitch));
    camera.position.set(
      fokus.x + Math.sin(yaw) * Math.cos(cp) * d,
      fokus.y + Math.sin(cp) * d,
      fokus.z + Math.cos(yaw) * Math.cos(cp) * d,
    );
    camera.lookAt(fokus);
  }

  /** Hadapkan kamera dari sisi luar pulau ke tujuan, agar tujuan tidak tertutup bukit. */
  function hadapTujuan(): void {
    const t = titikBalai(options.getTujuan?.() ?? options.getPosisiPemain());
    if (!t || Math.hypot(t.x, t.z) < 1) return;
    targetYaw = Math.atan2(t.x, t.z);
  }

  aturKamera(true);
  hadapTujuan();
  yaw = targetYaw;
  fokus.copy(fokusDiinginkan());
  terapkanKamera();

  /* ---------- Memilih balai: berdasarkan jarak di LAYAR, bukan tabrakan sinar ----------
   * Dulu hanya bola kecil di atas kios yang bisa diketuk, sehingga ketukan sering
   * meleset. Sekarang tiap balai punya "garis ketuk" dari dasar pulau sampai label
   * namanya; ketukan dalam radius RADIUS_KETUK px dari garis itu dianggap kena,
   * dan bila beberapa balai dekat, yang paling dekat ke jari yang dipilih. */
  const bantu = new THREE.Vector3();
  function keLayar(v: THREE.Vector3, rect: DOMRect): { x: number; y: number; depan: boolean } {
    bantu.copy(v).project(camera);
    return { x: rect.left + ((bantu.x + 1) / 2) * rect.width, y: rect.top + ((1 - bantu.y) / 2) * rect.height, depan: bantu.z < 1 };
  }
  function jarakKeRuas(px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const pj = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / pj));
    return Math.hypot(px - (a.x + vx * t), py - (a.y + vy * t));
  }
  const dasarDunia = new THREE.Vector3();
  const labelDunia = new THREE.Vector3();
  function pick(ev: { clientX: number; clientY: number }): PulauNoktah | null {
    const rect = canvas.getBoundingClientRect();
    let terbaik: PulauNoktah | null = null;
    let jarakTerbaik = Infinity;
    for (const p of pulauList) {
      p.group.getWorldPosition(dasarDunia);
      p.label.getWorldPosition(labelDunia);
      const a = keLayar(dasarDunia, rect);
      const b = keLayar(labelDunia, rect);
      if (!a.depan && !b.depan) continue;
      // Label bertambah besar saat dekat: radius ikut melebar sesuai panjang garis.
      const radius = Math.max(RADIUS_KETUK, Math.hypot(b.x - a.x, b.y - a.y) * 0.35);
      const d = jarakKeRuas(ev.clientX, ev.clientY, a, b);
      if (d < radius && d < jarakTerbaik) {
        jarakTerbaik = d;
        terbaik = p;
      }
    }
    return terbaik;
  }

  function setHover(p: PulauNoktah | null): void {
    if (hovered === p) return;
    if (hovered) {
      hovered.labelMat.opacity = 0.9;
    }
    hovered = p;
    if (hovered) {
      hovered.labelMat.opacity = 1;
    }
    render();
  }

  const onPointerDown = (ev: PointerEvent): void => {
    jariAktif.add(ev.pointerId);
    if (jariAktif.size > 1) {
      // Jari kedua menyentuh: ini cubit-zoom, batalkan putar & ketuk.
      pernahDuaJari = true;
      menyeret = false;
      return;
    }
    pernahDuaJari = false;
    menyeret = true;
    gerakTotal = 0;
    pointerDownAt = { x: ev.clientX, y: ev.clientY };
    modeSeret = ev.button === 2 || ev.shiftKey ? 'putar' : 'geser';
    canvas.setPointerCapture?.(ev.pointerId);
  };

  const onPointerMove = (ev: PointerEvent): void => {
    if (menyeret && pointerDownAt && jariAktif.size <= 1) {
      const dx = ev.clientX - pointerDownAt.x;
      const dy = ev.clientY - pointerDownAt.y;
      pointerDownAt = { x: ev.clientX, y: ev.clientY };
      gerakTotal += Math.abs(dx) + Math.abs(dy);
      // Getaran kecil jari saat mengetuk tidak memutar peta.
      if (gerakTotal > 10) {
        if (modeSeret === 'putar') {
          targetYaw = yaw = yaw - dx * 0.006;
          targetPitch = pitch = Math.max(0.3, Math.min(1.3, pitch + dy * 0.004));
        } else {
          geserPeta(dx, dy);
        }
        canvas.style.cursor = 'grabbing';
      }
      return;
    }
    if (ev.pointerType === 'mouse') {
      setHover(pick(ev));
      canvas.style.cursor = hovered ? 'pointer' : 'grab';
    }
  };

  const onPointerUp = (ev: PointerEvent): void => {
    jariAktif.delete(ev.pointerId);
    if (!menyeret) return;
    menyeret = false;
    canvas.releasePointerCapture?.(ev.pointerId);
    canvas.style.cursor = 'grab';
    if (pernahDuaJari || gerakTotal > 18) return; // geser/cubit, bukan ketuk
    const p = pick(ev);
    // Balai terkunci tetap diteruskan: main.ts menampilkan pesan "masih tertutup kabut".
    if (p) options.onPilih(p.kode);
  };
  const onPointerCancel = (ev: PointerEvent): void => {
    jariAktif.delete(ev.pointerId);
    menyeret = false;
  };

  /**
   * Menggeser titik fokus sejajar permukaan peta mengikuti jari: peta ikut
   * bergerak bersama jari, seperti menggeser peta di HP.
   */
  function geserPeta(dx: number, dy: number): void {
    const h = canvas.clientHeight || window.innerHeight;
    const d = batasJarak(jarak);
    // Satuan dunia per piksel layar pada jarak kamera saat ini.
    const perPiksel = (2 * d * Math.tan((camera.fov * Math.PI) / 360)) / h;
    const kanan = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const maju = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const cp = Math.max(0.3, Math.min(1.3, pitch));
    // Gerak vertikal di layar diperpanjang karena papan dilihat miring.
    const faktorMaju = 1 / Math.max(0.45, Math.sin(cp));
    const baru = (fokusGeser ?? fokus).clone();
    baru.x += -kanan.x * dx * perPiksel + maju.x * dy * perPiksel * faktorMaju;
    baru.z += -kanan.z * dx * perPiksel + maju.z * dy * perPiksel * faktorMaju;
    const r = Math.hypot(baru.x, baru.z);
    if (r > RADIUS_GESER) {
      baru.x *= RADIUS_GESER / r;
      baru.z *= RADIUS_GESER / r;
    }
    baru.y = PUSAT_PULAU.y;
    fokusGeser = baru;
    // Langsung ikut jari (tanpa redaman) agar terasa responsif.
    fokus.copy(baru);
  }

  const zoomKe = (faktor: number): void => {
    targetJarak = batasJarak(targetJarak * faktor);
  };

  const onWheel = (ev: WheelEvent): void => {
    ev.preventDefault();
    zoomKe(ev.deltaY > 0 ? 1.12 : 0.89);
  };

  // Dua jari: cubit (pinch) untuk zoom, putar (twist) untuk memutar peta.
  let jarakCubit: number | null = null;
  let sudutCubit: number | null = null;
  const onTouchStart = (ev: TouchEvent): void => {
    if (ev.touches.length === 2) {
      jarakCubit = jarakAntar(ev.touches);
      sudutCubit = sudutAntar(ev.touches);
    }
  };
  const onTouchMove = (ev: TouchEvent): void => {
    if (ev.touches.length === 2 && jarakCubit) {
      const now = jarakAntar(ev.touches);
      const rasio = jarakCubit / now;
      jarakCubit = now;
      zoomKe(rasio);
      const sudut = sudutAntar(ev.touches);
      if (sudutCubit !== null) {
        let beda = sudut - sudutCubit;
        while (beda > Math.PI) beda -= Math.PI * 2;
        while (beda < -Math.PI) beda += Math.PI * 2;
        // Abaikan getaran kecil agar cubit biasa tidak ikut memutar.
        if (Math.abs(beda) > 0.004) targetYaw = yaw = yaw - beda;
      }
      sudutCubit = sudut;
      ev.preventDefault();
    }
  };
  const onTouchEnd = (): void => {
    jarakCubit = null;
    sudutCubit = null;
  };

  function sudutAntar(t: TouchList): number {
    const a = t[0] as Touch;
    const b = t[1] as Touch;
    return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
  }

  function jarakAntar(t: TouchList): number {
    const a = t[0] as Touch;
    const b = t[1] as Touch;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', () => setHover(null));
  canvas.addEventListener('wheel', onWheel, { passive: false });
  // Klik kanan dipakai untuk memutar peta, bukan membuka menu peramban.
  const onContextMenu = (ev: Event): void => ev.preventDefault();
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';

  const onResize = (): void => {
    aturKamera();
    render();
  };
  window.addEventListener('resize', onResize);

  const render = (): void => {
    renderer.render(scene, camera);
  };

  /* ------------------------------------------------------------------ */
  /* Loop animasi                                                       */
  /* ------------------------------------------------------------------ */

  let tPrev = performance.now();
  function loop(): void {
    if (!berjalan) return;
    if (!canvas.isConnected) {
      berjalan = false;
      return;
    }
    const now = performance.now();
    catatFrame(now);
    const dt = Math.min(0.05, (now - tPrev) / 1000);
    tPrev = now;
    const t = now / 1000;

    // Kamera: redam menuju target. Peta TIDAK berputar sendiri lagi, karena
    // balai yang bergerak menyulitkan anak untuk mengetuknya.
    let bedaYaw = targetYaw - yaw;
    while (bedaYaw > Math.PI) bedaYaw -= Math.PI * 2;
    while (bedaYaw < -Math.PI) bedaYaw += Math.PI * 2;
    yaw += bedaYaw * Math.min(1, dt * 6);
    pitch += (targetPitch - pitch) * Math.min(1, dt * 6);
    jarak += (targetJarak - jarak) * Math.min(1, dt * 6);
    fokus.lerp(fokusDiinginkan(), Math.min(1, dt * 5));
    terapkanKamera();

    // Panah tujuan berikutnya: melayang naik-turun di atas label namanya.
    const kodeTujuan = options.getTujuan?.() ?? null;
    const pTujuan = kodeTujuan ? pulauList.find((p) => p.kode === kodeTujuan) : undefined;
    if (pTujuan) {
      pTujuan.label.getWorldPosition(labelDunia);
      pTujuan.group.getWorldPosition(dasarDunia);
      panahTujuan.visible = true;
      panahTujuan.position.set(labelDunia.x, labelDunia.y + 3.2 + Math.sin(t * 3) * 0.6, labelDunia.z);
      panahTujuan.rotation.y = t * 1.5;
      cincinTujuan.position.set(0, dasarDunia.y + 0.9 - panahTujuan.position.y, 0);
      const denyut = 1 + Math.sin(t * 3) * 0.1;
      cincinTujuan.scale.set(denyut, 1, denyut);
    } else {
      panahTujuan.visible = false;
    }

    waktuLaut.value = t;

    // Pulau: pin mengapung + bendera berkibar.
    for (const p of pulauList) {
      const naik = Math.sin(t * 1.4 + p.fase) * 0.22;
      p.pin.position.y = p.pin.position.y + (p.basePinY + naik - p.pin.position.y) * Math.min(1, dt * 6);
      p.bendera.rotation.y = Math.sin(t * 2 + p.fase) * 0.35;
    }

    // Kapal berlayar pelan.
    kapal.position.x = -30 + Math.sin(t * 0.12) * 10;
    kapal.rotation.z = Math.sin(t * 0.6) * 0.04;
    kapal2.position.z = 40 + Math.cos(t * 0.1) * 8;

    // Awan melayang pelan.
    for (const g of awan) {
      g.position.x += (g.userData.kecepatan as number) * dt;
      if (g.position.x > 120) g.position.x = -120;
    }

    // Kabut tersibak: gumpalan melebar ke luar, naik, lalu memudar.
    if (sibak) {
      const k = Math.min(1, (t - sibak.mulai) / LAMA_SIBAK);
      const halus = 1 - (1 - k) ** 3;
      for (const m of sibak.p.kabut.children) {
        const asal = m.userData.asal as THREE.Vector3;
        m.position.set(asal.x * (1 + halus * 2.2), asal.y + halus * 4, asal.z * (1 + halus * 2.2));
      }
      sibak.p.kabut.scale.setScalar(1 + halus * 0.6);
      const mat = (sibak.p.kabut.children[0] as THREE.Mesh).material as THREE.MeshLambertMaterial;
      mat.opacity = 0.82 * (1 - halus);
      // Pin balai melompat kecil saat kabut hampir hilang.
      if (k > 0.6) sibak.p.pin.scale.setScalar(1 + Math.sin(((k - 0.6) / 0.4) * Math.PI) * 0.5);
      if (k >= 1) {
        for (const m of sibak.p.kabut.children) m.position.copy(m.userData.asal as THREE.Vector3);
        sibak.p.kabut.scale.setScalar(1);
        mat.opacity = 0.82;
        sibak.p.pin.scale.setScalar(1);
        tahanKabut = null;
        sibak.p.kabut.visible = false;
        const selesai = sibak.selesai;
        sibak = null;
        selesai();
      }
    }

    // Ikon pemain: napas, sedikit goyang, dan cincin berdenyut.
    if (pemainGroup.visible && pemainGlb) pemainGlb.update(0, dt);
    if (pemainGroup.visible && pemainRig && pemainRing) {
      if (!pemainGlb) pemainRig.idle(t, 0.3);
      pemainGroup.rotation.y = Math.sin(t * 0.6) * 0.35;
      const denyut = 1 + Math.sin(t * 2.4) * 0.12;
      pemainRing.scale.setScalar(denyut);
      (pemainRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 2.4) * 0.25;
    }

    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  const dispose = (): void => {
    berjalan = false;
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', onResize);
    lepasRingan();
    disposables.forEach((d) => d.dispose());
    buangRenderer(renderer);
    // Rumah GLB hanya dipakai peta ini: lepas dari cache agar RAM tidak menumpuk.
    for (const n of NOKTAH) {
      const berkas = berkasRumah(n.kode);
      if (berkas) lepasModel(berkas);
    }
  };
  const lepasRingan = saatRingan(() => {
    renderer.setPixelRatio(1);
    aturKamera();
  });

  return {
    renderer,
    render: () => {
      perbaruiWarna();
      perbaruiPemain();
      render();
    },
    zoom: zoomKe,
    sibakKabut: () => {
      const p = tahanKabut ? pulauList.find((x) => x.kode === tahanKabut) : undefined;
      if (!p || !berjalan) {
        tahanKabut = null;
        return Promise.resolve();
      }
      sfx.buka();
      return new Promise<void>((selesai) => {
        sibak = { p, mulai: performance.now() / 1000, selesai };
      });
    },
    fokusTujuan: () => {
      // Lepas fokus geseran pemain: kamera kembali mengikuti tujuan berikutnya.
      fokusGeser = null;
      targetJarak = jarakDasar * JARAK_DEKAT;
      targetPitch = 0.95;
      hadapTujuan();
    },
    posisiLayar: () => {
      const rect = canvas.getBoundingClientRect();
      return pulauList.map((p) => {
        // Titik tengah garis ketuk (antara dasar pulau dan label).
        p.group.getWorldPosition(dasarDunia);
        p.label.getWorldPosition(labelDunia);
        const a = keLayar(dasarDunia, rect);
        const b = keLayar(labelDunia, rect);
        return { kode: p.kode, x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
      });
    },
    siap: Promise.all(pulauList.map((p) => p.siap)).then(() => (berjalan ? siapkanRender(renderer, scene, camera) : undefined)),
    dispose,
  };
}

/* ------------------------------------------------------------------ */
/* Pembuat visual                                                      */
/* ------------------------------------------------------------------ */

function buatPulau(
  n: NoktahMeta,
  pos: { x: number; z: number },
  index: number,
  track: <T extends { dispose: () => void }>(o: T) => T,
): PulauNoktah {
  const group = new THREE.Group();
  group.position.set(pos.x, 0, pos.z);
  const isFinal = n.kode === 'FINAL';
  const baseWarna = isFinal ? WARNA_FINAL : WARNA_ELEMEN[n.elemen];
  let siap = Promise.resolve();

  // Dasar pulau: batu karang gelap + lapisan pasir.
  const batuGeo = track(new THREE.CylinderGeometry(isFinal ? 6.2 : 5.0, isFinal ? 7.2 : 6.0, 0.9, 16));
  const batuMat = track(new THREE.MeshLambertMaterial({ color: 0x8a6b4a, flatShading: true }));
  const batu = new THREE.Mesh(batuGeo, batuMat);
  batu.position.y = 0.05;
  group.add(batu);

  const pasirGeo = track(new THREE.CylinderGeometry(isFinal ? 5.4 : 4.3, isFinal ? 6.0 : 4.8, 0.5, 16));
  const pasirMat = track(new THREE.MeshLambertMaterial({ color: 0xe8cf9a }));
  const pasir = new THREE.Mesh(pasirGeo, pasirMat);
  pasir.position.y = 0.55;
  group.add(pasir);

  // Kios mini di tengah pulau; pulau puncak berisi Mercusuar Tua.
  if (isFinal) {
    const m = buildMercusuar(track);
    m.position.y = 0.75;
    group.add(m);
  } else {
    const kios = buatKios({ warna: baseWarna, meriah: false, skala: 0.42 }, track);
    kios.group.position.y = 0.75;
    group.add(kios.group);
    // Rumah GLB bab menggantikan kios begitu termuat; bila gagal, kios tetap tampil.
    const berkas = berkasRumah(n.kode);
    if (berkas) {
      siap = loadModel(berkas)
        .then((gltf) => {
          const rumah = klonModel(gltf);
          rumah.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) track(mesh.material as THREE.Material);
          });
          rumah.scale.setScalar(0.42);
          rumah.position.y = 0.75;
          group.remove(kios.group);
          group.add(rumah);
        })
        .catch(() => undefined);
    }
  }

  // Bendera warna elemen di sisi kios.
  const tiangGeo = track(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6));
  const tiangMat = track(new THREE.MeshLambertMaterial({ color: 0x6b4423 }));
  const tiang = new THREE.Mesh(tiangGeo, tiangMat);
  tiang.position.set(2.6, 1.85, 0);
  group.add(tiang);

  const kainGeo = track(new THREE.PlaneGeometry(1.4, 0.8));
  const kainMat = track(new THREE.MeshLambertMaterial({ color: baseWarna, side: THREE.DoubleSide }));
  const bendera = new THREE.Mesh(kainGeo, kainMat);
  bendera.position.set(3.3, 2.5, 0);
  group.add(bendera);

  // Pohon & batu kecil penghias pulau.
  tambahPohon(group, -2.6, 0.9, 0.9, track);
  tambahPohon(group, 2.4, -1.8, 0.75, track);
  tambahBatu(group, -1.6, -2.2, 0.7, track);
  tambahBatu(group, 1.8, 2.0, 0.55, track);

  // Pin noktah mengapung di atas kios.
  const basePinY = isFinal ? 10.6 : 3.2;
  const headGeo = track(new THREE.SphereGeometry(isFinal ? 1.15 : 0.85, 18, 14));
  const pinMat = track(new THREE.MeshStandardMaterial({ color: baseWarna, roughness: 0.4, metalness: 0.2 }));
  const pin = new THREE.Mesh(headGeo, pinMat);
  pin.position.y = basePinY;
  group.add(pin);

  // Kabut penutup balai terkunci (gumpalan putih transparan).
  const kabut = new THREE.Group();
  const kabutGeo = track(new THREE.IcosahedronGeometry(1, 1));
  const kabutMat = track(new THREE.MeshLambertMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.82, depthWrite: false }));
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(kabutGeo, kabutMat);
    const s = (i / 6) * Math.PI * 2;
    m.position.set(Math.cos(s) * 2.6, 2.2 + (i % 2) * 0.7, Math.sin(s) * 2.6);
    m.scale.set(2.6, 1.6, 2.6);
    m.userData.asal = m.position.clone();
    kabut.add(m);
  }
  const tengah = new THREE.Mesh(kabutGeo, kabutMat);
  tengah.position.y = 3.2;
  tengah.scale.set(3.4, 2.2, 3.4);
  tengah.userData.asal = tengah.position.clone();
  kabut.add(tengah);
  kabut.visible = false;
  group.add(kabut);

  // Label nama balai saja, tanpa nomor urut (mis. "Taman Bunga").
  const labelTex = track(new THREE.CanvasTexture(buatTeksturLabel(n.nama, isFinal ? '🗼 ' : '')));
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const labelMat = track(new THREE.SpriteMaterial({ map: labelTex, transparent: true, opacity: 0.9, depthTest: false }));
  const label = new THREE.Sprite(labelMat);
  label.scale.set(isFinal ? 10 : 9, isFinal ? 2.5 : 2.25, 1);
  label.position.y = basePinY + (isFinal ? 2.6 : 1.6);
  group.add(label);

  return {
    kode: n.kode,
    group,
    pin,
    pinMat,
    label,
    labelMat,
    bendera,
    baseWarna,
    fase: index * 0.7,
    basePinY,
    kabut,
    siap,
  };
}

function tambahPohon(parent: THREE.Group, x: number, z: number, skala: number, track: <T extends { dispose: () => void }>(o: T) => T): void {
  const batangGeo = track(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 7));
  const batangMat = track(new THREE.MeshLambertMaterial({ color: 0x7a5230 }));
  const batang = new THREE.Mesh(batangGeo, batangMat);
  batang.position.set(x, 1.05, z);
  batang.scale.setScalar(skala);
  parent.add(batang);

  const daunGeo = track(new THREE.IcosahedronGeometry(0.85, 0));
  const daunMat = track(new THREE.MeshLambertMaterial({ color: 0x3f9a52, flatShading: true }));
  const daun = new THREE.Mesh(daunGeo, daunMat);
  daun.position.set(x, 1.9, z);
  daun.scale.set(skala, skala * 1.1, skala);
  parent.add(daun);
}

function tambahBatu(parent: THREE.Group, x: number, z: number, skala: number, track: <T extends { dispose: () => void }>(o: T) => T): void {
  const geo = track(new THREE.DodecahedronGeometry(0.5, 0));
  const mat = track(new THREE.MeshLambertMaterial({ color: 0x9aa3ad, flatShading: true }));
  const batu = new THREE.Mesh(geo, mat);
  batu.position.set(x, 0.9, z);
  batu.scale.set(skala, skala * 0.8, skala);
  parent.add(batu);
}

/** Pita rute putus-putus 3D yang menghubungkan pusat zona. */
function buildRute(scene: THREE.Scene, track: <T extends { dispose: () => void }>(o: T) => T): void {
  const titik = RUTE.map((kode) => {
    const n = NOKTAH.find((x) => x.kode === kode);
    if (!n) return null;
    const p = persenKeDunia(n.peta);
    return new THREE.Vector3(p.x, 0.7, p.z);
  }).filter((v): v is THREE.Vector3 => v !== null);

  const segmen: THREE.Vector3[] = [];
  for (let i = 0; i < titik.length - 1; i++) {
    const a = titik[i] as THREE.Vector3;
    const b = titik[i + 1] as THREE.Vector3;
    const langkah = 8;
    for (let s = 0; s < langkah; s++) {
      const t0 = s / langkah;
      const t1 = (s + 0.5) / langkah;
      const p0 = new THREE.Vector3().lerpVectors(a, b, t0);
      const p1 = new THREE.Vector3().lerpVectors(a, b, t1);
      p0.y += Math.sin(t0 * Math.PI) * 1.2;
      p1.y += Math.sin(t1 * Math.PI) * 1.2;
      segmen.push(p0, p1);
    }
  }

  const geo = track(new THREE.BufferGeometry().setFromPoints(segmen));
  const mat = track(new THREE.LineBasicMaterial({ color: 0xa3401f, transparent: true, opacity: 0.55 }));
  const garis = new THREE.LineSegments(geo, mat);
  scene.add(garis);
}

/** Kapal layar kecil penghias laut. */
function buildKapal(track: <T extends { dispose: () => void }>(o: T) => T): THREE.Group {
  const g = new THREE.Group();
  const lambungGeo = track(new THREE.CylinderGeometry(0.9, 0.5, 0.7, 8, 1, false, 0, Math.PI));
  const lambungMat = track(new THREE.MeshLambertMaterial({ color: 0x8b5a2b, side: THREE.DoubleSide }));
  const lambung = new THREE.Mesh(lambungGeo, lambungMat);
  lambung.rotation.z = Math.PI / 2;
  lambung.position.y = 0.35;
  g.add(lambung);

  const tiangGeo = track(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6));
  const tiangMat = track(new THREE.MeshLambertMaterial({ color: 0x5a3d22 }));
  const tiang = new THREE.Mesh(tiangGeo, tiangMat);
  tiang.position.y = 1.7;
  g.add(tiang);

  const layarGeo = track(new THREE.PlaneGeometry(1.4, 1.8));
  const layarMat = track(new THREE.MeshLambertMaterial({ color: 0xf7f0dc, side: THREE.DoubleSide }));
  const layar = new THREE.Mesh(layarGeo, layarMat);
  layar.position.set(0.7, 1.9, 0);
  g.add(layar);

  g.position.y = -1.2;
  return g;
}

/** Mercusuar tinggi bergaris merah-putih dengan lampu berputar. */
function buildMercusuar(track: <T extends { dispose: () => void }>(o: T) => T): THREE.Group {
  const g = new THREE.Group();
  const menaraGeo = track(new THREE.CylinderGeometry(0.8, 1.4, 8, 12));
  const menaraMat = track(new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
  const menara = new THREE.Mesh(menaraGeo, menaraMat);
  menara.position.y = 4;
  g.add(menara);

  const pitaGeo = track(new THREE.CylinderGeometry(0.9, 1.0, 1.2, 12));
  const pitaMat = track(new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
  const pita = new THREE.Mesh(pitaGeo, pitaMat);
  pita.position.y = 3.4;
  g.add(pita);

  const lampuGeo = track(new THREE.SphereGeometry(0.7, 12, 10));
  const lampuMat = track(new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
  const lampu = new THREE.Mesh(lampuGeo, lampuMat);
  lampu.position.y = 8.6;
  g.add(lampu);

  return g;
}

/** Menggambar tekstur papan: kertas tua, laut bergelombang, pulau, rute, kompas. */
function buatTeksturPapan(): HTMLCanvasElement {
  const W = 1024;
  const H = 1344;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Kertas dasar.
  ctx.fillStyle = '#f3e2b8';
  ctx.fillRect(0, 0, W, H);

  // Bercak usia kertas.
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 6 + Math.random() * 46;
    ctx.fillStyle = `rgba(160, 120, 60, ${0.02 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bingkai peta.
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.strokeStyle = 'rgba(138, 90, 43, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, W - 88, H - 88);

  // Garis pantai bergelombang di sekeliling papan.
  ctx.strokeStyle = 'rgba(29, 111, 165, 0.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 60; i++) {
    const ang = (i / 60) * Math.PI * 2;
    const rx = 0.44 * W;
    const ry = 0.46 * H;
    const cx = W / 2 + Math.cos(ang) * rx;
    const cy = H / 2 + Math.sin(ang) * ry;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rute putus-putus mengikuti posisi noktah.
  ctx.setLineDash([18, 16]);
  ctx.strokeStyle = 'rgba(138, 58, 43, 0.5)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  RUTE.forEach((kode, i) => {
    const n = NOKTAH.find((x) => x.kode === kode);
    if (!n) return;
    const x = (n.peta.x / 100) * W;
    const y = (n.peta.y / 100) * H;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Kompas di sudut kanan bawah.
  ctx.save();
  ctx.translate(W - 150, H - 150);
  ctx.fillStyle = 'rgba(138, 90, 43, 0.75)';
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3e2b8';
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.lineTo(12, 0);
  ctx.lineTo(0, 44);
  ctx.lineTo(-12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('U', 0, -60);
  ctx.restore();

  return canvas;
}

/** Label nama noktah sebagai tekstur kanvas. */
function buatTeksturLabel(text: string, prefix: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Kapsul latar.
  const r = 60;
  ctx.fillStyle = 'rgba(255, 250, 235, 0.96)';
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(r, 8);
  ctx.lineTo(canvas.width - r, 8);
  ctx.arcTo(canvas.width - 8, 8, canvas.width - 8, r, r);
  ctx.lineTo(canvas.width - 8, canvas.height - r);
  ctx.arcTo(canvas.width - 8, canvas.height - 8, canvas.width - r, canvas.height - 8, r);
  ctx.lineTo(r, canvas.height - 8);
  ctx.arcTo(8, canvas.height - 8, 8, canvas.height - r, r);
  ctx.lineTo(8, r);
  ctx.arcTo(8, 8, r, 8, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#3b2a17';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Nama ditulis utuh: ukuran huruf diperkecil sampai muat di kapsul (tidak dipotong "…").
  const teks = `${prefix}${text}`;
  const lebarMaks = canvas.width - 70;
  let ukuran = 72;
  do {
    ctx.font = `bold ${ukuran}px "Baloo 2", "Segoe UI", "Trebuchet MS", Arial, sans-serif`;
    if (ctx.measureText(teks).width <= lebarMaks) break;
    ukuran -= 2;
  } while (ukuran > 36);
  ctx.fillText(teks, canvas.width / 2, canvas.height / 2 + 4);

  return canvas;
}
