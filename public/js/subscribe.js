(function () {
  'use strict';

  var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var SUCCESS_URL = '/whitelist/?ref=success';
  var READY_POLL_MS = 100;
  var READY_POLL_TRIES = 100;
  var SUBMIT_WAIT_MS = 4000;
  var CHALLENGE_ABANDON_MS = 30000;
  var WORKER_TIMEOUT_MS = 8000;

  var activeHandlers = null;

  window.wtfjhtSubscribeToken = function (token) {
    if (activeHandlers) activeHandlers.token(token);
  };

  window.wtfjhtSubscribeError = function () {
    if (activeHandlers) activeHandlers.error();
  };

  function ensureTurnstileScript() {
    if (window.turnstile) return;
    if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) return;
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

  function showReject(form, suggestion) {
    unlock(form);
    setStatus(form, suggestion
      ? 'That email address doesn’t look deliverable — did you mean ' + suggestion + '?'
      : 'That email address doesn’t look deliverable — double-check the spelling?');
    var widget = form.querySelector('.cf-turnstile');
    if (widget) {
      widget.style.display = '';
      try {
        if (window.turnstile) window.turnstile.reset(widget);
      } catch (e) {}
    }
    var emailInput = form.querySelector('input[type="email"]');
    if (emailInput) {
      if (suggestion) emailInput.value = suggestion;
      emailInput.focus();
    }
  }

  function fallbackToLegacy(form) {
    form.target = '_self';
    form.submit();
  }

  function sendToWorker(form, token) {
    var api = form.getAttribute('data-subscribe-api');
    var emailInput = form.querySelector('input[type="email"]');
    var email = emailInput ? emailInput.value.replace(/^\s+|\s+$/g, '') : '';
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
        fallbackToLegacy(form);
      }
    }, WORKER_TIMEOUT_MS);

    fetch(api.replace(/\/$/, '') + '/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify({
        email: email,
        turnstile: token,
        website: honeypot ? honeypot.value : '',
        _rendered: rendered ? rendered.value : '',
        page: window.location.pathname
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('subscribe worker HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!settle()) return;
      if (data && data.reject === true) {
        showReject(form, data.suggestion);
      } else if (data && data.ok === true) {
        window.location.assign(SUCCESS_URL);
      } else {
        fallbackToLegacy(form);
      }
    }).catch(function () {
      if (!settle()) return;
      fallbackToLegacy(form);
    });
  }

  function initForm(form) {
    renderedStamp(form);
    var container = form.querySelector('.cf-turnstile');
    var widgetHandle = null;
    var abandonTimer = null;
    var awaiting = false;

    function stopAwaiting() {
      awaiting = false;
      if (activeHandlers && activeHandlers.form === form) activeHandlers = null;
      if (abandonTimer) {
        clearTimeout(abandonTimer);
        abandonTimer = null;
      }
    }

    function onToken(token) {
      if (!awaiting) return;
      stopAwaiting();
      if (container) container.style.display = 'none';
      if (token) {
        sendToWorker(form, token);
      } else {
        fallbackToLegacy(form);
      }
    }

    function onError() {
      if (!awaiting) return;
      stopAwaiting();
      fallbackToLegacy(form);
    }

    function tryRender() {
      if (widgetHandle !== null || !container || !window.turnstile) return;
      if (container.firstChild) {
        widgetHandle = container;
        return;
      }
      try {
        var id = window.turnstile.render(container, {
          sitekey: container.getAttribute('data-sitekey'),
          appearance: 'interaction-only',
          execution: 'execute',
          callback: onToken,
          'error-callback': onError,
          'expired-callback': function () {
            try {
              if (window.turnstile && widgetHandle !== null) window.turnstile.reset(widgetHandle);
            } catch (e) {}
          }
        });
        if (id !== undefined && id !== null) widgetHandle = id;
      } catch (e) {}
    }

    function startChallenge() {
      awaiting = true;
      activeHandlers = { form: form, token: onToken, error: onError };
      abandonTimer = setTimeout(onError, CHALLENGE_ABANDON_MS);
      try {
        window.turnstile.execute(widgetHandle);
      } catch (e) {
        onError();
      }
    }

    function waitForWidget(deadline) {
      tryRender();
      if (widgetHandle !== null) {
        startChallenge();
        return;
      }
      if (Date.now() >= deadline) {
        fallbackToLegacy(form);
        return;
      }
      setTimeout(function () {
        waitForWidget(deadline);
      }, READY_POLL_MS);
    }

    form.addEventListener('submit', function (event) {
      var api = form.getAttribute('data-subscribe-api');
      var emailInput = form.querySelector('input[type="email"]');
      var email = emailInput ? emailInput.value.replace(/^\s+|\s+$/g, '') : '';
      if (typeof fetch !== 'function' || !api || !email) return;
      event.preventDefault();
      if (form.getAttribute('data-subscribing') === '1') return;
      lock(form);
      var token = tokenFor(form);
      if (token) {
        sendToWorker(form, token);
        return;
      }
      ensureTurnstileScript();
      waitForWidget(Date.now() + SUBMIT_WAIT_MS);
    });

    return {
      render: tryRender,
      reset: function () {
        stopAwaiting();
        unlock(form);
        if (container) container.style.display = '';
        try {
          if (window.turnstile && widgetHandle !== null) window.turnstile.reset(widgetHandle);
        } catch (e) {}
      }
    };
  }

  function boot() {
    var forms = document.querySelectorAll('form[data-subscribe-api]');
    if (!forms.length) return;
    var inits = [];
    Array.prototype.forEach.call(forms, function (form) {
      inits.push(initForm(form));
    });
    ensureTurnstileScript();
    var tries = 0;
    (function poll() {
      if (window.turnstile && typeof window.turnstile.render === 'function') {
        for (var i = 0; i < inits.length; i++) inits[i].render();
        return;
      }
      tries += 1;
      if (tries >= READY_POLL_TRIES) return;
      setTimeout(poll, READY_POLL_MS);
    })();
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      for (var i = 0; i < inits.length; i++) inits[i].reset();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
