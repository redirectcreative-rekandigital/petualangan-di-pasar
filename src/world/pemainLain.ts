import * as THREE from 'three';
import { cobaAvatarGlb, type AvatarModel } from './avatarModel';
import { rapikanPilihan } from './kostum';
import { TINGGI_PEMAIN } from './player';
import { modeRingan } from '../core/kualitas';
import type { KostumPemain, PosisiPemain } from '../../shared/net';

/**
 * Pengelola "pemain lain" di dunia noktah (mode multiplayer).
 *
 * Setiap siswa lain digambar dengan avatar GLB dan kostumnya sendiri (tanpa
 * collision), lengkap dengan label nama melayang dan balon sapaan emoji
 * sementara. Posisi diperbarui secara halus (interpolasi) agar gerak terlihat
 * mulus meski data datang 8x per detik. Hanya yang terdekat yang digambar:
 * tiap avatar punya 12 bagian dan animasi sendiri, berat di HP murah.
 */

/** Jumlah pemain lain yang digambar sekaligus. */
const MAKS_TAMPIL = 5;
/** Yang sedang tampil dianggap lebih dekat (m) agar tidak bergantian di batas peringkat. */
const KEUNGGULAN_TAMPIL = 1.5;
const TINGGI_LABEL = 0.35;
const Y_LABEL = 1.95;
export const Y_BALON = 2.5;
const LAMA_SAPA = 2.6;
/** Di mode ringan, avatar teman lebih jauh dari ini (m) tidak dianimasikan. */
const JARAK_ANIMASI_RINGAN = 12;

interface Tampilan {
  id: string;
  group: THREE.Group;
  model: AvatarModel | null;
  /** Sudah dibuang: model yang baru selesai dimuat harus dilepas. */
  dibuang: boolean;
  /** Posisi target (dari jaringan). */
  target: THREE.Vector3;
  targetRot: number;
  kecepatan: number;
  label: { sprite: THREE.Sprite; dispose: () => void };
  balon: BalonSapa;
  /** Nilai `sampai` terakhir: penanda sapaan baru, tanpa membandingkan jam perangkat dan server. */
  sapaTerakhir: number;
}

export interface BalonSapa {
  sprite: THREE.Sprite;
  tampilkan: (emoji: string) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

/** Balon emoji yang muncul sebentar lalu memudar. */
export function buatBalonSapa(): BalonSapa {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.8, 0.8, 1);
  let sisa = 0;
  return {
    sprite,
    tampilkan: (emoji) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 64, 68);
        tex.needsUpdate = true;
      }
      sisa = LAMA_SAPA;
    },
    update: (dt) => {
      sisa = Math.max(0, sisa - dt);
      mat.opacity += ((sisa > 0 ? 1 : 0) - mat.opacity) * Math.min(1, dt * 6);
    },
    dispose: () => {
      tex.dispose();
      mat.dispose();
    },
  };
}

/** Pemain yang digambar: paling dekat lebih dulu, yang sedang tampil diberi keunggulan kecil. */
export function pilihTerdekat(daftar: PosisiPemain[], x: number, z: number, tampil: ReadonlySet<string>, maks = MAKS_TAMPIL): PosisiPemain[] {
  const jarak = (p: PosisiPemain): number => Math.hypot(p.x - x, p.z - z) - (tampil.has(p.id) ? KEUNGGULAN_TAMPIL : 0);
  return [...daftar].sort((a, b) => jarak(a) - jarak(b)).slice(0, maks);
}

