/**
 * WTFJHT Carousel v4.3 — Instagram-style card reading experience
 *
 * 4 card types: cover, story (with continuation), countdown, CTA
 * Responsive scaling via --s custom property (cardWidth / 1080).
 * Single canonical visual identity — Georgia serif + JetBrains Mono.
 * Fixed 4:5 portrait aspect ratio (IG native carousel size).
 */
(function() {
  'use strict';

  // Characters-per-card budget for story continuation
  var CHARS_FIRST = 400;
  var CHARS_CONT  = 450;

  var ABBREVIATIONS = [
    'Rev', 'Dr', 'Mr', 'Mrs', 'Ms', 'St', 'Jr', 'Sr', 'Prof',
    'Rep', 'Sen', 'Gov', 'Gen', 'Sgt', 'Lt', 'Col', 'Maj', 'Capt', 'Cmdr', 'Adm',
    'Inc', 'Corp', 'Ltd', 'Co', 'Bros',
    'Jan', 'Feb', 'Mar', 'Apr', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
    'Ave', 'Blvd', 'Dept', 'Dist', 'Est', 'Fig', 'Govt',
    'vs', 'etc', 'approx', 'No', 'Vol'
  ];

  /**
   * Get the logo URL. Uses the same favicon.svg the site references everywhere.
   * Works both in local dev (relative path) and production.
   */
  function getLogoSrc() {
    return '/wtfjht-logo.svg';
  }

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

  function formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ========================================================================
  // Content Parser
  // ========================================================================

  function parseCards() {
    var cards = [];
    var article = document.querySelector('article.post');
    if (!article) return cards;

    var dayNum = article.getAttribute('data-carousel-day') || '';
    var desc = article.getAttribute('data-carousel-desc') || '';
    // Decode XML entities from xml_escape
    var tmp = document.createElement('textarea');
    tmp.innerHTML = desc;
    desc = tmp.value;
    var dateStr = article.getAttribute('data-carousel-date') || '';

    // Count stories
    var postContent = document.querySelector('div.post-content');
    var storyCount = 0;
    var storyBlurbs = [];

    if (postContent) {
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

        storyCount++;
        storyBlurbs.push({ number: cardNumber, text: fullText });
      }
    }

    // Read time from post meta
    var readEl = document.querySelector('.post-meta__read-sentence');
    var readTime = '';
    if (readEl) {
      var readMatch = readEl.textContent.match(/(\d+)[\s-]*min/i);
      if (readMatch) readTime = readMatch[1] + '-min read';
    }

    // --- Cover card ---
    cards.push({
      type: 'cover',
      dayNum: dayNum,
      desc: desc,
      dateStr: dateStr,
      storyCount: storyCount,
      readTime: readTime
    });

    // --- Story cards (with continuation) ---
    for (var si = 0; si < storyBlurbs.length; si++) {
      var blurb = storyBlurbs[si];
      var allSentences = splitIntoSentences(blurb.text);

      // Split headline (first sentence) from body
      var headline = allSentences[0] || '';
      var bodySentences = allSentences.slice(1);

      // Group body sentences into card-sized chunks
      var chunks = groupSentences(headline, bodySentences);

      for (var ci = 0; ci < chunks.length; ci++) {
        var isFirst = (ci === 0);
        var isLast = (ci === chunks.length - 1);
        cards.push({
          type: 'story',
          number: blurb.number,
          headline: isFirst ? headline : null,
          continued: !isFirst,
          sentences: chunks[ci],
          hasMore: !isLast,
          dayNum: dayNum,
          dateStr: dateStr
        });
      }
    }

    // --- Countdown card ---
    var midterms = new Date(2026, 10, 3);   // Nov 3, 2026
    var presidential = new Date(2028, 10, 7); // Nov 7, 2028
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var daysMid = Math.ceil((midterms - now) / 86400000);
    var daysPres = Math.ceil((presidential - now) / 86400000);

    if (daysMid > 0) {
      cards.push({
        type: 'countdown',
        midterms: daysMid,
        presidential: daysPres
      });
    }

    // --- CTA card ---
    cards.push({
      type: 'cta',
      storyCount: storyCount,
      readTime: readTime
    });

    return cards;
  }

  /**
   * Group body sentences into card-sized chunks based on character budget.
   */
  function groupSentences(headline, bodySentences) {
    if (bodySentences.length === 0) return [[]];

    var firstBudget = CHARS_FIRST - headline.length;
    if (firstBudget < 100) firstBudget = 100;
    var contBudget = CHARS_CONT;

    var chunks = [];
    var current = [];
    var currentLen = 0;
    var budget = firstBudget;

    for (var i = 0; i < bodySentences.length; i++) {
      var s = bodySentences[i];
      if (currentLen + s.length > budget && current.length > 0) {
        chunks.push(current);
        current = [];
        currentLen = 0;
        budget = contBudget;
      }
      current.push(s);
      currentLen += s.length;
    }
    if (current.length > 0) chunks.push(current);

    return chunks;
  }

  // ========================================================================
  // DOM Renderer
  // ========================================================================

  function renderCarousel(cards) {
    var overlay = document.createElement('div');
    overlay.className = 'carousel-overlay';
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
      closeBtn: closeBtn,
      counter: counter,
      cardEl: cardEl,
      prevBtn: prevBtn,
      nextBtn: nextBtn,
      cards: cards,
      currentIndex: 0
    };
  }

  // ========================================================================
  // Card Renderers
  // ========================================================================

  function renderCoverCard(inner, card) {
    var logoSrc = getLogoSrc();

    var wm = document.createElement('div');
    wm.className = 'carousel-card__wm';
    wm.textContent = 'WTF Just Happened Today?';
    inner.appendChild(wm);

    var day = document.createElement('div');
    day.className = 'carousel-card__day';
    day.textContent = 'Day ' + card.dayNum;
    inner.appendChild(day);

    if (card.desc) {
      var qt = document.createElement('div');
      qt.className = 'carousel-card__qt';
      qt.textContent = '\u201C' + card.desc.replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, '') + '\u201D';
      inner.appendChild(qt);
    }

    var meta = document.createElement('div');
    meta.className = 'carousel-card__meta';
    var parts = [card.dateStr];
    if (card.storyCount) parts.push(card.storyCount + ' stories');
    if (card.readTime) parts.push(card.readTime);
    meta.textContent = parts.join(' \u00B7 ');
    inner.appendChild(meta);

    var logo = document.createElement('div');
    logo.className = 'carousel-card__logo';
    var img = document.createElement('img');
    img.src = logoSrc;
    img.alt = 'WTFJHT';
    logo.appendChild(img);
    inner.appendChild(logo);
  }

  function renderStoryCard(inner, card) {
    // Story number
    var sn = document.createElement('div');
    sn.className = 'carousel-card__sn';
    sn.textContent = card.number.toString().padStart(2, '0');
    inner.appendChild(sn);

    // Continuation label
    if (card.continued) {
      var cl = document.createElement('div');
      cl.className = 'carousel-card__cl';
      cl.textContent = 'continued';
      inner.appendChild(cl);
    }

    // Headline (first card only)
    if (card.headline) {
      var hl = document.createElement('div');
      hl.className = 'carousel-card__hl';
      hl.textContent = card.headline;
      inner.appendChild(hl);

      var rl = document.createElement('div');
      rl.className = 'carousel-card__rl';
      inner.appendChild(rl);
    }

    // Body sentences
    if (card.sentences && card.sentences.length > 0) {
      var bd = document.createElement('div');
      bd.className = 'carousel-card__bd';
      for (var i = 0; i < card.sentences.length; i++) {
        var p = document.createElement('p');
        p.textContent = card.sentences[i];
        bd.appendChild(p);
      }
      inner.appendChild(bd);
    }

    // "continued ->" marker
    if (card.hasMore) {
      var more = document.createElement('div');
      more.className = 'carousel-card__more';
      more.textContent = 'continued \u2192';
      inner.appendChild(more);
    }

    // Footer stamp — in normal flow, pushed to bottom via CSS margin-top:auto
    var ft = document.createElement('div');
    ft.className = 'carousel-card__ft';
    var stamp = document.createElement('span');
    stamp.className = 'carousel-card__stamp';
    stamp.textContent = 'Day ' + card.dayNum + ' \u00B7 ' + card.dateStr;
    ft.appendChild(stamp);
    inner.appendChild(ft);
  }

  function renderCountdownCard(inner, card) {
    var midBlock = document.createElement('div');
    var midN = document.createElement('div');
    midN.className = 'carousel-card__n';
    midN.textContent = formatNumber(card.midterms);
    var midL = document.createElement('div');
    midL.className = 'carousel-card__l';
    midL.textContent = 'days until the 2026 midterms';
    midBlock.appendChild(midN);
    midBlock.appendChild(midL);
    inner.appendChild(midBlock);

    var dv = document.createElement('div');
    dv.className = 'carousel-card__dv';
    inner.appendChild(dv);

    var presBlock = document.createElement('div');
    var presN = document.createElement('div');
    presN.className = 'carousel-card__n';
    presN.textContent = formatNumber(card.presidential);
    var presL = document.createElement('div');
    presL.className = 'carousel-card__l';
    presL.textContent = 'days until the 2028 presidential election';
    presBlock.appendChild(presN);
    presBlock.appendChild(presL);
    inner.appendChild(presBlock);
  }

  function renderCtaCard(inner, card) {
    var logoSrc = '/favicon.svg?v=3';

    var ch = document.createElement('div');
    ch.className = 'carousel-card__ch';
    ch.textContent = 'Get this in your inbox.';
    inner.appendChild(ch);

    var desc = document.createElement('div');
    desc.className = 'carousel-card__desc';
    var parts = [];
    if (card.storyCount) parts.push(card.storyCount + ' stories.');
    if (card.readTime) parts.push(card.readTime.replace('-', '\u2011') + '.');
    parts.push('Every day at 3pm Pacific.');
    parts.push('Free. No spam. No ads.');
    desc.innerHTML = parts.join('<br>');
    inner.appendChild(desc);

    var cc = document.createElement('div');
    cc.className = 'carousel-card__cc';
    cc.textContent = '200,000+ subscribers';
    inner.appendChild(cc);

    var btn = document.createElement('a');
    btn.className = 'carousel-card__btn';
    btn.href = '/subscribe/';
    btn.textContent = 'Subscribe for free';
    inner.appendChild(btn);

    var logo = document.createElement('div');
    logo.className = 'carousel-card__logo';
    var img = document.createElement('img');
    img.src = logoSrc;
    img.alt = 'WTFJHT';
    logo.appendChild(img);
    inner.appendChild(logo);
  }

  // ========================================================================
  // Card Content + Scale
  // ========================================================================

  function renderCardContent(cardEl, card) {
    cardEl.innerHTML = '';
    cardEl.classList.remove(
      'carousel-card--cover',
      'carousel-card--story',
      'carousel-card--countdown',
      'carousel-card--cta'
    );

    cardEl.classList.add('carousel-card--' + card.type);

    var inner = document.createElement('div');
    inner.className = 'carousel-card__inner';

    switch (card.type) {
      case 'cover':
        renderCoverCard(inner, card);
        break;
      case 'story':
        renderStoryCard(inner, card);
        break;
      case 'countdown':
        renderCountdownCard(inner, card);
        break;
      case 'cta':
        renderCtaCard(inner, card);
        break;
    }

    cardEl.appendChild(inner);

    // Add watermark on story cards — as direct child of cardEl (outside inner)
    // so it isn't affected by fitTextToCard scaling
    if (card.type === 'story') {
      var logoSrc = getLogoSrc();
      var wmk = document.createElement('div');
      wmk.className = 'carousel-card__watermark';
      var img = document.createElement('img');
      img.src = logoSrc;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      wmk.appendChild(img);
      cardEl.appendChild(wmk);
    }

    updateScale(cardEl);

    // Post-render overflow safety for story cards
    if (card.type === 'story') {
      fitTextToCard(cardEl);
    }
  }

  function updateScale(cardEl) {
    var w = cardEl.offsetWidth;
    if (w > 0) {
      cardEl.style.setProperty('--s', (w / 1080).toFixed(4));
    }
  }

  /**
   * If story text overflows the card, scale down the inner container.
   * Uses binary search for accuracy since text reflows non-linearly.
   */
  function fitTextToCard(cardEl) {
    var inner = cardEl.querySelector('.carousel-card__inner');
    if (!inner) return;

    var cardH = cardEl.clientHeight;
    if (inner.scrollHeight <= cardH) return;

    // Binary search for a transform scale that fits
    var lo = 0.5;
    var hi = 1.0;
    for (var i = 0; i < 10; i++) {
      var mid = (lo + hi) / 2;
      inner.style.transform = 'scale(' + mid + ')';
      inner.style.transformOrigin = 'top left';
      inner.style.width = (100 / mid) + '%';
      inner.style.height = (100 / mid) + '%';
      if (inner.scrollHeight * mid > cardH) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    inner.style.transform = 'scale(' + lo + ')';
    inner.style.width = (100 / lo) + '%';
    inner.style.height = (100 / lo) + '%';
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

    // Debounced resize handler to update --s scale
    var resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        updateScale(ui.cardEl);
      }, 100);
    }
    window.addEventListener('resize', onResize);
    ui._onResize = onResize;
  }

  // ========================================================================
  // Close
  // ========================================================================

  function closeCarousel(ui) {
    if (ui._onKeydown) {
      document.removeEventListener('keydown', ui._onKeydown);
      ui._onKeydown = null;
    }
    if (ui._onResize) {
      window.removeEventListener('resize', ui._onResize);
      ui._onResize = null;
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
    var cards = parseCards();
    if (cards.length === 0) return;
    if (startIndex < 0 || startIndex >= cards.length) startIndex = 0;

    document.body.classList.add('carousel-open');
    var ui = renderCarousel(cards);

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
