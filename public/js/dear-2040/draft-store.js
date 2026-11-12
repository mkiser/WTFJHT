const DRAFT_KEY = 'dear2040:draft:v3';
const LETTER_KEY = 'dear2040:letter:v1';
const PENDING_KEY = 'dear2040:pending:v2';
const KEYS_KEY = 'dear2040:keys:v1';
const KEYS_STORAGE_VERSION = 1;
const KEYS_LIMIT = 8;
const OWN_KEY = 'dear2040:own:v1';
const ARRIVAL_KEY = 'dear2040:arrival:v1';
const OWN_AFTER_CLOSE_MS = 30 * 24 * 60 * 60 * 1000;
const ARRIVAL_TTL_MS = 10 * 60 * 1000;
const LETTER_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LETTER_STORAGE_VERSION = 1;
const DRAFT_STORAGE_VERSION = 3;
const PENDING_STORAGE_VERSION = 2;
const PENDING_KEY_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
const SUBMISSION_SHAPES = Object.freeze([
  'body|editionId|schemaVersion',
  'body|editionId|schemaVersion|termsHash',
  'body|copyVersion|editionId|schemaVersion',
]);
const LETTER_SHAPES = Object.freeze([
  'body|editionId|savedAt|storageVersion',
  'body|copyVersion|editionId|savedAt|storageVersion',
]);

function encodeDraft(draft) {
  const encoded = { editionId: draft.editionId, body: draft.body };
  if (typeof draft.copyVersion === 'string') encoded.copyVersion = draft.copyVersion;
  return encoded;
}

function toDraft(input, config) {
  if (typeof input === 'string') {
    return encodeDraft({ body: input, editionId: config?.editionId, copyVersion: config?.copyVersion });
  }
  if (input && typeof input === 'object' && !Array.isArray(input)) return input;
  return null;
}

function decodeDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.body !== 'string' || typeof value.editionId !== 'string') return null;
  return encodeDraft(value);
}

function validPending(value) {
  if (!value || typeof value !== 'object' || typeof value.key !== 'string' ||
      !PENDING_KEY_PATTERN.test(value.key) || typeof value.payload !== 'string') return null;
  try {
    const submission = JSON.parse(value.payload);
    if (!submission || typeof submission !== 'object' || Array.isArray(submission) ||
        !SUBMISSION_SHAPES.includes(Object.keys(submission).sort().join('|')) ||
        submission.schemaVersion !== 2 || typeof submission.editionId !== 'string' ||
        ('copyVersion' in submission && typeof submission.copyVersion !== 'string') ||
        ('termsHash' in submission && (typeof submission.termsHash !== 'string' || !submission.termsHash)) ||
        typeof submission.body !== 'string') return null;
  } catch { return null; }
  return { key: value.key, payload: value.payload };
}

function read(storage, key) {
  try { return storage?.getItem?.(key) ?? null; } catch { return null; }
}

function write(storage, key, value) {
  try { storage?.setItem?.(key, value); return !!storage?.setItem; } catch { return false; }
}

function remove(storage, key) {
  try { storage?.removeItem?.(key); return !!storage?.removeItem; } catch { return false; }
}

