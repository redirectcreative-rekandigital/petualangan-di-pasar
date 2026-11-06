import * as THREE from 'three';
import { buatKarakter, type KarakterRig } from './karakter';
import type { PosisiPemain } from '../../shared/net';

/**
 * Pengelola "pemain lain" di dunia noktah (mode multiplayer).
 *
 * Setiap siswa lain digambar sebagai karakter ghost (tanpa collision), lengkap
 * dengan label nama melayang dan balon sapaan emoji sementara. Posisi
 * diperbarui secara halus (interpolasi) agar gerak terlihat mulus meski data
 * datang 8x per detik.
 */

interface Ghost {
  id: string;
  rig: KarakterRig;
  group: THREE.Group;
  /** Posisi target (dari jaringan). */
  target: THREE.Vector3;
  targetRot: number;
  label: THREE.Sprite;
  labelMat: THREE.SpriteMaterial;
  balon: THREE.Sprite;
  balonMat: THREE.SpriteMaterial;
  balonSampai: number;
  emojiTerakhir: string;
  fase: number;
}

export interface PengelolaPemainLain {
  /** Perbarui daftar pemain lain (tambah/hapus/perbarui). */
  set: (daftar: PosisiPemain[]) => void;
  /** Panggil tiap frame: animasi + interpolasi. */
  update: (dt: number, elapsed: number) => void;
  /** Jumlah pemain lain yang sedang digambar. */
  jumlah: () => number;
  dispose: () => void;
}

export function createPengelolaPemainLain(scene: THREE.Scene): PengelolaPemainLain {
  const ghosts = new Map<string, Ghost>();
  const disposables: { dispose: () => void }[] = [];

  function buatLabel(nama: string): { sprite: THREE.Sprite; mat: THREE.SpriteMaterial } {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(23, 37, 84, 0.85)';
      const r = 40;
      ctx.beginPath();
      ctx.moveTo(r, 8);
      ctx.lineTo(canvas.width - r, 8);
      ctx.arcTo(canvas.width - 8, 8, canvas.width - 8, r, r);
      ctx.lineTo(canvas.width - 8, canvas.height - r);
      ctx.arcTo(canvas.width - 8, canvas.height - 8, canvas.width - r, canvas.height - 8, r);
      ctx.lineTo(r, canvas.height - 8);
      ctx.arcTo(8, canvas.height - 8, 8, canvas.height - r, r);
      ctx.lineTo(8, r);
      ctx.arcTo(8, 8, r, 8, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 54px "Baloo 2", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const teks = nama.length > 14 ? `${nama.slice(0, 13)}…` : nama;
      ctx.fillText(teks, canvas.width / 2, canvas.height / 2 + 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4.2, 1.05, 1);
    disposables.push(tex, mat);
    return { sprite, mat };
  }

  function buatBalon(): { sprite: THREE.Sprite; mat: THREE.SpriteMaterial } {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🙂', 64, 68);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.6, 1.6, 1);
    disposables.push(tex, mat);
    return { sprite, mat };
  }

  function gambarEmoji(canvas: HTMLCanvasElement, emoji: string): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji || '🙂', 64, 68);
  }

  function tambah(p: PosisiPemain, indeks: number): Ghost {
    const rig = buatKarakter({ gender: p.gender, pakaiMarker: false, skala: 1 });
    rig.geometri.forEach((g) => disposables.push(g));
    rig.material.forEach((m) => disposables.push(m));
    const group = rig.group;
    group.position.set(p.x, 0, p.z);

    const { sprite: label, mat: labelMat } = buatLabel(p.nama);
    label.position.y = 3.3;
    group.add(label);

    const balon = buatBalon();
    balon.sprite.position.y = 4.1;
    group.add(balon.sprite);

    scene.add(group);
    const ghost: Ghost = {
      id: p.id,
      rig,
      group,
      target: new THREE.Vector3(p.x, 0, p.z),
      targetRot: p.rot,
      label,
      labelMat,
      balon: balon.sprite,
      balonMat: balon.mat,
      balonSampai: 0,
      emojiTerakhir: '',
      fase: indeks * 0.9,
    };
    if (p.sapa && p.sapa.sampai > Date.now()) {
      terapkanSapa(ghost, p.sapa.emoji, p.sapa.sampai);
    }
    return ghost;
  }

  function terapkanSapa(g: Ghost, emoji: string, sampai: number): void {
    if (emoji !== g.emojiTerakhir) {
      gambarEmoji(g.balonMat.map?.image as HTMLCanvasElement, emoji);
      if (g.balonMat.map) g.balonMat.map.needsUpdate = true;
      g.emojiTerakhir = emoji;
    }
    g.balonSampai = sampai;
  }

  function hapus(g: Ghost): void {
    scene.remove(g.group);
  }

  function set(daftar: PosisiPemain[]): void {
    const aktif = new Set(daftar.map((p) => p.id));
    // Hapus yang sudah tidak ada.
    for (const [id, g] of ghosts) {
      if (!aktif.has(id)) {
        hapus(g);
        ghosts.delete(id);
      }
    }
    // Tambah / perbarui.
    daftar.forEach((p, i) => {
      let g = ghosts.get(p.id);
      if (!g) {
        g = tambah(p, i);
        ghosts.set(p.id, g);
      }
      g.target.set(p.x, 0, p.z);
      g.targetRot = p.rot;
      if (p.sapa && p.sapa.sampai > Date.now()) {
        terapkanSapa(g, p.sapa.emoji, p.sapa.sampai);
      }
    });
  }

  function update(dt: number, elapsed: number): void {
    const now = Date.now();
    for (const g of ghosts.values()) {
      // Interpolasi posisi menuju target.
      g.group.position.x += (g.target.x - g.group.position.x) * Math.min(1, dt * 8);
      g.group.position.z += (g.target.z - g.group.position.z) * Math.min(1, dt * 8);
      // Interpolasi rotasi (shortest angle).
      let beda = g.targetRot - g.group.rotation.y;
      while (beda > Math.PI) beda -= Math.PI * 2;
      while (beda < -Math.PI) beda += Math.PI * 2;
      g.group.rotation.y += beda * Math.min(1, dt * 8);

      // Animasi jalan sederhana berdasarkan jarak ke target.
      const jarak = Math.hypot(g.target.x - g.group.position.x, g.target.z - g.group.position.z);
      g.rig.langkah(jarak > 0.15 ? 4 : 0, elapsed + g.fase);

      // Balon sapaan memudar saat kedaluwarsa.
      const sisa = g.balonSampai - now;
      const target = sisa > 0 ? 1 : 0;
      g.balonMat.opacity += (target - g.balonMat.opacity) * Math.min(1, dt * 6);
    }
  }

  function dispose(): void {
    for (const g of ghosts.values()) hapus(g);
    ghosts.clear();
    disposables.forEach((d) => d.dispose());
  }

  return { set, update, jumlah: () => ghosts.size, dispose };
}

/** Posisi & rotasi pemain lokal (untuk dikirim ke server). */
export interface SnapshotPemain {
  x: number;
  z: number;
  rot: number;
}
