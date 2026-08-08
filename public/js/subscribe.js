/**
 * Progressive enhancement for the newsletter subscribe form.
 *
 * When the form carries data-subscribe-api (set from site.subscribe_api in
 * _config.yml) AND a Turnstile token is present, submissions POST to the
 * Turnstile-verified subscribe worker, which adds the member via the
 * Mailchimp API with the `site-form` tag — the tag the Welcome automation
 * trusts. Every other case (no JS, no config, Turnstile blocked or not yet
 * solved, worker unconfigured/down) falls back to the form's native action:
 * Mailchimp's legacy hosted endpoint. No user is ever blocked from
 * subscribing by this layer.
 *
 * The GA4 sign_up listener in _layouts/default.html binds to the same submit
 * event and fires before this handler decides the path, so analytics is
 * identical on both paths. Fallback uses form.submit(), which does NOT
 * re-fire submit listeners — no double-count, no interception loop.
 */
(function () {
  'use strict';

  function renderedStamp(form) {
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = '_rendered';
    input.value = String(Date.now());
    form.appendChild(input);
  }

  function tokenFor(form) {
    var field = form.querySelector('[name="cf-turnstile-response"]');
    return field ? field.value : '';
  }

  function showSuccess(form) {
    var row = form.querySelector('.subscribe-form__row');
    var trust = form.querySelector('.subscribe-form__trust');
    if (row) row.style.display = 'none';
    if (trust) trust.textContent = 'You’re in — check your inbox around 3 pm Pacific.';
  }

  function unlock(form) {
    form.removeAttribute('data-subscribing');
    var button = form.querySelector('input[type="submit"]');
    if (button) button.disabled = false;
  }

  // Worker said the address is undeliverable (NeverBounce: invalid/disposable).
  // Show an error and let the reader fix the typo — do NOT fall back to the
  // legacy endpoint; that would subscribe the bad address anyway.
  function showReject(form, suggestion) {
    unlock(form);
    var trust = form.querySelector('.subscribe-form__trust');
    if (trust) {
      trust.textContent = suggestion
        ? 'That email address doesn’t look deliverable — did you mean ' + suggestion + '?'
        : 'That email address doesn’t look deliverable — double-check the spelling?';
    }
    var emailInput = form.querySelector('input[type="email"]');
    if (emailInput) {
      if (suggestion) emailInput.value = suggestion;
      emailInput.focus();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('form[data-subscribe-api]');
    Array.prototype.forEach.call(forms, function (form) {
      renderedStamp(form);

      form.addEventListener('submit', function (event) {
        var api = form.getAttribute('data-subscribe-api');
        var emailInput = form.querySelector('input[type="email"]');
        var email = emailInput ? emailInput.value.trim() : '';
        var token = tokenFor(form);

        // No fetch (ancient browser), no token (Turnstile blocked, still
        // solving, or not configured): let the native submission proceed to
        // the legacy endpoint. Never preventDefault before these guards —
        // a dead-ended form is the one unacceptable outcome.
        if (typeof fetch !== 'function' || !api || !email || !token) return;

        // In-flight lock: a second submit while the worker call is pending
        // would burn the single-use Turnstile token and double-post.
        if (form.getAttribute('data-subscribing') === '1') {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        form.setAttribute('data-subscribing', '1');
        var button = form.querySelector('input[type="submit"]');
        if (button) button.disabled = true;

        function fallbackToLegacy() {
          // Same-tab navigation: a delayed programmatic submit to _blank can
          // be popup-blocked, which would look like nothing happened. The
          // legacy endpoint's confirmation page in this tab is the reliable
          // path. form.submit() re-fires no listeners (no loop, no double GA).
          form.target = '_self';
          form.submit();
        }

        var honeypot = form.querySelector('input[name="website"]');
        var rendered = form.querySelector('input[name="_rendered"]');

        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        // The timer must survive until the BODY is parsed — clearing it at
        // headers would let a stalled response body hang forever.
        var timeout = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;

        fetch(api.replace(/\/$/, '') + '/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller ? controller.signal : undefined,
          body: JSON.stringify({
            email: email,
            turnstile: token,
            website: honeypot ? honeypot.value : '',
            _rendered: rendered ? rendered.value : ''
          })
        }).then(function (res) {
          if (!res.ok) throw new Error('subscribe worker HTTP ' + res.status);
          return res.json();
        }).then(function (data) {
          // Require the explicit subscribed flag, not just ok: the worker
          // answers a bare {ok:true} as a SILENT DISCARD for bot-shaped
          // requests (expired/invalid Turnstile token, honeypot, rate
          // limit). A real human with an expired token (solved at page
          // load, submitted minutes later) lands there too — falling back
          // to the legacy endpoint actually subscribes them instead of
          // showing a false success.
          if (timeout) clearTimeout(timeout);
          if (data && data.ok && data.subscribed === true) {
            showSuccess(form);
          } else if (data && data.reject === true) {
            showReject(form); // definitively bad address — error, no fallback
          } else {
            fallbackToLegacy(); // not verifiably subscribed — legacy path
          }
        }).catch(function () {
          if (timeout) clearTimeout(timeout);
          // Network error / 503 unconfigured / abort. The worker MAY have
          // committed before a lost response, but its upsert is idempotent
          // (status_if_new) — the legacy re-submission is harmless, and a
          // guaranteed subscription beats an ambiguous one.
          fallbackToLegacy();
        });
      });
    });
  });
})();
