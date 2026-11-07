import { el } from './components/dom';
import { sfx } from '../core/sound';
import { RULES } from '../core/scoring';
import { startSession, currentQuestion, submitAnswer, type SessionState } from '../core/engine';
import { adeganUntukSoal, getAdegan } from '../data/adegan';
import type { Percakapan } from './percakapan';
import type { TokohCerita } from '../data/cerita';
import type { AnswerRecord, BalaiId, Question } from '../../shared/types';

/**
 * Tantangan soal pilihan ganda yang dibawakan Penjaga dalam percakapan.
 *
 * - Setiap soal dibuka dengan kalimat yang mengaitkannya dengan misi.
 * - Tiga kesempatan ditampilkan sebagai 3 hati (❤️ = nyawa); satu hilang (🤍)
 *   tiap jawaban salah. Teks yang dibacakan (TTS) ikut menyebut sisa hati.
 * - Jawaban salah → petunjuk yang merujuk adegan Halaman Cerita, dengan tombol
 *   "Ingat cerita" untuk membuka adegan itu.
 * - Jawaban benar → pujian + satu kalimat pembahasan dari cerita.
 * - Semua pilihan & jumlah percobaan dicatat untuk dasbor guru.
 */

export interface OpsiTantangan {
  balai: BalaiId;
  /** Kode materi untuk mencari adegan (FINAL: kode materi per soal). */
  pool: Question[];
  jumlah: number;
  penjaga: TokohCerita;
  pembuka: string[];
  /** Membuka adegan cerita (mode ingat). Bila tidak ada, tombol disembunyikan. */
  ingatCerita?: (kodeMateri: string, adegan: number) => Promise<void>;
  /** Dipanggil setelah tiap soal selesai (untuk efek visual di dunia 3D). */
  onSoalSelesai?: (benar: boolean, indeks: number) => void;
  /** Dipanggil pada SETIAP percobaan jawaban (benar/salah) beserta sisa hati. */
  onPercobaan?: (benar: boolean, sisaHati: number) => void;
  /** Label kemajuan (mis. "Bagian 2"). */
  label?: string;
}

export interface HasilTantangan {
  benar: number;
  total: number;
  jawaban: AnswerRecord[];
}

const PUJIAN = ['Masya Allah, tepat sekali!', 'Benar! Kamu teliti.', 'Bagus sekali, jawabanmu benar!', 'Tepat! Ilmumu bertambah.'];
const SEMANGAT = ['Belum tepat, jangan menyerah.', 'Hampir! Coba pikirkan lagi.', 'Belum benar. Tenang, coba sekali lagi.'];

function pilihAcak<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/** Deretan hati nyawa: ❤️ masih ada, 🤍 sudah hilang. */
function hati(sisa: number): HTMLElement {
  const wadah = el('div', {
    class: 'nyawa',
    attrs: { role: 'img', 'aria-label': `Sisa nyawa ${sisa} hati dari ${RULES.attemptsPerQuestion}` },
  });
  for (let i = 0; i < RULES.attemptsPerQuestion; i++) {
    wadah.append(el('span', { class: i < sisa ? 'ada' : 'hilang', text: i < sisa ? '❤️' : '🤍', attrs: { 'aria-hidden': 'true' } }));
  }
  return wadah;
}

/** Kalimat sisa nyawa yang enak dibacakan TTS, mis. "Hatimu tinggal 2." */
function teksSisaHati(sisa: number): string {
  return sisa === 1 ? 'Hatimu tinggal satu, pelan-pelan ya.' : `Hatimu tinggal ${sisa === 2 ? 'dua' : sisa}.`;
}

/** Kalimat cerita yang paling cocok untuk menjelaskan jawaban. */
function kalimatPenjelas(kodeMateri: string, q: Question): string | null {
  const daftar = getAdegan(kodeMateri);
  if (daftar.length === 0) return null;
  const teks = `${q.prompt} ${String(q.answer)}`.toLowerCase();
  const jawab = String(q.answer).toLowerCase();
  let terbaik: string | null = null;
  let skor = 0;
  for (const a of daftar) {
    for (const n of a.narasi) {
      const t = n.toLowerCase();
      let s = t.includes(jawab) ? 5 : 0;
      for (const k of a.kata) if (teks.includes(k.toLowerCase()) && t.includes(k.toLowerCase())) s += 1;
      if (s > skor) {
        skor = s;
        terbaik = n;
      }
    }
  }
  return skor >= 1 ? terbaik : null;
}

