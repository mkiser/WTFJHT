export function ensureAnnouncer(root) {
  let announcer = root.querySelector('#d40-announce');
  if (announcer) return announcer;
  announcer = root.ownerDocument.createElement('div');
  announcer.id = 'd40-announce';
  announcer.className = 'sr-only';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  root.appendChild(announcer);
  return announcer;
}

const revisions = new WeakMap();

export function createAnnouncer(document, { setTimeout = globalThis.setTimeout } = {}) {
  const root = document.getElementById('dear-2040');
  if (!root) throw new Error('Dear 2040 mount is missing');
  const announcer = ensureAnnouncer(root);
  return text => {
    const current = (revisions.get(announcer) || 0) + 1;
    revisions.set(announcer, current);
    announcer.textContent = '';
    setTimeout(() => {
      if (current === revisions.get(announcer)) announcer.textContent = text;
    }, 100);
  };
}
