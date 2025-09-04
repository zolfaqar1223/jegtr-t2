// main.js
// Entry point for KMD Årshjul. Sætter DOM‑elementer op, læser data
// fra localStorage og orkestrerer samarbejdet mellem under-modulerne.

import {
  MONTHS,
  CATS,
  STATUSES,
  CAT_COLORS,
  STATUS_COLORS,
  readItems,
  writeItems,
  readNotes,
  writeNotes,
  readSettings,
  writeSettings,
  generateId,
  logChange
} from './store.js';
import { getIsoWeek } from './utils.js';
import { renderList } from './list.js';
import { drawWheel } from './wheel.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

// Applikationens mutable tilstand
let items = [];
let notes = {};
let editingId = null;

// View state
let focusedMonth = null;
let activeCategory = 'Alle';
let activeStatus = 'Alle';
let zoomLevel = 1;
let settings = {};
// Pan state for wheel
let panX = 0;
let panY = 0;
let isPanMode = false;
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;

// DOM‑cache
const dateInput = document.getElementById('date');
const timeFromInput = document.getElementById('timeFrom');
const timeToInput = document.getElementById('timeTo');
const titleInput = document.getElementById('title');
const ownerInput = document.getElementById('owner');
const categorySelect = document.getElementById('category');
const statusSelect = document.getElementById('status');
const notesInput = document.getElementById('notes');
const filesInput = document.getElementById('files');
const chipsContainer = document.getElementById('chips');
const listContainer = document.getElementById('list');
const wheelSvg = document.getElementById('wheel');

// ====== UI initialisering ======
function initSelects() {
  // Måned-felt fjernet – dato er nok
  CATS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });
  if (statusSelect) {
    statusSelect.innerHTML = '';
    STATUSES.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      statusSelect.appendChild(opt);
    });
  }
}

function initChips() {
  CATS.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = cat;
    chip.dataset.t = cat;
    chip.dataset.c = cat;
    chip.addEventListener('click', () => {
      titleInput.value = chip.dataset.t;
      categorySelect.value = chip.dataset.c;
      titleInput.focus();
    });
    chipsContainer.appendChild(chip);
  });
}

// Filter chips for kategori
function initFilterChips() {
  const wrap = document.getElementById('filterChips');
  if (!wrap) return; // Mangler i DOM – skip uden at fejle
  wrap.innerHTML = '';
  const cats = ['Alle', ...CATS];
  cats.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = 'chip glow';
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      activeCategory = cat;
      settings.activeCategory = activeCategory;
      writeSettings(settings);
      updateFilterActive();
      render();
    });
    wrap.appendChild(chip);
  });
  updateFilterActive();
}
// Listefiltre i aktivitetssektionen
function initListFilters() {
  const wrap = document.getElementById('listFilters');
  if (!wrap) return;
  wrap.innerHTML = '';
  const cats = ['Alle', ...CATS];
  cats.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      activeCategory = cat;
      settings.activeCategory = activeCategory;
      writeSettings(settings);
      updateFilterActive();
      render();
    });
    wrap.appendChild(chip);
  });
}

function updateFilterActive() {
  const wrap = document.getElementById('filterChips');
  if (!wrap) return; // Ingen filterchips i denne visning
  const chips = [...wrap.querySelectorAll('.chip.glow')];
  chips.forEach(c => {
    if (c.textContent === activeCategory) c.classList.add('active');
    else c.classList.remove('active');
  });
}

function resetForm() {
  editingId = null;
  titleInput.value = '';
  if (ownerInput) ownerInput.value = '';
  notesInput.value = '';
  if (dateInput) dateInput.value = '';
}

