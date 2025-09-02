// dashboard.js
// Simple KPI dashboard using stored items/notes
import { MONTHS, readItems, readNotes, STATUSES, CATS, CAT_COLORS, readChangeLog } from './store.js';

function createTile(key, title, value, color) {
	const el = document.createElement('div');
	el.className = 'glass';
	el.style.padding = '12px';
	el.style.borderRadius = '12px';
	el.style.border = '1px solid rgba(255,255,255,0.16)';
	el.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.10))';
	el.style.boxShadow = '0 18px 40px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.08)';
	el.style.cursor = 'pointer';
	const h = document.createElement('div');
	h.style.fontSize = '11px';
	h.style.opacity = '0.92';
	h.textContent = title;
	const v = document.createElement('div');
	v.style.fontSize = '24px';
	v.style.fontWeight = '800';
	v.style.marginTop = '4px';
	v.style.color = color;
	v.textContent = value;
	el.appendChild(h);
	el.appendChild(v);
	el.dataset.key = key;
	return el;
}

function renderKPIs(items, notes) {
	const grid = document.getElementById('kpiGrid');
	const bar = document.getElementById('kpiBar');
	const container = bar || grid;
	if (!container) return;
	container.innerHTML = '';
	const total = items.length;
	const byStatus = STATUSES.reduce((acc, s) => (acc[s] = items.filter(i => (i.status || 'Planlagt') === s).length, acc), {});
	const monthsCovered = new Set(items.map(i => i.month)).size;
	const notesCount = Object.keys(notes || {}).filter(k => (notes[k] || '').trim().length > 0).length;
	const upcoming = (() => {
		const now = new Date();
		const curIdx = now.getMonth() * 4 + Math.floor((now.getDate() - 1) / 7);
		return items.filter(i => (MONTHS.indexOf(i.month) * 4 + (i.week - 1)) > curIdx).length;
	})();
	const byCat = CATS.map(c => ({ c, n: items.filter(i => i.cat === c).length }))
		.sort((a,b) => b.n - a.n)[0];

	// KPI set for single full-width row
	const config = [
		{ key: 'thisMonth', title: 'Denne måned', value: String(items.filter(i => i.month === MONTHS[new Date().getMonth()]).length), color: '#D4AF37' },
		{ key: 'upcoming', title: 'Kommende', value: String(upcoming), color: '#60A5FA' },
		{ key: 'noOwner', title: 'Uden ansvarlig', value: String(items.filter(i => !i.owner || String(i.owner).trim() === '').length), color: '#E4B7B2' },
		{ key: 'doneYear', title: 'Afsluttet i år', value: String(items.filter(i => (i.status || 'Planlagt') === 'Afsluttet').length), color: '#6EE7B7' }
	];
	config.forEach(k => container.appendChild(createTile(k.key, k.title, k.value, k.color)));
}

function renderInsights(items) {
	const el = document.getElementById('insights');
	if (!el) return;
	el.innerHTML = '';
	const tips = [];
	if (items.length === 0) tips.push('Ingen aktiviteter endnu. Start med at oprette de første i Årshjul.');
	const thisMonth = MONTHS[new Date().getMonth()];
	const countThisMonth = items.filter(i => i.month === thisMonth).length;
	if (countThisMonth === 0) tips.push(`Ingen aktiviteter for ${thisMonth}. Overvej at planlægge mindst én.`);
	const overdue = (() => {
		const now = new Date();
		const curIdx = now.getMonth() * 4 + Math.floor((now.getDate() - 1) / 7);
		return items.filter(i => (MONTHS.indexOf(i.month) * 4 + (i.week - 1)) < curIdx && (i.status || 'Planlagt') !== 'Afsluttet').length;
	})();
	if (overdue > 0) tips.push(`${overdue} planlagte aktiviteter ligger før nu og er ikke afsluttet.`);
	if (!tips.length) tips.push('Alt ser godt ud! Fortsæt med jævnt flow af aktiviteter.');
	
	tips.forEach(t => {
		const d = document.createElement('div');
		d.className = 'item glass';
		d.textContent = t;
		el.appendChild(d);
	});
}

