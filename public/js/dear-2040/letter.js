import { bootPage } from './boot.js';
import { block, fillSlot, msg, showBlock } from './dom.js';
import { bindLetterShareControl, createShareActions } from './share.js';
import {
  createPrintControls, idleTask, loadLetterhead, numberText, printButtonOf, renderSheet, renderTombstone, shareButtonOf,
} from './sheet.js';

export const LOADING_DELAY_MS = 1000;
export const GET_TIMEOUT_MS = 15_000;
export const POLL_OPEN_MS = 30_000;
export const POLL_CLOSED_MS = 60_000;
const MODERATION_PAGES = 20;
const CLOCK_SLACK_MS = 60_000;
const HTTPS_TARGET = /^https:[/][/][^/]/;

export const BLOCKS = Object.freeze(['number', 'loading', 'offline', 'load-failure', 'not-found', 'gone', 'others',
  'invite', 'reader-share', 'reader-actions', 'report', 'own-actions', 'own-what', 'own-exit']);

export const STATES = Object.freeze({
  loading: ['number'],
  offline: ['offline'],
  failure: ['load-failure'],
  'not-found': ['not-found', 'others', 'invite'],
  gone: ['gone', 'others', 'invite'],
  visitor: ['number', 'reader-share', 'reader-actions', 'report'],
  own: ['number', 'own-actions', 'own-what', 'own-exit'],
});

function isLetter(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.id === 'string' &&
    typeof value.salutation === 'string' && typeof value.body === 'string' &&
    typeof value.dateLabel === 'string' && Number.isSafeInteger(value.letterNumber);
}

