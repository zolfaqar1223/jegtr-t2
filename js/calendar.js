// calendar.js
// Simple month/week calendar rendering mapped from items.
// Month view: shows items grouped by week; Week view: shows a focused week.

import { MONTHS } from './store.js';

/**
 * Render month calendar: 5 rows (weeks 1-5) listing items.
 * @param {HTMLElement} monthEl
 * @param {Array<Object>} items
 * @param {Object} opts { monthName, onOpen, onEdit, onCreate }
 */
export function renderMonthCalendar(monthEl, items, opts) {
	const { monthName, onOpen, onEdit, onCreate } = opts;
	monthEl.innerHTML = '';
	const title = document.createElement('div');
	title.className = 'week-title';
	title.textContent = monthName;
	monthEl.appendChild(title);
	const grid = document.createElement('div');
	grid.className = 'calendar-grid';
	const weeks = [1,2,3,4,5];
	weeks.forEach(w => {
		const row = document.createElement('div');
		row.className = 'week-row';
		const wt = document.createElement('div');
		wt.className = 'week-title';
		wt.textContent = `Uge ${w}`;
		row.appendChild(wt);
		const weekItems = items.filter(x => x.month === monthName && x.week === w);
		if (weekItems.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'cal-empty';
			empty.textContent = 'Ingen aktiviteter – klik for at tilføje';
			row.appendChild(empty);
			row.addEventListener('click', () => onCreate(monthName, w));
		} else {
			weekItems.forEach(it => {
				const el = document.createElement('div');
				el.className = 'cal-item';
				el.textContent = `${it.title} · ${it.cat}${it.note ? ` – ${it.note}` : ''}`;
				el.addEventListener('click', e => { e.stopPropagation(); onEdit(it); });
				row.appendChild(el);
			});
			row.addEventListener('click', () => onCreate(monthName, w));
		}
		grid.appendChild(row);
	});
	monthEl.appendChild(grid);
}

/**
 * Render week agenda: lists items for a given month/week.
 * @param {HTMLElement} weekEl
 * @param {Array<Object>} items
 * @param {Object} opts { monthName, week, onOpen, onEdit, onCreate }
 */
export function renderWeekAgenda(weekEl, items, opts) {
	const { monthName, week, onEdit, onCreate } = opts;
	weekEl.innerHTML = '';
	const title = document.createElement('div');
	title.className = 'week-title';
	title.textContent = `${monthName} · Uge ${week}`;
	weekEl.appendChild(title);
	const list = document.createElement('div');
	items.filter(x => x.month === monthName && x.week === week)
		.forEach(it => {
			const el = document.createElement('div');
			el.className = 'cal-item';
			el.textContent = `${it.title} · ${it.cat}${it.note ? ` – ${it.note}` : ''}`;
			el.addEventListener('click', () => onEdit(it));
			list.appendChild(el);
		});
	if (!list.children.length) {
		const empty = document.createElement('div');
		empty.className = 'cal-empty';
		empty.textContent = 'Ingen aktiviteter – klik for at tilføje';
		list.appendChild(empty);
		list.addEventListener('click', () => onCreate(monthName, week));
	}
	weekEl.appendChild(list);
}