function toMs(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function probeStorage(storage) {
  if (typeof storage?.setItem !== 'function' || typeof storage.getItem !== 'function'
      || typeof storage.removeItem !== 'function') return false;
  const key = 'dear2040:probe';
  try {
    storage.setItem(key, '1');
    const ok = storage.getItem(key) === '1';
    storage.removeItem(key);
    return ok;
  } catch {
    try { storage.removeItem(key); } catch { }
    return false;
  }
}

export function createDraftStore({ sessionStorage, localStorage, now = () => new Date().toISOString() } = {}) {
  let memoryDraft = null;
  let memoryDraftAuthoritative = false;
  let letterStateAuthoritative = false;
  let savedLetter = false;
  let wroteLetter = false;
  let memoryPending = null;
  let memoryPendingAuthoritative = false;
  let memoryKeys = [];
  let memoryKeysAuthoritative = false;
  const ownEntries = new Map();
  let ownStateAuthoritative = false;
  let closeInstant = null;
  let memoryArrival = null;
  let memoryArrivalAuthoritative = false;
  let blocked = !probeStorage(sessionStorage) || !probeStorage(localStorage);
  let lastConfig = null;

  function freshOwnEntries(value) {
    if (!Array.isArray(value)) return [];
    const currentTime = Date.parse(now());
    return value.filter((entry) => {
      if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' ||
          !entry.id || typeof entry.at !== 'string') return false;
      const at = Date.parse(entry.at);
      return Number.isFinite(at) && at <= currentTime &&
        (closeInstant === null || currentTime < closeInstant + OWN_AFTER_CLOSE_MS);
    });
  }

  function allOwnEntries() {
    if (ownStateAuthoritative) return freshOwnEntries([...ownEntries.values()]);
    const raw = read(localStorage, OWN_KEY);
    if (raw === null) return freshOwnEntries([...ownEntries.values()]);
    try { return freshOwnEntries(JSON.parse(raw)); } catch { return freshOwnEntries([...ownEntries.values()]); }
  }

  function stamp() {
    const value = now();
    if (typeof value === 'string') return value;
    const ms = toMs(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : new Date().toISOString();
  }

  function markArrival(id, letter = { id }) {
    if (typeof id !== 'string' || !id) return;
    const record = { id, letter, at: stamp() };
    memoryArrival = record;
    memoryArrivalAuthoritative = !write(sessionStorage, ARRIVAL_KEY, JSON.stringify(record));
  }

  function clearArrival() {
    memoryArrival = null;
    memoryArrivalAuthoritative = !remove(sessionStorage, ARRIVAL_KEY);
  }

  function readArrival() {
    let arrival = memoryArrival;
    if (!memoryArrivalAuthoritative) {
      const raw = read(sessionStorage, ARRIVAL_KEY);
      if (raw !== null) {
        try { arrival = JSON.parse(raw); } catch { arrival = null; }
      }
    }
    if (!arrival || typeof arrival !== 'object' || typeof arrival.id !== 'string' || !arrival.id) {
      return null;
    }
    return arrival;
  }

  function arrivalFresh(arrival) {
    const at = toMs(arrival?.at);
    const current = toMs(now());
    return Number.isFinite(at) && Number.isFinite(current) && current - at < ARRIVAL_TTL_MS;
  }

  function readLetter(config) {
    if (letterStateAuthoritative) return null;
    const raw = read(localStorage, LETTER_KEY);
    if (raw === null) return null;
    let record;
    try { record = JSON.parse(raw); } catch { }
    const currentTime = Date.parse(now());
    const savedTime = Date.parse(record?.savedAt);
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        !LETTER_SHAPES.includes(Object.keys(record).sort().join('|')) ||
        record.storageVersion !== LETTER_STORAGE_VERSION ||
        record.editionId !== config.editionId ||
        ('copyVersion' in record && typeof record.copyVersion !== 'string') ||
        typeof record.body !== 'string' || !record.body || typeof record.savedAt !== 'string' ||
        !Number.isFinite(currentTime) || !Number.isFinite(savedTime) ||
        savedTime > currentTime || currentTime - savedTime >= LETTER_TTL_MS) {
      letterStateAuthoritative = !remove(localStorage, LETTER_KEY);
      savedLetter = false;
      return null;
    }
    savedLetter = true;
    return record;
  }

  function rememberConfig(config) {
    if (config && typeof config === 'object' && typeof config.editionId === 'string') {
      lastConfig = config;
    }
  }

  function load(config) {
    rememberConfig(config);
    const resolved = (config && typeof config.editionId === 'string') ? config : lastConfig;
    let draft = memoryDraftAuthoritative ? memoryDraft : null;
    if (!memoryDraftAuthoritative) {
      const raw = read(sessionStorage, DRAFT_KEY);
      if (raw !== null) {
        try {
          const record = JSON.parse(raw);
          if (record?.storageVersion === DRAFT_STORAGE_VERSION) draft = record.draft;
        } catch { }
      } else draft = memoryDraft;
    }
    const restored = decodeDraft(draft);
    if (!resolved || typeof resolved.editionId !== 'string') return restored;
    const letter = readLetter(resolved);
    if (restored?.editionId === resolved.editionId) {
      if (!restored.body && letter) return { ...restored, body: letter.body };
      return restored;
    }
    if (!letter) return null;
    return encodeDraft({ body: letter.body, editionId: resolved.editionId, copyVersion: resolved.copyVersion });
  }

  function writeDurable(key, value) {
    if (write(localStorage, key, value)) {
      remove(sessionStorage, key);
      return 'local';
    }
    if ((remove(localStorage, key) || read(localStorage, key) === null) && write(sessionStorage, key, value)) {
      return 'session';
    }
    return 'memory';
  }

  function readDurable(key) {
    const raw = read(localStorage, key);
    return raw !== null ? raw : read(sessionStorage, key);
  }

  function removeDurable(key) {
    const local = remove(localStorage, key);
    const session = remove(sessionStorage, key);
    return local && session;
  }

  function readPending() {
    if (memoryPendingAuthoritative) return validPending(memoryPending);
    const raw = readDurable(PENDING_KEY);
    if (raw === null) return null;
    try {
      const record = JSON.parse(raw);
      return record?.storageVersion === PENDING_STORAGE_VERSION ? validPending(record.pending) : null;
    } catch { return null; }
  }

  function freshKeys(list) {
    if (!Array.isArray(list)) return [];
    const currentTime = toMs(now());
    return list.filter((entry) => {
      const at = toMs(entry?.at);
      return validPending(entry) && Number.isFinite(at) &&
        (!Number.isFinite(currentTime) || currentTime - at < LETTER_TTL_MS);
    }).map(entry => ({ key: entry.key, payload: entry.payload, at: entry.at }));
  }

  function readKeys() {
    if (memoryKeysAuthoritative) return freshKeys(memoryKeys);
    const raw = readDurable(KEYS_KEY);
    if (raw === null) return [];
    try {
      const record = JSON.parse(raw);
      return record?.storageVersion === KEYS_STORAGE_VERSION ? freshKeys(record.keys) : [];
    } catch { return []; }
  }

  function writeKeys(list) {
    const kept = list.sort((a, b) => toMs(b.at) - toMs(a.at)).slice(0, KEYS_LIMIT);
    memoryKeys = kept;
    if (!kept.length) {
      memoryKeysAuthoritative = !removeDurable(KEYS_KEY);
      return;
    }
    memoryKeysAuthoritative = writeDurable(KEYS_KEY,
      JSON.stringify({ storageVersion: KEYS_STORAGE_VERSION, keys: kept })) === 'memory';
  }

  function forgetKey(key) {
    const list = readKeys();
    const kept = list.filter(entry => entry.key !== key);
    if (kept.length !== list.length) writeKeys(kept);
  }

  function rememberKey(record) {
    writeKeys([...readKeys().filter(entry => entry.key !== record.key), { ...record, at: stamp() }]);
  }

  function dropRestorable(keys) {
    for (const [storage, key] of keys) remove(storage, key);
    if (keys.some(([storage]) => storage === localStorage)) {
      savedLetter = false;
      wroteLetter = false;
    }
    return keys.every(([storage, key]) => read(storage, key) === null);
  }

  return {
    load,
    restore(config) { return load(config); },
    storageBlocked() { return blocked; },
    save(input) {
      const draft = toDraft(input, lastConfig);
      rememberConfig(draft);
      const encoded = draft ? encodeDraft(draft) : null;
      if (!decodeDraft(encoded)) return { persisted: false };
      memoryDraft = encoded;
      const sessionPersisted = write(sessionStorage, DRAFT_KEY,
        JSON.stringify({ storageVersion: DRAFT_STORAGE_VERSION, draft: memoryDraft }));
      memoryDraftAuthoritative = !sessionPersisted;
      let letterPersisted = true;
      if (encoded.body) {
        savedLetter = write(localStorage, LETTER_KEY, JSON.stringify({
          storageVersion: LETTER_STORAGE_VERSION, editionId: encoded.editionId,
          ...(typeof encoded.copyVersion === 'string' ? { copyVersion: encoded.copyVersion } : {}),
          body: encoded.body, savedAt: now(),
        }));
        wroteLetter = savedLetter;
        letterStateAuthoritative = !savedLetter;
        letterPersisted = savedLetter;
      } else {
        savedLetter = false;
        if (wroteLetter) {
          letterPersisted = remove(localStorage, LETTER_KEY);
          letterStateAuthoritative = !letterPersisted;
        }
        wroteLetter = false;
      }
      const persisted = sessionPersisted && letterPersisted;
      blocked = !persisted;
      return { persisted };
    },
    clear() {
      memoryDraft = null;
      memoryDraftAuthoritative = !remove(sessionStorage, DRAFT_KEY);
      savedLetter = false;
      wroteLetter = false;
      letterStateAuthoritative = !remove(localStorage, LETTER_KEY);
    },
    reload(config) {
      memoryDraft = null;
      memoryDraftAuthoritative = false;
      memoryPending = null;
      memoryPendingAuthoritative = false;
      memoryKeys = [];
      memoryKeysAuthoritative = false;
      letterStateAuthoritative = false;
      savedLetter = false;
      return load(config);
    },
    hasSavedLetter() { return savedLetter; },
    savePending(pending) {
      const record = validPending(pending);
      if (!record) return { persisted: false, safe: false };
      memoryPending = record;
      const where = writeDurable(PENDING_KEY,
        JSON.stringify({ storageVersion: PENDING_STORAGE_VERSION, pending: record }));
      memoryPendingAuthoritative = where === 'memory';
      rememberKey(record);
      let safe = true;
      if (where === 'session') safe = dropRestorable([[localStorage, LETTER_KEY]]);
      else if (where === 'memory') {
        safe = dropRestorable([[localStorage, LETTER_KEY], [sessionStorage, DRAFT_KEY]]);
      }
      return { persisted: where !== 'memory', safe };
    },
    loadPending(_config) {
      return readPending();
    },
    clearPending(key) {
      const current = readPending();
      const target = typeof key === 'string' ? key : current?.key;
      if (typeof target === 'string') forgetKey(target);
      if (typeof key === 'string' && current && current.key !== key) return;
      memoryPending = null;
      memoryPendingAuthoritative = !removeDurable(PENDING_KEY);
    },
    markSent(pending) {
      const record = validPending(pending);
      if (!record) return;
      const current = readPending();
      if (!current || current.key === record.key) {
        memoryPending = null;
        memoryPendingAuthoritative = !removeDurable(PENDING_KEY);
      }
      rememberKey(record);
    },
    keyFor(payload) {
      if (typeof payload !== 'string') return null;
      const current = readPending();
      if (current?.payload === payload) return current;
      const matches = readKeys().filter(entry => entry.payload === payload)
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
      return matches.length ? { key: matches[0].key, payload: matches[0].payload } : null;
    },
    setCloseInstant(closesAt) {
      if (closesAt === null || closesAt === undefined) {
        closeInstant = null;
        return;
      }
      const instant = Date.parse(closesAt);
      closeInstant = Number.isFinite(instant) ? instant : null;
    },
    markOwn(id, details) {
      if (typeof id !== 'string' || !id) return;
      if (details === undefined) {
        const existing = readArrival();
        if (!(existing?.id === id && arrivalFresh(existing))) markArrival(id);
      }
      const at = now();
      const letterNumber = typeof details === 'number' ? details : details?.letterNumber;
      const dayKey = details?.dayKey;
      let entries = allOwnEntries();
      entries = entries.filter((entry) => entry.id !== id);
      entries.push({ id, at, n: Number.isSafeInteger(letterNumber) && letterNumber > 0
        ? letterNumber : null, day: typeof dayKey === 'string' ? dayKey : null });
      ownEntries.clear();
      for (const entry of entries) ownEntries.set(entry.id, entry);
      ownStateAuthoritative = !write(localStorage, OWN_KEY, JSON.stringify(entries));
    },
    markArrival(id, letter) {
      markArrival(id, letter);
    },
    consumeArrival(id) {
      const arrival = readArrival();
      if (!arrival) return null;
      clearArrival();
      if (!arrivalFresh(arrival) || arrival.id !== id || typeof id !== 'string') return null;
      return arrival.letter ?? null;
    },
    isOwn(id) {
      return allOwnEntries().some(entry => entry.id === id);
    },
    latestOwn() {
      const entries = allOwnEntries().sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      const latest = entries.find(entry => Number.isSafeInteger(entry?.n) && entry.n > 0);
      return latest ? { id: latest.id, letterNumber: latest.n } : null;
    },
    ownLetters() {
      return allOwnEntries().map(entry => ({ id: entry.id, letterNumber: entry.n ?? null,
        dayKey: entry.day ?? null, at: entry.at }));
    },
    forgetOwn(id) {
      const entries = allOwnEntries().filter(entry => entry.id !== id);
      ownEntries.clear();
      for (const entry of entries) ownEntries.set(entry.id, entry);
      ownStateAuthoritative = !write(localStorage, OWN_KEY, JSON.stringify(entries));
    },
  };
}
