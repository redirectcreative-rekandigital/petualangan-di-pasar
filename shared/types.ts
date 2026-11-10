/**
 * Tipe bersama (dipakai engine, layar, dan bank soal).
 * Salinan TS dari skema zod di src/data/schema.ts.
 *
 * Versi 5: struktur "kitab noktah + balai" untuk game IPA Kelas 5 SD/MI
 * "Survival Sains".
 *
 * - Peta besar berbentuk kitab berisi 11 NOKTAH materi IPA, dikelompokkan ke
 *   3 zona (Makhluk Hidup `H`, Fisika `F`, Bumi `E`).
 * - Tiap noktah punya 1 BALAI (rumah penjaga) di dalamnya. Setiap balai
 *   memiliki 2 tokoh: Penjaga (misi/dialog) dan Tokoh Materi (membawakan
 *   materi utuh) serta sebuah diagram interaktif.
 * - Satu noktah khusus (`FINAL`) untuk babak puncak "Menara Kitab".
 */

/** Kode materi pada peta: 11 noktah IPA (H=Makhluk Hidup, F=Fisika, E=Bumi). */
export type MateriKode =
  | 'H01'
  | 'H02'
  | 'H03'
  | 'H04'
  | 'F01'
  | 'F02'
  | 'F03'
  | 'F04'
  | 'E01'
  | 'E02'
  | 'E03';

/** Jenis kelamin karakter yang dipilih pemain. */
export type PlayerGender = 'laki-laki' | 'perempuan';

/** Elemen (kelompok materi) pada peta kitab. */
export type Elemen = 'Makhluk Hidup' | 'Fisika' | 'Bumi';

/** Level kognitif untuk penyusunan soal. */
export type LevelKognitif = 'Pemahaman' | 'Penerapan' | 'Penalaran';

export type TingkatKesulitan = 'Mudah' | 'Sedang' | 'Sulit';

/**
 * Identitas belajar.
 * - `MateriKode`: satu noktah pada peta besar.
 * - `FINAL`: babak puncak "Menara Kitab".
 *
 * `BalaiId` menunjuk pada **satu balai (rumah penjaga)** di dalam sebuah
 * noktah. Karena satu noktah berisi satu balai, id balai sama dengan kode
 * materinya (mis. 'F01').
 */
export type NoktahId = MateriKode | 'FINAL';
export type BalaiId = NoktahId | string;

/** Semua soal berjenis pilihan ganda (A–D). */
export type QuestionType = 'mcq';

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
  /** Pilihan untuk tipe mcq (A–D). */
  options?: string[];
  /** Kunci jawaban: teks opsi benar. */
  answer: number | string | string[];
  hint: string;
  explanation: string[];
  meta: QuestionMeta;
}

/** Satu poin materi berjudul (mis. "Merambat lurus" + penjelasan). */
export interface MateriPoin {
  /** Judul poin (mis. "Merambat lurus"). */
  judul: string;
  /** Penjelasan poin. */
  teks: string;
}

/** Satu bagian pada diagram interaktif (mis. "Kornea"). */
export interface DiagramBagian {
  /** Nama bagian (label pada diagram). */
  nama: string;
  /** Fungsi bagian tersebut. */
  fungsi: string;
  /** Penanda posisi pada gambar SVG (opsional, dipakai komponen diagram). */
  posisi?: { x: number; y: number };
}

/** Diagram materi interaktif milik sebuah balai. */
export interface DiagramMateri {
  /** Judul diagram (mis. "Bagian Mata dan Fungsinya"). */
  judul: string;
  /** Bentuk dasar diagram yang digambar secara prosedural. */
  bentuk: string;
  /** Bagian-bagian yang bisa diklik beserta fungsinya. */
  bagian: DiagramBagian[];
}

/** Tokoh materi: NPC kedua yang membawakan materi utuh di balai. */
export interface TokohMateri {
  /** Nama tokoh (mis. "Profesor Prisma"). */
  nama: string;
  /** Kalimat pengantar sebelum materi ditampilkan. */
  pengantar: string;
}

/** Definisi satu balai (rumah penjaga) di dalam sebuah noktah. */
export interface BalaiMeta {
  /** id balai; sama dengan kode noktah (mis. 'F01'). */
  kode: BalaiId;
  /** Noktah induk tempat balai ini berada. */
  noktah: NoktahId;
  /** Nama halus bergaya game (mis. "Balai Cahaya"). */
  nama: string;
  /** Nama penjaga (mis. "Bu Cahaya"); menentukan sosok NPC pertama. */
  penjaga: string;
  /** Kalimat dialog penjaga saat pemain mendekat. */
  dialogPenjaga: string;
  /** Tokoh materi (NPC kedua) pembawa materi utuh. */
  tokohMateri: TokohMateri;
  /** Judul materi asli (untuk bacaan & laporan guru). */
  materi: string;
  elemen: Elemen;
  /** Urutan di dalam noktahnya (0-based). */
  urutan: number;
  /** Poin-poin materi berjudul (diringkas dari materi MD). */
  materiPoin: MateriPoin[];
  /** Diagram interaktif balai ini. */
  diagram: DiagramMateri;
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
  /** Urutan pilihan yang ditekan siswa untuk soal ini (salah dulu, lalu benar). */
  pilihan?: string[];
  /** Jumlah percobaan (hati/nyawa) yang terpakai: 1..3. */
  percobaan?: number;
  /** Waktu menjawab (ISO). */
  waktu?: string;
}

/**
 * Tahap misi di sebuah balai:
 * 0 = belum mulai, 1 = misi diterima dari Penjaga, 2 = Halaman Cerita selesai
 * dibaca (Tempat Uji terbuka), 3 = tantangan lulus (alat survival didapat).
 */
export type TahapMisi = 0 | 1 | 2 | 3;

/** Catatan membaca Halaman Cerita (untuk dasbor guru). */
export interface CatatanBaca {
  /** Total detik membaca. */
  detik: number;
  /** Berapa kali cerita dibuka ulang. */
  ulang: number;
}

export interface Progress {
  playerName: string;
  /** Jenis kelamin karakter yang dipilih pemain. */
  gender: PlayerGender;
  /** Warna pakaian/kemeja (hex). Bila kosong, memakai warna bawaan gender. */
  warnaBaju?: number;
  /** Warna celana/rok/gamis (hex). Bila kosong, memakai warna bawaan gender. */
  warnaBawahan?: number;
  /** Warna hijab (hex, khusus perempuan). Bila kosong, memakai warna bawaan. */
  warnaHijab?: number;
  /**
   * Kostum avatar GLB (lihat src/world/kostum.ts): preset + warna per bagian.
   * Disimpan per profil. `warnaBaju/Bawahan/Hijab` diturunkan dari sini untuk
   * karakter prosedural (cadangan, ikon peta, teman multiplayer).
   */
  kostum?: { preset?: string; warna?: Record<string, string> };
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
  /** ID tetap profil kelas di perangkat ini (dikirim ke server saat bergabung). */
  idSiswa?: string;
  /** Prolog di balai pertama sudah ditonton. */
  prologSelesai: boolean;
  /** Tahap misi per kode balai. */
  misi: Record<string, TahapMisi>;
  /** Alat survival yang sudah didapat (kode balai asal). */
  alat: string[];
  /** Catatan membaca Halaman Cerita per kode balai. */
  bacaan: Record<string, CatatanBaca>;
  /** Jumlah benar terbaik per bagian Final (4 bagian). */
  finalBagian: number[];
}
