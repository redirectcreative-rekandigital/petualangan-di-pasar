import * as THREE from 'three';
import { loadModel, klonModel } from './loaders';
import type { PlayerGender } from '../../shared/types';
import { terapkanKostum, muatKostum, buangMaterialKostum, type PilihanKostum } from './kostum';

/**
 * Pemuatan model avatar dari `public/assets/models/`.
 *
 * Desain penting: **permainan harus tetap berjalan meski berkas model belum
 * ada.** Karena itu setiap pemuatan model avatar punya dua jalur:
 *
 * 1. `cobaAvatarGlb()` — memuat berkas `.glb` bila tersedia.
 * 2. Pemanggil memakai karakter prosedural (`karakter.ts`) sebagai cadangan.
 *
 * Berkas yang dicari:
 *   - `player_male.glb`  → avatar laki-laki
 *   - `player_female_hijab.glb` → avatar perempuan berhijab
 *
 * Model harus:
 *   - menghadap sumbu **+Z** (arah wajah),
 *   - berdiri di titik asal dengan **kaki di y = 0**,
 *   - tinggi sekitar **2.6 satuan** (skala akan dinormalkan otomatis bila beda),
 *   - klip animasi: `Idle`, `Walk`, `Run` (berulang) dan `Jump`, `Interact`
 *     (sekali main). Semua klip "di tempat" (tanpa perpindahan akar).
 */

export type KlipSekali = 'Jump' | 'Interact';
type KlipJalan = 'Idle' | 'Walk' | 'Run';

export interface AvatarModel {
  /** Grup pembungkus siap ditambahkan ke scene. */
  group: THREE.Group;
  /** Ukuran tinggi model setelah dinormalkan (untuk menaruh penanda di atas). */
  tinggi: number;
  /** Putar model berdasarkan sudut hadap (radian, 0 = +Z). */
  setHadap: (radian: number) => void;
  /**
   * Animasi per frame. `kecepatan` = kecepatan gerak NYATA (satuan dunia/detik).
   * Idle/Walk/Run dipilih dari kecepatan itu, dan laju klip (`timeScale`)
   * disamakan dengan kecepatan sehingga kaki tidak meluncur di tanah.
   */
  update: (kecepatan: number, dt: number) => void;
  /** Memainkan klip sekali (`Jump` saat melompat, `Interact` saat berinteraksi). */
  mainkanSekali: (nama: KlipSekali, durasi?: number) => void;
  /** Mengganti warna kostum langsung (tanpa memuat ulang model). */
  setKostum: (pilihan: PilihanKostum) => void;
  /** Klip yang sedang dominan & lajunya (untuk uji/debug). */
  infoAnimasi: () => { klip: string; timeScale: number };
  dispose: () => void;
}

/** Nama berkas model per gender. */
const BERKAS: Record<PlayerGender, string> = {
  'laki-laki': 'player_male.glb',
  perempuan: 'player_female_hijab.glb',
};

/**
 * Jumlah material kostum yang harus ditemukan di GLB. Warna dicari berdasarkan
 * NAMA material, jadi bila GLB diproses ulang (kompres/optimasi) dan namanya
 * berubah atau tergabung, angka ini akan berbeda.
 */
const JUMLAH_MATERIAL_KOSTUM: Record<PlayerGender, number> = { 'laki-laki': 9, perempuan: 10 };

/** Tinggi acuan karakter prosedural; model yang beda akan diskalakan. */
const TINGGI_ACUAN = 2.6;

/**
 * Kecepatan langkah klip pada skala ASLI model (meter/detik): pada kecepatan
 * ini kaki menapak tanpa meluncur. Dikalikan skala normalisasi (±1,56) menjadi
 * ±1,1 (Walk) dan ±2,7 (Run) satuan dunia/detik.
 */
const LANGKAH_ASLI = { Walk: 0.71, Run: 1.75 } as const;

/** Batas laju klip agar tidak terlalu lambat (kaku) atau terlalu cepat. */
const TIMESCALE_MIN = 0.6;
const TIMESCALE_MAKS = 3;

/**
 * Memuat model avatar bila berkasnya ada.
 * Mengembalikan `null` bila berkas tidak tersedia/tidak bisa dimuat, sehingga
 * pemanggil bisa memakai karakter prosedural tanpa memunculkan error.
 */
