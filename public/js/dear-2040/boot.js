import { createAnnouncer } from './announce.js';
import { createPageAdapter } from './api.js';
import { phase, readMessages, msg, setPhase, showBlock } from './dom.js';
import { createDraftStore } from './draft-store.js';
import { closedAt, readEdition, scheduleClose } from './edition.js';
import { createPoller } from './poll.js';
import { startSky } from './sky.js';

export const PHASE_EVENT = 'd40-phase';

function localStorageOf(win) {
  try {
    return win.localStorage;
  } catch {
    return undefined;
  }
}

function sessionStorageOf(win) {
  try {
    return win.sessionStorage;
  } catch {
    return undefined;
  }
}

export function createContext(win = globalThis.window, deps = {}) {
  const document = win.document;
  const root = document.getElementById('dear-2040');
  const edition = deps.edition || readEdition(document);
  const now = deps.now || (() => new Date().toISOString());
  const schedule = deps.setTimeout || ((fn, ms) => win.setTimeout(fn, ms));
  const cancel = deps.clearTimeout || (id => win.clearTimeout(id));
  const draftStore = deps.draftStore || createDraftStore({
    sessionStorage: sessionStorageOf(win), localStorage: localStorageOf(win), now,
  });
  draftStore.setCloseInstant(edition.closesAt);
  const adapter = deps.adapter || createPageAdapter(win, edition, { fetchImpl: deps.fetchImpl });
  if (!phase(document)) setPhase(document, closedAt(edition.closesAt, Date.parse(now())) ? 'closed' : 'open');
  const changePhase = next => {
    const before = phase(document);
    setPhase(document, next);
    if (before !== next) {
      root?.dispatchEvent?.(new win.CustomEvent(PHASE_EVENT, { detail: { phase: next, before } }));
    }
    return next;
  };
  return {
    window: win,
    document,
    root,
    view: root?.dataset?.view || edition.view,
    edition,
    config: Object.freeze({ editionId: edition.editionId, limits: edition.limits }),
    messages: readMessages(document),
    msg: (name, tokens) => msg(name, tokens, document),
    adapter,
    draftStore,
    poller: createPoller,
    announce: root ? createAnnouncer(document, { setTimeout: schedule }) : () => {},
    now,
    setTimeout: schedule,
    clearTimeout: cancel,
    closesAt: edition.closesAt,
    get phase() { return phase(document); },
    get closed() { return phase(document) === 'closed'; },
    setPhase: changePhase,
    onPhase(handler) {
      const listener = event => handler(event.detail.phase, event.detail.before);
      root?.addEventListener?.(PHASE_EVENT, listener);
      return () => root?.removeEventListener?.(PHASE_EVENT, listener);
    },
    watchClose() {
      return scheduleClose(edition.closesAt, () => changePhase('closed'), {
        now: () => Date.parse(now()), setTimeout: schedule, clearTimeout: cancel,
      });
    },
    isOwn: id => draftStore.isOwn(id),
    ownLetter: () => draftStore.latestOwn(),
  };
}

export const BOOTED_FLAG = 'd40Booted';
export const LOAD_ATTRIBUTE = 'data-d40-load';

function failed(ctx, win) {
  const document = win?.document;
  const root = ctx?.root || document?.getElementById?.('dear-2040');
  if (!root) return;
  showBlock(root, 'load-failure');
  document?.documentElement?.setAttribute?.(LOAD_ATTRIBUTE, 'failed');
  for (const button of root.querySelectorAll('[data-act="reload"], [data-d40-block="load-failure"] button')) {
    button.hidden = false;
    button.addEventListener('click', () => win.location?.reload?.());
  }
}

export function bootPage(mount, { win = globalThis.window, deps = {} } = {}) {
  if (win) win[BOOTED_FLAG] = true;
  const run = () => {
    if (deps.sky !== false) startSky(win, deps);
    let ctx = null;
    try {
      ctx = createContext(win, deps);
      if (!ctx.root) return null;
      ctx.closeWatch = ctx.watchClose();
      const result = mount(ctx.root, ctx);
      if (result && typeof result.then === 'function') {
        return result.catch(() => {
          failed(ctx, win);
          return null;
        });
      }
      return result;
    } catch {
      failed(ctx, win);
      return null;
    }
  };
  const document = win?.document;
  if (!document) return null;
  if (document.readyState === 'loading') {
    return new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', () => resolve(run()), { once: true });
    });
  }
  return run();
}