async function saveItem() {
  // Udled måned/uge ud fra valgt dato eller brug dags dato
  const baseDate = (dateInput && dateInput.value) ? new Date(dateInput.value) : new Date();
  // apply time if provided (HH:MM)
  // read time range
  let timeFrom = null, timeTo = null;
  if (timeFromInput && timeFromInput.value) {
    const [fh, fm] = timeFromInput.value.split(':').map(n=>parseInt(n,10));
    if (Number.isFinite(fh) && Number.isFinite(fm)) timeFrom = { h: fh, m: fm };
  }
  if (timeToInput && timeToInput.value) {
    const [th, tm] = timeToInput.value.split(':').map(n=>parseInt(n,10));
    if (Number.isFinite(th) && Number.isFinite(tm)) timeTo = { h: th, m: tm };
  }
  if (timeFrom) {
    baseDate.setHours(timeFrom.h);
    baseDate.setMinutes(timeFrom.m);
    baseDate.setSeconds(0);
    baseDate.setMilliseconds(0);
  }
  const month = MONTHS[baseDate.getMonth()];
  const day = baseDate.getDate();
  const week = Math.max(1, Math.min(5, Math.ceil(day / 7)));
  const isoWeek = getIsoWeek(baseDate);
  const year = baseDate.getFullYear();
  const quarter = `Q${Math.floor(baseDate.getMonth() / 3) + 1}`;
  const title = titleInput.value.trim();
  const owner = ownerInput ? ownerInput.value.trim() : '';
  const cat = categorySelect.value;
  const status = (statusSelect && statusSelect.value) || 'Planlagt';
  const note = notesInput.value.trim();
  const savedDateIso = baseDate.toISOString();
  // attachments: læs filer som dataURL, ellers bevar eksisterende ved redigering
  async function readFilesAsDataUrls(list) {
    const toDataUrl = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type || '', size: file.size || 0, dataUrl: reader.result });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const results = await Promise.all(list.map(toDataUrl));
    return results;
  }

  let attachments = [];
  const hasNewFiles = filesInput && filesInput.files && filesInput.files.length > 0;
  if (!title) {
    alert('Skriv en aktivitetstitel');
    return;
  }
  if (editingId) {
    const idx = items.findIndex(x => x.id === editingId);
    if (idx > -1) {
      const before = { ...items[idx] };
      if (hasNewFiles) {
        const fileList = Array.from(filesInput.files);
        attachments = await readFilesAsDataUrls(fileList);
      } else {
        attachments = Array.isArray(items[idx].attachments) ? items[idx].attachments : [];
      }
      items[idx] = { ...items[idx], month, week, isoWeek, year, quarter, title, owner, cat, status, note, date: savedDateIso, timeFrom: timeFromInput?.value || '', timeTo: timeToInput?.value || '', attachments, updatedAt: new Date().toISOString() };
      const after = { ...items[idx] };
      logChange(`Redigerede aktivitet: ${title}${owner ? ` · ${owner}` : ''}`, { type: 'edit', id: editingId, before, after });
    }
    editingId = null;
  } else {
    const id = generateId();
    if (hasNewFiles) {
      const fileList = Array.from(filesInput.files);
      attachments = await readFilesAsDataUrls(fileList);
    }
    const item = { id, month, week, isoWeek, year, quarter, title, owner, cat, status, note, date: savedDateIso, timeFrom: timeFromInput?.value || '', timeTo: timeToInput?.value || '', attachments, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: (settings && settings.user) || 'System' };
    items.push(item);
    logChange(`Tilføjede aktivitet: ${title}${owner ? ` · ${owner}` : ''}`, { type: 'create', id, after: item });
  }
  writeItems(items);
  resetForm();
  render();
  showToast('Aktivitet gemt', 'success');
}

function deleteItem(id) {
  const before = items.find(x => x.id === id);
  items = items.filter(x => x.id !== id);
  writeItems(items);
  render();
  showToast('Aktivitet slettet', 'success');
  logChange(`Slettede aktivitet (${id.substring(0,6)})`, { type: 'delete', id, before });
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data)) {
        items = data;
        writeItems(items);
        render();
      } else {
        alert('Ugyldig JSON-fil');
      }
    } catch (err) {
      alert('Kunne ikke læse JSON');
    }
  };
  reader.readAsText(file);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'årshjul.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Eksporterede til JSON', 'success');
}

