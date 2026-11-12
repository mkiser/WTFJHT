import { closeTokens } from './core.js';
import { readMessages } from './dom.js';
const CONFIRM_MS = 6000;
let helpId = 0;
export const SHARE_ORIGIN = ['https:', '', 'wtfjht.com'].join('/');

export function letterShareUrl(id) {
  return `${SHARE_ORIGIN}/dear-2040/letter/?id=${encodeURIComponent(id)}&ref=s`;
}

export function inviteShareUrl() {
  return `${SHARE_ORIGIN}/dear-2040/?ref=i`;
}

export function inviteShareText(messages, closesAt) {
  const template = messages.result.inviteText;
  if (closesAt && Number.isFinite(Date.parse(closesAt))) {
    return template.replace('{closeDay}', closeTokens(closesAt).closeDay);
  }
  return template.replace(/(?:^|\s+)[^.!?]*\{closeDay\}[^.!?]*[.!?]?/, '');
}

export function shareText(messages, letter, url) {
  const line = value => (typeof value === 'string' ? value.trim() : '');
  const invite = [line(messages.result?.shareInvite), url].filter(Boolean).join(' ');
  return [line(messages.result?.shareIntro), `${letter.salutation}\n\n${letter.body}`,
    line(messages.letter?.signoff), invite].filter(Boolean).join('\n\n');
}

export function letterExcerpt(body) {
  if (typeof globalThis.Intl?.Segmenter !== 'function') return '';
  const segments = new globalThis.Intl.Segmenter('en', { granularity: 'sentence' }).segment(String(body ?? ''));
  let excerpt = '';
  for (const part of segments) {
    const sentence = part.segment.trim();
    if (!sentence) continue;
    const joined = excerpt ? `${excerpt} ${sentence}` : sentence;
    if (joined.length > 170) break;
    excerpt = joined;
  }
  return excerpt;
}

export function letterShareText(messages, letter) {
  const excerpt = letterExcerpt(letter.body);
  return excerpt ? messages.result.shareExcerpt.replace('{excerpt}', () => excerpt) : messages.result.shareBare;
}

export function trackShare(window, method, surface) {
  try {
    if (typeof window?.gtag === 'function') window.gtag('event', 'd40_share', { method, surface });
  } catch { }
}

export function bindLetterShareControl(button, actions, messages = readMessages(button.ownerDocument)) {
  const native = actions.canNativeShare;
  button.dataset.share = native ? 'sendother' : 'copylink';
  button.setAttribute('aria-label', native ? messages.actions.sendOther : messages.actions.copyLink);
  button.title = button.getAttribute('aria-label');
  button.addEventListener('click', () => {
    if (!native) {
      void actions.copyLink(button);
      return;
    }
    void Promise.resolve(actions.share()).then(result => {
      if (!result?.ok && !result?.cancelled) void actions.copyLink(button, { track: false });
    }, () => { void actions.copyLink(button, { track: false }); });
  });
}

export function imageFilename(letter, format = 'post') {
  void letter;
  return format === 'story' ? 'dear-2040-letter-story.png' : 'dear-2040-letter.png';
}

