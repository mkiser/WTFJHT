const TOKEN = /\{([A-Za-z]+)\}/g;
export const PHASES = Object.freeze(['open', 'closed', 'paused']);

export const missingMessages = new Set();

function docOf(node) {
  return node?.ownerDocument || node || globalThis.document;
}

export function fillCopy(template, tokens = {}) {
  return String(template ?? '').replace(TOKEN, (match, name) =>
    Object.prototype.hasOwnProperty.call(tokens, name) ? String(tokens[name]) : match);
}

export function formatCount(value) {
  return Number(value).toLocaleString('en-US');
}

function messageNode(document, name) {
  const selector = `[data-msg="${name}"]`;
  const found = document?.querySelector?.(selector);
  if (found) return found;
  for (const template of document?.querySelectorAll?.('template') || []) {
    const inside = template.content?.querySelector?.(selector);
    if (inside) return inside;
  }
  return null;
}

function noteMissing(name) {
  if (missingMessages.has(name)) return;
  missingMessages.add(name);
  try {
    if (globalThis.window) globalThis.window.d40MissingMessages = [...missingMessages];
  } catch { }
}

export function msg(name, tokens, document = globalThis.document) {
  const node = messageNode(document, name);
  if (!node) {
    noteMissing(name);
    return '';
  }
  return tokens ? fillCopy(node.textContent, tokens) : node.textContent;
}

export function readMessages(document = globalThis.document) {
  const groups = new Map();
  const group = name => {
    if (!groups.has(name)) {
      groups.set(name, new Proxy({}, {
        get(_target, key) {
          if (typeof key !== 'string' || key === 'then' || key === 'toJSON') return undefined;
          return msg(`${name}.${key}`, undefined, document);
        },
        has(_target, key) {
          return typeof key === 'string' && messageNode(document, `${name}.${key}`) !== null;
        },
      }));
    }
    return groups.get(name);
  };
  return new Proxy({}, {
    get(_target, key) {
      if (typeof key !== 'string' || key === 'then' || key === 'toJSON') return undefined;
      return group(key);
    },
  });
}

export function slot(root, name) {
  return root?.querySelector?.(`[data-slot="${name}"]`) ?? null;
}

export function fillSlot(root, name, value) {
  const node = slot(root, name);
  if (!node) return null;
  if (value?.nodeType) node.replaceChildren(value);
  else node.textContent = value == null ? '' : String(value);
  return node;
}

export function block(root, name) {
  return root?.querySelector?.(`[data-d40-block="${name}"]`) ?? null;
}

export function showBlock(root, name, shown = true) {
  const node = block(root, name);
  if (node) node.hidden = !shown;
  return node;
}

export function hideBlock(root, name) {
  return showBlock(root, name, false);
}

export function showOnly(root, group, name) {
  let shown = null;
  for (const node of root?.querySelectorAll?.(`[data-d40-group="${group}"]`) || []) {
    const match = node.getAttribute('data-d40-block') === name;
    node.hidden = !match;
    if (match) shown = node;
  }
  return shown;
}

export function cloneTemplate(document, id) {
  const template = document.getElementById(id);
  const first = template?.content?.firstElementChild;
  return first ? first.cloneNode(true) : null;
}

export function stripHooks(node) {
  for (const element of [node, ...(node?.querySelectorAll?.('[data-slot], [data-msg]') || [])]) {
    element?.removeAttribute?.('data-slot');
    element?.removeAttribute?.('data-msg');
  }
  return node;
}

export function phase(document = globalThis.document) {
  return document?.documentElement?.getAttribute('data-d40-state') || null;
}

export function setPhase(document, next) {
  if (!PHASES.includes(next)) throw new RangeError(`Unknown Dear 2040 phase: ${next}`);
  const html = docOf(document)?.documentElement;
  if (html && html.getAttribute('data-d40-state') !== next) html.setAttribute('data-d40-state', next);
  return next;
}
