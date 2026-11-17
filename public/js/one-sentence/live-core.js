export const SCHEMA_VERSION = 2;
export const HOLD_MS = 220;
export const BOUNCE_MS = 400;

export function fill(template, vars = {}) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (all, key) => (key in vars ? vars[key] : all));
}

export function formatCount(value) {
  return Number(value).toLocaleString('en-US');
}

export function asTyped(raw) {
  return String(raw ?? '').trim();
}

export function usedChars(text) {
  return [...String(text ?? '').trim()].length;
}

export function dateLabel(iso, months) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!parts || !Array.isArray(months)) return '';
  const month = months[Number(parts[2]) - 1];
  return month ? `${month} ${Number(parts[3])}, ${parts[1]}` : '';
}

export function slotIndex(slots, id) {
  return slots.findIndex(slot => slot.id === id);
}

export function optionsFor(edition, answers, i) {
  const slot = edition.slots[i];
  if (!slot) return [];
  if (slot.list) return edition.lists[slot.list] || [];
  return answers[slotIndex(edition.slots, slot.from)]?.next || [];
}

export function reaches(slots, j, i) {
  let k = j;
  const seen = new Set();
  while (slots[k]?.from && !seen.has(k)) {
    seen.add(k);
    k = slotIndex(slots, slots[k].from);
    if (k === i) return true;
  }
  return false;
}

export function applyPick(edition, answers, i, word) {
  const next = answers.slice();
  const old = next[i];
  next[i] = word;
  if (old?.id !== word?.id) {
    edition.slots.forEach((slot, j) => {
      if (j > i && reaches(edition.slots, j, i)) next[j] = null;
    });
  }
  return next;
}

export function matchSlots(edition) {
  return edition.slots.filter(slot => slot.match === true);
}

export function filterSlot(edition) {
  const slots = matchSlots(edition);
  return slots[slots.length - 1] || null;
}

export function matchKey(edition, answers) {
  const slots = matchSlots(edition);
  if (!slots.length) return null;
  const ids = slots.map(slot => answers[slotIndex(edition.slots, slot.id)]?.id);
  return ids.every(Boolean) ? ids.join('|') : null;
}

export function endingProblem(edition, ending) {
  const used = usedChars(ending);
  if (used < 1) return 'empty';
  if (used > edition.ending.limit) return 'over';
  return '';
}

export function endingScreen(edition) {
  return edition.slots.length + 1;
}

export function readbackScreen(edition) {
  return edition.slots.length + 2;
}

export function firstOpen(edition, answers, ending) {
  const empty = answers.indexOf(null);
  if (empty >= 0) return empty + 1;
  return endingProblem(edition, ending) ? endingScreen(edition) : readbackScreen(edition);
}

export function promptParts(text, edition, answers) {
  return String(text ?? '').split(/\{([^{}]+)\}/).map((part, j) => (j % 2
    ? { word: answers[slotIndex(edition.slots, part)]?.label ?? '' }
    : { text: part }));
}

export function submission(edition, answers, ending, termsHash) {
  const value = {
    schemaVersion: SCHEMA_VERSION,
    editionId: edition.edition,
    choices: Object.fromEntries(edition.slots.map((slot, i) => [slot.id, answers[i]?.id])),
    ending: String(ending ?? ''),
  };
  if (typeof termsHash === 'string' && termsHash) value.termsHash = termsHash;
  return value;
}

function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortedValue(value[key])]));
  }
  return value;
}

export function canonicalPayload(value) {
  return JSON.stringify(sortedValue(value));
}

export function rowFromLetter(letter) {
  if (!letter || typeof letter !== 'object' || !Array.isArray(letter.choices)) return null;
  return {
    id: typeof letter.id === 'string' ? letter.id : '',
    n: Number.isSafeInteger(letter.letterNumber) ? letter.letterNumber : null,
    d: typeof letter.dayKey === 'string' ? letter.dayKey : '',
    ending: typeof letter.ending === 'string' ? letter.ending : '',
    choices: letter.choices.filter(choice => choice && typeof choice.label === 'string'),
    frame: Array.isArray(letter.frame) ? letter.frame : null,
    url: typeof letter.url === 'string' ? letter.url : '',
  };
}

export function ownRow(edition, answers, ending, letter = null) {
  return {
    id: letter?.id || '',
    n: Number.isSafeInteger(letter?.letterNumber) ? letter.letterNumber : null,
    d: letter?.dayKey || '',
    ending: String(ending ?? ''),
    choices: edition.slots.map((slot, i) => ({ slot: slot.id, id: answers[i]?.id, label: answers[i]?.label ?? '' })),
    frame: null,
    url: letter?.url || '',
    own: true,
  };
}

function frameOf(row, edition) {
  const frame = row.frame;
  if (Array.isArray(frame) && frame.length === row.choices.length + 1 && frame.every(part => typeof part === 'string')) return frame;
  return edition.frame;
}

export function runsOf(row, edition) {
  const frame = frameOf(row, edition);
  const runs = [];
  row.choices.forEach((choice, i) => runs.push({ kind: 'frame', text: frame[i] ?? '' }, { kind: 'word', text: choice.label }));
  runs.push({ kind: 'frame', text: frame[row.choices.length] ?? '' }, { kind: 'ending', text: asTyped(row.ending) });
  return runs;
}