document.addEventListener('DOMContentLoaded', () => {
	const items = readItems();
	const notes = readNotes();
	renderKPIs(items, notes);
	renderInsights(items);

	// KPI click filtering of activity list
	const list = document.getElementById('dashList');
	const clearBtn = document.getElementById('clearDashFilter');
	function renderListFiltered(arr) {
		list.innerHTML = '';
		if (!arr.length) {
			const empty = document.createElement('div');
			empty.className = 'item glass';
			empty.textContent = 'Ingen aktiviteter matcher filteret';
			list.appendChild(empty);
			return;
		}
		arr.sort((a,b) => {
			const ma = MONTHS.indexOf(a.month), mb = MONTHS.indexOf(b.month);
			if (ma !== mb) return ma - mb;
			if (a.week !== b.week) return a.week - b.week;
			return a.title.localeCompare(b.title);
		}).forEach(it => {
			const el = document.createElement('div');
			el.className = 'item glass';
			el.innerHTML = `<div class="item-content"><strong>${it.title}</strong><div class="meta">${it.month} · Uge ${it.week} · ${it.cat} · ${(it.status||'Planlagt')}</div>${it.note ? `<div class="note">${it.note}</div>` : ''}</div>`;
			list.appendChild(el);
		});
	}

	function applyFilter(key) {
		switch (key) {
			case 'thisMonth':
				return renderListFiltered(items.filter(i => i.month === MONTHS[new Date().getMonth()]));
			case 'upcoming': {
				const now = new Date();
				const curIdx = now.getMonth() * 4 + Math.floor((now.getDate() - 1) / 7);
				return renderListFiltered(items.filter(i => (MONTHS.indexOf(i.month) * 4 + (i.week - 1)) > curIdx));
			}
			case 'noOwner':
				return renderListFiltered(items.filter(i => !i.owner || String(i.owner).trim() === ''));
			case 'doneYear':
				return renderListFiltered(items.filter(i => (i.status || 'Planlagt') === 'Afsluttet'));
			default:
				return renderListFiltered(items);
		}
	}

	(document.getElementById('kpiBar') || document.getElementById('kpiGrid'))?.addEventListener('click', (e) => {
		const tile = e.target.closest('.glass');
		if (!tile || !tile.dataset.key) return;
		applyFilter(tile.dataset.key);
	});
	if (clearBtn) clearBtn.addEventListener('click', () => renderListFiltered(items));
	// initial list: show all
	renderListFiltered(items);

	// Charts
	renderStatusDonut(items);
	renderCategoryPie(items);
	renderCategoryList(items);
	renderTrend(items);

	// Risks and resources
	renderRisks(items);
	renderResources(items);

	// Changelog
	renderChangeLog();
});

// ===== Charts =====
function renderStatusDonut(items) {
	const svg = document.getElementById('statusDonut');
	if (!svg) return;
	svg.innerHTML = '';
	const size = 160, cx = 80, cy = 80, r = 54, stroke = 16;
	const map = STATUSES.map(s => ({ s, n: items.filter(i => (i.status || 'Planlagt') === s).length }));
	const total = map.reduce((a,b) => a + b.n, 0) || 1;
	let start = -Math.PI/2;
	const colors = ['#6EE7B7', '#A78BFA', '#2C2C34'];
	map.forEach((seg, idx) => {
		const angle = (seg.n/total) * 2*Math.PI;
		const end = start + angle;
		const x1 = cx + r * Math.cos(start);
		const y1 = cy + r * Math.sin(start);
		const x2 = cx + r * Math.cos(end);
		const y2 = cy + r * Math.sin(end);
		const large = angle > Math.PI ? 1 : 0;
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`);
		path.setAttribute('stroke', colors[idx % colors.length]);
		path.setAttribute('stroke-width', String(stroke));
		path.setAttribute('fill', 'none');
		path.setAttribute('opacity', '0.9');
		svg.appendChild(path);
		start = end;
	});
}

// replaced old renderCategoryBars with premium pie + list
function renderCategoryPie(items) {
	const svg = document.getElementById('catPie');
	const legend = document.getElementById('catLegend');
	if (!svg || !legend) return;
	svg.innerHTML = '';
	legend.innerHTML = '';
	const cx = 100, cy = 100, r = 64, stroke = 28;
	const counts = CATS.map(c => ({ c, n: items.filter(i => i.cat === c).length, color: CAT_COLORS[c] || 'var(--accent)' }));
	const total = counts.reduce((a,b)=>a+b.n,0) || 1;
	let start = -Math.PI/2;
	counts.forEach(row => {
		const angle = (row.n/total) * 2*Math.PI;
		if (angle <= 0) return;
		const end = start + angle;
		const x1 = cx + r * Math.cos(start);
		const y1 = cy + r * Math.sin(start);
		const x2 = cx + r * Math.cos(end);
		const y2 = cy + r * Math.sin(end);
		const large = angle > Math.PI ? 1 : 0;
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`);
		path.setAttribute('stroke', row.color);
		path.setAttribute('stroke-width', String(stroke));
		path.setAttribute('fill', 'none');
		path.setAttribute('opacity', '0.95');
		svg.appendChild(path);
		start = end;
		const li = document.createElement('div');
		li.className = 'legend-item';
		const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = row.color; li.appendChild(sw);
		const txt = document.createElement('span'); txt.textContent = `${row.c} (${row.n})`; li.appendChild(txt);
		legend.appendChild(li);
	});
}

