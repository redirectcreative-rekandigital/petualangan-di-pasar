import { z } from 'zod';

/**
 * Skema zod untuk memvalidasi file bank soal JSON sebelum dimainkan.
 * Jika bank soal tidak valid, game menampilkan pesan ramah, bukan crash.
 */

export const materiKodeSchema = z.enum([
  'B01',
  'B02',
  'B03',
  'B04',
  'B05',
  'B06',
  'G01',
  'G02',
  'G03',
  'G04',
  'G05',
  'G06',
  'G07',
  'G08',
  'D01',
  'D02',
]);

export const balaiIdSchema = z.union([materiKodeSchema, z.literal('FINAL'), z.string().regex(/^[A-Z]\d{2}-\d+$/)]);

export const noktahIdSchema = z.union([materiKodeSchema, z.literal('FINAL')]);

export const elemenSchema = z.enum(['Bilangan', 'Geometri', 'Data']);
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
    type: z.enum(['mcq', 'mcq-complex', 'number', 'tf-reason', 'money-drag']),
    prompt: z.string().min(1),
    data: questionDataSchema.optional(),
    options: z.array(z.string()).optional(),
    answer: z.union([z.number(), z.string(), z.array(z.string())]),
    moneyTarget: z.number().optional(),
    reasonOptions: z.array(z.string()).optional(),
    reasonAnswer: z.string().optional(),
    hint: z.string().min(1),
    explanation: z.array(z.string()).min(1),
    unit: z.string().optional(),
    meta: questionMetaSchema,
  })
  .superRefine((q, ctx) => {
    if (q.data && q.data.labels.length !== q.data.values.length) {
      ctx.addIssue({
        code: 'custom',
        message: `Soal ${q.id}: jumlah label (${q.data.labels.length}) tidak sama dengan jumlah nilai (${q.data.values.length}).`,
      });
    }
    if (q.type === 'mcq' && (!q.options || q.options.length < 2)) {
      ctx.addIssue({ code: 'custom', message: `Soal ${q.id}: tipe mcq butuh minimal 2 opsi.` });
    }
    if (q.type === 'mcq' && typeof q.answer !== 'string') {
      ctx.addIssue({ code: 'custom', message: `Soal ${q.id}: mcq butuh kunci berupa teks opsi.` });
    }
    if (q.type === 'mcq-complex') {
      if (!q.options || q.options.length < 3) {
        ctx.addIssue({ code: 'custom', message: `Soal ${q.id}: mcq-complex butuh minimal 3 opsi.` });
      }
      if (!Array.isArray(q.answer) || q.answer.length < 1) {
        ctx.addIssue({ code: 'custom', message: `Soal ${q.id}: mcq-complex butuh kunci berupa daftar opsi benar.` });
      }
      if (Array.isArray(q.answer) && q.options) {
        for (const a of q.answer) {
          if (!q.options.includes(a)) {
            ctx.addIssue({ code: 'custom', message: `Soal ${q.id}: kunci "${a}" tidak ada di daftar opsi.` });
          }
        }
      }
    }
    if (q.type === 'tf-reason') {
      if (!q.reasonOptions || q.reasonOptions.length < 2) {
        ctx.addIssue({ code: 'custom', message: `Soal ${q.id}: tf-reason butuh reasonOptions.` });
      }
      if (typeof q.reasonAnswer !== 'string') {
        ctx.addIssue({ code: 'custom', message: `Soal ${q.id}: tf-reason butuh reasonAnswer.` });
      }
    }
    if (q.type === 'money-drag' && typeof q.moneyTarget !== 'number') {
      ctx.addIssue({ code: 'custom', message: `Soal ${q.id}: money-drag butuh moneyTarget.` });
    }
  });

export const questionBankSchema = z.array(questionSchema);

/** Skema satu balai (rumah/sub-materi) di dalam noktah. */
export const balaiMetaSchema = z.object({
  kode: balaiIdSchema,
  noktah: noktahIdSchema,
  nama: z.string().min(1),
  penjaga: z.string().min(1),
  materi: z.string().min(1),
  elemen: elemenSchema,
  urutan: z.number().int().min(0),
  bacaan: z.array(z.string()).min(1),
  contoh: z.string().min(1),
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
