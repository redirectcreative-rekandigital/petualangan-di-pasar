import type { NoktahId, Progress, Stars } from '../../shared/types';
import type { ProgresSiswa } from '../../shared/net';

/**
 * Meringkas progres lokal menjadi bentuk ringkas untuk dikirim ke server
 * (dasbor guru). Fungsi ini murni sehingga mudah diuji.
 */
export function ringkasProgres(progress: Progress, noktah: NoktahId | null = null): ProgresSiswa {
  const bintang: Record<string, Stars> = {};
  // Bintang untuk semua balai (agar dasbor tahu capaian tiap balai).
  for (const [kode, p] of Object.entries(progress.balai)) {
    bintang[kode] = p.stars;
  }

  // Hitung total benar/salah dari jawaban yang tercatat (sumber otoritatif),
  // supaya balai yang belum dikerjakan tidak ikut menambah total.
  let totalBenar = 0;
  let totalSoal = 0;
  const soalSalah: Array<{ questionId: string; kodeMateri: string }> = [];
  for (const a of progress.answers) {
    totalSoal += 1;
    if (a.correct) totalBenar += 1;
    else soalSalah.push({ questionId: a.questionId, kodeMateri: a.kodeMateri });
  }
  // Bila belum ada catatan jawaban (mis. progres lama), jatuh ke ringkasan balai
  // yang benar-benar punya bintang/bestScore.
  if (totalSoal === 0) {
    for (const p of Object.values(progress.balai)) {
      if (p.stars > 0 || p.bestScore > 0) {
        totalBenar += p.correct;
        totalSoal += p.total;
      }
    }
  }

  return {
    playerName: progress.playerName,
    gender: progress.gender,
    noktah,
    bintang,
    totalBenar,
    totalSoal,
    visitedNoktah: progress.visitedNoktah,
    puncakLulus: progress.puncakLulus,
    soalSalah,
    diubahPada: new Date().toISOString(),
    tahap: Object.fromEntries(
      Object.keys(progress.balai).map((k) => [k, progress.balai[k] && progress.balai[k].stars > 0 ? 3 : (progress.misi?.[k] ?? 0)]),
    ),
    alat: progress.alat?.length ?? 0,
    bacaan: progress.bacaan ?? {},
    // Batasi 400 jawaban terakhir agar pesan tetap kecil.
    jawaban: progress.answers.slice(-400).map((a) => ({
      q: a.questionId,
      k: a.kodeMateri,
      b: a.correct,
      p: a.pilihan ?? [],
      n: a.percobaan ?? (a.correct ? 1 : 3),
    })),
    finalBagian: progress.finalBagian ?? [],
  };
}
