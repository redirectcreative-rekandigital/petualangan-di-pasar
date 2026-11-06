import * as THREE from 'three';
import { loadModel, klonModel } from './loaders';
import type { PlayerGender } from '../../shared/types';

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
 *   - bila punya animasi, beri nama klip `Idle`, `Walk`, `Run`.
 */

export interface AvatarModel {
  /** Grup pembungkus siap ditambahkan ke scene. */
  group: THREE.Group;
  /** Ukuran tinggi model setelah dinormalkan (untuk menaruh penanda di atas). */
  tinggi: number;
  /** Putar model berdasarkan sudut hadap (radian, 0 = +Z). */
  setHadap: (radian: number) => void;
  /**
   * Animasi per frame. Bila model punya klip animasi, klip dipilih sesuai
   * `kecepatan`; bila tidak, model diam (pemanggil memberi sedikit goyangan).
   */
  update: (kecepatan: number, dt: number) => void;
  dispose: () => void;
}

/** Nama berkas model per gender. */
const BERKAS: Record<PlayerGender, string> = {
  'laki-laki': 'player_male.glb',
  perempuan: 'player_female_hijab.glb',
};

/** Tinggi acuan karakter prosedural; model yang beda akan diskalakan. */
const TINGGI_ACUAN = 2.6;

/**
 * Memuat model avatar bila berkasnya ada.
 * Mengembalikan `null` bila berkas tidak tersedia/tidak bisa dimuat, sehingga
 * pemanggil bisa memakai karakter prosedural tanpa memunculkan error.
 */
export async function cobaAvatarGlb(
  gender: PlayerGender,
  renderer?: THREE.WebGLRenderer,
): Promise<AvatarModel | null> {
  let gltf;
  try {
    gltf = await loadModel(BERKAS[gender], renderer);
  } catch {
    // Berkas belum disiapkan; bukan kesalahan, cukup pakai karakter prosedural.
    return null;
  }

  const isi = klonModel(gltf);
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
    }
  });

  // Animasi (opsional): ambil klip berdasarkan namanya.
  const mixer = gltf.animations.length > 0 ? new THREE.AnimationMixer(isi) : null;
  const klip: Partial<Record<'Idle' | 'Walk' | 'Run', THREE.AnimationClip>> = {};
  for (const a of gltf.animations) {
    if (a.name === 'Idle' || a.name === 'Walk' || a.name === 'Run') klip[a.name] = a;
  }
  let aktif: THREE.AnimationAction | null = null;
  let aktifNama = '';
  const mainkan = (nama: 'Idle' | 'Walk' | 'Run'): void => {
    if (!mixer || aktifNama === nama) return;
    const clip = klip[nama] ?? klip.Idle;
    if (!clip) return;
    if (aktif) aktif.fadeOut(0.18);
    aktif = mixer.clipAction(clip);
    aktif.reset().fadeIn(0.18).play();
    aktifNama = nama;
  };

  return {
    group,
    tinggi: TINGGI_ACUAN,
    setHadap: (radian) => {
      pemutar.rotation.y = radian;
    },
    update: (kecepatan, dt) => {
      if (!mixer) return;
      mainkan(kecepatan > 3.2 ? 'Run' : kecepatan > 0.15 ? 'Walk' : 'Idle');
      mixer.update(dt);
    },
    dispose: () => {
      mixer?.stopAllAction();
      isi.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const m = mesh.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      });
    },
  };
}

/** Daftar berkas yang diharapkan ada di `public/assets/models/`. */
export const BERKAS_AVATAR = BERKAS;
