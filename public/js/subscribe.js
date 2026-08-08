(function () {
  'use strict';

  var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  var turnstileRequested = false;

  function ensureTurnstileLoaded() {
    if (turnstileRequested || window.turnstile) return;
    if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      turnstileRequested = true;
      return;
    }
    turnstileRequested = true;
    var s = document.createElement('script');
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

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

  function statusEl(form) {
    return form.querySelector('.subscribe-form__trust');
  }

  function setStatus(form, text) {
    var trust = statusEl(form);
    if (trust) trust.textContent = text;
  }

  function buttonOf(form) {
    return form.querySelector('input[type="submit"]');
  }

  function lock(form) {
    form.setAttribute('data-subscribing', '1');
    var button = buttonOf(form);
    if (button) {
      if (!button.getAttribute('data-label')) button.setAttribute('data-label', button.value);
      button.disabled = true;
      button.value = 'Subscribing…';
    }
  }

  function unlock(form) {
    form.removeAttribute('data-subscribing');
    var button = buttonOf(form);
    if (button) {
      button.disabled = false;
      var label = button.getAttribute('data-label');
      if (label) button.value = label;
    }
  }

  function showSuccess(form) {
    var row = form.querySelector('.subscribe-form__row');
    if (row) row.style.display = 'none';
    setStatus(form, 'You’re in — check your inbox around 3 pm Pacific.');
    var trust = statusEl(form);
    if (trust) {
      trust.setAttribute('tabindex', '-1');
      try { trust.focus(); } catch (e) {}
    }
  }

  function showReject(form, suggestion) {
    unlock(form);
    setStatus(form, suggestion
      ? 'That email address doesn’t look deliverable — did you mean ' + suggestion + '?'
      : 'That email address doesn’t look deliverable — double-check the spelling?');
    try {
      var widget = form.querySelector('.cf-turnstile');
      if (window.turnstile && widget) window.turnstile.reset(widget);
    } catch (e) {}
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

      var emailField = form.querySelector('input[type="email"]');
      if (emailField) {
        emailField.addEventListener('focus', ensureTurnstileLoaded, { once: true });
      }

      form.addEventListener('submit', function (event) {
        var api = form.getAttribute('data-subscribe-api');
        var email = emailField ? emailField.value.replace(/^\s+|\s+$/g, '') : '';
        var token = tokenFor(form);

        if (typeof fetch !== 'function' || !api || !email || !token) return;

        if (form.getAttribute('data-subscribing') === '1') {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        lock(form);

        function fallbackToLegacy() {
          form.target = '_self';
          form.submit();
        }

        var honeypot = form.querySelector('input[name="website"]');
        var rendered = form.querySelector('input[name="_rendered"]');

        var settled = false;
        function settle() {
          if (settled) return false;
          settled = true;
          if (timeout) clearTimeout(timeout);
          return true;
        }
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeout = setTimeout(function () {
          if (controller) {
            controller.abort();
          } else if (settle()) {
            fallbackToLegacy();
          }
        }, 8000);

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
          if (!settle()) return;
          if (data && data.ok && data.subscribed === true) {
            showSuccess(form);
          } else if (data && data.reject === true) {
            showReject(form, data.suggestion);
          } else {
            fallbackToLegacy();
          }
        }).catch(function () {
          if (!settle()) return;
          fallbackToLegacy();
        });
      });
    });

    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      Array.prototype.forEach.call(forms, unlock);
    });
  });
})();
