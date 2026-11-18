document.addEventListener("DOMContentLoaded", function(event) {
  if (typeof window.anchors === 'undefined') return;
  anchors.options = {
    placement: 'left',
    visible: 'hover',
    truncate: "36",
    icon: '\u00a7'
  };
  anchors.add('.post-content > p, .post > p, .post li, .post blockquote p, .post-content h3');
  anchors.remove('.post ol li, div.post.archive p.archive-year, div.post.archive ul.archive-months li, .tios, .masthead-title, li.header, .historical-posts, .historical-posts__title, footer, footer *');
  // Homepage: rewrite anchor hrefs to the canonical post permalink so copied
  // links survive the next day's publish (a bare /#id rots within 24 hours)
  var article = document.querySelector('article.post[data-post-url]');
  if (article) {
    var postUrl = article.getAttribute('data-post-url');
    document.querySelectorAll('.anchorjs-link').forEach(function(a) {
      a.href = postUrl + a.getAttribute('href');
    });
  }
});

(function() {
  var tooltip = null;
  var selectedText = '';
  var selectedUrl = '';
  var selectedHash = '';
  var mouseDown = false;
  var interactingUntil = 0;
  var timer = null;
  var SHAPE = /^(STRONG|EM|SPAN|H[1-6])$/;
  var LIST = /^(LI|UL|OL)$/;

  // Create tooltip element
  function createTooltip() {
    var el = document.createElement('div');
    el.className = 'share-tooltip';
    el.innerHTML =
      '<button type="button" data-action="copy">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
        'Copy' +
      '</button>' +
      '<button type="button" data-action="share">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>' +
        'Share' +
      '</button>';
    el.addEventListener('mousedown', function(e) {
      e.preventDefault();
      interactingUntil = Date.now() + 700;
    });
    el.addEventListener('touchstart', function() {
      interactingUntil = Date.now() + 700;
    }, { passive: true });
    return el;
  }

  // Show tooltip above selection
  function showTooltip(rect) {
    if (!tooltip) {
      tooltip = createTooltip();
      document.body.appendChild(tooltip);
    }

    var top = rect.top + window.scrollY - tooltip.offsetHeight - 10;
    if (rect.top - tooltip.offsetHeight - 10 < 0) {
      top = rect.bottom + window.scrollY + 10;
    }
    top = Math.max(window.scrollY + 10, Math.min(top, window.scrollY + window.innerHeight - tooltip.offsetHeight - 10));
    var left = rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2);

    // Keep tooltip within viewport
    left = Math.max(10, Math.min(left, window.innerWidth - tooltip.offsetWidth - 10));

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
  }

  // Hide tooltip
  function hideTooltip() {
    clearTimeout(timer);
    if (tooltip && tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
      tooltip = null;
    }
    selectedText = '';
    selectedUrl = '';
    selectedHash = '';
  }

  function elementOf(node) {
    return node.nodeType === 1 ? node : node.parentNode;
  }

  function childId(el, tag) {
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (c.tagName === tag && c.id) return c.id;
      if (tag === 'STRONG' && c.tagName === 'SMALL') {
        var inner = childId(c, 'STRONG');
        if (inner) return inner;
      }
    }
    return '';
  }

  function leadInId(el) {
    if (el.tagName === 'P') return childId(el, 'STRONG');
    if (el.tagName === 'H3') return childId(el, 'EM');
    return '';
  }

  function pageAnchorId(start, scope) {
    var node = elementOf(start);
    while (node && node !== scope && node !== document.body) {
      if (node.id && SHAPE.test(node.tagName)) return node.id;
      var id = leadInId(node);
      if (id) return id;
      if (LIST.test(node.tagName)) {
        var list = node;
        while (list.parentNode && LIST.test(list.parentNode.tagName)) list = list.parentNode;
        var prev = list.previousElementSibling;
        for (var i = 0; prev && i < 4; i++, prev = prev.previousElementSibling) {
          id = leadInId(prev);
          if (id) return id;
          if (/^(P|H[1-6])$/.test(prev.tagName)) break;
        }
        return '';
      }
      node = node.parentNode;
    }
    return '';
  }

  function postAnchorId(start) {
    var node = elementOf(start);
    while (node && node !== document.body) {
      if (node.id) return node.id;
      node = node.parentNode;
    }
    return '';
  }

  function evaluate() {
    if (mouseDown || Date.now() < interactingUntil) return;
    var selection = window.getSelection();
    var text = selection && selection.rangeCount ? selection.toString().trim() : '';

    if (text.length > 5) {
      var range = selection.getRangeAt(0);
      var scope = elementOf(range.commonAncestorContainer);
      var page = scope && scope.closest ? scope.closest('article.page') : null;
      var post = page || !scope || !scope.closest ? null : scope.closest('.post-content');
      var id = page ? pageAnchorId(range.startContainer, page) : (post ? postAnchorId(range.startContainer) : '');

      if (page ? id : post) {
        var article = scope.closest('article.post[data-post-url]');
        var base = article ? article.getAttribute('data-post-url') : window.location.pathname;
        selectedText = text;
        selectedUrl = window.location.origin + base;
        selectedHash = id ? '#' + id : '';
        showTooltip(range.getBoundingClientRect());
        return;
      }
    }

    hideTooltip();
  }

  function schedule(delay) {
    clearTimeout(timer);
    timer = setTimeout(evaluate, delay);
  }

  // Show toast
  function showToast(message) {
    var existing = document.querySelector('.share-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.classList.add('fade-out');
      setTimeout(function() { toast.remove(); }, 300);
    }, 1500);
  }

  // Handle text selection
  document.addEventListener('mousedown', function() {
    mouseDown = true;
  });
  document.addEventListener('touchend', function() {
    mouseDown = false;
  }, { passive: true });
  window.addEventListener('blur', function() {
    mouseDown = false;
  });
  document.addEventListener('mouseup', function(e) {
    mouseDown = false;
    // Ignore if clicking inside tooltip
    if (e.target.closest('.share-tooltip')) return;
    schedule(10);
  });
  document.addEventListener('selectionchange', function() {
    if (mouseDown || Date.now() < interactingUntil) return;
    schedule(120);
  });

  // Handle tooltip button clicks
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.share-tooltip button');
    if (!btn) return;

    var action = btn.dataset.action;
    var network = action === 'share' && navigator.share ? 'native' : 'copy';
    var url = selectedUrl + '?utm_source=' + network + '&utm_medium=social&utm_campaign=share' + selectedHash;
    var quotedText = '"' + selectedText + '"';
    if (quotedText.length > 280) {
      quotedText = '"' + selectedText.substring(0, 250) + '..."';
    }
    // Combine text + URL for better compatibility
    var fullText = quotedText + '\n\n' + url;

    if (typeof gtag === 'function') gtag('event', 'highlight_share', { method: action });

    if (action === 'share' && navigator.share) {
      navigator.share({
        text: fullText
      }).catch(function(err) {
        if (err.name !== 'AbortError') console.log('Share failed:', err);
      });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText).then(function() {
        showToast('Copied to clipboard!');
      }).catch(function() {
        prompt('Copy this:', fullText);
      });
    } else {
      prompt('Copy this:', fullText);
    }

    interactingUntil = 0;
    hideTooltip();
    window.getSelection().removeAllRanges();
  });

  // Hide tooltip on scroll or escape
  document.addEventListener('scroll', function() {
    if (tooltip) schedule(120);
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideTooltip();
  });

  document.addEventListener('DOMContentLoaded', function() {
    evaluate();
  });
})();

