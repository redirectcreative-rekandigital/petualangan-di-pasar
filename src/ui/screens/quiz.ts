import { el, rupiah, formatNumber } from '../components/dom';
import { renderHintBox } from '../components/nyawa';
import { renderTabel } from '../components/tabelData';
import { renderDiagramBatang } from '../components/diagramBatang';
import { sfx } from '../../core/sound';
import { RULES, starsForCorrect } from '../../core/scoring';
import { startSession, currentQuestion, submitAnswer, submitReason, type SessionState } from '../../core/engine';
import { getQuestionsByBalai } from '../../data/bank';
import { applyBalaiResult, applyPuncakResult } from '../../core/state';
import { getBalai } from '../../data/balai';
import type { BalaiId, Question } from '../../../shared/types';
import type { ScreenContext } from './context';

interface QuizInit {
  balai: BalaiId;
}

/**
 * Layar permainan satu balai (3 soal) atau babak puncak "Pasar Ramai" (30 soal).
 * Tiap soal punya 3 kesempatan; habis 3x salah, soal dianggap gagal.
 */
export function renderQuiz(ctx: ScreenContext, init: QuizInit): { root: HTMLElement; cleanup: () => void } {
  const balai = init.balai;
  const meta = balai === 'FINAL' ? null : getBalai(balai);
  const judulBalai = balai === 'FINAL' ? 'Pasar Ramai' : (meta?.nama ?? balai);
  const kodeLabel = balai === 'FINAL' ? 'Babak Puncak' : balai;
  const pool = getQuestionsByBalai(balai);
  let session: SessionState = startSession(balai, pool);
  let locked = false;
  let finished = false;

  const root = el('section', { class: 'screen' });
  const cleanup = (): void => {};

  const rerender = (): void => render();

  function render(): void {
    if (finished) return;
    const q = currentQuestion(session);
    if (!q) {
      finishSession();
      return;
    }
    locked = false;

    const topbar = el('div', {
      class: 'topbar',
      children: [
        el('div', {
          class: 'topbar-judul',
          children: [
            el('h2', { text: judulBalai }),
            el('span', { class: 'chip kode', text: kodeLabel }),
          ],
        }),
        el('div', {
          class: 'hud',
          children: [
            el('span', { class: 'chip progress', text: `Soal ${session.index + 1}/${session.questions.length}` }),
            el('span', {
              class: 'chip',
              text: `Kesempatan: ${'❤️'.repeat(Math.max(0, session.attemptsLeft))}${'🤍'.repeat(Math.max(0, RULES.attemptsPerQuestion - session.attemptsLeft))}`,
            }),
            el('span', { class: 'chip coin', text: `🪙 ${session.coins}` }),
          ],
        }),
      ],
    });

    const soalBox = el('div', {
      class: 'soal-box',
      children: [el('p', { class: 'prompt', text: q.prompt })],
    });

    const children: (Node | null)[] = [topbar, soalBox];

    if (q.data) {
      children.push(q.data.kind === 'table' ? renderTabel(q.data) : renderDiagramBatang(q.data));
    }
    if (q.unit && q.type === 'number') {
      soalBox.append(el('span', { class: 'unit-badge', text: `satuan: ${q.unit}` }));
    }

    children.push(
      el('div', {
        class: 'soal-meta',
        children: [
          el('span', { class: 'muted', text: `${q.meta.submateri}` }),
          el('span', { class: 'muted', text: `Kesulitan: ${q.meta.tingkatKesulitan}` }),
        ],
      }),
    );

    children.push(renderHintToggle(q));
    children.push(renderAnswerArea(q));

    while (root.firstChild) root.removeChild(root.firstChild);
    for (const c of children) if (c) root.append(c);
  }

  let hintOpen = false;

  function renderHintToggle(q: Question): HTMLElement {
    if (hintOpen) return renderHintBox(q.hint);
    return el('button', {
      class: 'btn ghost',
      text: '💡 Lihat Petunjuk',
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          hintOpen = true;
          rerender();
        },
      },
    });
  }

  function renderAnswerArea(q: Question): HTMLElement {
    const area = el('div', { class: 'stack' });

    if (q.type === 'mcq') {
      area.append(renderOpsi(q, q.options ?? [], 'single'));
      return area;
    }
    if (q.type === 'mcq-complex') {
      area.append(
        el('p', { class: 'label-kecil', text: 'Pilih SEMUA jawaban yang benar (boleh lebih dari satu), lalu tekan Jawab.' }),
      );
      area.append(renderOpsi(q, q.options ?? [], 'multi'));
      return area;
    }
    if (q.type === 'tf-reason') {
      const options = session.awaitingReason ? (q.reasonOptions ?? []) : ['Benar', 'Salah'];
      const label = session.awaitingReason ? 'Pilih alasan yang paling tepat:' : 'Pernyataan ini benar atau salah?';
      area.append(el('p', { class: 'label-kecil', text: label }));
      area.append(renderOpsi(q, options, 'single', session.awaitingReason));
      return area;
    }
    if (q.type === 'number') {
      area.append(renderIsian(q));
      return area;
    }
    return area;
  }

  /** Pilihan jawaban. mode 'multi' menampilkan kotak centang + tombol Jawab. */
  function renderOpsi(q: Question, options: string[], mode: 'single' | 'multi', isReason = false): HTMLElement {
    if (mode === 'multi') {
      const chosen = new Set<string>();
      const wrap = el('div', { class: 'opsi multi', attrs: { role: 'group', 'aria-label': 'Pilih semua jawaban benar' } });
      for (const opt of options) {
        const btn = el('button', { text: `⬜ ${opt}`, attrs: { type: 'button', 'aria-pressed': 'false' } });
        btn.addEventListener('click', () => {
          if (locked) return;
          if (chosen.has(opt)) {
            chosen.delete(opt);
            btn.textContent = `⬜ ${opt}`;
            btn.setAttribute('aria-pressed', 'false');
            btn.classList.remove('dipilih');
          } else {
            chosen.add(opt);
            btn.textContent = `✅ ${opt}`;
            btn.setAttribute('aria-pressed', 'true');
            btn.classList.add('dipilih');
          }
        });
        wrap.append(btn);
      }
      const submit = el('button', {
        class: 'btn block',
        text: 'Jawab',
        attrs: { type: 'button' },
        on: {
          click: () => {
            if (locked) return;
            if (chosen.size === 0) {
              flashInvalid('Pilih minimal satu jawaban dulu ya.');
              return;
            }
            jawab(q, [...chosen]);
          },
        },
      });
      return el('div', { class: 'stack', children: [wrap, submit] });
    }

    const wrap = el('div', { class: 'opsi', attrs: { role: 'group' } });
    for (const opt of options) {
      const btn = el('button', { text: opt, attrs: { type: 'button' } });
      btn.addEventListener('click', () => {
        if (locked) return;
        if (isReason) jawabAlasan(q, opt);
        else jawab(q, opt);
      });
      wrap.append(btn);
    }
    return wrap;
  }

  function renderIsian(q: Question): HTMLElement {
    const input = el('input', {
      class: 'isian',
      attrs: {
        type: 'text',
        inputmode: 'decimal',
        placeholder: 'Tulis jawabanmu',
        'aria-label': 'Jawaban',
        autocomplete: 'off',
      },
    });
    const prefix = q.unit === 'Rp' ? el('span', { class: 'prefix', text: 'Rp' }) : null;
    const kirim = el('button', {
      class: 'btn',
      text: 'Jawab',
      attrs: { type: 'button' },
      on: { click: () => jawabIsian(q, input.value) },
    });
    const row = el('div', {
      class: 'isian-row',
      children: [prefix, input, kirim].filter((x): x is HTMLElement => x !== null),
    });
    input.addEventListener('keydown', (ev) => {
      if ((ev as KeyboardEvent).key === 'Enter') jawabIsian(q, input.value);
    });
    return el('div', {
      class: 'stack',
      children: [row, el('p', { class: 'muted', text: 'Ketik angka saja, contoh: 6500 atau 6.500' })],
    });
  }

  /* ---------- Aksi jawab ---------- */

  function jawabIsian(q: Question, raw: string): void {
    if (locked) return;
    const cleaned = raw.replace(/[^\d.,-]/g, '');
    const parsed = parseLooseNumber(cleaned);
    if (parsed === null) {
      flashInvalid('Tulis angka terlebih dahulu ya.');
      return;
    }
    jawab(q, parsed);
  }

  function jawab(q: Question, answer: number | string | string[]): void {
    if (locked) return;
    const result = submitAnswer(session, answer);
    session = result.session;

    if (result.awaitingReason) {
      sfx.correct();
      rerender();
      return;
    }

    if (result.correct) {
      sfx.correct();
      sfx.coin();
      finishOrAdvance(q, true);
    } else if (result.advanced) {
      sfx.wrong();
      finishOrAdvance(q, false, true);
    } else {
      // Masih ada kesempatan; coba lagi di soal yang sama.
      sfx.wrong();
      flashInvalid(`Belum tepat. Kesempatan tersisa ${session.attemptsLeft}x. Ayo coba lagi!`);
    }
  }

  function jawabAlasan(q: Question, reason: string): void {
    if (locked) return;
    const result = submitReason(session, reason);
    session = result.session;
    if (result.correct) {
      sfx.correct();
      sfx.coin();
      finishOrAdvance(q, true);
    } else if (result.advanced) {
      sfx.wrong();
      finishOrAdvance(q, false, true);
    } else {
      sfx.wrong();
      flashInvalid(`Alasan belum tepat. Kesempatan tersisa ${session.attemptsLeft}x.`);
      rerender();
    }
  }

  function finishOrAdvance(q: Question, correct: boolean, gagal = false): void {
    const isLastQuestion = session.index >= session.questions.length;
    const pesan = correct
      ? 'Bagus, jawabanmu benar!'
      : gagal
        ? 'Kesempatan habis untuk soal ini. Baca pembahasannya ya.'
        : 'Belum tepat.';
    const feedback = renderFeedback(q, correct, pesan);

    const tombol = el('button', {
      class: 'btn block',
      text: isLastQuestion ? 'Lihat Hasil 🏁' : 'Soal Berikutnya →',
      attrs: { type: 'button' },
      on: {
        click: () => {
          sfx.click();
          if (isLastQuestion) finishSession();
          else rerender();
        },
      },
    });

    appendOverlay([feedback, tombol]);
  }

  function renderFeedback(q: Question, correct: boolean, pesan: string): HTMLElement {
    return el('div', {
      class: `umpan ${correct ? 'benar' : 'salah'}`,
      attrs: { role: 'status' },
      children: [
        el('h3', { text: correct ? '✅ Benar!' : '❌ Belum tepat' }),
        el('p', { text: pesan }),
        el('p', { children: [el('strong', { text: 'Kunci: ' }), kunciTeks(q)] }),
        el('p', { class: 'label-kecil', text: 'Pembahasan', attrs: { style: 'margin-top:8px' } }),
        el('ol', { children: q.explanation.map((line) => el('li', { text: line })) }),
      ],
    });
  }

  function kunciTeks(q: Question): string {
    if (Array.isArray(q.answer)) return q.answer.join(' ; ');
    if (q.unit === 'Rp' && typeof q.answer === 'number') return rupiah(q.answer);
    if (q.unit && typeof q.answer === 'number') return `${formatNumber(q.answer)} ${q.unit}`;
    return String(q.answer);
  }

  function appendOverlay(nodes: Node[]): void {
    locked = true;
    const overlay = el('div', { class: 'stack' });
    nodes.forEach((n) => overlay.append(n));
    root.append(overlay);
  }

  function flashInvalid(message: string): void {
    const warn = el('div', {
      class: 'umpan salah',
      attrs: { role: 'alert' },
      children: [el('p', { text: message })],
    });
    root.append(warn);
    setTimeout(() => warn.remove(), 2400);
  }

  function finishSession(): void {
    if (finished) return;
    finished = true;
    locked = true;

    const correct = session.correctCount;
    const total = session.questions.length;
    const stars = starsForCorrect(correct);
    const progress = ctx.getProgress();
    const coins = progress.coins + session.coins;

    if (balai === 'FINAL') {
      const lulus = stars >= 1;
      const updated = applyPuncakResult(progress, lulus, session.answered);
      ctx.setProgress({ ...updated, coins });
      ctx.persist();
      if (lulus) sfx.win();
      else sfx.lose();
      ctx.navigate('balaiResult', { balai, correct, total, stars, coins: session.coins, lulus });
      return;
    }

    const updated = applyBalaiResult(progress, balai, correct, total, session.answered);
    ctx.setProgress({ ...updated, coins });
    ctx.persist();
    if (stars >= 1) sfx.win();
    else sfx.lose();
    ctx.navigate('balaiResult', { balai, correct, total, stars, coins: session.coins, lulus: stars >= 1 });
  }

  render();
  return { root, cleanup };
}

function parseLooseNumber(raw: string): number | null {
  const cleaned = raw.replace(/\.(?=\d{3}\b)/g, '').replace(/,/g, '.');
  if (cleaned.trim() === '') return null;
  const value = Number(cleaned);
  return Number.isNaN(value) ? null : value;
}