export function createShareActions({
  letter, messages: given = null, navigator, document, pngPromise, surface = 'letter', closesAt = null, announce = () => {},
  fallbackAfter = null, fallbackRoot = null,
  setTimeout: schedule = document?.defaultView?.setTimeout?.bind(document.defaultView) || globalThis.setTimeout,
  clearTimeout: cancel = document?.defaultView?.clearTimeout?.bind(document.defaultView) || globalThis.clearTimeout,
}) {
  const messages = given || readMessages(document);
  const canNativeShare = typeof navigator?.share === 'function';
  let landing = '';
  try { landing = letter.url ? new URL('/dear-2040/', letter.url).href : ''; } catch { landing = ''; }
  const text = letterShareText(messages, letter);
  const url = letterShareUrl(letter.id);
  const inviteText = () => messages.result.inviteText
    ? inviteShareText(messages, typeof closesAt === 'function' ? closesAt() : closesAt) : '';
  const inviteUrl = inviteShareUrl();
  const copyPayload = shareText(messages, letter, landing);
  const emailBody = [letter.salutation, letter.body, messages.letter?.signoff, url]
    .filter(Boolean).join('\n\n');
  const filename = imageFilename(letter);
  let fallback = null;
  let done = null;
  let doneTimer = null;
  let destroyed = false;

  if (pngPromise) Promise.resolve(pngPromise).catch(() => {});

  function clearDone() {
    if (doneTimer !== null) cancel(doneTimer);
    doneTimer = null;
    done?.remove();
    done = null;
  }

  function placeDone(group, control, node) {
    let right = false;
    try {
      const controlBox = control.getBoundingClientRect();
      const groupBox = group.getBoundingClientRect();
      const next = group.nextElementSibling;
      const nextBox = next?.getBoundingClientRect();
      const limit = nextBox && Math.abs(nextBox.top - groupBox.top) < 2
        ? nextBox.left : group.parentElement?.getBoundingClientRect().right;
      const width = node.getBoundingClientRect().width;
      right = Number.isFinite(limit) && width > 0 && width + 8 <= limit - controlBox.right;
    } catch { }
    node.classList.add(right ? 'is-right' : 'is-below');
  }

  function confirm(control, text) {
    clearDone();
    const group = control?.closest?.('.d40-act');
    if (group) {
      done = document.createElement('span');
      done.className = 'd40-done';
      done.textContent = text;
      group.appendChild(done);
      placeDone(group, control, done);
      const shown = done;
      doneTimer = schedule(() => {
        doneTimer = null;
        shown.remove();
        if (done === shown) done = null;
      }, CONFIRM_MS);
    }
    announce(text);
  }

  function showSelectable(text) {
    const anchored = Boolean(fallbackAfter || fallbackRoot);
    if (anchored && !fallbackAfter?.isConnected && !fallbackRoot?.isConnected) return;
    fallback?.remove();
    fallback = document.createElement('div');
    const help = document.createElement('p');
    help.className = 'd40-sec';
    help.id = `d40-copy-help-${++helpId}`;
    help.textContent = messages.placeholders.copyFallback;
    const textarea = document.createElement('textarea');
    textarea.className = 'd40-fallback';
    textarea.readOnly = true;
    textarea.value = text;
    textarea.textContent = text;
    textarea.setAttribute('aria-labelledby', help.id);
    fallback.append(help, textarea);
    if (fallbackAfter?.isConnected) fallbackAfter.after(fallback);
    else if (fallbackRoot?.isConnected) fallbackRoot.appendChild(fallback);
    else document.body.appendChild(fallback);
    textarea.focus();
    textarea.select();
  }

  async function copy(text, confirmation, control) {
    if (destroyed) return false;
    try {
      await navigator.clipboard.writeText(text);
      if (destroyed) return false;
      fallback?.remove();
      fallback = null;
      confirm(control, confirmation);
      return true;
    } catch {
      if (destroyed) return false;
      clearDone();
      showSelectable(text);
      return false;
    }
  }

  function makePngFile(blob, name = filename) {
    const FileType = document.defaultView?.File || globalThis.File;
    return FileType ? new FileType([blob], name, { type: 'image/png' }) : null;
  }

  function downloadImage(blob, name = filename) {
    try {
      const URLType = document.defaultView?.URL?.createObjectURL
        ? document.defaultView.URL : globalThis.URL;
      const objectUrl = URLType.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = name;
      link.hidden = true;
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        schedule(() => URLType.revokeObjectURL(objectUrl), 1000);
      }
      return { ok: true, method: 'download' };
    } catch {
      return { ok: false, method: 'download' };
    }
  }

  function saveImage(blob, name = filename) {
    try {
      if (document.defaultView?.matchMedia?.('(pointer: coarse)')?.matches &&
          canNativeShare && typeof navigator.canShare === 'function') {
        const pngFile = makePngFile(blob, name);
        if (pngFile && navigator.canShare({ files: [pngFile] })) {
          const failed = error => error?.name === 'AbortError'
            ? { ok: true, method: 'share', cancelled: true }
            : downloadImage(blob, name);
          try {
            return Promise.resolve(navigator.share({ files: [pngFile] })).then(
              () => ({ ok: true, method: 'share' }), failed);
          } catch (error) {
            return Promise.resolve(failed(error));
          }
        }
      }
    } catch {
    }
    return Promise.resolve(downloadImage(blob, name));
  }

  function sharePayload(payload, method) {
    if (!canNativeShare) return Promise.resolve({ ok: false, unsupported: true });
    trackShare(document.defaultView, method, surface);
    try {
      return Promise.resolve(navigator.share(payload)).then(
        () => ({ ok: true }),
        error => error?.name === 'AbortError'
          ? { ok: true, cancelled: true }
          : { ok: false, error },
      );
    } catch (error) {
      return Promise.resolve(error?.name === 'AbortError'
        ? { ok: true, cancelled: true }
        : { ok: false, error });
    }
  }

  return {
    share: () => sharePayload({ text, url }, 'share-sheet'),
    invite: () => sharePayload({ text: inviteText(), url: inviteUrl }, 'invite'),
    saveImage,
    copyText: control => copy(copyPayload, messages.placeholders.copied, control),
    copyLink: (control, { track = true } = {}) => {
      if (track) trackShare(document.defaultView, 'copy-link', surface);
      return copy(url, messages.placeholders.copiedLink, control);
    },
    copyInviteLink: (control, { track = true } = {}) => {
      if (track) trackShare(document.defaultView, 'invite', surface);
      return copy(inviteUrl, messages.placeholders.copiedLink, control);
    },
    emailHref: () => `mailto:?subject=${encodeURIComponent(messages.placeholders.shareTitle)}&body=${encodeURIComponent(emailBody)}`,
    inviteEmailHref: () => `mailto:?subject=${encodeURIComponent(messages.placeholders.shareTitle)}&body=${encodeURIComponent(`${inviteText()}\n\n${inviteUrl}`)}`,
    track: method => trackShare(document.defaultView, method, surface),
    canNativeShare,
    confirm,
    announce,
    filename,
    destroy() {
      destroyed = true;
      clearDone();
      fallback?.remove();
      fallback = null;
    },
  };
}