function renderCategoryList(items) {
	const wrap = document.getElementById('catList');
	if (!wrap) return;
	wrap.innerHTML = '';
	const counts = CATS.map(c => ({ c, n: items.filter(i => i.cat === c).length, color: CAT_COLORS[c] || 'var(--accent)' }));
	const max = Math.max(1, ...counts.map(x => x.n));
	counts.forEach(row => {
		const line = document.createElement('div');
		line.className = 'row';
		const meta = document.createElement('div'); meta.className = 'meta';
		const catBadge = document.createElement('span'); catBadge.className = 'badge cat'; catBadge.style.borderColor = row.color; catBadge.style.color = row.color; catBadge.textContent = row.c; meta.appendChild(catBadge);
		const num = document.createElement('strong'); num.textContent = String(row.n); num.style.fontSize = '16px'; num.style.minWidth = '24px'; meta.appendChild(num);
		const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('div'); fill.style.width = `${Math.round((row.n/max)*100)}%`; fill.style.background = row.color; bar.appendChild(fill);
		line.appendChild(meta); line.appendChild(bar);
		wrap.appendChild(line);
	});
}

function renderTrend(items) {
	const svg = document.getElementById('trendLine');
	if (!svg) return;
	svg.innerHTML = '';
	const months = Array.from({ length: 12 }, (_, i) => i);
	const counts = months.map(m => items.filter(i => (i.status||'Planlagt') === 'Afsluttet' && MONTHS.indexOf(i.month) === m).length);
	const w = 340, h = 120, pad = 22;
	const max = Math.max(1, ...counts);
	const stepX = (w - pad*2) / (counts.length - 1);
	let d = '';
	counts.forEach((c, idx) => {
		const x = pad + idx * stepX;
		const y = h - pad - (c / max) * (h - pad*2);
		d += (idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
		const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		dot.setAttribute('cx', String(x)); dot.setAttribute('cy', String(y)); dot.setAttribute('r', '2.5');
		dot.setAttribute('fill', 'var(--accent)');
		svg.appendChild(dot);
	});
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', d);
	path.setAttribute('fill', 'none');
	path.setAttribute('stroke', 'var(--accent)');
	path.setAttribute('stroke-width', '2');
	svg.appendChild(path);
}

// ===== Risks & Resources =====
function renderRisks(items) {
	const el = document.getElementById('risks');
	if (!el) return;
	el.innerHTML = '';
	// risiko: mange aktiviteter i samme uge eller mangler ansvarlig
	const grouped = {};
	items.forEach(i => {
		const key = `${i.month}-${i.week}`;
		grouped[key] = grouped[key] || [];
		grouped[key].push(i);
	});
	const risks = [];
	Object.keys(grouped).forEach(k => {
		const arr = grouped[k];
		if (arr.length >= 3) risks.push({ t: `Høj belastning: ${k}`, d: `${arr.length} aktiviteter i samme uge`, link: arr[0] });
	});
	items.filter(i => !i.owner || String(i.owner).trim() === '').forEach(i => {
		risks.push({ t: 'Mangler ansvarlig', d: `${i.title} (${i.month} · uge ${i.week})`, link: i });
	});
	if (!risks.length) {
		const ok = document.createElement('div'); ok.className = 'item glass'; ok.textContent = 'Ingen risici fundet'; el.appendChild(ok); return;
	}
	risks.forEach(r => {
		const d = document.createElement('div');
		d.className = 'item glass';
		d.innerHTML = `<div class="item-content"><strong>${r.t}</strong><div class="meta">${r.d}</div></div>`;
		d.style.cursor = 'pointer';
		d.addEventListener('click', () => openAssignOwner(r.link));
		el.appendChild(d);
	});
}

function openAssignOwner(item) {
	const dlg = document.createElement('div');
	dlg.className = 'modal open';
	const sheet = document.createElement('div');
	sheet.className = 'sheet glass';
	const h = document.createElement('h3'); h.textContent = `Tildel ansvarlig · ${item.title}`;
	const meta = document.createElement('div'); meta.className = 'viewer-meta'; meta.textContent = `${item.month} · Uge ${item.week}`;
	const row = document.createElement('div'); row.style.display = 'grid'; row.style.gridTemplateColumns = '1fr auto'; row.style.gap = '8px';
	const input = document.createElement('input'); input.placeholder = 'Skriv navn…'; input.value = item.owner || '';
	const btn = document.createElement('button'); btn.textContent = 'Gem';
	btn.addEventListener('click', () => {
		const ls = JSON.parse(localStorage.getItem('årshjul.admin.items')||'[]');
		const idx = ls.findIndex(x => x.id === item.id);
		if (idx > -1) {
			ls[idx].owner = input.value.trim();
			localStorage.setItem('årshjul.admin.items', JSON.stringify(ls));
			document.body.removeChild(dlg);
			location.reload();
		}
	});
	row.appendChild(input); row.appendChild(btn);
	const actions = document.createElement('div'); actions.className = 'viewer-actions'; const close = document.createElement('button'); close.className = 'ghost'; close.textContent = 'Luk'; close.addEventListener('click', () => document.body.removeChild(dlg)); actions.appendChild(close);
	sheet.appendChild(h); sheet.appendChild(meta); sheet.appendChild(row); sheet.appendChild(actions);
	dlg.appendChild(sheet);
	dlg.addEventListener('click', (e) => { if (e.target === dlg) document.body.removeChild(dlg); });
	document.body.appendChild(dlg);
}

function renderResources(items) {
	const el = document.getElementById('resources');
	if (!el) return;
	el.innerHTML = '';
	const map = {};
	items.forEach(i => {
		const o = (i.owner || 'Ukendt').trim() || 'Ukendt';
		map[o] = (map[o] || 0) + 1;
	});
	const rows = Object.keys(map).map(o => ({ o, n: map[o] })).sort((a,b) => b.n - a.n);
	rows.forEach(r => {
		const d = document.createElement('div');
		d.className = 'item glass';
		const level = r.n >= 10 ? 'kritisk' : r.n >= 6 ? 'høj' : 'normal';
		const color = level === 'kritisk' ? '#F87171' : level === 'høj' ? '#D4AF37' : 'var(--accent)';
		const pct = Math.min(100, r.n * 10);
		const bar = `<div style="margin-top:6px;height:6px;border-radius:6px;background:rgba(255,255,255,0.08);"><div style="height:6px;border-radius:6px;width:${pct}%;background:${color};"></div></div>`;
		d.innerHTML = `<div class="item-content"><strong>${r.o}</strong><div class="meta">${r.n} aktiviteter · Belastning: ${level}</div>${bar}</div>`;
		el.appendChild(d);
	});

	// quick-assign removed; assigning is handled from Risks widget
}

function renderChangeLog() {
	const el = document.getElementById('changelog');
	if (!el) return;
	el.innerHTML = '';
	const entries = (readChangeLog(10) || []).filter(e => e && e.d && e.d.type === 'edit');
	if (!entries.length) {
		const d = document.createElement('div'); d.className = 'item glass'; d.textContent = 'Ingen nylige ændringer'; el.appendChild(d); return;
	}
	entries.forEach(e => {
		const d = document.createElement('div');
		d.className = 'item glass';
		const dt = new Date(e.t).toLocaleString('da-DK');
		const summary = summarizeChange(e);
		d.innerHTML = `<div class="item-content"><strong>${summary}</strong><div class="meta">${dt}</div></div>`;
		d.style.cursor = 'pointer';
		d.addEventListener('click', () => openChangeDetail(e));
		el.appendChild(d);
	});
}

function openChangeDetail(entry) {
	const data = entry.d || {};
	const before = data.before || null;
	const after = data.after || null;
	const dlg = document.createElement('div');
	dlg.className = 'modal open';
	const sheet = document.createElement('div');
	sheet.className = 'sheet glass';
	const h = document.createElement('h3');
	h.textContent = summarizeChange(entry);
	const meta = document.createElement('div');
	meta.className = 'viewer-meta';
	meta.textContent = new Date(entry.t).toLocaleString('da-DK');
	const details = document.createElement('ul');
	details.style.margin = '6px 0 0 18px';
	details.style.padding = '0';
	summarizeChangeList(entry).forEach(line => { const li = document.createElement('li'); li.textContent = line; details.appendChild(li); });
	const actions = document.createElement('div');
	actions.className = 'viewer-actions';
	const close = document.createElement('button');
	close.className = 'ghost';
	close.textContent = 'Luk';
	close.addEventListener('click', () => document.body.removeChild(dlg));
	actions.appendChild(close);
	sheet.appendChild(h);
	sheet.appendChild(meta);
	sheet.appendChild(details);
	sheet.appendChild(actions);
	dlg.appendChild(sheet);
	dlg.addEventListener('click', (e) => { if (e.target === dlg) document.body.removeChild(dlg); });
	document.body.appendChild(dlg);
}

function summarizeChange(entry) {
	const b = (entry.d && entry.d.before) || {};
	const a = (entry.d && entry.d.after) || {};
	const parts = [];
	const fromMW = `${b.month || ''} uge ${b.week || ''}`.trim();
	const toMW = `${a.month || ''} uge ${a.week || ''}`.trim();
	if (b.month !== a.month || b.week !== a.week) parts.push(`${a.title || b.title || 'Aktivitet'} flyttet fra ${fromMW} → ${toMW}`);
	if (b.status !== a.status) parts.push(`Status: ${b.status || 'ukendt'} → ${a.status || 'ukendt'}`);
	if (b.owner !== a.owner) parts.push(`Ansvarlig: ${b.owner || '—'} → ${a.owner || '—'}`);
	if (!parts.length && b.title !== a.title) parts.push(`Titel: "${b.title || ''}" → "${a.title || ''}"`);
	if (!parts.length && b.cat !== a.cat) parts.push(`Kategori: ${b.cat || '—'} → ${a.cat || '—'}`);
	return parts.join(' · ') || (entry.m || 'Ændring');
}

function summarizeChangeList(entry) {
	const b = (entry.d && entry.d.before) || {};
	const a = (entry.d && entry.d.after) || {};
	const lines = [];
	if (b.title !== a.title) lines.push(`Titel: "${b.title || ''}" → "${a.title || ''}"`);
	if (b.month !== a.month || b.week !== a.week) lines.push(`Planlægning: ${b.month || ''} uge ${b.week || ''} → ${a.month || ''} uge ${a.week || ''}`);
	if (b.status !== a.status) lines.push(`Status: ${b.status || '—'} → ${a.status || '—'}`);
	if (b.cat !== a.cat) lines.push(`Kategori: ${b.cat || '—'} → ${a.cat || '—'}`);
	if (b.owner !== a.owner) lines.push(`Ansvarlig: ${b.owner || '—'} → ${a.owner || '—'}`);
	if ((b.note || '') !== (a.note || '')) lines.push('Noter opdateret');
	return lines;
}
