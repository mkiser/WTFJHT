/**
 * WTFJHT Carousel — Instagram-style card reading experience
 *
 * One card per blurb. Bold lede sentence + body sentences.
 * Consistent layout: text always starts top-left, equal padding.
 *
 * Supports 4:5 portrait (default) and 1:1 square aspect ratios.
 */
(function() {
  'use strict';

  var THEMES = ['theme-editorial', 'theme-contrast', 'theme-bold'];
  var RATIOS = ['ratio-portrait', 'ratio-square'];
  var THEME_KEY = 'wtfjht-carousel-theme';
  var RATIO_KEY = 'wtfjht-carousel-ratio';

  var ABBREVIATIONS = [
    'Rev', 'Dr', 'Mr', 'Mrs', 'Ms', 'St', 'Jr', 'Sr', 'Prof',
    'Rep', 'Sen', 'Gov', 'Gen', 'Sgt', 'Lt', 'Col', 'Maj', 'Capt', 'Cmdr', 'Adm',
    'Inc', 'Corp', 'Ltd', 'Co', 'Bros',
    'Jan', 'Feb', 'Mar', 'Apr', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
    'Ave', 'Blvd', 'Dept', 'Dist', 'Est', 'Fig', 'Govt',
    'vs', 'etc', 'approx', 'No', 'Vol'
  ];

  // ========================================================================
  // Text Utilities
  // ========================================================================

  function isAbbreviation(textBefore) {
    var match = textBefore.match(/\b([A-Za-z]+)$/);
    if (!match) return true;
    var word = match[1];
    if (word.length <= 2) return true;
    for (var i = 0; i < ABBREVIATIONS.length; i++) {
      if (word === ABBREVIATIONS[i]) return true;
    }
    return false;
  }

  function splitIntoSentences(text) {
    var sentences = [];
    var re = /([.!?])(["'\u201D\u2019]*)(\s+)/g;
    var lastEnd = 0;
    var match;

    while ((match = re.exec(text)) !== null) {
      var afterIdx = match.index + match[0].length;
      if (afterIdx >= text.length) continue;
      if (!/[A-Z0-9\u201C\u201F"]/.test(text[afterIdx])) continue;

      if (match[1] === '.') {
        var before = text.substring(lastEnd, match.index);
        if (isAbbreviation(before)) continue;
      }

      var end = match.index + match[1].length + match[2].length;
      sentences.push(text.substring(lastEnd, end).trim());
      lastEnd = afterIdx;
    }

    if (lastEnd < text.length) {
      sentences.push(text.substring(lastEnd).trim());
    }

    return sentences.length > 0 ? sentences : [text];
  }

  // ========================================================================
  // Content Parser
  // ========================================================================

  function parseCards() {
    var cards = [];

    // --- Title card ---
    var titleEl = document.querySelector('h1.post-title a');
    if (titleEl) {
      var titleText = '';
      for (var i = 0; i < titleEl.childNodes.length; i++) {
        if (titleEl.childNodes[i].nodeType === 3) {
          titleText += titleEl.childNodes[i].textContent;
        }
      }
      var colonIdx = titleText.indexOf(':');
      var title = colonIdx !== -1 ? titleText.substring(0, colonIdx).trim() : titleText.trim();

      var spanEl = titleEl.querySelector('span.post-small');
      var description = spanEl ? spanEl.textContent.trim() : '';

      var dateEl = document.querySelector('time.post-meta__date');
      var date = dateEl ? dateEl.textContent.trim() : '';

      cards.push({ type: 'title', title: title, description: description, date: date });
    }

    // --- Story/poll cards ---
    var postContent = document.querySelector('div.post-content');
    if (!postContent) return cards;

    var children = postContent.children;
    for (var c = 0; c < children.length; c++) {
      var el = children[c];
      if (el.tagName !== 'P') continue;
      if (el.classList.contains('tios')) continue;

      var text = el.textContent.trim();
      if (/^The 20\d\d/.test(text)) continue;

      var storyMatch = text.match(/^(\d+)\/\s/);
      var pollMatch = text.match(/^poll\/\s/i);
      if (!storyMatch && !pollMatch) continue;

      var cardNumber = storyMatch ? storyMatch[1] : 'poll';

      // Full blurb text, stripped of prefix and sources
      var fullText = el.textContent.trim().replace(/^(\d+|poll)\/\s*/i, '');
      var innerHTML = el.innerHTML;
      if (innerHTML.match(/\((<a\s[\s\S]+)\)\s*$/)) {
        var lp = fullText.lastIndexOf('(');
        if (lp !== -1 && fullText.trim().endsWith(')')) {
          fullText = fullText.substring(0, lp).trim();
        }
      }

      // Split into sentences — one card per blurb, all sentences on it
      var allSentences = splitIntoSentences(fullText);
      var sentenceObjs = [];
      for (var si = 0; si < allSentences.length; si++) {
        sentenceObjs.push({
          text: allSentences[si],
          bold: (si === 0)
        });
      }

      cards.push({
        type: 'story',
        number: cardNumber,
        sentences: sentenceObjs
      });
    }

    return cards;
  }

  // ========================================================================
  // DOM Renderer
  // ========================================================================

  function renderCarousel(cards, theme, ratio) {
    var overlay = document.createElement('div');
    overlay.className = 'carousel-overlay ' + theme + ' ' + ratio;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Story cards');

    var header = document.createElement('div');
    header.className = 'carousel-header';

    var progress = document.createElement('div');
    progress.className = 'carousel-progress';
    for (var i = 0; i < cards.length; i++) {
      var seg = document.createElement('div');
      seg.className = 'carousel-progress__segment';
      if (i === 0) seg.classList.add('is-active');
      progress.appendChild(seg);
    }
    header.appendChild(progress);

    var ratioBtn = document.createElement('button');
    ratioBtn.className = 'carousel-header__btn';
    ratioBtn.setAttribute('aria-label', 'Change aspect ratio');
    ratioBtn.textContent = ratio === 'ratio-portrait' ? '4:5' : '1:1';
    header.appendChild(ratioBtn);

    var themeBtn = document.createElement('button');
    themeBtn.className = 'carousel-header__btn';
    themeBtn.setAttribute('aria-label', 'Change theme');
    themeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg>';
    header.appendChild(themeBtn);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'carousel-header__btn';
    closeBtn.setAttribute('aria-label', 'Close card view');
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>';
    header.appendChild(closeBtn);

    overlay.appendChild(header);

    var container = document.createElement('div');
    container.className = 'carousel-container';

    var counter = document.createElement('div');
    counter.className = 'carousel-counter';
    counter.textContent = '1 / ' + cards.length;
    container.appendChild(counter);

    var cardEl = document.createElement('div');
    cardEl.className = 'carousel-card';
    container.appendChild(cardEl);

    var prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-nav carousel-nav--prev';
    prevBtn.setAttribute('aria-label', 'Previous card');
    prevBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 4 7 10 13 16"/></svg>';
    container.appendChild(prevBtn);

    var nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-nav carousel-nav--next';
    nextBtn.setAttribute('aria-label', 'Next card');
    nextBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 4 13 10 7 16"/></svg>';
    container.appendChild(nextBtn);

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    overlay.offsetHeight;
    overlay.classList.add('is-open');

    return {
      overlay: overlay,
      progress: progress,
      ratioBtn: ratioBtn,
      themeBtn: themeBtn,
      closeBtn: closeBtn,
      counter: counter,
      cardEl: cardEl,
      prevBtn: prevBtn,
      nextBtn: nextBtn,
      cards: cards,
      currentIndex: 0,
      currentTheme: theme,
      currentRatio: ratio
    };
  }

  function renderCardContent(cardEl, card) {
    cardEl.innerHTML = '';
    cardEl.classList.remove('carousel-card--title', 'carousel-card--story');

    if (card.type === 'title') {
      cardEl.classList.add('carousel-card--title');

      var h2 = document.createElement('h2');
      h2.className = 'carousel-card__title';
      h2.textContent = card.title;
      cardEl.appendChild(h2);

      if (card.description) {
        var desc = document.createElement('p');
        desc.className = 'carousel-card__description';
        desc.textContent = card.description;
        cardEl.appendChild(desc);
      }

      if (card.date) {
        var time = document.createElement('time');
        time.className = 'carousel-card__date';
        time.textContent = card.date;
        cardEl.appendChild(time);
      }

    } else if (card.type === 'story') {
      cardEl.classList.add('carousel-card--story');

      // Background number — typographic texture
      var bgNum = document.createElement('span');
      bgNum.className = 'carousel-card__bg-number';
      bgNum.textContent = card.number;
      bgNum.setAttribute('aria-hidden', 'true');
      cardEl.appendChild(bgNum);

      // Sentences
      var textBlock = document.createElement('div');
      textBlock.className = 'carousel-card__text';

      for (var s = 0; s < card.sentences.length; s++) {
        var p = document.createElement('p');
        p.className = card.sentences[s].bold ? 'carousel-card__lede' : 'carousel-card__sentence';
        p.textContent = card.sentences[s].text;
        textBlock.appendChild(p);
      }

      cardEl.appendChild(textBlock);

      // Scale text down if it overflows the card
      fitTextToCard(cardEl);
    }
  }

  /**
   * If story text overflows the card, scale down proportionally.
   * All child sizes are em-based, so changing the text block's
   * font-size scales everything uniformly (text, margins, spacing).
   * Uses binary search for accuracy since text reflows non-linearly.
   */
  function fitTextToCard(cardEl) {
    var textBlock = cardEl.querySelector('.carousel-card__text');
    var bgNum = cardEl.querySelector('.carousel-card__bg-number');
    if (!textBlock) return;

    // Hide bg number during measurement
    if (bgNum) bgNum.style.display = 'none';

    var cardH = cardEl.clientHeight;
    var style = getComputedStyle(cardEl);
    var padTop = parseFloat(style.paddingTop);
    var padBot = parseFloat(style.paddingBottom);
    var available = cardH - padTop - padBot;

    // Reset to CSS default and get the base size in px
    textBlock.style.fontSize = '';
    var basePx = parseFloat(getComputedStyle(textBlock).fontSize);

    if (textBlock.scrollHeight <= available) {
      if (bgNum) bgNum.style.display = '';
      return;
    }

    // Binary search for the right font size
    var lo = basePx * 0.5;  // floor: 50% of base
    var hi = basePx;
    for (var i = 0; i < 10; i++) {
      var mid = (lo + hi) / 2;
      textBlock.style.fontSize = mid + 'px';
      if (textBlock.scrollHeight > available) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    textBlock.style.fontSize = lo + 'px';

    if (bgNum) bgNum.style.display = '';
  }

  // ========================================================================
  // Navigation
  // ========================================================================

  function goToCard(ui, index) {
    if (index < 0 || index >= ui.cards.length) return;
    ui.currentIndex = index;
    renderCardContent(ui.cardEl, ui.cards[index]);

    var segments = ui.progress.querySelectorAll('.carousel-progress__segment');
    for (var i = 0; i < segments.length; i++) {
      segments[i].classList.toggle('is-active', i <= index);
    }

    ui.counter.textContent = (index + 1) + ' / ' + ui.cards.length;
    ui.prevBtn.style.display = (index === 0) ? 'none' : '';
    ui.nextBtn.style.display = (index === ui.cards.length - 1) ? 'none' : '';
    updateUrlState(index);
  }

  function goNext(ui) {
    if (ui.currentIndex < ui.cards.length - 1) goToCard(ui, ui.currentIndex + 1);
  }

  function goPrev(ui) {
    if (ui.currentIndex > 0) goToCard(ui, ui.currentIndex - 1);
  }

  function attachNavigation(ui) {
    ui.prevBtn.addEventListener('click', function() { goPrev(ui); });
    ui.nextBtn.addEventListener('click', function() { goNext(ui); });

    function onKeydown(e) {
      switch (e.key) {
        case 'ArrowLeft': case 'ArrowUp':
          e.preventDefault(); goPrev(ui); break;
        case 'ArrowRight': case 'ArrowDown':
          e.preventDefault(); goNext(ui); break;
        case 'Escape':
          e.preventDefault(); closeCarousel(ui); break;
      }
    }
    document.addEventListener('keydown', onKeydown);
    ui._onKeydown = onKeydown;

    ui.cardEl.addEventListener('click', function(e) {
      if (e.target.tagName === 'A' || e.target.closest('a')) return;
      var rect = ui.cardEl.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var third = rect.width / 3;
      if (x < third) goPrev(ui);
      else if (x > third * 2) goNext(ui);
    });

    var startX = 0, startY = 0;
    ui.cardEl.addEventListener('pointerdown', function(e) { startX = e.clientX; startY = e.clientY; });
    ui.cardEl.addEventListener('pointerup', function(e) {
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goNext(ui); else goPrev(ui);
      }
    });

    ui.closeBtn.addEventListener('click', function() { closeCarousel(ui); });
    ui.overlay.addEventListener('click', function(e) {
      if (e.target === ui.overlay) closeCarousel(ui);
    });
  }

  // ========================================================================
  // Close
  // ========================================================================

  function closeCarousel(ui) {
    if (ui._onKeydown) {
      document.removeEventListener('keydown', ui._onKeydown);
      ui._onKeydown = null;
    }
    ui.overlay.classList.remove('is-open');

    function onEnd() {
      ui.overlay.removeEventListener('transitionend', onEnd);
      if (ui.overlay.parentNode) ui.overlay.parentNode.removeChild(ui.overlay);
    }
    ui.overlay.addEventListener('transitionend', onEnd);
    setTimeout(function() {
      if (ui.overlay.parentNode) {
        ui.overlay.removeEventListener('transitionend', onEnd);
        ui.overlay.parentNode.removeChild(ui.overlay);
      }
    }, 400);

    document.body.classList.remove('carousel-open');
    cleanUrlState();
  }

  // ========================================================================
  // Theme & Ratio
  // ========================================================================

  function getSaved(key, options) {
    try {
      var saved = localStorage.getItem(key);
      if (saved && options.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    return options[0];
  }

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function cycleTheme(ui) {
    var idx = (THEMES.indexOf(ui.currentTheme) + 1) % THEMES.length;
    ui.overlay.classList.remove(ui.currentTheme);
    ui.overlay.classList.add(THEMES[idx]);
    ui.currentTheme = THEMES[idx];
    save(THEME_KEY, THEMES[idx]);
  }

  function cycleRatio(ui) {
    var idx = (RATIOS.indexOf(ui.currentRatio) + 1) % RATIOS.length;
    ui.overlay.classList.remove(ui.currentRatio);
    ui.overlay.classList.add(RATIOS[idx]);
    ui.currentRatio = RATIOS[idx];
    ui.ratioBtn.textContent = RATIOS[idx] === 'ratio-portrait' ? '4:5' : '1:1';
    save(RATIO_KEY, RATIOS[idx]);
    goToCard(ui, ui.currentIndex);
  }

  // ========================================================================
  // URL State
  // ========================================================================

  function updateUrlState(index) {
    var url = new URL(window.location);
    url.searchParams.set('view', 'cards');
    url.searchParams.set('s', index.toString());
    history.replaceState(null, '', url.toString());
  }

  function cleanUrlState() {
    var url = new URL(window.location);
    url.searchParams.delete('view');
    url.searchParams.delete('s');
    history.replaceState(null, '', url.toString());
  }

  // ========================================================================
  // Init
  // ========================================================================

  function openCarousel(startIndex) {
    var theme = getSaved(THEME_KEY, THEMES);
    var ratio = getSaved(RATIO_KEY, RATIOS);
    var cards = parseCards();
    if (cards.length === 0) return;
    if (startIndex < 0 || startIndex >= cards.length) startIndex = 0;

    document.body.classList.add('carousel-open');
    var ui = renderCarousel(cards, theme, ratio);

    ui.themeBtn.addEventListener('click', function() { cycleTheme(ui); });
    ui.ratioBtn.addEventListener('click', function() { cycleRatio(ui); });
    attachNavigation(ui);
    goToCard(ui, startIndex);
  }

  document.addEventListener('DOMContentLoaded', function() {
    var toggle = document.querySelector('.carousel-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function() {
      try { openCarousel(0); } catch (e) { console.error('Carousel error:', e); }
    });

    var params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'cards') {
      try { openCarousel(parseInt(params.get('s'), 10) || 0); } catch (e) { console.error('Carousel error:', e); }
    }
  });

})();
