import { z } from 'zod';

/**
 * Skema zod untuk memvalidasi file bank soal JSON sebelum dimainkan.
 * Jika bank soal tidak valid, game menampilkan pesan ramah, bukan crash.
 *
 * Versi IPAS Kelas 5 SD/MI "Survival Sains": seluruh soal berjenis
 * pilihan ganda (A–D).
 */

export const materiKodeSchema = z.enum([
  'H01',
  'H02',
  'H03',
  'H04',
  'F01',
  'F02',
  'F03',
  'F04',
  'E01',
  'E02',
  'E03',
]);

export const balaiIdSchema = z.union([materiKodeSchema, z.literal('FINAL'), z.string().regex(/^[A-Z]\d{2}-\d+$/)]);

export const noktahIdSchema = z.union([materiKodeSchema, z.literal('FINAL')]);

export const elemenSchema = z.enum(['Makhluk Hidup', 'Fisika', 'Bumi']);
export const levelKognitifSchema = z.enum(['Pemahaman', 'Penerapan', 'Penalaran']);
export const tingkatKesulitanSchema = z.enum(['Mudah', 'Sedang', 'Sulit']);

export const questionDataSchema = z.object({
  kind: z.enum(['table', 'bar', 'picture']),
  labels: z.array(z.string()).min(1),
  values: z.array(z.number()).min(1),
  unit: z.string().optional(),
});

export const questionMetaSchema = z.object({
  kodeMateri: materiKodeSchema,
  elemen: elemenSchema,
  submateri: z.string().min(1),
  indikator: z.string().min(1),
  levelKognitif: levelKognitifSchema,
  tingkatKesulitan: tingkatKesulitanSchema,
});

export const questionSchema = z
  .object({
    id: z.string().min(1),
    balai: balaiIdSchema,
    type: z.literal('mcq'),
    prompt: z.string().min(1),
    data: questionDataSchema.optional(),
    options: z.array(z.string()).optional(),
    answer: z.string(),
    hint: z.string().min(1),
    explanation: z.array(z.string()).min(1),
    meta: questionMetaSchema,
  })
  .superRefine((q, ctx) => {
    if (q.data && q.data.labels.length !== q.data.values.length) {
      ctx.addIssue({
        code: 'custom',
        message: `Soal ${q.id}: jumlah label (${q.data.labels.length}) tidak sama dengan jumlah nilai (${q.data.values.length}).`,
      });
    }
    if (!q.options || q.options.length < 2) {
      ctx.addIssue({ code: 'custom', message: `Soal ${q.id}: butuh minimal 2 opsi jawaban.` });
    }
    if (q.options && !q.options.includes(q.answer)) {
      ctx.addIssue({
        code: 'custom',
        message: `Soal ${q.id}: kunci "${q.answer}" tidak ada di daftar opsi.`,
      });
    }
  });

export const questionBankSchema = z.array(questionSchema);

/** Satu poin materi berjudul. */
export const materiPoinSchema = z.object({
  judul: z.string().min(1),
  teks: z.string().min(1),
});

/** Satu bagian pada diagram interaktif. */
export const diagramBagianSchema = z.object({
  nama: z.string().min(1),
  fungsi: z.string().min(1),
  posisi: z.object({ x: z.number(), y: z.number() }).optional(),
});

/** Diagram interaktif milik sebuah balai. */
export const diagramMateriSchema = z.object({
  judul: z.string().min(1),
  bentuk: z.string().min(1),
  bagian: z.array(diagramBagianSchema).min(1),
});

/** Tokoh materi (NPC pembawa materi utuh). */
export const tokohMateriSchema = z.object({
  nama: z.string().min(1),
  pengantar: z.string().min(1),
});

/** Skema satu balai (rumah penjaga) di dalam noktah. */
export const balaiMetaSchema = z.object({
  kode: balaiIdSchema,
  noktah: noktahIdSchema,
  nama: z.string().min(1),
  penjaga: z.string().min(1),
  dialogPenjaga: z.string().min(1),
  tokohMateri: tokohMateriSchema,
  materi: z.string().min(1),
  elemen: elemenSchema,
  urutan: z.number().int().min(0),
  materiPoin: z.array(materiPoinSchema).min(1),
  diagram: diagramMateriSchema,
  kunciJawab: z.string().min(1),
  soalPerMain: z.number().int().min(1),
});

export const balaiListSchema = z.array(balaiMetaSchema).min(1);

/** Skema satu noktah (titik materi) pada peta besar. */
export const noktahMetaSchema = z.object({
  kode: noktahIdSchema,
  nama: z.string().min(1),
  materi: z.string().min(1),
  elemen: elemenSchema,
  peta: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
  balai: z.array(balaiMetaSchema).min(1),
});

export const noktahListSchema = z.array(noktahMetaSchema).min(1);

export type QuestionInput = z.input<typeof questionSchema>;
export type QuestionParsed = z.output<typeof questionSchema>;
export type BalaiMetaInput = z.input<typeof balaiMetaSchema>;
export type NoktahMetaInput = z.input<typeof noktahMetaSchema>;
