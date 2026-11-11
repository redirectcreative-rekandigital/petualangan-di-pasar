import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadModel, klonModel, lepasModel } from './loaders';
import { buildSign } from './papan';
import { modeRingan, saatRingan } from '../core/kualitas';

/**
 * Aset GLB tiap bab (lihat docs/aset/ASET_INDEX.md): daftar berkas per bab,
 * pemasangan model unik, InstancedMesh untuk isian dunia, lampu dari
 * `light_hint`, papan dari `text_face`, dan NPC ber-AnimationMixer.
 */

type Track = <T extends { dispose: () => void }>(o: T) => T;

interface DefBab {
  rumah: string;
  stasiun: string;
  arena: string;
  penjaga: string;
  cantrik: string;
  isian: string[];
}

const def = (folder: string, rumah: string, stasiun: string, penjaga: string, cantrik: string, isian: string[], arena = 'panggung_uji'): DefBab => ({
  rumah: `${folder}/${rumah}`,
  stasiun: `${folder}/${stasiun}`,
  arena: `${folder}/${arena}`,
  penjaga,
  cantrik,
  isian: isian.map((x) => `${folder}/${x}`),
});

export const BAB: Record<string, DefBab> = {
  F01: def('goa_sinar', 'pendopo', 'stasiun_cahaya', 'nenek_pelita', 'cantrik_prisma', ['kit_lingkungan'], 'panggung_bundar_v002'),
  F02: def('lembah_gema', 'balai_gema', 'stasiun_bunyi', 'kakek_kentongan', 'cantrik_garpu_tala', ['kit_lembah', 'batu_gema']),
  H01: def('pondok_hutan', 'pondok_rimba', 'stasiun_ekosistem', 'nenek_kupu', 'cantrik_kaca_pembesar', ['kit_hutan']),
  H02: def('ladang_lumbung', 'rumah_ladang', 'stasiun_rantai_makanan', 'kakek_padi', 'cantrik_belalang', ['kit_ladang', 'lumbung_padi']),
  H03: def('taman_bunga', 'rumah_kembang', 'stasiun_simbiosis', 'ibu_bunga', 'cantrik_kenikir', ['kit_taman', 'pohon_besar']),
  H04: def('persemaian', 'rumah_persemaian', 'stasiun_persemaian', 'kakek_bibit', 'cantrik_kecambah', ['kit_persemaian', 'jembatan_rusak']),
  F03: def('bukit_batu_besi', 'bengkel_empu', 'stasiun_magnet', 'kakek_pandai_besi', 'cantrik_magnet', ['kit_bukit', 'magnet_raksasa', 'bukit_puncak']),
  F04: def('sungai_kincir', 'rumah_kincir', 'stasiun_listrik', 'penjaga_lentera', 'cantrik_lampu', ['kit_sungai', 'kincir_air', 'gardu_listrik', 'tiang_listrik']),
  E01: def('tebing_berlapis', 'pos_pendaki', 'stasiun_litosfer', 'ibu_batu', 'cantrik_batu', ['kit_tebing', 'tebing_berlapis']),
  E02: def('mata_air', 'rumah_mata_air', 'stasiun_hidrosfer', 'ibu_batu', 'cantrik_awan', ['kit_mata_air', 'menara_cuaca', 'air_terjun']),
  E03: def('pos_siaga', 'pos_siaga', 'stasiun_siklus_air', 'ibu_batu', 'cantrik_peta', ['kit_siaga', 'bukit_titik_kumpul', 'papan_evakuasi']),
};

const ISIAN_BERSAMA = [
  'bersama/jalan_lebar',
  'bersama/pohon',
  'bersama/tunggul',
  'bersama/batang_kayu',
  'bersama/kolam',
  'bersama/awan',
  'goa_sinar/pagar_kayu',
  'goa_sinar/semak',
  'goa_sinar/batu_kecil',
];

const berkas = (p: string): string => `lingkungan/${p}${/_v\d+$/.test(p) ? '' : '_v001'}.glb`;
export const berkasNpc = (nama: string): string => `npc/npc_${nama}_v001.glb`;

