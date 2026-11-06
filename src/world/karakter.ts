import * as THREE from 'three';
import type { PlayerGender } from '../../shared/types';

/**
 * Pabrik karakter low-poly bergaya kartun (prosedural, tanpa model unduhan).
 *
 * Tujuan: mengganti bentuk "kapsul + bola" menjadi sosok yang lebih hidup —
 * proporsi badan lebih baik, ada leher, lengan bersendi, sepatu, rambut
 * bervariasi, dan mata sederhana. Semua bagian dikembalikan sebagai `Group`
 * sehingga bisa dipakai pemain maupun NPC penjaga.
 *
 * Bagian yang bisa dianimasikan (kaki & lengan) diekspor lewat `KarakterRig`
 * supaya pemanggil bisa mengayunkannya sendiri (jalan/idle).
 */

export interface KarakterOpsi {
  /** Jenis kelamin menentukan bentuk pakaian (celana panjang / hijab-gamis). */
  gender?: PlayerGender;
  /** Warna pakaian (mengalahkan warna bawaan gender bila diisi). */
  warnaPakaian?: number;
  /** Warna kulit. */
  warnaKulit?: number;
  /** Warna rambut (khusus laki-laki). */
  warnaRambut?: number;
  /** Warna kain penutup kepala bagi karakter perempuan (hijab). */
  warnaHijab?: number;
  /** Skala keseluruhan (Pasar Ramai memakai penjaga lebih besar). */
  skala?: number;
  /** Penanda panah di atas kepala (khusus pemain). */
  pakaiMarker?: boolean;
}

export interface KarakterRig {
  group: THREE.Group;
  /** Pivot yang bisa diayun (kaki & lengan). */
  kakiKiri: THREE.Object3D;
  kakiKanan: THREE.Object3D;
  lenganKiri: THREE.Object3D;
  lenganKanan: THREE.Object3D;
  /** Pivot seluruh badan (untuk napas/mengangguk saat diam). */
  badan: THREE.Object3D;
  /** Mengayunkan kaki & lengan berdasarkan kecepatan (0..) dan waktu. */
  langkah: (kecepatan: number, waktu: number) => void;
  /**
   * Animasi diam: napas halus + sedikit goyang. Dipakai NPC agar tidak kaku.
   * `fase` membuat tiap NPC bergerak dengan irama berbeda.
   */
  idle: (waktu: number, fase?: number) => void;
  /** Koleksi material untuk dibuang saat dispose. */
  material: THREE.Material[];
  /** Koleksi geometri untuk dibuang saat dispose. */
  geometri: THREE.BufferGeometry[];
}

/**
 * Menebak jenis kelamin penjaga dari namanya (awalan "Bu"/"Ibu" → perempuan).
 * Dipakai agar NPC di kios selaras dengan namanya (Bu berhijab, Pak berkemeja).
 */
export function genderPenjaga(nama: string): PlayerGender {
  const bersih = nama.trim().toLowerCase();
  if (bersih.startsWith('bu') || bersih.startsWith('ibu') || bersih.startsWith('nyai')) {
    return 'perempuan';
  }
  return 'laki-laki';
}

/**
 * Palet bawaan per gender.
 * - `laki-laki`: kemeja + celana panjang, rambut pendek.
 * - `perempuan`: gamis/rok panjang longgar + hijab (menutup kepala, leher, dada).
 */
const PALET: Record<PlayerGender, { pakaian: number; bawahan: number; rambut: number; hijab: number; sepatu: number }> = {
  'laki-laki': { pakaian: 0x2f9e6b, bawahan: 0x2c3e6b, rambut: 0x241b12, hijab: 0xffffff, sepatu: 0x2a2a2a },
  perempuan: { pakaian: 0xf26fa3, bawahan: 0x7c3aed, rambut: 0x3a2416, hijab: 0xf4a3c8, sepatu: 0x4a2f2f },
};

/**
 * Membangun karakter lengkap. Tinggi total sekitar 2.6 satuan (setara manusia
 * dewasa kecil), dengan kaki sebagai titik origin (y = 0).
 */
