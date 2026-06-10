/*
 * WTFJHT self-hosted form renderer (Reader Survey 2026).
 * Vanilla JS, no framework — mirrors quiz.js conventions.
 * Schema-driven: reads the JSON form schema from the container's data-form attr,
 * renders one section per screen, validates per the §8.1 machine contract, and
 * submits stable option IDs (never display labels) to /api/survey/2026.
 *
 * Accessibility + resilience baked in: ARIA radiogroup NPS with arrow keys, error
 * association + focus management, a visible submit-failure path, draft persistence
 * across reloads, and a forwarded-link opt-out that is GENUINELY anonymous.
 */
(function () {
  'use strict';

  var root = document.getElementById('wtfjht-survey');
  if (!root) return;

  var form;
  try {
    form = JSON.parse(root.getAttribute('data-form'));
  } catch (e) {
    return;
  }
  if (!form || !form.sections) return;

  var apiRoot = root.getAttribute('data-api-url') || '';
  var DRAFT_KEY = 'wtfjht-survey-draft-' + (form.id || 'form');
  var REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // --- URL params: s (UNIQID), ed (date), src (channel). Strip from visible URL. ---
  var params = new URLSearchParams(window.location.search);
  var sParam = params.get('s') || '';
  var edParam = params.get('ed') || '';
  var srcParam = params.get('src') || '';
  // Unresolved Mailchimp merge tag → treat as absent (forwarded/preview).
  if (sParam.indexOf('*|') !== -1 || sParam.indexOf('UNIQID') !== -1) sParam = '';
  var subscriberPresent = !!sParam;
  var anonNonce = '';
  if (params.has('s') || params.has('ed') || params.has('src')) {
    var clean = window.location.pathname + window.location.hash;
    try { history.replaceState(null, '', clean); } catch (e) { /* ignore */ }
  }

  function makeNonce() {
    if (window.crypto && window.crypto.randomUUID) return 'anon-' + window.crypto.randomUUID();
    return 'anon-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // --- State ---
  var answers = {};            // { questionId: value }  value = id | [ids] | int | string
  var otherText = {};          // { questionId: "free text" } when `other` selected
  var sectionIndex = 0;
  var startedAt = Date.now();   // timing gate (anti-spam)
  var started = false;

  // --- Draft persistence (sessionStorage; survives reload, clears on tab close) ---
  // Keeps answers AND identity so an accidental refresh doesn't lose progress or
  // silently drop the subscriber link (the URL params are stripped after first paint).
  function persist() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        v: 1, answers: answers, otherText: otherText, sectionIndex: sectionIndex,
        s: sParam, ed: edParam, src: srcParam, anon: anonNonce, sub: subscriberPresent,
        startedAt: startedAt
      }));
      if (savedNote) savedNote.style.display = '';  // reveal the reassurance on first save
    } catch (e) { /* storage unavailable / full — degrade silently */ }
  }
  function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }
  function restoreDraft() {
    var incomingS = sParam;   // a fresh personalized link's UNIQID (URL), captured pre-restore
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { /* ignore */ }
    if (saved && saved.v === 1) {
      // A fresh link for a DIFFERENT subscriber must not inherit the prior draft's
      // answers (they'd submit under the new id). Discard the stale draft.
      if (incomingS && saved.s !== incomingS) {
        clearDraft();
      } else {
        answers = saved.answers || {};
        otherText = saved.otherText || {};
        sectionIndex = Math.max(0, Math.min(saved.sectionIndex || 0, form.sections.length));
        // No fresh URL identity → restore the saved one (reload strips the URL params).
        if (!sParam && saved.s) { sParam = saved.s; }
        if (!edParam && saved.ed) edParam = saved.ed;
        if (!srcParam && saved.src) srcParam = saved.src;
        if (saved.anon) anonNonce = saved.anon;
        subscriberPresent = !!sParam;
        // Restore the original start time so a reload + quick submit doesn't trip the
        // server's elapsed<3s spam gate (which silently drops the submission).
        if (typeof saved.startedAt === 'number' && saved.startedAt > 0 && saved.startedAt <= Date.now()) {
          startedAt = saved.startedAt;
        } else if (sectionIndex > 0 || Object.keys(answers).length) {
          startedAt = Date.now() - 4000;
        }
      }
    }
    if (!subscriberPresent && !anonNonce) anonNonce = makeNonce();
  }

  // Flatten visible-question helper respecting show_if.
  function isVisible(q) {
    if (!q.show_if) return true;
    var controlling = answers[q.show_if.field];
    return q.show_if.in.indexOf(controlling) !== -1;
  }

  // --- Build the shell DOM ---
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  root.innerHTML = '';
  var shell = el('div', 'survey');

  var header = el('div', 'survey-header');
  var h1 = el('h1', 'survey-title', form.title);
  header.appendChild(h1);
  if (form.intro) header.appendChild(el('p', 'survey-intro', form.intro));
  shell.appendChild(header);

  // Progress
  var progress = el('div', 'survey-progress');
  var progressBar = el('div', 'survey-progress-bar');
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', '100');
  var progressFill = el('div', 'survey-progress-fill');
  progressBar.appendChild(progressFill);
  var progressLabel = el('p', 'survey-progress-label');
  progress.appendChild(progressBar);
  progress.appendChild(progressLabel);
  // Passive save reassurance — revealed once they've answered something (reduces
  // abandonment anxiety, esp. against mobile interruptions). Not a button.
  var savedNote = el('p', 'survey-saved', 'Your answers save automatically on this device.');
  savedNote.style.display = 'none';
  progress.appendChild(savedNote);
  shell.appendChild(progress);

  // Live region for validation announcements (a11y)
  var live = el('div', 'survey-sr-only');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  shell.appendChild(live);

  var panel = el('div', 'survey-panel');
  shell.appendChild(panel);

  // Honeypot (off-screen; bots fill it)
  var hp = document.createElement('input');
  hp.type = 'text';
  hp.name = 'website';
  hp.tabIndex = -1;
  hp.autocomplete = 'off';
  hp.className = 'survey-hp';
  hp.setAttribute('aria-hidden', 'true');
  shell.appendChild(hp);

  // Visible form-level error (submit failures) — assertive so it's announced too.
  var submitError = el('p', 'survey-submit-error');
  submitError.setAttribute('role', 'alert');
  submitError.setAttribute('aria-live', 'assertive');
  submitError.tabIndex = -1;
  submitError.style.display = 'none';
  shell.appendChild(submitError);

  // Nav
  var nav = el('div', 'survey-nav');
  // Back speaks link-language (brand Ch15/Ch16), not a second button — holds "one primary button".
  var backBtn = el('button', 'survey-btn-back', 'Back');
  backBtn.type = 'button';
  var nextBtn = el('button', 'jaq-btn survey-btn-primary', 'Continue');
  nextBtn.type = 'button';
  nav.appendChild(backBtn);
  nav.appendChild(nextBtn);
  shell.appendChild(nav);

  root.appendChild(shell);

  // Total screens = content sections + 1 email/submit screen
  var totalScreens = form.sections.length + 1;

  function scrollToTop() {
    var top = (shell.getBoundingClientRect().top + window.pageYOffset) - 12;
    window.scrollTo({ top: top < 0 ? 0 : top, behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
  }
  function focusEl(node) { if (node) { try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); } } }

  // --- Boot orchestration: subscribers see a brief status check first ---
  function boot() {
    restoreDraft();
    started = false;
    if (subscriberPresent) {
      renderChecking();
      checkStatus(function (completed) {
        if (completed) renderAlready();
        else renderScreen();
      });
    } else {
      renderScreen();
    }
  }

  function renderChecking() {
    progress.style.display = 'none';
    nav.style.display = 'none';
    panel.innerHTML = '';
    panel.appendChild(el('p', 'survey-checking', 'Checking…'));
  }

  // Status check (already submitted?). Times out → just show the form.
  function checkStatus(done) {
    var settled = false;
    var finish = function (completed) { if (!settled) { settled = true; done(completed); } };
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); finish(false); }, 5000);
    fetch(apiRoot + '/api/survey/2026/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s: sParam }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { clearTimeout(timer); finish(!!(data && data.completed)); })
      .catch(function () { clearTimeout(timer); finish(false); });
  }

  function renderAlready() {
    progress.style.display = 'none';
    nav.style.display = 'none';
    panel.innerHTML = '';
    var heading = el('h2', 'survey-section-title', form.already_title || 'You’re all set.');
    heading.tabIndex = -1;
    panel.appendChild(heading);
    panel.appendChild(el('p', 'survey-thanks-body', form.already_body || 'You already submitted.'));
    // Forwarded-link escape hatch: "this isn't me" → start a GENUINELY anonymous session.
    var optout = el('button', 'survey-link-btn', form.anon_optout_label || 'This isn’t me — answer anonymously');
    optout.type = 'button';
    optout.addEventListener('click', function () {
      // Drop the subscriber identity entirely so submit() cannot send `s` (privacy).
      sParam = '';
      subscriberPresent = false;
      anonNonce = makeNonce();
      answers = {}; otherText = {}; sectionIndex = 0;
      clearDraft();
      progress.style.display = '';
      nav.style.display = '';
      renderScreen();
    });
    panel.appendChild(optout);
    focusEl(heading);
  }

  // --- Render the current screen ---
  // `scroll` true only on Back/Continue — moves focus to the new heading for AT users.
  function renderScreen(scroll) {
    if (!started) { started = true; gaEvent('survey_started'); }
    panel.innerHTML = '';
    live.textContent = '';
    clearSubmitError();
    progress.style.display = '';
    nav.style.display = '';

    var step = sectionIndex + 1;
    // Front-load the fill so early progress feels FAST — a fast-to-slow bar had the lowest
    // breakoff while a linear/slow-to-fast one nearly doubled it (Conrad/Couper). The step
    // label stays honest; only the visual fill is eased.
    var pct = Math.round(Math.pow(step / totalScreens, 0.62) * 100);
    progressFill.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', String(pct));
    progressLabel.textContent = 'Step ' + step + ' of ' + totalScreens;
    progressBar.setAttribute('aria-label', 'Step ' + step + ' of ' + totalScreens);

    var heading;
    if (sectionIndex < form.sections.length) {
      heading = renderSection(form.sections[sectionIndex]);
      nextBtn.textContent = 'Continue';
    } else {
      heading = renderFinal();
    }

    backBtn.style.visibility = sectionIndex === 0 ? 'hidden' : 'visible';
    if (scroll) { scrollToTop(); focusEl(heading); }
  }

  function renderSection(section) {
    var heading = el('h2', 'survey-section-title', section.title);
    heading.tabIndex = -1;
    panel.appendChild(heading);
    section.questions.forEach(function (q) {
      if (!isVisible(q)) return;       // hidden conditional branches render on demand
      panel.appendChild(renderQuestion(q));
    });
    return heading;
  }

  function renderQuestion(q) {
    var wrap = el('fieldset', 'survey-q');
    wrap.id = 'q-' + q.id;
    wrap.setAttribute('aria-describedby', 'err-' + q.id);
    var legend = el('legend', 'survey-q-label', q.label);
    legend.id = 'legend-' + q.id;
    if (q.required) { var star = el('span', 'survey-req', ' *'); star.setAttribute('aria-hidden', 'true'); legend.appendChild(star); }
    wrap.appendChild(legend);

    if (q.type === 'radio') wrap.appendChild(renderChoices(q, false));
    else if (q.type === 'checkbox') wrap.appendChild(renderChoices(q, true));
    else if (q.type === 'nps') wrap.appendChild(renderNps(q));
    else if (q.type === 'textarea') wrap.appendChild(renderTextarea(q));
    else if (q.type === 'email') wrap.appendChild(renderEmail(q));

    var err = el('p', 'survey-error');
    err.id = 'err-' + q.id;
    err.setAttribute('aria-live', 'polite');
    wrap.appendChild(err);
    return wrap;
  }

  function renderChoices(q, multi) {
    var group = el('div', 'survey-options');
    if (multi && q.max_select) {
      var counter = el('p', 'survey-counter');
      counter.id = 'counter-' + q.id;
      counter.setAttribute('aria-live', 'polite');
      updateCounter(q, counter);
      group.appendChild(counter);
    }
    q.options.forEach(function (opt) {
      var card = el('label', 'survey-option');
      var input = document.createElement('input');
      input.type = multi ? 'checkbox' : 'radio';
      input.name = q.id;
      input.value = opt.id;
      var current = answers[q.id];
      input.checked = multi ? (Array.isArray(current) && current.indexOf(opt.id) !== -1) : (current === opt.id);
      input.addEventListener('change', function () { onChoice(q, opt, input, multi, group); });
      card.appendChild(input);
      card.appendChild(el('span', 'survey-option-label', opt.label));
      group.appendChild(card);

      // "Other" free-text reveal
      if (q.has_other && opt.id === 'other') {
        input.setAttribute('aria-controls', 'other-' + q.id);
        input.setAttribute('aria-expanded', input.checked ? 'true' : 'false');
        var otherInput = document.createElement('input');
        otherInput.type = 'text';
        otherInput.className = 'jaq-input survey-other-input';
        otherInput.placeholder = 'Tell us more (optional)';
        otherInput.setAttribute('aria-label', (q.label || 'Other') + ' — please specify');
        otherInput.maxLength = 200;
        otherInput.value = otherText[q.id] || '';
        otherInput.style.display = input.checked ? '' : 'none';
        otherInput.id = 'other-' + q.id;
        otherInput.addEventListener('input', function () { otherText[q.id] = otherInput.value; persist(); });
        group.appendChild(otherInput);
      }
    });
    return group;
  }

  function onChoice(q, opt, input, multi, group) {
    if (!multi) {
      answers[q.id] = opt.id;
      toggleOther(q, group, opt.id === 'other' && input.checked);
      // Branch controller (e.g. Q13) → show/hide conditional follow-ups in place
      // (no full re-render: keeps this radio's focus and avoids a flicker).
      if (form.sections[sectionIndex] && hasConditional(form.sections[sectionIndex])) {
        refreshConditionals(form.sections[sectionIndex]);
      }
      clearError(q); persist();
      return;
    }
    // checkbox
    var arr = Array.isArray(answers[q.id]) ? answers[q.id].slice() : [];
    if (input.checked) {
      // exclusive option (e.g. "none") clears the rest; any other clears the exclusive
      if (q.exclusive && opt.id === q.exclusive) arr = [opt.id];
      else {
        if (q.exclusive) arr = arr.filter(function (x) { return x !== q.exclusive; });
        // max_select guard: revert this pick + announce (no disabling of other options)
        if (q.max_select && arr.length >= q.max_select) {
          input.checked = false;
          announce('You can choose up to ' + q.max_select + '. Uncheck one to choose another.');
          return;
        }
        arr.push(opt.id);
      }
    } else {
      arr = arr.filter(function (x) { return x !== opt.id; });
    }
    answers[q.id] = arr;
    if (opt.id === 'other') toggleOther(q, group, input.checked);
    syncCheckboxUI(q, group);
    clearError(q); persist();
  }

  // Reflect the answer array back onto the checkbox UI. NOTE: options are never
  // disabled — disabled controls are skipped by assistive tech and give no recovery
  // path. Enforcement lives in onChoice (revert + announce); this only syncs checked
  // state + the counter.
  function syncCheckboxUI(q, group) {
    var arr = Array.isArray(answers[q.id]) ? answers[q.id] : [];
    var inputs = group.querySelectorAll('input[type=checkbox]');
    inputs.forEach(function (inp) { inp.checked = arr.indexOf(inp.value) !== -1; });
    if (q.max_select) updateCounter(q, document.getElementById('counter-' + q.id));
  }

  function updateCounter(q, counterEl) {
    if (!counterEl) return;
    var n = Array.isArray(answers[q.id]) ? answers[q.id].length : 0;
    counterEl.textContent = n + ' of ' + q.max_select + ' selected';
  }

  function toggleOther(q, group, show) {
    var oi = group.querySelector('#other-' + q.id);
    if (oi) { oi.style.display = show ? '' : 'none'; if (!show) { oi.value = ''; otherText[q.id] = ''; } }
    var trigger = group.querySelector('input[value="other"]');
    if (trigger && trigger.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', show ? 'true' : 'false');
  }

  // --- NPS as an ARIA radiogroup with roving tabindex + arrow-key navigation ---
  function renderNps(q) {
    var box = el('div', 'survey-nps');
    var row = el('div', 'survey-nps-row');
    row.setAttribute('role', 'radiogroup');
    row.setAttribute('aria-labelledby', 'legend-' + q.id);
    var btns = [];
    for (var i = q.min; i <= q.max; i++) {
      (function (val, idx) {
        var btn = el('button', 'survey-nps-btn', String(val));
        btn.type = 'button';
        btn.setAttribute('role', 'radio');
        var selected = answers[q.id] === val;
        btn.setAttribute('aria-checked', selected ? 'true' : 'false');
        var name = String(val);
        if (val === q.min && q.min_label) name += ' — ' + q.min_label;
        if (val === q.max && q.max_label) name += ' — ' + q.max_label;
        btn.setAttribute('aria-label', name);
        if (selected) btn.classList.add('is-selected');
        // roving tabindex: the selected button is tabbable; if none selected, the first is.
        btn.tabIndex = (selected || (answers[q.id] == null && idx === 0)) ? 0 : -1;
        btn.addEventListener('click', function () { selectNps(q, val, btns); });
        btn.addEventListener('keydown', function (e) { npsKeydown(e, q, idx, btns); });
        btns.push(btn);
        row.appendChild(btn);
      })(i, i - q.min);
    }
    box.appendChild(row);
    var labels = el('div', 'survey-nps-labels');
    labels.appendChild(el('span', null, q.min_label || ''));
    labels.appendChild(el('span', null, q.max_label || ''));
    box.appendChild(labels);
    return box;
  }
  function selectNps(q, val, btns) {
    answers[q.id] = val;  // 0 is a real answer
    btns.forEach(function (b) {
      var on = Number(b.textContent) === val;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    clearError(q); persist();
  }
  function npsKeydown(e, q, idx, btns) {
    var dir = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') dir = 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') dir = -1;
    else return;
    e.preventDefault();
    var next = idx + dir;
    if (next < 0) next = btns.length - 1;
    if (next >= btns.length) next = 0;
    selectNps(q, q.min + next, btns);
    btns[next].focus();
  }

  function renderTextarea(q) {
    var ta = document.createElement('textarea');
    ta.className = 'jaq-textarea';
    ta.id = 'input-' + q.id;
    ta.setAttribute('aria-labelledby', 'legend-' + q.id);
    ta.maxLength = q.maxlength || 5000;
    ta.value = answers[q.id] || '';
    ta.addEventListener('input', function () { answers[q.id] = ta.value; clearError(q); persist(); });
    return ta;
  }

  function renderEmail(q) {
    var input = document.createElement('input');
    input.type = 'email';
    input.className = 'jaq-input';
    input.id = 'input-' + q.id;
    input.setAttribute('aria-labelledby', 'legend-' + q.id);
    input.maxLength = q.maxlength || 254;
    input.autocomplete = 'email';
    // Right mobile keyboard, no auto-mangling of the address (Baymard).
    input.inputMode = 'email';
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    input.spellcheck = false;
    input.value = answers[q.id] || '';
    input.addEventListener('input', function () { answers[q.id] = input.value.trim(); clearError(q); persist(); });
    return input;
  }

  function renderFinal() {
    var heading = el('h2', 'survey-section-title', 'One last thing');
    heading.tabIndex = -1;
    panel.appendChild(heading);
    panel.appendChild(renderQuestion(form.email));
    nextBtn.textContent = form.submit_label || 'Submit';
    return heading;
  }

  // --- Conditional branch helpers (targeted, no section rebuild) ---
  function hasConditional(section) {
    return section.questions.some(function (q) { return !!q.show_if; });
  }
  function refreshConditionals(section) {
    section.questions.forEach(function (q) {
      if (!q.show_if) return;
      var existing = document.getElementById('q-' + q.id);
      var visible = isVisible(q);
      if (visible && !existing) {
        var node = renderQuestion(q);
        var anchor = previousPresentNode(section, q);
        if (anchor && anchor.nextSibling) panel.insertBefore(node, anchor.nextSibling);
        else panel.appendChild(node);
        announce('A follow-up question appeared.');
        // The one good auto-scroll: a NEW element appeared, so guiding the eye to it is
        // expected, not jarring (respects reduced-motion).
        try { node.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block: 'nearest' }); } catch (e) { /* ignore */ }
      } else if (!visible && existing) {
        existing.parentNode.removeChild(existing);
        delete answers[q.id]; delete otherText[q.id];
      }
    });
    persist();
  }
  // The nearest preceding question (in schema order) currently in the DOM — anchors
  // an inserted conditional so it lands in the right place.
  function previousPresentNode(section, q) {
    var idx = section.questions.indexOf(q);
    for (var i = idx - 1; i >= 0; i--) {
      var node = document.getElementById('q-' + section.questions[i].id);
      if (node) return node;
    }
    return null;
  }

  // --- Validation ---
  function validateSection() {
    var ok = true; var firstBad = null;
    var questions = sectionIndex < form.sections.length ? form.sections[sectionIndex].questions : [form.email];
    questions.forEach(function (q) {
      if (!isVisible(q)) return;
      var v = answers[q.id];
      var bad = false;
      if (q.required) {
        if (q.type === 'checkbox') bad = !Array.isArray(v) || v.length === 0;
        else if (q.type === 'nps') bad = !(typeof v === 'number');           // 0 is valid
        else if (q.type === 'textarea' || q.type === 'email') bad = (typeof v !== 'string' || v.trim() === '');
        else bad = (v == null || v === '');
      }
      if (!bad && q.type === 'checkbox' && q.max_select && Array.isArray(v) && v.length > q.max_select) bad = true;
      if (!bad && q.type === 'email' && v) bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
      if (bad) {
        ok = false;
        showError(q, q.type === 'email' ? 'Please enter a valid email or leave it blank.' :
          (q.type === 'checkbox' && q.max_select ? 'Please pick up to ' + q.max_select + '.' : 'This one’s required.'));
        if (!firstBad) firstBad = q;
      }
    });
    if (!ok && firstBad) {
      var node = document.getElementById('q-' + firstBad.id);
      if (node) {
        node.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block: 'center' });
        var focusable = node.querySelector('input:not([type=hidden]), textarea, button, [tabindex]');
        focusEl(focusable || node);
      }
      announce('Please complete the highlighted question.');
      gaEvent('survey_validation_rejected');
    }
    return ok;
  }

  function showError(q, msg) {
    var e = document.getElementById('err-' + q.id);
    if (e) e.textContent = msg;
    var node = document.getElementById('q-' + q.id);
    if (node) { node.classList.add('has-error'); node.setAttribute('aria-invalid', 'true'); }
  }
  function clearError(q) {
    var e = document.getElementById('err-' + q.id);
    if (e) e.textContent = '';
    var node = document.getElementById('q-' + q.id);
    if (node) { node.classList.remove('has-error'); node.removeAttribute('aria-invalid'); }
  }
  function announce(msg) { live.textContent = msg; }
  function showSubmitError(msg) {
    submitError.textContent = msg;
    submitError.style.display = '';
    focusEl(submitError);
  }
  function clearSubmitError() { submitError.textContent = ''; submitError.style.display = 'none'; }

  // --- Nav handlers ---
  nextBtn.addEventListener('click', function () {
    if (!validateSection()) return;
    if (sectionIndex < form.sections.length) {
      gaEvent('survey_section_complete', { section: form.sections[sectionIndex].id });
      sectionIndex++;
      persist();
      renderScreen(true);
    } else {
      submit();
    }
  });
  backBtn.addEventListener('click', function () {
    if (sectionIndex > 0) { sectionIndex--; persist(); renderScreen(true); }
  });

  // --- Submit ---
  function submit() {
    if (hp.value) return;  // honeypot tripped — silently drop
    clearSubmitError();
    var elapsed = (Date.now() - startedAt) / 1000;
    nextBtn.disabled = true;
    nextBtn.textContent = 'Submitting…';

    var payload = {
      // Only send the subscriber id if we're still in a subscriber session — after the
      // "this isn't me" opt-out, subscriberPresent is false and `s` must NOT leak.
      s: subscriberPresent ? sParam : '',
      ed: edParam || '',
      src: srcParam || '',
      anon: subscriberPresent ? '' : anonNonce,
      elapsed: elapsed,
      answers: answers,
      other: otherText
    };
    var token = getTurnstileToken();
    if (token) payload.turnstile = token;

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    var done = false;
    var fail = function (err) {
      if (done) return; done = true; clearTimeout(timer);
      nextBtn.disabled = false;
      nextBtn.textContent = form.submit_label || 'Submit';
      showSubmitError('Something went wrong submitting — your answers are still here. Please try again.');
      if (window.console) console.error(err);
    };

    fetch(apiRoot + '/api/survey/2026', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (!r.ok) throw new Error('submit failed: ' + r.status);
      return r.json().catch(function () { return {}; });
    }).then(function () {
      done = true; clearTimeout(timer);
      gaEvent('survey_submitted');
      clearDraft();
      renderThanks();
    }).catch(fail);
  }

  function getTurnstileToken() {
    var f = document.querySelector('[name="cf-turnstile-response"]');
    return f ? f.value : '';
  }

  function renderThanks() {
    progress.style.display = 'none';
    nav.style.display = 'none';
    clearSubmitError();
    panel.innerHTML = '';
    var heading = el('h2', 'survey-section-title', form.thanks_title || 'Thank you.');
    heading.tabIndex = -1;
    panel.appendChild(heading);
    panel.appendChild(el('p', 'survey-thanks-body', form.thanks_body || 'Your answers are in.'));
    focusEl(heading);
  }

  // --- GA4 ---
  function gaEvent(name, extra) {
    if (typeof gtag !== 'function') return;
    var data = extra || {};
    if (name === 'survey_started' || name === 'survey_submitted') data.subscriber_present = subscriberPresent;
    gtag('event', name, data);
  }

  // Boot
  boot();
})();