function handleSaveNotes(monthName, text) {
  notes[monthName] = text;
  writeNotes(notes);
}

// ====== Del kunde-version modal ======
function openShareModal() {
  const m = document.getElementById('shareModal');
  m.style.display = 'flex';
}
function closeShareModal() {
  const m = document.getElementById('shareModal');
  m.style.display = 'none';
}
function setupShareModal() {
  const btnShare = document.getElementById('btnShare');
  const btnShareClose = document.getElementById('btnShareClose');
  const btnSharePdf = document.getElementById('btnSharePdf');
  const btnShareLink = document.getElementById('btnShareLink');
  const btnShareCopy = document.getElementById('btnShareCopy');
  if (!btnShare || !btnShareClose || !btnSharePdf || !btnShareLink) return; // Share UI findes ikke her
  const shareList = document.getElementById('shareList');
  const shareSearch = document.getElementById('shareSearch');
  const shareCount = document.getElementById('shareCount');
  const shareSelectAll = document.getElementById('shareSelectAll');
  const shareSelectNone = document.getElementById('shareSelectNone');
  let shareQuartersEl = document.getElementById('shareQuarters');
  let shareSelection = new Set();
  let selectedQuarters = new Set();

  function ensureQuarterChips() {
    if (shareQuartersEl) return shareQuartersEl;
    // Place chips inside toolbar if present; else before the list
    const container = shareList && shareList.parentElement;
    if (!container) return null;
    const toolbar = container.querySelector('.share-toolbar') || container;
    const row = document.createElement('div');
    row.id = 'shareQuarters';
    row.className = 'chips';
    row.style.marginLeft = '8px';
    ['Q1','Q2','Q3','Q4'].forEach(q => {
      const s = document.createElement('span');
      s.className = 'chip glow';
      s.dataset.q = q;
      s.textContent = q;
      row.appendChild(s);
    });
    // Append to toolbar, after search and count
    toolbar.appendChild(row);
    shareQuartersEl = row;
    return shareQuartersEl;
  }
  // build once at setup
  ensureQuarterChips();

  function renderShareList(q = '') {
    if (!shareList) return;
    shareList.innerHTML = '';
    const ql = q.trim().toLowerCase();
    const data = items.slice().sort((a,b)=>{
      const ma = MONTHS.indexOf(a.month), mb = MONTHS.indexOf(b.month);
      if (ma !== mb) return ma - mb;
      if (a.week !== b.week) return a.week - b.week;
      return a.title.localeCompare(b.title);
    }).filter(it => {
      if (!ql) return true;
      return (
        (it.title||'').toLowerCase().includes(ql) ||
        (it.cat||'').toLowerCase().includes(ql) ||
        (it.month||'').toLowerCase().includes(ql) ||
        (it.owner||'').toLowerCase().includes(ql)
      );
    });
    // group by month
    const byMonth = new Map();
    data.forEach(it => {
      const list = byMonth.get(it.month) || [];
      list.push(it);
      byMonth.set(it.month, list);
    });
    MONTHS.forEach(m => {
      const group = byMonth.get(m);
      if (!group || group.length === 0) return;
      const header = document.createElement('div');
      header.className = 'group-title';
      header.textContent = m;
      header.style.marginTop = '10px';
      shareList.appendChild(header);
      const divider = document.createElement('div');
      divider.className = 'month-divider';
      shareList.appendChild(divider);
      group.forEach(it => {
        const row = document.createElement('label');
        row.className = 'share-row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = shareSelection.has(it.id);
        cb.addEventListener('change', () => {
          if (cb.checked) shareSelection.add(it.id); else shareSelection.delete(it.id);
          updateShareCount();
        });
        const body = document.createElement('div');
        body.style.display = 'grid';
        body.style.gridTemplateColumns = '1fr';
        body.style.gap = '6px';
        const t = document.createElement('div');
        t.className = 'title';
        t.textContent = it.title;
        const meta = document.createElement('div');
        meta.className = 'meta';
        const metaLeft = document.createElement('div');
        metaLeft.className = 'meta-left';
        const cat = document.createElement('span');
        cat.className = 'badge cat';
        const c = CAT_COLORS[it.cat] || 'var(--accent)';
        cat.style.borderColor = c;
        cat.style.color = c;
        cat.textContent = it.cat;
        const details = document.createElement('span');
        details.textContent = `Uge ${it.week}${it.owner ? ' · ' + it.owner : ''}`;
        metaLeft.appendChild(cat);
        metaLeft.appendChild(details);
        const metaRight = document.createElement('div');
        metaRight.className = 'meta-right';
        const status = document.createElement('span');
        status.className = 'badge status';
        const sc = STATUS_COLORS[it.status || 'Planlagt'] || '#999';
        status.style.borderColor = sc;
        status.style.color = sc;
        status.textContent = it.status || 'Planlagt';
        metaRight.appendChild(status);
        meta.appendChild(metaLeft);
        meta.appendChild(metaRight);
        body.appendChild(t);
        body.appendChild(meta);
        row.appendChild(cb);
        row.appendChild(body);
        shareList.appendChild(row);
      });
    });
    updateShareCount();
  }
  function updateShareCount() {
    if (!shareCount) return;
    const total = items.length;
    const sel = shareSelection.size;
    shareCount.textContent = sel === 0 ? 'Ingen valgt' : `${sel}/${total} valgt`;
  }
  function openShare() {
    // preselect: if previous selection exists, keep; else default to all
    if (shareSelection.size === 0) items.forEach(i => shareSelection.add(i.id));
    renderShareList(shareSearch ? shareSearch.value : '');
    // sync aktiv tilstand på kvartal‑chips
    if (shareQuartersEl) {
      [...shareQuartersEl.querySelectorAll('.chip')].forEach(ch => {
        if (selectedQuarters.has(ch.dataset.q)) ch.classList.add('active');
        else ch.classList.remove('active');
      });
    }
  }
  btnShare.addEventListener('click', openShareModal);
  btnShareClose.addEventListener('click', closeShareModal);
  if (shareSearch) shareSearch.addEventListener('input', () => renderShareList(shareSearch.value));
  if (shareSelectAll) shareSelectAll.addEventListener('click', () => { items.forEach(i => shareSelection.add(i.id)); renderShareList(shareSearch ? shareSearch.value : ''); });
  if (shareSelectNone) shareSelectNone.addEventListener('click', () => { shareSelection.clear(); renderShareList(shareSearch ? shareSearch.value : ''); });
  if (shareQuartersEl) {
    shareQuartersEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const q = chip.dataset.q;
      if (!q) return;
      if (selectedQuarters.has(q)) { selectedQuarters.delete(q); chip.classList.remove('active'); }
      else { selectedQuarters.add(q); chip.classList.add('active'); }
      // When quarters selected, filter selection to items within any selected quarter
      if (selectedQuarters.size > 0) {
        shareSelection.clear();
        const qToMonths = { Q1: ['Januar','Februar','Marts'], Q2: ['April','Maj','Juni'], Q3: ['Juli','August','September'], Q4: ['Oktober','November','December'] };
        const allowed = new Set([].concat(...[...selectedQuarters].map(q => qToMonths[q] || [])));
        items.forEach(i => { if (allowed.has(i.month)) shareSelection.add(i.id); });
      }
      renderShareList(shareSearch ? shareSearch.value : '');
    });
  }
  // Brug sessionStorage til at overføre store datasæt (inkl. vedhæftede filer)
  btnSharePdf.addEventListener('click', () => {
    try {
      const selected = items.filter(i => shareSelection.has(i.id));
      const highlightMonths = computeHighlightMonths(selectedQuarters);
      sessionStorage.setItem('aarshjul.customer.data', JSON.stringify({ items: selected, notes, highlightMonths }));
    } catch {}
    window.open('customer.html?session=1&print=1', '_blank');
    closeShareModal();
  });
  btnShareLink.addEventListener('click', () => {
    try {
      const selected = items.filter(i => shareSelection.has(i.id));
      const highlightMonths = computeHighlightMonths(selectedQuarters);
      sessionStorage.setItem('aarshjul.customer.data', JSON.stringify({ items: selected, notes, highlightMonths }));
    } catch {}
    window.open('customer.html?session=1', '_blank');
    closeShareModal();
  });
  if (btnShareCopy) {
    btnShareCopy.addEventListener('click', async () => {
      // Lille link: fjerner base64-indhold fra vedhæftninger for at holde URL kort
      const light = (arr) => (arr||[]).map(it => ({ ...it, attachments: Array.isArray(it.attachments) ? it.attachments.map(a=>({ name:a.name })) : [] }));
      const selected = items.filter(i => shareSelection.has(i.id));
      const highlightMonths = computeHighlightMonths(selectedQuarters);
      const payload = { items: light(selected), notes, highlightMonths };
      const data = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
      const url = new URL(location.origin + location.pathname.replace('index.html','') + 'customer.html');
      // Brug hash fremfor querystring så servere ikke afviser pga. for lange URLs
      url.hash = 'data=' + data;
      try {
        await navigator.clipboard.writeText(url.toString());
        showToast('Link kopieret', 'success');
      } catch (e) {
        showToast('Kunne ikke kopiere link', 'error');
      }
    });
  }
  // When opening the modal, prepare selection list
  function openShareModal() {
    const m = document.getElementById('shareModal');
    if (!m) return;
    m.style.display = 'flex';
    // make sure quarter chips exist even if HTML was cached
    ensureQuarterChips();
    openShare();
  }

  function computeHighlightMonths(qSet) {
    const qToMonths = { Q1: ['Januar','Februar','Marts'], Q2: ['April','Maj','Juni'], Q3: ['Juli','August','September'], Q4: ['Oktober','November','December'] };
    return [...qSet].flatMap(q => qToMonths[q] || []);
  }
}