export function buatKarakter(opsi: KarakterOpsi = {}): KarakterRig {
  const gender = opsi.gender ?? 'laki-laki';
  const palet = PALET[gender];
  const warnaKulit = opsi.warnaKulit ?? 0xf1c27d;

  const geometri: THREE.BufferGeometry[] = [];
  const material: THREE.Material[] = [];
  const geo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometri.push(g);
    return g;
  };
  const mat = <T extends THREE.Material>(m: T): T => {
    material.push(m);
    return m;
  };

  const mKulit = mat(new THREE.MeshLambertMaterial({ color: warnaKulit }));
  const mPakaian = mat(new THREE.MeshLambertMaterial({ color: opsi.warnaPakaian ?? palet.pakaian }));
  const mBawahan = mat(new THREE.MeshLambertMaterial({ color: palet.bawahan }));
  const mRambut = mat(new THREE.MeshLambertMaterial({ color: opsi.warnaRambut ?? palet.rambut }));
  const mHijab = mat(new THREE.MeshLambertMaterial({ color: opsi.warnaHijab ?? palet.hijab }));
  const mSepatu = mat(new THREE.MeshLambertMaterial({ color: palet.sepatu }));
  const mMata = mat(new THREE.MeshBasicMaterial({ color: 0x241b12 }));

  const group = new THREE.Group();
  const perempuan = gender === 'perempuan';

  // Semua bagian tubuh masuk ke `badan` agar bisa "bernapas" (idle) sekaligus.
  const badan = new THREE.Group();
  group.add(badan);

  /* ---------------- Badan ---------------- */

  if (perempuan) {
    // Gamis/rok panjang: satu silinder lebar yang mengerucut dari pundak
    // sampai mata kaki, menutup pinggul (aurat terjaga).
    const gamisGeo = geo(new THREE.CylinderGeometry(0.34, 0.52, 1.5, 12));
    const gamis = new THREE.Mesh(gamisGeo, mPakaian);
    gamis.position.y = 0.95;
    badan.add(gamis);

    // Pundak — bola pipih agar sambungan lengan halus.
    const pundakGeo = geo(new THREE.SphereGeometry(0.33, 12, 8));
    const pundak = new THREE.Mesh(pundakGeo, mPakaian);
    pundak.scale.set(1, 0.55, 1);
    pundak.position.y = 1.72;
    badan.add(pundak);
  } else {
    // Pinggul (celana) — kubus rendah, lalu dada kemeja di atasnya.
    const pinggulGeo = geo(new THREE.CylinderGeometry(0.3, 0.34, 0.5, 10));
    const pinggul = new THREE.Mesh(pinggulGeo, mBawahan);
    pinggul.position.y = 0.86;
    badan.add(pinggul);

    const dadaGeo = geo(new THREE.CylinderGeometry(0.34, 0.3, 0.75, 10));
    const dada = new THREE.Mesh(dadaGeo, mPakaian);
    dada.position.y = 1.45;
    badan.add(dada);

    const pundakGeo = geo(new THREE.SphereGeometry(0.33, 12, 8));
    const pundak = new THREE.Mesh(pundakGeo, mPakaian);
    pundak.scale.set(1, 0.55, 1);
    pundak.position.y = 1.82;
    badan.add(pundak);
  }

  // Leher.
  const leherGeo = geo(new THREE.CylinderGeometry(0.12, 0.13, 0.16, 10));
  const leher = new THREE.Mesh(leherGeo, mKulit);
  leher.position.y = 1.94;
  badan.add(leher);

  /* ---------------- Kepala ---------------- */

  const kepalaGeo = geo(new THREE.SphereGeometry(0.3, 18, 14));
  const kepala = new THREE.Mesh(kepalaGeo, mKulit);
  kepala.scale.set(1, 1.08, 0.95);
  kepala.position.y = 2.24;
  badan.add(kepala);

  // Mata (dua bola kecil di muka, arah +Z).
  const mataGeo = geo(new THREE.SphereGeometry(0.04, 8, 8));
  for (const x of [-0.1, 0.1]) {
    const mata = new THREE.Mesh(mataGeo, mMata);
    mata.position.set(x, 2.26, 0.275);
    badan.add(mata);
  }

  if (perempuan) {
    // HIJAB: kerudung yang membungkus kepala, leher, dan jatuh menutupi dada.
    // Bentuk: bola tertutup yang lebih besar dari kepala, dibuka di bagian
    // muka (bidang ±0.72π) supaya wajah tetap tampak.
    const hijabGeo = geo(
      new THREE.SphereGeometry(0.37, 20, 16, Math.PI / 2 + 0.15, Math.PI * 2 - 0.3, 0, Math.PI * 0.72),
    );
    const hijab = new THREE.Mesh(hijabGeo, mHijab);
    hijab.scale.set(1, 1.12, 1.06);
    hijab.position.y = 2.24;
    badan.add(hijab);

    // Bagian hijab yang menutupi dada/bahu.
    const selendangGeo = geo(new THREE.CylinderGeometry(0.4, 0.52, 0.5, 14));
    const selendang = new THREE.Mesh(selendangGeo, mHijab);
    selendang.position.y = 1.72;
    badan.add(selendang);

    // Ikat pinggir depan hijab (lingkaran pipih) agar bentuk muka tegas.
    const bingkaiGeo = geo(new THREE.TorusGeometry(0.31, 0.05, 8, 18));
    const bingkai = new THREE.Mesh(bingkaiGeo, mHijab);
    bingkai.position.set(0, 2.24, 0.06);
    bingkai.scale.set(1, 1.15, 1);
    badan.add(bingkai);
  } else {
    // Rambut pendek pria + jambul kecil di atas.
    const rambutGeo = geo(new THREE.SphereGeometry(0.315, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7));
    const rambut = new THREE.Mesh(rambutGeo, mRambut);
    rambut.scale.set(1, 1.05, 1);
    rambut.position.y = 2.27;
    badan.add(rambut);

    const jambulGeo = geo(new THREE.ConeGeometry(0.14, 0.22, 8));
    const jambul = new THREE.Mesh(jambulGeo, mRambut);
    jambul.position.set(0, 2.46, 0.02);
    jambul.rotation.z = 0.4;
    badan.add(jambul);
  }

  /* ---------------- Lengan (bersendi di pundak) ---------------- */

  const lenganAtasGeo = geo(new THREE.CapsuleGeometry(0.095, 0.42, 4, 8));
  const tanganGeo = geo(new THREE.SphereGeometry(0.1, 10, 8));

  const buatLengan = (sisi: -1 | 1): THREE.Object3D => {
    const pivot = new THREE.Group();
    pivot.position.set(sisi * 0.36, 1.78, 0);

    const atas = new THREE.Mesh(lenganAtasGeo, mPakaian);
    atas.position.y = -0.26;
    pivot.add(atas);

    const tangan = new THREE.Mesh(tanganGeo, mKulit);
    tangan.position.y = -0.56;
    pivot.add(tangan);

    badan.add(pivot);
    return pivot;
  };

  const lenganKiri = buatLengan(1);
  const lenganKanan = buatLengan(-1);

  /* ---------------- Kaki (bersendi di pinggul) ---------------- */

  const kakiGeo = geo(new THREE.CapsuleGeometry(0.12, 0.55, 4, 8));
  const sepatuGeo = geo(new THREE.BoxGeometry(0.24, 0.14, 0.36));

  const buatKaki = (sisi: -1 | 1): THREE.Object3D => {
    const pivot = new THREE.Group();
    pivot.position.set(sisi * 0.16, 0.62, 0);

    if (!perempuan) {
      // Celana panjang: kaki tampak dari pinggul sampai mata kaki.
      const kaki = new THREE.Mesh(kakiGeo, mBawahan);
      kaki.position.y = -0.36;
      pivot.add(kaki);
    } else {
      // Gamis sudah menutup kaki; yang tampak hanya pergelangan + sepatu.
      const pergelangan = new THREE.Mesh(kakiGeo, mKulit);
      pergelangan.scale.set(1, 0.4, 1);
      pergelangan.position.y = -0.52;
      pivot.add(pergelangan);
    }

    const sepatu = new THREE.Mesh(sepatuGeo, mSepatu);
    sepatu.position.set(0, -0.7, 0.06);
    pivot.add(sepatu);

    badan.add(pivot);
    return pivot;
  };

  const kakiKiri = buatKaki(1);
  const kakiKanan = buatKaki(-1);

  /* ---------------- Penanda pemain (opsional) ---------------- */

  if (opsi.pakaiMarker) {
    const markerGeo = geo(new THREE.ConeGeometry(0.18, 0.34, 8));
    const markerMat = mat(new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.y = 2.95;
    marker.rotation.x = Math.PI;
    group.add(marker);
  }

  if (opsi.skala && opsi.skala !== 1) {
    group.scale.setScalar(opsi.skala);
  }

  const langkah = (kecepatan: number, waktu: number): void => {
    const ayun = Math.sin(waktu * 10) * Math.min(kecepatan, 4) * 0.55;
    kakiKiri.rotation.x = ayun;
    kakiKanan.rotation.x = -ayun;
    lenganKiri.rotation.x = -ayun * 0.7;
    lenganKanan.rotation.x = ayun * 0.7;
  };

  const idle = (waktu: number, fase = 0): void => {
    // Napas: badan naik-turun sangat halus. Tangan menghirup udara sedikit.
    const napas = Math.sin(waktu * 1.6 + fase);
    badan.position.y = napas * 0.02;
    badan.rotation.z = Math.sin(waktu * 0.9 + fase) * 0.015;
    lenganKiri.rotation.z = 0.06 + napas * 0.03;
    lenganKanan.rotation.z = -0.06 - napas * 0.03;
  };

  return { group, kakiKiri, kakiKanan, lenganKiri, lenganKanan, badan, langkah, idle, material, geometri };
}
