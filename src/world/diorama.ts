import * as THREE from 'three';

/**
 * Panggung materi per balai.
 *
 * Setiap balai memiliki satu diorama kecil yang berbeda sesuai materi IPA-nya
 * (ekosistem, rantai makanan, cahaya, magnet, siklus air, dan seterusnya).
 * Semua dibangun dari bentuk dasar Three.js, tanpa model unduhan, agar ringan
 * dan tetap konsisten dengan gaya visual permainan.
 */

type Track = <T extends { dispose: () => void }>(obj: T) => T;

interface OpsiBenda {
  rotasi?: [number, number, number];
  skala?: [number, number, number];
  opacity?: number;
  basic?: boolean;
}

type Taruh = (
  geo: THREE.BufferGeometry,
  warna: number,
  x: number,
  y: number,
  z: number,
  opsi?: OpsiBenda,
) => THREE.Mesh;

/** Membangun panggung + diorama sesuai kode balai. */
export function buildDiorama(kode: string, aksen: number, track: Track): THREE.Group {
  const g = new THREE.Group();
  const cache = new Map<string, THREE.Material>();

  const material = (warna: number, opsi: OpsiBenda = {}): THREE.Material => {
    const key = `${warna}:${opsi.opacity ?? 1}:${opsi.basic ? 1 : 0}`;
    const ada = cache.get(key);
    if (ada) return ada;
    const dasar = { color: warna };
    const transparan = opsi.opacity !== undefined ? { transparent: true, opacity: opsi.opacity } : {};
    const baru = opsi.basic
      ? new THREE.MeshBasicMaterial({ ...dasar, ...transparan })
      : new THREE.MeshLambertMaterial({ ...dasar, ...transparan });
    const dilacak = track(baru);
    cache.set(key, dilacak);
    return dilacak;
  };

  const taruh: Taruh = (geo, warna, x, y, z, opsi = {}) => {
    const mesh = new THREE.Mesh(track(geo), material(warna, opsi));
    mesh.position.set(x, y, z);
    if (opsi.rotasi) mesh.rotation.set(...opsi.rotasi);
    if (opsi.skala) mesh.scale.set(...opsi.skala);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };

  // Alas panggung batu + cincin warna balai.
  taruh(new THREE.CylinderGeometry(1.9, 2.1, 0.3, 28), 0xcdae82, 0, 0.15, 0);
  taruh(new THREE.TorusGeometry(1.86, 0.07, 8, 40), aksen, 0, 0.32, 0, {
    rotasi: [Math.PI / 2, 0, 0],
    basic: true,
  });

  const tema: Record<string, (t: Taruh) => void> = {
    H01: temaEkosistem,
    H02: temaRantaiMakanan,
    H03: temaSimbiosis,
    H04: temaKelestarian,
    F01: temaCahaya,
    F02: temaBunyi,
    F03: temaMagnet,
    F04: temaListrik,
    E01: temaLitosfer,
    E02: temaHidrosfer,
    E03: temaSiklusAir,
    FINAL: temaMenaraKitab,
  };

  (tema[kode] ?? temaMenaraKitab)(taruh);
  return g;
}

/* ================================================================== */
/* ZONA MAKHLUK HIDUP                                                  */
/* ================================================================== */

function temaEkosistem(t: Taruh): void {
  // Pohon rindang.
  t(new THREE.CylinderGeometry(0.12, 0.2, 1.2, 8), 0x7a4a21, -1.0, 0.9, -0.2);
  t(new THREE.SphereGeometry(0.58, 12, 10), 0x2f9e6b, -1.0, 1.6, -0.2);
  t(new THREE.SphereGeometry(0.42, 12, 10), 0x3fb37a, -1.28, 1.38, 0.05);
  t(new THREE.SphereGeometry(0.4, 12, 10), 0x278a5d, -0.72, 1.4, 0.05);

  // Kolam kecil.
  t(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 22), 0x38bdf8, 0.95, 0.35, 0.5);
  t(new THREE.TorusGeometry(0.58, 0.05, 6, 22), 0x0e7490, 0.95, 0.36, 0.5, {
    rotasi: [Math.PI / 2, 0, 0],
  });

  // Jamur.
  t(new THREE.CylinderGeometry(0.07, 0.09, 0.36, 8), 0xf5e6c8, -0.15, 0.48, 0.8);
  t(new THREE.ConeGeometry(0.3, 0.24, 14), 0xef4444, -0.15, 0.76, 0.8);
  t(new THREE.SphereGeometry(0.05, 8, 6), 0xfff7e6, -0.05, 0.82, 0.86);
  t(new THREE.SphereGeometry(0.04, 8, 6), 0xfff7e6, -0.24, 0.74, 0.82);

  // Matahari.
  t(new THREE.SphereGeometry(0.3, 12, 10), 0xfbbf24, 1.15, 1.85, -0.8, { basic: true });

  // Rumpun rumput.
  for (let i = 0; i < 4; i++) {
    t(new THREE.ConeGeometry(0.07, 0.32, 5), 0x4ade80, 0.35 + i * 0.14, 0.42, 0.9);
  }
}

