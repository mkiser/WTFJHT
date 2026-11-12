import { bootPage } from './boot.js';
import { closeTokens, dayHeadingParts } from './core.js';
import { block, cloneTemplate, fillCopy, formatCount, hideBlock, showBlock, showOnly, slot, stripHooks } from './dom.js';
import { dotRun } from './dot-run.js';
import { createLiveModel } from './live-model.js';
import { letterHref } from './paths.js';
import { bindLetterShareControl, createShareActions } from './share.js';
import {
  createPrintControls, idleTask, loadLetterhead, printButtonOf, renderNumberLine, renderSheet, renderTombstone, shareButtonOf,
} from './sheet.js';

const ROW_FLOOR_MS = 4_000;
const IDLE_MS = 150;
const CLOSED_POLL_MS = 60_000;
const LOADING_DELAY_MS = 1_000;
const SPEECH_GAP_MS = 2_000;
const MAX_AFTER_BATCHES = 25;
const MODERATION_PAGES = 20;
const MAX_TIMER_MS = 2_147_483_647;
const SEPARATOR = ' · ';
const ITEM_PARTS = '.d40-item .d40-num, .d40-item .d40-sal, .d40-item .d40-body, .d40-item .d40-stamp, .d40-item .d40-tomb';
const SCROLL_EVENTS = ['scroll', 'wheel', 'touchmove', 'touchstart', 'touchend', 'touchcancel'];

function prose(document, value) {
  return String(value).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(part => {
    if (!/^\*\*[^*]+\*\*$/.test(part)) return document.createTextNode(part);
    const strong = document.createElement('strong');
    strong.textContent = part.slice(2, -2);
    return strong;
  });
}

const offline = response => response?.status === 503 && response?.error === 'OFFLINE';