export async function jalankanTantangan(p: Percakapan, opsi: OpsiTantangan): Promise<HasilTantangan> {
  let sesi: SessionState = startSession(opsi.balai, opsi.pool);
  // Batasi jumlah soal sesuai permintaan (FINAL per bagian memakai pool khusus).
  if (sesi.questions.length > opsi.jumlah) sesi = { ...sesi, questions: sesi.questions.slice(0, opsi.jumlah) };
  const total = sesi.questions.length;
  const catatan: AnswerRecord[] = [];

  while (!p.tertutup()) {
    const q = currentQuestion(sesi);
    if (!q) break;
    const nomor = sesi.index;
    const pembuka = opsi.pembuka[nomor % Math.max(1, opsi.pembuka.length)] ?? '';
    const kodeMateri = q.meta.kodeMateri;
    const adeganIdx = adeganUntukSoal(kodeMateri, `${q.prompt} ${String(q.answer)}`);
    const judulAdegan = getAdegan(kodeMateri)[adeganIdx]?.judul;
    const dipilih: string[] = [];
    const opsiJawab = q.options ?? [];

    let lanjut = true;
    while (lanjut && !p.tertutup()) {
      const kepala = el('div', {
        class: 'tantangan-kepala',
        children: [
          el('span', { class: 'chip', text: `${opsi.label ? `${opsi.label} · ` : ''}Soal ${nomor + 1}/${total}` }),
          hati(sesi.attemptsLeft),
        ],
      });
      const teksSoal = dipilih.length === 0 && pembuka ? `${pembuka} ${q.prompt}` : q.prompt;
      const i = await p.pilih(opsi.penjaga, opsiJawab, { teks: teksSoal, tambahan: kepala, gaya: 'jawab' });
      const jawaban = opsiJawab[i] ?? '';
      dipilih.push(jawaban);
      const hasil = submitAnswer(sesi, jawaban);
      sesi = hasil.session;
      opsi.onPercobaan?.(hasil.correct, hasil.correct || hasil.advanced ? 0 : sesi.attemptsLeft);

      if (hasil.correct) {
        p.tandai(i, 'benar');
        sfx.correct();
        const penjelas = kalimatPenjelas(kodeMateri, q);
        await p.bicara(opsi.penjaga, `${pilihAcak(PUJIAN)} Jawabannya: ${String(q.answer)}.${penjelas ? ` ${penjelas}` : ''}`, {
          tambahan: el('div', { class: 'tantangan-kepala', children: [el('span', { class: 'chip benar', text: '✅ Benar' })] }),
        });
        lanjut = false;
      } else if (hasil.advanced) {
        p.tandai(i, 'salah');
        sfx.wrong();
        const penjelas = kalimatPenjelas(kodeMateri, q);
        await p.bicara(
          opsi.penjaga,
          `Hatimu sudah habis. Tidak apa-apa, kita belajar bersama. Jawaban yang benar adalah: ${String(q.answer)}.${penjelas ? ` ${penjelas}` : ''}`,
          { tambahan: hati(0) },
        );
        lanjut = false;
      } else {
        p.tandai(i, 'salah');
        sfx.wrong();
        const petunjuk = judulAdegan ? `Ingat adegan "${judulAdegan}" di Halaman Cerita?` : 'Baca soalnya pelan-pelan sekali lagi.';
        const tombol = opsi.ingatCerita && judulAdegan ? ['🔁 Coba lagi', '📖 Ingat cerita'] : ['🔁 Coba lagi'];
        const pilihan = await p.pilih(opsi.penjaga, tombol, {
          teks: `${pilihAcak(SEMANGAT)} ${teksSisaHati(sesi.attemptsLeft)} ${petunjuk}`,
          tambahan: hati(sesi.attemptsLeft),
        });
        if (pilihan === 1 && opsi.ingatCerita) {
          await opsi.ingatCerita(kodeMateri, adeganIdx);
        }
      }
    }

    // Lengkapi catatan jawaban untuk guru: urutan pilihan & jumlah percobaan.
    const rec = sesi.answered[sesi.answered.length - 1];
    if (rec && rec.questionId === q.id) {
      catatan.push({ ...rec, pilihan: dipilih, percobaan: dipilih.length, waktu: new Date().toISOString() });
      opsi.onSoalSelesai?.(rec.correct, nomor);
    }
  }

  return { benar: catatan.filter((c) => c.correct).length, total, jawaban: catatan };
}
