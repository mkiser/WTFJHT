import { createApiAdapter } from '../collect/api.js';
import { writeInBand } from './core.js';
import { runsOf, stampOf, textOf } from './live-core.js';

export function readJson(document, id) {
  try {
    return JSON.parse(document.getElementById(id)?.textContent || 'null');
  } catch {
    return null;
  }
}

export function make(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function bandOf(row) {
  return Number.isSafeInteger(row?.n) ? writeInBand(row.n) : 0;
}

export function paint(document, host, runs, band = 0) {
  host.replaceChildren(...runs.map(run => {
    if (run.kind === 'word') return make(document, 'b', 'os-word', run.text);
    const node = make(document, 'span', run.kind === 'frame' ? 'os-frame' : 'os-ending', run.text);
    if (run.kind === 'ending') node.dataset.band = String(band);
    return node;
  }));
}

export function createAdapter(win, config) {
  return createApiAdapter({
    baseUrl: config?.apiBase || '',
    fetchImpl: win.fetch?.bind(win),
    early: win.osEarly || null,
    setTimeoutImpl: (fn, ms) => win.setTimeout(fn, ms),
    clearTimeoutImpl: id => win.clearTimeout(id),
  });
}

export function createOwnStore(win, editionId) {
  const key = `oneSentence:${editionId}:own`;
  let storage = null;
  try { storage = win.localStorage; } catch { storage = null; }
  const read = () => {
    try {
      const value = JSON.parse(storage?.getItem(key) || '[]');
      return Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];
    } catch {
      return [];
    }
  };
  const memory = new Set(read());
  return {
    key,
    has: id => Boolean(id) && memory.has(id),
    add(id) {
      if (!id) return;
      memory.add(id);
      try { storage?.setItem(key, JSON.stringify([...memory].slice(-50))); } catch { }
    },
  };
}

export function createPrinter({ window: win, document, edition, load = () => import('../letterhead.js') }) {
  const bound = new Map();
  let module = null;
  let asked = false;
  function arm(button) {
    const row = bound.get(button);
    button.disabled = !(module && row && module.dateline(row.d));
  }
  function request() {
    if (asked) return;
    asked = true;
    const run = () => Promise.resolve().then(load).then(loaded => {
      if (typeof loaded?.printSheets !== 'function' || typeof loaded?.dateline !== 'function') return;
      module = loaded;
      for (const button of bound.keys()) {
        if (button.isConnected) arm(button);
        else bound.delete(button);
      }
    }, () => {});
    if (typeof win.requestIdleCallback === 'function') win.requestIdleCallback(run, { timeout: 2000 });
    else win.setTimeout(run, 200);
  }
  function print(row) {
    if (!module || !module.dateline(row.d)) return false;
    return module.printSheets({ kind: 'broadside', label: `${edition.title} · ${edition.edition}`, dayKey: row.d, text: textOf(row, edition) }, { document, window: win });
  }
  return {
    bind(button, row) {
      bound.set(button, row);
      button.disabled = true;
      arm(button);
      request();
    },
    print,
    get ready() { return Boolean(module); },
  };
}

export function createSheets({ document, template, edition, onShare, printer }) {
  const copy = edition.copy;
  return function sheetFor(row, tilt, onWall) {
    const li = template.content.firstElementChild.cloneNode(true);
    li.dataset.tilt = String(tilt);
    if (row.n !== null && row.n !== undefined) li.dataset.n = String(row.n);
    if (row.id) li.dataset.id = row.id;
    li.tabIndex = -1;
    paint(document, li.querySelector('[data-slot="sentence"]'), runsOf(row, edition), bandOf(row));
    li.querySelector('[data-slot="stamp"]').textContent = stampOf(row, copy, onWall);
    const share = li.querySelector('.d40-shareicon');
    share.setAttribute('aria-label', copy.shareLabel);
    share.title = copy.shareLabel;
    share.addEventListener('click', () => onShare(row, share));
    const print = li.querySelector('.d40-printicon');
    print.setAttribute('aria-label', copy.print);
    print.title = copy.print;
    print.addEventListener('click', () => printer.print(row));
    printer.bind(print, row);
    return li;
  };
}

export function createDialog({ document, edition, load = () => import('./share.js') }) {
  const copy = edition.copy;
  let dialog = null;
  let loading = null;
  let request = 0;
  function itemOf(row, trigger) {
    return {
      runs: runsOf(row, edition),
      trigger,
      url: row.url,
      title: edition.title,
      text: textOf(row, edition),
      stamp: stampOf(row, copy, false),
      fileStem: `one-sentence-${edition.edition}-${row.n ?? 'sentence'}`,
      band: bandOf(row),
    };
  }
  function failed(trigger) {
    const host = trigger?.closest('.d40-sheet') || trigger?.parentElement;
    if (!host || host.querySelector('.os-share-failed')) return;
    const note = make(document, 'p', 'os-share-failed', document.querySelector('[data-msg="share.unavailable"]')?.textContent ?? '');
    note.setAttribute('role', 'status');
    host.append(note);
  }
  return {
    async open(row, trigger) {
      request += 1;
      const mine = request;
      const wanted = () => mine === request && (!trigger || trigger.isConnected);
      if (!dialog) {
        loading ??= Promise.resolve().then(load).then(({ createShareDialog }) => createShareDialog(document));
        try {
          dialog = await loading;
        } catch {
          loading = null;
          if (wanted()) failed(trigger);
          return;
        }
      }
      if (wanted()) dialog.open(itemOf(row, trigger));
    },
  };
}
