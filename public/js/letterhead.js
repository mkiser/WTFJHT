const SVG_NS = ['http:', '', 'www.w3.org', '2000', 'svg'].join('/');
const DAY_MS = 86_400_000;
const DAY_ONE = Date.UTC(2021, 0, 20);
const AP_MONTHS = Object.freeze(['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']);

export const NAME = 'What The Fuck Just Happened Today?';
export const SITE = 'whatthefuckjusthappenedtoday.com';
export const ADDRESS = 'WTF Just Happened? LLC · 505 Broadway E #211 · Seattle, WA 98102';
export const DEAR_2040 = 'Dear 2040';

export const ROOT_CLASS = 'lh-printing';
export const HOST_CLASS = 'lh-print';
export const STYLE_ID = 'lh-print-style';

export const GRID = Object.freeze({
  left: 120, right: 720, measure: 600, broadMeasure: 480,
  markTop: 72, markWidth: 110.4, markHeight: 72, nameLeft: 252,
  nameBase: 124, urlBase: 144, dayBase: 124, dateBase: 144,
  divider: 162, plBase: 186, bodyTop: 214, bodyLimit: 960, footBase: 998,
  boxWidth: 720, boxHeight: 1008,
});

const FACES = Object.freeze({
  letter: { face: 'lh-face-courier', width: GRID.measure },
  broadside: { face: 'lh-face-broad', width: GRID.broadMeasure },
});

const MARK = [
  ['g', { fill: '#000' }, [
    ['rect', { x: 0, y: 0, width: 56, height: 56, rx: 11.76 }],
    ['rect', { x: 64, y: 0, width: 56, height: 56, rx: 11.76 }],
    ['rect', { x: 128, y: 0, width: 56, height: 56, rx: 11.76 }],
    ['rect', { x: 0, y: 64, width: 56, height: 56, rx: 11.76 }],
    ['rect', { x: 64, y: 64, width: 56, height: 56, rx: 11.76 }],
    ['rect', { x: 128, y: 64, width: 56, height: 56, rx: 11.76 }],
  ]],
  ['g', { fill: '#fff' }, [
    ['path', { d: 'M96,16 L107.999974,16 C110.203575,16 112,14.209139 112,12 C112,9.79535615 110.209128,8 107.999974,8 L76.0000255,8 C73.7964248,8 72,9.790861 72,12 C72,14.2046438 73.7908724,16 76.0000255,16 L88,16 L88,43.9999745 C88,46.2035752 89.790861,48 92,48 C94.2046438,48 96,46.2091276 96,43.9999745 L96,16 Z' }],
    ['rect', { x: 140, y: 24, width: 24, height: 8, rx: 4 }],
    ['path', { d: 'M84,88 L84,76.0000255 C84,73.7964248 82.209139,72 80,72 C77.7953562,72 76,73.7908724 76,76.0000255 L76,107.999974 C76,110.203575 77.790861,112 80,112 C82.2046438,112 84,110.209128 84,107.999974 L84,96 L100,96 L100,107.999974 C100,110.203575 101.790861,112 104,112 C106.204644,112 108,110.209128 108,107.999974 L108,76.0000255 C108,73.7964248 106.209139,72 104,72 C101.795356,72 100,73.7908724 100,76.0000255 L100,88 L84,88 Z' }],
    ['path', { d: 'M160,80 L171.999974,80 C174.203575,80 176,78.209139 176,76 C176,73.7953562 174.209128,72 171.999974,72 L140.000026,72 C137.796425,72 136,73.790861 136,76 C136,78.2046438 137.790872,80 140.000026,80 L152,80 L152,107.999974 C152,110.203575 153.790861,112 156,112 C158.204644,112 160,110.209128 160,107.999974 L160,80 Z' }],
  ]],
  ['g', { fill: 'none', stroke: '#fff', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    ['path', { d: 'M144,44 L144,14.0017433 C144,12.896211 144.897026,12 146.004947,12 L168,12' }],
    ['path', { d: 'M40,108 L40,88 C40,81.372583 34.627417,76 28,76 C21.372583,76 16,81.372583 16,88', transform: 'translate(28 92) scale(1 -1) translate(-28 -92)' }],
    ['polyline', { points: '12 12 16 44 28 28 40 44 44 12' }],
  ]],
];

const MONO = '400 8.5pt/1 Menlo, Monaco, "Courier New", monospace';

