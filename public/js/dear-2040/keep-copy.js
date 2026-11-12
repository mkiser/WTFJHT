import { pngNumberLine } from './png.js';
import { imageFilename } from './share.js';
import { readMessages } from './dom.js';

export const PNG_TIMEOUT_MS = 15000;
const STATUS_DELAY_MS = 100;
const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const openDialogs = new WeakMap();

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function mountFor(document, trigger) {
  return trigger?.closest?.('.d2040') || document.getElementById('dear-2040') || document.body;
}

export function openKeepCopy(document, {
  letter, messages: given = null, trigger = null, share, png, navigator, saveLabel = null,
  setTimeout: setTimer, clearTimeout: clearTimer, timeoutMs = PNG_TIMEOUT_MS,
} = {}) {
  const messages = given || readMessages(document);
  if (!share) throw new TypeError('Keep a copy needs share actions');
  if (typeof png !== 'function') throw new TypeError('Keep a copy needs the PNG renderer');
  openDialogs.get(document)?.dismiss(false);

  const view = document.defaultView || globalThis;
  const later = setTimer || ((fn, ms) => view.setTimeout(fn, ms));
  const cancel = clearTimer || (id => view.clearTimeout(id));
  const root = mountFor(document, trigger);
  const announcer = root.querySelector('#d40-announce');

  const dialog = element(document, 'dialog', 'd40-dlg');
  dialog.setAttribute('aria-labelledby', 'd40-dlg-lbl');
  const label = element(document, 'p', 'd40-dlg-lbl sr-only',
    pngNumberLine(messages, letter) || messages.actions.keepCopy);
  label.id = 'd40-dlg-lbl';
  const slot = element(document, 'div', 'd40-dlg-slot');
  slot.id = 'd40-dlg-slot';
  slot.appendChild(element(document, 'div', 'd40-dlg-wait', messages.placeholders.loading));
  const row = element(document, 'div', 'd40-dlg-row');
  const saveText = saveLabel || messages.actions.saveImage;
  const save = element(document, 'button', 'd40-save', `${saveText} (4:5)`);
  save.type = 'button';
  save.id = 'd40-save';
  save.setAttribute('aria-disabled', 'true');
  const saveStory = element(document, 'button', 'd40-save', `${saveText} (9:16)`);
  saveStory.type = 'button';
  saveStory.id = 'd40-save-story';
  saveStory.setAttribute('aria-disabled', 'true');
  const closer = element(document, 'button', 'd40-close', messages.actions.close);
  closer.type = 'button';
  closer.id = 'd40-close';
  row.append(save, saveStory, closer);
  const status = element(document, 'p', 'd40-dlg-status');
  status.id = 'd40-dlg-status';
  status.setAttribute('role', 'status');
  dialog.append(label, slot, row, status);
  root.insertBefore(dialog, announcer?.parentNode === root ? announcer : null);

  let phase = 'wait';
  let blob = null;
  let storyBlob = null;
  let objectUrl = null;
  let actions = null;
  let ownActions = false;
  let statusRevision = 0;
  const inerted = [];

  let modal = false;
  if (typeof dialog.showModal === 'function') {
    try {
      dialog.showModal();
      modal = true;
    } catch {
      modal = false;
    }
  }
  if (!modal) {
    dialog.setAttribute('open', '');
    for (const child of root.children) {
      if (child === dialog || child === announcer || child.hasAttribute('inert')) continue;
      child.setAttribute('inert', '');
      inerted.push(child);
    }
  }
  save.focus();

  function shareActions() {
    if (!actions) {
      ownActions = typeof share === 'function';
      actions = ownActions
        ? share({
          letter, messages, document, navigator: navigator ?? view.navigator,
          fallbackAfter: row, announce: () => {}, setTimeout: later, clearTimeout: cancel,
        })
        : share;
    }
    return actions;
  }

  function say(text, { quiet = false } = {}) {
    const revision = ++statusRevision;
    status.textContent = '';
    later(() => {
      if (phase !== 'closed' && revision === statusRevision) {
        status.replaceChildren(quiet ? element(document, 'span', 'sr-only', text) : text);
      }
    }, STATUS_DELAY_MS);
  }

  function toCopy() {
    if (phase === 'closed') return;
    phase = 'copy';
    blob = null;
    storyBlob = null;
    saveStory.hidden = true;
    slot.replaceChildren(element(document, 'p', 'd40-dlg-fail', messages.result.copyFailed));
    save.textContent = messages.actions.copy;
    save.setAttribute('aria-disabled', 'false');
    say(messages.result.copyFailed, { quiet: true });
  }

  function ready(result) {
    if (phase !== 'wait') return;
    try {
      if (!result || typeof result.type !== 'string') throw new Error('No image');
      objectUrl = view.URL.createObjectURL(result);
    } catch {
      toCopy();
      return;
    }
    blob = result;
    const image = element(document, 'img');
    image.alt = letter.canonicalText;
    image.src = objectUrl;
    slot.replaceChildren(image);
    save.setAttribute('aria-disabled', 'false');
    phase = 'ready';
  }

  const timer = later(() => {
    if (phase === 'wait') toCopy();
  }, timeoutMs);
  Promise.resolve()
    .then(() => png(letter, { document, messages }))
    .then(ready, () => {
      if (phase === 'wait') toCopy();
    });
  Promise.resolve()
    .then(() => png(letter, { document, messages, format: 'story' }))
    .then((result) => {
      if (phase === 'closed' || phase === 'copy') return;
      if (!result || typeof result.type !== 'string') throw new Error('No image');
      storyBlob = result;
      saveStory.setAttribute('aria-disabled', 'false');
    })
    .catch(() => { if (phase !== 'closed') saveStory.hidden = true; });

  function onSave() {
    if (phase === 'closed' || save.getAttribute('aria-disabled') === 'true') return;
    if (phase === 'copy') {
      statusRevision += 1;
      status.textContent = '';
      Promise.resolve()
        .then(() => shareActions().copyText())
        .then(copied => {
          if (copied !== false) say(messages.placeholders.copied);
        }, () => {});
      return;
    }
    if (phase !== 'ready') return;
    saveCard(save, blob);
  }

  function onSaveStory() {
    if (phase !== 'ready' || !storyBlob || saveStory.getAttribute('aria-disabled') === 'true') return;
    saveCard(saveStory, storyBlob, imageFilename(letter, 'story'));
  }

  function saveCard(button, card, name) {
    button.setAttribute('aria-disabled', 'true');
    let outcome;
    try {
      outcome = name ? shareActions().saveImage(card, name) : shareActions().saveImage(card);
    } catch {
      outcome = { ok: false };
    }
    Promise.resolve(outcome).then(result => {
      if (phase !== 'ready') return;
      button.setAttribute('aria-disabled', 'false');
      if (result?.ok === false) toCopy();
      else if (result?.method === 'download') say(messages.placeholders.imageSaved);
    }, () => {
      if (phase === 'ready') toCopy();
    });
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const stops = [...dialog.querySelectorAll(FOCUSABLE)]
      .filter(node => !node.hidden && !node.closest('[hidden]'));
    if (stops.length === 0) return;
    event.preventDefault();
    const index = stops.indexOf(document.activeElement);
    const step = event.shiftKey ? -1 : 1;
    const next = index === -1 ? (event.shiftKey ? stops.length - 1 : 0)
      : (index + step + stops.length) % stops.length;
    stops[next].focus();
  }

  function onCancel(event) {
    event.preventDefault();
    dismiss(true);
  }

  save.addEventListener('click', onSave);
  saveStory.addEventListener('click', onSaveStory);
  closer.addEventListener('click', () => dismiss(true));
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) dismiss(true);
  });
  dialog.addEventListener('keydown', onKeydown);
  dialog.addEventListener('cancel', onCancel);
  dialog.addEventListener('close', () => dismiss(true));

  function dismiss(restoreFocus) {
    if (phase === 'closed') return;
    phase = 'closed';
    cancel(timer);
    if (modal && dialog.open && typeof dialog.close === 'function') {
      try {
        dialog.close();
      } catch {
      }
    }
    dialog.remove();
    for (const node of inerted) node.removeAttribute('inert');
    if (objectUrl) {
      try {
        view.URL.revokeObjectURL(objectUrl);
      } catch {
      }
      objectUrl = null;
    }
    blob = null;
    if (ownActions) actions?.destroy?.();
    if (openDialogs.get(document) === controller) openDialogs.delete(document);
    if (restoreFocus && trigger?.isConnected) trigger.focus();
  }

  const controller = {
    dismiss,
    close() {
      dismiss(true);
    },
    closeForTakedown() {
      if (phase === 'closed') return false;
      const hadFocus = dialog.contains(document.activeElement);
      dismiss(false);
      return hadFocus;
    },
  };
  openDialogs.set(document, controller);
  return { close: controller.close, closeForTakedown: controller.closeForTakedown };
}
