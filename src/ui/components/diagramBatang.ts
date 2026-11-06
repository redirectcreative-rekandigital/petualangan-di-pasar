import type { QuestionData } from '../../../shared/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

/**
 * Membuat diagram batang SVG dari data soal, tanpa pustaka grafik.
 * Skala vertikal dihitung otomatis dari nilai tertinggi.
 */
export function renderDiagramBatang(data: QuestionData): SVGElement {
  const width = 320;
  const height = 220;
  const padding = { top: 24, right: 12, bottom: 44, left: 34 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.values, 1);
  const niceMax = Math.ceil(maxValue / 5) * 5 || 5;
  const n = data.values.length;
  const step = plotW / n;
  const barW = Math.min(40, step * 0.58);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'grafik',
    role: 'img',
    'aria-label': `Diagram batang: ${data.labels.map((l, i) => `${l} ${data.values[i]}`).join(', ')}`,
    preserveAspectRatio: 'xMidYMid meet',
  });

  // Sumbu
  const yAxis = svgEl('line', {
    x1: padding.left,
    y1: padding.top,
    x2: padding.left,
    y2: padding.top + plotH,
    class: 'garis-sumbu',
  });
  const xAxis = svgEl('line', {
    x1: padding.left,
    y1: padding.top + plotH,
    x2: padding.left + plotW,
    y2: padding.top + plotH,
    class: 'garis-sumbu',
  });
  svg.append(yAxis, xAxis);

  // Label sumbu Y (0 dan nilai maksimum)
  const yMax = svgEl('text', { x: padding.left - 6, y: padding.top + 4, class: 'teks-sumbu', 'text-anchor': 'end' });
  yMax.textContent = String(niceMax);
  const yZero = svgEl('text', {
    x: padding.left - 6,
    y: padding.top + plotH + 4,
    class: 'teks-sumbu',
    'text-anchor': 'end',
  });
  yZero.textContent = '0';
  svg.append(yMax, yZero);

  // Garis bantu
  for (let g = 1; g <= 2; g++) {
    const y = padding.top + plotH - (plotH * g) / 3;
    const grid = svgEl('line', {
      x1: padding.left,
      y1: y,
      x2: padding.left + plotW,
      y2: y,
      class: 'garis-sumbu',
      'stroke-dasharray': '3 4',
      opacity: '0.4',
    });
    svg.append(grid);
  }

  data.values.forEach((value, i) => {
    const barH = (value / niceMax) * plotH;
    const x = padding.left + step * i + (step - barW) / 2;
    const y = padding.top + plotH - barH;
    const bar = svgEl('rect', { x, y, width: barW, height: Math.max(barH, 1), rx: 4, class: 'batang' });
    svg.append(bar);

    const valueText = svgEl('text', {
      x: x + barW / 2,
      y: y - 5,
      class: 'nilai',
      'text-anchor': 'middle',
    });
    valueText.textContent = String(value);
    svg.append(valueText);

    const label = svgEl('text', {
      x: x + barW / 2,
      y: padding.top + plotH + 16,
      class: 'teks-sumbu',
      'text-anchor': 'middle',
    });
    label.textContent = data.labels[i] ?? '';
    svg.append(label);
  });

  if (data.unit) {
    const unitText = svgEl('text', { x: width - padding.right, y: 14, class: 'teks-sumbu', 'text-anchor': 'end' });
    unitText.textContent = `(dalam ${data.unit})`;
    svg.append(unitText);
  }

  return svg;
}
