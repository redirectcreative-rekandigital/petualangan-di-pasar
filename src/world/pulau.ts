import * as THREE from 'three';
import { CERITA } from '../data/cerita';
import type { NoktahId } from '../../shared/types';

/**
 * Pulau Nusa Kawruh 3D untuk peta besar.
 *
 * Pulau dibangun dari teras-teras bertingkat (pantai → sawah → hutan → bukit →
 * tebing → puncak) seperti ilustrasi sampul. Jalan setapak melingkar naik
 * menghubungkan 11 balai sesuai urutan bab, berakhir di Mercusuar Tua di
 * puncak. Semua dibuat dari bentuk dasar Three.js (tanpa model unduhan).
 */

type Track = <T extends { dispose: () => void }>(o: T) => T;

interface Teras {
  r: number;
  h: number;
  warna: number;
}

/** Teras dari luar (pantai) ke dalam (puncak). */
const TERAS: Teras[] = [
  { r: 33, h: 0.7, warna: 0xf2d9a0 }, // pasir pantai
  { r: 29.5, h: 1.8, warna: 0x8fcf63 }, // padang rumput pantai
  { r: 25.5, h: 3.3, warna: 0x6dbb4f }, // ladang
  { r: 21.5, h: 4.9, warna: 0x4fa645 }, // hutan bawah
  { r: 17.5, h: 6.5, warna: 0x3b8f3e }, // hutan atas
  { r: 13.5, h: 8.1, warna: 0x9c8f7a }, // bukit batu
  { r: 9.5, h: 9.7, warna: 0xb8a58a }, // tebing
  { r: 5.5, h: 11.2, warna: 0x7cc35a }, // puncak berumput
];

/** Diameter pulau (untuk menyetel kamera). */
export const DIAMETER_PULAU = TERAS[0] ? TERAS[0].r * 2 + 4 : 70;

/** Tinggi permukaan pulau pada jarak r dari pusat. */
export function tinggiPulau(r: number): number {
  let h = 0;
  for (const t of TERAS) if (r <= t.r) h = t.h;
  return h;
}

const SUDUT_AWAL = Math.PI * 0.68;
const SAPUAN = Math.PI * 1.85;

function jariUntuk(i: number): number {
  // i: 0 (balai pertama, dekat pantai) .. 10 (balai terakhir, dekat puncak)
  return 28 - i * 1.95;
}

/** Posisi dunia sebuah balai/noktah di pulau. */
export function posisiDiPulau(kode: NoktahId): { x: number; y: number; z: number } {
  if (kode === 'FINAL') return { x: 0, y: tinggiPulau(0), z: 0 };
  const c = CERITA.find((x) => x.kode === kode);
  const i = (c?.urutan ?? 1) - 1;
  const sudut = SUDUT_AWAL + (i / 10) * SAPUAN;
  const r = jariUntuk(i);
  return { x: Math.cos(sudut) * r, y: tinggiPulau(r), z: Math.sin(sudut) * r };
}

/** Titik-titik jalan setapak melingkar dari balai 1 sampai puncak. */
export function titikJalan(): THREE.Vector3[] {
  const titik: THREE.Vector3[] = [];
  const langkah = 220;
  for (let s = 0; s <= langkah; s++) {
    const t = s / langkah; // 0..1 sepanjang 11 balai
    const i = t * 10;
    const sudut = SUDUT_AWAL + (i / 10) * SAPUAN;
    const r = jariUntuk(i);
    titik.push(new THREE.Vector3(Math.cos(sudut) * r, 0, Math.sin(sudut) * r));
  }
  // Ruas terakhir: dari balai 11 naik ke mercusuar di pusat.
  const akhir = titik[titik.length - 1] as THREE.Vector3;
  for (let s = 1; s <= 20; s++) titik.push(akhir.clone().multiplyScalar(1 - s / 20));
  // Ketinggian dihaluskan agar jalan "mendaki" pelan di antara teras.
  const mentah = titik.map((p) => tinggiPulau(Math.hypot(p.x, p.z)));
  return titik.map((p, k) => {
    let jumlah = 0;
    let n = 0;
    for (let d = -6; d <= 6; d++) {
      const v = mentah[k + d];
      if (v !== undefined) {
        jumlah += v;
        n++;
      }
    }
    return new THREE.Vector3(p.x, Math.max(mentah[k] ?? 0, jumlah / n) + 0.12, p.z);
  });
}