// ====== Zoom controls ======
function setupZoomControls() {
  const wrap = document.querySelector('.wheel-wrap');
  let zc = wrap.querySelector('.zoom-controls');
  if (!zc) {
    zc = document.createElement('div');
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
      applyTransform();
      writeSettings({ ...settings, zoomLevel, panX, panY });
    });
    btnPlus.addEventListener('click', () => {
      zoomLevel = Math.min(1.8, Math.round((zoomLevel + 0.1) * 10) / 10);
      applyTransform();
      writeSettings({ ...settings, zoomLevel, panX, panY });
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
      // smooth movement
      panX += dx * 0.85;
      panY += dy * 0.85;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      applyTransform();
      writeSettings({ ...settings, zoomLevel, panX, panY });
    });
    window.addEventListener('mouseup', () => {
      if (!isPanning) return;
      isPanning = false;
      wrap.style.cursor = isPanMode ? 'grab' : '';
      applyTransform();
    });
  }
}
function applyTransform() {
  clampPan();
  wheelSvg.style.transformOrigin = '50% 50%';
  wheelSvg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
  settings.zoomLevel = zoomLevel;
  settings.panX = panX;
  settings.panY = panY;
  writeSettings(settings);
}

// Pan damping to keep wheel near center
function clampPan() {
  const max = 120; // limit px from center
  panX = Math.max(-max, Math.min(max, panX));
  panY = Math.max(-max, Math.min(max, panY));
}

