const WIDTH = 1080;
const MARGIN = 96;
const FORMATS = Object.freeze({
  post: Object.freeze({ height: 1350, marginY: MARGIN }),
  story: Object.freeze({ height: 1920, marginY: 250 }),
});
const LOGO_SIZE = 88;
const LOGO_TEXT_GAP = 24;
const RULE = Object.freeze({ height: 3, gapAfter: 24 });
const FOOTER_GAP = 72;
const FIT = Object.freeze({ minBody: 24, maxBody: 60, steps: 14 });
const STYLES = Object.freeze({
  title: Object.freeze({ fontSize: 34, lineHeight: 46, gap: 44 }),
  body: Object.freeze({ fontSize: 46, lineHeight: 74, gap: 64 }),
  stamp: Object.freeze({ fontSize: 34, lineHeight: 50, gap: 0 }),
  attribution: Object.freeze({ fontSize: 34, lineHeight: 42, gap: 0 }),
});

const PIECES = /\r\n|\r|\n|[^\S\r\n]+|\S+/gu;

function graphemes(value) {
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)]
      .map(({ segment }) => segment);
  }
  return [...value];
}

export function atomsOf(runs) {
  const atoms = [];
  let open = null;
  const close = () => {
    if (open) atoms.push(open);
    open = null;
  };
  for (const run of runs) {
    for (const piece of String(run.text ?? '').match(PIECES) || []) {
      if (/^[\r\n]/u.test(piece)) {
        close();
        atoms.push({ lineBreak: true, fragments: [] });
      } else if (/^\s/u.test(piece)) {
        close();
      } else {
        open = open || { lineBreak: false, fragments: [] };
        open.fragments.push({ text: piece, kind: run.kind });
      }
    }
  }
  close();
  return atoms;
}

function widthOf(fragments, measure, fontSize) {
  return fragments.reduce((sum, fragment) => sum + measure(fragment.text, fragment.kind, fontSize), 0);
}

function splitAtom(atom, measure, fontSize, width) {
  const pieces = [];
  let line = [];
  let used = 0;
  for (const fragment of atom.fragments) {
    for (const cluster of graphemes(fragment.text)) {
      const size = measure(cluster, fragment.kind, fontSize);
      if (line.length && used + size > width) {
        pieces.push(line);
        line = [];
        used = 0;
      }
      const last = line[line.length - 1];
      if (last?.kind === fragment.kind) last.text += cluster;
      else line.push({ text: cluster, kind: fragment.kind });
      used += size;
    }
  }
  if (line.length) pieces.push(line);
  return pieces;
}

export function wrapRuns(runs, measure, fontSize, width) {
  const lines = [];
  const space = measure(' ', 'frame', fontSize);
  let line = [];
  let used = 0;
  const flush = () => {
    lines.push(line);
    line = [];
    used = 0;
  };
  const place = (fragments, size) => {
    const gap = line.length ? space : 0;
    let x = used + gap;
    fragments.forEach((fragment, index) => {
      line.push({ ...fragment, x, spaced: index === 0 && gap > 0 });
      x += measure(fragment.text, fragment.kind, fontSize);
    });
    used += gap + size;
  };
  for (const atom of atomsOf(runs)) {
    if (atom.lineBreak) {
      flush();
      continue;
    }
    const size = widthOf(atom.fragments, measure, fontSize);
    if (line.length && used + space + size > width) flush();
    if (size <= width) {
      place(atom.fragments, size);
      continue;
    }
    for (const piece of splitAtom(atom, measure, fontSize, width)) {
      if (line.length) flush();
      place(piece, widthOf(piece, measure, fontSize));
    }
  }
  if (line.length) flush();
  return lines;
}

function scaled(style, factor) {
  return {
    fontSize: style.fontSize * factor,
    lineHeight: style.lineHeight * factor,
    gap: style.gap * factor,
  };
}

