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
  /** Warna pakaian atas/kemeja (mengalahkan warna bawaan gender bila diisi). */
  warnaPakaian?: number;
  /** Warna bawahan: celana panjang (pria) atau gamis (perempuan). */
  warnaBawahan?: number;
  /** Warna kulit. */
  warnaKulit?: number;
  /** Warna rambut (khusus laki-laki). */
  warnaRambut?: number;
  /** Warna kain penutup kepala bagi karakter perempuan (hijab). */
  warnaHijab?: number;
  /** Skala keseluruhan (Menara Kitab memakai penjaga lebih besar). */
  skala?: number;
  /** Penanda panah di atas kepala (khusus pemain). */
  pakaiMarker?: boolean;
  /** Busana Nusantara untuk NPC penjaga/cantrik. */
  busana?: BusanaNusantara;
}

/** Atribut busana Nusantara (penutup kepala, jenggot, selendang, kain jarik). */
export interface BusanaNusantara {
  /** Penutup kepala pria: blangkon, caping petani, atau udeng (ikat kepala). */
  kepala?: 'blangkon' | 'caping' | 'udeng';
  /** Warna penutup kepala pria (blangkon/udeng). */
  warnaKepala?: number;
  /** Jenggot/kumis putih untuk tokoh sepuh. */
  jenggot?: boolean;
  /** Selendang menyilang di badan (warna). */
  selendang?: number;
  /** Kain jarik bermotif di bawahan (warna motif). */
  jarik?: number;
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
  const perempuan = ['ibu', 'bu ', 'nyai', 'dewi', 'nenek', 'ratu', 'sri ', 'sutra', 'energi', 'hijau', 'air', 'siklus', 'semesta'];
  const pria = ['pak ', 'bapak', 'raja', 'spring', 'kutub', 'magnet', 'gaung', 'bumi', 'batuan', 'prisma', 'rumput'];
  if (perempuan.some((p) => bersih.startsWith(p) || bersih.includes(` ${p}`))) {
    // "Profesor Membumi" dsb. tetap laki-laki bila ada kata bernuansa pria.
    if (pria.some((p) => bersih.includes(p))) return 'laki-laki';
    return 'perempuan';
  }
  if (pria.some((p) => bersih.startsWith(p) || bersih.includes(` ${p}`))) return 'laki-laki';
  // Nama netral ("Kakak X") diberi variasi agar tidak semua NPC seragam.
  let h = 0;
  for (let i = 0; i < bersih.length; i++) h = (h * 31 + bersih.charCodeAt(i)) % 997;
  return h % 2 === 0 ? 'perempuan' : 'laki-laki';
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

/** Satu pilihan warna pada layar kustomisasi. */
export interface PilihanWarna {
  /** Nama yang ditampilkan ke anak. */
  nama: string;
  /** Nilai warna hex. */
  nilai: number;
}

export type BagianWarna = 'baju' | 'bawahan' | 'hijab';

/**
 * Tiga pilihan warna untuk tiap bagian pakaian.
 * Warna dipilih agar kontras dan tetap cerah di tema "Sore Hangat".
 */
export const PALET_PILIHAN: Record<PlayerGender, Record<BagianWarna, PilihanWarna[]>> = {
  'laki-laki': {
    baju: [
      { nama: 'Hijau Rimba', nilai: 0x2f9e6b },
      { nama: 'Biru Langit', nilai: 0x2563eb },
      { nama: 'Oranye Madu', nilai: 0xf08c3a },
    ],
    bawahan: [
      { nama: 'Biru Tua', nilai: 0x2c3e6b },
      { nama: 'Cokelat Kayu', nilai: 0x6b4f3a },
      { nama: 'Abu Arang', nilai: 0x4b5563 },
    ],
    hijab: [
      { nama: 'Putih Bersih', nilai: 0xffffff },
      { nama: 'Hijau Daun', nilai: 0x2f9e6b },
      { nama: 'Biru Langit', nilai: 0x2563eb },
    ],
  },
  perempuan: {
    baju: [
      { nama: 'Merah Jambu', nilai: 0xf26fa3 },
      { nama: 'Ungu Lembut', nilai: 0x9b6bd6 },
      { nama: 'Hijau Mint', nilai: 0x3fbfa0 },
    ],
    bawahan: [
      { nama: 'Ungu Tua', nilai: 0x7c3aed },
      { nama: 'Biru Tua', nilai: 0x2c3e6b },
      { nama: 'Cokelat Kayu', nilai: 0x6b4f3a },
    ],
    hijab: [
      { nama: 'Merah Jambu', nilai: 0xf4a3c8 },
      { nama: 'Putih Bersih', nilai: 0xffffff },
      { nama: 'Ungu Lembut', nilai: 0x9b6bd6 },
    ],
  },
};

/** Warna bawaan per bagian untuk sebuah gender. */
export function warnaBawaan(gender: PlayerGender, bagian: BagianWarna): number {
  const p = PALET_PILIHAN[gender][bagian];
  return p[0]?.nilai ?? 0xffffff;
}

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

