export const CORE_VERSION = 2;

const LA_TIME_ZONE = 'America/Los_Angeles';
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const laDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: LA_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric',
});
const closeDayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: LA_TIME_ZONE, weekday: 'long', month: 'long', day: 'numeric',
});
const closeDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: LA_TIME_ZONE, month: 'long', day: 'numeric', year: 'numeric',
});

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function codePointLength(s) {
  return [...s].length;
}

const VISIBLE_CHARACTER = /[\p{L}\p{N}\p{P}\p{S}]/u;
const BLANK_GLYPH = /[\u115f\u1160\u2800\u3164\uffa0]/u;
const COMBINING_MARK = /\p{M}/u;
const BIDI_CONTROLS = /[\u202a-\u202e\u2066-\u2069]/gu;

export function visibleCodePointLength(s) {
  let count = 0;
  for (const character of s) {
    if (VISIBLE_CHARACTER.test(character) && !BLANK_GLYPH.test(character)) count++;
  }
  return count;
}

export function normalizeBody(s) {
  const nfc = s.replace(BIDI_CONTROLS, '').normalize('NFC');
  let capped = '';
  let marks = 0;
  let hasBase = false;
  for (const character of nfc) {
    if (COMBINING_MARK.test(character)) {
      if (hasBase && marks < 4) {
        capped += character;
        marks++;
      }
    } else {
      capped += character;
      marks = 0;
      hasBase = VISIBLE_CHARACTER.test(character) && !BLANK_GLYPH.test(character);
    }
  }

  const lines = capped.split(/(\r\n|\r|\n)/u);
  let body = '';
  let breaks = 0;
  for (let index = 0; index < lines.length; index += 2) {
    const line = lines[index].replace(/[^\S\r\n]+$/u, '');
    if (visibleCodePointLength(line)) {
      body += line;
      breaks = 0;
    }
    const newline = lines[index + 1];
    if (newline) {
      if (breaks < 2) body += newline;
      breaks++;
    }
  }
  return body.trim();
}

function instant(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid instant');
  return date;
}

export function laCivilDate(value) {
  const parts = Object.fromEntries(laDateFormatter.formatToParts(instant(value))
    .filter(part => part.type === 'year' || part.type === 'month' || part.type === 'day')
    .map(part => [part.type, Number(part.value)]));
  return { year: parts.year, month: parts.month, day: parts.day };
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(value) {
  const date = laCivilDate(value);
  return `${SHORT_MONTHS[date.month - 1]} ${date.day}, ${date.year}`;
}

export function dayHeadingParts(dayKey) {
  const date = parseCalendarDate(dayKey);
  return {
    date: `${MONTHS[date.getUTCMonth()].slice(0, 3)} ${date.getUTCDate()}, ${date.getUTCFullYear()}`,
  };
}

function parseCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError('Expected YYYY-MM-DD calendar date');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError('Invalid calendar date');
  }
  return date;
}

function lastOpenInstant(closesAt) {
  return new Date(instant(closesAt).getTime() - 1);
}

export function closeTokens(closesAt) {
  const lastOpen = lastOpenInstant(closesAt);
  return {
    closeDay: closeDayFormatter.format(lastOpen),
    closeDate: closeDateFormatter.format(lastOpen),
  };
}

function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (isObject(value)) {
    const result = Object.create(null);
    for (const key of Object.keys(value).sort()) result[key] = sortedValue(value[key]);
    return result;
  }
  return value;
}

export function canonicalPayloadString(submission) {
  return JSON.stringify(sortedValue(submission));
}

export function stageComplete(draft, stage, config) {
  if (stage === 'letter') {
    if (typeof draft?.body !== 'string') return false;
    const body = normalizeBody(draft.body);
    return visibleCodePointLength(body) >= config.limits.bodyMinCodePoints &&
      codePointLength(body) <= config.limits.bodyCodePoints;
  }
  return false;
}

export function draftToSubmission(draft) {
  const submission = {
    schemaVersion: CORE_VERSION,
    editionId: draft.editionId,
    body: draft.body,
  };
  if (typeof draft.termsHash === 'string' && draft.termsHash) submission.termsHash = draft.termsHash;
  return submission;
}
