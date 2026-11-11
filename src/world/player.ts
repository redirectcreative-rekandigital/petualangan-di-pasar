import * as THREE from 'three';
import { buatKarakter, type KarakterRig } from './karakter';
import { cobaAvatarGlb } from './avatarModel';
import type { PlayerGender } from '../../shared/types';
import type { PilihanKostum } from './kostum';

/**
 * Karakter pemain low-poly. Bentuknya dibuat oleh `karakter.ts` (bergaya kartun,
 * sesuai konsep islami: pria bercelana panjang, perempuan berhijab & gamis).
 *
 * Modul ini hanya mengurus posisi, rotasi, dan animasi jalan; perhitungan gerak
 * ada di world/noktahWorld.
 */

export interface PlayerBundle {
  group: THREE.Group;
  /** Titik acuan posisi (kaki) untuk kamera dan collision. */
  position: THREE.Vector3;
  /** `y` = tinggi lantai yang diinjak (tangga mercusuar); 0 di dunia datar. */
  setPosition: (x: number, z: number, y?: number) => void;
  /** Menghadap ke arah pergerakan. */
  faceDirection: (dx: number, dz: number, dt: number) => void;
  /** Animasi jalan sederhana (ayun kaki) berdasarkan kecepatan. */
  animate: (speed: number, elapsed: number) => void;
  /** Mulai melompat. `false` bila diabaikan karena masih di udara. */
  lompat: () => boolean;
  /** Gerak tubuh saat berinteraksi (klip `Interact` pada avatar GLB). */
  interaksi: () => void;
  /** Adegan pembuka Tidur lalu Bangun (langsung selesai pada karakter prosedural). */
  adeganBangun: () => Promise<void>;
  /** Sudut mata: kepala disembunyikan, tangan diangkat; `null` kembali normal. */
  poseOrangPertama: (kamera: THREE.PerspectiveCamera | null) => void;
  /** Klip animasi avatar GLB yang sedang main (null bila memakai karakter prosedural). */
  infoAnimasi: () => { klip: string; timeScale: number } | null;
  /** Memajukan fisika lompat (gravitasi) tiap frame. `true` pada frame mendarat. */
  updateLompat: (dt: number) => boolean;
  /** Apakah pemain sedang di udara. */
  diUdara: () => boolean;
  /**
   * Coba ganti model dengan avatar GLB bila tersedia di `public/assets/models/`.
   * Bila berkas tidak ada, pemain tetap memakai karakter prosedural.
   */
  cobaPakaiGlb: (renderer?: THREE.WebGLRenderer) => Promise<boolean>;
  dispose: () => void;
}

/** Penampilan pemain (gender + warna pakaian pilihan). */
export interface Penampilan {
  gender: PlayerGender;
  /** Warna untuk karakter prosedural (cadangan bila GLB tidak ada). */
  warnaPakaian?: number;
  warnaBawahan?: number;
  warnaHijab?: number;
  /** Kostum avatar GLB (preset + warna per bagian). */
  kostum?: PilihanKostum;
}

