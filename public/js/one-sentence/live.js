import { scheduleClose } from '../collect/edition.js';
import { createTurnstileGate } from '../collect/turnstile.js';
import {
  BOUNCE_MS, HOLD_MS, applyPick, canonicalPayload, countsIncludeOwn, editionProblem, endingProblem, endingScreen, fill, filterSlot, filterWord,
  firstOpen, formatCount, makeKey, matchKey, optionsFor, ownRow, promptParts, publishOutcome, pulsePhase,
  readbackScreen, rowFromLetter, runsOf, similarOf, submission, termsHash, usedChars, wordsOfSlot,
} from './live-core.js';
import { createAdapter, createDialog, createOwnStore, createPrinter, createSheets, make, paint, readJson } from './live-ui.js';
import { startSky } from './sky.js';

export function mountLive(win = globalThis.window) {
  const document = win.document;
  const html = document.documentElement;
  const root = document.getElementById('one-sentence');
  const ED = readJson(document, 'os-edition');
  const CONFIG = readJson(document, 'os-live-config') || {};
  if (!root || !ED) return null;
  const BROKEN = Boolean(editionProblem(ED));
  const EDGE_WINDOW_MS = 5000;
  const CHALLENGE_WAIT_MS = Number(CONFIG.limits?.challengeWaitMs) || 90000;
  const COPY = ED.copy;
  const SLOTS = ED.slots;
  const FILTER_SLOT = filterSlot(ED);
  const PAGE_SIZE = Number(CONFIG.limits?.pageSize) || 24;
  const MAX_PAGE = Number(CONFIG.limits?.maxPageSize) || PAGE_SIZE;
  const byId = id => document.getElementById(id);
  const calm = win.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = win.matchMedia('(hover: hover) and (pointer: fine)');

  const adapter = createAdapter(win, CONFIG);
  const own = createOwnStore(win, ED.edition);
  const printer = createPrinter({ window: win, document, edition: ED });
  const dialog = createDialog({ document, edition: ED });
  const sheetFor = createSheets({ document, template: byId('os-tpl-sheet'), edition: ED, onShare: (row, trigger) => dialog.open(row, trigger), printer });
  let gate = null;
  if (typeof CONFIG.turnstileSiteKey === 'string' && CONFIG.turnstileSiteKey) {
    try {
      gate = createTurnstileGate({ siteKey: CONFIG.turnstileSiteKey, document });
      byId('os-gate').append(gate.container);
      gate.onInteractive(() => showChallenge());
    } catch {
      gate = null;
    }
  }
  function showChallenge() {
    if (!gate || S.view !== 'compose' || S.screen !== readbackScreen(ED)) return;
    gate.container.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  const promptEl = byId('os-prompt');
  const choicesEl = byId('os-choices');
  const endStep = byId('os-endstep');
  const endWrap = byId('os-endwrap');
  const ta = byId('os-ending');
  const counter = byId('os-counter');
  const endErrEl = byId('os-enderr');
  const finishedEl = byId('os-finished');
  const commit = byId('os-commit');
  const errEl = byId('os-err');
  const publishBtn = byId('os-publish');
  const h1 = byId('os-h1');

  const S = {
    phase: 'loading', view: 'compose', screen: 0, holding: false, holdTimer: null, bounce: null,
    answers: SLOTS.map(() => null), ending: '', error: '', canRetry: false, blocked: false,
    published: false, letter: null, pending: null, sending: false, floor: 0, terms: null, counts: null,
    countsOwn: null, recount: null, attempt: 0, closesAt: null,
  };
  const W = { rows: [], cursor: null, total: null, counts: null, now: '', shown: PAGE_SIZE, failed: false, loaded: false, loading: null };
  const ENDING = endingScreen(ED);
  const READBACK = readbackScreen(ED);
  const problemText = kind => (kind === 'empty' ? COPY.emptyEnding : kind === 'over' ? fill(COPY.overLimit, { limit: formatCount(ED.ending.limit) }) : '');

  function showPrompt(text) {
    promptEl.replaceChildren(...promptParts(text, ED, S.answers).map(part => ('word' in part ? make(document, 'b', 'os-word', part.word) : part.text)));
  }
  function renderChoices(i) {
    const current = S.answers[i]?.id;
    choicesEl.replaceChildren(...optionsFor(ED, S.answers, i).map(word => {
      const b = make(document, 'button', 'survey-option os-choice', word.label);
      b.type = 'button';
      b.id = `os-opt-${i}-${word.id}`;
      b.dataset.word = word.id;
      b.setAttribute('aria-pressed', String(current === word.id));
      return b;
    }));
  }
  function renderHint() {
    byId('os-hint').replaceChildren(...(ED.ending.hint || []).map(part => (typeof part === 'string' ? part : make(document, 'em', '', part.em))));
  }
  function renderCounter() {
    const used = usedChars(ta.value);
    const limit = ED.ending.limit;
    const over = used > limit;
    counter.hidden = used < ED.ending.near;
    byId('os-under').hidden = counter.hidden && !byId('os-hint').textContent.trim();
    counter.classList.toggle('is-over', over);
    endWrap.classList.toggle('is-over', over);
    counter.textContent = fill(over ? COPY.counterOver : COPY.counterNear, { used: formatCount(used), limit: formatCount(limit) });
  }
  function exampleHeight() {
    const ph = win.getComputedStyle(ta, '::placeholder');
    const probe = make(document, 'div', '', ta.placeholder);
    Object.assign(probe.style, {
      position: 'absolute', visibility: 'hidden', left: '-9999px', top: '0', width: `${ta.clientWidth}px`,
      fontFamily: ph.fontFamily, fontSize: ph.fontSize, fontStyle: ph.fontStyle, lineHeight: ph.lineHeight,
      whiteSpace: 'pre-wrap', overflowWrap: 'break-word',
    });
    document.body.append(probe);
    const h = Math.ceil(probe.getBoundingClientRect().height);
    probe.remove();
    return h;
  }
  function boxFloor() {
    const typed = ta.value;
    if (typed) ta.value = '';
    ta.style.height = 'auto';
    S.floor = Math.max(ta.scrollHeight, exampleHeight());
    if (typed) ta.value = typed;
  }
  function autosize() {
    ta.style.height = 'auto';
    if (!ta.value) S.floor = Math.max(ta.scrollHeight, exampleHeight());
    ta.style.height = `${Math.max(ta.scrollHeight, S.floor || 0)}px`;
  }
  function markInvalid() {
    const err = Boolean(S.error) && S.screen === ENDING;
    const over = usedChars(ta.value) > ED.ending.limit;
    endWrap.classList.toggle('is-error', err);
    if (err || over) ta.setAttribute('aria-invalid', 'true');
    else ta.removeAttribute('aria-invalid');
    ta.setAttribute('aria-describedby', err ? 'os-hint os-counter os-enderr' : 'os-hint os-counter');
  }
  function renderCommit() {
    errEl.textContent = S.error;
    if (S.canRetry) {
      const retry = make(document, 'button', 'd40-link', COPY.retry);
      retry.type = 'button';
      retry.id = 'os-fail-retry';
      retry.addEventListener('click', sendSentence);
      errEl.append(retry);
    }
    publishBtn.textContent = COPY.publish;
    publishBtn.removeAttribute('aria-busy');
    publishBtn.hidden = S.canRetry || S.blocked;
  }
  function renderCompose() {
    const k = S.screen;
    const isWord = k >= 1 && k <= SLOTS.length;
    const isEnding = k === ENDING;
    const isReadback = k === READBACK;
    byId('os-start').hidden = k > 0;
    byId('os-flow').hidden = k === 0;
    choicesEl.replaceChildren();
    promptEl.hidden = isReadback;
    endStep.hidden = !isEnding;
    finishedEl.hidden = !isReadback;
    commit.hidden = !isReadback;
    if (k === 0) return;
    byId('os-count').textContent = isReadback ? COPY.sectionCompose : fill(COPY.slotCount, { count: formatCount(k), total: formatCount(SLOTS.length + 1) });
    if (isWord) {
      showPrompt(SLOTS[k - 1].prompt);
      renderChoices(k - 1);
    }
    if (isEnding) {
      showPrompt(ED.ending.prompt);
      if (ta.value !== S.ending) ta.value = S.ending;
      renderHint();
      renderCounter();
      boxFloor();
      autosize();
      endErrEl.textContent = S.error;
      markInvalid();
    }
    if (isReadback) {
      paint(document, finishedEl, runsOf(ownRow(ED, S.answers, S.ending), ED), 0);
      renderCommit();
    }
  }
  function settleScreen(back = false) {
    const k = S.screen;
    const anchor = root;
    win.scrollTo(0, Math.max(0, anchor.getBoundingClientRect().top + win.scrollY));
    if (k === 0) h1.focus({ preventScroll: true });
    else if (k === READBACK) finishedEl.focus({ preventScroll: true });
    else if (k === ENDING && finePointer.matches) ta.focus({ preventScroll: true });
    else promptEl.focus({ preventScroll: true });
    const body = byId('os-body');
    if (k > 0 && !calm.matches && typeof body.animate === 'function') {
      body.animate([{ opacity: 0, transform: `translateY(${back ? '-0.35rem' : '0.35rem'})` }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
    }
  }
  function showScreen(k) {
    win.clearTimeout(S.holdTimer);
    S.holding = false;
    const back = k < S.screen;
    S.screen = k;
    S.error = '';
    S.canRetry = false;
    S.blocked = false;
    setView('compose', false);
    settleScreen(back);
  }

  const H = { on: true, depth: 0 };
  try { win.history.scrollRestoration = 'manual'; } catch { }
  function go(k) {
    if (H.on) {
      try {
        for (let next = S.screen + 1; next <= k; next += 1) {
          H.depth += 1;
          win.history.pushState({ osScreen: next, osDepth: H.depth }, '');
        }
      } catch { H.on = false; }
    }
    showScreen(k);
  }
  function goBack() {
    if (S.holding || S.screen === 0) return;
    showScreen(S.screen - 1);
    if (H.on && H.depth > 0) {
      H.depth -= 1;
      try { win.history.back(); } catch { H.on = false; }
    }
  }
  function collapseHistory() {
    if (!H.on || H.depth === 0) return;
    const depth = H.depth;
    H.depth = 0;
    try { win.history.go(-depth); } catch { H.on = false; }
  }
  win.addEventListener('popstate', event => {
    if (S.published || S.view !== 'compose') return;
    H.depth = event.state?.osDepth ?? 0;
    const k = Math.min(event.state?.osScreen ?? 0, firstOpen(ED, S.answers, S.ending));
    if (k !== S.screen) showScreen(k);
  });

  function armBounce(el, extraMs) {
    const box = el.getBoundingClientRect();
    S.bounce = { until: win.performance.now() + BOUNCE_MS + extraMs, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  }
  function isBounce(event) {
    const b = S.bounce;
    if (!b || !event.detail || win.performance.now() > b.until) return false;
    return event.clientX >= b.left && event.clientX <= b.right && event.clientY >= b.top && event.clientY <= b.bottom;
  }
  function pick(i, button) {
    const word = optionsFor(ED, S.answers, i).find(option => option.id === button.dataset.word);
    if (!word) return;
    S.answers = applyPick(ED, S.answers, i, word);
    choicesEl.querySelectorAll('.os-choice').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    armBounce(button, HOLD_MS);
    S.holding = true;
    S.holdTimer = win.setTimeout(() => {
      S.holding = false;
      go(firstOpen(ED, S.answers, S.ending));
    }, HOLD_MS);
  }
  function begin(event) {
    armBounce(event.currentTarget, 0);
    gate?.start();
    go(1);
  }
  choicesEl.addEventListener('click', event => {
    const b = event.target.closest('.os-choice');
    if (!b || S.holding || isBounce(event)) return;
    pick(S.screen - 1, b);
  });
  byId('os-back').addEventListener('click', goBack);
  byId('os-begin').addEventListener('click', begin);

  ta.addEventListener('input', () => {
    S.ending = ta.value;
    S.error = '';
    endErrEl.textContent = '';
    renderCounter();
    autosize();
    markInvalid();
  });
  endWrap.addEventListener('click', event => { if (event.target === endWrap) ta.focus(); });
  root.addEventListener('touchstart', () => {}, { passive: true });
  win.addEventListener('resize', () => { if (S.view === 'compose' && S.screen === ENDING && !endStep.hidden) { boxFloor(); autosize(); } });
  ta.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    byId('os-next').focus();
  });
  byId('os-next').addEventListener('click', event => {
    S.error = problemText(endingProblem(ED, S.ending));
    endErrEl.textContent = S.error;
    markInvalid();
    if (S.error) {
      if (finePointer.matches) ta.focus();
      return;
    }
    armBounce(event.currentTarget, 0);
    go(READBACK);
  });
  publishBtn.addEventListener('click', event => {
    if (!isBounce(event)) sendSentence();
  });
  function closedNow() {
    const at = S.closesAt ? Date.parse(S.closesAt) : NaN;
    return S.phase === 'closed' || (Number.isFinite(at) && Date.now() >= at);
  }
  function takeToken() {
    if (!gate) return Promise.resolve({ token: null });
    return new Promise(resolve => {
      let timer = null;
      const arm = () => {
        if (timer === null) timer = win.setTimeout(() => resolve({ timedOut: true }), CHALLENGE_WAIT_MS);
      };
      if (gate.interactive) {
        showChallenge();
        arm();
      }
      gate.onInteractive(() => { showChallenge(); arm(); });
      Promise.resolve().then(() => gate.take()).then(token => {
        if (timer !== null) win.clearTimeout(timer);
        resolve({ token });
      }, () => resolve({ token: null }));
    });
  }

  const termsReady = termsHash(byId('os-terms')?.textContent || '', win.crypto).then(value => { S.terms = value; }, () => { S.terms = null; });

  async function sendSentence() {
    if (S.sending || S.published) return;
    S.sending = true;
    S.error = '';
    S.canRetry = false;
    S.blocked = false;
    renderCommit();
    publishBtn.setAttribute('aria-busy', 'true');
    publishBtn.textContent = COPY.publishing;
    await termsReady;
    const value = submission(ED, S.answers, S.ending, S.terms);
    const payload = canonicalPayload(value);
    if (!S.pending || S.pending.payload !== payload) S.pending = { payload, key: makeKey(win.crypto) };
    if (closedNow()) {
      S.sending = false;
      applyPhase('closed');
      return;
    }
    const attempt = S.attempt + 1;
    S.attempt = attempt;
    const taken = await takeToken();
    if (attempt !== S.attempt) return;
    if (taken.timedOut) {
      S.sending = false;
      try { gate?.reset(); } catch { gate = null; }
      S.error = COPY.failed;
      S.canRetry = true;
      renderCommit();
      return;
    }
    const token = taken.token;
    let response = null;
    try {
      response = await adapter.publish(value, S.pending.key, token ? { turnstileToken: token } : undefined);
    } catch {
      response = null;
    }
    try { gate?.reset(); } catch { gate = null; }
    S.sending = false;
    const outcome = publishOutcome(response);
    if (outcome.kind === 'success') {
      S.pending = null;
      S.published = true;
      S.letter = outcome.letter;
      own.add(outcome.letter.id);
      W.loaded = false;
      W.counts = null;
      collapseHistory();
      setView('result', true);
      return;
    }
    if (outcome.kind === 'retry') {
      S.error = COPY.failed;
      S.canRetry = true;
    } else {
      S.error = outcome.kind === 'closed' ? COPY.closed : problemText(outcome.kind);
      S.blocked = true;
      if (outcome.kind === 'closed') S.pending = null;
    }
    renderCommit();
  }

  function ownSheetRow() {
    const row = rowFromLetter(S.letter) || ownRow(ED, S.answers, S.ending, S.letter);
    return { ...row, own: true };
  }
  function renderSimilar() {
    const section = byId('os-path');
    const result = S.counts ? similarOf(ED, S.counts, S.answers, S.countsOwn) : null;
    section.hidden = !result;
    if (!result) return;
    const head = byId('os-path-h');
    head.textContent = result.heading;
    head.dataset.n = String(result.n);
    byId('os-path-sub').textContent = result.sub;
    byId('os-path-rows').replaceChildren(...result.rows.map(item => {
      const row = make(document, 'div');
      row.setAttribute('role', 'row');
      const when = make(document, 'div', 'os-pathwhen', item.label);
      when.setAttribute('role', 'rowheader');
      const word = make(document, 'div', 'os-rowlabel', item.word);
      word.setAttribute('role', 'cell');
      const n = make(document, 'div', 'os-pathn', item.text);
      n.setAttribute('role', 'cell');
      n.dataset.count = String(item.count);
      n.dataset.total = String(item.total);
      row.append(when, word, n);
      return row;
    }));
  }
  function takeCounts(data) {
    S.counts = data;
    S.countsOwn = countsIncludeOwn(data, S.letter?.letterNumber);
    if (S.countsOwn !== true && !S.recount) {
      S.recount = win.setTimeout(async () => {
        const again = await adapter.counts();
        if (!again?.ok || !again.data) return;
        W.counts = again.data;
        S.counts = again.data;
        S.countsOwn = countsIncludeOwn(again.data, S.letter?.letterNumber);
        if (S.view === 'result') renderSimilar();
        renderWall();
      }, EDGE_WINDOW_MS + 1000);
    }
  }
  function renderResult() {
    const row = ownSheetRow();
    byId('os-own').replaceChildren(sheetFor(row, 1, false));
    printer.bind(byId('os-print'), row);
    renderSimilar();
  }
  byId('os-others').addEventListener('click', () => {
    byId('os-wall').scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'start' });
  });
  byId('os-save-image').addEventListener('click', event => dialog.open(ownSheetRow(), event.currentTarget));
  byId('os-send').addEventListener('click', event => dialog.open(ownSheetRow(), event.currentTarget));
  byId('os-print').addEventListener('click', () => printer.print(ownSheetRow()));

  function hiddenOnWall(row) {
    return S.view === 'result' && S.letter && row.id === S.letter.id;
  }
  function wallRows() {
    return W.rows.filter(row => !hiddenOnWall(row)).map(row => ({ ...row, own: own.has(row.id) }));
  }
  function matching() {
    const rows = wallRows();
    return W.now ? rows.filter(row => filterWord(row, FILTER_SLOT) === W.now) : rows;
  }
  function filteredTotal() {
    if (!W.now) return W.total;
    const value = W.counts?.slots?.[FILTER_SLOT?.id]?.[W.now];
    if (Number.isSafeInteger(value)) return value;
    return W.counts ? 0 : null;
  }
  async function fetchPage(limit) {
    const result = await adapter.list({ cursor: W.cursor || undefined, limit });
    if (!result?.ok || !Array.isArray(result.data?.items)) return false;
    const known = new Set(W.rows.map(row => row.id));
    for (const item of result.data.items) {
      const row = rowFromLetter(item);
      if (row && !known.has(row.id)) W.rows.push(row);
    }
    W.cursor = typeof result.data.nextCursor === 'string' ? result.data.nextCursor : null;
    if (Number.isSafeInteger(result.data.publishedCount)) W.total = result.data.publishedCount;
    return true;
  }
  async function ensureRows(target) {
    let fetches = 0;
    while (matching().length < target && W.cursor && fetches < 20) {
      fetches += 1;
      if (!(await fetchPage(W.now ? MAX_PAGE : PAGE_SIZE))) return false;
    }
    return true;
  }
  function loadWall() {
    if (W.loading) return W.loading;
    W.loading = (async () => {
      W.failed = false;
      W.rows = [];
      W.cursor = null;
      const [listed, counted] = await Promise.all([
        fetchPage(PAGE_SIZE),
        W.counts ? Promise.resolve(null) : adapter.counts(),
      ]);
      if (counted?.ok && counted.data) {
        W.counts = counted.data;
        if (S.published) takeCounts(counted.data);
      }
      W.failed = !listed;
      W.loaded = listed;
      if (listed && W.now) await ensureRows(W.shown);
      W.loading = null;
      if (S.view === 'result') renderSimilar();
      renderWall();
    })();
    return W.loading;
  }
  function buildFilter() {
    const host = byId('os-filter');
    host.querySelectorAll('button').forEach(b => b.remove());
    host.hidden = !FILTER_SLOT;
    if (!FILTER_SLOT) return;
    [null, ...wordsOfSlot(ED, FILTER_SLOT)].forEach(word => {
      const id = word ? word.id : '';
      const b = make(document, 'button', 'os-seg', word ? word.label : COPY.wallFilterAny);
      b.type = 'button';
      b.id = `os-now-${id || 'any'}`;
      b.dataset.now = id;
      b.setAttribute('aria-pressed', String(id === W.now));
      b.addEventListener('click', async () => {
        W.now = id;
        W.shown = PAGE_SIZE;
        host.querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other.dataset.now === W.now)));
        renderWall();
        if (!W.failed && W.loaded) {
          await ensureRows(W.shown);
          renderWall();
        }
      });
      host.append(b);
    });
  }
  function renderWall() {
    const unavailable = byId('os-unavailable');
    const list = byId('os-list');
    const failed = W.failed || S.phase === 'paused' || S.phase === 'unknown' || BROKEN;
    byId('os-retry').hidden = BROKEN;
    unavailable.hidden = !failed;
    byId('os-wall-panel').hidden = failed;
    if (failed || !W.loaded) {
      list.replaceChildren();
      byId('os-empty').hidden = true;
      byId('os-none').hidden = true;
      byId('os-more-p').hidden = true;
      byId('os-end').hidden = true;
      byId('os-tally').replaceChildren();
      return;
    }
    const view = matching();
    const shown = view.slice(0, W.shown);
    list.replaceChildren(...shown.map(row => sheetFor(row, (row.n ?? 0) % 4, true)));
    const all = Number.isSafeInteger(W.total) ? W.total : wallRows().length;
    const total = filteredTotal();
    const count = Number.isSafeInteger(total) ? total : view.length;
    const [before, after = ''] = String(COPY.wallTally).split('{shown}');
    byId('os-tally').replaceChildren(fill(before, { total: formatCount(all) }), make(document, 'strong', '', formatCount(count)), fill(after, { total: formatCount(all) }));
    const more = view.length > shown.length || (Boolean(W.cursor) && (total === null || shown.length < total));
    const nothing = view.length === 0 && !more;
    byId('os-none').hidden = !(nothing && !W.now);
    byId('os-empty').hidden = !(nothing && W.now);
    byId('os-more-p').hidden = !more;
    byId('os-end').hidden = more || shown.length === 0;
  }
  byId('os-more').addEventListener('click', async () => {
    const before = byId('os-list').children.length;
    W.shown += PAGE_SIZE;
    const button = byId('os-more');
    button.setAttribute('aria-busy', 'true');
    const ok = await ensureRows(W.shown);
    button.removeAttribute('aria-busy');
    if (!ok) W.failed = true;
    renderWall();
    const first = byId('os-list').children[before];
    if (first) first.focus({ preventScroll: true });
  });
  byId('os-retry').addEventListener('click', async () => {
    if (BROKEN) return;
    if (S.phase === 'paused' || S.phase === 'unknown') {
      const result = await adapter.pulseCounts();
      const phase = pulsePhase(result);
      if (phase && phase !== S.phase) {
        W.loaded = false;
        W.failed = false;
        applyPhase(phase, result?.data?.closesAt || null);
      }
      return;
    }
    loadWall();
  });

  function setView(view, focusTop) {
    S.view = view;
    const writable = S.phase === 'open' && !BROKEN;
    byId('v-compose').hidden = view !== 'compose';
    byId('v-result').hidden = view !== 'result';
    byId('v-closed').hidden = view !== 'closed';
    byId('v-wallhead').hidden = view !== 'wall' || S.published || !writable;
    byId('os-wall').hidden = view === 'compose';
    h1.textContent = view === 'result' ? COPY.result : ED.title;
    root.dataset.screen = view === 'compose' && S.screen > 0 ? 'flow' : 'start';
    if (view === 'compose') renderCompose();
    if (view === 'result') renderResult();
    if (view !== 'compose') {
      if (!W.loaded && !W.loading) loadWall();
      renderWall();
    }
    if (focusTop) {
      win.scrollTo(0, Math.max(0, root.getBoundingClientRect().top + win.scrollY - 8));
      h1.focus({ preventScroll: true });
    }
  }
  byId('os-read').addEventListener('click', () => setView('wall', true));
  byId('os-write').addEventListener('click', event => {
    if (S.phase !== 'open' || BROKEN) return;
    begin(event);
  });

  let closeWatch = null;
  function applyPhase(phase, closesAt) {
    const before = S.phase;
    S.phase = BROKEN && phase !== 'closed' ? 'unknown' : phase;
    html.dataset.osState = S.phase;
    closeWatch?.stop();
    closeWatch = null;
    if (closesAt) S.closesAt = closesAt;
    if (S.published) return;
    if (S.phase === 'closed') {
      if (S.view === 'compose' && S.screen > 0) {
        win.clearTimeout(S.holdTimer);
        S.holding = false;
        S.attempt += 1;
        S.sending = false;
        collapseHistory();
        S.screen = 0;
      }
      setView('closed', true);
      return;
    }
    if (S.phase === 'paused' || S.phase === 'unknown') {
      setView('wall', false);
      return;
    }
    if (S.view === 'closed' || before === 'paused' || before === 'unknown') setView('compose', false);
    else setView(S.view, false);
    if (closesAt) {
      closeWatch = scheduleClose(closesAt, () => applyPhase('closed'),
        { setTimeout: (fn, ms) => win.setTimeout(fn, ms), clearTimeout: id => win.clearTimeout(id) });
    }
  }

  buildFilter();
  setView('compose', false);
  if (BROKEN) applyPhase('unknown');
  const ready = adapter.pulseCounts().then(result => {
    const phase = pulsePhase(result);
    applyPhase(phase || 'unknown', result?.data?.closesAt || null);
    if (win.location.hash === '#os-wall') {
      if (S.phase === 'open') setView('wall', false);
      byId('os-wall').scrollIntoView({ block: 'start' });
    }
  });
  try { startSky(win); } catch { }
  return { ready };
}

mountLive();
