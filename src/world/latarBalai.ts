import * as THREE from 'three';
import type { SceneTheme } from './scene';
import type { ColliderBox } from './mapConfig';

/**
 * Latar khas tiap balai: suasana langit/tanah + penghias bertema materi.
 * Penghias diletakkan di tepi area (menjauhi titik misi dan jalan setapak)
 * agar tidak menghalangi pemain.
 */

type Track = <T extends { dispose: () => void }>(o: T) => T;
type Titik = { x: number; z: number };

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
export function bangunLatar(kode: string, scene: THREE.Scene, track: Track, hindari: Titik[]): LatarHandle {
  const colliders: ColliderBox[] = [];
  const animasi: Array<(t: number) => void> = [];
  const rng = acak(kode.charCodeAt(0) * 131 + kode.charCodeAt(2) * 17 + 7);
  const bebas = (x: number, z: number, jarak = 5.5): boolean => hindari.every((p) => Math.hypot(p.x - x, p.z - z) > jarak);

  const mat = (warna: number, opsi: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial =>
    track(new THREE.MeshStandardMaterial({ color: warna, roughness: 0.9, flatShading: true, ...opsi }));
  const tambah = (m: THREE.Object3D, bayangan = true): void => {
    if (bayangan) m.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    scene.add(m);
  };

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

  const batu = (x: number, z: number, s: number, warna: number): void => {
    const m = new THREE.Mesh(track(new THREE.DodecahedronGeometry(1, 0)), mat(warna));
    m.scale.set(s, s * (0.7 + rng() * 0.6), s);
    m.position.set(x, s * 0.4, z);
    m.rotation.set(rng(), rng() * 3, rng());
    tambah(m);
    if (s > 1.2) colliders.push(kotak(x, z, s * 1.4, s * 1.4));
  };

  const pohon = (x: number, z: number, s: number, daun = 0x3b8f3e): void => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 1.8 * s, 7)), mat(0x7a5230));
    b.position.y = 0.9 * s;
    const d = new THREE.Mesh(track(new THREE.IcosahedronGeometry(1.4 * s, 0)), mat(daun));
    d.position.y = 2.4 * s;
    g.add(b, d);
    g.position.set(x, 0, z);
    tambah(g);
    colliders.push(kotak(x, z, 0.8, 0.8));
  };

  const air = (x: number, z: number, rx: number, rz: number, warna = 0x38bdf8): THREE.Mesh => {
    const m = new THREE.Mesh(
      track(new THREE.CircleGeometry(1, 40)),
      track(new THREE.MeshStandardMaterial({ color: warna, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 })),
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.set(rx, rz, 1);
    m.position.set(x, 0.03, z);
    m.receiveShadow = true;
    scene.add(m);
    colliders.push(kotak(x, z, rx * 1.6, rz * 1.6));
    return m;
  };

  switch (kode) {
    case 'F01': {
      // Dinding goa: batu besar mengelilingi area + stalaktit, dan berkas sinar dari atap.
      for (let i = 0; i < 34; i++) {
        const a = (i / 34) * Math.PI * 2;
        const r = 20 + rng() * 1.5;
        const z = Math.sin(a) * r;
        // Sisi depan (z besar) dibiarkan terbuka: mulut goa menghadap laut.
        if (z > 4) continue;
        batu(Math.cos(a) * r, z, 2.2 + rng() * 1.6, 0x57534e);
      }
      for (const p of tepi(10, 12, 18)) batu(p.x, p.z, 0.8 + rng() * 0.8, 0x6b645c);
      const atap = new THREE.Mesh(track(new THREE.ConeGeometry(0.4, 2.4, 6)), mat(0x44403c));
      for (let i = 0; i < 14; i++) {
        const s = atap.clone();
        const a = rng() * Math.PI * 2;
        const r = 8 + rng() * 10;
        s.position.set(Math.cos(a) * r, 7.5, Math.sin(a) * r);
        s.rotation.x = Math.PI;
        scene.add(s);
      }
      const sinar = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.6, 2.6, 14, 20, 1, true)),
        track(new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })),
      );
      const pusatSinar = hindari[2] ?? { x: 0, z: 0 }; // titik ruang cerita
      sinar.position.set(pusatSinar.x, 7, pusatSinar.z);
      scene.add(sinar);
      const lampu = new THREE.PointLight(0xffd27a, 18, 14, 1.6);
      lampu.position.set(pusatSinar.x, 4, pusatSinar.z);
      scene.add(lampu);
      animasi.push((t) => {
        (sinar.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 1.3) * 0.04;
      });
      break;
    }
    case 'F02': {
      // Tebing tinggi di dua sisi lembah.
      for (const sisi of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const m = new THREE.Mesh(track(new THREE.BoxGeometry(3.5, 9 + rng() * 5, 6.5)), mat(i % 2 ? 0x8b7fa8 : 0x7a6e96));
          m.position.set(sisi * (20 + rng()), m.geometry.parameters.height / 2, -18 + i * 7);
          m.rotation.y = (rng() - 0.5) * 0.3;
          tambah(m);
        }
      }
      for (const p of tepi(12, 13, 18)) batu(p.x, p.z, 0.9 + rng(), 0x9a90b0);
      break;
    }
    case 'H01': {
      for (const p of tepi(26, 14, 21, 4.5)) pohon(p.x, p.z, 0.9 + rng() * 0.7, rng() > 0.5 ? 0x2f8f46 : 0x4aa84f);
      const ruang = hindari[2] ?? { x: 0, z: 0 };
      air(ruang.x + 4, ruang.z + 4, 2.6, 1.8);
      break;
    }
    case 'H02': {
      // Petak sawah berjajar + orang-orangan sawah.
      const sawah = mat(0xc4d25a);
      const padi = mat(0xe0c84a);
      for (let gx = -18; gx <= 18; gx += 4.5) {
        for (let gz = -18; gz <= 18; gz += 4.5) {
          if (Math.hypot(gx, gz) < 13 || !bebas(gx, gz, 4.5)) continue;
          const p = new THREE.Mesh(track(new THREE.BoxGeometry(4, 0.15, 4)), rng() > 0.4 ? sawah : padi);
          p.position.set(gx, 0.08, gz);
          p.receiveShadow = true;
          scene.add(p);
          for (let k = 0; k < 4; k++) {
            const tunas = new THREE.Mesh(track(new THREE.ConeGeometry(0.15, 0.7, 4)), padi);
            tunas.position.set(gx + (rng() - 0.5) * 3, 0.45, gz + (rng() - 0.5) * 3);
            scene.add(tunas);
          }
        }
      }
      break;
    }
    case 'H03': {
      const warnaBunga = [0xf472b6, 0xfacc15, 0xf97316, 0xa78bfa, 0xffffff, 0xef4444];
      const tangkai = mat(0x3f9a52);
      for (const p of tepi(46, 9, 20.5, 4)) {
        const g = new THREE.Group();
        const t = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 4)), tangkai);
        t.position.y = 0.4;
        const kepala = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.32, 0)), mat(warnaBunga[Math.floor(rng() * warnaBunga.length)] ?? 0xf472b6));
        kepala.position.y = 0.9;
        g.add(t, kepala);
        g.position.set(p.x, 0, p.z);
        g.scale.setScalar(1 + rng() * 0.8);
        scene.add(g);
      }
      for (const p of tepi(6, 16, 20.5)) pohon(p.x, p.z, 1.2, 0x5cb85c);
      // Lebah kecil berputar.
      const lebah = new THREE.Mesh(track(new THREE.SphereGeometry(0.18, 8, 6)), mat(0xfacc15));
      scene.add(lebah);
      animasi.push((t) => lebah.position.set(Math.cos(t) * 6, 2 + Math.sin(t * 3) * 0.3, Math.sin(t) * 6));
      break;
    }
    case 'H04': {
      // Separuh hutan gundul (tunggul) + deretan pot bibit.
      const tunggul = mat(0x8a5a32);
      for (const p of tepi(22, 12, 20.5, 4.5)) {
        if (p.x < 0) {
          const m = new THREE.Mesh(track(new THREE.CylinderGeometry(0.5, 0.65, 0.7, 8)), tunggul);
          m.position.set(p.x, 0.35, p.z);
          tambah(m);
        } else pohon(p.x, p.z, 1 + rng() * 0.5);
      }
      const pot = mat(0xb45309);
      const tunas = mat(0x4ade80);
      for (let i = 0; i < 12; i++) {
        const x = -6 + (i % 6) * 1.2;
        const z = 13 + Math.floor(i / 6) * 1.2;
        if (!bebas(x, z, 3)) continue;
        const p = new THREE.Mesh(track(new THREE.CylinderGeometry(0.3, 0.22, 0.4, 8)), pot);
        p.position.set(x, 0.2, z);
        const t = new THREE.Mesh(track(new THREE.ConeGeometry(0.2, 0.6, 5)), tunas);
        t.position.set(x, 0.65, z);
        scene.add(p, t);
      }
      break;
    }
    case 'F03': {
      for (const p of tepi(20, 13, 20.5)) batu(p.x, p.z, 1 + rng() * 1.8, rng() > 0.5 ? 0x7f4a3a : 0x6b6b6b);
      // Batu magnet raksasa merah-biru di tepi.
      const magnet = new THREE.Group();
      const merah = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 3, 2)), mat(0xdc2626));
      const biru = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 3, 2)), mat(0x2563eb));
      merah.position.set(-1.2, 1.5, 0);
      biru.position.set(1.2, 1.5, 0);
      magnet.add(merah, biru);
      const tempat = tepi(1, 16, 19)[0] ?? { x: 16, z: -16 };
      magnet.position.set(tempat.x, 0, tempat.z);
      magnet.lookAt(0, 0, 0);
      tambah(magnet);
      colliders.push(kotak(tempat.x, tempat.z, 5, 5));
      break;
    }
    case 'F04': {
      // Sungai melintang + kincir air berputar.
      const sungai = new THREE.Mesh(
        track(new THREE.PlaneGeometry(46, 4.5)),
        track(new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, transparent: true, opacity: 0.88 })),
      );
      sungai.rotation.x = -Math.PI / 2;
      sungai.position.set(0, 0.03, -19);
      scene.add(sungai);
      const kincir = new THREE.Group();
      const roda = new THREE.Mesh(track(new THREE.TorusGeometry(2.4, 0.18, 6, 24)), mat(0x8a5a32));
      kincir.add(roda);
      for (let i = 0; i < 8; i++) {
        const sudu = new THREE.Mesh(track(new THREE.BoxGeometry(0.2, 2.4, 0.9)), mat(0xa16207));
        sudu.rotation.z = (i / 8) * Math.PI * 2;
        kincir.add(sudu);
      }
      kincir.position.set(-8, 2.6, -18.5);
      tambah(kincir);
      animasi.push((t) => (kincir.rotation.z = -t * 0.8));
      for (const p of tepi(10, 13, 16)) pohon(p.x, p.z, 1, 0x4aa84f);
      break;
    }
    case 'E01': {
      // Tebing berlapis di belakang.
      const lapis = [0xa16207, 0x78716c, 0x57534e, 0xea580c, 0x92400e];
      for (let i = 0; i < 9; i++) {
        lapis.forEach((w, k) => {
          const m = new THREE.Mesh(track(new THREE.BoxGeometry(5.2, 1.6, 4)), mat(w));
          m.position.set(-20 + i * 5, 0.8 + k * 1.6, -20.5);
          tambah(m);
        });
      }
      for (const p of tepi(12, 13, 18)) batu(p.x, p.z, 0.8 + rng() * 1.2, 0xa8a29e);
      break;
    }
    case 'E02': {
      const ruang = hindari[2] ?? { x: 0, z: 0 };
      air(ruang.x - 4, ruang.z + 3.5, 3, 2.2, 0x67e8f9);
      // Air terjun kecil dari batu.
      const tebing = new THREE.Mesh(track(new THREE.BoxGeometry(6, 6, 3)), mat(0x78716c));
      tebing.position.set(12, 3, -19.5);
      tambah(tebing);
      const terjun = new THREE.Mesh(
        track(new THREE.PlaneGeometry(1.8, 6)),
        track(new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.7, side: THREE.DoubleSide })),
      );
      terjun.position.set(12, 3, -17.9);
      scene.add(terjun);
      animasi.push((t) => ((terjun.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(t * 6) * 0.1));
      // Awan rendah (menara awan).
      const awanMat = track(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
      for (let i = 0; i < 5; i++) {
        const a = new THREE.Mesh(track(new THREE.IcosahedronGeometry(2, 1)), awanMat);
        a.position.set(-12 + i * 2.4, 11 + rng() * 2, -14);
        a.scale.set(1.4, 0.8, 1);
        scene.add(a);
      }
      for (const p of tepi(10, 14, 20)) pohon(p.x, p.z, 1, 0x3fa34d);
      break;
    }
    case 'E03': {
      air(-12, -12, 5, 3.5, 0x0ea5e9);
      // Bukit titik kumpul dengan bendera hijau.
      const bukit = new THREE.Mesh(track(new THREE.ConeGeometry(6, 5, 16)), mat(0x6dbb4f));
      bukit.position.set(14, 2.5, -14);
      tambah(bukit);
      colliders.push(kotak(14, -14, 8, 8));
      const tiang = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.08, 3, 6)), mat(0x334155));
      tiang.position.set(14, 6.5, -14);
      const bendera = new THREE.Mesh(track(new THREE.PlaneGeometry(1.6, 1)), track(new THREE.MeshBasicMaterial({ color: 0x16a34a, side: THREE.DoubleSide })));
      bendera.position.set(14.8, 7.5, -14);
      scene.add(tiang, bendera);
      animasi.push((t) => (bendera.rotation.y = Math.sin(t * 2) * 0.3));
      for (const p of tepi(12, 15, 20.5)) pohon(p.x, p.z, 1, 0x4aa84f);
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
