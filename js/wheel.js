// wheel.js
// Tegner selve årshjulet. Modulet modtager et SVG‑element, listen af
// aktiviteter og et sæt callbacks. Callbacks bruges til at åbne en
// måned samt flytte aktiviteter via drag‑and‑drop. Selve tegningen
// er opdelt i kvartaler, måneder og uger (52 segmenter).

import { MONTHS, CAT_COLORS, STATUS_COLORS } from './store.js';
import { polar, segPath } from './utils.js';
import { getIsoWeek } from './utils.js';

/**
 * Tegn årshjulet i et givet SVG‑element.
 * @param {SVGElement} svg SVG‑elementet, der skal tegnes i
 * @param {Array<Object>} items Liste over alle aktiviteter
 * @param {Object} callbacks Callbacks til interaktion
 *   - openMonth(monthName)
 *   - moveItemToMonth(id, monthName)
 *   - moveItemToMonthWeek(id, monthName, weekNumber)
 */
export function drawWheel(svg, items, callbacks, opts = {}) {
  const highlightMonths = Array.isArray(opts.highlightMonths) ? opts.highlightMonths : [];
  const restrictMonths = Boolean(opts.restrictMonths);
  const showBubbles = Boolean(opts.showBubbles);
  const showQuarterBoxes = Boolean(opts.showQuarterBoxes);
  const panX = Number.isFinite(opts.panX) ? opts.panX : 0;
  const panY = Number.isFinite(opts.panY) ? opts.panY : 0;
  const zoom = Number.isFinite(opts.zoom) ? opts.zoom : 1;
  // TEST markør for at bekræfte at hjulet re-renderes efter deploy
  try { console.debug('[YearWheel] draw', Array.isArray(items) ? items.length : 'ukendt'); } catch {}
  // Ryd tidligere indhold
  svg.innerHTML = '';
  if (showBubbles) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    grad.setAttribute('id', 'hlGrad');
    grad.setAttribute('cx', '50%');
    grad.setAttribute('cy', '50%');
    grad.setAttribute('r', '60%');
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#ffffff');
    stop1.setAttribute('stop-opacity', '0.30');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#ffffff');
    stop2.setAttribute('stop-opacity', '0');
    grad.appendChild(stop1); grad.appendChild(stop2);
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'softGlow');
    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    blur.setAttribute('result', 'coloredBlur');
    filter.appendChild(blur);
    defs.appendChild(grad); defs.appendChild(filter);
    svg.appendChild(defs);
  }
  // Use container width to avoid CSS transform affecting measurement
  const container = svg.parentElement;
  const isCustomerView = !!(document && document.body && document.body.classList && document.body.classList.contains('customer'));
  // Ensure a bubble layer exists (absolute, shares transform with wheel)
  let bubbleLayer = container.querySelector('.bubble-layer');
  if (!bubbleLayer) {
    bubbleLayer = document.createElement('div');
    bubbleLayer.className = 'bubble-layer';
    bubbleLayer.style.position = 'absolute';
    bubbleLayer.style.inset = '0';
    bubbleLayer.style.pointerEvents = 'none';
    container.appendChild(bubbleLayer);
  }
  bubbleLayer.innerHTML = '';
  // reset registries for this render
  bubbleLayer._rects = [];
  bubbleLayer._leftY = 12;
  bubbleLayer._rightY = 12;
  bubbleLayer._leftRects = [];
  bubbleLayer._rightRects = [];
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
  if (!isCustomerView) {
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t1.setAttribute('x', cx);
    t1.setAttribute('y', cy);
    t1.setAttribute('text-anchor', 'middle');
    t1.setAttribute('dominant-baseline', 'middle');
    t1.setAttribute('alignment-baseline', 'middle');
    t1.setAttribute('font-size', '16');
    t1.setAttribute('font-weight', '600');
    t1.setAttribute('fill', '#ffffff');
    t1.textContent = 'Årshjul';
    svg.appendChild(t1);
  }
  const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t2.setAttribute('x', cx);
  t2.setAttribute('y', cy + 14);
  t2.setAttribute('text-anchor', 'middle');
  t2.setAttribute('font-size', '11');
  t2.setAttribute('fill', '#ffffff');
  // Year label removed per spec
  // t2.textContent = String(new Date().getFullYear());
  // svg.appendChild(t2);
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
    txt.setAttribute('font-size', isCustomerView ? '14' : '12');
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
  const useHighlight = Array.isArray(highlightMonths) && highlightMonths.length > 0;
  const hlSet = new Set(useHighlight ? highlightMonths : []);
  for (let m = 0; m < 12; m++) {
    const monthName = MONTHS[m];
    const monthSelected = !useHighlight || hlSet.has(monthName);
    if (restrictMonths && useHighlight && !monthSelected) continue;
    const a1 = (2 * Math.PI) * (m / 12) - Math.PI / 2;
    const a2 = (2 * Math.PI) * ((m + 1) / 12) - Math.PI / 2;
    const qIndex = Math.floor(m / 3);
    // baggrundssegment
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', segPath(cx, cy, rQuarterOuter, rMonthOuter, a1, a2));
    path.setAttribute('fill', `var(--q${qIndex + 1})`);
    const isHl = useHighlight && hlSet.has(monthName);
    path.setAttribute('opacity', isHl ? '0.45' : (useHighlight ? '0.14' : '0.30'));
    if (isHl) {
      path.setAttribute('stroke', 'rgba(255,255,255,0.65)');
      path.setAttribute('stroke-width', '1');
    }
    path.style.transition = 'opacity 260ms ease, stroke 260ms ease';
    path.style.cursor = 'pointer';
    path.classList.add('month-seg');
    path.addEventListener('click', () => callbacks.openMonth(monthName));
    path.addEventListener('dragover', e => e.preventDefault());
    path.addEventListener('drop', e => {
      const id = e.dataTransfer.getData('text/plain');
      callbacks.moveItemToMonth(id, MONTHS[m]);
    });
    svg.appendChild(path);
    // Subtle glow/gradient overlay for highlighted months
    if (isHl && showBubbles) {
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const rInG = rQuarterOuter + 6;
      const rOutG = rMonthOuter - 6;
      glow.setAttribute('d', segPath(cx, cy, rInG, rOutG, a1, a2));
      glow.setAttribute('fill', 'url(#hlGrad)');
      glow.setAttribute('opacity', '0.9');
      glow.setAttribute('filter', 'url(#softGlow)');
      glow.style.pointerEvents = 'none';
      glow.style.transition = 'opacity 260ms ease';
      svg.appendChild(glow);
    }
    // highlight med accent farve hvis der findes aktiviteter i måneden
    const count = monthCounts[MONTHS[m]] || 0;
    if (count > 0) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const rIn = rQuarterOuter + 10;
      const rOut = rMonthOuter - 10;
      p.setAttribute('d', segPath(cx, cy, rIn, rOut, a1, a2));
      p.setAttribute('fill', 'var(--accent)');
      const op = 0.2 + Math.min(count, 3) * 0.15;
      const baseOp = Math.min(op, 0.6);
      const opFinal = isHl ? Math.min(0.85, baseOp + 0.2) : (useHighlight ? Math.max(0.06, baseOp - 0.12) : baseOp);
      p.setAttribute('opacity', String(opFinal));
      p.style.cursor = 'pointer';
      p.classList.add('month-seg');
      if (isHl && showBubbles) p.style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.35))';
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
    txt.setAttribute('font-size', isCustomerView ? '14' : '12');
    txt.setAttribute('fill', isHl ? '#ffffff' : (useHighlight ? 'rgba(255,255,255,0.42)' : '#ffffff'));
    txt.textContent = monthName;
    txt.style.cursor = 'pointer';
    if (isHl) txt.setAttribute('font-weight', '700');
    txt.addEventListener('click', () => callbacks.openMonth(monthName));
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
    const approxMonthIndex = Math.floor((i * 12) / 52);
    if (restrictMonths && useHighlight && !hlSet.has(MONTHS[approxMonthIndex])) continue;
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
      const isWeekHighlighted = useHighlight ? hlSet.has(MONTHS[approxMonthIndex]) : true;
      if (useHighlight && !isWeekHighlighted) {
        g.setAttribute('opacity', '0.35');
        g.style.transform = 'scale(0.97)';
        g.style.filter = 'blur(1px)';
      }
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

      // Persistent info bubbles per activity (disabled when quarter boxes are used)
      if (showBubbles && !showQuarterBoxes) {
        const mi = Math.floor((i * 12) / 52);
        const segInM = i - Math.round(mi * 52 / 12);
        const wk = Math.max(1, Math.min(5, Math.round((segInM * 4) / (52 / 12)) + 1));
        const itemsInSeg = items.filter(x => MONTHS.indexOf(x.month) === mi && x.week === wk);
        itemsInSeg.forEach((it, idxInSeg) => {
          const color = CAT_COLORS[it.cat] || 'var(--accent)';
          // Measure actual marker position after transforms
          const svgRect = svg.getBoundingClientRect();
          const centerX = svgRect.left + svgRect.width / 2;
          const centerY = svgRect.top + svgRect.height / 2;
          const markerRect = g.getBoundingClientRect();
          const px = markerRect.left + markerRect.width / 2;
          const py = markerRect.top + markerRect.height / 2;
          createPersistentBubble(bubbleLayer, centerX, centerY, px, py, it, color, idxInSeg);
          // Emphasis on hover
          g.addEventListener('mouseenter', () => emphasizeBubble(bubbleLayer, it, true));
          g.addEventListener('mouseleave', () => emphasizeBubble(bubbleLayer, it, false));
        });
      }
    }
  }

  // Quarter boxes: one per quarter outside the wheel
  if (showQuarterBoxes) {
    renderQuarterBoxes(svg, bubbleLayer, items, { cx, cy, size, rWeekOuter }, { panX, panY, zoom });
  }
}