  const mKulit = mat(new THREE.MeshStandardMaterial({ color: warnaKulit, roughness: 0.72, metalness: 0 }));
  const mPakaian = mat(
    new THREE.MeshStandardMaterial({
      color: opsi.warnaPakaian ?? palet.pakaian,
      roughness: 0.78,
      metalness: 0,
    }),
  );
  const mBawahan = mat(
    new THREE.MeshStandardMaterial({
      color: opsi.warnaBawahan ?? palet.bawahan,
      roughness: 0.82,
      metalness: 0,
    }),
  );
  const mRambut = mat(
    new THREE.MeshStandardMaterial({ color: opsi.warnaRambut ?? palet.rambut, roughness: 0.55, metalness: 0 }),
  );
  const mHijab = mat(
    new THREE.MeshStandardMaterial({
      color: opsi.warnaHijab ?? palet.hijab,
      roughness: 0.62,
      metalness: 0,
    }),
  );
  const mSepatu = mat(new THREE.MeshStandardMaterial({ color: palet.sepatu, roughness: 0.5, metalness: 0.05 }));
  const mMata = mat(new THREE.MeshBasicMaterial({ color: 0x241b12 }));

  const segBulat = 18; // segmen keliling untuk bagian badan (halus)
  const segLingkar = 14; // segmen vertikal

  const group = new THREE.Group();
  const perempuan = gender === 'perempuan';

  // Semua bagian tubuh masuk ke `badan` agar bisa "bernapas" (idle) sekaligus.
  const badan = new THREE.Group();
  group.add(badan);

  /* ---------------- Badan ---------------- */

  if (perempuan) {
    // Gamis panjang: badan atas + rok yang mengembang ke bawah.
    // Warna gamis memakai `mBawahan` agar bisa dipadukan terpisah dari atasan.
    const rokGeo = geo(new THREE.CylinderGeometry(0.36, 0.56, 1.05, segBulat, 1, true));
    const rok = new THREE.Mesh(rokGeo, mBawahan);
    rok.position.y = 0.62;
    badan.add(rok);

    // Tutup bawah rok (supaya tidak tembus pandang dari sudut rendah).
    const rokTutupGeo = geo(new THREE.RingGeometry(0.01, 0.56, segBulat));
    const rokTutup = new THREE.Mesh(rokTutupGeo, mBawahan);
    rokTutup.rotation.x = -Math.PI / 2;
    rokTutup.position.y = 0.1;
    badan.add(rokTutup);

    // Atasan gamis (dari pinggang ke pundak).
    const atasanGeo = geo(new THREE.CylinderGeometry(0.34, 0.37, 0.72, segBulat));
    const atasan = new THREE.Mesh(atasanGeo, mPakaian);
    atasan.position.y = 1.42;
    badan.add(atasan);

    // Pundak — bola pipih agar sambungan lengan halus.
    const pundakGeo = geo(new THREE.SphereGeometry(0.33, segBulat, segLingkar));
    const pundak = new THREE.Mesh(pundakGeo, mPakaian);
    pundak.scale.set(1, 0.55, 1);
    pundak.position.y = 1.78;
    badan.add(pundak);
  } else {
    // Pinggul (celana) — silinder membulat, lalu dada kemeja di atasnya.
    const pinggulGeo = geo(new THREE.CylinderGeometry(0.3, 0.34, 0.52, segBulat));
    const pinggul = new THREE.Mesh(pinggulGeo, mBawahan);
    pinggul.position.y = 0.86;
    badan.add(pinggul);

    const dadaGeo = geo(new THREE.CylinderGeometry(0.34, 0.3, 0.76, segBulat));
    const dada = new THREE.Mesh(dadaGeo, mPakaian);
    dada.position.y = 1.45;
    badan.add(dada);

    const pundakGeo = geo(new THREE.SphereGeometry(0.33, segBulat, segLingkar));
    const pundak = new THREE.Mesh(pundakGeo, mPakaian);
    pundak.scale.set(1, 0.55, 1);
    pundak.position.y = 1.82;
    badan.add(pundak);
  }

