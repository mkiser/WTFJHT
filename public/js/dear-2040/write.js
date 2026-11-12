import { bootPage } from './boot.js';
import { codePointLength, normalizeBody, shortDate, visibleCodePointLength } from './core.js';
import { block, fillSlot, hideBlock, showBlock, showOnly } from './dom.js';
import { scheduleClose } from './edition.js';
import { createPublishEngine } from './publish.js';
import { createTurnstileGate } from './turnstile.js';

const CONFIRM_GUARD_MS = 400;
const VIEWPORT_MARGIN_PX = 16;
const MAX_TIMER_MS = 2_147_000_000;
const LA_CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const INVALID_BLOCKS = Object.freeze({
  TOO_LONG: 'error-body-too-long',
  REQUIRED: 'error-body-required',
  TOO_SHORT: 'error-body-too-short',
});

function laWallMs(instantMs) {
  const parts = Object.fromEntries(LA_CLOCK.formatToParts(new Date(instantMs))
    .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second) +
    (((instantMs % 1000) + 1000) % 1000);
}

export function msToLaMidnight(instantMs) {
  const wall = laWallMs(instantMs);
  const day = new Date(wall);
  const target = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1);
  let guess = instantMs + (target - wall);
  for (let i = 0; i < 3; i++) {
    const miss = target - laWallMs(guess);
    if (!miss) break;
    guess += miss;
  }
  return Math.max(1, guess - instantMs);
}

