import { layoutSentenceImage } from './png-layout.js';

const FAMILIES = Object.freeze({
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: '-apple-system, "Helvetica Neue", Arial, sans-serif',
});
const INK = '#1a1a1a';
const META = '#515151';
const FADED = '#5c5c5c';
const PAPER = '#ffffff';
const RULE = '#cccccc';
const FONT_BY_KIND = Object.freeze({
  frame: { weight: 400, family: FAMILIES.serif, color: FADED },
  word: { weight: 700, family: FAMILIES.serif, color: INK },
  ending: { weight: 400, family: FAMILIES.serif, color: INK },
  title: { weight: 600, family: FAMILIES.sans, color: META },
  stamp: { weight: 400, family: FAMILIES.sans, color: META },
  attribution: { weight: 400, family: FAMILIES.sans, color: META },
});
const LOGO_SRC = 'data:image/svg+xml,%3Csvg width="256px" height="256px" viewBox="0 0 256 256" version="1.1" xmlns="http:%2F%2Fwww.w3.org%2F2000%2Fsvg" xmlns:xlink="http:%2F%2Fwww.w3.org%2F1999%2Fxlink"%3E%3Ctitle%3Ewtfjht-logo%3C%2Ftitle%3E%3Cdesc%3ECreated with Sketch.%3C%2Fdesc%3E%3Cdefs%3E%3Cpath d="M64,7.99367773 C64,3.57889143 67.5882405,0 71.9936777,0 L112.006322,0 C116.421109,0 120,3.5882405 120,7.99367773 L120,48.0063223 C120,52.4211086 116.411759,56 112.006322,56 L71.9936777,56 C67.5788914,56 64,52.4117595 64,48.0063223 L64,7.99367773 Z M128,7.99367773 C128,3.57889143 131.588241,0 135.993678,0 L176.006322,0 C180.421109,0 184,3.5882405 184,7.99367773 L184,48.0063223 C184,52.4211086 180.411759,56 176.006322,56 L135.993678,56 C131.578891,56 128,52.4117595 128,48.0063223 L128,7.99367773 Z M0,7.99367773 C0,3.57889143 3.5882405,0 7.99367773,0 L48.0063223,0 C52.4211086,0 56,3.5882405 56,7.99367773 L56,48.0063223 C56,52.4211086 52.4117595,56 48.0063223,56 L7.99367773,56 C3.57889143,56 0,52.4117595 0,48.0063223 L0,7.99367773 Z M64,71.9936777 C64,67.5788914 67.5882405,64 71.9936777,64 L112.006322,64 C116.421109,64 120,67.5882405 120,71.9936777 L120,112.006322 C120,116.421109 116.411759,120 112.006322,120 L71.9936777,120 C67.5788914,120 64,116.411759 64,112.006322 L64,71.9936777 Z M128,71.9936777 C128,67.5788914 131.588241,64 135.993678,64 L176.006322,64 C180.421109,64 184,67.5882405 184,71.9936777 L184,112.006322 C184,116.421109 180.411759,120 176.006322,120 L135.993678,120 C131.578891,120 128,116.411759 128,112.006322 L128,71.9936777 Z M0,71.9936777 C0,67.5788914 3.5882405,64 7.99367773,64 L48.0063223,64 C52.4211086,64 56,67.5882405 56,71.9936777 L56,112.006322 C56,116.421109 52.4117595,120 48.0063223,120 L7.99367773,120 C3.57889143,120 0,116.411759 0,112.006322 L0,71.9936777 Z" id="path-1"%3E%3C%2Fpath%3E%3C%2Fdefs%3E%3Cg id="Logos" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"%3E%3Cg id="wtfjht-logo"%3E%3Cg id="Group-2" transform="translate%2836.000000, 68.000000%29"%3E%3Cg id="Group"%3E%3Cmask id="mask-2" fill="white"%3E%3Cuse xlink:href="%23path-1"%3E%3C%2Fuse%3E%3C%2Fmask%3E%3Cg id="Mask"%3E%3C%2Fg%3E%3Crect id="Rectangle-6" fill="%23E0162B" mask="url%28%23mask-2%29" x="64" y="0" width="56" height="56"%3E%3C%2Frect%3E%3Crect id="Rectangle-6" fill="%23E0162B" mask="url%28%23mask-2%29" x="128" y="0" width="56" height="56"%3E%3C%2Frect%3E%3Crect id="Rectangle-6" fill="%230052A5" mask="url%28%23mask-2%29" x="0" y="0" width="56" height="56"%3E%3C%2Frect%3E%3Crect id="Rectangle-6" fill="%23E0162B" mask="url%28%23mask-2%29" x="64" y="64" width="56" height="56"%3E%3C%2Frect%3E%3Crect id="Rectangle-6" fill="%23E0162B" mask="url%28%23mask-2%29" x="128" y="64" width="56" height="56"%3E%3C%2Frect%3E%3Crect id="Rectangle-6" fill="%23E0162B" mask="url%28%23mask-2%29" x="0" y="64" width="56" height="56"%3E%3C%2Frect%3E%3C%2Fg%3E%3Cpath d="M96,16 L107.999974,16 C110.203575,16 112,14.209139 112,12 C112,9.79535615 110.209128,8 107.999974,8 L76.0000255,8 C73.7964248,8 72,9.790861 72,12 C72,14.2046438 73.7908724,16 76.0000255,16 L88,16 L88,43.9999745 C88,46.2035752 89.790861,48 92,48 C94.2046438,48 96,46.2091276 96,43.9999745 L96,16 Z" id="Combined-Shape" fill="%23FFFFFF"%3E%3C%2Fpath%3E%3Crect id="Rectangle-7" fill="%23FFFFFF" x="140" y="24" width="24" height="8" rx="4"%3E%3C%2Frect%3E%3Cpath d="M144,44 L144,14.0017433 C144,12.896211 144.897026,12 146.004947,12 L168,12" id="Path-3" stroke="%23FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"%3E%3C%2Fpath%3E%3Cpath d="M84,88 L84,76.0000255 C84,73.7964248 82.209139,72 80,72 C77.7953562,72 76,73.7908724 76,76.0000255 L76,107.999974 C76,110.203575 77.790861,112 80,112 C82.2046438,112 84,110.209128 84,107.999974 L84,96 L100,96 L100,107.999974 C100,110.203575 101.790861,112 104,112 C106.204644,112 108,110.209128 108,107.999974 L108,76.0000255 C108,73.7964248 106.209139,72 104,72 C101.795356,72 100,73.7908724 100,76.0000255 L100,88 L84,88 Z" id="Combined-Shape" fill="%23FFFFFF"%3E%3C%2Fpath%3E%3Cpath d="M160,80 L171.999974,80 C174.203575,80 176,78.209139 176,76 C176,73.7953562 174.209128,72 171.999974,72 L140.000026,72 C137.796425,72 136,73.790861 136,76 C136,78.2046438 137.790872,80 140.000026,80 L152,80 L152,107.999974 C152,110.203575 153.790861,112 156,112 C158.204644,112 160,110.209128 160,107.999974 L160,80 Z" id="Combined-Shape" fill="%23FFFFFF"%3E%3C%2Fpath%3E%3Cpath d="M40,108 L40,88 C40,81.372583 34.627417,76 28,76 C21.372583,76 16,81.372583 16,88" id="Oval" stroke="%23FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" transform="translate%2828.000000, 92.000000%29 scale%281, -1%29 translate%28-28.000000, -92.000000%29 "%3E%3C%2Fpath%3E%3Cpolyline id="Path-4" stroke="%23FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" points="12 12 16 44 28 28 40 44 44 12"%3E%3C%2Fpolyline%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';