  // Leher.
  const leherGeo = geo(new THREE.CylinderGeometry(0.12, 0.13, 0.16, segBulat));
  const leher = new THREE.Mesh(leherGeo, mKulit);
  leher.position.y = 1.94;
  badan.add(leher);

  /* ---------------- Kepala ---------------- */

  const kepalaGeo = geo(new THREE.SphereGeometry(0.3, 24, 20));
  const kepala = new THREE.Mesh(kepalaGeo, mKulit);
  kepala.scale.set(1, 1.08, 0.95);
  kepala.position.y = 2.24;
  badan.add(kepala);

  // Mata (dua bola kecil di muka, arah +Z).
  const mataGeo = geo(new THREE.SphereGeometry(0.042, 12, 10));
  const mMataPutih = mat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }));
  for (const x of [-0.1, 0.1]) {
    const putih = new THREE.Mesh(mataGeo, mMataPutih);
    putih.position.set(x, 2.26, 0.268);
    putih.scale.set(1, 1.15, 0.7);
    badan.add(putih);

    const pupil = new THREE.Mesh(mataGeo, mMata);
    pupil.position.set(x, 2.26, 0.29);
    pupil.scale.set(0.62, 0.72, 0.6);
    badan.add(pupil);
  }

  if (perempuan) {
    // HIJAB: kerudung yang membungkus kepala, leher, dan jatuh menutupi dada.
    // Bentuk: bola hampir penuh (sedikit lebih besar dari kepala) dengan
    // bukaan muka berbentuk bundar. Bukaan dibuat lebih kecil dari sebelumnya
    // agar tidak ada celah yang memperlihatkan bagian dalam kepala.
    // Bukaan muka ±0.62 rad di arah +Z: cukup lebar agar kedua mata (x = ±0.1)
    // tidak tertutup kain saat dilihat dari depan.
    const BUKA = 0.62;
    const hijabGeo = geo(
      new THREE.SphereGeometry(0.39, 28, 22, Math.PI / 2 + BUKA, Math.PI * 2 - BUKA * 2, 0, Math.PI * 0.66),
    );
    const hijab = new THREE.Mesh(hijabGeo, mHijab);
    hijab.scale.set(1, 1.12, 1.06);
    hijab.position.y = 2.24;
    badan.add(hijab);

    // Bagian hijab yang menutupi dada/bahu.
    const selendangGeo = geo(new THREE.CylinderGeometry(0.4, 0.52, 0.5, segBulat));
    const selendang = new THREE.Mesh(selendangGeo, mHijab);
    selendang.position.y = 1.72;
    badan.add(selendang);

    // Ikat pinggir depan hijab (lingkaran pipih) agar bentuk muka tegas.
    const bingkaiGeo = geo(new THREE.TorusGeometry(0.31, 0.05, 10, 26));
    const bingkai = new THREE.Mesh(bingkaiGeo, mHijab);
    bingkai.position.set(0, 2.24, 0.06);
    bingkai.scale.set(1, 1.15, 1);
    badan.add(bingkai);
  } else {
    // Rambut pendek pria + jambul kecil di atas.
    // Rambut dua bagian: tudung atas penuh (berhenti di atas alis), lalu bagian
    // belakang/samping yang turun lebih rendah dengan celah di muka, supaya
    // mata tetap terlihat dari depan tapi tengkuk tetap tertutup rambut.
    const BATAS_DAHI = Math.PI / 2.55;
    const rambutAtasGeo = geo(new THREE.SphereGeometry(0.315, 24, 12, 0, Math.PI * 2, 0, BATAS_DAHI));
    const rambutAtas = new THREE.Mesh(rambutAtasGeo, mRambut);
    rambutAtas.scale.set(1, 1.05, 1);
    rambutAtas.position.y = 2.27;
    badan.add(rambutAtas);
    const CELAH = 0.75;
    const rambutBelakangGeo = geo(
      new THREE.SphereGeometry(0.315, 24, 8, Math.PI / 2 + CELAH, Math.PI * 2 - CELAH * 2, BATAS_DAHI, Math.PI / 1.7 - BATAS_DAHI),
    );
    const rambutBelakang = new THREE.Mesh(rambutBelakangGeo, mRambut);
    rambutBelakang.scale.set(1, 1.05, 1);
    rambutBelakang.position.y = 2.27;
    badan.add(rambutBelakang);

    const jambulGeo = geo(new THREE.ConeGeometry(0.14, 0.22, 14));
    const jambul = new THREE.Mesh(jambulGeo, mRambut);
    jambul.position.set(0, 2.46, 0.02);
    jambul.rotation.z = 0.4;
    badan.add(jambul);
  }

  /* ---------------- Busana Nusantara (NPC) ---------------- */
  const busana = opsi.busana;
  if (busana) {
    const mKepala = mat(new THREE.MeshStandardMaterial({ color: busana.warnaKepala ?? 0x5b3a1e, roughness: 0.7 }));
    if (!perempuan && busana.kepala === 'blangkon') {
      const topi = new THREE.Mesh(geo(new THREE.SphereGeometry(0.335, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), mKepala);
      topi.scale.set(1, 0.72, 1);
      topi.position.y = 2.3;
      badan.add(topi);
      const lingkar = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.338, 0.338, 0.09, 24)), mKepala);
      lingkar.position.y = 2.3;
      badan.add(lingkar);
      const mondolan = new THREE.Mesh(geo(new THREE.SphereGeometry(0.11, 12, 10)), mKepala);
      mondolan.position.set(0, 2.24, -0.33);
      badan.add(mondolan);
    } else if (!perempuan && busana.kepala === 'caping') {
      const caping = new THREE.Mesh(
        geo(new THREE.ConeGeometry(0.78, 0.36, 24, 1, true)),
        mat(new THREE.MeshStandardMaterial({ color: 0xd9b26a, roughness: 0.9, side: THREE.DoubleSide })),
      );
      caping.position.y = 2.62;
      badan.add(caping);
    } else if (!perempuan && busana.kepala === 'udeng') {
      const ikat = new THREE.Mesh(geo(new THREE.TorusGeometry(0.305, 0.055, 8, 24)), mKepala);
      ikat.rotation.x = Math.PI / 2;
      ikat.position.y = 2.36;
      badan.add(ikat);
    }
    if (!perempuan && busana.jenggot) {
      const mPutih = mat(new THREE.MeshStandardMaterial({ color: 0xf1f1f1, roughness: 0.8 }));
      const jenggot = new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 12, 10)), mPutih);
      jenggot.scale.set(1.15, 1.2, 0.7);
      jenggot.position.set(0, 2.02, 0.2);
      badan.add(jenggot);
    }
    if (busana.selendang !== undefined) {
      const sel = new THREE.Mesh(
        geo(new THREE.BoxGeometry(0.14, 1.05, 0.06)),
        mat(new THREE.MeshStandardMaterial({ color: busana.selendang, roughness: 0.7 })),
      );
      sel.position.set(0.04, 1.5, 0.27);
      sel.rotation.z = 0.55;
      badan.add(sel);
    }
    if (busana.jarik !== undefined) {
      const mMotif = mat(new THREE.MeshStandardMaterial({ color: busana.jarik, roughness: 0.8 }));
      for (const y of [0.32, 0.62, 0.92]) {
        const pita = new THREE.Mesh(geo(new THREE.TorusGeometry(perempuan ? 0.4 : 0.3, 0.025, 6, 24)), mMotif);
        pita.rotation.x = Math.PI / 2;
        pita.position.y = y;
        badan.add(pita);
      }
    }
  }

  /* ---------------- Lengan (bersendi di pundak) ---------------- */

  const lenganAtasGeo = geo(new THREE.CapsuleGeometry(0.095, 0.42, 6, 14));
  const tanganGeo = geo(new THREE.SphereGeometry(0.1, 12, 10));

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

  const kakiGeo = geo(new THREE.CapsuleGeometry(0.12, 0.55, 6, 14));
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