// Ctrl+Scroll zoom
function setupWheelScrollZoom() {
  const container = document.querySelector('.wheel-wrap');
  if (!container) return;
  container.addEventListener('wheel', e => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      zoomLevel = Math.max(0.6, Math.min(1.8, Math.round((zoomLevel + delta) * 10) / 10));
      applyTransform();
      writeSettings({ ...settings, zoomLevel, panX, panY });
    }
  }, { passive: false });
}

// Animated collapse helper
function setActivitiesExpanded(expanded) {
  const wrap = document.getElementById('activitiesBody');
  const btn = document.getElementById('activitiesToggle');
  if (!wrap || !btn) return;
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const label = btn.querySelector('.label');
  if (label) label.textContent = expanded ? 'Skjul' : 'Vis';
  // Measure content height for smooth animation
  if (expanded) {
    wrap.style.display = '';
    const h = wrap.scrollHeight;
    wrap.style.maxHeight = h + 'px';
    setTimeout(() => { wrap.style.maxHeight = ''; }, 230);
  } else {
    const h = wrap.scrollHeight;
    wrap.style.maxHeight = h + 'px';
    // force reflow
    void wrap.offsetHeight;
    wrap.style.maxHeight = '0px';
    setTimeout(() => { wrap.style.display = 'none'; }, 230);
  }
  settings.activitiesExpanded = expanded;
  writeSettings(settings);
}

