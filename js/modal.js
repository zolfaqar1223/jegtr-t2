// modal.js
// Håndtering af månedsmodalen. Modulet udstiller funktioner til at
// åbne og lukke modalen samt gemme noter. Modalens DOM‑elementer
// bliver slået op lokalt inden i funktionerne.

import { sortItems } from './store.js';

/**
 * Åbn månedsmodalen for en given måned.
 * @param {string} monthName Navn på måneden der skal åbnes
 * @param {Array<Object>} items Liste over alle aktiviteter
 * @param {Object} notes Objekt med eksisterende noter
 * @param {Object} callbacks
 *   - onSaveNotes(monthName, text)
 */
export function openModal(monthName, items, notes, callbacks, opts = {}) {
  const modal = document.getElementById('monthModal');
  const titleEl = document.getElementById('modalTitle');
  const actsEl = document.getElementById('modalActs');
  const notesEl = document.getElementById('monthNotes');
  titleEl.textContent = monthName;
  // udfyld liste
  actsEl.innerHTML = '';
  let monthItems = sortItems(items).filter(x => x.month === monthName);
  if (opts && typeof opts.week === 'number') {
    monthItems = monthItems.filter(x => x.week === opts.week);
  }
  if (monthItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'item glass';
    empty.textContent = 'Ingen aktiviteter';
    actsEl.appendChild(empty);
  } else {
    monthItems.forEach(x => {
      const d = document.createElement('div');
      d.className = 'item glass';
      d.style.flexDirection = 'column';
      d.style.gap = '4px';
      d.innerHTML = `<strong>${x.title}</strong><div class="meta">Uge ${x.week} · ${x.cat}</div>${x.note ? `<div class="note">${x.note}</div>` : ''}`;
      actsEl.appendChild(d);
    });
  }
  notesEl.value = notes[monthName] || '';
  // Gem noter handler
  const saveBtn = document.getElementById('btnSaveNotes');
  const onSave = () => {
    callbacks.onSaveNotes(monthName, notesEl.value);
    closeModal();
  };
  saveBtn.onclick = onSave;
  // Luk
  const closeBtn = document.getElementById('btnCloseModal');
  closeBtn.onclick = closeModal;
  modal.classList.add('open');
}

/**
 * Luk månedsmodalen.
 */
export function closeModal() {
  const modal = document.getElementById('monthModal');
  if (modal) {
    modal.classList.remove('open');
  }
}
