import type { RosterSiswa } from '../../net/klien';
import type { PlayerGender, Question } from '../../../shared/types';
import { getQuestionBankAsli } from '../../data/bank';
import { URUTAN_BALAI } from '../../data/cerita';
import { nilaiResmi, skorJawaban, starsForSkor, RULES } from '../../core/scoring';

/**
 * Kelas contoh untuk Mode Guru: 31 siswa rekaan dengan jawaban yang diambil
 * dari bank soal asli (termasuk pilihan pengecoh), supaya juri/guru bisa
 * melihat dasbor terisi tanpa server dan tanpa siswa sungguhan.
 * Data dibuat dari seed tetap, jadi selalu sama setiap kali dibuka.
 */

const NAMA: Array<[string, PlayerGender]> = [
  ['Ahmad Fauzi', 'laki-laki'], ['Aisyah Putri', 'perempuan'], ['Muhammad Rizky Pratama', 'laki-laki'],
  ['Siti Aminah', 'perempuan'], ['Budi Santoso', 'laki-laki'], ['Nabila Zahra', 'perempuan'],
  ['Dimas Arya Saputra', 'laki-laki'], ['Salsabila Ramadhani', 'perempuan'], ['Fajar Nugroho', 'laki-laki'],
  ['Dewi Lestari', 'perempuan'], ['Rafi Akbar', 'laki-laki'], ['Kirana Ayu Larasati', 'perempuan'],
  ['Yusuf Maulana', 'laki-laki'], ['Fatimah Azzahra', 'perempuan'], ['Bagus Setiawan', 'laki-laki'],
  ['Annisa Rahmawati', 'perempuan'], ['Arkan Hafidz', 'laki-laki'], ['Zahra Khairunnisa', 'perempuan'],
  ['Galih Prasetyo', 'laki-laki'], ['Alya Safitri', 'perempuan'], ['Ilham Ramadhan', 'laki-laki'],
  ['Intan Permatasari', 'perempuan'], ['Naufal Hakim', 'laki-laki'], ['Nadia Kusuma', 'perempuan'],
  ['Rendi Kurniawan', 'laki-laki'], ['Rania Salsabila Putri', 'perempuan'], ['Zidan Alfarizi', 'laki-laki'],
  ['Keisha Amalia', 'perempuan'], ['Hanif Abdullah', 'laki-laki'], ['Hana Maharani', 'perempuan'],
  ['Satria Wibowo', 'laki-laki'],
];

interface Jawab {
  questionId: string;
  balai: string;
  kodeMateri: string;
  correct: boolean;
  pilihan: string[];
  percobaan: number;
}

interface SiswaContoh {
  id: string;
  nama: string;
  gender: PlayerGender;
  online: boolean;
  /** Peluang menjawab benar tiap percobaan (0..1). */
  mahir: number;
  /** Jumlah balai yang sudah diselesaikan (sesuai URUTAN_BALAI). */
  selesai: number;
  /** Tahap balai yang sedang dikerjakan (1 misi, 2 cerita). */
  tahapKini: number;
  /** Balai terakhir gagal (0 bintang): siswa "tertahan" di situ. */
  tertahan: boolean;
  jawaban: Jawab[];
  bacaan: Record<string, { detik: number; ulang: number }>;
  finalBagian: number[];
  puncakLulus: boolean;
  diubahPada: number;
}

export interface KelasContoh {
  siswa(): RosterSiswa[];
  /** Satu siswa maju satu langkah (menyelesaikan balai / Final). */
  majukan(): void;
  ubahNama(id: string, nama: string): void;
  keluarkan(id: string): void;
}

