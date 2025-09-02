// upcoming.js
// Render upcoming 6 weeks groups: Denne uge, Næste uge, Senere

import { MONTHS } from './store.js';
import { getIsoWeek } from './utils.js';

function addWeeks(d, w) {
	const nd = new Date(d);
	nd.setDate(nd.getDate() + w * 7);
	return nd;
}

function weekDiff(from, to) {
	const ms = to - from;
	return Math.floor(ms / (1000*60*60*24*7));
}

/**
 * Render upcoming section
 * @param {HTMLElement} el
 * @param {Array<Object>} items
 * @param {Object} opts { openMonth }
 */
export function renderUpcoming(el, items, opts) {
	const { openMonth } = opts;
	el.innerHTML = '';
	const now = new Date();
	const currentWeek = getIsoWeek(now);
	const currentYear = now.getFullYear();
	function toAbsWeek(item) {
		const mIdx = MONTHS.indexOf(item.month);
		// Approximate week number within the year from month/week (1-5 per month)
		return mIdx * 4 + (item.week - 1);
	}
	const sorted = [...items].sort((a,b) => toAbsWeek(a) - toAbsWeek(b));
	const groups = { denne: [], naeste: [], senere: [] };
	sorted.forEach(it => {
		const aw = toAbsWeek(it);
		const cw = Math.round((currentWeek - 1) * (48/52));
		const diff = aw - cw;
		if (diff <= 0) return; // only future
		if (diff <= 4) groups.denne.push(it);
		else if (diff <= 8) groups.naeste.push(it);
		else groups.senere.push(it);
	});
	function section(title, arr) {
		const h = document.createElement('div');
		h.className = 'group-title';
		h.textContent = title;
		el.appendChild(h);
		if (arr.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'upcoming-empty';
			empty.textContent = 'Ingen planlagte aktiviteter';
			el.appendChild(empty);
			return;
		}
		arr.forEach(it => {
			const d = document.createElement('div');
			d.className = 'item glass';
			d.style.cursor = 'pointer';
			d.innerHTML = `<div class="item-content"><strong>${it.title}</strong><div class="meta">${it.month} · Uge ${it.week} · ${it.cat}</div>${it.note ? `<div class="note">${it.note}</div>` : ''}</div>`;
			d.addEventListener('click', () => openMonth(it.month));
			el.appendChild(d);
		});
	}
	section('Denne uge', groups.denne);
	section('Næste uge', groups.naeste);
	section('Senere', groups.senere);
}