function temaRantaiMakanan(t: Taruh): void {
  const x = [-1.2, -0.4, 0.4, 1.2];
  const z = -0.2;

  // Pijakan batu untuk tiap mata rantai.
  for (const px of x) {
    t(new THREE.CylinderGeometry(0.28, 0.32, 0.2, 12), 0x94a3b8, px, 0.4, z);
  }

  // Padi (produsen).
  for (let i = 0; i < 3; i++) {
    t(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 5), 0xa16207, x[0]! + (i - 1) * 0.09, 0.78, z);
    t(new THREE.ConeGeometry(0.07, 0.24, 6), 0xfacc15, x[0]! + (i - 1) * 0.09, 1.16, z);
  }

  // Tikus.
  t(new THREE.SphereGeometry(0.24, 12, 10), 0x9ca3af, x[1]!, 0.8, z);
  t(new THREE.SphereGeometry(0.12, 10, 8), 0x9ca3af, x[1]! - 0.13, 1.0, z);
  t(new THREE.SphereGeometry(0.1, 10, 8), 0x9ca3af, x[1]! + 0.13, 1.0, z);
  t(new THREE.SphereGeometry(0.04, 8, 6), 0xf9a8d4, x[1]! - 0.13, 1.0, z + 0.08);
  t(new THREE.SphereGeometry(0.04, 8, 6), 0xf9a8d4, x[1]! + 0.13, 1.0, z + 0.08);

  // Ular.
  t(new THREE.TorusGeometry(0.24, 0.08, 8, 20), 0x22c55e, x[2]!, 0.72, z, {
    rotasi: [Math.PI / 2, 0, 0],
  });
  t(new THREE.SphereGeometry(0.13, 10, 8), 0x16a34a, x[2]! + 0.22, 0.78, z);

  // Elang.
  t(new THREE.ConeGeometry(0.24, 0.5, 10), 0x92400e, x[3]!, 0.95, z, { rotasi: [0, 0, Math.PI] });
  t(new THREE.BoxGeometry(0.42, 0.08, 0.18), 0x78350f, x[3]!, 1.02, z);
  t(new THREE.ConeGeometry(0.12, 0.2, 8), 0xf59e0b, x[3]!, 1.24, z);

  // Panah perpindahan energi.
  for (const px of [-0.8, 0, 0.8]) {
    t(new THREE.ConeGeometry(0.09, 0.22, 6), 0xf97316, px, 0.52, z + 0.42, {
      rotasi: [0, 0, -Math.PI / 2],
    });
  }
}

