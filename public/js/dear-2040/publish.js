import { canonicalPayloadString, draftToSubmission, stageComplete } from './core.js';
import { letterHref } from './paths.js';

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function makeKey(cryptoImpl) {
  const bytes = new Uint8Array(16);
  cryptoImpl.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const block = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    result += BASE64[(block >>> 18) & 63] + BASE64[(block >>> 12) & 63];
    if (i + 1 < bytes.length) result += BASE64[(block >>> 6) & 63];
    if (i + 2 < bytes.length) result += BASE64[block & 63];
  }
  return result;
}

const NETWORK = { ok: false, status: 0, error: 'NETWORK', data: null };
const LOCK_NAME = 'dear2040:publish';

export function createPublishEngine({
  adapter, draftStore, gate, cryptoImpl, getConfig, getDraft, getMode, isOffline,
  navigate, onSuccess, onLost, onRefused, locks,
}) {
  let pending = draftStore.loadPending?.(getConfig()) || null;
  let submitting = false;
  let ended = false;
  let destroyed = false;

  function dropPending() {
    const key = pending?.key;
    pending = null;
    draftStore.clearPending?.(key);
  }

  function claim(payload) {
    const known = draftStore.keyFor?.(payload);
    if (known) return known;
    const fresh = { payload, key: makeKey(cryptoImpl) };
    const saved = draftStore.savePending?.(fresh);
    if (saved && saved.safe === false) {
      draftStore.clearPending?.(fresh.key);
      return null;
    }
    return fresh;
  }

  async function claimLocked(payload) {
    if (typeof locks?.request !== 'function') return claim(payload);
    let result;
    let ran = false;
    try {
      await locks.request(LOCK_NAME, () => {
        ran = true;
        result = claim(payload);
      });
    } catch {
      if (!ran) result = claim(payload);
    }
    return result ?? null;
  }

  async function startNew() {
    if (destroyed || submitting || ended || pending || (getMode && getMode() !== 'open')) {
      return { skipped: true };
    }
    if (isOffline?.()) return { offline: true };
    const config = getConfig();
    const draft = getDraft();
    if (!stageComplete(draft, 'letter', config)) {
      onRefused?.('invalid', { code: 'REQUIRED' });
      return { refused: 'invalid' };
    }
    let payload;
    try {
      payload = canonicalPayloadString(draftToSubmission(draft));
    } catch {
      pending = null;
      onRefused?.('bad', {});
      return { refused: 'bad' };
    }
    submitting = true;
    const claimed = await claimLocked(payload);
    submitting = false;
    if (destroyed) return { skipped: true };
    if (!claimed) {
      pending = null;
      onRefused?.('bad', {});
      return { refused: 'bad' };
    }
    pending = claimed;
    return sendPending();
  }

  async function retryPending() {
    if (destroyed || submitting || ended) return { skipped: true };
    if (!pending) pending = draftStore.loadPending?.(getConfig()) || null;
    if (!pending) return { skipped: true };
    return sendPending();
  }

  async function sendPending() {
    draftStore.savePending?.(pending);
    submitting = true;
    let turnstileToken = null;
    if (gate) {
      try { turnstileToken = await gate.take(); } catch { turnstileToken = null; }
    }
    if (destroyed) {
      submitting = false;
      return { skipped: true };
    }
    let response;
    try {
      response = await adapter.publish(JSON.parse(pending.payload), pending.key,
        turnstileToken ? { turnstileToken } : undefined);
    } catch {
      response = NETWORK;
    }
    if (!destroyed) gate?.reset();
    if (!response || typeof response !== 'object') response = NETWORK;
    submitting = false;
    const status = Number(response.status) || 0;
    const letter = response.data?.letter;
    if ((status === 201 || status === 200) && response.ok &&
        typeof letter?.id === 'string' && letter.id) {
      if (draftStore.markSent) draftStore.markSent(pending);
      else draftStore.clearPending?.();
      pending = null;
      draftStore.clear();
      draftStore.markOwn(letter.id, { letterNumber: letter.letterNumber, dayKey: letter.dayKey });
      if (destroyed) return { success: letter };
      draftStore.markArrival(letter.id, letter);
      onSuccess?.(letter);
      navigate(letterHref(letter.id));
      return { success: letter };
    }
    if (status === 0 || status >= 500 || status === 200 || status === 201) {
      if (!destroyed) onLost?.('lost');
      return { lost: 'lost' };
    }
    if (status === 429) {
      const seconds = Math.max(0, Number(response.data?.retryAfterSeconds) || 0);
      if (!destroyed) onLost?.('rate', seconds);
      return { lost: 'rate' };
    }
    dropPending();
    let kind = 'bad';
    let detail = {};
    if (status === 409 && response.error === 'COLLECTION_CLOSED') {
      kind = 'closed';
    } else if (status === 410) {
      ended = true;
      draftStore.clear();
      kind = 'gone';
    } else if (status === 422) {
      const errors = response.data?.details?.errors;
      const bodyError = Array.isArray(errors) ? errors.find(error => error?.field === 'body') : null;
      if (bodyError) {
        kind = 'invalid';
        detail = { code: bodyError.code };
      }
    } else if (status === 403 && response.error === 'VERIFICATION_FAILED') {
      kind = 'verification';
    }
    if (!destroyed) onRefused?.(kind, detail);
    return { refused: kind };
  }

  return {
    startNew,
    retryPending,
    destroy() { destroyed = true; },
    get pending() { return pending; },
    get submitting() { return submitting; },
    get ended() { return ended; },
  };
}
