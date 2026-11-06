import * as THREE from 'three';

/**
 * Kios peta low-poly prosedural (tanpa model unduhan).
 *
 * Bentuknya dibuat lebih hidup daripada sekadar kotak + kerucut:
 *   - lantai batu bata,
 *   - counter kayu dengan papan depan bergaris,
 *   - tiang sudut dengan balok atas (bale-bale),
 *   - atap limasan berundak + lis,
 *   - teralis/rak serta lampu gantung kuningan,
 *   - bendera kecil warna elemen di puncak atap.
 *
 * Semua geometri & material dikembalikan lewat callback `track` agar pemanggil
 * bisa membuangnya saat dispose.
 */

export interface KiosOpsi {
  /** Warna elemen (atap, lis, bendera). */
  warna: number;
  /** Kios Menara Kitab: lebih besar, ada gapura & lampu lebih banyak. */
  meriah?: boolean;
  /** Skala seragam tambahan. */
  skala?: number;
  /** Tanpa palang/counter depan (dipakai balai di dalam noktah). */
  tanpaPalang?: boolean;
}

export interface KiosBundle {
  group: THREE.Group;
  /** Titik tempat NPC berdiri (di belakang counter). */
  titikNpc: THREE.Vector3;
  /** Setengah kedalaman kios (untuk memasang papan nama di dinding depan). */
  dalam: number;
  /** Y puncak atap, untuk memasang papan nama/lencana. */
  tinggiAtap: number;
}

type Track = <T extends { dispose: () => void }>(obj: T) => T;