export function mountLetters(root, ctx, options = {}) {
  const document = root.ownerDocument;
  const win = ctx.window || document.defaultView;
  const { adapter, draftStore, msg } = ctx;
  const byId = id => document.getElementById(id);
  const clock = () => Date.parse(ctx.now());
  const scroller = ctx.scroller || {
    target: win,
    height: () => win.innerHeight || document.documentElement.clientHeight || 0,
    rect: node => node.getBoundingClientRect(),
    by: dy => win.scrollBy(0, dy),
  };
  const { pageSize } = ctx.config.limits;
  const pollIntervalMs = ctx.config.limits.pollIntervalMs > 0 ? ctx.config.limits.pollIntervalMs : 10_000;

  const h1 = byId('d40-h1');
  const lede = slot(root, 'lede');
  const headrow = byId('d40-headrow');
  const write = byId('d40-ctarow').firstElementChild;
  const live = byId('d40-live');
  const liveText = slot(root, 'live-text');
  const heldButton = byId('d40-showheld');
  const heldText = slot(root, 'held-count');
  const newer = byId('d40-newer');
  const days = byId('d40-days');
  const listEnd = byId('d40-listend');
  const moreError = slot(root, 'more-error');
  const more = byId('d40-more');
  const endLine = byId('d40-endline');
  const closing = byId('d40-closing');
  const retry = block(root, 'load-failure').querySelector('button');
  const ruleDays = (byId('d40-tpl-rule')?.dataset.days || '').split(' ');
  const plainLede = [...lede.childNodes].map(node => node.cloneNode(true));
  const moreLabel = more.textContent;
  const endText = endLine.textContent;

  let destroyed = false;
  let closed = Boolean(ctx.closed);
  let state = 'loading';
  let retrying = false;
  let built = false;
  let poller = null;
  let ledeKey = '';
  let serverOffset = 0;
  let lastSpoke = -Infinity;
  const serverNow = () => clock() + serverOffset;
  const noteServerNow = value => {
    const at = Date.parse(value);
    if (Number.isFinite(at)) serverOffset = at - clock();
  };
  const model = createLiveModel({ isOwn: id => Boolean(ctx.isOwn(id)), closesAt: ctx.closesAt ?? null, closed });

  const timers = new Set();
  const later = (fn, ms) => {
    const id = ctx.setTimeout(() => { timers.delete(id); if (!destroyed) fn(); }, ms);
    timers.add(id);
    return id;
  };
  const printing = createPrintControls({
    document, window: win, load: options.loadPrint || loadLetterhead, idle: options.idle || idleTask(win, later),
  });
  const stop = id => {
    if (id !== null && id !== undefined) {
      ctx.clearTimeout(id);
      timers.delete(id);
    }
    return null;
  };
  const say = text => {
    if (!text || destroyed) return;
    ctx.announce(text);
    lastSpoke = clock();
  };
  const safe = async task => {
    try { return await task(); } catch { return { ok: false, status: 0, error: 'NETWORK' }; }
  };

  const onScreen = node => {
    const r = scroller.rect(node);
    return r.top + r.height > 1 && r.top < scroller.height();
  };
  function pickAnchor() {
    const focused = document.activeElement;
    if (focused && days.contains(focused) && focused.closest('.d40-item') && onScreen(focused)) return focused;
    return [...days.querySelectorAll(ITEM_PARTS)].find(onScreen) ||
      [...days.querySelectorAll('.d40-dayh, .d40-phase'), ...listEnd.children].find(onScreen) || null;
  }
  function anchored(fn) {
    const anchor = pickAnchor();
    const before = anchor ? scroller.rect(anchor).top : 0;
    fn();
    if (!anchor?.isConnected) return;
    const delta = scroller.rect(anchor).top - before;
    if (Math.abs(delta) >= 0.5) scroller.by(delta);
  }

  let lastScrollAt = -Infinity;
  let touching = false;
  let flushTimer = null;
  const onScroll = event => {
    if (event?.type === 'touchstart') touching = true;
    else if (event?.type === 'touchend' || event?.type === 'touchcancel') touching = false;
    lastScrollAt = clock();
    if (model.queued) {
      flushTimer = stop(flushTimer);
      flushTimer = later(requestFlush, IDLE_MS + 10);
    }
  };
  for (const type of SCROLL_EVENTS) scroller.target?.addEventListener?.(type, onScroll, { passive: true });

  const items = () => [...days.querySelectorAll('.d40-item')];
  const itemFor = id => items().find(item => item.dataset.id === id) || null;
  const sections = () => [...days.querySelectorAll('.d40-day')];

  function card(letter) {
    const item = document.createElement('li');
    item.className = 'd40-item';
    item.dataset.n = String(letter.letterNumber);
    item.dataset.day = letter.dayKey;
    item.dataset.id = letter.id;
    const linkId = `ln-${letter.letterNumber}`;
    item.appendChild(renderNumberLine(document, letter, { tag: 'h3', id: linkId }));
    item.dataset.tilt = String(letter.letterNumber % 4);
    const sheet = renderSheet(document, letter, {
      own: Boolean(ctx.isOwn(letter.id)), labelledbyId: linkId, href: letterHref(letter.id),
    });
    const actions = createShareActions({ letter, messages: ctx.messages, navigator: win?.navigator, document,
      surface: 'list', fallbackRoot: item, announce: say });
    bindLetterShareControl(shareButtonOf(sheet), actions, ctx.messages);
    printing.bind(printButtonOf(sheet), letter);
    item.appendChild(sheet);
    return item;
  }

  function ensureSection(dayKey) {
    const all = sections();
    let section = all.find(other => other.dataset.day === dayKey);
    if (section) return section.querySelector('.d40-cards');
    section = cloneTemplate(document, 'd40-tpl-day');
    section.dataset.day = dayKey;
    section.setAttribute('aria-labelledby', `dh-${dayKey}`);
    section.querySelector('.d40-dayh').id = `dh-${dayKey}`;
    slot(section, 'date').textContent = msg('collection.dayHeading', { date: dayHeadingParts(dayKey).date });
    stripHooks(section);
    const older = all.find(other => other.dataset.day < dayKey);
    const rule = byId('d40-phase');
    days.insertBefore(section, older && rule?.nextElementSibling === older ? rule : older || null);
    return section.querySelector('.d40-cards');
  }

  function ensureRule() {
    const all = sections();
    const a = all.find(section => section.dataset.day === ruleDays[0]);
    const b = all.find(section => section.dataset.day === ruleDays[1]);
    let rule = byId('d40-phase');
    if (a && b) {
      rule ||= cloneTemplate(document, 'd40-tpl-rule');
      const lower = all.indexOf(a) > all.indexOf(b) ? a : b;
      if (rule.nextElementSibling !== lower) days.insertBefore(rule, lower);
    } else rule?.remove();
    all.forEach((section, index) => section.classList.toggle('is-first', index === 0));
  }

  function place(letter) {
    const existing = itemFor(letter.id);
    if (existing && !existing.classList.contains('is-gone')) return existing;
    const node = card(letter);
    if (existing) {
      existing.before(node);
      existing.remove();
      return node;
    }
    const list = ensureSection(letter.dayKey);
    list.insertBefore(node, [...list.children].find(other => Number(other.dataset.n) < letter.letterNumber) || null);
    return node;
  }

  function renderInitial(letters) {
    for (const node of days.querySelectorAll('.d40-day, .d40-phase')) node.remove();
    for (const letter of letters) ensureSection(letter.dayKey).appendChild(card(letter));
    ensureRule();
  }

  function syncLede(counts) {
    const count = counts.publishedCount;
    let line = '';
    if (Number.isFinite(count) && count > 0) {
      const tokens = { publishedCount: formatCount(count) };
      if (closed) {
        const at = model.closesAt === null || model.closesAt === undefined ? NaN : Date.parse(model.closesAt);
        line = Number.isFinite(at) && serverNow() >= at && msg('collection.closedSummary')
          ? msg('collection.closedSummary', { ...tokens, closeDate: closeTokens(model.closesAt).closeDate })
          : msg('collection.closedSummaryUndated', tokens);
      } else {
        line = (count === 1 && msg('collection.countSummaryOne')) || msg('collection.countSummary', tokens);
      }
    }
    if (line === ledeKey) return;
    ledeKey = line;
    lede.replaceChildren(...(line ? prose(document, line) : plainLede.map(node => node.cloneNode(true))));
    lede.hidden = !lede.textContent.trim();
  }

  function earliestDay(counts) {
    const keys = Object.keys(counts.dayCounts).filter(key => counts.dayCounts[key] > 0).sort();
    return keys[0] || sections().map(section => section.dataset.day).sort()[0] || null;
  }

  function syncEnd(counts = model.counts()) {
    if (!built) return;
    const hasMore = Boolean(model.nextCursor);
    byId('d40-more-p').hidden = !hasMore;
    const first = earliestDay(counts);
    const showEnd = !hasMore && Boolean(first) && Boolean(days.querySelector('.d40-item'));
    if (showEnd) {
      const text = fillCopy(endText, { firstDate: dayHeadingParts(first).date });
      if (endLine.textContent !== text) endLine.textContent = text;
    }
    endLine.hidden = !showEnd || !endText;
    closing.hidden = false;
    closing.classList.toggle('is-center', hasMore);
    newer.parentNode.hidden = !model.newerAbove;
  }

  function syncCounts() {
    const counts = model.counts();
    syncLede(counts);
    if (counts.publishedCount > 0 && state === 'ok') {
      hideBlock(root, 'empty');
      live.hidden = false;
      built = true;
    }
    syncEnd(counts);
    if (!closed && !model.hold) model.setHold(true, clock());
  }

  const row = { key: '', at: -Infinity, timer: null };
  function paintRow(force = false) {
    if (closed) return;
    const current = model.row(clock());
    const text = current.kind === 'stalled' ? msg('collection.liveStalled')
      : current.kind === 'paused' ? msg('states.livePaused') : '';
    const held = current.kind === 'held' ? current.heldCount : 0;
    const key = `${text}|${held}`;
    if (key === row.key) return;
    const since = clock() - row.at;
    if (!force && !current.now && row.key && since < ROW_FLOOR_MS) {
      if (row.timer === null) {
        row.timer = later(() => { row.timer = null; anchored(() => paintRow()); }, ROW_FLOOR_MS - since + 30);
      }
      return;
    }
    row.timer = stop(row.timer);
    const parts = text.split(SEPARATOR).filter(Boolean);
    liveText.replaceChildren(...(parts.length ? [dotRun(document, parts).querySelector('.d40-run')] : []));
    liveText.hidden = !parts.length;
    if (held) {
      heldText.textContent = (held === 1 && msg('collection.heldCountOne')) ||
        msg('collection.heldCount', { count: formatCount(held) });
      heldButton.hidden = false;
    } else if (!heldButton.hidden) {
      if (document.activeElement === heldButton) h1.focus({ preventScroll: true });
      heldButton.hidden = true;
    }
    row.key = key;
    row.at = clock();
  }

  function insertLetters(letters) {
    const nodes = [];
    if (!letters.length) return nodes;
    anchored(() => {
      hideBlock(root, 'empty');
      for (const letter of [...letters].sort((a, b) => a.letterNumber - b.letterNumber)) nodes.push(place(letter));
      ensureRule();
      syncCounts();
      paintRow();
    });
    return nodes;
  }

  function tombstone(id) {
    const item = itemFor(id);
    if (!item || item.classList.contains('is-gone')) return;
    const sheet = item.querySelector('.d40-sheet');
    const box = sheet ? scroller.rect(sheet) : null;
    const inView = Boolean(box) && box.top + box.height > 0 && box.top < scroller.height();
    const hadFocus = item.contains(document.activeElement);
    const tomb = renderTombstone(document, inView ? box.height : 0);
    anchored(() => {
      item.classList.add('is-gone');
      if (sheet) {
        sheet.before(tomb);
        sheet.remove();
      } else item.appendChild(tomb);
    });
    if (hadFocus) tomb.focus({ preventScroll: true });
    if (ctx.isOwn(id)) draftStore?.forgetOwn?.(id);
  }

  function repaint(letter) {
    const item = itemFor(letter.id);
    if (!item || item.classList.contains('is-gone')) return;
    const focused = item.contains(document.activeElement) ? document.activeElement : null;
    const selector = ['[data-share]', '.d40-permalink'].find(name => focused?.matches?.(name));
    const next = card(letter);
    anchored(() => {
      item.before(next);
      item.remove();
    });
    if (focused) (selector ? next.querySelector(selector) : next)?.focus({ preventScroll: true });
  }

  function requestFlush() {
    flushTimer = stop(flushTimer);
    if (destroyed || !model.queued) return;
    const idleFor = clock() - lastScrollAt;
    if (touching || idleFor < IDLE_MS) {
      flushTimer = later(requestFlush, Math.max(10, IDLE_MS - idleFor + 10));
      return;
    }
    insertLetters(model.flushIfIdle(true, clock()).insert);
    syncEnd();
  }

  async function process(result, depth = 0) {
    if (destroyed || !result || result.stale) return;
    if (result.closeSwap) closeSwap();
    if (result.openSwap) openSwap();
    for (const id of result.tombstone) tombstone(id);
    if (result.fetchModeration && depth < MODERATION_PAGES) {
      const response = await safe(() => adapter.moderation(result.fetchModeration.after));
      if (destroyed) return;
      if (response.ok && response.data) await process(model.applyModeration(response.data), depth + 1);
    }
    for (const id of result.restore) {
      const response = await safe(() => adapter.get(id));
      if (destroyed) return;
      if (response.ok && response.data?.letter) insertLetters(model.admitRestored(response.data.letter).insert);
    }
    for (const id of result.edit) {
      const response = await safe(() => adapter.get(id));
      if (destroyed) return;
      const letter = response.ok ? response.data?.letter : null;
      if (letter?.id === id && model.admitEdited(letter)) repaint(letter);
    }
    if (result.fetchAfter && depth < MAX_AFTER_BATCHES) {
      const response = await safe(() => adapter.listAfter(result.fetchAfter.cursor));
      if (destroyed) return;
      if (response.ok && response.data) await process(model.applyBatch(response.data, clock()), depth + 1);
    }
    if (result.insert.length) insertLetters(result.insert);
    if (result.counts || result.rowNow) {
      anchored(() => {
        syncCounts();
        paintRow(result.rowNow);
      });
    }
    if (result.flush || model.queued) requestFlush();
  }

  async function pollOnce() {
    const response = await safe(() => adapter.pulse());
    if (destroyed) return false;
    if (!response.ok || !response.data) {
      if (model.pollFailed(clock()).rowNow) anchored(() => paintRow(true));
      return false;
    }
    noteServerNow(response.data.serverNow);
    await process(model.applyPulse(response.data, clock()));
    syncCutoff();
    return true;
  }

  let cutoffTimer = null;
  let cutoffFor;
  function syncCutoff() {
    if (closed) {
      cutoffTimer = stop(cutoffTimer);
      return;
    }
    const closesAt = model.closesAt;
    if (closesAt === cutoffFor && cutoffTimer !== null) return;
    cutoffTimer = stop(cutoffTimer);
    cutoffFor = closesAt;
    const at = closesAt === null || closesAt === undefined ? NaN : Date.parse(closesAt);
    if (!Number.isFinite(at)) return;
    cutoffTimer = later(() => {
      cutoffTimer = null;
      const result = model.cutoff(serverNow());
      if (result.closeSwap) void process(result);
      else syncCutoff();
    }, Math.min(MAX_TIMER_MS, Math.max(0, at - serverNow())));
  }

  function closeSwap() {
    if (closed) return;
    const focused = document.activeElement;
    const hadFocus = [headrow, closing].some(node => node.contains(focused));
    anchored(() => {
      closed = true;
      ctx.setPhase('closed');
      syncEnd();
      syncLede(model.counts());
    });
    if (hadFocus) h1.focus({ preventScroll: true });
    poller?.setInterval?.(CLOSED_POLL_MS);
    syncCutoff();
    const summary = () => {
      const wait = SPEECH_GAP_MS - (clock() - lastSpoke);
      if (wait > 0) later(summary, wait + 10);
      else say(msg('states.closed'));
    };
    later(summary, Math.max(0, SPEECH_GAP_MS - (clock() - lastSpoke)));
  }

  function openSwap() {
    if (!closed) return;
    anchored(() => {
      closed = false;
      ctx.setPhase('open');
      row.key = '';
      syncCounts();
      paintRow(true);
    });
    poller?.setInterval?.(pollIntervalMs);
    syncCutoff();
  }

  const offPhase = ctx.onPhase?.(next => {
    if (destroyed || next !== 'closed' || closed) return;
    const result = model.cutoff(serverNow());
    if (result.closeSwap) void process(result);
    else ctx.setPhase('open');
  });

  function releaseTombstones() {
    const held = [...days.querySelectorAll('.d40-tomb')].filter(tomb => tomb.style.minHeight);
    if (held.length) anchored(() => { for (const tomb of held) tomb.style.minHeight = ''; });
  }

  async function readMore() {
    if (more.getAttribute('aria-busy') === 'true' || !model.nextCursor) return;
    releaseTombstones();
    more.setAttribute('aria-busy', 'true');
    const response = await safe(() => adapter.list({ cursor: model.nextCursor, limit: pageSize }));
    if (destroyed) return;
    more.removeAttribute('aria-busy');
    if (!response.ok || !response.data) {
      const text = msg(offline(response) ? 'states.offline' : 'states.listFailure');
      moreError.textContent = text;
      moreError.hidden = false;
      more.textContent = msg('placeholders.retryCheck');
      more.focus();
      say(text);
      return;
    }
    moreError.hidden = true;
    more.textContent = moreLabel;
    const result = model.addPage(response.data);
    const nodes = result.append.map(letter => ensureSection(letter.dayKey).appendChild(card(letter)));
    ensureRule();
    syncCounts();
    const firstLink = nodes[0]?.querySelector('.d40-permalink');
    if (firstLink) firstLink.focus();
    else if (model.nextCursor) more.focus();
    else if (!endLine.hidden) endLine.focus();
    else h1.focus({ preventScroll: true });
    say(msg('placeholders.moreLoaded'));
    if (result.fetchModeration) await process({ ...result, append: [], counts: null });
  }

  async function readNewer() {
    const response = await safe(() => adapter.list({ cursor: null, limit: pageSize }));
    if (destroyed || !response.ok || !response.data) return;
    model.seed(response.data, clock());
    renderInitial((response.data.items || []).filter(letter => model.isShown(letter.id)));
    syncCounts();
    paintRow(true);
    days.querySelector('.d40-permalink')?.focus();
    say(msg('placeholders.moreLoaded'));
  }

  function showHeld() {
    const nodes = insertLetters(model.showHeld(clock()).insert);
    anchored(() => paintRow(true));
    syncEnd();
    const first = items().find(item => nodes.includes(item));
    if (!first) return;
    const land = first.parentNode.firstElementChild === first ? first.closest('.d40-day').querySelector('.d40-dayh') : first;
    const delta = scroller.rect(land).top - 16;
    if (Math.abs(delta) >= 0.5) scroller.by(delta);
    first.querySelector('.d40-permalink')?.focus({ preventScroll: true });
  }

  function showFailure(response) {
    state = 'failure';
    showOnly(root, 'failure', offline(response) ? 'offline' : 'list-failure');
    showBlock(root, 'load-failure');
    days.setAttribute('aria-busy', 'false');
    write.hidden = true;
    if (retrying) retry.focus();
  }

  async function load() {
    state = 'loading';
    write.hidden = false;
    hideBlock(root, 'load-failure');
    hideBlock(root, 'empty');
    days.setAttribute('aria-busy', 'true');
    const reveal = later(() => showBlock(root, 'loading'), LOADING_DELAY_MS);
    const page = await safe(() => adapter.list({ cursor: null, limit: pageSize }));
    stop(reveal);
    hideBlock(root, 'loading');
    if (destroyed) return;
    if (!page.ok || !page.data) {
      showFailure(page);
      return;
    }
    state = 'ok';
    days.setAttribute('aria-busy', 'false');
    noteServerNow(page.data.serverNow);
    model.seed(page.data, clock());
    if (model.closed !== closed) {
      closed = model.closed;
      ctx.setPhase(closed ? 'closed' : 'open');
    }
    const shown = (page.data.items || []).filter(letter => model.isShown(letter.id));
    if (!shown.length && !model.nextCursor) showBlock(root, 'empty');
    else {
      renderInitial(shown);
      built = true;
    }
    syncCounts();
    live.hidden = model.counts().publishedCount === 0;
    paintRow(true);
    row.at = -Infinity;
    if (retrying) h1.focus();
    retrying = false;
    if (!poller) {
      poller = ctx.poller({
        run: pollOnce, intervalMs: closed ? CLOSED_POLL_MS : pollIntervalMs, document, window: win,
        setTimeout: ctx.setTimeout, clearTimeout: ctx.clearTimeout, now: clock,
      });
      poller?.start?.();
    }
    syncCutoff();
  }

  retry.addEventListener('click', () => {
    retrying = true;
    void load();
  });
  more.addEventListener('click', () => { void readMore(); });
  newer.addEventListener('click', () => { void readNewer(); });
  heldButton.addEventListener('click', showHeld);

  return {
    ready: load().catch(() => showFailure(null)),
    model,
    poll: () => pollOnce(),
    flush: () => requestFlush(),
    destroy() {
      destroyed = true;
      printing.destroy();
      poller?.stop?.();
      offPhase?.();
      for (const id of timers) ctx.clearTimeout(id);
      timers.clear();
      for (const type of SCROLL_EVENTS) scroller.target?.removeEventListener?.(type, onScroll, { passive: true });
    },
  };
}

bootPage(mountLetters);