function buatLabel(nama: string): Tampilan['label'] {
  const teks = nama.length > 14 ? `${nama.slice(0, 13)}…` : nama;
  const font = 'bold 64px "Baloo 2", "Segoe UI", Arial, sans-serif';
  const canvas = document.createElement('canvas');
  const tinggi = 96;
  const lebarTeks = (): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 200;
    ctx.font = font;
    return ctx.measureText(teks).width;
  };
  const lebar = Math.max(tinggi, Math.ceil(lebarTeks()) + 56);
  canvas.width = lebar;
  canvas.height = tinggi;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const r = tinggi / 2 - 2;
    ctx.fillStyle = 'rgba(23, 37, 84, 0.85)';
    ctx.beginPath();
    ctx.arc(r + 2, tinggi / 2, r, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.arc(lebar - r - 2, tinggi / 2, r, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(teks, lebar / 2, tinggi / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set((TINGGI_LABEL * lebar) / tinggi, TINGGI_LABEL, 1);
  return {
    sprite,
    dispose: () => {
      tex.dispose();
      mat.dispose();
    },
  };
}

export interface PengelolaPemainLain {
  /** Perbarui daftar pemain lain (tambah/hapus/perbarui). */
  set: (daftar: PosisiPemain[]) => void;
  /** Panggil tiap frame: animasi + interpolasi. */
  update: (dt: number) => void;
  /** Jumlah pemain lain yang sedang digambar. */
  jumlah: () => number;
  dispose: () => void;
}

export function createPengelolaPemainLain(
  scene: THREE.Scene,
  posisiSaya: THREE.Vector3,
): PengelolaPemainLain {
  const tampil = new Map<string, Tampilan>();
  // Server hanya mengirim kostum saat ada yang masuk/keluar noktah, bukan tiap gerakan.
  const kostumTeman = new Map<string, KostumPemain>();

  function tambah(p: PosisiPemain): Tampilan {
    const group = new THREE.Group();
    group.position.set(p.x, 0, p.z);
    group.rotation.y = p.rot;
    const label = buatLabel(p.nama);
    label.sprite.position.y = Y_LABEL;
    group.add(label.sprite);
    const balon = buatBalonSapa();
    balon.sprite.position.y = Y_BALON;
    group.add(balon.sprite);
    scene.add(group);

    const t: Tampilan = {
      id: p.id,
      group,
      model: null,
      dibuang: false,
      target: new THREE.Vector3(p.x, 0, p.z),
      targetRot: p.rot,
      kecepatan: 0,
      label,
      balon,
      sapaTerakhir: 0,
    };
    // Data dari jaringan dirapikan dulu; `{}` agar tidak jatuh ke kostum simpanan perangkat ini.
    void cobaAvatarGlb(p.gender, rapikanPilihan(p.gender, kostumTeman.get(p.id) ?? {}), TINGGI_PEMAIN).then((model) => {
      if (!model) return;
      if (t.dibuang) {
        model.dispose();
        return;
      }
      t.model = model;
      group.add(model.group);
    });
    return t;
  }

  function buang(t: Tampilan): void {
    t.dibuang = true;
    scene.remove(t.group);
    t.model?.dispose();
    t.label.dispose();
    t.balon.dispose();
  }

  function set(daftar: PosisiPemain[]): void {
    for (const p of daftar) if (p.kostum) kostumTeman.set(p.id, p.kostum);
    const terpilih = pilihTerdekat(daftar, posisiSaya.x, posisiSaya.z, new Set(tampil.keys()));
    const aktif = new Set(terpilih.map((p) => p.id));
    for (const [id, t] of tampil) {
      if (!aktif.has(id)) {
        buang(t);
        tampil.delete(id);
      }
    }
    for (const p of terpilih) {
      let t = tampil.get(p.id);
      if (!t) {
        t = tambah(p);
        tampil.set(p.id, t);
      }
      t.target.set(p.x, 0, p.z);
      t.targetRot = p.rot;
      if (p.sapa?.emoji && p.sapa.sampai !== t.sapaTerakhir) {
        t.sapaTerakhir = p.sapa.sampai;
        t.balon.tampilkan(p.sapa.emoji);
      }
    }
  }

  function update(dt: number): void {
    for (const t of tampil.values()) {
      const { x, z } = t.group.position;
      // Interpolasi posisi menuju target.
      t.group.position.x += (t.target.x - x) * Math.min(1, dt * 8);
      t.group.position.z += (t.target.z - z) * Math.min(1, dt * 8);
      // Interpolasi rotasi (shortest angle).
      let beda = t.targetRot - t.group.rotation.y;
      while (beda > Math.PI) beda -= Math.PI * 2;
      while (beda < -Math.PI) beda += Math.PI * 2;
      t.group.rotation.y += beda * Math.min(1, dt * 8);

      // Data datang terputus-putus: kecepatan dihaluskan agar Idle/Walk/Run tidak berkedip.
      if (dt > 0) {
        const sesaat = Math.hypot(t.group.position.x - x, t.group.position.z - z) / dt;
        t.kecepatan += (sesaat - t.kecepatan) * Math.min(1, dt * 6);
      }
      // Mode ringan: teman yang jauh membeku (skinning & mixer adalah biaya terbesar avatar).
      const jauh = modeRingan() && Math.hypot(t.group.position.x - posisiSaya.x, t.group.position.z - posisiSaya.z) > JARAK_ANIMASI_RINGAN;
      if (!jauh) t.model?.update(t.kecepatan, dt);
      t.balon.update(dt);
    }
  }

  function dispose(): void {
    for (const t of tampil.values()) buang(t);
    tampil.clear();
  }

  return { set, update, jumlah: () => tampil.size, dispose };
}

/** Posisi & rotasi pemain lokal (untuk dikirim ke server). */
export interface SnapshotPemain {
  x: number;
  z: number;
  rot: number;
}