// Status filter dropdown
function initStatusFilter() {
  const sel = document.getElementById('statusFilter');
  if (!sel) return;
  if (settings.activeStatus) activeStatus = settings.activeStatus;
  sel.value = activeStatus;
  sel.addEventListener('change', () => {
    activeStatus = sel.value;
    settings.activeStatus = activeStatus;
    writeSettings(settings);
    render();
  });
}

// ====== Render-funktion ======
function render() {
  // Filter
  let filtered = activeCategory === 'Alle' ? items : items.filter(x => x.cat === activeCategory);
  if (activeStatus !== 'Alle') {
    filtered = filtered.filter(x => x.status === activeStatus);
  }

  // Listen
  renderList(listContainer, filtered, {
    onEdit: item => {
      editingId = item.id;
      titleInput.value = item.title;
      categorySelect.value = item.cat;
      if (statusSelect) statusSelect.value = item.status || 'Planlagt';
      notesInput.value = item.note || '';
      if (dateInput) dateInput.value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onOpen: monthName => {
      focusedMonth = monthName;
      openModal(monthName, items, notes, { onSaveNotes: handleSaveNotes });
      // Fokus bevares i wheel via options
      render();
    },
    onDelete: id => {
      deleteItem(id);
    }
  });

  // Hjulet
  drawWheel(wheelSvg, filtered, {
    openMonth: monthName => {
      focusedMonth = monthName;
      openModal(monthName, items, notes, { onSaveNotes: handleSaveNotes });
      render();
    },
    openWeek: (monthName, week) => {
      focusedMonth = monthName;
      openModal(monthName, items, notes, { onSaveNotes: handleSaveNotes }, { week });
      render();
    },
    moveItemToMonth: (id, monthName) => {
      const idx = items.findIndex(x => x.id === id);
      if (idx > -1) {
        items[idx].month = monthName;
        items[idx].week = Math.max(1, Math.min(5, items[idx].week));
        writeItems(items);
        render();
      }
    },
    moveItemToMonthWeek: (id, monthName, week) => {
      const idx = items.findIndex(x => x.id === id);
      if (idx > -1) {
        items[idx].month = monthName;
        items[idx].week = Math.max(1, Math.min(5, week));
        writeItems(items);
        render();
      }
    }
  }, { focusedMonth });

  applyTransform();

  // Collapsible activities with animation
  const aToggle = document.getElementById('activitiesToggle');
  const body = document.getElementById('activitiesBody');
  if (aToggle && body && !aToggle.dataset.bound) {
    aToggle.dataset.bound = '1';
    aToggle.addEventListener('click', () => {
      const expanded = aToggle.getAttribute('aria-expanded') !== 'false';
      setActivitiesExpanded(!expanded);
    });
    // initial state
    const expandedInit = settings.activitiesExpanded !== false;
    setActivitiesExpanded(expandedInit);
  }
}

// ====== Initialiser hele appen ======
document.addEventListener('DOMContentLoaded', () => {
  // hent data
  items = readItems();
  notes = readNotes();
  settings = readSettings();
  if (settings.activeCategory) activeCategory = settings.activeCategory;
  if (settings.activeStatus) activeStatus = settings.activeStatus;
  // Start fra gemte indstillinger hvis de findes; ellers en rolig standard
  zoomLevel = (typeof settings.zoomLevel === 'number') ? settings.zoomLevel : 0.8;
  panX = (typeof settings.panX === 'number') ? settings.panX : 0;
  panY = (typeof settings.panY === 'number') ? settings.panY : 0;
  if (typeof settings.activitiesExpanded === 'undefined') settings.activitiesExpanded = true;
  // setup UI
  initSelects();
  initChips();
  initFilterChips();
  initListFilters();
  initStatusFilter();
  setupShareModal();
  // help modal
  const btnHelp = document.getElementById('btnHelp');
  if (btnHelp) {
    const m = document.getElementById('helpModal');
    const close = document.getElementById('btnCloseHelp');
    // build help index
    const helpIndex = [
      { key: 'form', title: 'Formular: Tilføj aktivitet', body: 'Udfyld dato, titel, kategori, status, evt. ansvarlig og noter. Klik Gem.' },
      { key: 'wheel', title: 'Årshjul', body: 'Klik på måneder/uger for at åbne detaljer. Træk aktiviteter mellem måneder/uger.' },
      { key: 'list', title: 'Aktivitetsliste', body: 'Klik for at folde detaljer ud, redigér, slet eller træk for at omplacere.' },
      { key: 'share', title: 'Del med kunde', body: 'Åbn kundevisning eller kopier link. PDF-understøttelse.' },
      { key: 'customer', title: 'Kundevisning', body: 'Læsbar visning af årshjul og liste. Print/PDF-knap.' },
      { key: 'dashboard', title: 'Dashboard', body: 'KPI’er, status/kategorier, risici, ressourcer og ændringslog.' },
      { key: 'kpi', title: 'KPI’er', body: 'Klik på en KPI for at filtrere aktivitetslisten.' },
      { key: 'risks', title: 'Risikoområder', body: 'Overblik over høj belastning og manglende ansvarlige. Klik for at tildele ansvarlig.' },
      { key: 'resources', title: 'Ressourcer', body: 'Antal aktiviteter per ansvarlig.' },
      { key: 'changelog', title: 'Ændringslog', body: 'Historik over redigeringer. Klik for at se før/efter.' }
    ];
    const list = document.getElementById('helpList');
    const detail = document.getElementById('helpDetail');
    const search = document.getElementById('helpSearch');
    function renderList(q=''){
      if (!list || !detail) return;
      list.innerHTML='';
      const ql = q.trim().toLowerCase();
      helpIndex.filter(i=>!ql || i.title.toLowerCase().includes(ql) || i.body.toLowerCase().includes(ql)).forEach(i=>{
        const it = document.createElement('div');
        it.className = 'cal-item';
        it.textContent = i.title;
        it.style.cursor = 'pointer';
        it.addEventListener('click',()=>{
          detail.innerHTML = `<h3 style="margin-bottom:6px;">${i.title}</h3><div class="note">${i.body}</div>`;
        });
        list.appendChild(it);
      });
      if (!detail.innerHTML) {
        const first = helpIndex[0];
        detail.innerHTML = `<h3 style="margin-bottom:6px;">${first.title}</h3><div class="note">${first.body}</div>`;
      }
    }
    if (search) search.addEventListener('input', ()=>renderList(search.value));
    renderList('');
    btnHelp.addEventListener('click', () => { if (m) m.classList.add('open'); });
    if (close) close.addEventListener('click', () => { if (m) m.classList.remove('open'); });
  }
  setupZoomControls();
  setupWheelScrollZoom();
  // knapper
  document.getElementById('btnSave').addEventListener('click', saveItem);
  document.getElementById('btnReset').addEventListener('click', resetForm);
  document.getElementById('btnCloseModal').addEventListener('click', () => {
    const modal = document.getElementById('monthModal');
    if (modal) modal.classList.remove('open');
  });
  // Render første gang
  render();
});
