/**
 * Tipe bersama (dipakai engine, layar, dan bank soal).
 * Salinan TS dari skema zod di src/data/schema.ts.
 *
 * Versi 4: struktur "peta noktah + balai".
 *
 * - Peta besar menampilkan N-OKTAH: satu noktah per kode materi TKA (B01..D02).
 * - Tiap noktah punya 1..beberapa BALAI (sub-materi/rumah) di dalamnya. Setiap
 *   balai berisi soal-soal. Untuk saat ini tiap noktah berisi 1 balai.
 * - Satu noktah khusus (`FINAL`) untuk babak puncak "Pasar Ramai".
 */

/** Kode materi pada peta TKA. */
export type MateriKode =
  | 'B01'
  | 'B02'
  | 'B03'
  | 'B04'
  | 'B05'
  | 'B06'
  | 'G01'
  | 'G02'
  | 'G03'
  | 'G04'
  | 'G05'
  | 'G06'
  | 'G07'
  | 'G08'
  | 'D01'
  | 'D02';

/** Jenis kelamin karakter yang dipilih pemain. */
export type PlayerGender = 'laki-laki' | 'perempuan';

/** Elemen peta TKA. */
export type Elemen = 'Bilangan' | 'Geometri' | 'Data';

/** Level kognitif untuk penyusunan soal. */
export type LevelKognitif = 'Pemahaman' | 'Penerapan' | 'Penalaran';

export type TingkatKesulitan = 'Mudah' | 'Sedang' | 'Sulit';

/**
 * Identitas belajar.
 * - `MateriKode`: satu noktah pada peta besar (materi TKA).
 * - `FINAL`: babak puncak "Pasar Ramai".
 *
 * `BalaiId` kini menunjuk pada **satu balai (sub-materi)** di dalam sebuah
 * noktah. Karena untuk saat ini satu noktah berisi satu balai, id balai sama
 * dengan kode materinya (mis. 'B02'). Bila nanti satu noktah berisi beberapa
 * balai, id balai memakai pola `KODE-1`, `KODE-2`, dst.
 */
export type NoktahId = MateriKode | 'FINAL';
export type BalaiId = NoktahId | string;

export type QuestionType = 'mcq' | 'mcq-complex' | 'number' | 'tf-reason' | 'money-drag';

export interface QuestionData {
  kind: 'table' | 'bar' | 'picture';
  labels: string[];
  values: number[];
  unit?: string;
}

/** Metadata TKA yang melekat pada setiap soal. */
export interface QuestionMeta {
  kodeMateri: MateriKode;
  elemen: Elemen;
  submateri: string;
  indikator: string;
  levelKognitif: LevelKognitif;
  tingkatKesulitan: TingkatKesulitan;
}

export interface Question {
  id: string;
  /** Balai tempat soal ini muncul. */
  balai: BalaiId;
  type: QuestionType;
  prompt: string;
  /** Data tabel/diagram/piktogram pendukung. */
  data?: QuestionData;
  /** Pilihan untuk tipe mcq / mcq-complex. */
  options?: string[];
  /**
   * Kunci jawaban utama:
   * - mcq: string (teks opsi benar)
   * - mcq-complex: string[] (semua teks opsi benar)
   * - number: number
   * - tf-reason: 'Benar' | 'Salah'
   * - money-drag: number (total kembalian)
   */
  answer: number | string | string[];
  /** Untuk money-drag: nilai total kembalian yang harus disusun. */
  moneyTarget?: number;
  /** Tahap alasan pada tipe tf-reason. */
  reasonOptions?: string[];
  reasonAnswer?: string;
  hint: string;
  explanation: string[];
  /** Satuan jawaban angka, mis. 'Rp' atau 'kg'. */
  unit?: string;
  meta: QuestionMeta;
}

/** Definisi satu balai (rumah/sub-materi) di dalam sebuah noktah. */
export interface BalaiMeta {
  /** id balai; untuk saat ini sama dengan kode noktah (mis. 'B02'). */
  kode: BalaiId;
  /** Noktah induk tempat balai ini berada. */
  noktah: NoktahId;
  /** Nama halus bergaya game (mis. "Balai Berbagi Adil"). */
  nama: string;
  /** Nama penjaga balai (mis. "Bu Jumlah"); menentukan sosok NPC. */
  penjaga: string;
  /** Judul materi asli TKA (untuk bacaan & laporan guru). */
  materi: string;
  elemen: Elemen;
  /** Urutan di dalam noktahnya (0-based). */
  urutan: number;
  /** Ringkasan bacaan 1 halaman ringkas (paragraf). */
  bacaan: string[];
  /** Contoh singkat yang dibahas di bacaan. */
  contoh: string;
  /** Pelajaran/mini-tips di akhir bacaan. */
  kunciJawab: string;
  soalPerMain: number;
}

/** Definisi satu noktah pada peta besar = satu kode materi TKA. */
export interface NoktahMeta {
  kode: NoktahId;
  /** Nama halus bergaya game yang dibaca anak (mis. "Pojok Hitung Cepat"). */
  nama: string;
  /** Judul materi asli (untuk guru/laporan). */
  materi: string;
  elemen: Elemen;
  /** Posisi noktah pada peta besar (persen 0..100 dari kiri/atas). */
  peta: { x: number; y: number };
  /** Balai (rumah/sub-materi) di dalam noktah ini. */
  balai: BalaiMeta[];
}

/** Bintang per balai: 0..3. */
export type Stars = 0 | 1 | 2 | 3;

export interface BalaiProgress {
  stars: Stars;
  bestScore: number;
  correct: number;
  total: number;
  unlocked: boolean;
}

export interface AnswerRecord {
  questionId: string;
  balai: BalaiId;
  kodeMateri: MateriKode;
  correct: boolean;
  usedHint: boolean;
}

export interface Progress {
  playerName: string;
  /** Jenis kelamin karakter yang dipilih pemain. */
  gender: PlayerGender;
  /** Apakah pemain sudah melewati layar pembuka (cover, karakter, nama). */
  introDone: boolean;
  coins: number;
  /** Noktah yang pernah dimasuki (minimal dibuka sekali). */
  visitedNoktah: NoktahId[];
  /** Balai yang sudah terbuka. */
  unlocked: BalaiId[];
  balai: Record<string, BalaiProgress>;
  answers: AnswerRecord[];
  puncakLulus: boolean;
  completedAt?: string;
  /** Token kelas untuk mode multiplayer (kosong = singleplayer). */
  token?: string;
}
