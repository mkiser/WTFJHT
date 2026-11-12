import {
  ANY,
  PAGE_SIZE,
  dateLabel,
  filterRows,
  findRow,
  formatCount,
  isFiltered,
  nextShown,
  orderRows,
  parseEdition,
  parseLinkedNumber,
  sentenceRuns,
  sentenceText,
  sharePath,
  tallies,
  writeInBand,
} from './core.js';
import { startSky } from './sky.js';

const LOAD_TIMEOUT_MS = 30_000;

const NO_SCROLL = { preventScroll: true };

const STEPS = Object.freeze({ ArrowDown: 1, ArrowUp: -1 });

function setSlot(root, name, value) {
  const node = root.querySelector(`[data-slot="${name}"]`);
  if (node) node.textContent = value;
  return node;
}

function readFrame(template) {
  return [...template.content.querySelectorAll('[data-frame]')].map(node => node.textContent);
}

function start(document) {
  const view = document.defaultView;
  const root = document.getElementById('one-sentence');
  const template = document.getElementById('os-tpl-sheet');
  const frame = readFrame(template);
  const list = document.getElementById('os-list');
  const filter = document.getElementById('os-filter');
  const tally = document.getElementById('os-tally');
  const clear = document.getElementById('os-clear');
  const loading = document.getElementById('os-loading');
  const unavailable = document.getElementById('os-unavailable');
  const retry = document.getElementById('os-retry');
  const explore = document.getElementById('os-explore');
  const morePara = document.getElementById('os-more-p');
  const more = document.getElementById('os-more');
  const end = document.getElementById('os-end');
  const pinned = document.getElementById('os-pinned');
  const pinnedList = document.getElementById('os-pinned-list');
  const pinnedLabel = document.getElementById('os-pinned-label');
  const notFound = document.getElementById('os-notfound');
  const title = document.getElementById('os-h1').textContent;
  const orderButtons = [...root.querySelectorAll('[data-order]')];
  const cells = [...filter.querySelectorAll('.os-cell')].map(button => ({
    button,
    beat: Number(button.dataset.beat),
    family: button.dataset.family,
    count: button.querySelector('.os-count'),
  }));
  const cellByButton = new Map(cells.map(cell => [cell.button, cell]));
  const columns = [...new Set(cells.map(cell => cell.beat))].map(beat => cells.filter(cell => cell.beat === beat));
  const totals = [...filter.querySelectorAll('.os-total[data-beat]')].map(node => ({
    beat: Number(node.dataset.beat),
    count: node.querySelector('.os-count'),
  }));
  const stops = columns.map(() => null);

  const state = { rows: [], view: [], filters: [ANY, ANY, ANY], order: 'newest', seed: 1, shown: PAGE_SIZE };
  let dialog = null;
  let dialogLoad = null;
  let shareRequest = 0;

  function runsOf(row) {
    return sentenceRuns(row, frame);
  }

  function renderSheet(row) {
    const item = template.content.firstElementChild.cloneNode(true);
    const runs = runsOf(row);
    item.dataset.n = String(row.n);
    item.dataset.tilt = String(row.n % 4);
    item.tabIndex = -1;
    row.w.forEach((word, index) => setSlot(item, `w${index}`, word));
    const ending = setSlot(item, 'ending', runs[runs.length - 1].text);
    if (ending) ending.dataset.band = String(writeInBand(row.n));
    setSlot(item, 'number', formatCount(row.n));
    setSlot(item, 'date', dateLabel(row.d));
    item.querySelector('[data-slot="link"]').href = sharePath(view.location.pathname, row.n);
    for (const node of item.querySelectorAll('[data-slot], [data-frame]')) {
      node.removeAttribute('data-slot');
      node.removeAttribute('data-frame');
    }
    return item;
  }

  function isPressed(cell) {
    return state.filters[cell.beat] === cell.family;
  }

  function fillCounts() {
    const counts = tallies(state.rows, state.filters);
    for (const { beat, count } of totals) count.textContent = formatCount(counts[beat].any);
    for (const cell of cells) {
      const value = counts[cell.beat].families.get(cell.family) ?? 0;
      const pressed = isPressed(cell);
      cell.count.textContent = formatCount(value);
      cell.button.setAttribute('aria-pressed', String(pressed));
      cell.button.disabled = value === 0 && !pressed;
    }
    fillStops();
  }

  function fillStops() {
    columns.forEach((column, beat) => {
      const current = stops[beat];
      if (!current || current.button.disabled) {
        stops[beat] = column.find(isPressed) ?? column.find(cell => !cell.button.disabled) ?? null;
      }
      for (const cell of column) cell.button.tabIndex = cell === stops[beat] ? 0 : -1;
    });
  }

  function moveStop(cell) {
    stops[cell.beat] = cell;
    fillStops();
  }

  function fillList() {
    list.replaceChildren(...state.view.slice(0, state.shown).map(renderSheet));
    fillEnd();
  }

  function fillEnd() {
    const remaining = state.view.length - state.shown;
    morePara.hidden = remaining <= 0;
    end.hidden = remaining > 0;
  }

  function apply() {
    state.view = orderRows(filterRows(state.rows, state.filters), state.order, state.seed);
    state.shown = Math.min(PAGE_SIZE, state.view.length);
    setSlot(tally, 'shown', formatCount(state.view.length));
    setSlot(tally, 'total', formatCount(state.rows.length));
    clear.hidden = !isFiltered(state.filters);
    fillCounts();
    fillList();
  }

  function setOrder(order) {
    state.order = order;
    if (order === 'shuffle') state.seed = Math.floor(Math.random() * 4294967296);
    for (const button of orderButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.order === order));
    }
    apply();
  }

  function loadMore() {
    const before = state.shown;
    state.shown = nextShown(state.shown, state.view.length);
    const added = state.view.slice(before, state.shown).map(renderSheet);
    list.append(...added);
    fillEnd();
    if (added[0]) added[0].focus(NO_SCROLL);
    else end.focus(NO_SCROLL);
  }

  function shareItem(row, trigger) {
    const runs = runsOf(row);
    const url = new URL(sharePath(view.location.pathname, row.n), view.location.origin).href;
    return {
      runs,
      trigger,
      url,
      title,
      text: sentenceText(runs),
      stamp: trigger.closest('.d40-sheetfoot').querySelector('.d40-stamp').textContent,
      fileStem: `one-sentence-${root.dataset.year}-${row.n}`,
      band: writeInBand(row.n),
    };
  }

  async function openShare(row, trigger) {
    shareRequest += 1;
    const request = shareRequest;
    const wanted = () => request === shareRequest && trigger.isConnected;
    if (!dialog) {
      dialogLoad ??= import('./share.js').then(({ createShareDialog }) => createShareDialog(document));
      try {
        dialog = await dialogLoad;
      } catch {
        dialogLoad = null;
        if (wanted()) showShareFailed(trigger);
        return;
      }
    }
    if (wanted()) dialog.open(shareItem(row, trigger));
  }

  function showShareFailed(trigger) {
    const sheet = trigger.closest('.d40-sheet');
    if (sheet.querySelector('.os-share-failed')) return;
    const note = document.createElement('p');
    note.className = 'os-share-failed';
    note.setAttribute('role', 'status');
    note.textContent = document.querySelector('[data-msg="share.unavailable"]').textContent;
    sheet.append(note);
  }

  function openLinked() {
    const linked = parseLinkedNumber(view.location.search);
    if (linked.kind === 'none') return;
    const row = linked.kind === 'number' ? findRow(state.rows, linked.n) : null;
    if (!row) {
      notFound.hidden = false;
      return;
    }
    pinnedList.replaceChildren(renderSheet(row));
    pinned.hidden = false;
    const startY = view.scrollY;
    view.requestAnimationFrame(() => view.requestAnimationFrame(() => {
      if (view.scrollY === startY) pinned.scrollIntoView({ block: 'start' });
      pinnedLabel.focus(NO_SCROLL);
    }));
  }

  function showUnavailable({ canRetry }) {
    loading.hidden = true;
    explore.hidden = true;
    retry.hidden = !canRetry;
    unavailable.hidden = false;
  }

  async function load(source) {
    loading.hidden = false;
    unavailable.hidden = true;
    explore.hidden = false;
    const controller = new AbortController();
    const timer = view.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    try {
      const response = await view.fetch(source, { credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.rows = parseEdition(await response.json());
    } catch {
      showUnavailable({ canRetry: true });
      return;
    } finally {
      view.clearTimeout(timer);
    }
    loading.hidden = true;
    filter.disabled = false;
    tally.classList.remove('is-waiting');
    for (const button of orderButtons) button.disabled = false;
    apply();
    openLinked();
  }

  filter.addEventListener('click', event => {
    const cell = cellByButton.get(event.target.closest?.('.os-cell'));
    if (!cell || cell.button.disabled) return;
    const focused = document.activeElement === cell.button;
    state.filters[cell.beat] = isPressed(cell) ? ANY : cell.family;
    stops[cell.beat] = cell;
    apply();
    if (focused && cell.button.disabled) stops[cell.beat]?.button.focus(NO_SCROLL);
  });
  filter.addEventListener('keydown', event => {
    const step = STEPS[event.key];
    const cell = cellByButton.get(event.target.closest?.('.os-cell'));
    if (!step || !cell || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const column = columns[cell.beat];
    let index = column.indexOf(cell) + step;
    while (column[index]?.button.disabled) index += step;
    const next = column[index];
    if (!next) return;
    moveStop(next);
    next.button.focus();
  });
  clear.addEventListener('click', () => {
    state.filters = [ANY, ANY, ANY];
    fillCounts();
    const first = columns[0].find(cell => !cell.button.disabled);
    if (first) {
      moveStop(first);
      first.button.focus(NO_SCROLL);
    }
    apply();
  });
  for (const button of orderButtons) {
    button.addEventListener('click', () => setOrder(button.dataset.order));
  }
  more.addEventListener('click', loadMore);
  root.addEventListener('click', event => {
    const trigger = event.target.closest?.('.d40-shareicon');
    if (!trigger) return;
    const row = findRow(state.rows, Number(trigger.closest('[data-n]').dataset.n));
    if (row) openShare(row, trigger);
  });

  const source = root.dataset.source || '';
  retry.addEventListener('click', () => load(source));
  if (!source) showUnavailable({ canRetry: false });
  else load(source);
}

startSky(window);
start(document);
