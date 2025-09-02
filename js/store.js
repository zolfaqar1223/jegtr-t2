// store.js
// Fælles data og persistens-funktioner for KMD Årshjul. Her defineres
// konstante værdier som måneder og kategorier samt hjælpefunktioner
// til at læse og skrive til browserens localStorage.

export const MONTHS = [
  'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'December'
];

export const CATS = [
  'Releasemøde',
  'Roadmapmøde',
  'Netværksmøde',
  'KTU',
  'Onboarding',
  'Rapportmøde',
  'Andet'
];

// Farver for kategorier – dybe, "luksuriøse" nuancer
export const CAT_COLORS = {
  'Releasemøde': '#A78BFA',     // Amethyst Glow
  'Roadmapmøde': '#60A5FA',     // Azure Ice
  'Netværksmøde': '#E4B7B2',    // Rose Quartz
  'KTU': '#D4AF37',             // Champagne Gold
  'Onboarding': '#6EE7B7',      // Emerald Mist
  'Rapportmøde': '#1F614E',     // Deep Emerald (brand)
  'Andet': '#E6E6EB'            // Soft Platinum
};

// Statusser og farver
export const STATUSES = ['Planlagt', 'Igangværende', 'Afsluttet'];
export const STATUS_COLORS = {
  'Planlagt': '#6EE7B7',        // Emerald Mist
  'Igangværende': '#A78BFA',    // Amethyst Glow
  'Afsluttet': '#2C2C34'        // Charcoal Slate
};

const ITEMS_KEY = 'årshjul.admin.items';
const NOTES_KEY = 'årshjul.admin.notes';
const SETTINGS_KEY = 'årshjul.admin.settings';
const CHANGELOG_KEY = 'årshjul.admin.changelog';
// Legacy keys kept for backward-compatible reads
const ITEMS_KEY_OLD = 'aarshjul.admin.items';
const NOTES_KEY_OLD = 'aarshjul.admin.notes';

/**
 * Læs aktiviteter fra localStorage.
 * @returns {Array<Object>} Listen af aktiviteter
 */
export function readItems() {
  try {
    // Prefer new key; fallback to legacy
    const raw = localStorage.getItem(ITEMS_KEY);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem(ITEMS_KEY_OLD);
    return legacy ? JSON.parse(legacy) : [];
  } catch (err) {
    console.error('Kunne ikke læse items fra localStorage', err);
    return [];
  }
}

/**
 * Gem aktiviteter til localStorage.
 * @param {Array<Object>} data
 */
export function writeItems(data) {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(data));
    // Clean up legacy key if present
    try { localStorage.removeItem(ITEMS_KEY_OLD); } catch {}
  } catch (err) {
    console.error('Kunne ikke skrive items til localStorage', err);
  }
}

/**
 * Læs noter pr. måned fra localStorage.
 * @returns {Object}
 */
export function readNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem(NOTES_KEY_OLD);
    return legacy ? JSON.parse(legacy) : {};
  } catch (err) {
    console.error('Kunne ikke læse noter fra localStorage', err);
    return {};
  }
}

/**
 * Gem noter til localStorage.
 * @param {Object} notes
 */
export function writeNotes(notes) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    try { localStorage.removeItem(NOTES_KEY_OLD); } catch {}
  } catch (err) {
    console.error('Kunne ikke skrive noter til localStorage', err);
  }
}

/**
 * Læs/Gem settings (fx aktive filtre, zoom) i localStorage
 */
export function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Kunne ikke læse settings', err);
    return {};
  }
}

export function writeSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Kunne ikke skrive settings', err);
  }
}

/**
 * Append a change log entry (prepend for latest first)
 * @param {string} message
 */
export function logChange(message, details = null) {
  try {
    const now = new Date();
    const entry = { t: now.toISOString(), m: message, d: details };
    const raw = localStorage.getItem(CHANGELOG_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(entry);
    localStorage.setItem(CHANGELOG_KEY, JSON.stringify(arr.slice(0, 1000)));
  } catch (err) {
    console.error('Kunne ikke skrive changelog', err);
  }
}

export function readChangeLog(limit = 10) {
  try {
    const raw = localStorage.getItem(CHANGELOG_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, limit) : [];
  } catch (err) {
    console.error('Kunne ikke læse changelog', err);
    return [];
  }
}

/**
 * Generer en unik ID til en aktivitet. Bruger native crypto.randomUUID
 * hvis tilgængelig, ellers falder tilbage til tidsstempel.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString();
}

/**
 * Hjælpefunktion til at sortere aktiviteter efter måned, uge og titel.
 * @param {Array<Object>} items
 * @returns {Array<Object>} sorteret liste
 */
export function sortItems(items) {
  return [...items].sort((a, b) => {
    const ma = MONTHS.indexOf(a.month);
    const mb = MONTHS.indexOf(b.month);
    if (ma !== mb) return ma - mb;
    if (a.week !== b.week) return a.week - b.week;
    return a.title.localeCompare(b.title);
  });
}
