import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createCameraController, modeBerikut, muatModeKamera, simpanModeKamera, titikKeLayar } from '../src/world/camera';

const TARGET = new THREE.Vector3(2, 0, 3);

function jalankan(ctrl: ReturnType<typeof createCameraController>, frame: number): void {
  for (let i = 0; i < frame; i++) ctrl.update(TARGET, 1 / 30);
}

describe('kamera percakapan', () => {
  it('mendekat ke bidikan, lalu kembali ke posisi semula', () => {
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    const ctrl = createCameraController(camera);
    ctrl.setYaw(0.7);
    jalankan(ctrl, 300);
    const normal = camera.position.clone();

    const posisi = new THREE.Vector3(5, 1.7, 5);
    ctrl.setFokus({ posisi, lihat: new THREE.Vector3(3, 0.3, 3) });
    jalankan(ctrl, 300);
    expect(camera.position.distanceTo(posisi)).toBeLessThan(0.01);
    expect(ctrl.getYaw()).toBe(0.7);

    ctrl.setFokus(null);
    jalankan(ctrl, 300);
    expect(camera.position.distanceTo(normal)).toBeLessThan(0.01);
  });

  it('tidak melompat pada frame pertama', () => {
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    const ctrl = createCameraController(camera);
    jalankan(ctrl, 300);
    const awal = camera.position.clone();
    ctrl.setFokus({ posisi: new THREE.Vector3(5, 1.7, 5), lihat: new THREE.Vector3(3, 0.3, 3) });
    jalankan(ctrl, 1);
    expect(camera.position.distanceTo(awal)).toBeLessThan(0.5);
  });
});

describe('mode kamera', () => {
  const buat = () => {
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    return { camera, ctrl: createCameraController(camera) };
  };

  it('Dekat lebih dekat dari Normal, Tangan tepat di mata tanpa tertinggal saat berjalan', () => {
    const { camera, ctrl } = buat();
    jalankan(ctrl, 300);
    const jarakNormal = camera.position.distanceTo(TARGET);
    ctrl.setMode('dekat');
    jalankan(ctrl, 300);
    expect(camera.position.distanceTo(TARGET)).toBeLessThan(jarakNormal * 0.6);
    expect(ctrl.diMataPemain()).toBe(false);

    ctrl.setMode('tangan');
    jalankan(ctrl, 300);
    expect(ctrl.diMataPemain()).toBe(true);
    const lain = new THREE.Vector3(3, 0, 3);
    ctrl.update(lain, 1 / 30);
    expect(camera.position.distanceTo(new THREE.Vector3(3, 1.25, 3))).toBeLessThan(0.001);
    ctrl.update(lain, 1 / 30, 0.8);
    expect(camera.position.y).toBeCloseTo(2.05);
  });

  it('percakapan di mode Tangan melepas sudut mata agar kepala tampil', () => {
    const { ctrl } = buat();
    ctrl.setMode('tangan');
    jalankan(ctrl, 300);
    ctrl.setFokus({ posisi: new THREE.Vector3(5, 1.7, 5), lihat: new THREE.Vector3(3, 0.3, 3) });
    jalankan(ctrl, 300);
    expect(ctrl.diMataPemain()).toBe(false);
    ctrl.setFokus(null);
    jalankan(ctrl, 300);
    expect(ctrl.diMataPemain()).toBe(true);
  });

  it('berganti melingkar dan tersimpan; nilai asing kembali Normal', () => {
    expect([modeBerikut('normal'), modeBerikut('dekat'), modeBerikut('tangan')]).toEqual(['dekat', 'tangan', 'normal']);
    simpanModeKamera('dekat');
    expect(muatModeKamera()).toBe('dekat');
    localStorage.setItem('ksp.kamera.v1', 'aneh');
    expect(muatModeKamera()).toBe('normal');
  });
});

describe('titikKeLayar', () => {
  it('titik di layar tetap di posisinya', () => {
    expect(titikKeLayar(new THREE.Vector3(0, 0, 0.5), 800, 800)).toEqual({ x: 400, y: 400 });
  });

  it('titik di luar layar dan di belakang kamera dijepit di dalam batas', () => {
    expect(titikKeLayar(new THREE.Vector3(5, 0, 0.5), 800, 800).x).toBe(670);
    // Di belakang kamera proyeksinya terbalik: x positif berarti di sisi kiri.
    expect(titikKeLayar(new THREE.Vector3(0.5, 0, 1.2), 800, 800).x).toBe(130);
  });
});