(function() {
  // Show native share button if supported
  if (navigator.share) {
    document.querySelectorAll('.share-widget__native').forEach(function(btn) {
      btn.removeAttribute('hidden');
    });
  }

  // Close all dropdown cards
  function closeAllCards() {
    document.querySelectorAll('.share-widget__card.is-open, .more-menu__card.is-open').forEach(function(card) {
      card.classList.remove('is-open');
      card.setAttribute('aria-hidden', 'true');
      var trigger = card.previousElementSibling;
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  // Event delegation
  document.addEventListener('click', function(e) {
    // Toggle share card
    var shareTrigger = e.target.closest('.share-widget__trigger');
    if (shareTrigger) {
      e.preventDefault();
      var card = shareTrigger.nextElementSibling;
      var isOpen = card.classList.contains('is-open');
      closeAllCards();
      if (!isOpen) {
        card.classList.add('is-open');
        card.setAttribute('aria-hidden', 'false');
        shareTrigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    // Toggle more menu card
    var moreTrigger = e.target.closest('.more-menu__trigger');
    if (moreTrigger) {
      e.preventDefault();
      var card = moreTrigger.nextElementSibling;
      var isOpen = card.classList.contains('is-open');
      closeAllCards();
      if (!isOpen) {
        card.classList.add('is-open');
        card.setAttribute('aria-hidden', 'false');
        moreTrigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    // Open TIOS carousel
    var tiosBtn = e.target.closest('[data-action="open-tios"]');
    if (tiosBtn) {
      e.preventDefault();
      closeAllCards();
      if (typeof openTiosCarousel === 'function') {
        try { openTiosCarousel(0); } catch (err) { console.error('TIOS carousel error:', err); }
      }
      return;
    }

    // Copy link
    var copyBtn = e.target.closest('.share-widget [data-action="copy"]');
    if (copyBtn) {
      e.preventDefault();
      if (typeof gtag === 'function') gtag('event', 'share_widget', { method: 'copy' });
      var widget = copyBtn.closest('.share-widget');
      var url = widget.dataset.shareUrl + '?utm_source=copy&utm_medium=social&utm_campaign=share';
      navigator.clipboard.writeText(url).then(function() {
        var span = copyBtn.querySelector('.share-widget__label');
        var original = span.textContent;
        span.textContent = 'Copied!';
        setTimeout(function() { span.textContent = original; }, 1500);
      }).catch(function() {
        prompt('Copy this link:', url);
      });
      return;
    }

    // Native share
    var nativeShareBtn = e.target.closest('[data-action="native-share"]');
    if (nativeShareBtn && navigator.share) {
      e.preventDefault();
      if (typeof gtag === 'function') gtag('event', 'share_widget', { method: 'native' });
      var widget = nativeShareBtn.closest('.share-widget');
      var url = widget.dataset.shareUrl + '?utm_source=native&utm_medium=social&utm_campaign=share';
      var title = widget.dataset.shareTitle || document.title;
      navigator.share({ title: title, url: url }).then(function() {
        closeAllCards();
      }).catch(function(err) {
        // User cancelled or error - silently ignore
        if (err.name !== 'AbortError') console.log('Share failed:', err);
      });
      return;
    }

    // Social share link clicks
    var shareOption = e.target.closest('.share-widget__card a.share-widget__option');
    if (shareOption) {
      var label = shareOption.querySelector('.share-widget__label');
      if (typeof gtag === 'function') gtag('event', 'share_widget', { method: label ? label.textContent.toLowerCase() : 'social' });
    }

    // Print
    var printBtn = e.target.closest('[data-action="print"]');
    if (printBtn) {
      e.preventDefault();
      if (typeof gtag === 'function') gtag('event', 'share_widget', { method: 'print' });
      closeAllCards();
      window.print();
      return;
    }

    // Close cards when clicking outside
    if (!e.target.closest('.share-widget') && !e.target.closest('.more-menu')) {
      closeAllCards();
    }
  });

  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeAllCards();
  });

})();
