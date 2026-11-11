import * as THREE from 'three';
import type { SceneTheme } from './scene';
import type { ColliderBox } from './mapConfig';
import type { DuniaGlb } from './asetBab';
import { modeRingan, saatRingan } from '../core/kualitas';

/**
 * Latar khas tiap balai: suasana langit/tanah + penghias bertema materi dari
 * kit GLB (lihat `asetBab.ts`). Penghias diletakkan di tepi area (menjauhi titik misi dan jalan setapak)
 * agar tidak menghalangi pemain.
 */

type Track = <T extends { dispose: () => void }>(o: T) => T;
type Titik = { x: number; z: number };

type Pose = Titik & { rot: number };

/** Letak ruang cerita & arena, untuk objek yang menempel padanya. */
export interface TempatBab {
  ruang: Pose;
  uji: Pose;
  /** `true` bila lingkaran (x, z, r) tidak menutupi titik misi atau jalan setapak. */
  bebasJalur: (x: number, z: number, r: number) => boolean;
}

export interface LatarHandle {
  colliders: ColliderBox[];
  update: (t: number) => void;
}

const tema = (sky: number, grass: number, ambient = 0.72, sun = 0xffe0b0, hemiGround = 0x5b6b3a): SceneTheme => ({
  sky,
  fog: sky,
  sun,
  hemiSky: sky,
  hemiGround,
  grass,
  ambient,
});

/** Suasana per balai (langit, kabut, rumput). */
export const TEMA_BALAI: Record<string, SceneTheme> = {
  F01: tema(0x3b3a4a, 0x6f6a62, 0.55, 0xffe6b0, 0x2a2622), // goa: gelap berbatu
  F02: tema(0xd8ccf2, 0x9fa88a, 0.74, 0xfff0d8, 0x544a6b), // lembah ungu senja
  H01: tema(0xbfe8c8, 0x7fc46a, 0.74), // tepi hutan sejuk
  H02: tema(0xffe2a0, 0xa9cf5c, 0.76), // ladang keemasan
  H03: tema(0xffd6e6, 0x8fd27a, 0.76), // taman bunga
  H04: tema(0xe6dcc8, 0xa3a36a, 0.72, 0xffe0b0, 0x6b5a3a), // hutan gundul
  F03: tema(0xf2c9c0, 0x9b8e86, 0.72, 0xffd8c0, 0x5a3a34), // bukit batu besi
  F04: tema(0xbfe3ff, 0x86c46a, 0.76), // sungai kincir
  E01: tema(0xf6d7b0, 0xc7a978, 0.72, 0xffd9a8, 0x7a5a3a), // tebing berlapis
  E02: tema(0xcfeaff, 0x8ccc8a, 0.76), // mata air
  E03: tema(0xc9dff0, 0x93b77d, 0.72), // pos siaga
};

