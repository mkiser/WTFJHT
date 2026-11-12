import { renderSentencePng } from './png.js';

const STORY = 'story';
const POST = 'post';
const STEPS = Object.freeze({ ArrowDown: 1, ArrowUp: -1 });
const ROW = '.carousel-actions__option';

function textOf(document, name) {
  return document.querySelector(`[data-msg="${name}"]`)?.textContent ?? '';
}

function taggedUrl(permalink, network) {
  const url = new URL(permalink);
  url.searchParams.set('utm_source', network);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', 'share');
  return url.href;
}

export function createShareDialog(document) {
  const view = document.defaultView;
  const dialog = document.getElementById('os-dlg');
  const head = dialog.querySelector('.os-dlg-head');
  const wait = document.getElementById('os-dlg-wait');
  const image = document.getElementById('os-dlg-image');
  const fail = document.getElementById('os-dlg-fail');
  const close = document.getElementById('os-close');
  const sharePill = document.getElementById('os-share-pill');
  const savePill = document.getElementById('os-save-pill');
  const shareMenu = document.getElementById('os-share-menu');
  const saveMenu = document.getElementById('os-save-menu');
  const save = document.getElementById('os-save');
  const saveStory = document.getElementById('os-save-story');
  const nativeShare = document.getElementById('os-share');
  const copyLink = document.getElementById('os-copy-link');
  const copyText = document.getElementById('os-copy-text');
  const status = document.getElementById('os-dlg-status');
  const manual = document.getElementById('os-dlg-manual');
  const manualBox = document.getElementById('os-dlg-box');
  const socialLinks = [...shareMenu.querySelectorAll('[data-social]')];
  const shareEntry = { pill: sharePill, menu: shareMenu, group: sharePill.parentElement };
  const saveEntry = { pill: savePill, menu: saveMenu, group: savePill.parentElement };
  const entries = [shareEntry, saveEntry];

  let current = null;
  let blobs = {};
  let objectUrl = null;
  let token = 0;
  let openEntry = null;
  let swallowCancel = false;
  let attempt = 0;
  const presses = new Map();

  if (typeof view.navigator.share !== 'function') nativeShare.remove();

  function say(text) {
    status.textContent = text;
  }

  function setReady(row, ready) {
    row.setAttribute('aria-disabled', ready ? 'false' : 'true');
  }

  function isReady(row) {
    return row.getAttribute('aria-disabled') !== 'true';
  }

  function rowsOf(entry) {
    return [...entry.menu.querySelectorAll(ROW)].filter(isReady);
  }

  function isOutside(event) {
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }

  function placeOf(event) {
    if (isOutside(event)) return 'outside';
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (target && (openEntry?.menu.contains(target) || target.closest('.carousel-actions__pill, .os-dlg-close'))) return 'control';
    return 'inside';
  }

  function begin() {
    attempt += 1;
    return { token, attempt };
  }

  function isLatest(generation) {
    return generation.token === token && generation.attempt === attempt;
  }

  function fitMenu(entry) {
    const { menu } = entry;
    menu.style.maxHeight = '';
    menu.style.marginLeft = '';
    const room = dialog.getBoundingClientRect();
    const box = menu.getBoundingClientRect();
    const top = head.getBoundingClientRect().bottom;
    if (box.top < top) menu.style.maxHeight = `${Math.floor(box.bottom - top)}px`;
    const shift = Math.max(0, room.left - box.left) - Math.max(0, box.right - room.right);
    if (shift) menu.style.marginLeft = `${Math.round(shift)}px`;
  }

  function refit() {
    if (openEntry) fitMenu(openEntry);
  }

  function closeMenu(focusPill) {
    const entry = openEntry;
    if (!entry) return false;
    entry.menu.classList.remove('is-open');
    entry.menu.setAttribute('aria-hidden', 'true');
    entry.pill.setAttribute('aria-expanded', 'false');
    openEntry = null;
    if (focusPill) entry.pill.focus();
    return true;
  }

  function openMenu(entry, viaKeyboard) {
    closeMenu(false);
    entry.menu.classList.add('is-open');
    entry.menu.setAttribute('aria-hidden', 'false');
    entry.pill.setAttribute('aria-expanded', 'true');
    openEntry = entry;
    fitMenu(entry);
    if (viaKeyboard) (rowsOf(entry)[0] ?? entry.pill).focus();
    else entry.pill.focus();
  }

  function dropRow(row) {
    if (!row.isConnected) return;
    const focused = document.activeElement === row;
    const following = [...saveMenu.querySelectorAll(ROW)];
    const next = following[following.indexOf(row) + 1];
    row.remove();
    const empty = !saveMenu.querySelector(ROW);
    if (empty) {
      if (openEntry === saveEntry) closeMenu(false);
      saveEntry.group.hidden = true;
    }
    if (focused || (empty && document.activeElement === savePill)) {
      (next ?? (shareEntry.group.hidden ? close : sharePill)).focus();
    }
    refit();
  }

  function showPreview(block) {
    wait.hidden = block !== wait;
    image.hidden = block !== image;
    fail.hidden = block !== fail;
    refit();
  }

  function fillLinks(item) {
    const title = encodeURIComponent(document.title);
    for (const link of socialLinks) {
      const url = encodeURIComponent(taggedUrl(item.url, link.dataset.social));
      link.href = link.dataset.share.replace('{url}', url).replace('{title}', title);
    }
  }

  function reset() {
    closeMenu(false);
    blobs = {};
    say('');
    manual.hidden = true;
    manualBox.value = '';
    image.alt = '';
    image.removeAttribute('src');
    if (objectUrl) view.URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    saveMenu.replaceChildren(save, saveStory);
    saveEntry.group.hidden = false;
    setReady(save, false);
    setReady(saveStory, false);
    showPreview(wait);
  }

  function renderFormat(format, parts, mine) {
    return renderSentencePng(parts, { document, format }).then(blob => {
      if (mine !== token) return null;
      blobs[format] = blob;
      return blob;
    });
  }

  function renderBoth(item, mine) {
    const parts = { runs: item.runs, title: item.title, stamp: item.stamp, attribution: textOf(document, 'image.attribution'), band: item.band };
    renderFormat(POST, parts, mine).then(blob => {
      if (!blob) return;
      objectUrl = view.URL.createObjectURL(blob);
      image.alt = item.text;
      image.src = objectUrl;
      showPreview(image);
      setReady(save, true);
    }).catch(() => {
      if (mine !== token) return;
      showPreview(fail);
      dropRow(save);
      say(textOf(document, 'image.failed'));
    });
    renderFormat(STORY, parts, mine).then(blob => {
      if (blob) setReady(saveStory, true);
    }).catch(() => {
      if (mine === token) dropRow(saveStory);
    });
  }

  function open(item) {
    token += 1;
    current = item;
    reset();
    fillLinks(item);
    if (!dialog.open) dialog.showModal();
    close.focus();
    renderBoth(item, token);
  }

  function download(blob, name) {
    const url = view.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 1000);
    say(textOf(document, 'image.saved'));
  }

  function saveFormat(row, format) {
    if (!isReady(row) || !blobs[format] || !current) return;
    begin();
    closeMenu(true);
    download(blobs[format], format === STORY ? `${current.fileStem}-story.png` : `${current.fileStem}.png`);
  }

  function copy(text, confirmation) {
    const generation = begin();
    manual.hidden = true;
    const clipboard = view.navigator.clipboard;
    const pending = clipboard ? clipboard.writeText(text) : Promise.reject(new Error('No clipboard'));
    pending.then(() => {
      if (isLatest(generation)) say(confirmation);
    }, () => {
      if (!isLatest(generation)) return;
      manualBox.value = text;
      manual.hidden = false;
      say(textOf(document, 'copy.manual'));
      manualBox.focus();
      manualBox.select();
    });
  }

  function controls() {
    return [close, ...entries.filter(entry => !entry.group.hidden).map(entry => entry.pill), ...(manual.hidden ? [] : [manualBox])];
  }

  for (const entry of entries) {
    entry.pill.addEventListener('click', event => {
      if (openEntry === entry) closeMenu(true);
      else openMenu(entry, event.detail === 0);
    });
  }
  save.addEventListener('click', () => saveFormat(save, POST));
  saveStory.addEventListener('click', () => saveFormat(saveStory, STORY));
  copyLink.addEventListener('click', () => {
    closeMenu(true);
    if (current) copy(current.url, textOf(document, 'copy.link'));
  });
  copyText.addEventListener('click', () => {
    closeMenu(true);
    if (current) copy(current.text, textOf(document, 'copy.text'));
  });
  nativeShare.addEventListener('click', () => {
    closeMenu(true);
    const item = current;
    if (!item) return;
    const generation = begin();
    view.navigator.share({ title: item.title, text: item.text, url: item.url }).catch(error => {
      if (isLatest(generation) && error?.name !== 'AbortError') copy(item.url, textOf(document, 'copy.link'));
    });
  });
  for (const link of socialLinks) {
    link.addEventListener('click', () => {
      closeMenu(true);
    });
  }
  close.addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      swallowCancel = Boolean(openEntry);
      if (swallowCancel) {
        event.preventDefault();
        closeMenu(true);
      }
      return;
    }
    const entry = openEntry;
    if (!entry) return;
    const row = event.target.closest?.(ROW);
    const inMenu = Boolean(row) && entry.menu.contains(row);
    const step = STEPS[event.key];
    if (event.key === 'Tab') {
      const list = controls();
      const index = list.indexOf(inMenu ? entry.pill : event.target);
      if (index < 0) return;
      event.preventDefault();
      closeMenu(false);
      list[(index + (event.shiftKey ? -1 : 1) + list.length) % list.length].focus();
    } else if (step && (inMenu || event.target === entry.pill)) {
      event.preventDefault();
      const rows = rowsOf(entry);
      const next = inMenu ? rows[rows.indexOf(row) + step] : rows[0];
      next?.focus();
    } else if (event.key === ' ' && inMenu && row.tagName === 'A') {
      event.preventDefault();
      row.click();
    }
  });
  dialog.addEventListener('cancel', event => {
    if (swallowCancel || openEntry) {
      event.preventDefault();
      closeMenu(true);
    }
    swallowCancel = false;
  });
  dialog.addEventListener('pointerdown', event => {
    if (event.button === 0) presses.set(event.pointerId, placeOf(event));
    else presses.delete(event.pointerId);
  });
  dialog.addEventListener('pointerup', event => {
    const start = presses.get(event.pointerId);
    presses.delete(event.pointerId);
    if (!start) return;
    const end = placeOf(event);
    if (start === 'outside' && end === 'outside') {
      if (!closeMenu(true)) dialog.close();
    } else if (start === 'inside' && end === 'inside') {
      closeMenu(false);
    }
  });
  dialog.addEventListener('pointercancel', event => {
    presses.delete(event.pointerId);
  });
  dialog.addEventListener('dragstart', () => {
    presses.clear();
  });
  image.addEventListener('load', refit);
  if (typeof view.ResizeObserver === 'function') new view.ResizeObserver(refit).observe(dialog);
  dialog.addEventListener('close', () => {
    token += 1;
    presses.clear();
    swallowCancel = false;
    const trigger = current?.trigger;
    current = null;
    reset();
    if (trigger?.isConnected) trigger.focus();
  });

  return { open };
}
