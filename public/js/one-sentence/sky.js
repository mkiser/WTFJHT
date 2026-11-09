function wander(t, seed) {
  return (Math.sin(t * 0.31 + seed) + Math.sin(t * 0.173 + seed * 2.3) * 0.7 + Math.sin(t * 0.097 + seed * 4.1) * 0.5) / 2.2;
}

export function startLight(win, deps = {}) {
  const document = win?.document;
  if (!document?.body || typeof win.requestAnimationFrame !== 'function') return null;
  if (document.querySelector('.d40-light')) return null;
  const layer = document.createElement('div');
  layer.className = 'd40-light';
  layer.setAttribute('aria-hidden', 'true');
  const depths = [
    { depth: 0.35, size: 1.25, glow: 0.52, lane: 0.28, x: 0.18, seed: 0.4 },
    { depth: 0.65, size: 1.0, glow: 0.64, lane: 0.66, x: 0.78, seed: 3.1 },
    { depth: 1.0, size: 0.8, glow: 0.72, lane: 0.46, x: 0.42, seed: 5.8 },
  ];
  const random = typeof deps.random === 'function' ? deps.random : Math.random;
  const clouds = depths.map((spec, i) => {
    const node = document.createElement('div');
    node.className = `d40-cloud d40-cloud-${i}`;
    const puffs = [0, 1, 2].map(j => {
      const puff = document.createElement('span');
      puff.className = `d40-puff d40-puff-${j}`;
      node.appendChild(puff);
      puff.style.setProperty('--d40-tint-delay', `${(-random() * 70).toFixed(1)}s`);
      return { node: puff, seed: spec.seed + j * 1.37 + random() * 50 };
    });
    layer.appendChild(node);
    const side = random() < 0.5 ? 0.08 + 0.3 * random() : 0.62 + 0.3 * random();
    return { ...spec, seed: spec.seed + random() * 50, x: side, lane: 0.1 + 0.8 * random(), node, puffs,
      px: 0, py: 0, heading: random() * Math.PI * 2, placed: false };
  });
  document.body.prepend(layer);
  let last = 0, raf = 0, t = random() * 4000, sized = 0, lastW = 0, tallest = 0;
  const quiet = win.matchMedia?.('print, (forced-colors: active)');
  const calm = Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const still = () => document.hidden || Boolean(quiet?.matches);
  const frame = now => {
    if (!calm) raf = win.requestAnimationFrame(frame);
    if (still()) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    const w = win.innerWidth || 1;
    if (lastW && lastW !== w) {
      const old = tallest;
      tallest = win.innerHeight || 1;
      for (const cloud of clouds) { cloud.px *= w / lastW; cloud.py *= tallest / Math.max(1, old); }
    }
    tallest = Math.max(tallest, win.innerHeight || 1);
    const h = tallest;
    lastW = w;
    const phone = w < 640;
    const unit = Math.max(w, h);
    t += dt * (phone ? 0.6 : 1);
    for (const cloud of clouds) {
      const cw = unit * 0.62 * cloud.size;
      if (sized !== w * 10000 + h) {
        cloud.node.style.width = `${cw.toFixed(0)}px`;
        cloud.node.style.height = `${(cw * 0.6).toFixed(0)}px`;
      }
      if (!cloud.placed) { cloud.px = w * cloud.x; cloud.py = h * cloud.lane; cloud.placed = true; }
      const column = Math.min(w * 0.5, 380);
      const fromCenter = (cloud.px - w / 2) / Math.max(1, column);
      const over = Math.exp(-(fromCenter * fromCenter) / 0.5);
      cloud.heading += 0.35 * wander(t * 0.3, cloud.seed + 2.6) * dt;
      const cruise = unit * (phone ? 0.012 : 0.02) * (0.45 + 0.55 * cloud.depth) * (0.75 + 0.25 * wander(t * 0.13, cloud.seed + 7.2)) * (1 + 0.6 * over);
      cloud.px += Math.cos(cloud.heading) * cruise * dt;
      cloud.py += Math.sin(cloud.heading) * cruise * dt;
      const left = 0.06 * w, right = 0.94 * w, top = 0.06 * h, bottom = 0.94 * h;
      if (cloud.px < left && Math.cos(cloud.heading) < 0) cloud.heading = Math.PI - cloud.heading;
      if (cloud.px > right && Math.cos(cloud.heading) > 0) cloud.heading = Math.PI - cloud.heading;
      if (cloud.py < top && Math.sin(cloud.heading) < 0) cloud.heading = -cloud.heading;
      if (cloud.py > bottom && Math.sin(cloud.heading) > 0) cloud.heading = -cloud.heading;
      const centered = Math.exp(-(fromCenter * fromCenter) / 0.5);
      const gather = 0.5 + 0.5 * wander(t * 0.09, cloud.seed + 1.9);
      const glow = cloud.glow * (phone ? 0.75 : 1) * (0.5 + 0.5 * gather) * (phone ? 1 - 0.62 * centered : 1);
      const stretch = 1 + 0.12 * wander(t * 0.23, cloud.seed + 6.1);
      cloud.node.style.transform = `translate3d(${(cloud.px - cw / 2).toFixed(1)}px, ${(cloud.py - cw * 0.3).toFixed(1)}px, 0) scale(${stretch.toFixed(3)}, ${(2 - stretch).toFixed(3)})`;
      cloud.node.style.opacity = glow.toFixed(3);
      for (const puff of cloud.puffs) {
        const ox = 18 * wander(t * 0.11, puff.seed);
        const oy = 14 * wander(t * 0.09, puff.seed + 2.2);
        const grow = 1 + 0.18 * wander(t * 0.15, puff.seed + 3.7);
        puff.node.style.transform = `translate3d(${ox.toFixed(1)}%, ${oy.toFixed(1)}%, 0) scale(${grow.toFixed(3)})`;
      }
    }
    sized = w * 10000 + h;
  };
  raf = win.requestAnimationFrame(frame);
  return {
    stop() {
      if (raf) win.cancelAnimationFrame?.(raf);
      layer.remove();
    },
  };
}

export function boardBand(hour) {
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 16) return 'day';
  if (hour >= 16 && hour < 20) return 'dusk';
  return 'night';
}

export function markBoardHour(document, now = () => new Date().toISOString()) {
  const at = new Date(now());
  const html = document?.documentElement;
  if (!html?.style || Number.isNaN(at.getTime())) return null;
  const hour = (at.getHours() + at.getMinutes() / 60).toFixed(2);
  html.style.setProperty('--d40-hour', hour);
  html.dataset.d40Band = boardBand(Number(hour));
  return hour;
}

let hourTick = null;

export function startSky(win = globalThis.window, deps = {}) {
  const document = win?.document;
  if (!document) return null;
  try {
    markBoardHour(document, deps.now);
    if (!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      win.requestAnimationFrame?.(() => win.requestAnimationFrame(() => document.documentElement.classList.add('d40-eased')));
    }
    if (!hourTick && typeof win.setInterval === 'function') {
      hourTick = win.setInterval(() => { try { markBoardHour(document, deps.now); } catch { } }, 60_000);
    }
    return startLight(win, deps);
  } catch {
    return null;
  }
}