function fontFor(kind, fontSize) {
  const { weight, family } = FONT_BY_KIND[kind];
  return `${weight} ${fontSize}px ${family}`;
}

function loadLogo(document) {
  return new Promise(resolve => {
    const image = document.createElement('img');
    const timeout = setTimeout(() => resolve(null), 3000);
    image.onload = () => {
      clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    image.src = LOGO_SRC;
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png');
  });
}

export function measureWith(context) {
  return (text, kind, fontSize) => {
    context.font = fontFor(kind, fontSize);
    return context.measureText(text).width;
  };
}

export async function renderSentencePng(parts, { document, format = 'post' }) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable');
  const layout = layoutSentenceImage(parts, measureWith(context), { format });
  canvas.width = layout.width;
  canvas.height = layout.height;
  context.fillStyle = PAPER;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'top';
  for (const line of layout.lines) {
    for (const fragment of line.fragments) {
      context.font = fontFor(fragment.kind, line.fontSize);
      context.fillStyle = FONT_BY_KIND[fragment.kind].color;
      context.fillText(fragment.text, fragment.x, line.y + (line.lineHeight - line.fontSize) / 2);
    }
  }
  context.fillStyle = RULE;
  context.fillRect(layout.rule.x, layout.rule.y, layout.rule.width, layout.rule.height);
  const logo = await loadLogo(document);
  if (logo) context.drawImage(logo, layout.logo.x, layout.logo.y, layout.logo.width, layout.logo.height);
  return canvasBlob(canvas);
}