function parseMs(value) {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function reportHref(base, subject, letter) {
  if (typeof base !== 'string' || !base || /\s/.test(base)) return null;
  if (!base.startsWith('mailto:')) return HTTPS_TARGET.test(base) ? base : null;
  const params = [`subject=${encodeURIComponent(subject || '')}`];
  if (typeof letter?.url === 'string' && letter.url) params.push(`body=${encodeURIComponent(letter.url)}`);
  return `${base}${base.includes('?') ? '&' : '?'}${params.join('&')}`;
}

function loadImageModules() {
  return Promise.all([import('./keep-copy.js'), import('./png.js')])
    .then(([keep, png]) => ({ openKeepCopy: keep.openKeepCopy, renderLetterPng: png.renderLetterPng }));
}

export function mountLetter(root, ctx, options = {}) {
  const document = root.ownerDocument;
  const win = ctx.window || document.defaultView;
  const schedule = ctx.setTimeout;
  const cancel = ctx.clearTimeout;
  const now = ctx.now;
  const { adapter, draftStore } = ctx;
  const speak = typeof ctx.announce === 'function' ? ctx.announce : () => {};
  const share = options.share || createShareActions;
  const loadImage = options.loadImage || loadImageModules;
  const navigatorRef = win?.navigator ?? globalThis.navigator;
  let id = null;
  try { id = new URLSearchParams(win?.location?.search || '').get('id'); } catch { id = null; }

  const heading = root.querySelector('#d40-h1');
  const home = heading ? [...heading.childNodes].map(node => node.cloneNode(true)) : [];
  const homeTitle = heading ? heading.textContent.trim() : '';
  let headingIsHome = true;
  const subhed = root.querySelector('#d40-subhed');
  const numwrap = block(root, 'number');
  const numline = numwrap?.querySelector('.d40-num') ?? null;
  const sheetwrap = root.querySelector('#d40-sheetwrap');
  const loadingLine = block(root, 'loading');
  const contextLine = block(root, 'context');
  const shareRow = block(root, 'reader-share');
  const ownActions = block(root, 'own-actions');
  const whatBodies = [...(block(root, 'own-what')?.querySelectorAll('.d40-whatbody') || [])];
  const reportLinks = [...root.querySelectorAll('[data-report-subject]')]
    .map(anchor => ({ anchor, base: anchor.getAttribute('href') }));
  const ownEmail = block(root, 'own-email');
  const inviteEmail = block(root, 'own-invite-email');
  const emailSelf = ownActions?.querySelector('[data-share="email-self"]') ?? null;
  const ownPrint = ownActions?.querySelector('#d40-printletter') ?? null;

  let destroyed = false;
  let firstLoad = true;
  let modSeq = null;
  let shown = null;
  let shownOwn = false;
  let gone = false;
  let restorePending = false;
  let pollHandle = null;
  let dialog = null;
  let shareActions = null;
  let pngPromise = null;
  let storyPngPromise = null;
  let revalidation = null;
  let offsetMs = null;
  const timers = new Set();

  function later(fn, ms) {
    const handle = schedule(() => {
      timers.delete(handle);
      if (!destroyed) fn();
    }, ms);
    timers.add(handle);
    return handle;
  }
  function stopTimer(handle) {
    if (handle === null || handle === undefined) return;
    timers.delete(handle);
    cancel(handle);
  }
  const printing = createPrintControls({
    document, window: win, load: options.loadPrint || loadLetterhead, idle: options.idle || idleTask(win, later),
  });

  const skew = () => (offsetMs !== null && Math.abs(offsetMs) > CLOCK_SLACK_MS ? offsetMs : 0);
  const serverClock = () => (parseMs(now()) ?? Date.now()) + skew();
  function closeHasPassed() {
    const close = parseMs(ctx.closesAt);
    return close !== null && close <= serverClock();
  }

  function lost(node) {
    return Boolean(node) && node !== document.body && (!node.isConnected || Boolean(node.closest?.('[hidden]')));
  }

  function setTitle() {
    if (!homeTitle) return;
    const current = String(document.title || '');
    const at = current.indexOf(' | ');
    document.title = at < 0 ? homeTitle : `${homeTitle}${current.slice(at)}`;
  }

  function showHome() {
    if (!heading || headingIsHome) return;
    heading.replaceChildren(...home.map(node => node.cloneNode(true)));
    headingIsHome = true;
  }

  function setHeading(kind) {
    if (!heading) return null;
    heading.classList.remove('is-result', 'is-visitor');
    if (kind === 'own') {
      heading.classList.add('is-result');
      heading.textContent = msg('result.ownHeading', undefined, document);
      headingIsHome = false;
      subhed?.remove();
    } else {
      if (kind === 'visitor') heading.classList.add('is-visitor');
      showHome();
      if (subhed && !subhed.isConnected) heading.after(subhed);
    }
    return heading;
  }

  function showState(state) {
    const visible = new Set(STATES[state] || []);
    for (const name of BLOCKS) showBlock(root, name, visible.has(name));
    if (sheetwrap && (state === 'own' || state === 'visitor')) {
      if (numwrap && numwrap.nextElementSibling !== sheetwrap) numwrap.after(sheetwrap);
      sheetwrap.hidden = false;
    } else if (sheetwrap) {
      sheetwrap.replaceChildren();
      sheetwrap.remove();
    }
    for (const body of whatBodies) body.hidden = false;
  }

  function closeView() {
    shareActions?.destroy?.();
    shareActions = null;
    dialog?.close?.();
    dialog = null;
  }

  function renderLoading(own) {
    const active = document.activeElement;
    const hadFocus = Boolean(active) && active !== document.body && root.contains(active);
    closeView();
    showState('loading');
    const head = setHeading(own ? 'own' : 'visitor');
    if (hadFocus && lost(active)) head?.focus({ preventScroll: true });
    numwrap?.classList.toggle('d40-s3num', own);
    if (numline) numline.textContent = '\u00a0';
    return later(() => { if (loadingLine) loadingLine.hidden = false; }, LOADING_DELAY_MS);
  }

  function renderFailure(kind, own, { focus = false } = {}) {
    closeView();
    shown = null;
    showState(kind);
    setHeading(own ? 'own' : 'visitor');
    if (focus) block(root, kind === 'offline' ? 'offline' : 'load-failure')?.querySelector('p')?.focus();
  }

  function renderMissing(status, { focus = false } = {}) {
    closeView();
    shown = null;
    showState(status === 410 ? 'gone' : 'not-found');
    if (status === 410) fillSlot(root, 'gone', msg('placeholders.gone', undefined, document));
    const head = setHeading('plain');
    setTitle();
    if (focus) head?.focus({ preventScroll: true });
    void pulse();
  }

  function nativeShare(control, action = 'share', copy = 'copyLink') {
    const actions = shareActions;
    if (!actions) return;
    const reveal = result => {
      if (destroyed || actions !== shareActions || result?.ok || result?.cancelled) return;
      void actions[copy](control, { track: false });
    };
    void Promise.resolve(actions[action]()).then(reveal, () => reveal({ ok: false }));
  }

  function bindEmail(anchor, method, href) {
    anchor?.addEventListener('click', () => {
      if (!shareActions) return;
      anchor.href = href(shareActions);
      shareActions.track(method);
    });
  }

  function pngFor(render, options) {
    const story = options?.format === 'story';
    const current = story ? storyPngPromise : pngPromise;
    if (current) return current;
    const letter = shown;
    const made = Promise.resolve().then(() => render(letter, { ...options, document }));
    made.catch(() => {});
    if (story) storyPngPromise = made;
    else pngPromise = made;
    return made;
  }

  function openDialog(trigger, saveLabel = null) {
    const letter = shown;
    if (!letter || gone) return;
    Promise.resolve().then(loadImage).then(({ openKeepCopy, renderLetterPng }) => {
      if (destroyed || gone || shown !== letter) return;
      dialog?.close?.();
      const dialogShare = dialogOptions => share({
        ...dialogOptions, pngPromise, setTimeout: schedule, clearTimeout: cancel,
      });
      dialog = openKeepCopy(document, {
        letter, trigger, share: dialogShare, png: (_letter, pngOptions) => pngFor(renderLetterPng, pngOptions),
        saveLabel, setTimeout: schedule, clearTimeout: cancel,
      });
    }, () => {
      if (!destroyed && shareActions && shown === letter) void shareActions.copyText(trigger);
    });
  }

  function showLetter(letter, { own, arrival = false, focus = false, keepPolling = false }) {
    closeView();
    shown = letter;
    shownOwn = own;
    gone = false;
    restorePending = false;
    showState(own ? 'own' : 'visitor');
    const head = setHeading(own ? 'own' : 'visitor');
    numwrap?.classList.toggle('d40-s3num', own);
    if (numline) numline.textContent = numberText(letter, document);
    const sheet = renderSheet(document, letter, { own, share: !own });
    const shareButton = own ? null : shareButtonOf(sheet);
    if (shareButton) shareButton.id = 'd40-shareletter';
    if (contextLine) {
      contextLine.hidden = false;
      sheet.appendChild(contextLine);
    }
    sheetwrap?.replaceChildren(sheet);
    shareActions = share({
      letter, navigator: navigatorRef, document, surface: own ? 'success' : 'letter',
      ...(own ? { closesAt: () => ctx.closesAt } : {}), announce: speak,
      fallbackAfter: own ? ownActions : shareRow, setTimeout: schedule, clearTimeout: cancel,
    });
    if (own) {
      const native = shareActions.canNativeShare;
      for (const name of ['own-send', 'own-invite']) showBlock(root, name, native);
      for (const name of ['own-copylink', 'own-email', 'own-invite-email']) showBlock(root, name, !native);
      if (ownEmail) ownEmail.href = shareActions.emailHref();
      if (inviteEmail) inviteEmail.href = shareActions.inviteEmailHref();
      if (emailSelf) emailSelf.href = shareActions.emailHref();
    } else if (shareButton) {
      bindLetterShareControl(shareButton, shareActions);
    }
    printing.bind(own ? ownPrint : printButtonOf(sheet), letter);
    for (const { anchor, base } of reportLinks) {
      const href = reportHref(base, anchor.getAttribute('data-report-subject'), letter);
      if (href) anchor.href = href;
      else anchor.removeAttribute('href');
      if (anchor.closest('[data-d40-block="report"]')) showBlock(root, 'report', !own && Boolean(href));
    }
    setTitle();
    if (arrival || focus) head?.focus({ preventScroll: true });
    if (!keepPolling) startPolling();
  }

  function takedown() {
    if (gone || !shown || destroyed) return;
    gone = true;
    if (modSeq === null) modSeq = 0;
    const own = shownOwn;
    const active = document.activeElement;
    let hadFocus = false;
    if (dialog) {
      hadFocus = typeof dialog.closeForTakedown === 'function'
        ? dialog.closeForTakedown() === true : (dialog.close?.(), false);
      dialog = null;
    }
    const afterDialog = document.activeElement;
    let height = 0;
    try { height = sheetwrap?.querySelector('.d40-sheet')?.getBoundingClientRect().height ?? 0; } catch { height = 0; }
    const tombstone = renderTombstone(document, height);
    sheetwrap?.replaceChildren(tombstone);
    if (own) {
      showBlock(root, 'own-actions', false);
      for (const body of whatBodies) body.hidden = true;
      showHome();
      draftStore?.forgetOwn?.(shown.id);
    } else {
      showBlock(root, 'reader-share', false);
      showBlock(root, 'report', false);
    }
    shareActions?.destroy?.();
    setTitle();
    if (hadFocus || lost(active) || lost(afterDialog)) tombstone.focus();
  }

  function getLetter(letterId) {
    let timer = null;
    const timeout = new Promise(resolve => {
      timer = later(() => resolve({ ok: false, status: 0, error: 'TIMEOUT' }), GET_TIMEOUT_MS);
    });
    const request = Promise.resolve().then(() => adapter.get(letterId))
      .catch(() => ({ ok: false, status: 0, error: 'NETWORK' }));
    return Promise.race([request, timeout]).finally(() => stopTimer(timer));
  }

  async function checkModeration() {
    if (typeof adapter?.moderation !== 'function' || modSeq === null || !shown) return;
    let after = modSeq;
    let visible;
    let edited = false;
    for (let page = 0; page < MODERATION_PAGES; page += 1) {
      let response;
      try { response = await adapter.moderation(after); } catch { return; }
      if (destroyed || !response?.ok || !response.data) return;
      for (const item of response.data.items || []) {
        if (item?.id === shown.id) {
          visible = item.visible;
          edited = item.action === 'edit';
        }
      }
      if (Number.isFinite(response.data.latest)) after = response.data.latest;
      if (!response.data.hasMore) break;
    }
    const before = modSeq;
    modSeq = after;
    if (visible === false) {
      restorePending = false;
      takedown();
    } else if (visible === true && gone) {
      restorePending = true;
    } else if (visible === true && edited && !gone) {
      const letterId = shown.id;
      const response = await getLetter(letterId);
      if (destroyed || gone || shown?.id !== letterId) return;
      if (response?.status === 410) {
        takedown();
      } else if (response?.ok && isLetter(response.data?.letter) && response.data.letter.id === letterId) {
        const active = document.activeElement;
        const hadFocus = Boolean(active) && active !== document.body && root.contains(active);
        const wasIcon = active?.id === 'd40-shareletter';
        pngPromise = null;
        storyPngPromise = null;
        showLetter(response.data.letter, { own: shownOwn, keepPolling: true });
        const target = wasIcon ? root.querySelector('#d40-shareletter') : active;
        if (hadFocus && target?.isConnected && document.activeElement !== target) target.focus({ preventScroll: true });
      } else {
        modSeq = before;
      }
    }
  }

  async function restoreShown() {
    const letterId = shown?.id;
    if (!gone || !restorePending || !letterId) return;
    const response = await getLetter(letterId);
    if (destroyed || !gone || !restorePending || shown?.id !== letterId) return;
    const letter = response?.data?.letter;
    if (!response?.ok || !isLetter(letter) || letter.id !== letterId) return;
    if (Number.isFinite(response.data.modSeq)) modSeq = Math.max(modSeq, response.data.modSeq);
    const focus = document.activeElement === sheetwrap?.querySelector('.d40-tomb');
    showLetter(letter, { own: shownOwn, focus, keepPolling: true });
  }

  function applyPulse(data) {
    const server = parseMs(data.serverNow);
    if (server !== null) {
      const delta = server - (parseMs(now()) ?? Date.now());
      offsetMs = offsetMs === null ? delta : Math.max(offsetMs, delta);
    }
    if (data.mode === 'offline') ctx.setPhase('paused');
    else if (data.closed === true) ctx.setPhase('closed');
    else if (data.closed === false && ctx.phase !== 'open' && !closeHasPassed()) ctx.setPhase('open');
  }

  async function pulse() {
    if (destroyed || typeof adapter?.pulseCounts !== 'function') return { ok: false };
    let response;
    try { response = await adapter.pulseCounts(); } catch { return { ok: false }; }
    if (destroyed) return response ?? { ok: false };
    if (!response?.ok || !response.data) {
      if (response?.status === 503 && response.error === 'OFFLINE') ctx.setPhase('paused');
      return response ?? { ok: false };
    }
    applyPulse(response.data);
    if (modSeq === null && shown && !gone) {
      await revalidateShown();
      if (destroyed || modSeq === null) return response;
    }
    const seq = response.data.modSeq;
    if (Number.isFinite(seq)) {
      if (modSeq === null) modSeq = seq;
      else if (seq > modSeq) await checkModeration();
    }
    if (gone && restorePending) await restoreShown();
    return response;
  }

  function stopPolling() {
    pollHandle?.stop?.();
    pollHandle = null;
  }

  function startPolling() {
    stopPolling();
    if (typeof ctx.poller !== 'function') {
      void pulse();
      return;
    }
    pollHandle = ctx.poller({
      intervalMs: ctx.phase === 'open' ? POLL_OPEN_MS : POLL_CLOSED_MS, run: pulse,
      document, window: win, setTimeout: schedule, clearTimeout: cancel,
    });
    pollHandle.start();
    void pollHandle.checkNow?.();
  }

  function revalidateShown() {
    if (!revalidation && shown) {
      revalidation = revalidate(shown.id).finally(() => { revalidation = null; });
    }
    return revalidation ?? Promise.resolve();
  }

  async function revalidate(letterId) {
    const response = await getLetter(letterId);
    if (destroyed || shown?.id !== letterId) return;
    if (response?.ok && Number.isFinite(response.data?.modSeq)) {
      if (modSeq === null || response.data.modSeq > modSeq) modSeq = response.data.modSeq;
    } else if (response?.status === 410) {
      takedown();
    }
  }

  async function load({ retrying = false } = {}) {
    if (destroyed) return;
    stopPolling();
    const arrival = firstLoad && id ? draftStore?.consumeArrival?.(id) ?? null : null;
    firstLoad = false;
    if (!id) {
      renderMissing(404, { focus: retrying });
      return;
    }
    const first = Boolean(arrival);
    if (isLetter(arrival) && arrival.id === id) {
      showLetter(arrival, { own: true, arrival: true });
      void revalidateShown();
      return;
    }
    const isOwn = candidate => Boolean(ctx.isOwn ? ctx.isOwn(candidate) : draftStore?.isOwn?.(candidate));
    const ownGuess = first || isOwn(id);
    const loadingTimer = renderLoading(ownGuess);
    const response = await getLetter(id);
    stopTimer(loadingTimer);
    if (destroyed) return;
    if (response?.ok && isLetter(response.data?.letter)) {
      const letter = response.data.letter;
      if (Number.isFinite(response.data.modSeq)) modSeq = response.data.modSeq;
      showLetter(letter, { own: first || isOwn(letter.id), focus: retrying || first });
    } else if (response?.status === 404) {
      renderMissing(404, { focus: retrying });
    } else if (response?.status === 410) {
      if (isOwn(id)) draftStore?.forgetOwn?.(id);
      renderMissing(410, { focus: retrying });
    } else if (response?.status === 503 && response.error === 'OFFLINE') {
      ctx.setPhase('paused');
      renderFailure('offline', ownGuess, { focus: retrying });
    } else {
      renderFailure('failure', ownGuess, { focus: retrying });
    }
  }

  const keepCopy = shareRow?.querySelector('[data-share="keepcopy"]');
  keepCopy?.addEventListener('click', () => openDialog(keepCopy, msg('actions.keepCopy', undefined, document)));
  const ownKeep = root.querySelector('#d40-keepcopy');
  ownKeep?.addEventListener('click', () => openDialog(ownKeep));
  const ownSend = block(root, 'own-send');
  ownSend?.addEventListener('click', () => nativeShare(ownSend));
  const ownCopy = block(root, 'own-copylink');
  ownCopy?.addEventListener('click', () => { if (shareActions) void shareActions.copyLink(ownCopy); });
  const ownInvite = block(root, 'own-invite');
  ownInvite?.addEventListener('click', () => nativeShare(ownInvite, 'invite', 'copyInviteLink'));
  bindEmail(ownEmail, 'email', actions => actions.emailHref());
  bindEmail(inviteEmail, 'invite', actions => actions.inviteEmailHref());
  bindEmail(emailSelf, 'email-self', actions => actions.emailHref());
  for (const retry of root.querySelectorAll('[data-act="retry"]')) {
    retry.addEventListener('click', () => { void load({ retrying: true }); });
  }

  const offPhase = typeof ctx.onPhase === 'function' ? ctx.onPhase((next, before) => {
    if (destroyed) return;
    pollHandle?.setInterval?.(next === 'open' ? POLL_OPEN_MS : POLL_CLOSED_MS);
    if (next === 'open') return;
    const gate = document.activeElement?.closest?.('[data-d40-when]');
    if (gate && root.contains(gate) && !String(gate.getAttribute('data-d40-when')).split(/\s+/).includes(next)) {
      heading?.focus({ preventScroll: true });
    }
    if (next === 'closed' && before === 'open') speak(msg('states.closed', undefined, document));
  }) : null;

  const ready = load().catch(() => {
    if (!destroyed) renderFailure('failure', false);
  });
  return {
    ready,
    load,
    destroy() {
      destroyed = true;
      printing.destroy();
      stopPolling();
      for (const handle of timers) cancel(handle);
      timers.clear();
      dialog?.close?.();
      dialog = null;
      shareActions?.destroy?.();
      offPhase?.();
    },
  };
}

bootPage((root, ctx) => mountLetter(root, ctx));