export const LETTERHEAD_CSS = [
  `.${HOST_CLASS} { position: fixed; left: 0; top: 0; width: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none; z-index: -1; margin: 0; padding: 0; border: 0; }`,
  '.lh-sheet { position: relative; display: block; width: 720px; height: 1008px; margin: 0; padding: 0; border: 0; overflow: hidden; box-sizing: border-box; background: #fff; color: #000; '
    + 'font: 400 11pt/16pt Courier, "Courier New", monospace; font-style: normal; letter-spacing: 0; word-spacing: 0; text-transform: none; text-indent: 0; text-align: left; '
    + 'text-decoration: none; text-shadow: none; direction: ltr; white-space: normal; -webkit-text-size-adjust: none; text-size-adjust: none; }',
  '.lh-sheet *, .lh-measure, .lh-measure * { margin: 0; padding: 0; border: 0; box-sizing: content-box; color: #000; background: none; float: none; max-width: none; min-width: 0; opacity: 1; '
    + 'letter-spacing: 0; word-spacing: 0; text-transform: none; text-indent: 0; text-decoration: none; text-shadow: none; font-style: normal; }',
  '.lh-sheet .lh-mark { position: absolute; left: 120px; top: 72px; width: 110.4px; height: 72px; display: block; }',
  '.lh-sheet .lh-name { position: absolute; left: 252px; white-space: nowrap; font: 700 13.5pt/1 Helvetica, Arial, sans-serif; }',
  `.lh-sheet .lh-url, .lh-sheet .lh-day, .lh-sheet .lh-date, .lh-sheet .lh-foot, .lh-sheet .lh-pl-right { font: ${MONO}; font-variant-numeric: tabular-nums; white-space: nowrap; }`,
  '.lh-sheet .lh-url { position: absolute; left: 252px; }',
  '.lh-sheet .lh-day, .lh-sheet .lh-date { position: absolute; right: 0; text-align: right; }',
  '.lh-sheet .lh-divider { position: absolute; left: 120px; top: 162px; width: 600px; height: 2px; border-top: 1px solid #000; border-bottom: 1px solid #000; }',
  '.lh-sheet .lh-pline { position: absolute; left: 120px; width: 600px; display: flex; justify-content: space-between; align-items: baseline; gap: 24px; }',
  '.lh-sheet .lh-pl-left { font: 700 9pt/1 Helvetica, Arial, sans-serif; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }',
  `.lh-sheet .lh-pline.lh-run .lh-pl-left { font: ${MONO}; letter-spacing: 0; text-transform: none; }`,
  '.lh-sheet .lh-body { position: absolute; left: 120px; top: 214px; }',
  '.lh-sheet .lh-ln { display: block; white-space: pre; overflow: visible; }',
  '.lh-sheet .lh-foot { position: absolute; left: 120px; width: 600px; display: flex; justify-content: space-between; gap: 24px; }',
  '.lh-face-courier { font: 400 11pt/16pt Courier, "Courier New", monospace; }',
  '.lh-face-broad { font: 400 20pt/28pt Courier, "Courier New", monospace; }',
  '.lh-sheet .lh-face-courier .lh-ln { height: 16pt; }',
  '.lh-sheet .lh-face-broad .lh-ln { height: 28pt; }',
  '.lh-measure { position: absolute; left: 0; top: 0; display: block; visibility: hidden; pointer-events: none; white-space: pre-wrap; overflow-wrap: anywhere; word-break: normal; contain: layout; }',
  '.lh-measure span { display: inline; }',
  '@page { size: auto; margin: 0; }',
  '@media print {',
  `  html.${ROOT_CLASS}, html.${ROOT_CLASS} body { margin: 0 !important; padding: 0 !important; border: 0 !important; background: #fff !important; min-height: 0 !important; height: auto !important; width: auto !important; max-width: none !important; display: block !important; }`,
  `  html.${ROOT_CLASS} body > :not(.${HOST_CLASS}) { display: none !important; }`,
  `  html.${ROOT_CLASS} .${HOST_CLASS} { position: static !important; display: block !important; width: auto !important; height: auto !important; overflow: visible !important; visibility: visible !important; z-index: auto !important; }`,
  `  html.${ROOT_CLASS} .${HOST_CLASS} .lh-sheet { break-after: page; page-break-after: always; break-inside: avoid; page-break-inside: avoid; }`,
  `  html.${ROOT_CLASS} .${HOST_CLASS} .lh-sheet:last-child { break-after: auto; page-break-after: auto; }`,
  '}',
].join('\n');