function temaSimbiosis(t: Taruh): void {
  // Bunga besar (mutualisme dengan lebah).
  t(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 6), 0x16a34a, -0.9, 0.75, 0.2);
  t(new THREE.SphereGeometry(0.12, 10, 8), 0xfacc15, -0.9, 1.25, 0.2);
  for (let i = 0; i < 5; i++) {
    const sudut = (i / 5) * Math.PI * 2;
    t(
      new THREE.SphereGeometry(0.13, 10, 8),
      0xec4899,
      -0.9 + Math.cos(sudut) * 0.2,
      1.25,
      0.2 + Math.sin(sudut) * 0.2,
    );
  }
  t(new THREE.BoxGeometry(0.28, 0.03, 0.16), 0x22c55e, -1.02, 0.88, 0.2, {
    rotasi: [0, 0, -0.5],
  });

  // Lebah.
  t(new THREE.SphereGeometry(0.13, 10, 8), 0xfbbf24, -0.35, 1.45, 0.35);
  t(new THREE.CylinderGeometry(0.135, 0.135, 0.03, 10), 0x1f2937, -0.35, 1.45, 0.35, {
    rotasi: [Math.PI / 2, 0, 0],
  });
  t(new THREE.SphereGeometry(0.1, 8, 6), 0xbfdbfe, -0.28, 1.58, 0.32, { opacity: 0.7 });
  t(new THREE.SphereGeometry(0.1, 8, 6), 0xbfdbfe, -0.42, 1.58, 0.32, { opacity: 0.7 });

  // Pohon dengan anggrek (komensalisme).
  t(new THREE.CylinderGeometry(0.1, 0.16, 1.0, 8), 0x7a4a21, 0.95, 0.8, -0.3);
  t(new THREE.SphereGeometry(0.45, 12, 10), 0x2f9e6b, 0.95, 1.45, -0.3);
  for (let i = 0; i < 3; i++) {
    t(new THREE.SphereGeometry(0.09, 8, 6), 0xa855f7, 0.72 + i * 0.16, 1.14 + (i % 2) * 0.12, -0.02);
  }

  // Benalu (parasitisme) di dahan.
  t(new THREE.SphereGeometry(0.16, 10, 8), 0x84cc16, 1.2, 1.3, -0.05);
  t(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), 0x65a30d, 1.2, 1.12, -0.05);
}

function temaKelestarian(t: Taruh): void {
  // Bedeng bibit.
  t(new THREE.BoxGeometry(1.7, 0.16, 0.9), 0x8b5a2b, -0.5, 0.38, 0.2);
  for (let i = 0; i < 3; i++) {
    const px = -1.05 + i * 0.42;
    t(new THREE.CylinderGeometry(0.04, 0.05, 0.42, 6), 0x92400e, px, 0.66, 0.2);
    t(new THREE.SphereGeometry(0.18, 10, 8), 0x22c55e, px, 0.94, 0.2);
    t(new THREE.ConeGeometry(0.06, 0.18, 5), 0x4ade80, px + 0.12, 0.78, 0.2, {
      rotasi: [0, 0, -0.6],
    });
  }

  // Tiga tong sampah 3R.
  const warnaTong = [0xef4444, 0xfacc15, 0x2563eb];
  for (let i = 0; i < 3; i++) {
    t(new THREE.CylinderGeometry(0.2, 0.22, 0.52, 12), warnaTong[i]!, 0.45 + i * 0.45, 0.6, 0.55);
    t(new THREE.CylinderGeometry(0.23, 0.23, 0.07, 12), 0x475569, 0.45 + i * 0.45, 0.9, 0.55);
  }

  // Penyiram tanaman.
  t(new THREE.CylinderGeometry(0.18, 0.2, 0.4, 12), 0x0ea5e9, 1.05, 0.55, -0.45);
  t(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 6), 0x0284c7, 1.3, 0.7, -0.45, {
    rotasi: [0, 0, -0.8],
  });

  // Pagar kecil.
  for (let i = 0; i < 4; i++) {
    t(new THREE.BoxGeometry(0.08, 0.44, 0.08), 0xa16207, -1.3 + i * 0.45, 0.5, -0.75);
  }
  t(new THREE.BoxGeometry(1.5, 0.07, 0.07), 0xa16207, -0.62, 0.62, -0.75);
}

/* ================================================================== */
/* ZONA FISIKA                                                         */
/* ================================================================== */

function temaCahaya(t: Taruh): void {
  // Prisma kaca.
  t(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 3), 0xa5f3fc, -0.55, 0.85, 0.1, {
    opacity: 0.6,
    rotasi: [0, 0.3, 0],
  });

  // Berkas cahaya putih masuk.
  t(new THREE.BoxGeometry(0.9, 0.1, 0.1), 0xfef9c3, -1.25, 0.95, 0.1, {
    rotasi: [0, 0, 0.18],
    basic: true,
  });

  // Spektrum pelangi keluar dari prisma.
  const warnaPelangi = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x3b82f6];
  warnaPelangi.forEach((warna, i) => {
    t(new THREE.BoxGeometry(1.0, 0.07, 0.08), warna, 0.45, 0.9 + (i - 2) * 0.12, 0.1, {
      rotasi: [0, 0, (i - 2) * 0.16],
      basic: true,
    });
  });

  // Cermin datar.
  t(new THREE.BoxGeometry(0.08, 1.15, 0.75), 0xbfdbfe, -1.45, 0.95, -0.45, {
    rotasi: [0, 0.4, 0],
  });

  // Model mata.
  t(new THREE.SphereGeometry(0.34, 14, 12), 0xffffff, 1.15, 0.95, -0.2);
  t(new THREE.SphereGeometry(0.15, 12, 10), 0x2563eb, 1.15, 0.95, -0.02);
  t(new THREE.SphereGeometry(0.07, 10, 8), 0x111827, 1.15, 0.95, 0.08);

  // Senter.
  t(new THREE.CylinderGeometry(0.12, 0.15, 0.5, 10), 0x334155, 1.05, 0.5, 0.65, {
    rotasi: [Math.PI / 2, 0, 0],
  });
  t(new THREE.SphereGeometry(0.12, 10, 8), 0xfef08a, 1.05, 0.5, 0.92, { basic: true });
}