function acak(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function kotak(cx: number, cz: number, w: number, d: number): ColliderBox {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
}

/**
 * Membangun penghias latar untuk kode balai.
 * @param hindari titik-titik yang tidak boleh tertutup (titik misi, rumah).
 */
export function bangunLatar(kode: string, scene: THREE.Scene, dunia: DuniaGlb, track: Track, hindari: Titik[], tempat: TempatBab): LatarHandle {
  const colliders: ColliderBox[] = [];
  const animasi: Array<(t: number) => void> = [];
  const rng = acak(kode.charCodeAt(0) * 131 + kode.charCodeAt(2) * 17 + 7);
  const bebas = (x: number, z: number, jarak = 5.5): boolean => hindari.every((p) => Math.hypot(p.x - x, p.z - z) > jarak);
  const pilih = <T>(daftar: T[]): T => daftar[Math.floor(rng() * daftar.length)] as T;
  const putar = (): number => rng() * Math.PI * 2;

  /** Titik acak di cincin tepi area. */
  const tepi = (jumlah: number, r0 = 15, r1 = 20.5, jarak = 5.5): Titik[] => {
    const out: Titik[] = [];
    let coba = 0;
    while (out.length < jumlah && coba < jumlah * 40) {
      coba++;
      const a = rng() * Math.PI * 2;
      const r = r0 + rng() * (r1 - r0);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) > 20.5 || Math.abs(z) > 20.5) continue;
      if (!bebas(x, z, jarak)) continue;
      out.push({ x, z });
    }
    return out;
  };

  /** `s` = ukuran rancangan lama (jari-jari); `faktor` menyamakannya dengan ukuran model. */
  const batu = (x: number, z: number, s: number, nama: string[], faktor = 1): void => {
    dunia.tanam(pilih(nama), x, 0, z, s * faktor, putar());
    if (s > 1.2) colliders.push(kotak(x, z, s * 1.4, s * 1.4));
  };

  const POHON = ['Pohon_Bulat_A', 'Pohon_Bulat_B'];
  const pohon = (x: number, z: number, s: number, nama = POHON): void => {
    dunia.tanam(pilih(nama), x, 0, z, s, putar());
    colliders.push(kotak(x, z, 0.8, 0.8));
  };

  /** Kolam_Besar berukuran rx 2,6 x rz 1,8 pada skala 1. */
  const kolam = (x: number, z: number, skala: number): void => {
    dunia.tanam('Kolam_Besar', x, 0, z, skala);
    colliders.push(kotak(x, z, 2.6 * skala * 1.6, 1.8 * skala * 1.6));
  };

  /** Titik di samping/belakang arena yang tidak menutupi jalan, menghadap arena. */
  const dekatArena = (r: number): Pose => {
    const { uji } = tempat;
    const lokal: Array<[number, number]> = [
      [r + 4, -1],
      [-(r + 4), -1],
      [r + 3.5, -(r + 2)],
      [-(r + 3.5), -(r + 2)],
      [0, -(r + 4)],
    ];
    const calon = lokal.map(([lx, lz]) => ({
      x: uji.x + lx * Math.cos(uji.rot) + lz * Math.sin(uji.rot),
      z: uji.z - lx * Math.sin(uji.rot) + lz * Math.cos(uji.rot),
    }));
    const p =
      calon.find((c) => Math.max(Math.abs(c.x), Math.abs(c.z)) < 20.5 - r && tempat.bebasJalur(c.x, c.z, r + 1.6)) ??
      (calon[calon.length - 1] as Titik);
    return { ...p, rot: Math.atan2(uji.x - p.x, uji.z - p.z) };
  };

  /** Landmark tempat Penjaga menunggu (berkas utuh, ada animasi/papan). */
  const landmark = (nama: string, r: number): void => {
    const p = dekatArena(r);
    dunia.pasangBerkas(nama, p.x, p.z, p.rot);
    colliders.push(kotak(p.x, p.z, r * 1.6, r * 1.6));
  };

  const ruang = tempat.ruang;

  switch (kode) {
    case 'F01': {
      // Dinding goa: bongkahan mengelilingi area + stalaktit, dan berkas sinar dari atap.
      for (let i = 0; i < 34; i++) {
        const a = (i / 34) * Math.PI * 2;
        const r = 20 + rng() * 1.5;
        const z = Math.sin(a) * r;
        // Sisi depan (z besar) dibiarkan terbuka: mulut goa menghadap laut.
        if (z > 4) continue;
        batu(Math.cos(a) * r, z, 2.2 + rng() * 1.6, ['bongkahan_a', 'bongkahan_b', 'bongkahan_c'], 0.45);
      }
      for (const p of tepi(10, 12, 18)) batu(p.x, p.z, 0.8 + rng() * 0.8, ['batu_kecil_a', 'batu_kecil_b', 'batu_kecil_c'], 1.8);
      for (let i = 0; i < 14; i++) {
        const a = rng() * Math.PI * 2;
        const r = 8 + rng() * 10;
        dunia.tanam(pilih(['stalaktit_a', 'stalaktit_b', 'stalaktit_c']), Math.cos(a) * r, 8.5, Math.sin(a) * r, 1, putar());
      }
      const sinar = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.6, 2.6, 14, 20, 1, true)),
        track(new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })),
      );
      sinar.position.set(ruang.x, 7, ruang.z);
      scene.add(sinar);
      const lampu = new THREE.PointLight(0xffd27a, 18, 14, 1.6);
      lampu.position.set(ruang.x, 4, ruang.z);
      if (!modeRingan()) scene.add(lampu);
      track({ dispose: saatRingan(() => scene.remove(lampu)) });
      animasi.push((t) => {
        (sinar.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 1.3) * 0.04;
      });
      break;
    }
    case 'F02': {
      // Tebing tinggi di dua sisi lembah; muka depan (+Z) diputar menghadap tengah.
      for (const sisi of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          dunia.tanam(pilih(['tebing_lembah_a', 'tebing_lembah_b', 'tebing_lembah_c']), sisi * (20 + rng()), 0, -18 + i * 7, 1, (-sisi * Math.PI) / 2 + (rng() - 0.5) * 0.3);
        }
      }
      for (const p of tepi(12, 13, 18)) batu(p.x, p.z, 0.9 + rng(), ['batu_lembah_a', 'batu_lembah_b', 'batu_lembah_c']);
      for (const p of tepi(6, 15, 20.5, 4.5)) {
        dunia.tanam('rumpun_bambu', p.x, 0, p.z, 1, putar());
        colliders.push(kotak(p.x, p.z, 0.9, 0.9));
      }
      // Batu Gema: di belakang stasiun cerita.
      dunia.pasangBerkas('batu_gema', ruang.x - 5.2 * Math.sin(ruang.rot), ruang.z - 5.2 * Math.cos(ruang.rot), ruang.rot);
      break;
    }
    case 'H01': {
      for (const p of tepi(26, 14, 21, 4.5)) pohon(p.x, p.z, 0.9 + rng() * 0.7, [...POHON, 'Pohon_Cemara']);
      kolam(ruang.x + 4, ruang.z + 4, 1);
      for (const p of tepi(8, 11, 18, 4)) dunia.tanam(pilih(['Jamur_A', 'Jamur_B']), p.x, 0, p.z, 0.7 + rng() * 0.5, putar());
      for (const p of tepi(6, 12, 19, 4)) batu(p.x, p.z, 0.8 + rng() * 0.6, ['Batu_Lumut_A', 'Batu_Lumut_B', 'Batu_Lumut_C']);
      for (const p of tepi(3, 12, 19, 4)) dunia.tanam(pilih(['Tunggul_A', 'Tunggul_B', 'Batang_Kayu']), p.x, 0, p.z, 1, putar());
      const k = dekatArena(2);
      dunia.tanam('Kolam_Kecil', k.x, 0, k.z, 1, k.rot);
      colliders.push(kotak(k.x, k.z, 3, 2.2));
      break;
    }
    case 'H02': {
      for (let gx = -18; gx <= 18; gx += 4.5) {
        for (let gz = -18; gz <= 18; gz += 4.5) {
          if (Math.hypot(gx, gz) < 13 || !bebas(gx, gz, 4.5)) continue;
          dunia.tanam(rng() > 0.4 ? 'Petak_Ladang_A' : 'Petak_Ladang_B', gx, 0, gz);
        }
      }
      for (const p of tepi(3, 9, 13, 4)) {
        dunia.tanam('Orang_Orangan_Sawah', p.x, 0, p.z, 1, Math.atan2(-p.x, -p.z));
        colliders.push(kotak(p.x, p.z, 0.7, 0.7));
      }
      for (const p of tepi(5, 9, 13, 4)) dunia.tanam(pilih(['Jerami_Tumpuk', 'Jerami_Satu']), p.x, 0, p.z, 1, putar());
      landmark('lumbung_padi', 2.2);
      break;
    }
    case 'H03': {
      for (const p of tepi(46, 9, 20.5, 4)) dunia.tanam(pilih(['Bunga_A', 'Bunga_B', 'Bunga_C']), p.x, 0, p.z, 1 + rng() * 0.8, putar());
      for (const p of tepi(6, 16, 20.5)) pohon(p.x, p.z, 1.2);
      for (const p of tepi(2, 10, 15)) {
        dunia.tanam('Sarang_Lebah', p.x, 0, p.z, 1, Math.atan2(-p.x, -p.z));
        colliders.push(kotak(p.x, p.z, 0.9, 0.9));
      }
      landmark('pohon_besar', 2.8);
      // Lebah kecil berputar.
      const lebah = new THREE.Mesh(track(new THREE.SphereGeometry(0.18, 8, 6)), track(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.9 })));
      scene.add(lebah);
      animasi.push((t) => lebah.position.set(Math.cos(t) * 6, 2 + Math.sin(t * 3) * 0.3, Math.sin(t) * 6));
      break;
    }
    case 'H04': {
      // Separuh hutan gundul (tunggul) + deretan pot bibit.
      for (const p of tepi(22, 12, 20.5, 4.5)) {
        if (p.x < 0) dunia.tanam(pilih(['Tunggul_A', 'Tunggul_B']), p.x, 0, p.z, 1, putar());
        else pohon(p.x, p.z, 1 + rng() * 0.5);
      }
      for (let i = 0; i < 12; i++) {
        const x = -6 + (i % 6) * 1.2;
        const z = 13 + Math.floor(i / 6) * 1.2;
        if (bebas(x, z, 3)) dunia.tanam(i % 2 ? 'Bibit_Pot_B' : 'Bibit_Pot_A', x, 0, z);
      }
      for (const p of tepi(3, 10, 16, 4)) dunia.tanam('Bedengan', p.x, 0, p.z, 1, putar());
      for (const p of tepi(3, 12, 19, 4)) dunia.tanam('Tumpukan_Kayu', p.x, 0, p.z, 1, putar());
      landmark('jembatan_rusak', 3.2);
      break;
    }
    case 'F03': {
      for (const p of tepi(20, 13, 20.5)) batu(p.x, p.z, 1 + rng() * 1.8, ['Batu_Besi_A', 'Batu_Besi_B', 'Batu_Besi_C'], 0.8);
      const tempatMagnet = tepi(1, 16, 19)[0] ?? { x: 16, z: -16 };
      dunia.pasangBerkas('magnet_raksasa', tempatMagnet.x, tempatMagnet.z, Math.atan2(-tempatMagnet.x, -tempatMagnet.z));
      colliders.push(kotak(tempatMagnet.x, tempatMagnet.z, 5, 5));
      landmark('bukit_puncak', 2.7);
      break;
    }
    case 'F04': {
      // Sungai melintang (ubin 4 m) + kincir air berputar.
      for (let i = 0; i < 12; i++) dunia.tanam(i % 4 === 2 ? 'Sungai_Batu' : 'Sungai_Lurus', -22 + i * 4, 0, -19);
      dunia.pasangBerkas('kincir_air', -8, -18.5, 0);
      for (const p of tepi(10, 13, 16)) pohon(p.x, p.z, 1);
      landmark('gardu_listrik', 2.2);
      // Tiang listrik; kabelnya digambar antar titik kait Kabel_Ujung_k.
      const tiang = [-18, -10, -2, 6].map((x) => ({ x, z: -15.5 }));
      for (const p of tiang) {
        dunia.tanam('Tiang_Listrik', p.x, 0, p.z);
        colliders.push(kotak(p.x, p.z, 0.6, 0.6));
      }
      const kabelMat = track(new THREE.LineBasicMaterial({ color: 0x1f2937 }));
      for (const k of [1, 2, 3]) {
        const kait = (dunia.kit.get(`Kabel_Ujung_${k}`) as THREE.Object3D).position;
        scene.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(tiang.map((p) => new THREE.Vector3(p.x + kait.x, kait.y, p.z + kait.z)))), kabelMat));
      }
      break;
    }
    case 'E01': {
      // Tebing berlapis di belakang; segmen 5,2 m dipasang tiap 5 m. Varian tangga di belakang arena.
      for (let i = 0; i < 9; i++) dunia.tanam(i === 4 ? 'Tebing_Berlapis_Tangga' : i % 2 ? 'Tebing_Berlapis_B' : 'Tebing_Berlapis_A', -20 + i * 5, 0, -20.5);
      for (const p of tepi(12, 13, 18)) batu(p.x, p.z, 0.8 + rng() * 1.2, ['Batu_Kapur_A', 'Batu_Kapur_B', 'Batu_Kapur_C']);
      const gunung = tepi(1, 15, 19)[0] ?? { x: -16, z: 8 };
      dunia.tanam('Gunung_Api', gunung.x, 0, gunung.z, 1, putar());
      colliders.push(kotak(gunung.x, gunung.z, 3, 3));
      break;
    }
    case 'E02': {
      kolam(ruang.x - 4, ruang.z + 3.5, 1.15);
      dunia.tanam('Air_Terjun', 12, 0, -19.5);
      colliders.push(kotak(12, -19.5, 6, 3));
      for (let i = 0; i < 5; i++) dunia.tanam(i % 2 ? 'Awan_B' : 'Awan_A', -12 + i * 5, 11 + rng() * 2, -14);
      for (const p of tepi(10, 14, 20)) pohon(p.x, p.z, 1);
      landmark('menara_cuaca', 1.8);
      break;
    }
    case 'E03': {
      // Posisi pengganti (docs/aset/pos_siaga_overview.png): di kode lama danau
      // (-12,-12) menimpa rumah dan bukit (14,-14) menimpa arena.
      const danau = { x: -14, z: -1 };
      const bukit = { x: 4, z: -15 };
      hindari.push(danau, bukit); // ikut dihindari sebaran pohon di noktahWorld
      kolam(danau.x, danau.z, 1.9);
      dunia.pasangBerkas('bukit_titik_kumpul', bukit.x, bukit.z, Math.atan2(-bukit.x, -bukit.z));
      colliders.push(kotak(bukit.x, bukit.z, 8, 8));
      // Panah papan menunjuk +X: diarahkan ke bukit titik kumpul.
      for (const p of [{ x: 1.5, z: 11 }, { x: 7, z: 3 }]) {
        dunia.pasangBerkas('papan_evakuasi', p.x, p.z, Math.atan2(-(bukit.z - p.z), bukit.x - p.x));
        colliders.push(kotak(p.x, p.z, 0.6, 0.6));
      }
      for (const p of tepi(6, 10, 19, 4)) dunia.tanam(pilih(['Karung_Pasir_Dinding', 'Karung_Pasir_Tumpuk']), p.x, 0, p.z, 1, putar());
      for (const p of tepi(12, 15, 20.5)) pohon(p.x, p.z, 1);
      break;
    }
    default:
      break;
  }

  return {
    colliders,
    update: (t) => {
      for (const f of animasi) f(t);
    },
  };
}
