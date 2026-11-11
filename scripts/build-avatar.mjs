import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// GLTFExporter memakai FileReader (tersedia di browser) untuk merakit GLB.
// Node tidak punya, jadi dipolyfill minimal di sini.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    constructor() {
      this.result = null;
      this.onloadend = null;
      this.onerror = null;
    }
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(
        (buf) => {
          this.result = buf;
          this.onloadend?.();
        },
        (err) => {
          this.onerror?.(err);
        },
      );
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then(
        (buf) => {
          const b64 = Buffer.from(buf).toString('base64');
          this.result = `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
          this.onloadend?.();
        },
        (err) => {
          this.onerror?.(err);
        },
      );
    }
  };
}

/**
 * Membuat berkas avatar GLB dari geometri prosedural.
 *
 * Gaya: penjelajah cilik dengan
 *   - rompi safari krem berkolong saku,
 *   - ikat pinggang + kompas di pinggang,
 *   - tas punggung,
 *   - sepatu bot ringan.
 *
 * Bedanya per gender:
 *   - laki-laki : kaos putih, celana kargo gelap, rambut pendek.
 *   - perempuan : hijab teal, lengan panjang, celana kargo gelap (sesuai
 *                 prompt "player_female_hijab").
 *
 * Keluaran: `aset-sumber/models/player_male.glb` &
 *           `aset-sumber/models/player_female_hijab.glb` (lalu `npm run kompres:model`)
 *
 * Jalankan: `npm run build:avatar`
 *
 * Catatan: model tanpa animasi (klip Idle/Walk/Run). Animasi jalan tetap
 * ditangani `karakter.ts` untuk NPC; untuk pemain, `avatarModel.ts` akan
 * memakai jalur prosedural bila model tidak punya klip.
 */

const MODEL_DIR = resolve('aset-sumber/models');

/* ---------------- Palet ---------------- */

const WARNA = {
  kulit: 0xf0b98a,
  rambut: 0x2b1d16,
  hijab: 0x0f5e5e,
  kaos: 0xfdfaf3,
  rompi: 0xd8c39a,
  rompiGelap: 0xbda97f,
  celana: 0x2f3a4a,
  sepatu: 0x3b3f46,
  sepatuRenda: 0xf5f0e6,
  sabuk: 0x5a3f2b,
  logam: 0xc9a227,
  tas: 0x7a5c3c,
  tasGelap: 0x60472e,
  mata: 0x241b12,
  mataPutih: 0xffffff,
  lensa: 0x6fc8d8,
};

const mat = (warna, kasar = 0.78, logam = 0) =>
  new THREE.MeshStandardMaterial({ color: warna, roughness: kasar, metalness: logam });

/* ---------------- Pembangun karakter ---------------- */

function bangunKarakter(gender) {
  const perempuan = gender === 'perempuan';
  const root = new THREE.Group();
  root.name = perempuan ? 'player_female_hijab' : 'player_male';

  const mKulit = mat(WARNA.kulit, 0.7);
  const mKaos = mat(WARNA.kaos, 0.85);
  const mRompi = mat(WARNA.rompi, 0.8);
  const mRompiGelap = mat(WARNA.rompiGelap, 0.8);
  const mCelana = mat(WARNA.celana, 0.85);
  const mSepatu = mat(WARNA.sepatu, 0.5);
  const mSabuk = mat(WARNA.sabuk, 0.7);
  const mLogam = mat(WARNA.logam, 0.35, 0.7);
  const mTas = mat(WARNA.tas, 0.75);
  const mTasGelap = mat(WARNA.tasGelap, 0.75);
  const mMata = new THREE.MeshStandardMaterial({ color: WARNA.mata, roughness: 0.4 });
  const mMataPutih = new THREE.MeshStandardMaterial({ color: WARNA.mataPutih, roughness: 0.35 });
  const mRambut = mat(WARNA.rambut, 0.55);
  const mHijab = mat(WARNA.hijab, 0.62);

  const tambah = (geo, material, pos, rot, skala) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (skala) m.scale.set(...skala);
    m.castShadow = true;
    root.add(m);
    return m;
  };

  /* --- Bawah: kaki & sepatu --- */
  for (const sisi of [-1, 1]) {
    const x = sisi * 0.15;
    // Kaki celana kargo.
    tambah(new THREE.CapsuleGeometry(0.115, 0.5, 6, 14), mCelana, [x, 0.52, 0], undefined, [1, 1, 0.95]);
    // Saku kargo di sisi luar paha.
    tambah(new THREE.BoxGeometry(0.07, 0.14, 0.1), mRompiGelap, [x + sisi * 0.11, 0.58, 0.02]);
    // Sepatu bot.
    tambah(new THREE.BoxGeometry(0.23, 0.13, 0.34), mSepatu, [x, 0.075, 0.05]);
    tambah(new THREE.BoxGeometry(0.24, 0.045, 0.35), mat(WARNA.sepatuRenda, 0.8), [x, 0.145, 0.05]);
  }

  /* --- Pinggang: sabuk + kompas --- */
  tambah(new THREE.CylinderGeometry(0.315, 0.33, 0.09, 20), mSabuk, [0, 0.94, 0]);
  // Gesper.
  tambah(new THREE.BoxGeometry(0.1, 0.07, 0.03), mLogam, [0, 0.94, 0.315]);
  // Kompas di pinggang kanan.
  tambah(new THREE.CylinderGeometry(0.055, 0.055, 0.022, 18), mLogam, [0.285, 0.9, 0.16], [Math.PI / 2, 0, -0.25]);
  tambah(
    new THREE.CylinderGeometry(0.036, 0.036, 0.026, 16),
    mat(WARNA.lensa, 0.25),
    [0.285, 0.9, 0.163],
    [Math.PI / 2, 0, -0.25],
  );

  /* --- Badan --- */
  if (perempuan) {
    // Atasan lengan panjang + celana kargo (sesuai prompt avatar perempuan).
    tambah(new THREE.CylinderGeometry(0.3, 0.33, 0.62, 20), mKaos, [0, 1.32, 0]);
    tambah(new THREE.SphereGeometry(0.3, 20, 14), mKaos, [0, 1.62, 0], undefined, [1, 0.5, 1]);
    // Pinggul.
    tambah(new THREE.CylinderGeometry(0.3, 0.32, 0.24, 20), mCelana, [0, 1.03, 0]);
  } else {
    tambah(new THREE.CylinderGeometry(0.3, 0.32, 0.22, 20), mCelana, [0, 1.05, 0]);
    // Kaos putih.
    tambah(new THREE.CylinderGeometry(0.3, 0.32, 0.58, 20), mKaos, [0, 1.4, 0]);
    tambah(new THREE.SphereGeometry(0.3, 20, 14), mKaos, [0, 1.66, 0], undefined, [1, 0.5, 1]);
  }

  /* --- Rompi safari (dua panel depan + punggung) --- */
  const rompiY = perempuan ? 1.34 : 1.44;
  // Panel kiri & kanan depan (sedikit terbuka di tengah agar kaos terlihat).
  tambah(new THREE.BoxGeometry(0.16, 0.52, 0.1), mRompi, [-0.18, rompiY, 0.27], [0, 0.12, 0]);
  tambah(new THREE.BoxGeometry(0.16, 0.52, 0.1), mRompi, [0.18, rompiY, 0.27], [0, -0.12, 0]);
  // Punggung rompi.
  tambah(new THREE.BoxGeometry(0.4, 0.54, 0.1), mRompi, [0, rompiY, -0.25]);
  // Sambungan bahu.
  tambah(new THREE.BoxGeometry(0.14, 0.09, 0.5), mRompi, [-0.22, rompiY + 0.28, 0.01]);
  tambah(new THREE.BoxGeometry(0.14, 0.09, 0.5), mRompi, [0.22, rompiY + 0.28, 0.01]);
  // Saku rompi (dua di depan).
  tambah(new THREE.BoxGeometry(0.11, 0.09, 0.03), mRompiGelap, [-0.19, rompiY - 0.13, 0.325]);
  tambah(new THREE.BoxGeometry(0.11, 0.09, 0.03), mRompiGelap, [0.19, rompiY - 0.13, 0.325]);
  // Kerah.
  tambah(new THREE.BoxGeometry(0.2, 0.05, 0.09), mRompiGelap, [0, rompiY + 0.3, 0.22]);

  /* --- Lengan --- */
  for (const sisi of [-1, 1]) {
    const x = sisi * 0.34;
    const yLengan = 1.6;
    // Lengan: rompi (atas) lalu tangan/lengan panjang (bawah).
    tambah(new THREE.CapsuleGeometry(0.085, 0.24, 6, 12), mRompi, [x, yLengan - 0.14, 0], [0, 0, sisi * 0.06]);
    if (perempuan) {
      // Lengan panjang menutupi sampai pergelangan.
      tambah(new THREE.CapsuleGeometry(0.075, 0.2, 6, 12), mKaos, [x + sisi * 0.02, yLengan - 0.42, 0]);
    } else {
      tambah(new THREE.CapsuleGeometry(0.075, 0.18, 6, 12), mKulit, [x + sisi * 0.02, yLengan - 0.4, 0]);
    }
    // Tangan.
    tambah(new THREE.SphereGeometry(0.09, 12, 10), mKulit, [x + sisi * 0.03, yLengan - 0.6, 0]);
  }

  /* --- Tas punggung --- */
  tambah(new THREE.BoxGeometry(0.32, 0.36, 0.16), mTas, [0, 1.42, -0.38]);
  tambah(new THREE.BoxGeometry(0.26, 0.12, 0.06), mTasGelap, [0, 1.32, -0.46]);
  // Tali tas.
  for (const sisi of [-1, 1]) {
    tambah(new THREE.BoxGeometry(0.05, 0.42, 0.03), mTasGelap, [sisi * 0.15, 1.42, 0.24], [0.12, 0, 0]);
  }

  /* --- Kepala --- */
  tambah(new THREE.CylinderGeometry(0.11, 0.12, 0.12, 14), mKulit, [0, 1.83, 0]);
  tambah(new THREE.SphereGeometry(0.29, 26, 22), mKulit, [0, 2.12, 0], undefined, [1, 1.08, 0.95]);

  // Mata.
  for (const x of [-0.1, 0.1]) {
    tambah(new THREE.SphereGeometry(0.042, 12, 10), mMataPutih, [x, 2.14, 0.255], undefined, [1, 1.15, 0.7]);
    tambah(new THREE.SphereGeometry(0.042, 12, 10), mMata, [x, 2.14, 0.278], undefined, [0.62, 0.72, 0.6]);
  }
  // Hidung kecil.
  tambah(new THREE.SphereGeometry(0.035, 10, 8), mKulit, [0, 2.09, 0.28]);

  if (perempuan) {
    // Hijab: bola hampir penuh dengan bukaan muka.
    tambah(
      new THREE.SphereGeometry(0.375, 28, 22, Math.PI / 2 + 0.32, Math.PI * 2 - 0.64, 0, Math.PI * 0.66),
      mHijab,
      [0, 2.12, 0],
      undefined,
      [1, 1.12, 1.06],
    );
    // Selendang menutup dada.
    tambah(new THREE.CylinderGeometry(0.35, 0.46, 0.42, 20), mHijab, [0, 1.72, 0]);
    // Bingkai muka.
    tambah(new THREE.TorusGeometry(0.3, 0.045, 10, 26), mHijab, [0, 2.12, 0.05], undefined, [1, 1.15, 1]);
  } else {
    // Rambut pendek.
    tambah(
      new THREE.SphereGeometry(0.305, 24, 18, 0, Math.PI * 2, 0, Math.PI / 1.7),
      mRambut,
      [0, 2.15, 0],
      undefined,
      [1, 1.05, 1],
    );
    // Poni depan.
    tambah(new THREE.BoxGeometry(0.34, 0.07, 0.1), mRambut, [0, 2.3, 0.2]);
  }

  return root;
}

/* ---------------- Ekspor ---------------- */

async function ekspor(nama, gender) {
  const root = bangunKarakter(gender);
  // Pastikan transformasi sudah dihitung sebelum kotak pembatas.
  root.updateMatrixWorld(true);
  const kotak = new THREE.Box3().setFromObject(root);
  // Geser supaya alas tepat di y = 0 dan sumbu X/Z terpusat.
  const pusat = kotak.getCenter(new THREE.Vector3());
  root.position.set(-pusat.x, -kotak.min.y, -pusat.z);

  const exporter = new GLTFExporter();
  const hasil = await exporter.parseAsync(root, { binary: true });
  const buffer = hasil;
  const path = `${MODEL_DIR}/${nama}`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, new Uint8Array(buffer));

  const ukuran = new THREE.Vector3();
  new THREE.Box3().setFromObject(root).getSize(ukuran);
  console.log(`[avatar] ${nama} → ${(buffer.byteLength / 1024).toFixed(1)} KB, tinggi ${ukuran.y.toFixed(2)}`);
}

async function main() {
  await ekspor('player_male.glb', 'laki-laki');
  await ekspor('player_female_hijab.glb', 'perempuan');
  console.log('[avatar] selesai');
}

main().catch((err) => {
  console.error('[avatar] GAGAL:', err);
  process.exitCode = 1;
});