// ====== Event bubble helpers ======
let currentBubble = null;
let currentThread = null;
function hideEventBubble() {
  if (currentBubble) { currentBubble.classList.remove('show'); setTimeout(()=>{ if(currentBubble&&currentBubble.parentNode) currentBubble.parentNode.removeChild(currentBubble); currentBubble=null; }, 200); }
  if (currentThread) { if(currentThread.parentNode) currentThread.parentNode.removeChild(currentThread); currentThread = null; }
}
function showEventBubble(svg, x, y, item, color) {
  hideEventBubble();
  const wrap = svg.parentElement;
  if (!wrap) return;
  const bubble = document.createElement('div');
  bubble.className = 'event-bubble';
  const dateStr = item.date ? new Date(item.date).toLocaleDateString('da-DK') : '';
  const tf = (item.timeFrom||'').trim();
  const tt = (item.timeTo||'').trim();
  const tRange = tf && tt ? ` · ${tf}-${tt}` : '';
  bubble.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0;">
        <div class="heading" style="font-size:12px;">${item.title}</div>
        <div class="badges"><span class="badge cat" style="border-color:${color};color:${color};">${item.cat}</span><span class="badge status" style="border-color:${(STATUS_COLORS[item.status||'Planlagt']||'#999')};color:${(STATUS_COLORS[item.status||'Planlagt']||'#999')};">${item.status||'Planlagt'}</span></div>
      </div>
      <div class="meta" style="font-size:11px;opacity:.9;text-align:right;white-space:nowrap;"><span>${dateStr}${tRange}</span><span style="margin-left:8px;">Uge ${item.isoWeek||item.week}</span></div>
    </div>
    ${item.note?`<div class="note" style="font-size:11px;opacity:.9;margin-top:6px;">${item.note}</div>`:''}
  `;
  const thread = document.createElement('div');
  thread.className = 'event-thread';
  thread.style.background = `linear-gradient(90deg, rgba(255,255,255,0.0), ${color})`;
  wrap.appendChild(bubble);
  wrap.appendChild(thread);
  // Position bubble outside the wheel, try right then left then top/bottom
  const rect = wrap.getBoundingClientRect();
  const px = x; const py = y;
  const pref = [ {dx: 140, dy: -20}, {dx: -320, dy: -20}, {dx: -80, dy: -120}, {dx: -80, dy: 80} ];
  let placed = false;
  for (const p of pref) {
    const left = px + p.dx;
    const top = py + p.dy;
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
    const bcr = bubble.getBoundingClientRect();
    if (bcr.left >= rect.left + 8 && bcr.right <= rect.right - 8 && bcr.top >= rect.top + 8 && bcr.bottom <= rect.bottom - 8) { placed = true; break; }
  }
  if (!placed) { bubble.style.left = (px + 120) + 'px'; bubble.style.top = (py - 20) + 'px'; }
  // Thread from marker to bubble edge
  const bcr2 = bubble.getBoundingClientRect();
  const wrapCR = wrap.getBoundingClientRect();
  const x1 = px; const y1 = py; const x2 = Math.max(bcr2.left - wrapCR.left, Math.min(bcr2.right - wrapCR.left, x1 + 1)); const y2 = Math.max(bcr2.top - wrapCR.top, Math.min(bcr2.bottom - wrapCR.top, y1));
  const len = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  thread.style.left = x1 + 'px';
  thread.style.top = y1 + 'px';
  thread.style.width = len + 'px';
  thread.style.transformOrigin = '0 0';
  thread.style.transform = `rotate(${angle}deg)`;
  requestAnimationFrame(()=> bubble.classList.add('show'));
  currentBubble = bubble; currentThread = thread;
}

// Create persistent bubble that stays visible
function createPersistentBubble(svg, cx, cy, x, y, item, color, offsetIndex) {
  const wrap = svg.parentElement;
  if (!wrap) return;
  const id = `bubble_${(item.id||item.title||'').toString().replace(/[^a-z0-9]/ig,'_')}`;
  const existing = document.getElementById(id);
  if (existing) { existing.parentNode.removeChild(existing); }
  const bubble = document.createElement('div');
  bubble.className = 'event-bubble show';
  bubble.id = id;
  const dateStr = item.date ? new Date(item.date).toLocaleDateString('da-DK') : '';
  const tf = (item.timeFrom||'').trim();
  const tt = (item.timeTo||'').trim();
  const tRange = tf && tt ? ` · ${tf}-${tt}` : '';
  bubble.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0;">
        <div class="heading" style="font-size:12px;">${item.title}</div>
        <div class="badges"><span class="badge cat" style="border-color:${color};color:${color};">${item.cat}</span><span class="badge status">${item.status||'Planlagt'}</span></div>
      </div>
      <div class="meta" style="font-size:11px;opacity:.9;text-align:right;white-space:nowrap;">${dateStr?`<span>${dateStr}${tRange}</span>`:''}<span style="margin-left:8px;">Uge ${item.isoWeek||item.week}</span></div>
    </div>
    ${item.note?`<div class=\"note\" style=\"font-size:11px;opacity:.9;margin-top:6px;\">${item.note}</div>`:''}
  `;
  const thread = document.createElement('div');
  thread.className = 'event-thread';
  thread.style.background = `linear-gradient(90deg, rgba(255,255,255,0.0), ${color})`;
  wrap.appendChild(bubble);
  wrap.appendChild(thread);
  // Side stacking layout (no-overlap, roughly aligned with marker Y)
  const wrapCR = wrap.getBoundingClientRect();
  // pre-measure bubble to know width/height
  bubble.style.left = '-9999px'; bubble.style.top = '-9999px';
  const bcrTest = bubble.getBoundingClientRect();
  const bw = bcrTest.width || 240; const bh = bcrTest.height || 80;
  const margin = 12; const gap = 10;
  const isRight = x >= cx;
  // Use layer registries
  wrap._leftRects = wrap._leftRects || [];
  wrap._rightRects = wrap._rightRects || [];
  let left, top;
  const targetTop = Math.round(y - bh / 2);
  if (isRight) {
    left = wrapCR.right - margin - bw;
    const col = wrap._rightRects;
    // start at preferred position, then push down to avoid overlaps
    top = Math.max(targetTop, (col.length ? col[col.length - 1].bottom + gap : wrapCR.top + margin));
    // clamp bottom; if clamped, try shifting up without overlapping previous
    if (top + bh > wrapCR.bottom - margin) {
      top = Math.min(targetTop, wrapCR.bottom - margin - bh);
      // walk upwards to avoid overlapping previous rects
      for (let i = col.length - 1; i >= 0; i--) {
        const prev = col[i];
        if (top < prev.bottom + gap) top = prev.top - gap - bh; else break;
      }
      top = Math.max(wrapCR.top + margin, top);
    }
    col.push({ left, top, right: left + bw, bottom: top + bh });
  } else {
    left = wrapCR.left + margin;
    const col = wrap._leftRects;
    top = Math.max(targetTop, (col.length ? col[col.length - 1].bottom + gap : wrapCR.top + margin));
    if (top + bh > wrapCR.bottom - margin) {
      top = Math.min(targetTop, wrapCR.bottom - margin - bh);
      for (let i = col.length - 1; i >= 0; i--) {
        const prev = col[i];
        if (top < prev.bottom + gap) top = prev.top - gap - bh; else break;
      }
      top = Math.max(wrapCR.top + margin, top);
    }
    col.push({ left, top, right: left + bw, bottom: top + bh });
  }
  // Clamp inside container vertically
  top = Math.max(wrapCR.top + margin, Math.min(wrapCR.bottom - margin - bh, top));
  bubble.style.left = (left - wrapCR.left) + 'px';
  bubble.style.top  = (top - wrapCR.top) + 'px';
  // Thread from marker to nearest edge of bubble rect
  const finalRect = { left, top, right: left + bw, bottom: top + bh };
  const x1 = x, y1 = y;
  const x2 = Math.max(finalRect.left, Math.min(finalRect.right, x1));
  const y2 = Math.max(finalRect.top,  Math.min(finalRect.bottom, y1));
  const len = Math.hypot(x2-x1, y2-y1);
  const angle = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI;
  thread.style.left = (x1 - wrapCR.left) + 'px';
  thread.style.top  = (y1 - wrapCR.top)  + 'px';
  thread.style.width = len + 'px';
  thread.style.transformOrigin = '0 0';
  thread.style.transform = `rotate(${angle}deg)`;
  // Hover emphasis
  bubble.addEventListener('mouseenter', () => emphasizeBubble(svg, item, true));
  bubble.addEventListener('mouseleave', () => emphasizeBubble(svg, item, false));
}

function emphasizeBubble(svg, item, on) {
  const id = `bubble_${(item.id||item.title||'').toString().replace(/[^a-z0-9]/ig,'_')}`;
  const bubble = document.getElementById(id);
  if (bubble) bubble.style.boxShadow = on ? '0 22px 60px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.12)' : '0 18px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.08)';
}

// ====== Quarter boxes ======
function renderQuarterBoxes(svg, layer, items, geom, transform) {
  const wrap = layer.parentElement; if (!wrap) return;
  // Remove previously rendered quarter boxes to prevent duplicates on re-render
  try { [...wrap.querySelectorAll('.quarter-box')].forEach(n => n.parentNode && n.parentNode.removeChild(n)); } catch {}
  const wrapCR = wrap.getBoundingClientRect();
  const { cx, cy, size, rWeekOuter } = geom; const { panX, panY, zoom } = transform;
  // Positions for Q1..Q4 boxes (relative to wrap), corners outside wheel
  const boxW = Math.min(280, wrapCR.width * 0.26), boxPad = 12;
  const columns = {
    Q1: { left: wrapCR.right - boxW - 12, top: wrapCR.top + 12 },
    Q2: { left: wrapCR.right - boxW - 12, top: wrapCR.bottom - 12 - 220 },
    Q3: { left: wrapCR.left + 12, top: wrapCR.bottom - 12 - 220 },
    Q4: { left: wrapCR.left + 12, top: wrapCR.top + 12 }
  };
  const isCustomer = !!(document && document.body && document.body.classList && document.body.classList.contains('customer'));
  // Lines disabled: we skip creating a thread layer
  const DRAW_THREADS = false;
  // Group items by quarter
  const byQ = { Q1:[], Q2:[], Q3:[], Q4:[] };
  items.forEach(it => { const q = it.quarter || inferQuarter(it.month); if (byQ[q]) byQ[q].push(it); });
  Object.keys(byQ).forEach(q => {
    const box = document.createElement('div');
    box.className = `event-bubble show quarter-box qbox-${q}`;
    box.style.fontSize = '12px';
    box.style.minWidth = boxW + 'px';
    box.style.maxWidth = boxW + 'px';
    if (isCustomer) {
      // Pin each quarter to its respective corner
      if (q === 'Q1') { box.style.right = '12px'; box.style.top = '12px'; }
      else if (q === 'Q2') { box.style.right = '12px'; box.style.bottom = '12px'; }
      else if (q === 'Q3') { box.style.left = '12px'; box.style.bottom = '12px'; }
      else /* Q4 */ { box.style.left = '12px'; box.style.top = '12px'; }
    } else {
      box.style.left = (columns[q].left - wrapCR.left) + 'px';
      box.style.top = (columns[q].top - wrapCR.top) + 'px';
    }
    // Title
    const title = `<div class="heading" style="margin-bottom:6px;">${q}</div>`;
    // Unified Q2-like layout with separators between activities
    const arr = (byQ[q] || []).slice().sort((a,b)=> {
      const ma = MONTHS.indexOf(a.month), mb = MONTHS.indexOf(b.month);
      if (ma !== mb) return ma - mb;
      if ((a.week||0) !== (b.week||0)) return (a.week||0) - (b.week||0);
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
    let rows = arr.map((it, idx) => {
      const color = CAT_COLORS[it.cat] || 'var(--accent)';
      const dateStr = it.date ? new Date(it.date).toLocaleDateString('da-DK') : '';
      const tf = (it.timeFrom||'').trim();
      const tt = (it.timeTo||'').trim();
      const tRange = tf && tt ? ` · ${tf}-${tt}` : '';
      const border = idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.12)';
      return `<div class="q-row" style="padding:8px 6px;border-top:${border};">
        <div class="meta" style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;">
          <span style="font-weight:600;">${it.title}</span>
          <span>${it.isoWeek?`Uge ${it.isoWeek}`:''}${dateStr?` · ${dateStr}`:''}${tRange}</span>
          <span class="badge cat" style="border-color:${color};color:${color};">${it.cat}</span>
          <span class="badge status">${it.status||'Planlagt'}</span>
        </div>
      </div>`;
    }).join('');
    if (arr.length === 0) {
      rows = `<div class="empty">Ingen aktiviteter</div>`;
    }
    box.innerHTML = title + rows;
    wrap.appendChild(box);
    // Draw thread for this quarter box (only for rendered ones)
    // Quarter centerline angle computed from geometry (mid of quarter sector)
    const qi = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 }[q];
    const qa1 = (2 * Math.PI) * (qi / 4) - Math.PI / 2;
    const qa2 = (2 * Math.PI) * ((qi + 1) / 4) - Math.PI / 2;
    const a1 = (qa1 + qa2) / 2;
    // Target point slightly INSIDE the week outer radius (so fade ends before wheel edge)
    const fadeStopPad = 28; // px inside wheel outer edge
    const rStop = Math.max(0, (rWeekOuter || size*0.46) - fadeStopPad);
    const [tx, ty] = polar(cx, cy, rStop, a1);
    const rect = svg.getBoundingClientRect();
    const cX = rect.left + rect.width/2, cY = rect.top + rect.height/2;
    const endX = cX + (tx - cX)*zoom + panX;
    const endY = cY + (ty - cY)*zoom + panY;
    // Start point from the box edge facing the wheel
    const bcr = box.getBoundingClientRect();
    const boxLeft = bcr.left - wrapCR.left;
    const boxTop = bcr.top - wrapCR.top;
    const boxRight = bcr.right - wrapCR.left;
    const boxBottom = bcr.bottom - wrapCR.top;
    const boxMidY = (boxTop + boxBottom) / 2;
    let startX, startY;
    const edgeInset = 6; // px inside the box to avoid cutting the border/glow
    if (q === 'Q1' || q === 'Q2') {
      // Left edge, mid
      startX = boxLeft + edgeInset;
      startY = boxMidY;
    } else if (q === 'Q3') {
      // Right edge, slightly above mid
      startX = boxRight - edgeInset;
      startY = boxMidY - 4;
    } else { // Q4
      // Right edge, mid
      startX = boxRight - edgeInset;
      startY = boxMidY;
    }
    // Build a gentle one-control-point curve (quadratic Bezier)
    const vx = endX - startX;
    const vy = endY - startY;
    // Place control near mid with directional bias following the red guides:
    // right-side boxes (Q1,Q2) bias left; left-side (Q3,Q4) bias right.
    // top quadrants (Q1,Q4) bias slightly downward; bottom (Q2,Q3) slightly upward.
    const sideBiasX = (q === 'Q1' || q === 'Q2') ? -12 : 12;
    const verticalBiasY = (q === 'Q1' || q === 'Q4') ? 8 : -8;
    const cx1 = startX + vx * 0.5 + sideBiasX;
    const cy1 = startY + vy * 0.5 + verticalBiasY;
    // Threads are disabled entirely
    if (!DRAW_THREADS) {
      return;
    }
  });
}

function inferQuarter(monthName) {
  const m = MONTHS.indexOf(monthName);
  if (m < 0) return 'Q1';
  if (m < 3) return 'Q1';
  if (m < 6) return 'Q2';
  if (m < 9) return 'Q3';
  return 'Q4';
}
