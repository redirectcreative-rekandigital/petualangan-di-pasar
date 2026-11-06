import * as THREE from 'three';

/**
 * Penghias dunia memakai InstancedMesh + LOD sederhana.
 *
 * Terinspirasi dari eksperimen "Summer Afternoon" yang memakai `*-instances.bin`
 * dan versi `-lod2/-lod3`. Di sini kita tidak memuat model eksternal: bentuk
 * penghias dibuat dari geometri dasar, lalu digandakan lewat InstancedMesh agar
 * ribuan objek tetap murah.
 *
 * LOD dijalankan dengan memisahkan instance menjadi dua kelompok berdasarkan
 * jarak dari PEMAIN: dekat (detail penuh) dan jauh (bentuk ringkas). Kelompok
 * dihitung ulang hanya saat pemain berpindah cukup jauh, sehingga biaya tiap
 * frame tetap nol.
 */

export type JenisPenghias = 'pohon' | 'semak' | 'batu' | 'peti' | 'lampu';

export interface PenghiasTitik {
  x: number;
  z: number;
  /** Skala acak (0.7..1.3). */
  skala?: number;
  /** Rotasi Y acak (radian). */
  rotasi?: number;
}

export interface PenghiasHandle {
  /** Perbarui pembagian LOD berdasarkan posisi pemain (murah bila tak berpindah). */
  update: (posisi: { x: number; z: number }) => void;
  /** Total instance yang digambar. */
  jumlah: number;
  dispose: () => void;
}

interface GeometriPasangan {
  detail: THREE.BufferGeometry;
  ringkas: THREE.BufferGeometry;
  material: THREE.Material;
}

/** Satu titik memakai jari-jari ini untuk memutuskan detail vs ringkas. */
const JARAK_LOD = 22;

export function buildPenghias(
  scene: THREE.Scene,
  jenis: JenisPenghias,
  titik: PenghiasTitik[],
  track: <T extends { dispose: () => void }>(obj: T) => T,
  warna?: THREE.ColorRepresentation,
): PenghiasHandle {
  if (titik.length === 0) {
    return { update: () => {}, jumlah: 0, dispose: () => {} };
  }

  const { detail, ringkas, material } = buatGeometri(jenis, track, warna);

  const meshDetail = new THREE.InstancedMesh(detail, material, titik.length);
  const meshRingkas = new THREE.InstancedMesh(ringkas, material, titik.length);
  meshDetail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  meshRingkas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  meshDetail.frustumCulled = false;
  meshRingkas.frustumCulled = false;
  scene.add(meshDetail);
  scene.add(meshRingkas);

  const dummy = new THREE.Object3D();
  let indexDetail = 0;
  let indexRingkas = 0;
  let terakhir = { x: Number.NaN, z: Number.NaN };

  function susunSemua(): void {
    indexDetail = 0;
    indexRingkas = 0;
  }

  const matriksDetail: THREE.Matrix4[] = [];

  for (const t of titik) {
    const skala = t.skala ?? 1;
    dummy.position.set(t.x, 0, t.z);
    dummy.rotation.set(0, t.rotasi ?? 0, 0);
    dummy.scale.setScalar(skala);
    dummy.updateMatrix();
    matriksDetail.push(dummy.matrix.clone());
  }

  function perbaruiLod(posisi: { x: number; z: number }): void {
    const jauh = Math.abs(posisi.x - terakhir.x) + Math.abs(posisi.z - terakhir.z);
    if (jauh < 1.5 && !Number.isNaN(terakhir.x)) return;
    terakhir = { x: posisi.x, z: posisi.z };

    susunSemua();
    for (let i = 0; i < titik.length; i++) {
      const t = titik[i] as PenghiasTitik;
      const d = Math.hypot(t.x - posisi.x, t.z - posisi.z);
      const mat = matriksDetail[i] as THREE.Matrix4;
      if (d <= JARAK_LOD) {
        meshDetail.setMatrixAt(indexDetail++, mat);
      } else {
        meshRingkas.setMatrixAt(indexRingkas++, mat);
      }
    }
    meshDetail.count = indexDetail;
    meshRingkas.count = indexRingkas;
    meshDetail.instanceMatrix.needsUpdate = true;
    meshRingkas.instanceMatrix.needsUpdate = true;
  }

  // Susun pertama kali (anggap pemain di tengah).
  perbaruiLod({ x: 0, z: 0 });

  return {
    update: perbaruiLod,
    jumlah: titik.length,
    dispose: () => {
      scene.remove(meshDetail);
      scene.remove(meshRingkas);
      meshDetail.dispose();
      meshRingkas.dispose();
    },
  };
}

