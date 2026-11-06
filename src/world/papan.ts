import * as THREE from 'three';

/**
 * Papan & label 3D bertekstur kanvas: papan nama balai, nametag tokoh, plakat
 * judul materi, dan lencana kode. Dipakai dunia balai dan gerbang.
 */

export function buildSign(text: string, accent: number, track: <T extends { dispose: () => void }>(o: T) => T): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const accentCss = `#${accent.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = '#fff7e6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 0, canvas.width, 14);
    ctx.fillRect(0, canvas.height - 14, canvas.width, 14);
    ctx.fillStyle = '#1f2937';
    // Huruf dikecilkan bila nama balai panjang, supaya tidak terpotong tepi.
    let ukuran = 46;
    ctx.font = `bold ${ukuran}px "Segoe UI", Arial, sans-serif`;
    while (ctx.measureText(text).width > canvas.width - 60 && ukuran > 24) {
      ukuran -= 2;
      ctx.font = `bold ${ukuran}px "Segoe UI", Arial, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const geo = track(new THREE.PlaneGeometry(3.4, 0.68));
  const mat = track(new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  return new THREE.Mesh(geo, mat);
}

/**
 * Papan nama dua baris untuk NPC: peran kecil di atas, nama tokoh di bawah.
 * Dipasang melayang di atas kepala Penjaga / Tokoh Materi.
 */
export function buildTag(
  peran: string,
  nama: string,
  accent: number,
  track: <T extends { dispose: () => void }>(o: T) => T,
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const accentCss = `#${accent.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = '#fff7e6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 0, canvas.width, 16);
    ctx.fillRect(0, canvas.height - 16, canvas.width, 16);

    ctx.fillStyle = accentCss;
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(peran.toUpperCase(), canvas.width / 2, 52);

    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 50px "Segoe UI", Arial, sans-serif';
    ctx.fillText(nama, canvas.width / 2, 124);
  }
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const geo = track(new THREE.PlaneGeometry(2.0, 0.75));
  const mat = track(new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  return new THREE.Mesh(geo, mat);
}

/**
 * Plakat judul materi di samping panggung diorama. Teks panjang dipotong
 * menjadi beberapa baris agar tetap terbaca dari jauh.
 */
export function buildPlakat(
  teks: string,
  accent: number,
  track: <T extends { dispose: () => void }>(o: T) => T,
): THREE.Mesh {
  // Kanvas lebar supaya judul panjang (mis. Siklus air) tidak terpotong.
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 288;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const accentCss = `#${accent.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 0, canvas.width, 20);
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    ctx.fillRect(0, 0, 20, canvas.height);
    ctx.fillRect(canvas.width - 20, 0, 20, canvas.height);

    ctx.fillStyle = accentCss;
    ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RUANG MATERI', canvas.width / 2, 56);

    ctx.fillStyle = '#fff7e6';
    const baris = susunBaris(ctx, teks, canvas.width - 130, 52, 3);
    const tinggiBaris = 62;
    const mulai = canvas.height / 2 + 24 - ((baris.length - 1) * tinggiBaris) / 2;
    baris.forEach((b, i) => ctx.fillText(b, canvas.width / 2, mulai + i * tinggiBaris));
  }
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const geo = track(new THREE.PlaneGeometry(3.3, 0.93));
  const mat = track(new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  return new THREE.Mesh(geo, mat);
}

/**
 * Menyusun teks menjadi baris-baris yang muat di lebar tertentu. Kata yang
 * sangat panjang dipotong paksa agar tidak melewati tepi papan.
 */
function susunBaris(
  ctx: CanvasRenderingContext2D,
  teks: string,
  lebar: number,
  ukuran: number,
  maksBaris: number,
): string[] {
  const pasang = (baris: string[]): void => {
    let ukuranCoba = ukuran;
    while (ukuranCoba > 28) {
      ctx.font = `bold ${ukuranCoba}px "Segoe UI", Arial, sans-serif`;
      if (baris.every((b) => ctx.measureText(b).width <= lebar)) break;
      ukuranCoba -= 2;
    }
  };

  const kata: string[] = [];
  for (const k of teks.split(/\s+/)) {
    if (!k) continue;
    let sisa = k;
    while (ctx.measureText(sisa).width > lebar && sisa.length > 4) {
      let potong = sisa.length - 1;
      while (potong > 1 && ctx.measureText(sisa.slice(0, potong)).width > lebar) potong--;
      kata.push(sisa.slice(0, potong));
      sisa = sisa.slice(potong);
    }
    kata.push(sisa);
  }

  const baris: string[] = [];
  let sekarang = '';
  for (const k of kata) {
    const coba = sekarang ? `${sekarang} ${k}` : k;
    if (ctx.measureText(coba).width > lebar && sekarang) {
      baris.push(sekarang);
      sekarang = k;
    } else {
      sekarang = coba;
    }
  }
  if (sekarang) baris.push(sekarang);

  // Bila baris melebihi batas, gabungkan ekor ke baris terakhir lalu perkecil huruf.
  if (baris.length > maksBaris) {
    const depan = baris.slice(0, maksBaris - 1);
    depan.push(baris.slice(maksBaris - 1).join(' '));
    pasang(depan);
    return depan;
  }
  pasang(baris);
  return baris;
}

/** Lencana kode (mis. "H01") berbentuk kotak berwarna. */
export function buildBadge(text: string, accent: number, track: <T extends { dispose: () => void }>(o: T) => T): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const accentCss = `#${accent.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const geo = track(new THREE.PlaneGeometry(0.9, 0.9));
  const mat = track(new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  return new THREE.Mesh(geo, mat);
}