function temaBunyi(t: Taruh): void {
  // Gong besar.
  t(new THREE.TorusGeometry(0.58, 0.12, 10, 28), 0xd9a441, 0, 1.15, -0.1);
  t(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 28), 0xb45309, 0, 1.15, -0.14, {
    rotasi: [Math.PI / 2, 0, 0],
  });
  for (const px of [-0.75, 0.75]) {
    t(new THREE.BoxGeometry(0.1, 1.5, 0.1), 0x6b4423, px, 0.78, -0.1);
  }
  t(new THREE.BoxGeometry(1.7, 0.1, 0.1), 0x6b4423, 0, 1.55, -0.1);

  // Pemukul gong.
  t(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), 0x8b5a2b, 0.85, 0.85, 0.25, {
    rotasi: [0, 0, -0.5],
  });
  t(new THREE.SphereGeometry(0.13, 10, 8), 0xf5e6c8, 1.0, 1.12, 0.25);

  // Pengeras suara.
  t(new THREE.BoxGeometry(0.45, 0.6, 0.35), 0x334155, 1.15, 0.65, 0.55);
  t(new THREE.ConeGeometry(0.22, 0.3, 12), 0x64748b, 1.15, 0.65, 0.8, {
    rotasi: [Math.PI / 2, 0, 0],
  });

  // Gelombang bunyi.
  for (let i = 0; i < 3; i++) {
    t(new THREE.TorusGeometry(0.25 + i * 0.18, 0.03, 6, 22), 0xfacc15, -1.1, 1.15, 0.25, {
      basic: true,
    });
  }
}

function temaMagnet(t: Taruh): void {
  // Magnet ladam (horseshoe).
  t(new THREE.TorusGeometry(0.62, 0.17, 10, 24, Math.PI), 0xef4444, 0, 1.35, 0.1, {
    rotasi: [0, 0, 0],
  });
  t(new THREE.BoxGeometry(0.34, 0.85, 0.34), 0xef4444, -0.62, 0.95, 0.1);
  t(new THREE.BoxGeometry(0.34, 0.85, 0.34), 0x2563eb, 0.62, 0.95, 0.1);
  t(new THREE.BoxGeometry(0.36, 0.16, 0.36), 0xffffff, -0.62, 0.5, 0.1);
  t(new THREE.BoxGeometry(0.36, 0.16, 0.36), 0xffffff, 0.62, 0.5, 0.1);

  // Kompas.
  t(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20), 0xf8fafc, 1.15, 0.42, 0.55);
  t(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 20), 0xe2e8f0, 1.15, 0.5, 0.55);
  t(new THREE.ConeGeometry(0.1, 0.32, 6), 0xef4444, 1.15, 0.55, 0.42, {
    rotasi: [Math.PI / 2, 0, 0],
  });
  t(new THREE.ConeGeometry(0.1, 0.32, 6), 0xffffff, 1.15, 0.55, 0.68, {
    rotasi: [-Math.PI / 2, 0, 0],
  });

  // Batang magnet dan serbuk besi.
  t(new THREE.BoxGeometry(0.8, 0.16, 0.22), 0xef4444, -1.15, 0.55, 0.55);
  t(new THREE.BoxGeometry(0.8, 0.16, 0.22), 0x2563eb, -1.15, 0.55, 0.25);
  for (let i = 0; i < 10; i++) {
    const sudut = (i / 10) * Math.PI * 2;
    t(
      new THREE.SphereGeometry(0.035, 6, 5),
      0x475569,
      Math.cos(sudut) * 0.5,
      0.42,
      0.1 + Math.sin(sudut) * 0.5,
    );
  }
}

