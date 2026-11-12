const GET_TIMEOUT_MS = 15_000;
const POST_TIMEOUT_MS = 20_000;
const idempotencyKeyPattern = /^[A-Za-z0-9_-]{22,128}$/;
export const errorResult = (status, error, extra = {}) => ({
  ok: false, status, error, data: { error, ...extra },
});
export const NETWORK = Object.freeze({ ok: false, status: 0, error: 'NETWORK', data: null });

function queryString(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function cursorSeq(cursor) {
  if (typeof cursor !== 'string' || !/^[A-Za-z0-9_-]+$/.test(cursor)) return null;
  try {
    const binary = atob(cursor.replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - cursor.length % 4) % 4));
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(binary, char => char.charCodeAt(0))));
    if (Object.keys(payload).length !== 2 || payload.v !== 1 ||
        !Number.isSafeInteger(payload.seq) || payload.seq < 0) return null;
    const canonical = btoa(JSON.stringify({ v: 1, seq: payload.seq }))
      .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
    return canonical === cursor ? payload.seq : null;
  } catch {
    return null;
  }
}

function untilAborted(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'));
      return;
    }
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    Promise.resolve(promise).then(resolve, reject);
  });
}

export function createApiAdapter({ baseUrl, fetchImpl = globalThis.fetch, early = null,
  setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout } = {}) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  const url = path => `${base}${path}`;
  let earlyUsed = false;
  function takeEarly(target) {
    if (earlyUsed || !early || typeof early.path !== 'string' || !early.response) return null;
    if (`${String(early.base || '').replace(/\/+$/, '')}${early.path}` !== target) return null;
    earlyUsed = true;
    return early.response;
  }
  async function request(path, options = {}) {
    const method = options.method || 'GET';
    const controller = new AbortController();
    const timeout = setTimeoutImpl(() => controller.abort(),
      method === 'POST' ? POST_TIMEOUT_MS : GET_TIMEOUT_MS);
    try {
      const target = url(path);
      const head = method === 'GET' ? takeEarly(target) : null;
      let pending = head;
      if (!pending) {
        if (typeof fetchImpl !== 'function') throw new Error('fetch unavailable');
        pending = fetchImpl(target, {
          ...options,
          cache: 'no-store',
          credentials: 'omit',
          headers: options.headers || {},
          signal: controller.signal,
        });
      }
      const response = await untilAborted(pending, controller.signal);
      let data = null;
      try { data = await response.json(); } catch { }
      const status = Number(response.status) || 0;
      const ok = response.ok === undefined ? status >= 200 && status < 300 : response.ok;
      if (!ok) return { ok: false, status, error: data?.error, data };
      return { ok: true, status, data };
    } catch {
      if (controller.signal.aborted) return { ok: false, status: 0, error: 'TIMEOUT' };
      return { ...NETWORK };
    } finally {
      clearTimeoutImpl(timeout);
    }
  }
  return {
    async publish(submission, key, options) {
      const turnstileToken = options?.turnstileToken;
      let body;
      try {
        body = JSON.stringify(submission);
      } catch {
        return errorResult(400, 'INVALID_JSON');
      }
      if (body === undefined) return errorResult(400, 'INVALID_JSON');
      if (typeof key !== 'string' || !idempotencyKeyPattern.test(key)) {
        return errorResult(400, 'IDEMPOTENCY_KEY_REQUIRED');
      }
      const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': key };
      if (typeof turnstileToken === 'string' && turnstileToken) headers['X-Turnstile-Token'] = turnstileToken;
      return request('/letters', { method: 'POST', headers, body });
    },
    list(options = {}) {
      try {
        const { cursor, limit } = options || {};
        return request(`/letters${queryString({ cursor, limit })}`);
      } catch {
        return Promise.resolve({ ...NETWORK });
      }
    },
    listAfter(latest) {
      try { return request(`/letters?after=${encodeURIComponent(latest ?? '')}`); }
      catch { return Promise.resolve({ ...NETWORK }); }
    },
    get(id) {
      try { return request(`/letters/${encodeURIComponent(id)}`); }
      catch { return Promise.resolve({ ...NETWORK }); }
    },
    pulse() {
      return request('/pulse');
    },
    pulseCounts() {
      return request('/pulse?fields=counts');
    },
    moderation(after = 0, limit) {
      try { return request(`/moderation${queryString({ after, limit })}`); }
      catch { return Promise.resolve({ ...NETWORK }); }
    },
  };
}

export function createPageAdapter(win, edition, { fetchImpl } = {}) {
  return createApiAdapter({
    baseUrl: edition.apiBase,
    fetchImpl: fetchImpl || win?.fetch?.bind(win),
    early: win?.d40Early || null,
    setTimeoutImpl: (fn, ms) => win.setTimeout(fn, ms),
    clearTimeoutImpl: id => win.clearTimeout(id),
  });
}
