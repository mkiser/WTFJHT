---
title: "I'm not sure where I pay"
description: A few quick checks to find which platform charged you, plus a safe way to send WTFJHT a support request without sharing sensitive payment details.
layout: support
permalink: /support/not-sure/
sitemap: true
---

<div class="support support-notsure">
  <header class="support-hero support-hero--compact">
    <p class="support-breadcrumb"><a href="/support/">&larr; Manage your support</a></p>
    <h1 class="page-title support-hero__title">Not sure where you pay?</h1>
    <p class="support-hero__lead">That's common — support has moved across a few platforms over the years. These checks usually settle it in a minute, and you never have to share a password or full card number.</p>
  </header>

  <section class="support-steps" aria-labelledby="steps-heading">
    <h2 id="steps-heading" class="support-section__title">Four quick checks</h2>
    <ol class="support-steps__list">
      <li class="support-step">
        <h3 class="support-step__title">Search your email for a receipt</h3>
        <p>Search every inbox you use for <strong>WTFJHT</strong>, <strong>Memberful</strong>, <strong>Patreon</strong>, <strong>Donorbox</strong>, or <strong>PayPal</strong>. The receipt's sender usually names the platform that charged you.</p>
      </li>
      <li class="support-step">
        <h3 class="support-step__title">Read the text next to the charge</h3>
        <p>On your bank or card statement, look at the exact description beside the charge. It often reads like <span class="support-code">Memberful</span>, <span class="support-code">Patreon* WTF</span>, <span class="support-code">Donorbox</span>, or <span class="support-code">PP*WTFJHT</span>.</p>
      </li>
      <li class="support-step">
        <h3 class="support-step__title">Try your other email addresses</h3>
        <p>Accounts are often under a personal, work, old, or mistyped address — or an Apple <strong>Hide My Email</strong> private-relay address. The email that receives the newsletter can be different from the one on the payment.</p>
      </li>
      <li class="support-step">
        <h3 class="support-step__title">Still stuck? Send a safe request</h3>
        <p>If the checks above don't resolve it, use the form below. Send only what's needed to find your account — I'll take it from there.</p>
        <p><a class="support-btn support-btn--ghost" href="#support-request">Jump to the support form</a></p>
      </li>
    </ol>
    <p class="support-steps__foot">Already know the platform? <a href="/support/#platforms">Go straight to the platform you use</a>.</p>
  </section>

  <section class="support-request" id="support-request" aria-labelledby="request-heading">
    <h2 id="request-heading" class="support-section__title">Send a support request</h2>
    <p class="support-section__intro">I read every one of these and reply personally. There's no login and no account lookup on this page — just tell me what's going on.</p>

    <form id="support-form" class="support-form jaq-form" novalidate>
      <div class="support-form__summary" id="support-form-summary" role="alert" aria-live="assertive" tabindex="-1" hidden></div>

      <div class="support-warning" role="note" aria-label="Safety notice">
        <p class="support-warning__title">Please keep yourself safe</p>
        <p class="support-warning__body">Never send a password, full card number, expiration date, security code, bank account number, or unredacted financial statement.</p>
      </div>

      <div class="jaq-field">
        <label class="jaq-label" for="support-email">Your email <span class="support-req">(required)</span></label>
        <input class="jaq-input" type="email" id="support-email" name="replyEmail" required maxlength="254" autocomplete="email" aria-describedby="support-email-hint support-email-error">
        <span class="jaq-hint" id="support-email-hint">So I can reply. Use the address where you'd like the answer.</span>
        <span class="jaq-field-error" id="support-email-error" aria-live="polite"></span>
      </div>

      <div class="jaq-field">
        <label class="jaq-label" for="support-category">What do you need help with? <span class="support-req">(required)</span></label>
        <select class="jaq-select" id="support-category" name="category" required aria-describedby="support-category-error">
          <option value="" disabled selected>Choose one&hellip;</option>
          <option value="manage_cancel">Manage or cancel my support</option>
          <option value="payments">A charge, renewal, or receipt</option>
          <option value="update_payment">Update my payment method</option>
          <option value="find_account">Find my account or which platform</option>
          <option value="refund">A refund or a wrong amount</option>
          <option value="newsletter">Newsletter delivery (start, stop, not arriving)</option>
          <option value="other">Something else</option>
        </select>
        <span class="jaq-field-error" id="support-category-error" aria-live="polite"></span>
      </div>

      <div class="jaq-field">
        <label class="jaq-label" for="support-message">What's going on? <span class="support-req">(required)</span></label>
        <textarea class="jaq-textarea" id="support-message" name="message" required minlength="10" maxlength="4000" aria-describedby="support-message-hint support-message-error" placeholder="Tell me what happened and what you'd like to do. The more context, the faster I can help."></textarea>
        <span class="jaq-hint" id="support-message-hint">In your own words. Please don't paste full card numbers or passwords.</span>
        <span class="jaq-counter" id="support-message-counter">0 / 4,000</span>
        <span class="jaq-field-error" id="support-message-error" aria-live="polite"></span>
      </div>

      <fieldset class="support-fieldset">
        <legend class="support-fieldset__legend">If this is about a charge</legend>
        <p class="support-fieldset__hint">Fill in what you can — it helps me find the payment. Leave blank if it doesn't apply.</p>
        <div class="jaq-field">
          <label class="jaq-label" for="support-chargedate">Charge date</label>
          <input class="jaq-input" type="date" id="support-chargedate" name="chargeDate">
        </div>
        <div class="support-field-row">
          <div class="jaq-field">
            <label class="jaq-label" for="support-amount">Amount</label>
            <input class="jaq-input" type="text" id="support-amount" name="amount" inputmode="decimal" maxlength="16" placeholder="e.g. 50.00" autocomplete="off" aria-describedby="support-amount-error">
            <span class="jaq-field-error" id="support-amount-error" aria-live="polite"></span>
          </div>
          <div class="jaq-field">
            <label class="jaq-label" for="support-currency">Currency</label>
            <input class="jaq-input" type="text" id="support-currency" name="currency" maxlength="3" placeholder="USD" autocomplete="off">
          </div>
        </div>
        <div class="jaq-field">
          <label class="jaq-label" for="support-statement">Statement description</label>
          <input class="jaq-input" type="text" id="support-statement" name="statementDescription" maxlength="140" placeholder="The text next to the charge, e.g. PP*WTFJHT" autocomplete="off">
        </div>
      </fieldset>

      <fieldset class="support-fieldset">
        <legend class="support-fieldset__legend">Optional &mdash; only if it helps</legend>
        <div class="jaq-field">
          <label class="jaq-label" for="support-platform">Which platform, if you know</label>
          <select class="jaq-select" id="support-platform" name="platform">
            <option value="" selected>Not sure</option>
            <option value="memberful">Current WTFJHT membership (Memberful)</option>
            <option value="patreon">Patreon</option>
            <option value="donorbox">Donorbox</option>
            <option value="paypal">PayPal</option>
            <option value="other">Another platform</option>
          </select>
        </div>
        <div class="jaq-field">
          <label class="jaq-label" for="support-emails">Other emails you might have used</label>
          <input class="jaq-input" type="text" id="support-emails" name="possibleEmails" maxlength="300" autocomplete="off" placeholder="work, old, or private-relay addresses, comma-separated">
          <span class="jaq-hint">Accounts are often under an old, work, or masked email.</span>
        </div>
        <div class="jaq-field">
          <label class="jaq-label" for="support-lastfour">Card last four digits</label>
          <input class="jaq-input" type="text" id="support-lastfour" name="cardLastFour" inputmode="numeric" maxlength="4" pattern="\d{4}" autocomplete="off" placeholder="1234" aria-describedby="support-lastfour-hint support-lastfour-error">
          <span class="jaq-hint" id="support-lastfour-hint">The <strong>last four only</strong> — never the full number.</span>
          <span class="jaq-field-error" id="support-lastfour-error" aria-live="polite"></span>
        </div>
      </fieldset>

      <div class="jaq-hp" aria-hidden="true">
        <label for="support-website">Website</label>
        <input type="text" id="support-website" name="website" tabindex="-1" autocomplete="off">
      </div>

      <input type="hidden" id="support-rendered" name="_rendered" value="">
      <input type="hidden" id="support-ref" name="ref" value="">

      <div id="support-turnstile-fallback" class="support-fallback" hidden>
        <p class="support-fallback__text">Your browser's privacy settings blocked our bot check. One tap to confirm and send:</p>
        <button id="support-turnstile-fallback-btn" class="jaq-btn" type="button" disabled>Confirm and send</button>
      </div>

      <div class="jaq-field">
        <button type="submit" class="jaq-btn" id="support-submit">Send my request</button>
        <div class="jaq-error" id="support-form-error" role="alert" aria-live="polite"></div>
      </div>

      <p class="support-form__privacy">Sent over an encrypted connection to WTFJHT and used only to reply to you. See the <a href="/license/">license and privacy notes</a>.</p>
    </form>

    <div id="support-confirmation" class="support-confirmation" hidden>
      <h3 class="support-confirmation__title">Got it — thank you.</h3>
      <p>Your request is in. I'll reply to the email you gave me, usually within a few days.</p>
      <p id="support-reference" class="support-confirmation__ref" hidden></p>
      <p>A reminder: never send a password or full card number by email. If you need to update a card, do it on your platform's own secure page from the <a href="/support/">Manage your support</a> guide.</p>
    </div>

    <noscript>
      <div class="support-warning" role="note">
        <p class="support-warning__title">The form needs JavaScript</p>
        <p class="support-warning__body">Your browser has JavaScript turned off, so the form can't send. Email me directly at <a href="mailto:matt@whatthefuckjusthappenedtoday.com?subject=WTFJHT%20support%20request">matt@whatthefuckjusthappenedtoday.com</a> and include: what you need (manage, cancel, a charge, a refund, or delivery), the charge date and amount if it's about a payment, and any email addresses you may have used. <strong>Never</strong> include a password, full card number, expiration date, or security code.</p>
      </div>
    </noscript>
  </section>