function temaListrik(t: Taruh): void {
  // Papan rangkaian.
  t(new THREE.BoxGeometry(1.9, 0.08, 1.3), 0x14532d, 0, 0.4, 0);

  // Baterai.
  t(new THREE.CylinderGeometry(0.15, 0.15, 0.55, 12), 0xd9a441, -0.55, 0.55, -0.2, {
    rotasi: [0, 0, Math.PI / 2],
  });
  t(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10), 0x111827, -0.28, 0.55, -0.2, {
    rotasi: [0, 0, Math.PI / 2],
  });

  // Lampu.
  t(new THREE.SphereGeometry(0.22, 12, 10), 0xfef08a, 0.35, 0.95, -0.2, { basic: true });
  t(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 10), 0x64748b, 0.35, 0.69, -0.2);

  // Kabel.
  t(new THREE.BoxGeometry(0.7, 0.05, 0.05), 0xf97316, -0.1, 0.55, -0.2);
  t(new THREE.BoxGeometry(0.05, 0.05, 0.7), 0xf97316, 0.7, 0.55, 0.15);
  t(new THREE.BoxGeometry(0.8, 0.05, 0.05), 0xf97316, 0.25, 0.55, 0.5);
  t(new THREE.BoxGeometry(0.05, 0.05, 0.7), 0xf97316, -0.8, 0.55, 0.15);

  // Saklar.
  t(new THREE.BoxGeometry(0.2, 0.12, 0.3), 0x475569, 0.9, 0.55, 0.45);
  t(new THREE.BoxGeometry(0.08, 0.22, 0.08), 0x94a3b8, 0.9, 0.68, 0.45, {
    rotasi: [0.4, 0, 0],
  });

  // Petir di atas lampu.
  t(new THREE.BoxGeometry(0.12, 0.36, 0.12), 0xfacc15, 0.35, 1.5, -0.2, {
    rotasi: [0, 0, 0.5],
    basic: true,
  });
  t(new THREE.BoxGeometry(0.12, 0.3, 0.12), 0xfacc15, 0.5, 1.28, -0.2, {
    rotasi: [0, 0, -0.5],
    basic: true,
  });
}

/* ================================================================== */
/* ZONA BUMI                                                           */
/* ================================================================== */

function temaLitosfer(t: Taruh): void {
  // Lapisan tanah (potongan litosfer).
  t(new THREE.BoxGeometry(1.3, 0.22, 1.0), 0x4ade80, -0.7, 0.45, 0.1);
  t(new THREE.BoxGeometry(1.3, 0.3, 1.0), 0x92400e, -0.7, 0.69, 0.1);
  t(new THREE.BoxGeometry(1.3, 0.28, 1.0), 0xb45309, -0.7, 0.98, 0.1);
  t(new THREE.BoxGeometry(1.3, 0.18, 1.0), 0x78716c, -0.7, 1.21, 0.1);

  // Gunung berapi.
  t(new THREE.ConeGeometry(0.6, 1.2, 12), 0x57534e, 0.95, 1.0, -0.2);
  t(new THREE.ConeGeometry(0.2, 0.3, 10), 0xf97316, 0.95, 1.62, -0.2);
  t(new THREE.SphereGeometry(0.09, 8, 6), 0xfacc15, 0.95, 1.78, -0.2, { basic: true });

  // Batu-batuan.
  t(new THREE.DodecahedronGeometry(0.24), 0x94a3b8, 0.35, 0.55, 0.7);
  t(new THREE.DodecahedronGeometry(0.17), 0x64748b, 0.62, 0.5, 0.85);

  // Puncak bersalju.
  t(new THREE.ConeGeometry(0.4, 0.8, 10), 0x94a3b8, -1.2, 1.15, -0.5);
  t(new THREE.ConeGeometry(0.22, 0.3, 10), 0xf8fafc, -1.2, 1.62, -0.5);
}