/** Membuat pasangan geometri detail & ringkas untuk tiap jenis penghias. */
function buatGeometri(
  jenis: JenisPenghias,
  track: <T extends { dispose: () => void }>(o: T) => T,
  warna?: THREE.ColorRepresentation,
): GeometriPasangan {
  switch (jenis) {
    case 'pohon': {
      // Detail: batang + 2 bola daun. Ringkas: 1 kerucut.
      const batang = track(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 8));
      batang.translate(0, 0.8, 0);
      const daunA = track(new THREE.IcosahedronGeometry(1.0, 1));
      daunA.translate(0, 2.1, 0);
      const daunB = track(new THREE.IcosahedronGeometry(0.7, 1));
      daunB.translate(0, 2.9, 0);
      const detail = gabung([batang, daunA, daunB]);
      const ringkas = track(new THREE.ConeGeometry(1.1, 3.0, 6));
      ringkas.translate(0, 1.5, 0);
      return {
        detail,
        ringkas,
        material: track(new THREE.MeshLambertMaterial({ color: warna ?? 0x4f9a52 })),
      };
    }
    case 'semak': {
      const detail = track(new THREE.IcosahedronGeometry(0.7, 1));
      detail.translate(0, 0.55, 0);
      const ringkas = track(new THREE.IcosahedronGeometry(0.6, 0));
      ringkas.translate(0, 0.5, 0);
      return {
        detail,
        ringkas,
        material: track(new THREE.MeshLambertMaterial({ color: warna ?? 0x63a94f })),
      };
    }
    case 'batu': {
      const detail = track(new THREE.DodecahedronGeometry(0.6, 0));
      detail.translate(0, 0.4, 0);
      const ringkas = track(new THREE.TetrahedronGeometry(0.75, 0));
      ringkas.translate(0, 0.4, 0);
      return {
        detail,
        ringkas,
        material: track(new THREE.MeshLambertMaterial({ color: warna ?? 0x9aa3ad, flatShading: true })),
      };
    }
    case 'peti': {
      const detail = track(new THREE.BoxGeometry(1, 1, 1));
      detail.translate(0, 0.5, 0);
      const ringkas = track(new THREE.BoxGeometry(1.1, 0.9, 1.1));
      ringkas.translate(0, 0.45, 0);
      return {
        detail,
        ringkas,
        material: track(new THREE.MeshLambertMaterial({ color: warna ?? 0xcf9b52 })),
      };
    }
    case 'lampu':
    default: {
      const tiang = track(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6));
      tiang.translate(0, 1.7, 0);
      const kepala = track(new THREE.SphereGeometry(0.3, 10, 8));
      kepala.translate(0, 3.5, 0);
      const detail = gabung([tiang, kepala]);
      const ringkas = track(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 6));
      ringkas.translate(0, 1.7, 0);
      return {
        detail,
        ringkas,
        material: track(new THREE.MeshLambertMaterial({ color: warna ?? 0x6b5a44 })),
      };
    }
  }
}

/** Menggabungkan beberapa geometri menjadi satu (tanpa BufferGeometryUtils). */
function gabung(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const posisi: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];

  /** Ambil indeks ke-i, ikuti index buffer bila ada. */
  const ambil = (g: THREE.BufferGeometry, i: number): number => {
    const idx = g.getIndex();
    return idx ? idx.getX(i) : i;
  };

  for (const g of geometries) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const u = g.getAttribute('uv');
    const jumlah = g.getIndex() ? (g.getIndex() as THREE.BufferAttribute).count : p.count;
    for (let i = 0; i < jumlah; i++) {
      const j = ambil(g, i);
      posisi.push(p.getX(j), p.getY(j), p.getZ(j));
      if (n) normal.push(n.getX(j), n.getY(j), n.getZ(j));
      if (u) uv.push(u.getX(j), u.getY(j));
    }
  }

  out.setAttribute('position', new THREE.Float32BufferAttribute(posisi, 3));
  if (normal.length) out.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  if (uv.length) out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}
