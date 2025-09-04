// list.js
// Rendér aktivitetslisten. Modulet sorterer posterne og genererer
// DOM‑elementer ud fra en <template>. Event handlers kaldes via
// callback‑objektet, så listen forbliver ren og uafhængig.

import { sortItems, CAT_COLORS, STATUS_COLORS } from './store.js';

// Darken a hex color by a given amount (0..1)
function darkenHex(hex, amount = 0.35) {
  try {
    const norm = String(hex).trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(norm)) return hex;
    const h = norm.startsWith('#') ? norm.slice(1) : norm;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const f = Math.max(0, Math.min(1, amount));
    const rd = Math.max(0, Math.min(255, Math.round(r * (1 - f))));
    const gd = Math.max(0, Math.min(255, Math.round(g * (1 - f))));
    const bd = Math.max(0, Math.min(255, Math.round(b * (1 - f))));
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(rd)}${toHex(gd)}${toHex(bd)}`;
  } catch {
    return hex;
  }
}

function pickTextColorForHexBackground(hex) {
  try {
    const norm = String(hex).trim();
    const h = norm.startsWith('#') ? norm.slice(1) : norm;
    if (h.length !== 6) return '#ffffff';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? '#0A1B2A' : '#ffffff';
  } catch {
    return '#ffffff';
  }
}

/**
 * Render aktiviteter i en given container.
 * @param {HTMLElement} listEl Beholder hvor elementerne skal indsættes
 * @param {Array<Object>} items Liste over alle aktiviteter
 * @param {Object} callbacks Callback funktioner
 *   - onEdit(item)
 *   - onOpen(monthName)
 *   - onDelete(id)
 */
export function renderList(listEl, items, callbacks) {
  listEl.innerHTML = '';
  // find template
  const tpl = document.getElementById('itemTemplate');
  const sorted = sortItems(items);
  sorted.forEach(it => {
    const el = tpl.content.firstElementChild.cloneNode(true);
    // Sikr at glass-stil altid tilføjes (også hvis template ikke er opdateret)
    el.classList.add('glass');
    el.dataset.id = it.id;
    el.querySelector('.title').textContent = it.title;
    const meta = el.querySelector('.meta');
    const badge = document.createElement('span');
    badge.className = 'badge cat';
    badge.textContent = it.cat;
    badge.style.marginRight = '10px';
    const color = CAT_COLORS[it.cat] || 'var(--accent)';
    const darkerCatBg = darkenHex(color, 0.35);
    const darkerCatBorder = darkenHex(color, 0.45);
    badge.style.background = darkerCatBg;
    badge.style.borderColor = darkerCatBorder;
    badge.style.color = pickTextColorForHexBackground(darkerCatBg);
    const statusBadge = document.createElement('span');
    statusBadge.className = 'badge status';
    const sColor = STATUS_COLORS[it.status || 'Planlagt'] || '#999';
    const darkerStatusBg = darkenHex(sColor, 0.35);
    const darkerStatusBorder = darkenHex(sColor, 0.45);
    statusBadge.style.background = darkerStatusBg;
    statusBadge.style.borderColor = darkerStatusBorder;
    statusBadge.style.color = pickTextColorForHexBackground(darkerStatusBg);
    statusBadge.textContent = it.status || 'Planlagt';
    // Missing owner badge
    if (!it.owner || String(it.owner).trim() === '') {
      const unassigned = document.createElement('span');
      unassigned.className = 'badge tag';
      unassigned.textContent = 'Ikke tildelt';
      unassigned.style.borderColor = 'rgba(255,255,255,0.28)';
      unassigned.style.color = '#cfe8e4';
      meta.appendChild(unassigned);
    }
    meta.innerHTML = '';
    meta.appendChild(badge);
    meta.appendChild(statusBadge);
    const dateStr = it.date ? new Date(it.date).toLocaleDateString('da-DK') : '';
    const timeFrom = (it.timeFrom||'').trim();
    const timeTo = (it.timeTo||'').trim();
    const timeStr = timeFrom && timeTo ? `${timeFrom}-${timeTo}` : (it.date ? new Date(it.date).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }) : '');
    const weekStr = it.isoWeek ? ` · Uge ${it.isoWeek}` : '';
    const qy = it.quarter && it.year ? ` · ${it.quarter} · ${it.year}` : '';
    const owner = it.owner ? ` · Ansvarlig: ${it.owner}` : '';
    meta.append(` ${it.month}${weekStr} · ${dateStr}${timeStr?` · ${timeStr}`:''}${qy}${owner}`);

    // Inline details (hidden by default)
    const details = document.createElement('div');
    details.className = 'inline-details';
    details.style.display = 'none';
    if (it.note) {
      const noteDiv = document.createElement('div');
      noteDiv.className = 'note';
      noteDiv.textContent = it.note;
      details.appendChild(noteDiv);
    }
    if (it.attachments && it.attachments.length) {
      const files = document.createElement('div');
      files.className = 'attachments';
      it.attachments.forEach(a => {
        const row = document.createElement('div');
        row.style.display = 'inline-flex';
        row.style.gap = '6px';
        row.style.alignItems = 'center';
        const nameChip = document.createElement('span');
        nameChip.className = 'attach-chip';
        nameChip.textContent = a.name;
        const dl = document.createElement('a');
        dl.className = 'attach-chip';
        dl.textContent = 'Hent fil';
        if (a.dataUrl) { dl.href = a.dataUrl; dl.download = a.name; } else { dl.href = '#'; dl.addEventListener('click', e => e.preventDefault()); dl.title = 'Fil ikke tilgængelig'; }
        row.appendChild(nameChip);
        row.appendChild(dl);
        files.appendChild(row);
      });
      details.appendChild(files);
    }
    el.querySelector('.item-content').appendChild(details);

    // Ensure title is on its own line at the top
    const contentEl = el.querySelector('.item-content');
    contentEl.style.display = 'block';
    const titleEl = el.querySelector('.title');
    if (titleEl) {
      titleEl.style.display = 'block';
      titleEl.style.marginBottom = '4px';
    }

    // Rediger
    el.querySelector('[data-act="edit"]').addEventListener('click', () => {
      callbacks.onEdit(it);
    });
    // Slet
    el.querySelector('[data-act="del"]').addEventListener('click', () => {
      callbacks.onDelete(it.id);
    });
    // Drag & drop
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', it.id);
    });
    // Toggle inline details when clicking item (ignore clicks in actions)
    el.addEventListener('click', e => {
      if (e.target.closest('.actions')) return;
      const open = details.style.display !== 'none';
      details.style.display = open ? 'none' : 'block';
    });

    listEl.appendChild(el);
  });
}
