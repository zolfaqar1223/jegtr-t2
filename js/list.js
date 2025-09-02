// list.js
// Rendér aktivitetslisten. Modulet sorterer posterne og genererer
// DOM‑elementer ud fra en <template>. Event handlers kaldes via
// callback‑objektet, så listen forbliver ren og uafhængig.

import { sortItems, CAT_COLORS, STATUS_COLORS } from './store.js';

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
    badge.style.background = color;
    badge.style.borderColor = color;
    const statusBadge = document.createElement('span');
    statusBadge.className = 'badge status';
    const sColor = STATUS_COLORS[it.status || 'Planlagt'] || '#999';
    statusBadge.style.background = sColor;
    statusBadge.style.borderColor = sColor;
    statusBadge.textContent = it.status || 'Planlagt';
    meta.innerHTML = '';
    meta.appendChild(badge);
    meta.appendChild(statusBadge);
    const dateStr = it.date ? new Date(it.date).toLocaleDateString('da-DK') : '';
    const owner = it.owner ? ` · Ansvarlig: ${it.owner}` : '';
    meta.append(` ${it.month} · ${dateStr}${owner}`);

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

    // Grid layout for a bit more space
    el.querySelector('.item-content').style.display = 'grid';
    el.querySelector('.item-content').style.gridTemplateColumns = 'auto 1fr';
    el.querySelector('.item-content').style.gap = '10px 14px';

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
