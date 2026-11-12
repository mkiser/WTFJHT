const WIDTH = 1080;
const MARGIN = 96;
const FORMATS = Object.freeze({
  post: Object.freeze({ height: 1350, marginY: MARGIN }),
  story: Object.freeze({ height: 1920, marginY: 250 }),
});
const LOGO_SIZE = 88;
const LOGO_TEXT_GAP = 24;

const STYLES = {
  numberLine: { fontSize: 38, lineHeight: 38, inset: 0, gap: 56 },
  salutation: { fontSize: 46, lineHeight: 74, inset: 14, gap: 26 },
  body: { fontSize: 46, lineHeight: 74, inset: 14, gap: 64 },
  dateLabel: { fontSize: 38, lineHeight: 56, inset: 9, gap: 0 },
  attribution: { fontSize: 36, lineHeight: 36, inset: 0, gap: 0 },
};

const RULE = Object.freeze({ height: 3, gapAfter: 24 });
const FOOTER = Object.freeze({ reserved: 96, painted: 60 });

const DEFAULT_CHUNKS = /\s+|\S+/gu;
const STAMP_CHUNKS = /[^\S\u00a0]+|[\S\u00a0]+/gu;
const STAMP_SEPARATOR = ' · ';

function graphemes(value) {
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)]
      .map(({ segment }) => segment);
  }
  return [...value];
}

function wrapSegment(segment, measure, width, role, chunkPattern = DEFAULT_CHUNKS) {
  if (segment === '') return [''];
  const chunks = segment.match(chunkPattern) || [];
  const lines = [];
  let line = '';

  function appendChunk(chunk) {
    if (measure(line + chunk, role) <= width) {
      line += chunk;
      return;
    }
    if (line) {
      lines.push(line);
      line = '';
    }
    if (measure(chunk, role) <= width) {
      line = chunk;
      return;
    }
    for (const cluster of graphemes(chunk)) {
      if (line && measure(line + cluster, role) > width) {
        lines.push(line);
        line = '';
      }
      line += cluster;
    }
  }

  for (const chunk of chunks) appendChunk(chunk);
  lines.push(line);
  return lines;
}

function layoutRole(value, role, measure, width, x, startY, chunkPattern, styles = STYLES) {
  const lines = [];
  let y = startY;
  const breaks = value.match(/\r\n|\r|\n/gu) || [];
  const segments = value.split(/\r\n|\r|\n/u);
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const wrapped = wrapSegment(segments[segmentIndex], (text, r) => measure(text, r, styles[r].fontSize),
      width, role, chunkPattern);
    for (let i = 0; i < wrapped.length; i += 1) {
      const last = i === wrapped.length - 1;
      lines.push({
        text: wrapped[i], x, y, role,
        breakAfter: last ? (segmentIndex < segments.length - 1 ? 'explicit' : 'none') : 'wrap',
        lineBreak: last ? (breaks[segmentIndex] ?? '') : '',
        continuation: i > 0,
        fontSize: styles[role].fontSize,
      });
      y += styles[role].lineHeight;
    }
  }
  return { lines, y };
}

function compose(parts, measure, styles, minHeight, marginY = MARGIN) {
  const contentWidth = WIDTH - MARGIN * 2;
  const lines = [];
  let y = 0;
  let reserved = 0;

  function place(laid, role) {
    lines.push(...laid.lines);
    const height = laid.lines.length * styles[role].lineHeight + styles[role].gap;
    y += height;
    reserved += height;
  }

  if (parts.numberLine != null && parts.numberLine !== '') {
    place(layoutRole(String(parts.numberLine), 'numberLine', measure, contentWidth, MARGIN, y, undefined, styles), 'numberLine');
  }
  for (const role of ['salutation', 'body']) {
    place(layoutRole(String(parts[role] ?? ''), role, measure, contentWidth, MARGIN, y, undefined, styles), role);
  }

  const rule = { x: MARGIN, y, width: contentWidth, height: RULE.height };
  y += RULE.height + RULE.gapAfter;
  reserved += RULE.height;

  const segments = String(parts.dateLabel ?? '').split(STAMP_SEPARATOR);
  for (const [segment, value] of segments.entries()) {
    const laid = layoutRole(value, 'dateLabel', measure, contentWidth, MARGIN, y, STAMP_CHUNKS, styles);
    for (const line of laid.lines) line.segment = segment;
    if (segment < segments.length - 1) {
      const last = laid.lines.at(-1);
      last.breakAfter = 'segment';
      last.lineBreak = STAMP_SEPARATOR;
    }
    place(laid, 'dateLabel');
  }
  y += FOOTER.painted;
  reserved += FOOTER.reserved;

  const attributionX = MARGIN + LOGO_SIZE + LOGO_TEXT_GAP;
  const attributionWidth = contentWidth - LOGO_SIZE - LOGO_TEXT_GAP;
  const attributionLines = parts.attribution == null ? [] : layoutRole(
    String(parts.attribution), 'attribution', measure, attributionWidth, attributionX, 0, undefined, styles,
  ).lines;
  const attributionHeight = attributionLines.length * styles.attribution.lineHeight;
  const footerHeight = Math.max(LOGO_SIZE, attributionHeight);
  reserved += footerHeight;

  const height = Math.max(minHeight, reserved + marginY * 2);
  const top = marginY + Math.max(0, (height - marginY * 2 - reserved) / 2);
  for (const line of lines) line.y += top + styles[line.role].inset;
  rule.y += top;
  const footerTop = top + y;
  const logo = {
    x: MARGIN,
    y: footerTop + (footerHeight - LOGO_SIZE) / 2,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  };
  const attributionTop = footerTop + (footerHeight - attributionHeight) / 2;
  for (const line of attributionLines) line.y += attributionTop;

  return {
    width: WIDTH,
    height,
    fits: reserved + marginY * 2 <= minHeight,
    scale: styles.body.fontSize / STYLES.body.fontSize,
    contentWidth,
    lines: [...lines, ...attributionLines],
    rule,
    logo,
  };
}

function scaledStyles(scale) {
  const scaled = (role, factor) => ({
    fontSize: STYLES[role].fontSize * factor,
    lineHeight: STYLES[role].lineHeight * factor,
    inset: STYLES[role].inset * factor,
    gap: STYLES[role].gap * factor,
  });
  const meta = Math.min(1, scale);
  return {
    numberLine: scaled('numberLine', meta), salutation: scaled('salutation', scale), body: scaled('body', scale),
    dateLabel: scaled('dateLabel', meta), attribution: scaled('attribution', meta),
  };
}

const FIT = Object.freeze({ minBody: 24, maxBody: 60, steps: 14 });

export function layoutLetterImage(parts, measure, opts = {}) {
  const format = FORMATS[opts.format] || FORMATS.post;
  const minHeight = opts.minHeight ?? format.height;
  const marginY = format.marginY;
  if (opts.fit === false) return compose(parts, measure, STYLES, minHeight, marginY);
  let lo = FIT.minBody / STYLES.body.fontSize;
  let hi = FIT.maxBody / STYLES.body.fontSize;
  const smallest = compose(parts, measure, scaledStyles(lo), minHeight, marginY);
  if (!smallest.fits) return smallest;
  for (let i = 0; i < FIT.steps; i += 1) {
    const mid = (lo + hi) / 2;
    if (compose(parts, measure, scaledStyles(mid), minHeight, marginY).fits) lo = mid;
    else hi = mid;
  }
  return compose(parts, measure, scaledStyles(lo), minHeight, marginY);
}

export const LETTER_IMAGE_STYLES = STYLES;
