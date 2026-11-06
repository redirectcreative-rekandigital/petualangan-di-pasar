import { el } from '../components/dom';
import { sfx } from '../../core/sound';
import { applyPuncakResult, catatFinalBagian, isPuncakUnlocked } from '../../core/state';
import { getQuestionsByBalai } from '../../data/bank';
import { getBalai } from '../../data/balai';
import { BATAS_LULUS_FINAL, CERITA, EPILOG, FINAL_BAGIAN, getCerita, type TokohCerita } from '../../data/cerita';
import { bukaPercakapan } from '../percakapan';
import { jalankanTantangan } from '../tantangan';
import { bukaHalamanCerita } from '../halamanCerita';
import { putarCutscene } from '../cutscene';
import type { AnswerRecord, Question } from '../../../shared/types';
import type { ScreenContext } from './context';

/**
 * Final Chapter: "Malam Badai di Mercusuar Tua".
 *
 * 30 soal campuran dibagi 4 bagian (lantai menara) mengikuti urutan bab.
 * Lulus bila total benar ≥ 21 (70%). Bila belum lulus, siswa cukup mengulang
 * bagian yang skornya belum mencapai 70%, bukan dari awal.
 */

function poolBagian(i: number): Question[] {
  const bagian = FINAL_BAGIAN[i];
  if (!bagian) return [];
  return getQuestionsByBalai('FINAL').filter((q) => bagian.kode.includes(q.meta.kodeMateri));
}

function penjagaBagian(i: number): TokohCerita {
  const bagian = FINAL_BAGIAN[i];
  const nama = bagian?.penjaga[0];
  return CERITA.find((c) => c.penjaga.nama === nama)?.penjaga ?? (CERITA[0] as (typeof CERITA)[number]).penjaga;
}

function batasBagian(i: number): number {
  return Math.ceil(poolBagian(i).length * 0.7);
}

