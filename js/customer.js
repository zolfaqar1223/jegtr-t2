// Kundevisning: read-only rendering af hjul og liste
import { MONTHS, readItems, readNotes, CAT_COLORS, STATUSES, CATS } from './store.js';
import { drawWheel } from './wheel.js';

const wheelSvg = document.getElementById('wheel');
// timeline UI removed
const listContainer = document.getElementById('list');
const nextBox = document.getElementById('nextBox');
const filterCat = document.getElementById('custFilterCat');
const filterStatus = document.getElementById('custFilterStatus');
const monthNotesList = document.getElementById('monthNotesList');
const seeAllBtn = document.getElementById('seeAllCustomer');
const viewerModal = document.getElementById('viewerModal');
const viewerTitle = document.getElementById('viewerTitle');
const viewerMeta = document.getElementById('viewerMeta');
const viewerNote = document.getElementById('viewerNote');
const viewerPrev = document.getElementById('viewerPrev');
const viewerNext = document.getElementById('viewerNext');
const viewerAttach = document.getElementById('viewerAttach');
let orderedCache = [];
let currentIndex = -1;

let items = [];
let notes = {};
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanMode = false;
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
// no timeline renderer

function renderListReadOnly(listEl, itemsToShow) {
  listEl.innerHTML = '';
  if (itemsToShow.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Ingen aktiviteter';
    listEl.appendChild(empty);
    return;
  }
  const ordered = groupByMonth(itemsToShow);
  orderedCache = ordered.flatMap(g => g.items);
  ordered.forEach(group => {
    const header = document.createElement('div');
    header.className = 'group-title';
    header.textContent = group.month;
    listEl.appendChild(header);
    group.items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'item glass';
      const content = document.createElement('div');
      content.className = 'item-content';
      const title = document.createElement('strong');
      title.className = 'title';
      title.textContent = it.title;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const color = CAT_COLORS[it.cat] || 'var(--accent)';
      const badge = `<span class=\"badge cat\" style=\"background:rgba(255,255,255,0.06);border-color:${color};color:${color};margin-right:10px;\">${it.cat}</span>`;
      const dateStr = it.date ? new Date(it.date).toLocaleDateString('da-DK') : new Date().toLocaleDateString('da-DK');
      meta.innerHTML = `${badge}${it.month} · ${dateStr}`;
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = it.note || '';
      // attachments
      const attach = document.createElement('div');
      attach.className = 'attachments';
      if (it.attachments && it.attachments.length) {
        it.attachments.forEach(a => {
          const link = document.createElement('a'); link.className = 'attach-chip'; link.textContent = a.name; if (a.dataUrl) { link.href = a.dataUrl; link.download = a.name; } else { link.href = '#'; }
          attach.appendChild(link);
        });
      }
      content.appendChild(title);
      content.appendChild(meta);
      if (it.note) content.appendChild(note);
      if (attach.children.length) content.appendChild(attach);
      el.appendChild(content);
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => openViewerById(it));
      listEl.appendChild(el);
    });
  });
}

function groupByMonth(arr) {
  const by = {};
  arr.forEach(it => { (by[it.month] = by[it.month] || []).push(it); });
  return MONTHS.map(m => ({ month: m, items: (by[m]||[]).sort((a,b)=> a.week===b.week ? a.title.localeCompare(b.title) : a.week-b.week) }))
               .filter(g => g.items.length);
}

function renderMonthNotes(listEl) {
  if (!listEl) return;
  listEl.innerHTML = '';
  const monthsWithNotes = Object.keys(notes || {}).filter(k => (notes[k] || '').trim().length > 0);
  if (monthsWithNotes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'item glass';
    empty.textContent = 'Ingen månedsnoter';
    listEl.appendChild(empty);
    return;
  }
  monthsWithNotes.forEach(m => {
    const el = document.createElement('div');
    el.className = 'item glass';
    el.style.flexDirection = 'column';
    el.style.gap = '6px';
    const title = document.createElement('strong');
    title.textContent = m;
    const n = document.createElement('div');
    n.className = 'note';
    n.textContent = notes[m];
    el.appendChild(title);
    el.appendChild(n);
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      openViewer({ title: `Månedsnoter · ${m}`, month: m, cat: '', note: notes[m] || '' });
    });
    listEl.appendChild(el);
  });
}