function temaHidrosfer(t: Taruh): void {
  // Bumi biru dengan daratan.
  t(new THREE.SphereGeometry(0.6, 16, 12), 0x38bdf8, -0.2, 1.05, 0);
  t(new THREE.SphereGeometry(0.22, 10, 8), 0x22c55e, -0.45, 1.18, 0.25, { skala: [1, 0.4, 1] });
  t(new THREE.SphereGeometry(0.18, 10, 8), 0x4ade80, 0.05, 0.85, 0.35, { skala: [1, 0.4, 1] });

  // Lapisan atmosfer.
  t(new THREE.TorusGeometry(0.78, 0.03, 6, 32), 0xbfdbfe, -0.2, 1.05, 0, {
    rotasi: [Math.PI / 2, 0, 0],
    opacity: 0.8,
    basic: true,
  });
  t(new THREE.TorusGeometry(0.9, 0.025, 6, 32), 0xe0f2fe, -0.2, 1.05, 0, {
    rotasi: [Math.PI / 2, 0, 0],
    opacity: 0.6,
    basic: true,
  });

  // Awan.
  t(new THREE.SphereGeometry(0.25, 10, 8), 0xf1f5f9, 0.9, 1.65, -0.2);
  t(new THREE.SphereGeometry(0.18, 10, 8), 0xf1f5f9, 1.12, 1.58, -0.2);
  t(new THREE.SphereGeometry(0.2, 10, 8), 0xf1f5f9, 0.72, 1.55, -0.2);

  // Hujan dan kolam.
  for (let i = 0; i < 4; i++) {
    t(new THREE.ConeGeometry(0.045, 0.16, 6), 0x38bdf8, 0.78 + i * 0.12, 1.22, -0.2, {
      rotasi: [Math.PI, 0, 0],
      basic: true,
    });
  }
  t(new THREE.CylinderGeometry(0.5, 0.55, 0.08, 20), 0x0ea5e9, 0.75, 0.35, 0.55);
}

function temaSiklusAir(t: Taruh): void {
  // Matahari.
  t(new THREE.SphereGeometry(0.34, 12, 10), 0xfbbf24, 1.15, 1.85, -0.7, { basic: true });

  // Awan.
  t(new THREE.SphereGeometry(0.3, 10, 8), 0xf1f5f9, -0.85, 1.7, -0.3);
  t(new THREE.SphereGeometry(0.22, 10, 8), 0xf1f5f9, -0.55, 1.6, -0.3);
  t(new THREE.SphereGeometry(0.24, 10, 8), 0xf1f5f9, -1.1, 1.58, -0.3);

  // Hujan.
  for (let i = 0; i < 5; i++) {
    t(new THREE.ConeGeometry(0.05, 0.2, 6), 0x38bdf8, -1.1 + i * 0.16, 1.24, -0.3, {
      rotasi: [Math.PI, 0, 0],
      basic: true,
    });
  }

  // Sungai dan laut.
  t(new THREE.BoxGeometry(2.3, 0.08, 0.5), 0x0ea5e9, 0, 0.35, 0.75);
  t(new THREE.BoxGeometry(0.8, 0.08, 0.5), 0x38bdf8, 0.85, 0.35, 0.75);
  t(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 18), 0x0284c7, -0.9, 0.34, 0.7);

  // Gunung sebagai sumber air.
  t(new THREE.ConeGeometry(0.5, 0.9, 10), 0x57534e, -1.15, 0.8, -0.1);
  t(new THREE.ConeGeometry(0.22, 0.28, 10), 0xf8fafc, -1.15, 1.22, -0.1);

  // Panah siklus.
  const panah: Array<[number, number, number]> = [
    [0.25, 1.45, 0.15],
    [0.85, 1.0, 0.15],
    [0.25, 0.55, 0.15],
    [-0.75, 0.95, 0.15],
  ];
  for (const [px, py, pz] of panah) {
    t(new THREE.ConeGeometry(0.1, 0.24, 6), 0xf59e0b, px, py, pz, {
      rotasi: [0, 0, -Math.PI / 2],
      basic: true,
    });
  }
}

function temaMenaraKitab(t: Taruh): void {
  // Tumpukan kitab.
  const warnaKitab = [0x2f9e6b, 0x2563eb, 0xd97706];
  for (let i = 0; i < 3; i++) {
    t(new THREE.BoxGeometry(1.1, 0.16, 0.8), warnaKitab[i]!, 0, 0.45 + i * 0.18, 0, {
      rotasi: [0, i * 0.18, 0],
    });
  }
  t(new THREE.BoxGeometry(1.0, 0.05, 0.7), 0xfff7e6, 0, 0.95, 0);
  t(new THREE.SphereGeometry(0.16, 10, 8), 0xfbbf24, 0, 1.2, 0, { basic: true });
}
