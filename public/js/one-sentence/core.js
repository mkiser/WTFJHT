export const PAGE_SIZE = 24;
export const BEATS = Object.freeze([0, 2, 4]);
export const ANY = '';
export const EMPTY_FILTERS = Object.freeze([ANY, ANY, ANY]);

const LEADING_MARKS = /^[\s\p{P}\p{S}]*/u;
const STARTS_WITH_LETTER = /^\p{L}/u;
const FIRST_PERSON = /^I(?![\p{L}\p{N}])/u;
const ALL_CAPS_WORD = /^\p{Lu}\p{Lu}/u;
const PROPER_NOUN = /^(?:America|Americans|Trump|Tuesday)(?![\p{L}\p{N}])/u;
const ENDS_SENTENCE = /[.!?…‽。！？][\s"'”’»›)\]}*_~]*$/u;
const ENDS_WEAK = /[,;:]\s*$/u;
const WHOLE_NUMBER = /^[1-9]\d*$/;
const AP_MONTHS = Object.freeze(['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']);

export function lowerFirstLetter(text) {
  const start = text.match(LEADING_MARKS)[0].length;
  const rest = text.slice(start);
  if (!STARTS_WITH_LETTER.test(rest) || FIRST_PERSON.test(rest) ||
      ALL_CAPS_WORD.test(rest) || PROPER_NOUN.test(rest)) return text;
  const first = String.fromCodePoint(rest.codePointAt(0));
  return text.slice(0, start) + first.toLowerCase() + rest.slice(first.length);
}

export function withPeriod(text) {
  if (ENDS_SENTENCE.test(text) || ENDS_WEAK.test(text)) return text;
  return `${text.trimEnd()}.`;
}

export function formatEnding(raw) {
  const text = String(raw ?? '');
  if (text.trim() === '') return '';
  return withPeriod(lowerFirstLetter(text));
}

export function sentenceRuns(row, frame) {
  const runs = [];
  row.w.forEach((word, index) => {
    runs.push({ kind: 'frame', text: frame[index] }, { kind: 'word', text: word });
  });
  runs.push({ kind: 'frame', text: frame[row.w.length] }, { kind: 'ending', text: formatEnding(row.e) });
  return runs;
}

export function sentenceText(runs) {
  return runs.map(run => run.text).join('').trimEnd();
}

function matchesBeat(row, beat, family) {
  return family === ANY || row.w[BEATS[beat]] === family;
}

export function filterRows(rows, filters = EMPTY_FILTERS) {
  return rows.filter(row => filters.every((family, beat) => matchesBeat(row, beat, family)));
}

export function isFiltered(filters) {
  return filters.some(family => family !== ANY);
}

export function tallies(rows, filters = EMPTY_FILTERS) {
  return BEATS.map((wordIndex, beat) => {
    const families = new Map();
    let any = 0;
    for (const row of rows) {
      const others = filters.every((family, other) => other === beat || matchesBeat(row, other, family));
      if (!others) continue;
      any += 1;
      const family = row.w[wordIndex];
      families.set(family, (families.get(family) ?? 0) + 1);
    }
    return { any, families };
  });
}

function randomFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleRows(rows, seed) {
  const random = randomFrom(seed);
  const deck = [...rows].sort((a, b) => a.n - b.n);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}

export function orderRows(rows, order = 'newest', seed = 1) {
  if (order === 'shuffle') return shuffleRows(rows, seed);
  const direction = order === 'oldest' ? 1 : -1;
  return [...rows].sort((a, b) => (a.n - b.n) * direction);
}

export function nextShown(shown, total, size = PAGE_SIZE) {
  return Math.min(shown + size, total);
}

export function parseLinkedNumber(search) {
  const value = new URLSearchParams(search).get('n');
  if (value === null) return { kind: 'none' };
  if (!WHOLE_NUMBER.test(value)) return { kind: 'invalid' };
  const n = Number(value);
  return Number.isSafeInteger(n) ? { kind: 'number', n } : { kind: 'invalid' };
}

export function findRow(rows, n) {
  return rows.find(row => row.n === n) ?? null;
}

export function formatCount(value) {
  return Number(value).toLocaleString('en-US');
}

export function dateLabel(iso) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!parts) return '';
  return `${AP_MONTHS[Number(parts[2]) - 1]} ${Number(parts[3])}, ${parts[1]}`;
}

function isRow(row) {
  return Number.isSafeInteger(row?.n) && typeof row.d === 'string' && typeof row.e === 'string' &&
    Array.isArray(row.w) && row.w.length === 5 && row.w.every(word => typeof word === 'string');
}

export function parseEdition(json) {
  if (!Array.isArray(json?.sentences) || !json.sentences.every(isRow)) {
    throw new TypeError('The edition file does not hold a list of sentences');
  }
  return json.sentences;
}

export function sharePath(pathname, n) {
  return `${pathname}?n=${n}`;
}
