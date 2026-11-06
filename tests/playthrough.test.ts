import { describe, it, expect, beforeEach } from 'vitest';
import { renderQuiz } from '../src/ui/screens/quiz';
import { getQuestionsByBalai } from '../src/data/bank';
import { createDefaultProgress } from '../src/core/state';
import { parseNumber } from '../src/core/scoring';
import type { ScreenContext } from '../src/ui/screens/context';
import type { BalaiId, Progress, Question } from '../shared/types';

/**
 * Uji alur penuh layar kuis balai: menjawab tiap soal dengan kunci benar
 * sampai sesi selesai, lalu memverifikasi navigasi hasil.
 */

let navCalls: Array<[string, Record<string, unknown> | undefined]> = [];
let progress: Progress;

function makeCtx(): ScreenContext {
  return {
    navigate: (screen, options) => navCalls.push([screen, options]),
    getProgress: () => progress,
    setProgress: (p) => {
      progress = p;
    },
    persist: () => {},
    reset: () => progress,
  };
}

function findByText(root: HTMLElement, text: string, selector = 'button'): HTMLElement | null {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
  const norm = (s: string) => s.replace(/^[⬜✅]\s*/, '').trim();
  // Utamakan kecocokan persis, lalu jatuh ke kecocokan sebagian.
  return (
    nodes.find((n) => norm(n.textContent ?? '') === text) ??
    nodes.find((n) => norm(n.textContent ?? '').includes(text)) ??
    null
  );
}

/** Menjawab soal aktif dengan kunci yang benar. */
function answerCorrectly(container: HTMLElement, question: Question): void {
  if (question.type === 'mcq') {
    const btn = findByText(container, question.answer as string, '.opsi button');
    expect(btn, `opsi untuk ${question.id}`).toBeTruthy();
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return;
  }
  if (question.type === 'mcq-complex') {
    for (const ans of question.answer as string[]) {
      const btn = findByText(container, ans, '.opsi button');
      expect(btn, `opsi kompleks ${question.id}: ${ans}`).toBeTruthy();
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    findByText(container, 'Jawab', 'button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return;
  }
  if (question.type === 'number') {
    const input = container.querySelector<HTMLInputElement>('.isian');
    expect(input, `input untuk ${question.id}`).toBeTruthy();
    input!.value = String(question.answer);
    findByText(container, 'Jawab', 'button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return;
  }
  if (question.type === 'tf-reason') {
    const btn = findByText(container, String(question.answer), '.opsi button');
    expect(btn, `true/false untuk ${question.id}`).toBeTruthy();
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Tahap alasan.
    const rbtn = findByText(container, String(question.reasonAnswer), '.opsi button');
    expect(rbtn, `alasan untuk ${question.id}`).toBeTruthy();
    rbtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
}

function clickContinue(container: HTMLElement): boolean {
  const btn = findByText(container, 'Soal Berikutnya', 'button') ?? findByText(container, 'Lihat Hasil', 'button');
  if (btn) {
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }
  return false;
}

/** Menemukan soal aktif dengan mencocokkan teks prompt pada bank soal. */
function findCurrentQuestion(balai: BalaiId, container: HTMLElement): Question | null {
  const promptEl = container.querySelector('.soal-box .prompt');
  if (!promptEl) return null;
  const text = promptEl.textContent ?? '';
  return getQuestionsByBalai(balai).find((q) => q.prompt === text) ?? null;
}

/** Memainkan satu balai secara tuntas dengan kunci benar. */
function playBalaiFully(balai: BalaiId, expectedCount: number): HTMLElement {
  const container = document.createElement('div');
  document.body.append(container);
  const ctx = makeCtx();
  const { root } = renderQuiz(ctx, { balai });
  container.append(root);

  for (let i = 0; i < expectedCount; i++) {
    const question = findCurrentQuestion(balai, container);
    expect(question, `soal ke-${i + 1} balai ${balai}`).toBeTruthy();
    answerCorrectly(container, question!);
    clickContinue(container);
  }
  return container;
}

beforeEach(() => {
  navCalls = [];
  progress = createDefaultProgress();
  document.body.innerHTML = '';
});

describe('putaran balai (semua jawaban benar)', () => {
  it('balai B01 selesai dengan 3 bintang', () => {
    playBalaiFully('B01', 3);
    const call = navCalls.find((c) => c[0] === 'balaiResult');
    expect(call).toBeTruthy();
    expect(call?.[1]?.stars).toBe(3);
    expect(call?.[1]?.balai).toBe('B01');
  });

  it('balai G01 (geometri) selesai dengan 3 bintang', () => {
    playBalaiFully('G01', 3);
    const call = navCalls.find((c) => c[0] === 'balaiResult');
    expect(call?.[1]?.stars).toBe(3);
  });

  it('balai D01 (data) selesai dengan 3 bintang', () => {
    playBalaiFully('D01', 3);
    const call = navCalls.find((c) => c[0] === 'balaiResult');
    expect(call?.[1]?.stars).toBe(3);
  });
});

describe('kesempatan 3x per soal', () => {
  it('jawaban salah menampilkan pesan sisa kesempatan lalu tetap di soal', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const ctx = makeCtx();
    const { root } = renderQuiz(ctx, { balai: 'B01' });
    container.append(root);

    // Pilih jawaban yang jelas salah pada soal pertama.
    const question = findCurrentQuestion('B01', container)!;
    if (question.type === 'mcq' || question.type === 'mcq-complex') {
      const wrongOption = (question.options ?? []).find((o) =>
        Array.isArray(question.answer) ? !(question.answer as string[]).includes(o) : o !== question.answer,
      );
      const btn = findByText(container, wrongOption!, '.opsi button');
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      if (question.type === 'mcq-complex') {
        findByText(container, 'Jawab', 'button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      expect(container.textContent).toContain('Kesempatan tersisa');
    } else {
      const input = container.querySelector<HTMLInputElement>('.isian')!;
      input.value = '-999';
      findByText(container, 'Jawab', 'button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(container.textContent).toContain('Kesempatan tersisa');
    }
  });
});

describe('parser angka pada isian', () => {
  it('menerima format dengan titik ribuan', () => {
    const bilangan = getQuestionsByBalai('B02');
    const big = bilangan.find((q) => typeof q.answer === 'number' && (q.answer as number) >= 1000);
    if (big) {
      const formatted = (big.answer as number).toLocaleString('id-ID');
      expect(parseNumber(formatted)).toBe(big.answer);
    }
  });
});

describe('balai teracak saat diulang', () => {
  it('memilih urutan soal yang bervariasi dari pool', () => {
    const seen = new Set<string>();
    for (let run = 0; run < 10; run++) {
      const container = document.createElement('div');
      const ctx = makeCtx();
      const { root } = renderQuiz(ctx, { balai: 'B01' });
      container.append(root);
      const q = findCurrentQuestion('B01', container);
      if (q) seen.add(q.id);
    }
    // Dari 3 soal di pool, pengacakan 10 kali hampir pasti memilih beragam soal.
    expect(seen.size).toBeGreaterThan(1);
  });
});