export function textOf(row, edition) {
  return runsOf(row, edition).map(run => run.text).join('').trimEnd();
}

export function stampOf(row, copy, onWall) {
  const template = row.own && onWall ? copy.stampOwn : copy.stamp;
  return fill(template, { n: row.n === null || row.n === undefined ? '' : formatCount(row.n), date: dateLabel(row.d, copy.months) });
}

export function filterWord(row, slot) {
  if (!slot) return '';
  return row.choices.find(choice => choice.slot === slot.id)?.id || '';
}

export function wordsOfSlot(edition, slot) {
  if (!slot) return [];
  if (slot.list) return edition.lists[slot.list] || [];
  const seen = new Map();
  const from = edition.slots[slotIndex(edition.slots, slot.from)];
  wordsOfSlot(edition, from).forEach(word => (word.next || []).forEach(next => seen.set(next.id, next)));
  return [...seen.values()];
}

export function similarOf(edition, counts, answers, includesOwn = true) {
  const key = matchKey(edition, answers);
  if (key === null || !counts || typeof counts !== 'object') return null;
  const own = includesOwn === true ? 1 : 0;
  const added = includesOwn === false ? 1 : 0;
  const total = (Number.isSafeInteger(counts.total) ? counts.total : 0) + added;
  const n = Math.max(0, (Number(counts.matches?.[key]) || 0) - own);
  const slots = matchSlots(edition);
  const words = slots.map(slot => answers[slotIndex(edition.slots, slot.id)]);
  const vars = { n: formatCount(n), others: formatCount(Math.max(0, total - 1)), total: formatCount(total) };
  words.forEach((word, i) => { vars[i + 1] = word.label; });
  const heading = fill(n === 0 ? edition.similar.none : (n === 1 ? edition.similar.one : edition.similar.many), vars);
  const sub = fill(n === 0 ? edition.copy.similarSubNone : edition.copy.similarSubSome, vars);
  const rows = slots.map((slot, m) => {
    const count = (Number(counts.slots?.[slot.id]?.[words[m].id]) || 0) + added;
    return { label: slot.label ?? '', word: words[m].label, count, total, text: fill(edition.copy.slotCount, { count: formatCount(count), total: formatCount(total) }) };
  });
  return { key, n, total, heading, sub, rows };
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function makeKey(cryptoImpl = globalThis.crypto) {
  const bytes = new Uint8Array(18);
  cryptoImpl.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const block = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result += BASE64[(block >>> 18) & 63] + BASE64[(block >>> 12) & 63] + BASE64[(block >>> 6) & 63] + BASE64[block & 63];
  }
  return result;
}

export async function termsHash(text, cryptoImpl = globalThis.crypto) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized || typeof cryptoImpl?.subtle?.digest !== 'function') return null;
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return `sha256-${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function publishOutcome(response) {
  const status = Number(response?.status) || 0;
  const letter = response?.data?.letter;
  if ((status === 201 || status === 200) && response?.ok && typeof letter?.id === 'string' && letter.id) return { kind: 'success', letter };
  if (status === 409 && response?.error === 'COLLECTION_CLOSED') return { kind: 'closed' };
  if (status === 422) {
    const errors = response?.data?.details?.errors;
    const ending = Array.isArray(errors) ? errors.find(error => error?.field === 'ending') : null;
    if (ending?.code === 'TOO_LONG') return { kind: 'over' };
    if (ending) return { kind: 'empty' };
  }
  return { kind: 'retry' };
}

export function pulsePhase(result) {
  if (!result) return null;
  if ((result.status === 503 && result.error === 'OFFLINE') || result.data?.mode === 'offline') return 'paused';
  if (!result.ok || !result.data) return null;
  if (result.data.closed === true) return 'closed';
  if (result.data.closed === false) return 'open';
  return null;
}

export function editionProblem(edition) {
  if (!edition || typeof edition !== 'object' || !Array.isArray(edition.slots) || !edition.lists || !edition.ending) return 'shape';
  if (!Array.isArray(edition.frame) || edition.frame.length !== edition.slots.length + 1) return 'frame';
  const tokensOk = (text, before) => [...String(text).matchAll(/\{([^{}]*)\}/g)].every(match => before.includes(match[1]));
  const seen = [];
  for (const slot of edition.slots) {
    if (!slot || typeof slot.id !== 'string' || !slot.id) return 'slot';
    if (Boolean(slot.list) === Boolean(slot.from)) return 'slot';
    if (slot.list && !Array.isArray(edition.lists[slot.list])) return 'slot';
    if (slot.from && !seen.includes(slot.from)) return 'slot';
    if (typeof slot.prompt !== 'string' || !slot.prompt.trim()) return 'prompt';
    if (!tokensOk(slot.prompt, seen)) return 'token';
    seen.push(slot.id);
  }
  if (typeof edition.ending.prompt !== 'string' || !edition.ending.prompt.trim()) return 'prompt';
  if (!tokensOk(edition.ending.prompt, seen)) return 'token';
  if (!Number.isInteger(edition.ending.limit) || edition.ending.limit < 1) return 'limit';
  return '';
}

export function countsIncludeOwn(counts, letterNumber) {
  if (!counts || !Number.isSafeInteger(counts.maxLetterNumber) || !Number.isSafeInteger(letterNumber)) return null;
  return counts.maxLetterNumber >= letterNumber;
}
