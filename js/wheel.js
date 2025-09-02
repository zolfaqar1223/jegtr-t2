// wheel.js
// Tegner selve årshjulet. Modulet modtager et SVG‑element, listen af
// aktiviteter og et sæt callbacks. Callbacks bruges til at åbne en
// måned samt flytte aktiviteter via drag‑and‑drop. Selve tegningen
// er opdelt i kvartaler, måneder og uger (52 segmenter).

import { MONTHS, CAT_COLORS } from './store.js';
import { polar, segPath } from './utils.js';

/**
 * Tegn årshjulet i et givet SVG‑element.
 * @param {SVGElement} svg SVG‑elementet, der skal tegnes i
 * @param {Array<Object>} items Liste over alle aktiviteter
 * @param {Object} callbacks Callbacks til interaktion
 *   - openMonth(monthName)
 *   - moveItemToMonth(id, monthName)
 *   - moveItemToMonthWeek(id, monthName, weekNumber)
 */
export function drawWheel(svg, items, callbacks) {
  // TEST markør for at bekræfte at hjulet re-renderes efter deploy
  console.log('[YearWheel TEST] drawWheel kaldt, antal items =', Array.isArray(items) ? items.length : 'ukendt');
  // Ryd tidligere indhold
  svg.innerHTML = '';
  // Use container width to avoid CSS transform affecting measurement
  const container = svg.parentElement;
  const cw = container ? container.getBoundingClientRect().width : 0;
  const size = Math.min(cw || svg.clientWidth || 700, 1000);
  const cx = size / 2;
  const cy = size / 2;
  // Definer radier for de forskellige ringe
  const rCenter = 50;
  const rQuarterOuter = size * 0.23;
  const rMonthOuter = size * 0.37;
  const rWeekOuter = size * 0.46;
  // Midtercirkel
  const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  center.setAttribute('cx', cx);
  center.setAttribute('cy', cy);
  center.setAttribute('r', rCenter);
  center.setAttribute('fill', 'var(--panel)');
  center.setAttribute('stroke', 'var(--muted)');
  svg.appendChild(center);
  // Midtertekst
  const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t1.setAttribute('x', cx);
  t1.setAttribute('y', cy - 4);
  t1.setAttribute('text-anchor', 'middle');
  t1.setAttribute('font-size', '16');
  t1.setAttribute('font-weight', '600');
  t1.setAttribute('fill', '#ffffff');
  t1.textContent = 'Årshjul';
  svg.appendChild(t1);
  const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t2.setAttribute('x', cx);
  t2.setAttribute('y', cy + 14);
  t2.setAttribute('text-anchor', 'middle');
  t2.setAttribute('font-size', '11');
  t2.setAttribute('fill', '#ffffff');
  t2.textContent = String(new Date().getFullYear());
  svg.appendChild(t2);
  // Kvartalernes baggrunde og labels
  for (let q = 0; q < 4; q++) {
    const a1 = (2 * Math.PI) * (q / 4) - Math.PI / 2;
    const a2 = (2 * Math.PI) * ((q + 1) / 4) - Math.PI / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', segPath(cx, cy, rCenter, rQuarterOuter, a1, a2));
    path.setAttribute('fill', `var(--q${q + 1})`);
    path.setAttribute('opacity', '0.25');
    svg.appendChild(path);
    const mid = (a1 + a2) / 2;
    const [lx, ly] = polar(cx, cy, (rCenter + rQuarterOuter) / 2, mid);
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', lx);
    txt.setAttribute('y', ly);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('font-size', '12');
    txt.setAttribute('fill', '#ffffff');
    txt.textContent = ['Q1', 'Q2', 'Q3', 'Q4'][q];
    svg.appendChild(txt);
  }
  // Beregn antal aktiviteter per måned
  const monthCounts = {};
  items.forEach(it => {
    monthCounts[it.month] = (monthCounts[it.month] || 0) + 1;
  });
  // Månedsringe og highligths
  for (let m = 0; m < 12; m++) {
    const a1 = (2 * Math.PI) * (m / 12) - Math.PI / 2;
    const a2 = (2 * Math.PI) * ((m + 1) / 12) - Math.PI / 2;
    const qIndex = Math.floor(m / 3);
    // baggrundssegment
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', segPath(cx, cy, rQuarterOuter, rMonthOuter, a1, a2));
    path.setAttribute('fill', `var(--q${qIndex + 1})`);
    path.setAttribute('opacity', '0.3');
    path.style.cursor = 'pointer';
    path.classList.add('month-seg');
    path.addEventListener('click', () => callbacks.openMonth(MONTHS[m]));
    path.addEventListener('dragover', e => e.preventDefault());
    path.addEventListener('drop', e => {
      const id = e.dataTransfer.getData('text/plain');
      callbacks.moveItemToMonth(id, MONTHS[m]);
    });
    svg.appendChild(path);
    // highlight med accent farve hvis der findes aktiviteter i måneden
    const count = monthCounts[MONTHS[m]] || 0;
    if (count > 0) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const rIn = rQuarterOuter + 10;
      const rOut = rMonthOuter - 10;
      p.setAttribute('d', segPath(cx, cy, rIn, rOut, a1, a2));
      p.setAttribute('fill', 'var(--accent)');
      const op = 0.2 + Math.min(count, 3) * 0.15;
      p.setAttribute('opacity', String(Math.min(op, 0.6)));
      p.style.cursor = 'pointer';
      p.classList.add('month-seg');
      p.addEventListener('click', () => callbacks.openMonth(MONTHS[m]));
      svg.appendChild(p);
    }
    // månedsnavn
    const mid = (a1 + a2) / 2;
    const [tx, ty] = polar(cx, cy, (rQuarterOuter + rMonthOuter) / 2, mid);
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', tx);
    txt.setAttribute('y', ty);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('font-size', '12');
    txt.setAttribute('fill', '#ffffff');
    txt.textContent = MONTHS[m];
    txt.style.cursor = 'pointer';
    txt.addEventListener('click', () => callbacks.openMonth(MONTHS[m]));
    svg.appendChild(txt);
  }
  // Beregn ugetællinger (52 segmenter) og farver baseret på kategori
  const weekCounts = new Array(52).fill(0);
  const weekColors = new Array(52).fill(null);
  items.forEach(it => {
    const mIndex = MONTHS.indexOf(it.month);
    const baseIndex = mIndex * 4 + (it.week - 1);
    const scaled = Math.round(baseIndex * 52 / 48);
    const idx = Math.min(scaled, 51);
    weekCounts[idx]++;
    // Sæt farve – seneste farve vinder; kunne udvides til mix, men simpelt for nu
    weekColors[idx] = CAT_COLORS[it.cat] || 'var(--accent)';
  });
  // Tegn 52 ugesegmenter
  for (let i = 0; i < 52; i++) {
    const a1 = (2 * Math.PI) * (i / 52) - Math.PI / 2;
    const a2 = (2 * Math.PI) * ((i + 1) / 52) - Math.PI / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', segPath(cx, cy, rMonthOuter, rWeekOuter, a1, a2));
    path.setAttribute('fill', 'transparent');
    const isQuarter = i % 13 === 0;
    path.setAttribute('stroke', 'var(--muted)');
    path.setAttribute('stroke-width', isQuarter ? '2' : '1');
    path.setAttribute('opacity', '0.7');
    path.addEventListener('dragover', e => e.preventDefault());
    path.addEventListener('drop', e => {
      const id = e.dataTransfer.getData('text/plain');
      const approxMonthIndex = Math.floor((i * 12) / 52);
      const monthName = MONTHS[approxMonthIndex];
      const segInMonth = i - Math.round(approxMonthIndex * 52 / 12);
      const weekNum = Math.max(1, Math.min(5, Math.round((segInMonth * 4) / (52 / 12)) + 1));
      callbacks.moveItemToMonthWeek(id, monthName, weekNum);
    });
    svg.appendChild(path);
    const count = weekCounts[i];
    if (count > 0) {
      const mid = (a1 + a2) / 2;
      const [bx, by] = polar(cx, cy, (rMonthOuter + rWeekOuter) / 2, mid);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('marker');
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', bx);
      c.setAttribute('cy', by);
      c.setAttribute('r', 14);
      const dotColor = weekColors[i] || 'var(--accent)';
      c.setAttribute('fill', dotColor);
      c.setAttribute('stroke', 'rgba(255,255,255,0.85)');
      c.setAttribute('stroke-width', '1');
      const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c2.setAttribute('cx', bx);
      c2.setAttribute('cy', by);
      c2.setAttribute('r', 17);
      c2.setAttribute('fill', 'transparent');
      c2.setAttribute('stroke', 'rgba(212,175,55,0.55)');
      c2.setAttribute('stroke-width', '1');
      g.appendChild(c2);
      g.appendChild(c);
      const tt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tt.setAttribute('x', bx);
      tt.setAttribute('y', by + 5);
      tt.setAttribute('text-anchor', 'middle');
      tt.setAttribute('font-size', '12');
      tt.setAttribute('font-weight', '700');
      tt.setAttribute('fill', '#ffffff');
      tt.textContent = String(count);
      g.appendChild(tt);
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => {
        const approxMonthIndex = Math.floor((i * 12) / 52);
        const monthName = MONTHS[approxMonthIndex];
        const segInMonth = i - Math.round(approxMonthIndex * 52 / 12);
        const weekNum = Math.max(1, Math.min(5, Math.round((segInMonth * 4) / (52 / 12)) + 1));
        if (callbacks.openWeek) {
          // Defer to next frame for smoother UI and to avoid size jank
          requestAnimationFrame(() => callbacks.openWeek(monthName, weekNum));
        } else {
          requestAnimationFrame(() => callbacks.openMonth(monthName));
        }
      });
      svg.appendChild(g);
    }
  }
}