</div>

<div id="cf-turnstile" style="display:none"></div>

<script>
(function () {
  var WORKER_URL = 'https://whatthefuckjusthappenedtoday.com/api/support';
  var SUPPORT_EMAIL = 'matt@whatthefuckjusthappenedtoday.com';

  var form = document.getElementById('support-form');
  if (!form) return;
  var requestSection = document.getElementById('support-request');
  var confirmation = document.getElementById('support-confirmation');
  var referenceEl = document.getElementById('support-reference');
  var submitBtn = document.getElementById('support-submit');
  var formError = document.getElementById('support-form-error');
  var summary = document.getElementById('support-form-summary');
  var fallbackBanner = document.getElementById('support-turnstile-fallback');
  var fallbackBtn = document.getElementById('support-turnstile-fallback-btn');

  var emailField = document.getElementById('support-email');
  var categoryField = document.getElementById('support-category');
  var messageField = document.getElementById('support-message');
  var counter = document.getElementById('support-message-counter');
  var amountField = document.getElementById('support-amount');
  var lastFourField = document.getElementById('support-lastfour');

  function err(id) { return document.getElementById(id); }
  function gaEvent(name, params) { if (typeof gtag === 'function') gtag('event', name, params || {}); }

  // --- Turnstile (managed mode, programmatic render) — mirrors the JAQ wiring ---
  var turnstileWidgetId = null;
  var turnstileResolve;
  var turnstileReady = new Promise(function (resolve) { turnstileResolve = resolve; });
  var turnstileTokenUsed = false;

  var idempotencyKey = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'sup-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  var posting = false;

  window.onSupportTurnstileLoad = function () {
    if (typeof turnstile === 'undefined') { turnstileResolve(null); return; }
    try {
      turnstileWidgetId = turnstile.render('#cf-turnstile', {
        sitekey: '{{ site.turnstile_site_key }}',
        callback: function (token) { turnstileResolve(token); },
        'error-callback': function () { turnstileResolve(null); },
        'expired-callback': function () { turnstileTokenUsed = true; }
      });
    } catch (e) { turnstileResolve(null); }
  };
  setTimeout(function () { turnstileResolve(null); }, 10000);

  function getFreshToken() {
    if (!turnstileTokenUsed) return turnstileReady;
    turnstileTokenUsed = false;
    turnstileReady = new Promise(function (resolve) {
      turnstileResolve = resolve;
      setTimeout(function () { resolve(null); }, 10000);
    });
    if (turnstileWidgetId !== null && typeof turnstile !== 'undefined') {
      try { turnstile.reset(turnstileWidgetId); } catch (e) { turnstileResolve(null); }
    } else {
      turnstileResolve(null);
    }
    return turnstileReady;
  }

  // --- Init: timestamp, ref, category from query param ---
  document.getElementById('support-rendered').value = Date.now();
  var params = new URLSearchParams(window.location.search);
  document.getElementById('support-ref').value = params.get('ref') || '';
  var presetCategory = params.get('category');
  if (presetCategory) {
    var opt = categoryField.querySelector('option[value="' + presetCategory.replace(/[^a-z_]/g, '') + '"]');
    if (opt) { categoryField.value = opt.value; }
  }

  // --- Character counter ---
  messageField.addEventListener('input', function () {
    counter.textContent = this.value.length.toLocaleString() + ' / 4,000';
  });

  // --- Clear inline errors + fire form_started once ---
  var startedFired = false;
  function markStarted() {
    if (startedFired) return;
    startedFired = true;
    gaEvent('support_form_started', { category: categoryField.value || 'unset' });
  }
  categoryField.addEventListener('change', function () { err('support-category-error').textContent = ''; markStarted(); });
  emailField.addEventListener('input', function () { err('support-email-error').textContent = ''; });
  messageField.addEventListener('input', function () { err('support-message-error').textContent = ''; markStarted(); });
  amountField.addEventListener('input', function () { err('support-amount-error').textContent = ''; });
  lastFourField.addEventListener('input', function () { err('support-lastfour-error').textContent = ''; });

  // --- Sensitive-data safety net: block likely full card numbers (Luhn) ---
  function digitsOnly(s) { return (s || '').replace(/[\s-]/g, ''); }
  function luhnValid(num) {
    var sum = 0, alt = false;
    for (var i = num.length - 1; i >= 0; i--) {
      var d = parseInt(num.charAt(i), 10);
      if (isNaN(d)) return false;
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    return sum % 10 === 0;
  }
  function containsCardNumber(text) {
    if (!text) return false;
    var matches = text.match(/\d(?:[\s-]?\d){12,18}/g);
    if (!matches) return false;
    for (var i = 0; i < matches.length; i++) {
      var d = digitsOnly(matches[i]);
      if (d.length >= 13 && d.length <= 19 && luhnValid(d)) return true;
    }
    return false;
  }

  // --- Accessible error summary ---
  function showSummary(messages) {
    if (!messages.length) { summary.hidden = true; summary.textContent = ''; return; }
    summary.hidden = false;
    summary.textContent = messages.length === 1
      ? messages[0]
      : 'Please fix the following: ' + messages.join(' ');
    summary.focus();
  }

  function buildPayload() {
    var emails = document.getElementById('support-emails').value.trim();
    return {
      replyEmail: emailField.value.trim(),
      category: categoryField.value,
      message: messageField.value.trim(),
      chargeDate: document.getElementById('support-chargedate').value,
      amount: amountField.value.trim(),
      currency: document.getElementById('support-currency').value.trim(),
      statementDescription: document.getElementById('support-statement').value.trim(),
      platform: document.getElementById('support-platform').value,
      possibleEmails: emails ? emails.split(',').map(function (e) { return e.trim(); }).filter(Boolean) : [],
      cardLastFour: lastFourField.value.trim(),
      website: document.getElementById('support-website').value,
      _rendered: parseInt(document.getElementById('support-rendered').value, 10),
      ref: document.getElementById('support-ref').value,
      idempotencyKey: idempotencyKey
    };
  }

  function showFallbackToEmail(msg) {
    formError.innerHTML = (msg ? msg + ' ' : '') +
      'You can also email me directly at <a href="mailto:' + SUPPORT_EMAIL +
      '?subject=WTFJHT%20support%20request">' + SUPPORT_EMAIL + '</a>.';
    posting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send my request';
  }

  function handleResponse(result) {
    if (result && result.data && result.data.ok) {
      requestSection.querySelectorAll('.support-form, .support-warning, .support-section__intro').forEach(function (el) {
        if (el.tagName === 'FORM' || el.classList.contains('support-form')) el.hidden = true;
      });
      form.hidden = true;
      confirmation.hidden = false;
      if (result.data.referenceId && referenceEl) {
        referenceEl.hidden = false;
        referenceEl.textContent = 'Your reference number is ' + result.data.referenceId + '.';
      }
      confirmation.setAttribute('tabindex', '-1');
      confirmation.focus();
      gaEvent('support_form_submitted', { category: categoryField.value, platform: document.getElementById('support-platform').value || 'unknown' });
      return;
    }
    if (result && result.status === 429) {
      showFallbackToEmail((result.data && result.data.error) || 'That’s a lot of requests in a short time — please wait a few minutes and try again.');
    } else {
      showFallbackToEmail((result && result.data && result.data.error) || 'Something went wrong sending that.');
    }
  }

  function handleError() {
    showFallbackToEmail("Couldn’t reach the server.");
  }

  function postPayload(payload) {
    if (posting) return Promise.resolve();
    posting = true;
    turnstileTokenUsed = true;
    return fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
      .then(handleResponse)
      .catch(handleError);
  }

  fallbackBtn.addEventListener('click', function () {
    fallbackBtn.disabled = true;
    var payload = buildPayload();
    payload.fallback = true;
    postPayload(payload).then(function () {
      if (!form.hidden) fallbackBtn.disabled = false;
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.textContent = '';
    ['support-email-error', 'support-category-error', 'support-message-error', 'support-amount-error', 'support-lastfour-error'].forEach(function (id) { err(id).textContent = ''; });

    var email = emailField.value.trim();
    var category = categoryField.value;
    var message = messageField.value.trim();
    var amount = amountField.value.trim();
    var lastFour = lastFourField.value.trim();
    var problems = [];

    if (!email) { err('support-email-error').textContent = 'Please add an email so I can reply.'; problems.push('Add your email.'); }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err('support-email-error').textContent = 'Please enter a valid email address.'; problems.push('Check your email address.'); }
    if (!category) { err('support-category-error').textContent = 'Please choose what you need help with.'; problems.push('Choose a category.'); }
    if (message.length < 10) { err('support-message-error').textContent = 'Please add a little more detail (at least 10 characters).'; problems.push('Describe what’s going on.'); }
    else if (message.length > 4000) { err('support-message-error').textContent = 'Please keep this under 4,000 characters.'; problems.push('Shorten your message.'); }
    if (amount && !/^\$?\d{1,7}([.,]\d{1,2})?$/.test(amount)) { err('support-amount-error').textContent = 'Enter the amount as a number, e.g. 50.00.'; problems.push('Check the amount.'); }
    if (lastFour && !/^\d{4}$/.test(lastFour)) { err('support-lastfour-error').textContent = 'Enter the last four digits only.'; problems.push('Card field should be four digits.'); }

    if (problems.length) { showSummary(problems); return; }

    // Sensitive-data safety net — block likely full card numbers, do not echo the value.
    var scan = [message, document.getElementById('support-statement').value, amount, document.getElementById('support-emails').value].join(' ');
    if (containsCardNumber(scan)) {
      gaEvent('support_form_blocked_sensitive_data', { rule: 'card_number' });
      err('support-message-error').textContent = 'It looks like that includes a full card number. Please remove it — the last four digits are all that’s ever needed.';
      showSummary(['Please remove the full card number. Send only the last four digits.']);
      messageField.focus();
      return;
    }

    showSummary([]);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    getFreshToken().then(function (token) {
      if (token) {
        var payload = buildPayload();
        payload.turnstile = token;
        postPayload(payload);
        return;
      }
      fallbackBanner.hidden = false;
      submitBtn.textContent = 'Sending…';
      setTimeout(function () { fallbackBtn.disabled = false; }, 500);
    });
  });
})();
</script>

<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onSupportTurnstileLoad" async defer></script>