export async function cobaAvatarGlb(
  gender: PlayerGender,
  renderer?: THREE.WebGLRenderer,
  kostum?: PilihanKostum,
): Promise<AvatarModel | null> {
  let gltf;
  try {
    gltf = await loadModel(BERKAS[gender], renderer);
  } catch {
    // Berkas belum disiapkan; bukan kesalahan, cukup pakai karakter prosedural.
    return null;
  }

  // SkeletonUtils.clone (lihat loaders.ts): rig tetap utuh walau dimuat berkali-kali.
  const isi = klonModel(gltf);
  // Warna kostum pilihan pemain (per profil); bila tidak diberikan, pakai simpanan
  // perangkat dari kostum.ts, atau preset bawaan.
  const pasangKostum = (pilihan: PilihanKostum): void => {
    const hasil = terapkanKostum(isi, gender, pilihan);
    if (hasil.jumlahMaterial !== JUMLAH_MATERIAL_KOSTUM[gender]) {
      console.warn(
        `[kostum] ${BERKAS[gender]}: ${hasil.jumlahMaterial} material kostum ditemukan, seharusnya ${JUMLAH_MATERIAL_KOSTUM[gender]}. Periksa nama material di GLB.`,
      );
    }
  };
  pasangKostum(kostum ?? muatKostum(gender) ?? {});
  const group = new THREE.Group();
  const pemutar = new THREE.Group();
  group.add(pemutar);
  pemutar.add(isi);

  // Normalkan skala & posisi: kaki di y=0, tinggi mendekati TINGGI_ACUAN.
  const kotak = new THREE.Box3().setFromObject(isi);
  const ukuran = kotak.getSize(new THREE.Vector3());
  const tinggiAsli = ukuran.y || 1;
  const skala = TINGGI_ACUAN / tinggiAsli;
  pemutar.scale.setScalar(skala);
  // Setelah diskalakan, geser supaya alas model tepat di y = 0.
  pemutar.position.y = -kotak.min.y * skala;

  isi.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      // Model ber-rig bisa bergerak keluar dari kotak awalnya: jangan dipotong kamera.
      mesh.frustumCulled = false;
    }
  });

  // Kecepatan langkah klip dalam satuan dunia (sudah dikali skala).
  const langkahWalk = LANGKAH_ASLI.Walk * skala;
  const langkahRun = LANGKAH_ASLI.Run * skala;
  // Di atas kecepatan ini pakai Run, di bawahnya Walk (titik tengah kedua langkah).
  const batasLari = (langkahWalk + langkahRun) / 2;

  const mixer = gltf.animations.length > 0 ? new THREE.AnimationMixer(isi) : null;
  const klip: Partial<Record<KlipJalan | KlipSekali, THREE.AnimationClip>> = {};
  for (const a of gltf.animations) {
    if (a.name === 'Idle' || a.name === 'Walk' || a.name === 'Run' || a.name === 'Jump' || a.name === 'Interact') klip[a.name] = a;
  }

  let aktif: THREE.AnimationAction | null = null;
  let aktifNama: KlipJalan | '' = '';
  /** Klip sekali-main yang sedang berjalan (Jump/Interact), menahan klip jalan. */
  let sekali: { nama: KlipSekali; aksi: THREE.AnimationAction } | null = null;

  const mainkanJalan = (nama: KlipJalan, laju: number): void => {
    if (!mixer) return;
    if (aktifNama !== nama) {
      const clip = klip[nama] ?? klip.Idle;
      if (!clip) return;
      const baru = mixer.clipAction(clip);
      baru.setLoop(THREE.LoopRepeat, Infinity);
      baru.reset().fadeIn(0.18).play();
      if (aktif && aktif !== baru) aktif.fadeOut(0.18);
      aktif = baru;
      aktifNama = nama;
    }
    if (aktif) aktif.timeScale = laju;
  };

  const selesaiSekali = (): void => {
    if (!sekali) return;
    sekali.aksi.fadeOut(0.2);
    sekali = null;
    // Paksa klip jalan dipilih & di-fade-in ulang pada frame berikutnya.
    aktifNama = '';
  };
  mixer?.addEventListener('finished', (ev) => {
    if (sekali && ev.action === sekali.aksi) selesaiSekali();
  });

  const mainkanSekali = (nama: KlipSekali, durasi?: number): void => {
    const clip = klip[nama];
    if (!mixer || !clip) return;
    const aksi = mixer.clipAction(clip);
    // Non-loop: main sekali lalu tahan pose terakhir sampai di-fade-out.
    aksi.setLoop(THREE.LoopOnce, 1);
    aksi.clampWhenFinished = true;
    // Bila pemanggil memberi durasi (mis. lama di udara), samakan panjang klip.
    aksi.timeScale = durasi && durasi > 0 ? clip.duration / durasi : 1;
    aksi.reset().setEffectiveWeight(1).fadeIn(0.08).play();
    if (aktif) aktif.fadeOut(0.08);
    if (sekali && sekali.aksi !== aksi) sekali.aksi.fadeOut(0.08);
    aktif = null;
    aktifNama = '';
    sekali = { nama, aksi };
  };

  return {
    group,
    tinggi: TINGGI_ACUAN,
    setHadap: (radian) => {
      pemutar.rotation.y = radian;
    },
    update: (kecepatan, dt) => {
      if (!mixer) return;
      // Mulai berjalan saat Interact masih main: hentikan Interact agar tidak meluncur.
      if (sekali?.nama === 'Interact' && kecepatan > 0.15) selesaiSekali();
      if (!sekali) {
        if (kecepatan <= 0.15) {
          mainkanJalan('Idle', 1);
        } else if (kecepatan < batasLari) {
          mainkanJalan('Walk', THREE.MathUtils.clamp(kecepatan / langkahWalk, TIMESCALE_MIN, TIMESCALE_MAKS));
        } else {
          mainkanJalan('Run', THREE.MathUtils.clamp(kecepatan / langkahRun, TIMESCALE_MIN, TIMESCALE_MAKS));
        }
      }
      mixer.update(dt);
    },
    mainkanSekali,
    setKostum: pasangKostum,
    infoAnimasi: () => {
      const a = sekali?.aksi ?? aktif;
      return { klip: sekali?.nama ?? aktifNama ?? '', timeScale: Math.round((a?.timeScale ?? 0) * 100) / 100 };
    },
    dispose: () => {
      mixer?.stopAllAction();
      mixer?.uncacheRoot(isi);
      buangMaterialKostum(isi);
      // Geometri dibagi dengan model di cache (lihat klonModel): hanya material
      // milik klon ini yang dibuang.
      isi.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const m = mesh.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      });
    },
  };
}

/** Daftar berkas yang diharapkan ada di `public/assets/models/`. */
export const BERKAS_AVATAR = BERKAS;
