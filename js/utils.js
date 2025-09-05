// utils.js
// Indeholder matematiske hjælpefunktioner til beregning af polære
// koordinater og opbygning af SVG‑stier. Disse funktioner kan
// importeres af flere moduler (fx wheel.js) uden cirkulære
// afhængigheder.

/**
 * Beregn x/y koordinater ud fra centrum, radius og vinkel.
 * @param {number} cx Centerets x‑koordinat
 * @param {number} cy Centerets y‑koordinat
 * @param {number} r Radius
 * @param {number} a Vinkel i radianer
 * @returns {[number, number]}
 */
export function polar(cx, cy, r, a) {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/**
 * Byg en SVG‑kommando for et buestykke (arc) mellem to vinkler på en cirkel.
 * Anvendes til opbygning af segmenter i hjulet.
 * @param {number} cx Centerets x
 * @param {number} cy Centerets y
 * @param {number} r Radius
 * @param {number} a1 Startvinkel (radianer)
 * @param {number} a2 Slutvinkel (radianer)
 * @returns {string}
 */
export function arc(cx, cy, r, a1, a2) {
  const [sx, sy] = polar(cx, cy, r, a1);
  const [ex, ey] = polar(cx, cy, r, a2);
  const large = a2 - a1 > Math.PI ? 1 : 0;
  return `A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

/**
 * Opbygger en lukket sti for et ringsegment mellem to radier og vinkler.
 * @param {number} cx
 * @param {number} cy
 * @param {number} rIn Indre radius
 * @param {number} rOut Ydre radius
 * @param {number} a1 Startvinkel
 * @param {number} a2 Slutvinkel
 * @returns {string}
 */
export function segPath(cx, cy, rIn, rOut, a1, a2) {
  const [sx, sy] = polar(cx, cy, rOut, a1);
  const [ix, iy] = polar(cx, cy, rIn, a2);
  return `M ${sx} ${sy} ${arc(cx, cy, rOut, a1, a2)} L ${ix} ${iy} ${arc(cx, cy, rIn, a2, a1)} Z`;
}

/**
 * Calculate ISO week number for a given Date.
 * @param {Date} date
 * @returns {number} 1-53
 */
export function getIsoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil(((d - yearStart) / 86400000 + 1)/7);
}

/**
 * Formatér dato som dd/mm/yyyy (dansk med skråstreger).
 * Accepterer Date eller dato‑streng.
 * @param {Date|string} input
 * @returns {string}
 */
export function formatDateDK(input) {
  try {
    const d = (input instanceof Date) ? input : new Date(input);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return '';
  }
}