function groupDigits(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function dateline(dayKey) {
  if (typeof dayKey !== 'string') return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const at = Date.UTC(year, month - 1, day);
  const date = new Date(at);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const n = (at - DAY_ONE) / DAY_MS + 1;
  if (!Number.isSafeInteger(n) || n < 1) return null;
  return { day: `Day ${groupDigits(n)}`, date: `${AP_MONTHS[month - 1]} ${day}, ${year}` };
}

export function letterText({ salutation = '', body = '', signoff = '' } = {}) {
  const paragraphs = String(body ?? '').replace(/\r\n?/g, '\n').split(/\n(?:[ \t]*\n)+/)
    .filter(part => part.trim() !== '');
  return [String(salutation ?? '').replace(/\r\n?/g, '\n'), paragraphs.join('\n\n'), String(signoff ?? '')]
    .filter(part => part.trim() !== '').join('\n\n');
}

function el(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgNode(document, [tag, attrs, kids = []]) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  for (const kid of kids) node.appendChild(svgNode(document, kid));
  return node;
}

export function buildMark(document) {
  const svg = svgNode(document, ['svg', { class: 'lh-mark', viewBox: '0 0 184 120', role: 'img', 'aria-label': 'WTFJHT' }, MARK]);
  return svg;
}

export function ensureStyle(document) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = LETTERHEAD_CSS;
    (document.head || document.documentElement).appendChild(style);
  }
  return style;
}

function wrapLines(measurer, text, face, width) {
  measurer.className = `lh-measure ${face}`;
  measurer.style.width = `${width}px`;
  const document = measurer.ownerDocument;
  const span = value => {
    const node = el(document, 'span', '', value);
    measurer.appendChild(node);
    return node;
  };
  const out = [];
  for (const source of String(text).split('\n')) {
    if (!source.trim()) {
      out.push('');
      continue;
    }
    const lead = /^[ \t]*/.exec(source)[0];
    const tokens = source.slice(lead.length).match(/[^ \t]+[ \t]*/g);
    tokens[0] = lead + tokens[0];
    measurer.textContent = '';
    let spans = tokens.map(span);
    if (spans.some(node => node.getClientRects().length > 1)) {
      const pieces = [];
      for (const node of spans) {
        if (node.getClientRects().length > 1) pieces.push(...node.textContent);
        else pieces.push(node.textContent);
      }
      measurer.textContent = '';
      spans = pieces.map(span);
    }
    let current = '';
    let top = null;
    for (const node of spans) {
      const y = node.offsetTop;
      if (top === null) top = y;
      if (y !== top) {
        out.push(current.replace(/\s+$/, ''));
        current = '';
        top = y;
      }
      current += node.textContent;
    }
    out.push(current.replace(/\s+$/, ''));
  }
  measurer.textContent = '';
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
}

export function paginate(lines, cap) {
  const pages = [];
  const n = lines.length;
  const blank = i => i < 0 || i >= n || lines[i] === '';
  let start = 0;
  while (start < n) {
    while (start < n && lines[start] === '' && pages.length) start += 1;
    if (start >= n) break;
    let k = Math.min(n, start + cap);
    if (k < n) {
      let guard = cap;
      while (k > start + 1 && guard > 0) {
        guard -= 1;
        if (!blank(k) && !blank(k - 1) && blank(k - 2)) { k -= 1; continue; }
        if (!blank(k) && blank(k + 1) && !blank(k - 1)) { k -= 1; continue; }
        break;
      }
    }
    const page = lines.slice(start, k);
    while (page.length && page[page.length - 1] === '') page.pop();
    pages.push(page);
    start = k;
  }
  return pages;
}

function pinBaselines(sheet) {
  const document = sheet.ownerDocument;
  for (const node of sheet.querySelectorAll('[data-base]')) {
    node.style.top = '0px';
    const host = (node.classList.contains('lh-pline') || node.classList.contains('lh-foot')) && node.firstElementChild
      ? node.firstElementChild : node;
    const mark = el(document, 'span');
    mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    host.appendChild(mark);
    let offset = 0;
    let at = mark;
    while (at && at !== node) {
      offset += at.offsetTop;
      at = at.offsetParent;
    }
    mark.remove();
    node.style.top = `${(Number(node.dataset.base) - offset).toFixed(3)}px`;
  }
}

function based(document, className, text, base) {
  const node = el(document, 'div', className, text);
  node.dataset.base = String(base);
  return node;
}

