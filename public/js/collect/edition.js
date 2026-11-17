const MAX_TIMER_MS = 2_147_000_000;

export function readEdition(document = globalThis.document) {
  let data = {};
  try {
    data = JSON.parse(document.getElementById('d40-edition')?.textContent || '{}') || {};
  } catch {
    data = {};
  }
  const closesAt = typeof data.closesAt === 'string' && Number.isFinite(Date.parse(data.closesAt))
    ? data.closesAt : null;
  return Object.freeze({
    editionId: typeof data.editionId === 'string' ? data.editionId : '',
    lastDay: typeof data.lastDay === 'string' ? data.lastDay : null,
    timeZone: typeof data.timeZone === 'string' ? data.timeZone : 'America/Los_Angeles',
    closesAt,
    apiBase: typeof data.apiBase === 'string' ? data.apiBase : '',
    turnstileSiteKey: typeof data.turnstileSiteKey === 'string' ? data.turnstileSiteKey : '',
    limits: Object.freeze({ ...(data.limits || {}) }),
    view: typeof data.view === 'string' ? data.view : '',
    first: typeof data.first === 'string' ? data.first : 'none',
    buildSha: typeof data.buildSha === 'string' ? data.buildSha : '',
  });
}

export function closedAt(closesAt, nowMs = Date.now()) {
  const at = closesAt === null || closesAt === undefined ? NaN : Date.parse(closesAt);
  return Number.isFinite(at) && nowMs >= at;
}

export function scheduleClose(closesAt, onClose, {
  now = Date.now, setTimeout: schedule = globalThis.setTimeout, clearTimeout: cancel = globalThis.clearTimeout,
} = {}) {
  const at = closesAt === null || closesAt === undefined ? NaN : Date.parse(closesAt);
  let timer = null;
  let stopped = false;
  const arm = () => {
    if (stopped || !Number.isFinite(at)) return;
    const wait = at - now();
    if (wait <= 0) {
      stopped = true;
      onClose();
      return;
    }
    timer = schedule(arm, Math.min(wait, MAX_TIMER_MS));
  };
  arm();
  return {
    stop() {
      stopped = true;
      if (timer !== null) cancel(timer);
      timer = null;
    },
  };
}