function openViewer(item) {
  if (!viewerModal) return;
  viewerTitle.textContent = item.title;
  const dateStr = item.date ? new Date(item.date).toLocaleDateString('da-DK') : '';
  viewerMeta.textContent = `${item.month} · ${dateStr} · ${item.cat}`;
  viewerNote.textContent = item.note || '';
  // attachments
  if (viewerAttach) {
    viewerAttach.innerHTML = '';
    if (item.attachments && item.attachments.length) {
      item.attachments.forEach(a => {
        const chip = document.createElement('a');
        chip.className = 'attach-chip';
        chip.textContent = a.name;
        if (a.dataUrl) {
          chip.href = a.dataUrl;
          chip.download = a.name;
        } else {
          chip.href = '#';
        }
        viewerAttach.appendChild(chip);
      });
    }
  }
  viewerModal.classList.add('open');
}

function openViewerById(item) {
  const idx = orderedCache.findIndex(x => x === item);
  currentIndex = idx;
  openViewer(item);
}

function closeViewer() {
  if (!viewerModal) return;
  viewerModal.classList.remove('open');
}

function render(focusedMonth = null) {
  const callbacks = {
    openMonth: monthName => {
      render(monthName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    moveItemToMonth: () => {},
    moveItemToMonthWeek: () => {}
  };
  drawWheel(wheelSvg, items, callbacks, { focusedMonth });
  // Apply zoom on customer wheel similar to main
  clampPanCustomer();
  wheelSvg.style.transformOrigin = '50% 50%';
  wheelSvg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`.replace('{panX}', panX).replace('{panY}', panY);
  const listItems = focusedMonth ? items.filter(x => x.month === focusedMonth) : items;
  renderListReadOnly(listContainer, listItems);
  renderMonthNotes(monthNotesList);
  // Collapsible activities (customer view)
  const aToggle = document.getElementById('activitiesToggle');
  const listEl = document.getElementById('list');
  if (aToggle && listEl && !aToggle.dataset.bound) {
    aToggle.dataset.bound = '1';
    aToggle.addEventListener('click', () => {
      listEl.style.display = listEl.style.display === 'none' ? '' : 'none';
    });
  }
}

// clamp + smooth helpers for customer
function clampPanCustomer() {
  const max = 100;
  panX = Math.max(-max, Math.min(max, panX));
  panY = Math.max(-max, Math.min(max, panY));
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const dataParam = params.get('data');
  if (dataParam) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(dataParam)))));
      if (Array.isArray(decoded.items)) items = decoded.items;
      if (decoded.notes && typeof decoded.notes === 'object') notes = decoded.notes;
    } catch (e) {
      items = readItems();
      notes = readNotes();
    }
  } else {
    items = readItems();
    notes = readNotes();
  }

  document.getElementById('btnPrintCustomer').addEventListener('click', () => {
    window.print();
  });
  // populate filters
  if (filterCat && filterStatus) {
    ['Alle', ...CATS].forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; filterCat.appendChild(o); });
    ['Alle', ...STATUSES].forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; filterStatus.appendChild(o); });
    const applyFilters = () => {
      const cat = filterCat.value || 'Alle';
      const st = filterStatus.value || 'Alle';
      let arr = [...items];
      if (cat !== 'Alle') arr = arr.filter(i => i.cat === cat);
      if (st !== 'Alle') arr = arr.filter(i => (i.status||'Planlagt') === st);
      renderListReadOnly(listContainer, arr);
      renderNext(arr);
    };
    filterCat.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);
  }
  // render next box
  renderNext(items);
  // Add zoom controls on customer view
  const wrap = document.querySelector('.wheel-wrap');
  if (wrap && !wrap.querySelector('.zoom-controls')) {
    const zc = document.createElement('div');
    zc.className = 'zoom-controls';
    const btnMinus = document.createElement('button');
    btnMinus.textContent = '−';
    const btnPlus = document.createElement('button');
    btnPlus.textContent = '+';
    const btnPan = document.createElement('button');
    btnPan.textContent = 'Pan';
    btnPan.className = 'pan';
    zc.appendChild(btnMinus);
    zc.appendChild(btnPlus);
    zc.appendChild(btnPan);
    wrap.appendChild(zc);
    btnMinus.addEventListener('click', () => {
      zoomLevel = Math.max(0.6, Math.round((zoomLevel - 0.1) * 10) / 10);
      render();
    });
    btnPlus.addEventListener('click', () => {
      zoomLevel = Math.min(1.6, Math.round((zoomLevel + 0.1) * 10) / 10);
      render();
    });
    btnPan.addEventListener('click', () => {
      isPanMode = !isPanMode;
      wrap.style.cursor = isPanMode ? 'grab' : '';
      if (isPanMode) btnPan.classList.add('active');
      else btnPan.classList.remove('active');
    });
    wrap.addEventListener('mousedown', e => {
      if (!isPanMode) return;
      isPanning = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      wrap.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
      if (!isPanning) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      panX += dx * 0.85;
      panY += dy * 0.85;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      render();
    });
    window.addEventListener('mouseup', () => {
      if (!isPanning) return;
      isPanning = false;
      wrap.style.cursor = isPanMode ? 'grab' : '';
      render();
    });
  }
  const vc = document.getElementById('viewerClose');
  if (vc) vc.addEventListener('click', closeViewer);
  const seeAll = () => render(null);
  if (seeAllBtn) seeAllBtn.addEventListener('click', seeAll);

  // timeline UI removed
  if (viewerModal) {
    viewerModal.addEventListener('click', (e) => {
      if (e.target === viewerModal) closeViewer();
    });
  }
  if (viewerPrev) viewerPrev.addEventListener('click', () => {
    if (orderedCache.length === 0) return;
    currentIndex = (currentIndex - 1 + orderedCache.length) % orderedCache.length;
    openViewer(orderedCache[currentIndex]);
  });
  if (viewerNext) viewerNext.addEventListener('click', () => {
    if (orderedCache.length === 0) return;
    currentIndex = (currentIndex + 1) % orderedCache.length;
    openViewer(orderedCache[currentIndex]);
  });
  window.addEventListener('keydown', (e) => {
    if (!viewerModal || !viewerModal.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (viewerPrev) viewerPrev.click();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (viewerNext) viewerNext.click();
    } else if (e.key === 'Escape') {
      closeViewer();
    }
  });

  render(null);
  if (params.get('print') === '1') {
    setTimeout(() => window.print(), 400);
  }
});

function renderNext(arr) {
  if (!nextBox) return;
  if (!arr || arr.length === 0) { nextBox.className = 'empty'; nextBox.textContent = 'Ingen planlagte aktiviteter'; return; }
  const now = new Date();
  const idx = arr.map(i => ({ i, k: MONTHS.indexOf(i.month)*4 + (i.week-1) })).sort((a,b)=> a.k - b.k).find(x => x.k >= Math.round((now.getMonth()*4)+((now.getDate()-1)/7)));
  const it = (idx && idx.i) || arr[0];
  nextBox.className = 'item glass';
  const color = CAT_COLORS[it.cat] || 'var(--accent)';
  nextBox.innerHTML = `<div class=\"item-content\"><strong>${it.title}</strong><div class=\"meta\"><span class=\"badge cat\" style=\"border-color:${color};color:${color};\">${it.cat}</span> ${it.month} · Uge ${it.week}</div>${it.note?`<div class=\"note\">${it.note}</div>`:''}</div>`;
}