export function renderFinal(ctx: ScreenContext): HTMLElement {
  const root = el('section', { class: 'screen final-screen' });

  if (!isPuncakUnlocked(ctx.getProgress())) {
    root.append(
      el('div', {
        class: 'card jujur',
        children: [el('span', { class: 'label-kecil', text: '🔒 Masih Terkunci' }), el('p', { text: 'Mercusuar Tua terbuka setelah 11 alat survival terkumpul.' })],
      }),
      el('button', { class: 'btn block', text: '🗺️ Kembali ke Peta', attrs: { type: 'button' }, on: { click: () => ctx.navigate('map') } }),
    );
    return root;
  }

  const menara = el('div', { class: 'menara' });
  const status = el('div', { class: 'final-status' });
  const aksi = el('div', { class: 'stack' });
  root.append(
    el('div', {
      class: 'final-kepala',
      children: [el('h2', { text: '🗼 Mercusuar Tua' }), el('p', { class: 'muted', text: 'Malam badai. Nyalakan lampu sebelum kapal penyelamat lewat!' })],
    }),
    menara,
    status,
    aksi,
  );

  const gambarMenara = (): void => {
    const prog = ctx.getProgress();
    menara.innerHTML = '';
    menara.append(el('div', { class: `menara-lampu ${prog.puncakLulus ? 'nyala' : ''}`, text: prog.puncakLulus ? '💡' : '🔦' }));
    for (let i = FINAL_BAGIAN.length - 1; i >= 0; i--) {
      const b = FINAL_BAGIAN[i];
      if (!b) continue;
      const skor = prog.finalBagian[i] ?? 0;
      const jumlah = poolBagian(i).length;
      const tuntas = skor >= batasBagian(i);
      menara.append(
        el('div', {
          class: `menara-lantai ${tuntas ? 'tuntas' : skor > 0 ? 'belum' : ''}`,
          children: [
            el('strong', { text: `${b.tempat}` }),
            el('span', { text: b.penjaga.join(', ') }),
            el('span', { class: 'chip', text: `${skor}/${jumlah}${tuntas ? ' ✅' : ''}` }),
          ],
        }),
      );
    }
    const total = prog.finalBagian.reduce((a, b) => a + b, 0);
    status.textContent = `Total benar: ${total}/30 · batas lulus ${BATAS_LULUS_FINAL}`;
  };

  const tombolAksi = (): void => {
    aksi.innerHTML = '';
    const prog = ctx.getProgress();
    const belum = FINAL_BAGIAN.map((_, i) => i).filter((i) => (prog.finalBagian[i] ?? 0) < batasBagian(i));
    const pernahMain = prog.finalBagian.some((n) => n > 0);
    if (!prog.puncakLulus) {
      const label = !pernahMain ? '🌩️ Mulai Malam Badai (30 soal)' : `🔁 Ulangi lantai yang belum tuntas (${belum.length})`;
      aksi.append(
        el('button', {
          class: 'btn block',
          text: label,
          attrs: { type: 'button' },
          on: { click: () => void main(pernahMain ? belum : FINAL_BAGIAN.map((_, i) => i)) },
        }),
      );
    } else {
      aksi.append(
        el('button', { class: 'btn block', text: '🎓 Lihat Sertifikat', attrs: { type: 'button' }, on: { click: () => ctx.navigate('result') } }),
        el('button', {
          class: 'btn secondary block',
          text: '🔁 Main lagi untuk latihan',
          attrs: { type: 'button' },
          on: { click: () => void main(FINAL_BAGIAN.map((_, i) => i), true) },
        }),
      );
    }
    aksi.append(el('button', { class: 'btn ghost block', text: '🗺️ Kembali ke Peta', attrs: { type: 'button' }, on: { click: () => ctx.navigate('map') } }));
  };

  async function main(bagianDimainkan: number[], latihan = false): Promise<void> {
    sfx.click();
    aksi.innerHTML = '';
    const prog0 = ctx.getProgress();
    const p = bukaPercakapan(document.body, { nama: prog0.playerName, gender: prog0.gender });
    const semuaJawaban: AnswerRecord[] = [];
    try {
      for (const i of bagianDimainkan) {
        const b = FINAL_BAGIAN[i];
        if (!b || p.tertutup()) break;
        const penjaga = penjagaBagian(i);
        await p.bicara(penjaga, `${b.tempat}. ${b.pembuka}`, { labelLanjut: 'Bismillah ▶' });
        const pool = poolBagian(i);
        const hasil = await jalankanTantangan(p, {
          balai: 'FINAL',
          pool,
          jumlah: pool.length,
          penjaga,
          pembuka: [],
          label: b.tempat,
          ingatCerita: async (kodeMateri, adegan) => {
            const c = getCerita(kodeMateri);
            const m = getBalai(kodeMateri);
            if (!c || !m) return;
            p.root.classList.add('tersembunyi');
            await bukaHalamanCerita(document.body, { cerita: c, meta: m, mulaiDari: adegan, modeIngat: true });
            p.root.classList.remove('tersembunyi');
          },
        });
        semuaJawaban.push(...hasil.jawaban);
        if (!latihan) ctx.setProgress(catatFinalBagian(ctx.getProgress(), i, hasil.benar));
        gambarMenara();
        const tuntas = hasil.benar >= batasBagian(i);
        await p.bicara(penjaga, tuntas ? `Alhamdulillah! ${b.selesai}` : `${hasil.benar} dari ${hasil.total} benar. Lantai ini perlu diulang nanti, tapi kita terus naik dulu.`);
      }
    } finally {
      p.tutup();
    }

    const prog = ctx.getProgress();
    const total = prog.finalBagian.reduce((a, b) => a + b, 0);
    const lulus = total >= BATAS_LULUS_FINAL;
    const sudahLulus = prog.puncakLulus;
    ctx.setProgress(applyPuncakResult(prog, lulus || sudahLulus, semuaJawaban));
    gambarMenara();
    if (lulus && !sudahLulus && !latihan) {
      sfx.win();
      await putarCutscene(document.body, EPILOG);
      ctx.navigate('result');
      return;
    }
    if (!lulus) sfx.lose();
    tombolAksi();
  }

  gambarMenara();
  tombolAksi();
  return root;
}