export async function termsHash(text, cryptoImpl = globalThis.crypto) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized || typeof cryptoImpl?.subtle?.digest !== 'function') return null;
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return `sha256-${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function pulseState(result) {
  if (!result) return null;
  if ((result.status === 503 && result.error === 'OFFLINE') || result.data?.mode === 'offline') return 'paused';
  if (!result.ok || !result.data) return null;
  if (result.data.closed === true || result.data.mode === 'closed') return 'closed';
  if (result.data.closed === false) return 'open';
  return null;
}

export function mountWrite(root, ctx, options = {}) {
  const document = ctx.document;
  const view = ctx.window;
  const { adapter, draftStore } = ctx;
  const byId = id => document.getElementById(id);
  const card = byId('d40-card');
  const ta = byId('d40-body');
  const stamp = byId('d40-stamp');
  const locked = byId('d40-locked');
  const under = byId('d40-under');
  const status = byId('d40-status');
  const counter = byId('d40-counter');
  const saved = byId('d40-saved');
  const commit = byId('d40-commit');
  const confirmBox = byId('d40-confirm');
  const notice = confirmBox.querySelector('.d40-notice');
  const closedLine = byId('d40-closed');
  const pub = byId('d40-publish');
  const keep = byId('d40-keep');
  const copyBtn = byId('d40-copy');
  const readothers = byId('d40-readothers');
  const fallback = byId('d40-fallback');
  const msg = ctx.msg;
  const cryptoImpl = options.crypto || view.crypto || globalThis.crypto;
  const navigate = options.navigate || (path => view.location.replace(path));
  const limits = ctx.config.limits || {};
  const cap = Number(limits.bodyCodePoints) || 1000;
  const minimum = Number(limits.bodyMinCodePoints) || 20;
  const timers = new Set();
  const listeners = [];
  const gates = new Map();

  function later(fn, ms) {
    const id = ctx.setTimeout(() => { timers.delete(id); fn(); }, Math.min(Math.max(0, ms), MAX_TIMER_MS));
    timers.add(id);
    return id;
  }
  function cancel(id) {
    if (id === null || id === undefined) return;
    timers.delete(id);
    ctx.clearTimeout(id);
  }
  function listen(target, type, fn, listenOptions) {
    if (!target?.addEventListener) return;
    target.addEventListener(type, fn, listenOptions);
    listeners.push([target, type, fn, listenOptions]);
  }
  function nowMs() { return Date.parse(ctx.now()); }
  let offset = 0;
  function serverTime() { return nowMs() + offset; }
  function say(text) {
    if (!document.hidden) ctx.announce(text);
  }
  function pin(node) {
    if (!node || gates.has(node)) return;
    gates.set(node, node.getAttribute('data-d40-when'));
    node.removeAttribute('data-d40-when');
  }
  function unpin(node) {
    if (!gates.has(node)) return;
    const when = gates.get(node);
    gates.delete(node);
    if (when) node.setAttribute('data-d40-when', when);
  }

  let step = 'edit';
  let over = false;
  let storageBlocked = !!draftStore?.storageBlocked?.();
  let rateUntil = 0;
  let rateTimer = null;
  let rateBlock = '';
  let offlineHeld = false;
  let closedPending = false;
  let lostKind = null;
  let autoOnline = false;
  let autoVisible = false;
  let checking = false;
  let reopenable = false;
  let armedAt = 0;
  let activationReleased = false;
  let freshActivation = false;
  let repeatKeydown = false;
  let closesAt = ctx.closesAt;
  let closeWatch = null;
  let midnightTimer = null;
  let errTimer = null;
  let errWant = '';
  let hash = null;
  let destroyed = false;
  let engine = null;

  const editionId = ctx.config.editionId;
  const stored = draftStore?.load?.(ctx.config) || null;
  let draft = { body: stored?.editionId === editionId ? stored.body || '' : '', editionId };

  ctx.closeWatch?.stop?.();

  function text() { return String(ta.value ?? ''); }
  function hasText() { return !!text().trim(); }
  function normalizedLen() { return codePointLength(normalizeBody(text())); }
  function visibleLen() { return visibleCodePointLength(normalizeBody(text())); }
  function isClosed() { return ctx.phase === 'closed'; }
  function savedClause() { return storageBlocked ? msg('write.memoryOnly') : msg('placeholders.draftKept'); }
  function fillSaved() {
    const clause = savedClause();
    for (const node of root.querySelectorAll('[data-slot="saved"]')) node.textContent = clause;
  }

  function alertShow(name = '', force = false) {
    cancel(errTimer);
    errTimer = null;
    errWant = name;
    if (!force && name && block(root, name)?.hidden === false) return;
    for (const node of root.querySelectorAll('[data-d40-group="error"]')) node.hidden = true;
    if (!name) return;
    if (force) {
      errTimer = later(() => {
        errTimer = null;
        showBlock(root, name);
      }, 100);
    } else showBlock(root, name);
  }
  function describe() {
    ta.setAttribute('aria-describedby', [
      saved.hidden ? '' : 'd40-saved', 'd40-counter', locked.hidden ? '' : 'd40-locked',
    ].filter(Boolean).join(' '));
  }
  function setSaved(show) {
    saved.hidden = !show;
    describe();
  }
  function readOnly(on, reason) {
    ta.readOnly = on;
    locked.hidden = !(on && reason);
    describe();
  }
  function setBusy(on) {
    if (on) pub.setAttribute('aria-busy', 'true');
    else pub.removeAttribute('aria-busy');
  }
  function top(node) {
    try { return node.getBoundingClientRect().top; } catch { return 0; }
  }
  function holdStill(anchor, fn) {
    const before = top(anchor);
    const scrolled = Number(view.scrollY ?? view.pageYOffset) || 0;
    fn();
    if (scrolled <= 0) return;
    const delta = top(anchor) - before;
    if (Math.abs(delta) >= 0.5) view.scrollBy?.(0, delta);
  }
  function sizeTextarea() {
    if (view.CSS?.supports?.('field-sizing', 'content') !== false) return;
    const style = view.getComputedStyle?.(ta);
    const lineHeight = Number.parseFloat(style?.lineHeight) || 0;
    if (!lineHeight) return;
    const padding = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    ta.rows = 6;
    ta.rows = Math.max(6, Math.ceil((ta.scrollHeight - padding - 0.5) / lineHeight));
  }

  function sync() {
    sizeTextarea();
    const used = normalizedLen();
    const isOver = used > cap;
    counter.hidden = used < Math.round(cap * 0.8);
    counter.classList.toggle('is-over', isOver);
    const line = showOnly(counter, 'counter-text', isOver ? 'counter-over' : 'counter-under');
    fillSlot(line, 'used', used.toLocaleString('en-US'));
    if (isOver !== over) {
      over = isOver;
      if (isOver) alertShow(INVALID_BLOCKS.TOO_LONG);
      else {
        alertShow('');
        say(line?.textContent || '');
      }
    }
    card.classList.toggle('is-over', isOver);
    if (isOver) ta.setAttribute('aria-invalid', 'true');
    else ta.removeAttribute('aria-invalid');
    if (step === 'edit' || step === 'confirm') {
      pub.setAttribute('aria-disabled', isOver || rateUntil > nowMs() ? 'true' : 'false');
      if (isOver) pub.setAttribute('aria-describedby', 'd40-err');
      else pub.removeAttribute('aria-describedby');
    }
    if (storageBlocked && used) {
      if (step === 'edit') setSaved(true);
      copyBtn.hidden = false;
    } else if (!used) setSaved(false);
  }

  function saveDraft() {
    if (!draftStore) return false;
    const result = draftStore.save(draft);
    const persisted = result?.persisted !== false;
    if (!persisted) storageBlocked = true;
    return persisted;
  }

  function onInput() {
    if (step !== 'edit' && step !== 'confirm') return;
    if (step === 'confirm') disarm(false);
    draft = { ...draft, body: text() };
    const kept = saveDraft();
    const next = text() && kept ? msg('write.draftSaved') : '';
    if (status.textContent !== next) status.textContent = next;
    sync();
    if (visibleLen() >= minimum &&
        (errWant === INVALID_BLOCKS.REQUIRED || errWant === INVALID_BLOCKS.TOO_SHORT)) alertShow('');
  }

  function arm() {
    step = 'confirm';
    armedAt = nowMs();
    activationReleased = false;
    freshActivation = false;
    alertShow('');
    confirmBox.hidden = false;
    keep.hidden = false;
    if (!storageBlocked) setSaved(false);
    pub.textContent = msg('actions.confirmPublish');
    gate?.start();
    say(notice.textContent);
    pub.focus?.({ preventScroll: true });
    try {
      const bottom = pub.getBoundingClientRect().bottom;
      const height = view.visualViewport?.height || view.innerHeight || 0;
      if (height && bottom > height - VIEWPORT_MARGIN_PX) view.scrollBy?.(0, bottom - (height - VIEWPORT_MARGIN_PX));
    } catch { }
    sync();
  }

  function disarm(focus) {
    step = 'edit';
    activationReleased = false;
    freshActivation = false;
    say('');
    confirmBox.hidden = true;
    keep.hidden = true;
    gate?.reset();
    under.hidden = false;
    setSaved(storageBlocked && hasText());
    pub.textContent = msg('actions.publish');
    if (focus) ta.focus?.();
    sync();
  }

  function isOffline() { return view.navigator?.onLine === false; }

  function sending() {
    step = 'sending';
    readOnly(true, true);
    pub.textContent = msg('placeholders.publishing');
    setBusy(true);
    pub.setAttribute('aria-disabled', 'true');
    pub.removeAttribute('aria-describedby');
    keep.hidden = true;
    if (gate?.interactive) confirmBox.hidden = false;
    say(msg('placeholders.publishing'));
  }

  function submit() {
    if (isOffline()) {
      fillSaved();
      alertShow('error-offline-hold', true);
      offlineHeld = true;
      copyBtn.hidden = false;
      return;
    }
    sending();
    void engine.startNew();
  }

  function retry() {
    if (step === 'sending' || !engine) return;
    sending();
    gate?.start();
    void engine.retryPending();
  }

  function success() {
    step = 'done';
    setBusy(false);
    draft = { body: '', editionId };
    ta.value = '';
    ta.readOnly = true;
    pub.hidden = true;
    showBlock(root, 'published');
  }

  function lost(kind, retryAfterSeconds = 0) {
    setBusy(false);
    say('');
    step = 'lost';
    lostKind = kind;
    readOnly(true, true);
    confirmBox.hidden = true;
    keep.hidden = true;
    under.hidden = true;
    pub.hidden = false;
    pub.textContent = msg('placeholders.retryCheck');
    pub.setAttribute('aria-disabled', 'false');
    pub.removeAttribute('aria-describedby');
    copyBtn.hidden = false;
    if (kind === 'rate') {
      const seconds = Math.max(1, Number(retryAfterSeconds) || 0);
      rateUntil = nowMs() + seconds * 1000;
      pub.setAttribute('aria-disabled', 'true');
      rateBlock = seconds <= 60 ? 'error-rate-limited-one' : 'error-rate-limited';
      fillSlot(block(root, 'error-rate-limited'), 'minutes', Math.ceil(seconds / 60));
      alertShow(rateBlock, true);
      cancel(rateTimer);
      rateTimer = later(() => {
        rateTimer = null;
        rateUntil = 0;
        if (step === 'lost') pub.setAttribute('aria-disabled', 'false');
      }, seconds * 1000);
    } else {
      fillSaved();
      alertShow('error-publish-failure', true);
    }
  }

  function stopCloseWatch() {
    closeWatch?.stop();
    closeWatch = null;
  }

  function lockedRefusal(kind) {
    setBusy(false);
    step = 'locked';
    readOnly(true, false);
    confirmBox.hidden = true;
    pub.hidden = true;
    keep.hidden = true;
    copyBtn.hidden = false;
    under.hidden = true;
    stamp.hidden = true;
    if (kind === 'closed') {
      stopCloseWatch();
      pin(card);
      closedLine.hidden = true;
      ctx.setPhase('closed');
    }
    alertShow(kind === 'gone' ? 'error-publish-gone' : 'error-closed-during-publish', true);
    copyBtn.focus?.();
  }

  function closedRecovery(kind) {
    setBusy(false);
    step = 'closed';
    closedPending = false;
    readOnly(true, false);
    confirmBox.hidden = true;
    keep.hidden = true;
    pub.hidden = true;
    unpin(pub);
    under.hidden = true;
    copyBtn.hidden = false;
    alertShow(kind === 'gone' ? 'error-publish-gone' : 'error-closed-during-publish', true);
    copyBtn.focus?.();
  }

  function stopInviting() {
    if (!storageBlocked) setSaved(false);
  }

  function paused() {
    step = 'paused';
    stopInviting();
    stopCloseWatch();
    setBusy(false);
    confirmBox.hidden = true;
    keep.hidden = true;
    gate?.reset();
    alertShow('');
    const has = hasText();
    if (has) {
      pin(card);
      readOnly(true, false);
      copyBtn.hidden = false;
      fillSaved();
    }
    showBlock(root, 'paused-saved', has);
    pub.hidden = false;
    pub.textContent = msg('placeholders.retryCheck');
    pub.setAttribute('aria-disabled', 'false');
    pub.removeAttribute('aria-describedby');
    ctx.setPhase('paused');
  }

  function closedArrival() {
    step = 'closed';
    stopInviting();
    stopCloseWatch();
    confirmBox.hidden = true;
    keep.hidden = true;
    gate?.reset();
    hideBlock(root, 'paused-saved');
    if (hasText()) {
      pin(card);
      readOnly(true, false);
      copyBtn.hidden = false;
    }
    ctx.setPhase('closed');
  }

  function resume() {
    reopenable = false;
    unpin(card);
    unpin(pub);
    closedLine.hidden = false;
    hideBlock(root, 'paused-saved');
    step = 'edit';
    readOnly(false);
    pub.hidden = false;
    pub.textContent = msg('actions.publish');
    pub.setAttribute('aria-disabled', 'false');
    copyBtn.hidden = !(storageBlocked && hasText());
    under.hidden = false;
    stamp.hidden = false;
    alertShow('');
    ctx.setPhase('open');
    const pending = engine?.pending;
    if (pending) {
      restorePending(pending);
      lost('lost');
    }
    sync();
    scheduleCutoff();
  }

  function cutoff({ arrival = false } = {}) {
    if (step === 'done' || isClosed()) return;
    stopCloseWatch();
    if (step === 'paused' || (arrival && step === 'edit' && !hasText())) {
      closedArrival();
      return;
    }
    const active = document.activeElement;
    const hadFocus = !!active && active !== ta && (commit.contains(active) || card.contains(active));
    if (step === 'sending' || step === 'lost') {
      closedPending = true;
      holdStill(card, () => {
        pin(card);
        pin(pub);
        ctx.setPhase('closed');
      });
      say(closedLine.textContent);
      return;
    }
    step = 'closed';
    holdStill(card, () => {
      pin(card);
      readOnly(true, false);
      confirmBox.hidden = true;
      keep.hidden = true;
      gate?.reset();
      ctx.setPhase('closed');
    });
    say(closedLine.textContent);
    const target = hasText() ? copyBtn : readothers;
    target.hidden = false;
    if (hadFocus) target.focus?.();
  }

  function scheduleCutoff() {
    stopCloseWatch();
    if (isClosed() || ctx.phase === 'paused' || !closesAt) return;
    closeWatch = scheduleClose(closesAt, () => {
      closeWatch = null;
      cutoff();
    }, { now: serverTime, setTimeout: later, clearTimeout: cancel });
  }

  function checkCutoff() {
    if (!isClosed() && closesAt && serverTime() >= Date.parse(closesAt)) cutoff();
    return isClosed();
  }

  function applyClock(data) {
    const server = Date.parse(data?.serverNow);
    if (Number.isFinite(server)) offset = server - nowMs();
    if (typeof data?.closesAt === 'string' && Number.isFinite(Date.parse(data.closesAt))) closesAt = data.closesAt;
  }

  async function readPulse() {
    try { return await adapter.pulseCounts(); } catch { return null; }
  }

  async function checkPulse() {
    if (typeof adapter?.pulseCounts !== 'function') return;
    const result = await readPulse();
    if (destroyed) return;
    const state = pulseState(result);
    if (state === 'paused') {
      if (['edit', 'confirm', 'lost', 'closed'].includes(step)) paused();
      return;
    }
    if (state) applyClock(result.data);
    if (state === 'closed') cutoff({ arrival: true });
    else if (state === 'open' && reopenable && step === 'closed') resume();
    else if (state === 'open') scheduleCutoff();
  }

  async function recheck() {
    if (checking) return;
    checking = true;
    const result = await readPulse();
    checking = false;
    if (destroyed || step !== 'paused') return;
    const state = pulseState(result);
    if (state === 'open') {
      applyClock(result.data);
      resume();
    } else if (state === 'closed') {
      applyClock(result.data);
      closedArrival();
    }
  }

  async function closedOrPaused() {
    if (closesAt && serverTime() >= Date.parse(closesAt)) return 'closed';
    return pulseState(await readPulse()) === 'paused' ? 'paused' : 'closed';
  }

  function refused(kind, detail = {}) {
    say('');
    if (closedPending) {
      closedRecovery(kind);
      return;
    }
    if (kind === 'gone') {
      lockedRefusal('gone');
      return;
    }
    if (kind === 'closed') {
      void closedOrPaused().then(next => {
        if (destroyed) return;
        if (next === 'paused') paused();
        else lockedRefusal('closed');
      });
      return;
    }
    if (kind === 'verification') {
      setBusy(false);
      step = 'confirm';
      readOnly(false);
      pub.textContent = msg('actions.confirmPublish');
      pub.setAttribute('aria-disabled', 'false');
      keep.hidden = false;
      armedAt = nowMs();
      alertShow('error-verification-failed', true);
      return;
    }
    setBusy(false);
    readOnly(false);
    disarm(false);
    if (kind === 'invalid') alertShow(INVALID_BLOCKS[detail.code] || INVALID_BLOCKS.TOO_SHORT, true);
    else {
      fillSaved();
      alertShow('error-publish-failure', true);
    }
    ta.focus?.();
  }

  function onPublishClick(event) {
    if (event?.repeat || repeatKeydown) return;
    if (step === 'paused') {
      void recheck();
      return;
    }
    if (step === 'sending' || step === 'done' || step === 'closed' || step === 'locked') return;
    if (step === 'lost') {
      if (rateUntil > nowMs()) {
        alertShow(rateBlock, true);
        return;
      }
      retry();
      return;
    }
    if (checkCutoff()) return;
    if (pub.getAttribute('aria-disabled') === 'true') {
      ta.focus?.();
      if (over) alertShow(INVALID_BLOCKS.TOO_LONG, true);
      return;
    }
    if (step === 'edit') {
      const used = visibleLen();
      if (!used || used < minimum) {
        alertShow(used ? INVALID_BLOCKS.TOO_SHORT : INVALID_BLOCKS.REQUIRED, true);
        ta.focus?.();
        return;
      }
      arm();
      return;
    }
    if (step === 'confirm') {
      const fresh = activationReleased && freshActivation;
      freshActivation = false;
      if (!fresh || nowMs() - armedAt < CONFIRM_GUARD_MS || (event && event.detail > 1)) return;
      submit();
    }
  }

  function renderToday() {
    fillSlot(stamp, 'today', shortDate(new Date(serverTime()).toISOString()));
  }
  function scheduleMidnight() {
    cancel(midnightTimer);
    midnightTimer = later(() => {
      midnightTimer = null;
      renderToday();
      scheduleMidnight();
    }, msToLaMidnight(serverTime()));
  }

  async function onCopy() {
    const value = text();
    try {
      await view.navigator.clipboard.writeText(value);
      say(msg('placeholders.copied'));
    } catch {
      fallback.value = value;
      fallback.hidden = false;
      say(msg('placeholders.copyFallback'));
      fallback.focus?.();
      fallback.select?.();
    }
  }

  function restorePending(pending) {
    try {
      const frozen = JSON.parse(pending.payload);
      draft = { body: frozen.body, editionId: frozen.editionId };
      ta.value = draft.body;
    } catch { }
  }

  function onEscape(event) {
    if (event.key === 'Escape' && step === 'confirm') {
      event.preventDefault?.();
      disarm(true);
    }
  }
  function keepPublishFocus(event) {
    if (step !== 'confirm') return;
    event.preventDefault?.();
    pub.focus?.({ preventScroll: true });
  }

  const gate = options.gate !== undefined ? options.gate
    : ctx.edition?.turnstileSiteKey
      ? createTurnstileGate({ siteKey: ctx.edition.turnstileSiteKey, document }) : null;
  if (gate?.container) byId('d40-gate').append(gate.container);
  gate?.onInteractive?.(() => {
    if (step !== 'confirm' && step !== 'sending') return;
    confirmBox.hidden = false;
    say(msg('placeholders.turnstilePrompt'));
  });

  listen(ta, 'input', onInput);
  listen(ta, 'compositionend', onInput);
  listen(card, 'click', event => {
    if (event.target === ta || ta.readOnly || event.target?.closest?.('button')) return;
    ta.focus?.();
    ta.setSelectionRange?.(text().length, text().length);
  });
  listen(card, 'keydown', onEscape);
  listen(commit, 'keydown', onEscape);
  listen(pub, 'keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    repeatKeydown = !!event.repeat;
    if (repeatKeydown) event.preventDefault?.();
    else if (step === 'confirm' && activationReleased) freshActivation = true;
  });
  listen(pub, 'keyup', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    repeatKeydown = false;
    if (step === 'confirm') activationReleased = true;
  });
  listen(pub, 'pointerup', () => {
    repeatKeydown = false;
    if (step === 'confirm') {
      activationReleased = true;
      freshActivation = true;
    }
  });
  listen(pub, 'click', onPublishClick);
  for (const type of ['pointerdown', 'mousedown', 'click']) listen(notice, type, keepPublishFocus);
  listen(keep, 'click', event => {
    event.preventDefault?.();
    if (step === 'confirm') disarm(true);
  });
  listen(copyBtn, 'click', event => {
    event.preventDefault?.();
    void onCopy();
  });
  listen(view, 'online', () => {
    if (step === 'lost' && lostKind === 'lost' && !autoOnline) {
      autoOnline = true;
      retry();
      return;
    }
    if (offlineHeld) {
      offlineHeld = false;
      alertShow('');
      if (!storageBlocked && step !== 'closed' && step !== 'locked') {
        const hadCopy = copyBtn.contains(document.activeElement);
        copyBtn.hidden = true;
        if (hadCopy) pub.focus?.();
      }
    }
  });
  listen(document, 'visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (step === 'lost' && lostKind === 'lost' && !autoVisible) {
      autoVisible = true;
      retry();
    }
  });
  listen(view, 'pageshow', event => {
    if (!event.persisted || step !== 'done') return;
    const again = draftStore?.reload?.(ctx.config) ?? draftStore?.load?.(ctx.config);
    draft = { body: again?.editionId === editionId ? again.body || '' : '', editionId };
    step = 'edit';
    ta.value = draft.body;
    readOnly(false);
    confirmBox.hidden = true;
    keep.hidden = true;
    under.hidden = false;
    setSaved(false);
    stamp.hidden = false;
    hideBlock(root, 'published');
    pub.hidden = false;
    pub.textContent = msg('actions.publish');
    setBusy(false);
    alertShow('');
    sync();
  });

  saved.textContent = msg('write.memoryOnly');
  renderToday();
  ta.value = draft.body;
  engine = createPublishEngine({
    adapter, draftStore, gate, cryptoImpl, navigate,
    locks: options.locks !== undefined ? options.locks : view.navigator?.locks,
    getConfig: () => ctx.config,
    getDraft: () => (hash ? { ...draft, termsHash: hash } : draft),
    getMode: () => (ctx.phase === 'open' ? 'open' : 'closed'),
    isOffline,
    onSuccess: success,
    onLost: lost,
    onRefused: refused,
  });
  const pending = engine.pending;
  if (pending) restorePending(pending);
  else if (draft.body) {
    status.textContent = storageBlocked ? '' : msg('write.restored');
    saveDraft();
  }
  sync();
  if (pending) {
    lost('lost');
    if (isClosed()) {
      closedPending = true;
      pin(card);
      pin(pub);
    }
  } else if (isClosed()) {
    closedArrival();
    reopenable = true;
  }
  scheduleCutoff();
  scheduleMidnight();
  const ready = Promise.all([
    checkPulse(),
    termsHash(notice.textContent, cryptoImpl).then(value => { hash = value; }, () => { hash = null; }),
  ]);

  return {
    ready,
    get step() { return step; },
    get draft() { return { ...draft }; },
    get termsHash() { return hash; },
    get engine() { return engine; },
    destroy() {
      destroyed = true;
      stopCloseWatch();
      for (const id of [...timers]) cancel(id);
      for (const [target, type, fn, listenOptions] of listeners) target.removeEventListener(type, fn, listenOptions);
      listeners.length = 0;
      engine?.destroy?.();
      if (typeof gate?.destroy === 'function') gate.destroy();
      else gate?.reset?.();
    },
  };
}

bootPage((root, ctx) => mountWrite(root, ctx));
