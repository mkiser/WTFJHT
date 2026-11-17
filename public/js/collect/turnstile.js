export const TURNSTILE_SCRIPT_URL = ['https:', '', 'challenges.cloudflare.com', 'turnstile', 'v0', 'api.js?render=explicit'].join('/');
export const TOKEN_WAIT_MS = 10000;
export const COMPACT_BELOW_PX = 300;

export function createTurnstileGate({ siteKey, document, waitMs = TOKEN_WAIT_MS }) {
  const view = document.defaultView;
  const container = document.createElement('div');
  container.className = 'd40-widget';
  container.hidden = true;
  let status = 'idle';
  let interactive = false;
  let widgetId = null;
  let token = null;
  let errored = false;
  let waiters = [];
  let loadTimer = null;
  let interactiveHandler = null;
  let script = null;
  let onScriptLoad = null;
  let onScriptError = null;

  function stopLoadTimer() {
    if (loadTimer !== null) view.clearTimeout(loadTimer);
    loadTimer = null;
  }

  function settle(value) {
    const list = waiters;
    waiters = [];
    for (const done of list) done(value);
  }

  function fail() {
    stopLoadTimer();
    status = 'failed';
    token = null;
    settle(null);
  }

  function receive(value) {
    if (status === 'destroyed' || typeof value !== 'string' || !value) return;
    errored = false;
    if (waiters.length) settle(value);
    else token = value;
  }

  function widgetSize() {
    const slot = container.parentElement || container;
    let width = 0;
    try { width = slot.getBoundingClientRect().width; } catch { width = 0; }
    return width > 0 && width < COMPACT_BELOW_PX ? 'compact' : 'normal';
  }

  function becomeInteractive() {
    if (status === 'destroyed') return;
    interactive = true;
    container.hidden = false;
    for (const done of waiters) done.keep?.();
    interactiveHandler?.();
  }

  function renderWidget() {
    stopLoadTimer();
    const api = view.turnstile;
    if (!api || typeof api.render !== 'function') return fail();
    try {
      widgetId = api.render(container, {
        sitekey: siteKey,
        appearance: 'interaction-only',
        size: widgetSize(),
        theme: document.documentElement.getAttribute('data-theme') === 'night' ? 'dark' : 'light',
        'response-field': false,
        'before-interactive-callback': becomeInteractive,
        callback: receive,
        'error-callback': () => {
          errored = true;
          token = null;
          settle(null);
          return true;
        },
        'expired-callback': () => { token = null; },
        'timeout-callback': () => {
          token = null;
          settle(null);
        },
      });
    } catch {
      return fail();
    }
    if (typeof widgetId !== 'string' || !widgetId) return fail();
    status = 'rendered';
    return undefined;
  }

  function start() {
    if (status !== 'idle') return;
    status = 'loading';
    if (view.turnstile) {
      renderWidget();
      return;
    }
    const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile/"]');
    script = existing && document.readyState !== 'complete' ? existing : null;
    if (!script) {
      script = document.createElement('script');
      script.async = true;
      script.src = TURNSTILE_SCRIPT_URL;
      (document.head || document.body).append(script);
    }
    onScriptLoad = () => { if (status === 'loading') renderWidget(); };
    onScriptError = () => { if (status === 'loading') fail(); };
    script.addEventListener('load', onScriptLoad, { once: true });
    script.addEventListener('error', onScriptError, { once: true });
    loadTimer = view.setTimeout(() => {
      loadTimer = null;
      if (status !== 'loading') return;
      if (view.turnstile) renderWidget();
      else fail();
    }, waitMs);
  }

  function take() {
    if (status === 'idle' || status === 'failed' || status === 'destroyed' || errored) {
      return Promise.resolve(null);
    }
    if (token) {
      const value = token;
      token = null;
      return Promise.resolve(value);
    }
    return new Promise(resolve => {
      let timer = null;
      const done = value => {
        if (timer !== null) view.clearTimeout(timer);
        timer = null;
        resolve(value);
      };
      done.keep = () => {
        if (timer !== null) view.clearTimeout(timer);
        timer = null;
      };
      if (!interactive) {
        timer = view.setTimeout(() => {
          timer = null;
          waiters = waiters.filter(item => item !== done);
          resolve(null);
        }, waitMs);
      }
      waiters.push(done);
    });
  }

  function reset() {
    token = null;
    interactive = false;
    container.hidden = true;
    if (status !== 'rendered') return;
    try {
      view.turnstile.reset(widgetId);
    } catch {
      fail();
    }
  }

  function stopScriptListeners() {
    if (script && onScriptLoad) script.removeEventListener('load', onScriptLoad, { once: true });
    if (script && onScriptError) script.removeEventListener('error', onScriptError, { once: true });
    onScriptLoad = null;
    onScriptError = null;
  }

  function destroy() {
    if (status === 'destroyed') return;
    const rendered = status === 'rendered';
    stopLoadTimer();
    stopScriptListeners();
    status = 'destroyed';
    token = null;
    interactive = false;
    interactiveHandler = null;
    settle(null);
    if (rendered) {
      try { view.turnstile?.remove?.(widgetId); } catch { }
    }
    widgetId = null;
    container.remove();
  }

  return {
    container, start, take, reset, destroy,
    get interactive() { return interactive; },
    onInteractive(handler) { interactiveHandler = handler; },
  };
}