/** Berkas rumah penjaga sebuah bab (dipakai juga oleh peta pulau). */
export const berkasRumah = (kode: string): string | null => (BAB[kode] ? berkas((BAB[kode] as DefBab).rumah) : null);

export interface AsetBab {
  rumah: GLTF;
  stasiun: GLTF;
  arena: GLTF;
  gerbang: GLTF;
  obor: GLTF;
  penjaga: GLTF;
  cantrik: GLTF;
  /** Node akar berkas isian, menurut nama (posisi aslinya diabaikan saat ditanam). */
  kit: Map<string, THREE.Object3D>;
  /** Berkas isian menurut nama dasar, untuk objek yang perlu di-clone. */
  glb: Map<string, GLTF>;
}

export async function muatAsetBab(kode: string): Promise<AsetBab> {
  const d = BAB[kode];
  if (!d) throw new Error(`Bab tidak dikenal: ${kode}`);
  const daftarIsian = [...ISIAN_BERSAMA, ...d.isian];
  const [rumah, stasiun, arena, gerbang, obor, penjaga, cantrik, ...isian] = await Promise.all(
    [
      berkas(d.rumah),
      berkas(d.stasiun),
      berkas(d.arena),
      berkas('bersama/gerbang_peta'),
      berkas('goa_sinar/tiang_obor'),
      berkasNpc(d.penjaga),
      berkasNpc(d.cantrik),
      ...daftarIsian.map(berkas),
    ].map((p) => loadModel(p)),
  ) as [GLTF, GLTF, GLTF, GLTF, GLTF, GLTF, GLTF, ...GLTF[]];

  const kit = new Map<string, THREE.Object3D>();
  const glb = new Map<string, GLTF>();
  isian.forEach((g, i) => {
    glb.set((daftarIsian[i] as string).split('/').pop() as string, g);
    for (const n of g.scene.children) kit.set(n.name, n);
  });
  return { rumah, stasiun, arena, gerbang, obor, penjaga, cantrik, kit, glb };
}

/**
 * Melepas berkas khas bab dari cache loader setelah dunianya dibuang (hemat RAM).
 * Isian bersama, gerbang, dan obor dipakai semua bab, jadi tetap disimpan.
 */
export function lepasAsetBab(kode: string): void {
  const d = BAB[kode];
  if (!d) return;
  [berkas(d.rumah), berkas(d.stasiun), berkas(d.arena), berkasNpc(d.penjaga), berkasNpc(d.cantrik), ...d.isian.map(berkas)].forEach(lepasModel);
}

export interface Pasangan {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  klip: (nama: string) => THREE.AnimationClip;
}

export interface OpsiPasang {
  /** Isi papan `text_face` (bawaan: teks yang tersimpan di GLB). */
  teks?: string;
  /** false = klip tidak diputar otomatis (panggung uji mengaturnya sendiri). */
  putar?: boolean;
  skala?: number;
}

export interface DuniaGlb {
  kit: Map<string, THREE.Object3D>;
  /** Clone utuh sebuah GLTF: berisi animasi loop, lampu saran, dan papan. */
  pasang: (gltf: GLTF, x: number, z: number, rotY: number, opsi?: OpsiPasang) => Pasangan;
  /** Seperti `pasang`, untuk berkas isian menurut nama dasarnya. */
  pasangBerkas: (nama: string, x: number, z: number, rotY: number, opsi?: OpsiPasang) => Pasangan;
  /** Mengantre satu instance node kit. Panggil `selesai()` setelah semua ditanam. */
  tanam: (nama: string, x: number, y: number, z: number, skala?: number | [number, number, number], rotY?: number) => void;
  selesai: () => void;
  update: (dt: number, elapsed: number, pemain: THREE.Vector3) => void;
}

interface SaranLampu {
  pos: THREE.Vector3;
  warna: THREE.Color;
  intensitas: number;
  jarak: number;
  decay: number;
  kedip: boolean;
  syarat: THREE.Object3D | null;
}

/** Batas PointLight aktif; jumlahnya tetap agar shader tidak dikompilasi ulang. */
const JUMLAH_LAMPU = 4;

