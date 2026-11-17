import { rowFromLetter } from './live-core.js';
import { createAdapter, createDialog, createOwnStore, createPrinter, createSheets, readJson } from './live-ui.js';
import { startSky } from './sky.js';

export function mountSentence(win = globalThis.window) {
  const document = win.document;
  const root = document.getElementById('one-sentence');
  const ED = readJson(document, 'os-edition');
  const CONFIG = readJson(document, 'os-live-config') || {};
  if (!root || !ED) return null;
  const byId = id => document.getElementById(id);
  const adapter = createAdapter(win, CONFIG);
  const own = createOwnStore(win, ED.edition);
  const printer = createPrinter({ window: win, document, edition: ED });
  const dialog = createDialog({ document, edition: ED });
  const sheetFor = createSheets({ document, template: byId('os-tpl-sheet'), edition: ED, onShare: (row, trigger) => dialog.open(row, trigger), printer });
  const id = new URLSearchParams(win.location.search).get('id') || '';
  const show = name => {
    for (const block of root.querySelectorAll('[data-os-block]')) block.hidden = block.dataset.osBlock !== name;
  };
  async function load() {
    show('loading');
    if (!/^[A-Za-z0-9_-]{22}$/.test(id)) {
      show('notfound');
      return;
    }
    const result = await adapter.get(id);
    if (result?.ok) {
      const row = rowFromLetter(result.data?.letter);
      if (row) {
        const mine = { ...row, own: own.has(row.id) };
        byId('os-one').replaceChildren(sheetFor(mine, 1, true));
        show('sheet');
        return;
      }
    }
    if (result?.status === 404) show('notfound');
    else if (result?.status === 410) show('gone');
    else show('unavailable');
  }
  byId('os-retry').addEventListener('click', load);
  try { startSky(win); } catch { }
  return { ready: load() };
}

mountSentence();