export function buatKios(opsi: KiosOpsi, track: Track): KiosBundle {
  const g = new THREE.Group();
  const emas = 0xd9a441;
  const kayuGelap = 0x6b4423;
  const kayu = 0x8b5a2b;
  const kayuMuda = 0xc7a06a;
  const batu = 0xcdae82;
  const skala = opsi.skala ?? 1;

  // Ukuran dasar kios (meriah = 1.5x).
  const L = opsi.meriah ? 6.0 : 4.6; // lebar
  const D = opsi.meriah ? 4.8 : 3.8; // dalam
  const tiangTinggi = opsi.meriah ? 3.2 : 2.7;

  const mBatu = track(new THREE.MeshLambertMaterial({ color: batu }));
  const mKayu = track(new THREE.MeshLambertMaterial({ color: kayu }));
  const mKayuGelap = track(new THREE.MeshLambertMaterial({ color: kayuGelap }));
  const mKayuMuda = track(new THREE.MeshLambertMaterial({ color: kayuMuda }));
  const mWarna = track(new THREE.MeshLambertMaterial({ color: opsi.warna }));
  const mEmas = track(new THREE.MeshLambertMaterial({ color: emas }));
  const mTerang = track(new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));

  // --- Lantai batu bata ---
  const lantaiGeo = track(new THREE.BoxGeometry(L + 0.6, 0.16, D + 0.6));
  const lantai = new THREE.Mesh(lantaiGeo, mBatu);
  lantai.position.y = 0.08;
  g.add(lantai);

  // --- Counter depan + papan bergaris ---
  if (!opsi.tanpaPalang) {
    const counterGeo = track(new THREE.BoxGeometry(L, 0.95, 0.7));
    const counter = new THREE.Mesh(counterGeo, mKayu);
    counter.position.set(0, 0.62, D / 2 - 0.3);
    g.add(counter);

    const papanGeo = track(new THREE.BoxGeometry(L - 0.2, 0.5, 0.06));
    const papan = new THREE.Mesh(papanGeo, mKayuMuda);
    papan.position.set(0, 0.55, D / 2 + 0.07);
    g.add(papan);
  }

  // --- Tiang sudut ---
  const tiangGeo = track(new THREE.BoxGeometry(0.2, tiangTinggi, 0.2));
  const tx = L / 2 - 0.2;
  const tz = D / 2 - 0.2;
  const titikTiang: Array<[number, number]> = [
    [-tx, -tz],
    [tx, -tz],
    [-tx, tz],
    [tx, tz],
  ];
  for (const [px, pz] of titikTiang) {
    const tiang = new THREE.Mesh(tiangGeo, mKayuGelap);
    tiang.position.set(px, tiangTinggi / 2 + 0.16, pz);
    g.add(tiang);
  }

  // --- Balok atas (bale-bale) ---
  const balokX = track(new THREE.BoxGeometry(L + 0.4, 0.18, 0.18));
  const balokZ = track(new THREE.BoxGeometry(0.18, 0.18, D + 0.4));
  for (const z of [-tz, tz]) {
    const b = new THREE.Mesh(balokX, mKayuGelap);
    b.position.set(0, tiangTinggi + 0.2, z);
    g.add(b);
  }
  for (const x of [-tx, tx]) {
    const b = new THREE.Mesh(balokZ, mKayuGelap);
    b.position.set(x, tiangTinggi + 0.2, 0);
    g.add(b);
  }

  // --- Atap limasan berundak ---
  const yAtap = tiangTinggi + 0.4;
  const atapBawahGeo = track(new THREE.ConeGeometry(L * 0.82, 1.1, 4));
  const atapBawah = new THREE.Mesh(atapBawahGeo, mWarna);
  atapBawah.position.y = yAtap + 0.55;
  atapBawah.rotation.y = Math.PI / 4;
  g.add(atapBawah);

  const atapAtasGeo = track(new THREE.ConeGeometry(L * 0.5, 0.8, 4));
  const atapAtas = new THREE.Mesh(atapAtasGeo, mKayuGelap);
  atapAtas.position.y = yAtap + 1.4;
  atapAtas.rotation.y = Math.PI / 4;
  g.add(atapAtas);

  // Lis atap (garis emas).
  const lisGeo = track(new THREE.TorusGeometry(L * 0.6, 0.04, 6, 4));
  const lis = new THREE.Mesh(lisGeo, mEmas);
  lis.rotation.x = Math.PI / 2;
  lis.rotation.z = Math.PI / 4;
  lis.position.y = yAtap + 0.1;
  g.add(lis);

  // Bendera kecil di puncak.
  const benderaGeo = track(new THREE.PlaneGeometry(0.5, 0.3));
  const bendera = new THREE.Mesh(benderaGeo, mWarna);
  bendera.position.set(0.25, yAtap + 2.0, 0);
  g.add(bendera);
  const tiangBenderaGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6));
  const tiangBendera = new THREE.Mesh(tiangBenderaGeo, mKayuGelap);
  tiangBendera.position.y = yAtap + 1.95;
  g.add(tiangBendera);

  // --- Teralis/rak di sisi (hanya kios besar) ---
  if (opsi.meriah) {
    const rakGeo = track(new THREE.BoxGeometry(0.5, 1.4, D - 0.4));
    for (const x of [-tx - 0.05, tx + 0.05]) {
      const rak = new THREE.Mesh(rakGeo, mKayu);
      rak.position.set(x, 0.8, 0);
      g.add(rak);
      // Barang dagangan (bola warna).
      const barangGeo = track(new THREE.SphereGeometry(0.16, 8, 6));
      for (let i = 0; i < 3; i++) {
        const barang = new THREE.Mesh(barangGeo, i % 2 === 0 ? mWarna : mEmas);
        barang.position.set(x, 1.05, -0.8 + i * 0.8);
        g.add(barang);
      }
    }
  }

  // --- Lampu gantung kuningan ---
  const jumlahLampu = opsi.meriah ? 3 : 1;
  const kabelGeo = track(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4));
  const bolaLampuGeo = track(new THREE.SphereGeometry(0.12, 10, 8));
  for (let i = 0; i < jumlahLampu; i++) {
    const x = jumlahLampu === 1 ? 0 : (i - 1) * (L / 3);
    const kabel = new THREE.Mesh(kabelGeo, mKayuGelap);
    kabel.position.set(x, yAtap - 0.2, 0);
    g.add(kabel);
    const bola = new THREE.Mesh(bolaLampuGeo, mTerang);
    bola.position.set(x, yAtap - 0.55, 0);
    g.add(bola);
  }

  // --- Gerobak kecil di depan (sebagai vignette) ---
  if (opsi.meriah) {
    const gerobakGeo = track(new THREE.BoxGeometry(1.2, 0.5, 0.8));
    const gerobak = new THREE.Mesh(gerobakGeo, mKayuMuda);
    gerobak.position.set(-L / 2 - 1.1, 0.45, D / 2 - 0.6);
    g.add(gerobak);
    const rodaGeo = track(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12));
    const roda = new THREE.Mesh(rodaGeo, mKayuGelap);
    roda.rotation.z = Math.PI / 2;
    roda.position.set(-L / 2 - 1.1, 0.28, D / 2 - 0.2);
    g.add(roda);
  }

  g.scale.setScalar(skala);

  return {
    group: g,
    titikNpc: new THREE.Vector3(0, 0, D / 2 - 1.4).multiplyScalar(skala),
    dalam: D / 2,
    tinggiAtap: (yAtap + 1.9) * skala,
  };
}
