import { el } from './components/dom';
import { sfx } from '../core/sound';
import { RULES } from '../core/scoring';
import { startSession, currentQuestion, submitAnswer, type SessionState } from '../core/engine';
import { adeganUntukSoal, getAdegan, getAdeganAsli } from '../data/adegan';
import { soalAsli } from '../data/bank';
import { t, tk, keAsli } from '../core/bahasa';
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

const PUJIAN = (): string[] => [t('Masya Allah, tepat sekali!'), t('Benar! Kamu teliti.'), t('Bagus sekali, jawabanmu benar!'), t('Tepat! Ilmumu bertambah.')];
const SEMANGAT = (): string[] => [t('Belum tepat, jangan menyerah.'), t('Hampir! Coba pikirkan lagi.'), t('Belum benar. Tenang, coba sekali lagi.')];

function pilihAcak<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/** Deretan hati nyawa: ❤️ masih ada, 🤍 sudah hilang. */
function hati(sisa: number): HTMLElement {
  const wadah = el('div', {
    class: 'nyawa',
    attrs: { role: 'img', 'aria-label': t('Sisa nyawa {sisa} hati dari {total}', { sisa, total: RULES.attemptsPerQuestion }) },
  });
  for (let i = 0; i < RULES.attemptsPerQuestion; i++) {
    wadah.append(el('span', { class: i < sisa ? 'ada' : 'hilang', text: i < sisa ? '❤️' : '🤍', attrs: { 'aria-hidden': 'true' } }));
  }
  return wadah;
}

/** Kalimat sisa nyawa yang enak dibacakan TTS, mis. "Hatimu tinggal 2." */
function teksSisaHati(sisa: number): string {
  if (sisa === 1) return t('Hatimu tinggal satu, pelan-pelan ya.');
  if (sisa === 2) return t('Hatimu tinggal dua.');
  return t('Hatimu tinggal {sisa}.', { sisa });
}

/**
 * Kalimat cerita yang paling cocok untuk menjelaskan jawaban. Pencocokan
 * memakai teks asli (Bahasa Indonesia), lalu hasilnya diterjemahkan.
 */
function kalimatPenjelas(kodeMateri: string, q: Question): string | null {
  const daftar = getAdeganAsli(kodeMateri);
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
  return skor >= 1 && terbaik ? tk(terbaik) : null;
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
    const qAsli = soalAsli(q.id) ?? q;
    const adeganIdx = adeganUntukSoal(kodeMateri, `${qAsli.prompt} ${String(qAsli.answer)}`);
    const judulAdegan = getAdegan(kodeMateri)[adeganIdx]?.judul;
    const dipilih: string[] = [];
    const opsiJawab = q.options ?? [];

    let lanjut = true;
    while (lanjut && !p.tertutup()) {
      const kepala = el('div', {
        class: 'tantangan-kepala',
        children: [
          el('span', { class: 'chip', text: `${opsi.label ? `${opsi.label} · ` : ''}${t('Soal {n}/{total}', { n: nomor + 1, total })}` }),
          hati(sesi.attemptsLeft),
        ],
      });
      const teksSoal = dipilih.length === 0 && pembuka ? `${pembuka} ${q.prompt}` : q.prompt;
      const i = await p.pilih(opsi.penjaga, opsiJawab, { teks: teksSoal, tambahan: kepala, gaya: 'jawab' });
      // Ditutup lewat tombol ✕: jangan catat jawaban kosong sebagai salah.
      if (p.tertutup()) break;
      const jawaban = opsiJawab[i] ?? '';
      // Catatan untuk guru selalu memakai teks pilihan Bahasa Indonesia
      // (diambil dari soal asli berdasarkan urutan pilihan).
      dipilih.push(qAsli.options?.[i] ?? keAsli(jawaban));
      const hasil = submitAnswer(sesi, jawaban);
      sesi = hasil.session;
      opsi.onPercobaan?.(hasil.correct, hasil.correct || hasil.advanced ? 0 : sesi.attemptsLeft);

      if (hasil.correct) {
        p.tandai(i, 'benar');
        sfx.correct();
        const penjelas = kalimatPenjelas(kodeMateri, qAsli);
        await p.bicara(opsi.penjaga, `${pilihAcak(PUJIAN())} ${t('Jawabannya: {jawaban}.', { jawaban: String(q.answer) })}${penjelas ? ` ${penjelas}` : ''}`, {
          tambahan: el('div', { class: 'tantangan-kepala', children: [el('span', { class: 'chip benar', text: t('✅ Benar') })] }),
        });
        lanjut = false;
      } else if (hasil.advanced) {
        p.tandai(i, 'salah');
        sfx.wrong();
        const penjelas = kalimatPenjelas(kodeMateri, qAsli);
        await p.bicara(
          opsi.penjaga,
          `${t('Hatimu sudah habis. Tidak apa-apa, kita belajar bersama. Jawaban yang benar adalah: {jawaban}.', { jawaban: String(q.answer) })}${penjelas ? ` ${penjelas}` : ''}`,
          { tambahan: hati(0) },
        );
        lanjut = false;
      } else {
        p.tandai(i, 'salah');
        sfx.wrong();
        const petunjuk = judulAdegan ? t('Ingat adegan "{judul}" di Halaman Cerita?', { judul: judulAdegan }) : t('Baca soalnya pelan-pelan sekali lagi.');
        const tombol = opsi.ingatCerita && judulAdegan ? [t('🔁 Coba lagi'), t('📖 Ingat cerita')] : [t('🔁 Coba lagi')];
        const pilihan = await p.pilih(opsi.penjaga, tombol, {
          teks: `${pilihAcak(SEMANGAT())} ${teksSisaHati(sesi.attemptsLeft)} ${petunjuk}`,
          tambahan: hati(sesi.attemptsLeft),
        });
        if (p.tertutup()) break;
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