function compose(parts, measure, scale, height, marginY) {
  const contentWidth = WIDTH - MARGIN * 2;
  const meta = Math.min(1, scale);
  const styles = {
    title: scaled(STYLES.title, meta),
    body: scaled(STYLES.body, scale),
    stamp: scaled(STYLES.stamp, meta),
    attribution: scaled(STYLES.attribution, meta),
  };
  const plain = (text, kind) => wrapRuns([{ kind, text: String(text ?? '') }], measure, styles[kind].fontSize, contentWidth);
  const titleLines = parts.title ? plain(parts.title, 'title') : [];
  const bodyLines = wrapRuns(parts.runs, measure, styles.body.fontSize, contentWidth);
  const stampLines = parts.stamp ? plain(parts.stamp, 'stamp') : [];
  const attributionWidth = contentWidth - LOGO_SIZE - LOGO_TEXT_GAP;
  const attributionLines = parts.attribution
    ? wrapRuns([{ kind: 'attribution', text: String(parts.attribution) }], measure, styles.attribution.fontSize, attributionWidth)
    : [];

  const titleBlock = titleLines.length ? titleLines.length * styles.title.lineHeight + styles.title.gap : 0;
  const bodyBlock = bodyLines.length * styles.body.lineHeight + styles.body.gap;
  const stampBlock = stampLines.length * styles.stamp.lineHeight;
  const attributionBlock = attributionLines.length * styles.attribution.lineHeight;
  const footerBlock = Math.max(LOGO_SIZE, attributionBlock);
  const reserved = titleBlock + bodyBlock + RULE.height + RULE.gapAfter + stampBlock + FOOTER_GAP + footerBlock;
  const finalHeight = Math.max(height, Math.ceil(reserved + marginY * 2));
  let y = marginY + Math.max(0, (finalHeight - marginY * 2 - reserved) / 2);

  const lines = [];
  const lay = (rows, kind, x) => {
    const lineHeight = styles[kind].lineHeight;
    for (const row of rows) {
      lines.push({
        role: kind,
        y,
        lineHeight,
        fontSize: styles[kind].fontSize,
        fragments: row.map(fragment => ({ ...fragment, x: x + fragment.x })),
      });
      y += lineHeight;
    }
  };

  lay(titleLines, 'title', MARGIN);
  if (titleLines.length) y += styles.title.gap;
  lay(bodyLines, 'body', MARGIN);
  y += styles.body.gap;
  const rule = { x: MARGIN, y, width: contentWidth, height: RULE.height };
  y += RULE.height + RULE.gapAfter;
  lay(stampLines, 'stamp', MARGIN);
  y += FOOTER_GAP;
  const footerTop = y;
  const logo = { x: MARGIN, y: footerTop + (footerBlock - LOGO_SIZE) / 2, width: LOGO_SIZE, height: LOGO_SIZE };
  y = footerTop + (footerBlock - attributionBlock) / 2;
  lay(attributionLines, 'attribution', MARGIN + LOGO_SIZE + LOGO_TEXT_GAP);

  return {
    width: WIDTH,
    height: finalHeight,
    marginY,
    contentWidth,
    fits: reserved + marginY * 2 <= height,
    bodyFontSize: styles.body.fontSize,
    lines,
    rule,
    logo,
  };
}

export function layoutSentenceImage(parts, measure, { format = 'post' } = {}) {
  const { height, marginY } = FORMATS[format] || FORMATS.post;
  const base = STYLES.body.fontSize;
  let low = FIT.minBody / base;
  let high = FIT.maxBody / base;
  const smallest = compose(parts, measure, low, height, marginY);
  if (!smallest.fits) return smallest;
  for (let step = 0; step < FIT.steps; step += 1) {
    const middle = (low + high) / 2;
    if (compose(parts, measure, middle, height, marginY).fits) low = middle;
    else high = middle;
  }
  return compose(parts, measure, low, height, marginY);
}

export function bodyWords(layout) {
  return layout.lines
    .filter(line => line.role === 'body')
    .map(line => line.fragments.map(fragment => (fragment.spaced ? ' ' : '') + fragment.text).join(''))
    .join(' ');
}