/** PRNG kecil ber-seed (mulberry32) agar data contoh selalu sama. */
function acak(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buatKelasContoh(sekarang = Date.now()): KelasContoh {
  const r = acak(20251125);
  const bank = getQuestionBankAsli();
  const ambil = <T>(arr: T[]): T => arr[Math.floor(r() * arr.length)]!;

  /** Satu soal dijawab: salah memilih pengecoh (pengecoh pertama lebih sering = miskonsepsi kelas). */
  function jawabSoal(q: Question, mahir: number, balai: string, id = q.id): Jawab {
    const benar = String(q.answer);
    const pengecoh = (q.options ?? []).filter((o) => o !== benar);
    const pilihan: string[] = [];
    for (let n = 1; n <= RULES.attemptsPerQuestion; n++) {
      if (r() < mahir || pengecoh.length === 0) {
        pilihan.push(benar);
        return { questionId: id, balai, kodeMateri: q.meta.kodeMateri, correct: true, pilihan, percobaan: n };
      }
      const sisa = pengecoh.filter((o) => !pilihan.includes(o));
      pilihan.push(r() < 0.6 && !pilihan.includes(pengecoh[0]!) ? pengecoh[0]! : ambil(sisa.length ? sisa : pengecoh));
    }
    return { questionId: id, balai, kodeMateri: q.meta.kodeMateri, correct: false, pilihan, percobaan: RULES.attemptsPerQuestion };
  }

  /** Mengerjakan balai berikutnya; mengembalikan false bila gagal (0 bintang). */
  function kerjakanBalai(s: SiswaContoh): boolean {
    const kode = URUTAN_BALAI[s.selesai]!;
    const soal = bank.filter((q) => q.meta.kodeMateri === kode).slice(0, 5).sort(() => r() - 0.5).slice(0, RULES.questionsPerBalai);
    const hasil = soal.map((q) => jawabSoal(q, s.mahir, kode));
    s.jawaban.push(...hasil);
    // Kumpulan soal kecil (5 per balai) agar tiap soal dijawab banyak siswa, seperti satu kelas.
    // Siswa yang kurang mahir kadang membaca terlalu cepat.
    const detik = s.mahir < 0.55 && r() < 0.5 ? 15 + Math.round(r() * 20) : 45 + Math.round(r() * 150);
    s.bacaan[kode] = { detik, ulang: r() < 0.2 ? 1 : 0 };
    s.diubahPada = Date.now();
    if (starsForSkor(skorJawaban(hasil)) === 0) {
      s.tertahan = true;
      s.tahapKini = 2;
      return false;
    }
    s.tertahan = false;
    s.selesai += 1;
    s.tahapKini = r() < 0.5 ? 1 : 2;
    return true;
  }

  function kerjakanFinal(s: SiswaContoh): void {
    const soal = [...bank].sort(() => r() - 0.5).slice(0, RULES.questionsPuncak);
    const hasil = soal.map((q) => jawabSoal(q, Math.min(0.95, s.mahir + 0.1), 'FINAL', `final-${q.id}`));
    s.jawaban.push(...hasil);
    const ukuran = [8, 8, 7, 7];
    let i = 0;
    s.finalBagian = ukuran.map((u) => hasil.slice(i, (i += u)).filter((j) => j.correct).length);
    s.puncakLulus = s.finalBagian.reduce((a, b) => a + b, 0) >= 21;
    s.diubahPada = Date.now();
  }

  let daftar: SiswaContoh[] = NAMA.map(([nama, gender], i) => {
    // Sebagian kecil siswa kesulitan; sisanya cukup mahir.
    const mahir = r() < 0.2 ? 0.35 + r() * 0.2 : 0.8 + r() * 0.18;
    const s: SiswaContoh = {
      id: `contoh-${i + 1}`,
      nama,
      gender,
      online: r() < 0.85,
      mahir,
      selesai: 0,
      tahapKini: 0,
      tertahan: false,
      jawaban: [],
      bacaan: {},
      finalBagian: [0, 0, 0, 0],
      puncakLulus: false,
      diubahPada: sekarang,
    };
    // Siswa mahir sudah lebih jauh; ada yang baru mulai.
    const target = Math.min(URUTAN_BALAI.length, Math.floor(r() * 4 + mahir * 9));
    while (s.selesai < target && kerjakanBalai(s));
    if (s.selesai === URUTAN_BALAI.length && r() < mahir) kerjakanFinal(s);
    s.diubahPada = sekarang - Math.round(r() * 30 * 60000);
    return s;
  });

  function keRoster(s: SiswaContoh): RosterSiswa {
    const bintang: Record<string, 0 | 1 | 2 | 3> = {};
    const tahap: Record<string, number> = {};
    URUTAN_BALAI.forEach((kode, i) => {
      // Bintang = percobaan terakhir (ulangan setelah gagal); nilai resmi tetap percobaan pertama.
      const skor = skorJawaban(s.jawaban.filter((j) => j.balai === kode).slice(-RULES.questionsPerBalai));
      bintang[kode] = i < s.selesai ? starsForSkor(skor) : 0;
      tahap[kode] = i < s.selesai ? 3 : i === s.selesai ? s.tahapKini : 0;
    });
    const kini = URUTAN_BALAI[s.selesai] ?? null;
    const dikunjungi = URUTAN_BALAI.slice(0, s.selesai + (kini && s.tahapKini > 0 ? 1 : 0));
    const sudahFinal = s.jawaban.some((j) => j.balai === 'FINAL');
    const diubah = new Date(s.diubahPada).toISOString();
    return {
      id: s.id,
      nama: s.nama,
      gender: s.gender,
      online: s.online,
      joinedAt: new Date(sekarang - 45 * 60000).toISOString(),
      lastSeen: diubah,
      progress: {
        playerName: s.nama,
        gender: s.gender,
        noktah: s.online ? (kini ?? 'FINAL') : null,
        bintang,
        totalBenar: s.jawaban.filter((j) => j.correct).length,
        totalSoal: s.jawaban.length,
        visitedNoktah: sudahFinal ? [...dikunjungi, 'FINAL'] : dikunjungi,
        puncakLulus: s.puncakLulus,
        soalSalah: s.jawaban.filter((j) => !j.correct).map((j) => ({ questionId: j.questionId, kodeMateri: j.kodeMateri })),
        diubahPada: diubah,
        tahap,
        alat: s.selesai,
        bacaan: s.bacaan,
        jawaban: s.jawaban.map((j) => ({ q: j.questionId, k: j.kodeMateri, b: j.correct, p: j.pilihan, n: j.percobaan })),
        finalBagian: s.finalBagian,
        nilai: nilaiResmi(s.jawaban, URUTAN_BALAI),
      },
    };
  }

  return {
    siswa: () => daftar.map(keRoster),
    majukan: () => {
      const bisa = daftar.filter((s) => s.online && !s.puncakLulus && !s.jawaban.some((j) => j.balai === 'FINAL'));
      if (bisa.length === 0) return;
      const s = ambil(bisa);
      if (s.selesai < URUTAN_BALAI.length) kerjakanBalai(s);
      else kerjakanFinal(s);
    },
    ubahNama: (id, nama) => {
      const s = daftar.find((x) => x.id === id);
      if (s) s.nama = nama;
    },
    keluarkan: (id) => {
      daftar = daftar.filter((x) => x.id !== id);
    },
  };
}
