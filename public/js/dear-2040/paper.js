export const PAPER_SCHEME = 'none';

function mix32(value) {
  let hash = value >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function numberHash(number) {
  return mix32((number >>> 0) ^ (Math.floor(number / 0x100000000) >>> 0));
}

function dayHash(dayKey) {
  let hash = 0x811c9dc5;
  for (const char of dayKey) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  }
  return mix32(hash);
}

const DARK = new Set([8, 9]);
const decks = [];

function deck(block) {
  const clash = (a, b) => a !== null && (a === b || (DARK.has(a) && DARK.has(b)));
  while (decks.length <= block) {
    const index = decks.length;
    const previous = index ? decks[index - 1][9] : null;
    let order = null;
    for (let attempt = 0; !order; attempt++) {
      const candidate = Array.from({ length: 10 }, (_, paper) => paper);
      let seed = mix32(Math.imul(index + 1, 0x9e3779b9) ^ attempt);
      for (let i = 9; i > 0; i--) {
        seed = mix32(seed + i);
        const j = seed % (i + 1);
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
      }
      if (candidate.every((paper, i) => !clash(i ? candidate[i - 1] : previous, paper))) order = candidate;
    }
    decks.push(Object.freeze(order));
  }
  return decks[block];
}

export function paperFor(letter, scheme = PAPER_SCHEME) {
  const number = letter?.letterNumber;
  if (scheme === 'none' || !Number.isSafeInteger(number) || number < 1) return null;
  if (scheme === 'deck10') return deck(Math.floor((number - 1) / 10))[(number - 1) % 10];
  if (scheme === 'hash10') return numberHash(number) % 10;
  if (scheme === 'hash6') return numberHash(number) % 6;
  if (scheme === 'number6') return number % 6;
  if (scheme === 'number5') return [0, 1, 2, 4, 5][number % 5];
  if (scheme === 'day6') return typeof letter.dayKey === 'string' && letter.dayKey
    ? dayHash(letter.dayKey) % 6 : null;
  throw new RangeError(`Unknown paper scheme: ${scheme}`);
}