export function buatDuniaGlb(scene: THREE.Scene, aset: AsetBab, warna: number, track: Track): DuniaGlb {
  const mixers: THREE.AnimationMixer[] = [];
  const saran: SaranLampu[] = [];
  const antrean = new Map<string, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D();

  // Mode ringan: tanpa PointLight (cahaya obor cukup dari warna emissive GLB).
  const lampu = Array.from({ length: modeRingan() ? 0 : JUMLAH_LAMPU }, () => {
    const l = new THREE.PointLight(0xffffff, 0);
    scene.add(l);
    return l;
  });
  track({ dispose: saatRingan(() => lampu.splice(0).forEach((l) => scene.remove(l))) });

  const tulisPapan = (root: THREE.Object3D, teks: string | undefined): void => {
    const papan: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (typeof o.userData.text_face === 'string') papan.push(o);
    });
    for (const o of papan) {
      const muka = JSON.parse(o.userData.text_face as string) as { center_m: [number, number, number]; size_m: [number, number]; text?: string; default_text?: string };
      const isi = teks ?? muka.text ?? muka.default_text;
      if (!isi) continue;
      const tanda = buildSign(isi, warna, track);
      // buildSign berukuran 3,4 x 0,68: dimuatkan ke bidang papan.
      tanda.scale.setScalar(Math.min(muka.size_m[0] / 3.4, muka.size_m[1] / 0.68));
      tanda.position.set(muka.center_m[0], muka.center_m[1], muka.center_m[2] + 0.01);
      root.add(tanda);
    }
  };

  const catatLampu = (root: THREE.Object3D): void => {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (typeof o.userData.light_hint !== 'string') return;
      const h = JSON.parse(o.userData.light_hint as string) as { color: string; intensity: number; distance: number; decay?: number; flicker?: unknown; only_when?: string };
      const namaSyarat = h.only_when?.split(' ')[0];
      saran.push({
        pos: o.getWorldPosition(new THREE.Vector3()),
        warna: new THREE.Color(h.color),
        intensitas: h.intensity,
        jarak: h.distance,
        decay: h.decay ?? 2,
        kedip: Boolean(h.flicker),
        syarat: namaSyarat ? (root.getObjectByName(namaSyarat) ?? null) : null,
      });
    });
  };

  const pasang: DuniaGlb['pasang'] = (gltf, x, z, rotY, opsi = {}) => {
    const root = klonModel(gltf);
    root.position.set(x, 0, z);
    root.rotation.y = rotY;
    if (opsi.skala) root.scale.setScalar(opsi.skala);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => track(m));
    });
    tulisPapan(root, opsi.teks);
    scene.add(root);
    catatLampu(root);
    const mixer = gltf.animations.length > 0 ? new THREE.AnimationMixer(root) : null;
    if (mixer) {
      mixers.push(mixer);
      if (opsi.putar !== false) {
        // Waktu acak: obor yang berjajar tidak berkedip kompak.
        for (const clip of gltf.animations) mixer.clipAction(clip).play().time = Math.random() * clip.duration;
      }
    }
    return {
      root,
      mixer,
      klip: (nama) => {
        const c = gltf.animations.find((a) => a.name === nama);
        if (!c) throw new Error(`Klip tidak ada: ${nama}`);
        return c;
      },
    };
  };

  return {
    kit: aset.kit,
    pasang,
    pasangBerkas: (nama, x, z, rotY, opsi) => {
      const g = aset.glb.get(nama);
      if (!g) throw new Error(`Berkas isian tidak ada: ${nama}`);
      return pasang(g, x, z, rotY, opsi);
    },
    tanam: (nama, x, y, z, skala = 1, rotY = 0) => {
      if (!aset.kit.has(nama)) throw new Error(`Node kit tidak ada: ${nama}`);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rotY, 0);
      if (typeof skala === 'number') dummy.scale.setScalar(skala);
      else dummy.scale.set(...skala);
      dummy.updateMatrix();
      const m = antrean.get(nama) ?? [];
      m.push(dummy.matrix.clone());
      antrean.set(nama, m);
    },
    selesai: () => {
      for (const [nama, matriks] of antrean) {
        const rata = nama.startsWith('lantai_') || nama.startsWith('jalan_');
        (aset.kit.get(nama) as THREE.Object3D).traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          // Geometri & material milik cache loader: hanya InstancedMesh yang dibuang.
          const im = track(new THREE.InstancedMesh(mesh.geometry, mesh.material, matriks.length));
          matriks.forEach((m, i) => im.setMatrixAt(i, m));
          im.castShadow = !rata;
          im.receiveShadow = true;
          scene.add(im);
        });
      }
      antrean.clear();
    },
    update: (dt, elapsed, pemain) => {
      for (const m of mixers) m.update(dt);
      if (lampu.length === 0) return;
      // Diurutkan di tempat: tanpa array baru tiap frame (sampah GC = patah sesaat).
      saran.sort((a, b) => a.pos.distanceToSquared(pemain) - b.pos.distanceToSquared(pemain));
      let j = 0;
      lampu.forEach((l, i) => {
        while (j < saran.length && saran[j]?.syarat?.visible === false) j++;
        const s = saran[j++];
        if (!s) {
          l.intensity = 0;
          return;
        }
        l.position.copy(s.pos);
        l.color.copy(s.warna);
        l.distance = s.jarak;
        l.decay = s.decay;
        l.intensity = s.intensitas * (s.kedip ? 0.9 + 0.15 * Math.sin(elapsed * 8.5 + i * 2.1) : 1);
      });
    },
  };
}

