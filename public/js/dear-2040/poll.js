const BACKOFF_MS = [10_000, 20_000, 40_000, 60_000];

function toMs(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

export function createPoller({
  intervalMs,
  run,
  tick,
  random = Math.random,
  now = Date.now,
  document: doc = globalThis.document,
  window: win = globalThis.window,
  setTimeout: schedule = globalThis.setTimeout,
  clearTimeout: cancel = globalThis.clearTimeout,
}) {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new TypeError('intervalMs must be a positive number');
  }
  const check = run || tick;
  const legacyTick = !run && typeof tick === 'function';
  if (typeof check !== 'function') throw new TypeError('run must be a function');

  let running = false;
  let inFlight = null;
  let timer = null;
  let interval = intervalMs;
  let failures = 0;
  let lastResponseAt = null;

  const visible = () => !doc || doc.visibilityState === 'visible';
  const clock = () => toMs(now());
  const clearScheduled = () => {
    if (timer !== null) {
      cancel(timer);
      timer = null;
    }
  };
  const jitter = ms => {
    const unit = Math.max(0, Math.min(1, Number(random()) || 0));
    return Math.round(ms * (0.8 + 0.4 * unit));
  };
  const nextDelay = () => {
    if (failures) return jitter(BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)]);
    if (legacyTick) return interval;
    return jitter(interval);
  };
  const scheduleNext = () => {
    if (!running || !visible() || inFlight || timer !== null) return;
    timer = schedule(() => {
      timer = null;
      return checkNow();
    }, nextDelay());
  };
  const checkNow = () => {
    if (inFlight) return inFlight;
    if (!running || !visible()) return Promise.resolve(false);
    clearScheduled();
    inFlight = Promise.resolve().then(() => check()).then(
      result => result !== false && result?.ok !== false,
      () => false,
    ).then(succeeded => {
      failures = succeeded ? 0 : Math.min(failures + 1, BACKOFF_MS.length);
      lastResponseAt = clock();
      return succeeded;
    }).finally(() => {
      inFlight = null;
      scheduleNext();
    });
    return inFlight;
  };
  const onVisibilityChange = () => {
    if (!visible()) {
      clearScheduled();
    } else if (failures) {
      scheduleNext();
    } else if (lastResponseAt !== null && clock() - lastResponseAt >= 2_000) {
      void checkNow();
    } else {
      scheduleNext();
    }
  };
  const onOnline = () => {
    if (failures) scheduleNext();
    else void checkNow();
  };
  const onPageShow = event => { if (event.persisted) void checkNow(); };

  return {
    start() {
      if (running) return;
      running = true;
      failures = 0;
      doc?.addEventListener?.('visibilitychange', onVisibilityChange);
      win?.addEventListener?.('online', onOnline);
      win?.addEventListener?.('pageshow', onPageShow);
      scheduleNext();
    },
    stop() {
      if (!running) return;
      running = false;
      clearScheduled();
      doc?.removeEventListener?.('visibilitychange', onVisibilityChange);
      win?.removeEventListener?.('online', onOnline);
      win?.removeEventListener?.('pageshow', onPageShow);
    },
    checkNow,
    setInterval(ms) {
      if (!Number.isFinite(ms) || ms <= 0) throw new TypeError('interval must be a positive number');
      interval = ms;
      clearScheduled();
      scheduleNext();
    },
  };
}
