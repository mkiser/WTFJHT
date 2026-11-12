import { startSky } from './sky.js';

export const COUNTS_PATH = '/pulse?fields=counts';

export function mountLanding(win, deps = {}) {
  const doc = win.document;
  const html = doc.documentElement;
  const root = doc.getElementById('dear-2040');
  const now = deps.now || Date.now;
  let closesAt = NaN;
  let early = win.d40Early;
  let offset = 0;
  let timer;
  let turn = 0;
  try {
    closesAt = Date.parse(JSON.parse(doc.getElementById('d40-edition').textContent).closesAt);
  } catch { }
  if (deps.sky !== false) startSky(win);

  const phase = () => html.getAttribute('data-d40-state');
  const shown = node => {
    for (; node && node !== root; node = node.parentElement) {
      const when = node.getAttribute('data-d40-when');
      if (node.hidden || (when && !when.split(' ').includes(phase()))) return false;
    }
    return true;
  };
  const say = () => {
    const box = doc.getElementById('d40-announce');
    const text = root.querySelector(phase() === 'paused' ? '#d40-paused p' : '#d40-closedlead :not([hidden])')?.textContent;
    const mine = ++turn;
    box.textContent = '';
    win.setTimeout(() => { if (mine === turn) box.textContent = text; }, 100);
  };
  const setPhase = (next, dated = true) => {
    for (const node of root.querySelectorAll('[data-d40-group="closed-lead"]')) {
      node.hidden = dated === (node.getAttribute('data-d40-block') === 'closed-early');
    }
    if (phase() === next) return;
    const active = doc.activeElement;
    html.setAttribute('data-d40-state', next);
    if (active && root.contains(active) && !shown(active)) doc.getElementById('d40-h1').focus({ preventScroll: true });
    if (next !== 'open') say();
  };
  const arm = () => {
    win.clearTimeout(timer);
    const wait = closesAt - now() - offset;
    if (phase() !== 'open') return;
    if (wait <= 0) setPhase('closed');
    else if (wait > 0) timer = win.setTimeout(arm, Math.min(wait, 2e9));
  };
  const check = async () => {
    const pending = early?.path === COUNTS_PATH ? early.response
      : win.d40Base && win.fetch?.(win.d40Base + COUNTS_PATH, { cache: 'no-store', credentials: 'omit' });
    early = null;
    try {
      const response = await pending;
      const body = await response.json().catch(() => ({})) || {};
      if ((response.status === 503 && body.error === 'OFFLINE') || body.mode === 'offline') setPhase('paused');
      else if (response.ok && typeof body.closed === 'boolean') {
        const server = Date.parse(body.serverNow);
        if (Number.isFinite(server)) offset = server - now();
        if (body.closed) setPhase('closed', !(now() + offset < closesAt));
        else {
          setPhase('open');
          arm();
        }
      }
    } catch { }
  };

  doc.getElementById('d40-retry')?.addEventListener('click', () => check().then(() => {
    if (phase() === 'paused') say();
  }));
  arm();
  return { ready: check() };
}

if (typeof window !== 'undefined' && window.document) mountLanding(window);