export function buildSheets(document, host, doc) {
  ensureStyle(document);
  const date = doc?.dateline;
  if (!date || typeof date.day !== 'string' || typeof date.date !== 'string') throw new TypeError('A letterhead sheet needs a dateline');
  const broad = doc.kind === 'broadside';
  const measurer = el(document, 'div', 'lh-measure');
  measurer.setAttribute('aria-hidden', 'true');
  host.appendChild(measurer);
  let setting = broad ? FACES.broadside : FACES.letter;
  const lineHeight = face => {
    measurer.className = `lh-measure ${face}`;
    return parseFloat(document.defaultView.getComputedStyle(measurer).lineHeight);
  };
  const capFor = face => Math.max(1, Math.floor((GRID.bodyLimit - GRID.bodyTop) / lineHeight(face) + 1e-6));
  let lines = wrapLines(measurer, doc.text ?? '', setting.face, setting.width);
  let cap = capFor(setting.face);
  if (broad && lines.length > cap) {
    setting = FACES.letter;
    lines = wrapLines(measurer, doc.text ?? '', setting.face, setting.width);
    cap = capFor(setting.face);
  }
  const lh = lineHeight(setting.face);
  measurer.remove();
  let pages = paginate(lines, cap);
  if (!pages.length) pages = [[]];
  const total = pages.length;
  const sheets = pages.map((pageLines, index) => {
    const first = index === 0;
    const sheet = el(document, 'div', 'lh-sheet');
    sheet.dataset.page = String(index + 1);
    sheet.dataset.pages = String(total);
    if (first) {
      sheet.appendChild(buildMark(document));
      sheet.append(
        based(document, 'lh-name', NAME, GRID.nameBase),
        based(document, 'lh-url', SITE, GRID.urlBase),
        based(document, 'lh-day', date.day, GRID.dayBase),
        based(document, 'lh-date', date.date, GRID.dateBase),
      );
    }
    const divider = el(document, 'div', 'lh-divider');
    divider.setAttribute('aria-hidden', 'true');
    sheet.appendChild(divider);
    if (first && doc.label) {
      const line = based(document, 'lh-pline', undefined, GRID.plBase);
      line.appendChild(el(document, 'span', 'lh-pl-left', doc.label));
      sheet.appendChild(line);
    } else if (!first) {
      const line = based(document, 'lh-pline lh-run', undefined, GRID.plBase);
      line.append(el(document, 'span', 'lh-pl-left', doc.runningHead || doc.label || NAME),
        el(document, 'span', 'lh-pl-right', `page ${index + 1} of ${total}`));
      sheet.appendChild(line);
    }
    const body = el(document, 'div', `lh-body ${setting.face}`);
    body.style.width = `${setting.width}px`;
    body.style.height = `${(cap * lh).toFixed(3)}px`;
    for (const text of pageLines) body.appendChild(el(document, 'div', 'lh-ln', text));
    sheet.appendChild(body);
    const foot = based(document, 'lh-foot', undefined, GRID.footBase);
    foot.appendChild(el(document, 'span', 'lh-foot-addr', ADDRESS));
    const folio = typeof doc.folio === 'function' ? doc.folio(index, total) : '';
    if (folio) foot.appendChild(el(document, 'span', 'lh-foot-folio', folio));
    sheet.appendChild(foot);
    host.appendChild(sheet);
    return sheet;
  });
  for (const sheet of sheets) pinBaselines(sheet);
  return sheets;
}

const sessions = new WeakMap();

export function endPrint(document = globalThis.document) {
  if (!document) return;
  const session = sessions.get(document);
  sessions.delete(document);
  if (session) for (const release of session) release();
  for (const host of [...(document.querySelectorAll?.(`.${HOST_CLASS}`) || [])]) host.remove();
  document.getElementById?.(STYLE_ID)?.remove();
  document.documentElement?.classList?.remove(ROOT_CLASS);
}

export const RELEASE_GRACE_MS = 1000;

function clockOf(win) {
  return () => {
    const perf = win?.performance;
    return typeof perf?.now === 'function' ? perf.now() : Date.now();
  };
}

function watch(document, now) {
  const session = { returnedAt: null, releases: [] };
  const press = () => {
    if (session.returnedAt === null || now() - session.returnedAt < RELEASE_GRACE_MS) return;
    endPrint(document);
  };
  for (const type of ['pointerdown', 'keydown']) {
    if (typeof document.addEventListener !== 'function') break;
    document.addEventListener(type, press, true);
    session.releases.push(() => document.removeEventListener(type, press, true));
  }
  sessions.set(document, session.releases);
  return session;
}

export function printSheets(doc, { document = globalThis.document, window: win = document?.defaultView, now } = {}) {
  if (!document) return false;
  endPrint(document);
  const date = dateline(doc?.dayKey);
  if (!date || !document.body || typeof win?.print !== 'function') return false;
  ensureStyle(document);
  const host = el(document, 'div', HOST_CLASS);
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  try {
    buildSheets(document, host, { ...doc, dateline: date });
  } catch {
    endPrint(document);
    return false;
  }
  document.documentElement.classList.add(ROOT_CLASS);
  const clock = typeof now === 'function' ? now : clockOf(win);
  const session = watch(document, clock);
  try {
    win.print();
  } catch {
    endPrint(document);
    return false;
  }
  session.returnedAt = clock();
  return true;
}

export function printLetter(letter, options = {}) {
  return printSheets({
    kind: 'letter', runningHead: DEAR_2040, dayKey: letter?.dayKey, text: letterText(letter || {}),
  }, options);
}
