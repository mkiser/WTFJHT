import { cloneTemplate, formatCount, msg, slot, stripHooks } from './dom.js';

export const SHEET_TEMPLATE = 'd40-tpl-sheet';
const IDLE_FALLBACK_MS = 250;

export function letterParagraphs(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n').split(/\n(?:[ \t]*\n)+/).filter(part => part.trim() !== '');
}

export function numberText(letter, document = globalThis.document) {
  if (!Number.isSafeInteger(letter?.letterNumber)) return '';
  return msg('result.letterNumber', { number: formatCount(letter.letterNumber) }, document);
}

function siteRelative(href) {
  return typeof href === 'string' && href[0] === '/' && href[1] !== '/';
}

export function renderSheet(document, letter, {
  own = false, labelledbyId = null, href = null, share = true, print = share, signoff = true, numberLabel,
} = {}) {
  const sheet = cloneTemplate(document, SHEET_TEMPLATE);
  if (!sheet) throw new Error('Dear 2040 sheet template is missing');
  if (own) sheet.classList.add('is-own');
  if (labelledbyId) sheet.setAttribute('aria-labelledby', labelledbyId);
  if (letter.letterNumber != null) sheet.dataset.n = String(letter.letterNumber);

  slot(sheet, 'salutation').textContent = letter.salutation ?? '';
  const body = slot(sheet, 'body');
  letterParagraphs(letter.body).forEach((text, index) => {
    if (index) body.appendChild(document.createTextNode('\n\n'));
    const paragraph = document.createElement('p');
    paragraph.className = 'd40-para';
    paragraph.textContent = text;
    body.appendChild(paragraph);
  });

  const sign = slot(sheet, 'signoff');
  const signText = signoff ? msg('letter.signoff', undefined, document) : '';
  if (signText) sign.textContent = signText;
  else sign.remove();

  const label = numberLabel === undefined ? numberText(letter, document) : String(numberLabel || '');
  const number = slot(sheet, 'number');
  const date = slot(sheet, 'dateLabel');
  if (label) {
    number.textContent = label;
  } else {
    number.nextSibling?.remove();
    number.remove();
    date.querySelector('.d40-rd')?.remove();
  }
  date.appendChild(document.createTextNode(letter.dateLabel ?? ''));

  const stamp = slot(sheet, 'stamp');
  if (siteRelative(href)) {
    const link = document.createElement('a');
    link.className = 'd40-permalink';
    link.href = href;
    link.append(...stamp.childNodes);
    stamp.appendChild(link);
  }

  const printIcon = slot(sheet, 'print');
  const printLabel = print ? msg('actions.print', undefined, document) : '';
  if (!print) printIcon.remove();
  else if (printLabel) {
    printIcon.setAttribute('aria-label', printLabel);
    printIcon.title = printLabel;
  }

  const button = slot(sheet, 'share');
  if (!share) button.remove();
  return stripHooks(sheet);
}

export function shareButtonOf(sheet) {
  return sheet?.querySelector?.('.d40-sheetfoot .d40-shareicon') ?? null;
}

export function printButtonOf(sheet) {
  return sheet?.querySelector?.('.d40-sheetfoot .d40-printicon') ?? null;
}

export function printPayload(letter, document = globalThis.document) {
  return {
    salutation: letter?.salutation ?? '', body: letter?.body ?? '',
    signoff: msg('letter.signoff', undefined, document), dayKey: letter?.dayKey,
  };
}

export function loadLetterhead() {
  return import('../letterhead.js');
}

export function idleTask(win, fallback) {
  return task => {
    if (typeof win?.requestIdleCallback === 'function') win.requestIdleCallback(() => task(), { timeout: 2000 });
    else fallback(task, IDLE_FALLBACK_MS);
  };
}

export function createPrintControls({ document, window: win = document?.defaultView, load = loadLetterhead, idle }) {
  const bound = new Map();
  let printer = null;
  let requested = false;
  let destroyed = false;

  function arm(control) {
    const entry = bound.get(control);
    if (!printer || !entry) return;
    if (entry.letter && printer.dateline(entry.letter.dayKey)) control.removeAttribute('disabled');
    else control.setAttribute('disabled', '');
  }

  function request() {
    if (requested || destroyed) return;
    requested = true;
    idle(() => {
      if (destroyed) return;
      Promise.resolve().then(load).then(module => {
        if (destroyed || typeof module?.printLetter !== 'function' || typeof module?.dateline !== 'function') return;
        printer = module;
        for (const control of bound.keys()) arm(control);
      }, () => {});
    });
  }

  function bind(control, letter) {
    if (!control || destroyed) return;
    const entry = bound.get(control);
    if (entry) entry.letter = letter;
    else {
      const handler = () => {
        const current = bound.get(control)?.letter;
        if (destroyed || !printer || !current || !control.isConnected || control.hasAttribute('disabled')) return;
        printer.printLetter(printPayload(current, document), { document, window: win });
      };
      control.addEventListener('click', handler);
      bound.set(control, { letter, handler });
    }
    if (printer) arm(control);
    else request();
  }

  return {
    bind,
    get loaded() { return Boolean(printer); },
    get size() { return bound.size; },
    destroy() {
      destroyed = true;
      for (const [control, { handler }] of bound) control.removeEventListener('click', handler);
      bound.clear();
    },
  };
}

export function renderNumberLine(document, letter, { tag = 'p', href, id } = {}) {
  if (tag !== 'p' && tag !== 'h3') throw new RangeError('Invalid number-line tag');
  const line = document.createElement(tag);
  line.className = 'd40-num';
  const text = numberText(letter, document);
  if (href != null && !siteRelative(href)) {
    throw new TypeError('Number links must be site-relative paths');
  }
  if (href != null) {
    const link = document.createElement('a');
    link.className = 'd40-numlink';
    link.href = href;
    if (id) link.id = id;
    link.textContent = text;
    line.appendChild(link);
  } else {
    if (id) line.id = id;
    line.textContent = text;
  }
  return line;
}

export function renderTombstone(document, heldHeightPx) {
  const tombstone = document.createElement('div');
  tombstone.className = 'd40-tomb';
  tombstone.tabIndex = -1;
  if (Number.isFinite(heldHeightPx) && heldHeightPx > 0) {
    tombstone.style.minHeight = `${Math.round(heldHeightPx)}px`;
  }
  const message = document.createElement('p');
  message.textContent = msg('placeholders.gone', undefined, document);
  tombstone.appendChild(message);
  return tombstone;
}