function acak(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Membangun pulau lengkap (teras, jalan, penghias). */
export function buatPulau3D(track: Track): THREE.Group {
  const g = new THREE.Group();
  const rng = acak(9137);

  // Teras: silinder bertumpuk dengan tepi sedikit tak beraturan.
  TERAS.forEach((t, idx) => {
    const geo = track(new THREE.CylinderGeometry(t.r, t.r + (idx === 0 ? 3 : 1.4), t.h + 1.6, 40, 1));
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      const z = pos.getZ(v);
      const a = Math.atan2(z, x);
      const goyang = 1 + Math.sin(a * 5 + idx) * 0.025 + Math.sin(a * 11 + idx * 2) * 0.015;
      pos.setX(v, x * goyang);
      pos.setZ(v, z * goyang);
    }
    geo.computeVertexNormals();
    const mat = track(new THREE.MeshLambertMaterial({ color: t.warna, flatShading: true }));
    const m = new THREE.Mesh(geo, mat);
    m.position.y = (t.h + 1.6) / 2 - 1.6;
    g.add(m);
    // Bibir teras berwarna lebih gelap (tanah) agar undakan terbaca.
    if (idx > 0) {
      const bibir = new THREE.Mesh(
        track(new THREE.TorusGeometry(t.r + 0.1, 0.18, 4, 40)),
        track(new THREE.MeshLambertMaterial({ color: 0x8a6a45 })),
      );
      bibir.rotation.x = Math.PI / 2;
      bibir.position.y = t.h - 0.05;
      g.add(bibir);
    }
  });

  // Jalan setapak (pita tanah) mengikuti spiral.
  const kurva = new THREE.CatmullRomCurve3(titikJalan());
  const jalan = new THREE.Mesh(
    track(new THREE.TubeGeometry(kurva, 420, 0.42, 6, false)),
    track(new THREE.MeshLambertMaterial({ color: 0xe8c48a })),
  );
  jalan.position.y = 0.1;
  g.add(jalan);

  // --- Penghias ---
  const batangMat = track(new THREE.MeshLambertMaterial({ color: 0x7a5230 }));
  const daunMat = track(new THREE.MeshLambertMaterial({ color: 0x2f8f46, flatShading: true }));
  const daunMudaMat = track(new THREE.MeshLambertMaterial({ color: 0x5cb85c, flatShading: true }));
  const kelapaMat = track(new THREE.MeshLambertMaterial({ color: 0x3fa34d, flatShading: true }));
  const batuMat = track(new THREE.MeshLambertMaterial({ color: 0x8e8a83, flatShading: true }));
  const sawahMat = track(new THREE.MeshLambertMaterial({ color: 0xc9d65a }));
  const batangGeo = track(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6));
  const daunGeo = track(new THREE.ConeGeometry(0.9, 1.8, 7));
  const bulatGeo = track(new THREE.IcosahedronGeometry(0.8, 0));
  const pelepahGeo = track(new THREE.BoxGeometry(1.6, 0.06, 0.35));
  const batuGeo = track(new THREE.DodecahedronGeometry(0.7, 0));
  const petakGeo = track(new THREE.BoxGeometry(2.2, 0.08, 1.4));

  const jauhDariJalan = (x: number, z: number): boolean => {
    for (const k of CERITA) {
      const p = posisiDiPulau(k.kode);
      if (Math.hypot(p.x - x, p.z - z) < 3.6) return false;
    }
    return Math.hypot(x, z) > 3.5;
  };

  const tanam = (r0: number, r1: number, jumlah: number, buat: (x: number, y: number, z: number, s: number) => void): void => {
    let n = 0;
    let coba = 0;
    while (n < jumlah && coba < jumlah * 20) {
      coba++;
      const a = rng() * Math.PI * 2;
      const r = r0 + rng() * (r1 - r0);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!jauhDariJalan(x, z)) continue;
      buat(x, tinggiPulau(r), z, 0.7 + rng() * 0.6);
      n++;
    }
  };

  // Pohon kelapa di pantai.
  tanam(29.8, 32.5, 22, (x, y, z, s) => {
    const batang = new THREE.Mesh(batangGeo, batangMat);
    batang.scale.set(s, s * 1.8, s);
    batang.position.set(x, y + 1.2 * s, z);
    batang.rotation.z = (rng() - 0.5) * 0.4;
    g.add(batang);
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(pelepahGeo, kelapaMat);
      p.position.set(x, y + 2.5 * s, z);
      p.rotation.y = (k / 5) * Math.PI * 2;
      p.rotation.z = -0.4;
      p.scale.setScalar(s);
      g.add(p);
    }
  });
  // Petak sawah di teras ladang.
  tanam(22, 25, 14, (x, y, z) => {
    const petak = new THREE.Mesh(petakGeo, sawahMat);
    petak.position.set(x, y + 0.05, z);
    petak.rotation.y = Math.atan2(x, z);
    g.add(petak);
  });
  // Hutan: pohon kerucut & bulat.
  tanam(14, 25.5, 70, (x, y, z, s) => {
    const batang = new THREE.Mesh(batangGeo, batangMat);
    batang.scale.setScalar(s);
    batang.position.set(x, y + 0.7 * s, z);
    g.add(batang);
    const bulat = rng() > 0.5;
    const daun = new THREE.Mesh(bulat ? bulatGeo : daunGeo, bulat ? daunMudaMat : daunMat);
    daun.scale.setScalar(s * (bulat ? 1.2 : 1));
    daun.position.set(x, y + (bulat ? 1.8 : 2.0) * s, z);
    g.add(daun);
  });
  // Batu di bukit & tebing.
  tanam(6, 13.5, 26, (x, y, z, s) => {
    const b = new THREE.Mesh(batuGeo, batuMat);
    b.scale.set(s, s * 0.7, s);
    b.position.set(x, y + 0.3, z);
    b.rotation.y = rng() * 3;
    g.add(b);
  });

  return g;
}