export function createPlayer(penampilan: PlayerGender | Penampilan = 'laki-laki'): PlayerBundle {
  const opsi: Penampilan = typeof penampilan === 'string' ? { gender: penampilan } : penampilan;
  const rig: KarakterRig = buatKarakter({
    gender: opsi.gender,
    warnaPakaian: opsi.warnaPakaian,
    warnaBawahan: opsi.warnaBawahan,
    warnaHijab: opsi.warnaHijab,
    pakaiMarker: true,
  });
  const group = rig.group;
  // Gabungkan: wadah luar (posisi & rotasi) berisi karakter prosedural + model GLB.
  // `rig.group` dipakai sebagai anak, bukan sebagai akar, supaya menyembunyikan
  // karakter prosedural tidak ikut menyembunyikan model GLB.
  const akar = new THREE.Group();
  akar.add(group);
  // Pemain adalah satu-satunya objek yang memberi bayangan "tokoh".
  akar.traverse((o) => {
    o.castShadow = true;
  });

  const position = new THREE.Vector3(0, 0, 0);
  let facing = 0;
  // Bila model GLB berhasil dimuat, `glb` menggantikan animasi prosedural.
  let glb: Awaited<ReturnType<typeof cobaAvatarGlb>> = null;

  // Lompat: hanya tubuh (akar) yang naik; `position` tetap di tanah supaya
  // kamera, collision, dan posisi multiplayer tidak ikut terguncang.
  let tinggi = 0;
  let kecepatanY = 0;
  let mendarat = 0; // sisa waktu efek "mendarat" (tubuh memendek sesaat)

  const setPosition = (x: number, z: number, y = 0): void => {
    position.set(x, y, z);
    akar.position.set(x, y + tinggi, z);
  };

  const lompat = (): boolean => {
    if (tinggi > 0 || kecepatanY !== 0) return false;
    kecepatanY = KECEPATAN_LOMPAT;
    // Klip Jump dipadatkan sepanjang waktu di udara (+ sedikit untuk mendarat),
    // supaya kaki menyentuh tanah bersamaan dengan fisika lompatnya.
    glb?.mainkanSekali('Jump', WAKTU_DI_UDARA + 0.2);
    return true;
  };

  const updateLompat = (dt: number): boolean => {
    let baruMendarat = false;
    if (tinggi > 0 || kecepatanY !== 0) {
      kecepatanY -= GRAVITASI * dt;
      tinggi += kecepatanY * dt;
      if (tinggi <= 0) {
        tinggi = 0;
        kecepatanY = 0;
        mendarat = 0.14;
        baruMendarat = true;
      }
      akar.position.y = position.y + tinggi;
    }
    // Efek pegas kecil: memendek saat mendarat, sedikit memanjang di udara.
    if (mendarat > 0) {
      mendarat = Math.max(0, mendarat - dt);
      const k = Math.sin((mendarat / 0.14) * Math.PI) * 0.12;
      akar.scale.set(1 + k * 0.5, 1 - k, 1 + k * 0.5);
    } else if (tinggi > 0) {
      akar.scale.set(0.97, 1.05, 0.97);
    } else {
      akar.scale.set(1, 1, 1);
    }
    return baruMendarat;
  };

  const faceDirection = (dx: number, dz: number, dt: number): void => {
    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return;
    const target = Math.atan2(dx, dz);
    // Interpolasi rotasi secara halus (shortest angle).
    let diff = target - facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    facing += diff * Math.min(1, dt * 12);
    akar.rotation.y = facing;
  };

  let waktuTerakhir = 0;
  const animate = (speed: number, elapsed: number): void => {
    // Model GLB diayunkan lewat klip animasinya sendiri (bila ada).
    const dt = Math.max(0, Math.min(0.1, elapsed - waktuTerakhir));
    waktuTerakhir = elapsed;
    if (glb) {
      glb.update(speed, dt);
      return;
    }
    rig.langkah(speed, elapsed);
  };

  const cobaPakaiGlb = async (renderer?: THREE.WebGLRenderer): Promise<boolean> => {
    const model = await cobaAvatarGlb(opsi.gender, renderer, opsi.kostum, TINGGI_PEMAIN);
    if (!model) return false;
    glb = model;
    // Sembunyikan karakter prosedural, tampilkan model GLB di grup yang sama.
    group.visible = false;
    akar.add(model.group);
    akar.traverse((o) => {
      o.castShadow = true;
    });
    return true;
  };

  const dispose = (): void => {
    glb?.dispose();
    rig.geometri.forEach((g) => g.dispose());
    rig.material.forEach((m) => m.dispose());
  };

  return {
    group: akar,
    position,
    setPosition,
    faceDirection,
    animate: (speed, elapsed) => animate(tinggi > 0 ? 0 : speed, elapsed),
    lompat,
    interaksi: () => glb?.mainkanSekali('Interact'),
    adeganBangun: () => glb?.adeganBangun() ?? Promise.resolve(),
    poseOrangPertama: (kamera) => {
      if (glb) glb.poseOrangPertama(kamera);
      // Karakter prosedural tidak punya pose tangan: cukup sembunyikan agar tidak menutupi kamera.
      else group.visible = kamera === null;
    },
    infoAnimasi: () => glb?.infoAnimasi() ?? null,
    updateLompat,
    diUdara: () => tinggi > 0,
    cobaPakaiGlb,
    dispose,
  };
}

/** Tinggi pemain di dunia balai (m), setara cantrik pada aset bab. */
export const TINGGI_PEMAIN = 1.6;

/** Kecepatan awal lompat (satuan/detik) dan gravitasi: puncak ±1,1 satuan, ±0,6 detik di udara. */
const KECEPATAN_LOMPAT = 6.6;
const GRAVITASI = 20;
/** Lama di udara satu lompatan (detik): naik + turun. */
const WAKTU_DI_UDARA = (2 * KECEPATAN_LOMPAT) / GRAVITASI;
