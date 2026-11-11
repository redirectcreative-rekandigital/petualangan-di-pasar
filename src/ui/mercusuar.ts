import { sfx } from '../core/sound';
import { applyPuncakResult, catatFinalBagian } from '../core/state';
import { getQuestionsByBalai } from '../data/bank';
import { getBalai } from '../data/balai';
import { BATAS_LULUS_FINAL, CERITA, EPILOG, FINAL_BAGIAN, getCerita, type TokohCerita } from '../data/cerita';
import { kostumDari } from '../core/kostumPemain';
import { createInputManager } from '../input/controls';
import { createMercusuarWorld, type MercusuarHandle } from '../world/mercusuarWorld';
import { muatModeKamera, modeBerikut, simpanModeKamera } from '../world/camera';
import { createHud } from './hud';
import { showToast } from './dialog';
import { bukaPercakapan, type Percakapan } from './percakapan';
import { jalankanTantangan } from './tantangan';
import { bukaHalamanCerita } from './halamanCerita';
import { putarCutscene } from './cutscene';
import type { Question } from '../../shared/types';
import type { ScreenContext } from './screens/context';
import { t } from '../core/bahasa';
import { catatFrame } from '../core/kualitas';
import { tampilkanLoading } from './loading';
import { pantauOverlay } from './pantauOverlay';

/**
 * Final "Malam Badai di Mercusuar Tua" sebagai dunia 3D: pemain membuka pintu
 * masuk, naik tangga melingkar, dan menjawab soal tiap lantai di depan pintu
 * yang terkunci. 30 soal, lulus bila total benar ≥ 21; lantai di bawah 70%
 * diulang lewat pilihan di Puncak Lampu.
 */

export interface SesiMercusuar {
  sibuk: boolean;
  world: MercusuarHandle;
  interaksi: () => Promise<void>;
  cleanup: () => void;
}

const poolBagian = (i: number): Question[] => {
  const b = FINAL_BAGIAN[i];
  return b ? getQuestionsByBalai('FINAL').filter((q) => b.kode.includes(q.meta.kodeMateri)) : [];
};
const batasBagian = (i: number): number => Math.ceil(poolBagian(i).length * 0.7);
function penjagaBagian(i: number): TokohCerita {
  const nama = FINAL_BAGIAN[i]?.penjaga[0];
  return CERITA.find((c) => c.penjaga.nama === nama)?.penjaga ?? (CERITA[0] as (typeof CERITA)[number]).penjaga;
}
const PUNCAK = FINAL_BAGIAN.length - 1;

