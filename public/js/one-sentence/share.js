import { renderSentencePng } from './png.js';

const STORY = 'story';
const POST = 'post';

function textOf(document, name) {
  return document.querySelector(`[data-msg="${name}"]`)?.textContent ?? '';
}

export function createShareDialog(document) {
  const view = document.defaultView;
  const dialog = document.getElementById('os-dlg');
  const wait = document.getElementById('os-dlg-wait');
  const image = document.getElementById('os-dlg-image');
  const fail = document.getElementById('os-dlg-fail');
  const save = document.getElementById('os-save');
  const saveStory = document.getElementById('os-save-story');
  const close = document.getElementById('os-close');
  const nativeShare = document.getElementById('os-share');
  const copyLink = document.getElementById('os-copy-link');
  const copyText = document.getElementById('os-copy-text');
  const status = document.getElementById('os-dlg-status');
  const manual = document.getElementById('os-dlg-manual');
  const manualBox = document.getElementById('os-dlg-box');

  let current = null;
  let blobs = {};
  let objectUrl = null;
  let token = 0;

  nativeShare.hidden = typeof view.navigator.share !== 'function';

  function say(text) {
    status.textContent = text;
  }

  function setReady(button, ready) {
    button.setAttribute('aria-disabled', ready ? 'false' : 'true');
  }

  function showPreview(block) {
    wait.hidden = block !== wait;
    image.hidden = block !== image;
    fail.hidden = block !== fail;
  }

  function reset() {
    blobs = {};
    say('');
    manual.hidden = true;
    manualBox.value = '';
    image.alt = '';
    image.removeAttribute('src');
    if (objectUrl) view.URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    setReady(save, false);
    setReady(saveStory, false);
    save.hidden = false;
    saveStory.hidden = false;
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
    const parts = { runs: item.runs, title: item.title, stamp: item.stamp, attribution: textOf(document, 'image.attribution') };
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
      save.hidden = true;
      say(textOf(document, 'image.failed'));
    });
    renderFormat(STORY, parts, mine).then(blob => {
      if (blob) setReady(saveStory, true);
    }).catch(() => {
      if (mine === token) saveStory.hidden = true;
    });
  }

  function open(item) {
    token += 1;
    current = item;
    reset();
    if (!dialog.open) dialog.showModal();
    save.focus();
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

  function shareFile(blob, name) {
    const File = view.File;
    if (!File || !view.matchMedia('(pointer: coarse)').matches) return false;
    if (typeof view.navigator.canShare !== 'function') return false;
    const file = new File([blob], name, { type: 'image/png' });
    if (!view.navigator.canShare({ files: [file] })) return false;
    view.navigator.share({ files: [file] }).catch(error => {
      if (error?.name !== 'AbortError') download(blob, name);
    });
    return true;
  }

  function saveFormat(button, format) {
    if (button.getAttribute('aria-disabled') === 'true' || !blobs[format] || !current) return;
    const name = format === STORY ? `${current.fileStem}-story.png` : `${current.fileStem}.png`;
    if (!shareFile(blobs[format], name)) download(blobs[format], name);
  }

  function copy(text, confirmation) {
    manual.hidden = true;
    const clipboard = view.navigator.clipboard;
    const attempt = clipboard ? clipboard.writeText(text) : Promise.reject(new Error('No clipboard'));
    attempt.then(() => say(confirmation), () => {
      manualBox.value = text;
      manual.hidden = false;
      say(textOf(document, 'copy.manual'));
      manualBox.focus();
      manualBox.select();
    });
  }

  save.addEventListener('click', () => saveFormat(save, POST));
  saveStory.addEventListener('click', () => saveFormat(saveStory, STORY));
  close.addEventListener('click', () => dialog.close());
  copyLink.addEventListener('click', () => {
    if (current) copy(current.url, textOf(document, 'copy.link'));
  });
  copyText.addEventListener('click', () => {
    if (current) copy(current.text, textOf(document, 'copy.text'));
  });
  nativeShare.addEventListener('click', () => {
    if (!current) return;
    view.navigator.share({ title: current.title, text: current.text, url: current.url }).catch(error => {
      if (error?.name !== 'AbortError') copy(current.url, textOf(document, 'copy.link'));
    });
  });
  dialog.addEventListener('close', () => {
    token += 1;
    const trigger = current?.trigger;
    current = null;
    reset();
    if (trigger?.isConnected) trigger.focus();
  });

  return { open };
}
