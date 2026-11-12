import { cursorSeq } from './api.js';

const EMPTY_COUNTS = Object.freeze({ publishedCount: 0, dayCounts: Object.freeze({}) });

function actions(extra = {}) {
  return {
    stale: false, fetchModeration: null, fetchAfter: null, restore: [], edit: [], tombstone: [],
    insert: [], append: [], flush: false, deferred: false, closeSwap: false, rowNow: false,
    openSwap: false, arrived: 0, gathered: 0, gatheredIds: [], asked: false, counts: null, ...extra,
  };
}

const numberOf = letter => (Number.isSafeInteger(letter?.letterNumber) ? letter.letterNumber : 0);
const byNumber = (a, b) => numberOf(a) - numberOf(b);

function countsOf(data) {
  if (!data || !Number.isSafeInteger(data.publishedCount)) return null;
  const dayCounts = {};
  for (const [day, count] of Object.entries(data.dayCounts || {})) {
    if (Number.isSafeInteger(count) && count > 0) dayCounts[day] = count;
  }
  return { publishedCount: data.publishedCount, dayCounts };
}

export function createLiveModel({
  isOwn = () => false,
  queueMax = 240,
  gapLimit = 10,
  stallMs = 30_000,
  justInMs = 60_000,
  closesAt = null,
  closed = false,
} = {}) {
  const s = {};

  function reset(nowMs = 0) {
    s.cursor = 0;
    s.cursorText = null;
    s.modSeq = 0;
    s.lastPulse = null;
    s.shown = new Map();
    s.gone = new Set();
    s.removed = new Set();
    s.pendingEdits = new Set();
    s.queue = [];
    s.held = [];
    s.uncounted = new Set();
    s.hold = Boolean(s.hold);
    s.live = s.live ?? true;
    s.closed = Boolean(s.closed ?? closed);
    s.cutAt = s.cutAt ?? null;
    s.closesAt = s.closesAt === undefined ? closesAt : s.closesAt;
    s.stalled = false;
    s.lastOkAt = nowMs;
    s.newerAbove = false;
    s.overflow = false;
    s.nextCursor = null;
    s.justIn = null;
    s.newest = null;
    s.counts = EMPTY_COUNTS;
  }
  s.hold = false;
  s.live = true;
  s.closed = Boolean(closed);
  s.cutAt = null;
  s.closesAt = closesAt;
  reset(0);

  const flowing = () => s.live || s.closed;

  const known = id => s.shown.has(id) || s.queue.some(l => l.id === id) || s.held.some(l => l.id === id);

  function noteNewest(letter) {
    if (!letter || s.removed.has(letter.id)) return;
    if (!s.newest || numberOf(letter) > numberOf(s.newest)) s.newest = letter;
  }

  function recomputeNewest() {
    s.newest = null;
    for (const letter of s.shown.values()) if (!s.gone.has(letter.id)) noteNewest(letter);
    for (const letter of [...s.queue, ...s.held]) noteNewest(letter);
  }

  function setCounts(data) {
    const counts = countsOf(data);
    if (!counts) return;
    s.counts = counts;
    s.uncounted.clear();
  }

  function addCount(letter) {
    const dayCounts = { ...s.counts.dayCounts, [letter.dayKey]: (s.counts.dayCounts[letter.dayKey] || 0) + 1 };
    s.counts = { publishedCount: s.counts.publishedCount + 1, dayCounts };
  }

  function dropCount(letter) {
    const dayCounts = { ...s.counts.dayCounts };
    if (dayCounts[letter.dayKey] > 0) dayCounts[letter.dayKey] -= 1;
    s.counts = { publishedCount: Math.max(0, s.counts.publishedCount - 1), dayCounts };
  }

  function moderationRequest(modSeq) {
    return Number.isSafeInteger(modSeq) && modSeq > s.modSeq ? { after: s.modSeq } : null;
  }

  function fresh(list) {
    const seen = new Set();
    return list.filter(letter => {
      if (!letter?.id || seen.has(letter.id) || s.shown.has(letter.id) || s.removed.has(letter.id)) return false;
      seen.add(letter.id);
      return true;
    }).sort(byNumber);
  }

  function bounded(list) {
    const all = fresh(list);
    if (all.length > queueMax) s.overflow = true;
    return all.slice(0, queueMax);
  }

  function gather(items, nowMs) {
    let newest = null;
    const ids = [];
    for (const letter of [...(items || [])].sort(byNumber)) {
      if (!letter?.id || s.removed.has(letter.id) || known(letter.id)) continue;
      if (s.newerAbove) continue;
      const target = s.hold ? s.held : s.queue;
      if (target.length >= queueMax) {
        s.overflow = true;
        continue;
      }
      target.push(letter);
      s.uncounted.add(letter.id);
      if (!s.hold) ids.push(letter.id);
      noteNewest(letter);
      if (!newest || numberOf(letter) > numberOf(newest)) newest = letter;
    }
    if (!s.hold && newest && numberOf(newest) >= numberOf(s.newest)) {
      s.justIn = { id: newest.id, number: numberOf(newest), at: nowMs };
    }
    return ids;
  }

  function gatherInto(result, items, nowMs) {
    const ids = gather(items, nowMs);
    result.gathered += ids.length;
    result.gatheredIds.push(...ids);
  }

  function forgetJustIn(items) {
    if (s.justIn && items.some(letter => letter.id === s.justIn.id)) s.justIn = null;
  }

  function markShown(items) {
    for (const letter of items) {
      if (s.uncounted.delete(letter.id)) addCount(letter);
      s.shown.set(letter.id, letter);
      s.gone.delete(letter.id);
      noteNewest(letter);
    }
  }

  function closeSwap(result, { cutAt = null } = {}) {
    if (s.closed) return;
    s.closed = true;
    s.cutAt = cutAt;
    if (s.hold || s.held.length) {
      s.queue = bounded([...s.held, ...s.queue]);
      s.held = [];
      s.hold = false;
    }
    result.closeSwap = true;
    result.rowNow = true;
    result.flush = s.queue.length > 0;
  }

  function reopen(data, result) {
    if (!s.closed || data?.closed !== false) return;
    const closesAtNow = Object.hasOwn(data, 'closesAt') ? data.closesAt ?? null : s.closesAt;
    if (s.cutAt !== null && closesAtNow === s.cutAt) return;
    s.closed = false;
    s.cutAt = null;
    if (result) {
      result.openSwap = true;
      result.rowNow = true;
    }
  }

  function overflowToTop() {
    if (!s.overflow) return;
    s.overflow = false;
    s.newerAbove = true;
  }

  function insertNow(items, result) {
    markShown(items);
    result.insert = items;
    overflowToTop();
    return result;
  }

  return {
    seed(data, nowMs = 0) {
      reset(nowMs);
      const items = fresh(data?.items || []);
      for (const letter of data?.items || []) {
        if (letter?.id && !s.shown.has(letter.id)) s.shown.set(letter.id, letter);
      }
      for (const letter of items) noteNewest(letter);
      const seq = cursorSeq(data?.latest);
      if (seq !== null) {
        s.cursor = seq;
        s.cursorText = data.latest;
      }
      if (Number.isSafeInteger(data?.modSeq)) s.modSeq = data.modSeq;
      if (typeof data?.live === 'boolean') s.live = data.live;
      if (data?.closed === true) s.closed = true;
      else reopen(data, null);
      if (data && Object.hasOwn(data, 'closesAt')) s.closesAt = data.closesAt ?? null;
      s.nextCursor = data?.nextCursor ?? null;
      setCounts(data);
      if (seq !== null && Number.isSafeInteger(data?.modSeq)) s.lastPulse = { seq, modSeq: data.modSeq };
      return actions({ counts: this.counts() });
    },

    addPage(data) {
      const result = actions();
      const items = (data?.items || []).filter(letter =>
        letter?.id && !s.shown.has(letter.id) && !s.removed.has(letter.id));
      for (const letter of items) s.shown.set(letter.id, letter);
      s.nextCursor = data?.nextCursor ?? null;
      result.append = items;
      result.fetchModeration = moderationRequest(data?.modSeq);
      result.counts = this.counts();
      return result;
    },

    applyPulse(p, nowMs = 0) {
      const seq = cursorSeq(p?.latestSeq);
      if (seq === null || !Number.isSafeInteger(p?.modSeq)) return actions({ stale: true });
      if (s.lastPulse && (p.modSeq < s.lastPulse.modSeq || seq < s.lastPulse.seq)) {
        return actions({ stale: true });
      }
      const result = actions();
      const resumed = Boolean(s.lastPulse) && !s.live && p.live === true;
      const wasStalled = s.stalled;
      s.lastPulse = { seq, modSeq: p.modSeq };
      s.lastOkAt = nowMs;
      s.stalled = false;
      s.live = p.live !== false;
      if (p.closed === true) closeSwap(result);
      else reopen(p, result);
      if (Object.hasOwn(p, 'closesAt')) s.closesAt = p.closesAt ?? null;
      result.fetchModeration = moderationRequest(p.modSeq);
      if (!result.fetchModeration) result.edit.push(...s.pendingEdits);
      if (resumed || wasStalled) result.rowNow = true;
      if (!flowing()) {
        result.rowNow = true;
        result.counts = this.counts();
        return result;
      }
      for (const letter of p.recent || []) noteNewest(letter);
      if (seq > s.cursor && seq - s.cursor > gapLimit) {
        result.fetchAfter = { cursor: s.cursorText ?? '' };
      } else {
        if (seq > s.cursor) {
          gatherInto(result, p.recent, nowMs);
          s.cursor = seq;
          s.cursorText = p.latestSeq;
        }
        setCounts(p);
      }
      result.flush = s.queue.length > 0;
      result.counts = this.counts();
      return result;
    },

    applyModeration(data) {
      if (Number.isSafeInteger(data?.latest) && data.latest < s.modSeq) return actions({ stale: true });
      const result = actions();
      for (const item of data?.items || []) {
        if (!item?.id) continue;
        if (item.visible === false) {
          s.pendingEdits.delete(item.id);
          if (!flowing() && !s.removed.has(item.id)) {
            const counted = [...s.queue, ...s.held].find(letter => letter.id === item.id) ||
              (s.gone.has(item.id) ? null : s.shown.get(item.id));
            if (counted && !s.uncounted.has(item.id)) dropCount(counted);
          }
          s.removed.add(item.id);
          s.queue = s.queue.filter(letter => letter.id !== item.id);
          s.held = s.held.filter(letter => letter.id !== item.id);
          if (s.shown.has(item.id) && !s.gone.has(item.id)) {
            s.gone.add(item.id);
            result.tombstone.push(item.id);
          }
          if (s.newest?.id === item.id) recomputeNewest();
        } else if (item.visible === true) {
          s.removed.delete(item.id);
          if (s.gone.has(item.id) || !known(item.id)) {
            s.pendingEdits.delete(item.id);
            result.restore.push(item.id);
          } else if (item.action === 'edit') {
            s.pendingEdits.add(item.id);
            result.edit.push(item.id);
          } else {
            s.pendingEdits.delete(item.id);
          }
        }
      }
      if (Number.isSafeInteger(data?.latest) && data.latest > s.modSeq) s.modSeq = data.latest;
      if (data?.hasMore) result.fetchModeration = { after: s.modSeq };
      result.counts = this.counts();
      return result;
    },

    applyBatch(data, nowMs = 0) {
      if (Number.isSafeInteger(data?.modSeq) && data.modSeq < s.modSeq) return actions({ stale: true });
      const result = actions();
      if (!flowing()) return actions({ fetchModeration: moderationRequest(data?.modSeq), counts: this.counts() });
      gatherInto(result, data?.items, nowMs);
      const seq = cursorSeq(data?.latest);
      if (seq !== null && seq > s.cursor) {
        s.cursor = seq;
        s.cursorText = data.latest;
      }
      if (!data?.hasMore) setCounts(data);
      if (data?.hasMore) result.fetchAfter = { cursor: s.cursorText ?? '' };
      result.fetchModeration = moderationRequest(data?.modSeq);
      result.flush = s.queue.length > 0;
      result.counts = this.counts();
      return result;
    },

    admitRestored(letter) {
      const result = actions();
      if (!letter?.id || s.removed.has(letter.id)) return result;
      if (s.gone.has(letter.id)) {
        s.gone.delete(letter.id);
        s.shown.set(letter.id, letter);
        noteNewest(letter);
        result.insert = [letter];
        result.asked = true;
        return result;
      }
      if (known(letter.id)) return result;
      const numbers = [...s.shown.values()].map(numberOf).filter(n => n > 0);
      const lowest = numbers.length ? Math.min(...numbers) : 0;
      if (numbers.length && numberOf(letter) < lowest && s.nextCursor) return result;
      if (s.newerAbove && numbers.length && numberOf(letter) > Math.max(...numbers)) return result;
      markShown([letter]);
      result.insert = [letter];
      result.asked = true;
      result.counts = this.counts();
      return result;
    },

    admitEdited(letter) {
      if (!letter?.id || s.removed.has(letter.id)) return false;
      s.pendingEdits.delete(letter.id);
      s.queue = s.queue.map(item => item.id === letter.id ? letter : item);
      s.held = s.held.map(item => item.id === letter.id ? letter : item);
      if (!s.shown.has(letter.id) || s.gone.has(letter.id)) {
        if (s.newest?.id === letter.id) s.newest = letter;
        return false;
      }
      s.shown.set(letter.id, letter);
      if (s.newest?.id === letter.id) s.newest = letter;
      return true;
    },

    flushIfIdle(idle, nowMs = 0) {
      const result = actions();
      if (!s.queue.length) {
        overflowToTop();
        return result;
      }
      if (!idle) return actions({ flush: true, deferred: true });
      if (!flowing()) return result;
      if (s.hold) {
        forgetJustIn(s.queue);
        s.held = bounded([...s.held, ...s.queue]);
        s.queue = [];
        result.rowNow = true;
        result.counts = this.counts();
        return result;
      }
      const items = fresh(s.queue);
      s.queue = [];
      insertNow(items, result);
      result.arrived = items.length;
      result.counts = this.counts();
      return result;
    },

    setHold(on, nowMs = 0) {
      const result = actions({ rowNow: true });
      s.hold = Boolean(on);
      if (s.hold) {
        if (s.queue.length) {
          forgetJustIn(s.queue);
          s.held = bounded([...s.held, ...s.queue]);
          s.queue = [];
        }
      } else {
        const items = bounded([...s.held, ...s.queue]);
        s.held = [];
        s.queue = [];
        forgetJustIn(items);
        insertNow(items, result);
        result.asked = true;
      }
      result.counts = this.counts();
      void nowMs;
      return result;
    },

    showHeld(nowMs = 0) {
      const result = actions({ rowNow: true, asked: true });
      const items = fresh(s.held);
      s.held = [];
      forgetJustIn(items);
      insertNow(items, result);
      result.counts = this.counts();
      void nowMs;
      return result;
    },

    pollFailed(nowMs = 0) {
      const result = actions();
      if (!s.closed && !s.stalled && nowMs - s.lastOkAt >= stallMs) {
        s.stalled = true;
        result.rowNow = true;
      }
      return result;
    },

    cutoff(nowMs = 0) {
      const result = actions();
      const at = s.closesAt === null ? NaN : Date.parse(s.closesAt);
      if (Number.isFinite(at) && nowMs >= at) closeSwap(result, { cutAt: s.closesAt });
      return result;
    },

    row(nowMs = 0) {
      if (!s.lastPulse) return { kind: 'none', number: 0, id: null, own: false, heldCount: 0, now: false };
      if (s.stalled) return { kind: 'stalled', number: 0, id: null, own: false, heldCount: 0, now: true };
      const heldNow = s.hold && s.held.length > 0;
      let latest = null;
      if (!s.live || heldNow) {
        for (const letter of s.shown.values()) {
          if (!s.gone.has(letter.id) && !s.removed.has(letter.id) &&
              (!latest || numberOf(letter) > numberOf(latest))) latest = letter;
        }
      } else {
        latest = s.newest;
      }
      const base = {
        number: numberOf(latest), id: latest?.id ?? null,
        own: Boolean(latest && isOwn(latest.id)), heldCount: s.held.length,
      };
      if (!s.live) return { kind: 'paused', ...base, own: false, now: true };
      if (heldNow) return { kind: 'held', ...base, now: true };
      if (s.justIn && nowMs - s.justIn.at < justInMs && s.justIn.number === base.number) {
        return { kind: 'justIn', ...base, now: false };
      }
      return { kind: 'latest', ...base, now: false };
    },

    counts() {
      const waiting = [...s.queue, ...s.held].filter(letter => !s.uncounted.has(letter.id));
      const dayCounts = { ...s.counts.dayCounts };
      for (const letter of waiting) {
        if (dayCounts[letter.dayKey] > 1) dayCounts[letter.dayKey] -= 1;
        else delete dayCounts[letter.dayKey];
      }
      return { publishedCount: Math.max(0, s.counts.publishedCount - waiting.length), dayCounts };
    },

    get closed() { return s.closed; },
    get live() { return s.live; },
    get hold() { return s.hold; },
    get newerAbove() { return s.newerAbove; },
    get queued() { return s.queue.length; },
    get heldCount() { return s.held.length; },
    get nextCursor() { return s.nextCursor; },
    get closesAt() { return s.closesAt; },
    get lastOkAt() { return s.lastOkAt; },
    isShown(id) { return s.shown.has(id) && !s.gone.has(id); },
    isRemoved(id) { return s.removed.has(id); },

    snapshot() {
      return {
        cursor: s.cursor, cursorText: s.cursorText, modSeq: s.modSeq,
        shown: [...s.shown.keys()].filter(id => !s.gone.has(id)),
        gone: [...s.gone], removed: [...s.removed],
        queue: s.queue.map(letter => letter.id), held: s.held.map(letter => letter.id),
        hold: s.hold, live: s.live, closed: s.closed, closesAt: s.closesAt,
        stalled: s.stalled, newerAbove: s.newerAbove, overflow: s.overflow,
        nextCursor: s.nextCursor, counts: this.counts(),
      };
    },
  };
}