export interface NpcGlb {
  group: THREE.Group;
  /** `kecepatan` dalam satuan dunia/detik (0 = diam). */
  update: (dt: number, kecepatan: number) => void;
  setBicara: (v: boolean) => void;
  /** Memutar `Interact` sekali (memberi alat atau tugas). */
  interaksi: () => void;
}

/** Kecepatan klip Walk di dunia (m/detik, sudah termasuk skala rig). */
const WALK_NPC = 0.5;

/** NPC ber-rig. Skala ada di node akar rig dan sengaja tidak diubah. */
export function buatNpc(gltf: GLTF, track: Track): NpcGlb {
  const isi = klonModel(gltf);
  isi.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => track(m));
    if (mesh.isSkinnedMesh) track(mesh.skeleton);
  });
  const group = new THREE.Group();
  group.add(isi);

  const mixer = new THREE.AnimationMixer(isi);
  const klip = (nama: string): THREE.AnimationClip | undefined => gltf.animations.find((a) => a.name === nama);
  let dasar: THREE.AnimationAction | null = null;
  let namaDasar = '';
  let sekali: THREE.AnimationAction | null = null;
  let bicara = false;

  const setDasar = (nama: string): void => {
    if (namaDasar === nama) return;
    const clip = klip(nama) ?? klip('Idle');
    if (!clip) return;
    const baru = mixer.clipAction(clip);
    baru.reset().fadeIn(0.2).play();
    if (dasar && dasar !== baru) dasar.fadeOut(0.2);
    dasar = baru;
    namaDasar = nama;
  };

  mixer.addEventListener('finished', (ev) => {
    if (ev.action !== sekali) return;
    sekali.fadeOut(0.2);
    sekali = null;
  });

  return {
    group,
    update: (dt, kecepatan) => {
      if (!sekali) setDasar(kecepatan > 0 && klip('Walk') ? 'Walk' : bicara ? 'Talk' : 'Idle');
      if (dasar) dasar.timeScale = namaDasar === 'Walk' ? THREE.MathUtils.clamp(kecepatan / WALK_NPC, 0.6, 3) : 1;
      mixer.update(dt);
    },
    setBicara: (v) => {
      bicara = v;
    },
    interaksi: () => {
      const clip = klip('Interact');
      if (!clip) return;
      const a = mixer.clipAction(clip);
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      a.reset().fadeIn(0.2).play();
      dasar?.fadeOut(0.2);
      dasar = null;
      namaDasar = '';
      sekali = a;
    },
  };
}