export function bukaMercusuar(opsi: {
  app: HTMLElement;
  ctx: ScreenContext;
  onMenu: () => void;
  onTas: () => void;
  onBintang: () => void;
}): SesiMercusuar {
  const { app, ctx } = opsi;
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('aria-label', t('Mercusuar Tua'));
  app.append(canvas);

  const skor = (i: number): number => ctx.getProgress().finalBagian[i] ?? 0;
  const tuntas = (i: number): boolean => skor(i) >= batasBagian(i);
  const lulus0 = ctx.getProgress().puncakLulus;
  // Lantai yang sudah dijawab pada kunjungan ini: pintunya terbuka walau belum 70%.
  const dijawab = new Set<number>();
  const keadaan = { masukTerbuka: false, terbuka: FINAL_BAGIAN.slice(0, PUNCAK).map((_, i) => lulus0 || tuntas(i)) };

  const input = createInputManager();
  const world = createMercusuarWorld({ canvas, input, getProgress: ctx.getProgress, keadaan, lampuMenyala: lulus0, quality: { pixelRatioCap: 1.5, fogNear: 22, fogFar: 70 } });
  let modeKamera = muatModeKamera();
  const labelKamera = (): string => ({ normal: t('Normal'), dekat: t('Dekat'), tangan: t('Tangan') })[modeKamera];
  const hud = createHud({
    onInteract: () => void interaksi(),
    onMenu: opsi.onMenu,
    onTas: opsi.onTas,
    onBintang: opsi.onBintang,
    onLompat: () => {
      if (!sesi.sibuk) input.pressJump();
    },
    onKunciLari: () => {
      sfx.click();
      input.toggleLari();
    },
    onKamera: () => {
      sfx.click();
      modeKamera = modeBerikut(modeKamera);
      simpanModeKamera(modeKamera);
      world.setModeKamera(modeKamera);
      hud.setModeKamera(labelKamera());
    },
  });
  world.setModeKamera(modeKamera);
  hud.setModeKamera(labelKamera());
  hud.setOnline(false);
  app.append(hud.root);
  input.mountJoystick(hud.root.querySelector('.joystick-host') as HTMLElement);
  hud.updateStats(ctx.getProgress());

  const perbaruiMisi = (): void => {
    const total = ctx.getProgress().finalBagian.reduce((a, b) => a + b, 0);
    const lantai = FINAL_BAGIAN.findIndex((_, i) => i < PUNCAK && !keadaan.terbuka[i]);
    const teks = ctx.getProgress().puncakLulus
      ? t('Lampu Mercusuar sudah menyala!')
      : !keadaan.masukTerbuka
        ? t('Buka pintu Mercusuar Tua.')
        : lantai >= 0
          ? t('Naik ke {tempat} dan buka pintunya.', { tempat: FINAL_BAGIAN[lantai]?.tempat ?? '' })
          : t('Naik ke Puncak Lampu dan nyalakan lampunya.');
    hud.setMisi(`🗼 ${teks} (${total}/30)`, ctx.getProgress().puncakLulus ? 3 : 2);
  };

  async function denganPercakapan<T>(lantai: number, fn: (p: Percakapan) => Promise<T>): Promise<T> {
    sesi.sibuk = true;
    world.npcBicara(lantai);
    const prog = ctx.getProgress();
    const p = bukaPercakapan(app, { nama: prog.playerName || t('Penjelajah'), gender: prog.gender, kostum: kostumDari(prog) });
    try {
      return await fn(p);
    } finally {
      p.tutup();
      sesi.sibuk = false;
      world.npcBicara(null);
      perbaruiMisi();
    }
  }

  /** Menjawab soal satu lantai. `false` bila ditutup lewat ✕ (tidak dicatat). */
  const mainLantai = (i: number): Promise<boolean> =>
    denganPercakapan(i, async (p) => {
      const b = FINAL_BAGIAN[i];
      if (!b) return false;
      const penjaga = penjagaBagian(i);
      const pool = poolBagian(i);
      let benar = 0;
      world.setLampuPintu(i, pool.length, 0);
      await p.bicara(penjaga, t('{tempat}. {pembuka} Pintu ini terkunci. Jawab {v2} soal dengan benar untuk membukanya!', { tempat: b.tempat, pembuka: b.pembuka, v2: batasBagian(i) }), {
        labelLanjut: t('Bismillah ▶'),
      });
      if (p.tertutup()) return false;
      const hasil = await jalankanTantangan(p, {
        balai: 'FINAL',
        pool,
        jumlah: pool.length,
        penjaga,
        pembuka: [],
        label: b.tempat,
        onPercobaan: (ok) => world.jawab(ok),
        onSoalSelesai: (ok) => {
          if (ok) benar++;
          world.setLampuPintu(i, pool.length, benar);
        },
        ingatCerita: async (kodeMateri, adegan) => {
          const c = getCerita(kodeMateri);
          const m = getBalai(kodeMateri);
          if (!c || !m) return;
          p.root.classList.add('tersembunyi');
          await bukaHalamanCerita(document.body, { cerita: c, meta: m, mulaiDari: adegan, modeIngat: true });
          p.root.classList.remove('tersembunyi');
        },
      });
      if (p.tertutup()) return false;
      // Jawaban dicatat tiap lantai supaya tidak hilang bila pemain keluar sebelum puncak.
      ctx.setProgress(applyPuncakResult(catatFinalBagian(ctx.getProgress(), i, hasil.benar), false, hasil.jawaban));
      dijawab.add(i);
      if (i === PUNCAK) return true;
      world.setPintu(i, true);
      await p.bicara(
        penjaga,
        hasil.benar >= batasBagian(i)
          ? t('Alhamdulillah! Pintunya terbuka. {selesai}', { selesai: b.selesai })
          : t('{benar} dari {total} benar. Pintunya terbuka sedikit. Lantai ini perlu diulang nanti, tapi kita terus naik dulu.', { benar: hasil.benar, total: hasil.total }),
        { labelLanjut: t('Naik ▶') },
      );
      return true;
    });

  /** Di Puncak Lampu: lulus bila total ≥ 21, bila belum pilih lantai untuk diulang. */
  async function nilaiPuncak(): Promise<void> {
    const total = ctx.getProgress().finalBagian.reduce((a, b) => a + b, 0);
    if (total >= BATAS_LULUS_FINAL) {
      sesi.sibuk = true;
      ctx.setProgress(applyPuncakResult(ctx.getProgress(), true, []));
      world.nyalakanLampu();
      sfx.win();
      await new Promise((r) => window.setTimeout(r, 1600));
      await putarCutscene(document.body, EPILOG);
      ctx.navigate('result');
      return;
    }
    sfx.lose();
    const belum = FINAL_BAGIAN.map((_, i) => i).filter((i) => !tuntas(i));
    const pilihan = await denganPercakapan(PUNCAK, (p) =>
      p.pilih(penjagaBagian(PUNCAK), [...belum.map((i) => `🔁 ${FINAL_BAGIAN[i]?.tempat ?? ''}`), t('Nanti saja')], {
        teks: t('Total benar {total}/30, perlu {batas}. Ulangi lantai yang belum tuntas, lalu naik lagi ke sini.', { total, batas: BATAS_LULUS_FINAL }),
        gaya: 'balas',
      }),
    );
    const i = belum[pilihan];
    if (i === undefined) return;
    dijawab.delete(i);
    if (i === PUNCAK) {
      if (await mainLantai(i)) await nilaiPuncak();
      return;
    }
    world.setPintu(i, false);
    world.pindahKePintu(i);
    perbaruiMisi();
  }

  async function interaksi(): Promise<void> {
    const near = world.getNearby();
    if (sesi.sibuk || !near) return;
    world.animasiInteraksi();
    if (near.jenis === 'masuk') {
      sfx.click();
      world.bukaPintuMasuk();
      perbaruiMisi();
      showToast(t('Naiki tangga melingkar sampai pintu pertama.'), 2600);
    } else if (near.jenis === 'peta') {
      ctx.navigate('map');
    } else if (near.jenis === 'pintu') {
      await mainLantai(near.lantai);
    } else if (ctx.getProgress().puncakLulus) {
      ctx.navigate('result');
    } else if (dijawab.has(PUNCAK) || tuntas(PUNCAK) || (await mainLantai(PUNCAK))) {
      await nilaiPuncak();
    }
  }

  const labelAksi = (): string => {
    const near = world.getNearby();
    if (!near) return '🅰️';
    if (near.jenis === 'masuk') return t('🚪 Buka Pintu');
    if (near.jenis === 'peta') return t('🗺️ Ke Peta');
    if (near.jenis === 'pintu') return t('🔒 Buka Pintu ({jumlah} soal)', { jumlah: poolBagian(near.lantai).length });
    if (ctx.getProgress().puncakLulus) return t('🎓 Lihat Sertifikat');
    return dijawab.has(PUNCAK) || tuntas(PUNCAK) ? t('💡 Nyalakan Lampu') : t('💡 Nyalakan Lampu ({jumlah} soal)', { jumlah: poolBagian(PUNCAK).length });
  };

  let raf = 0;
  let last = performance.now();
  let elapsed = 0;
  let kunciLariSampai = 0;
  let ditutup = false;
  const overlay = pantauOverlay();
  const loop = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    input.endFrame();
    const sibuk = sesi.sibuk || overlay.adaOverlay();
    if (!sibuk && input.state.interactPressed) void interaksi();
    if (overlay.tertutupPenuh()) {
      raf = requestAnimationFrame(loop);
      return;
    }
    catatFrame(now);
    world.setPaused(sibuk);
    world.update(dt, elapsed);
    hud.setInteractVisible(world.getNearby() !== null && !sibuk, labelAksi());
    const titik = world.layarDekat();
    if (titik) hud.setInteractPos(titik.x, titik.y);
    if (input.state.moving) kunciLariSampai = now + 2500;
    hud.setKunciLari(!sibuk && (input.state.lari || now < kunciLariSampai), input.state.lari);
    raf = requestAnimationFrame(loop);
  };

  const sesi: SesiMercusuar = {
    sibuk: false,
    world,
    interaksi,
    cleanup: () => {
      ditutup = true;
      cancelAnimationFrame(raf);
      overlay.lepas();
      input.destroy();
      world.dispose();
      hud.destroy();
    },
  };
  perbaruiMisi();
  // Loading bertahan sampai avatar & penjaga termuat dan shader siap.
  const loading = tampilkanLoading(app, { pesan: t('Mendaki Mercusuar Tua...') });
  void world
    .siapkan()
    .catch((err: unknown) => console.error(err))
    .then(() => {
      loading.tutup();
      if (ditutup) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    });
  return sesi;
}
