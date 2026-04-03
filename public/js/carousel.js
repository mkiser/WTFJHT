/**
 * WTFJHT Carousel v4.5 — Instagram-style card reading experience
 *
 * 4 card types: cover, story (with continuation), countdown, CTA
 * Responsive scaling via --s custom property (cardWidth / 1080).
 * Single canonical visual identity — Georgia serif + system monospace.
 * Fixed 4:5 portrait aspect ratio (IG native carousel size).
 */
(function() {
  'use strict';

  // Characters-per-card budget for story continuation
  var CHARS_FIRST = 650;
  var CHARS_CONT  = 750;

  // Export format presets
  var FORMAT_POST  = { width: 1080, height: 1350, suffix: '' };
  var FORMAT_STORY = { width: 1080, height: 1920, suffix: '-story' };

  // Cache reduced-motion preference and listen for changes
  var _reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var _reducedMotion = _reducedMotionQuery.matches;
  if (_reducedMotionQuery.addEventListener) {
    _reducedMotionQuery.addEventListener('change', function(e) { _reducedMotion = e.matches; });
  } else if (_reducedMotionQuery.addListener) {
    _reducedMotionQuery.addListener(function(e) { _reducedMotion = e.matches; });
  }

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
    if (!match) return false;
    var word = match[1];
    if (word.length === 1) return true;
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

      // Skip ellipses (... followed by space then capital)
      if (match[1] === '.' && match.index >= 2 && text[match.index - 1] === '.' && text[match.index - 2] === '.') continue;

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

        var text = el.textContent.trim();
        if (/^The 20\d\d/.test(text)) continue;

        var storyMatch = text.match(/^(\d+)\/\s/);
        var pollMatch = text.match(/^poll\/\s/i);

        // Handle eyebrow headers (e.g. "🔴🔵 PRIMARIES" before <br> then "4/ ...")
        if (!storyMatch && !pollMatch && el.querySelector('br')) {
          var br = el.querySelector('br');
          var afterText = '';
          var node = br.nextSibling;
          while (node) {
            afterText += node.textContent;
            node = node.nextSibling;
          }
          afterText = afterText.trim();
          storyMatch = afterText.match(/^(\d+)\/\s/);
          pollMatch = afterText.match(/^poll\/\s/i);
          if (storyMatch || pollMatch) text = afterText;
        }

        if (!storyMatch && !pollMatch) continue;

        var cardNumber = storyMatch ? storyMatch[1] : 'poll';

        // Full blurb text, stripped of prefix and sources
        var fullText = text.replace(/^(\d+|poll)\/\s*/i, '');
        var innerHTML = el.innerHTML;
        if (innerHTML.match(/\((<a\s[\s\S]+)\)\s*$/)) {
          // Find the matching open paren for the final close paren
          var trimmed = fullText.trim();
          if (trimmed.endsWith(')')) {
            var depth = 0;
            var matchPos = -1;
            for (var pi = trimmed.length - 1; pi >= 0; pi--) {
              if (trimmed[pi] === ')') depth++;
              else if (trimmed[pi] === '(') {
                depth--;
                if (depth === 0) { matchPos = pi; break; }
              }
            }
            if (matchPos !== -1) {
              fullText = trimmed.substring(0, matchPos).trim();
            }
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
      var readMatch = readEl.textContent.match(/(\d+)(½?)[\s\u2011\u2010\u00AD-]*min/i);
      if (readMatch) readTime = readMatch[1] + (readMatch[2] ? '\u00BD' : '') + '-min read';
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

    // --- Countdown card (data-driven dates with hardcoded fallbacks) ---
    var midtermsStr = article.getAttribute('data-carousel-midterms') || '2026-11-03';
    var presidentialStr = article.getAttribute('data-carousel-presidential') || '2028-11-07';

    // Use Pacific time for "today" and UTC math to match big-dumb-dashboard
    function parseCountdownDate(str) {
      var parts = str.split('-');
      return Date.UTC(+parts[0], +parts[1] - 1, +parts[2]);
    }
    var todayParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var todayUTC = Date.UTC(
      +todayParts.find(function(p) { return p.type === 'year'; }).value,
      +todayParts.find(function(p) { return p.type === 'month'; }).value - 1,
      +todayParts.find(function(p) { return p.type === 'day'; }).value
    );
    var daysMid = Math.floor((parseCountdownDate(midtermsStr) - todayUTC) / 86400000);
    var daysPres = Math.floor((parseCountdownDate(presidentialStr) - todayUTC) / 86400000);

    if (daysMid > 0 || daysPres > 0) {
      cards.push({
        type: 'countdown',
        midterms: daysMid > 0 ? daysMid : null,
        presidential: daysPres > 0 ? daysPres : null
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

  // ========================================================================
  // TIOS Content Parser
  // ========================================================================

  function parseTiosCards() {
    var cards = [];
    var article = document.querySelector('article.post');
    if (!article) return cards;

    var tiosRaw = article.getAttribute('data-carousel-tios');
    if (!tiosRaw || !tiosRaw.trim()) return cards;

    // Decode XML entities using textarea (safe: content comes from our own
    // server-rendered data attribute, not user input)
    var tmp = document.createElement('textarea');
    tmp.innerHTML = tiosRaw;
    var tiosText = tmp.value;

    var dayNum = article.getAttribute('data-carousel-day') || '';
    var desc = article.getAttribute('data-carousel-desc') || '';
    tmp.innerHTML = desc;
    desc = tmp.value;
    var dateStr = article.getAttribute('data-carousel-date') || '';

    // Cover card
    cards.push({
      type: 'tios-cover',
      dayNum: dayNum,
      desc: desc,
      dateStr: dateStr
    });

    // Sentence card
    cards.push({
      type: 'tios-sentence',
      tiosText: tiosText,
      dayNum: dayNum,
      dateStr: dateStr
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

    // Merge sparse trailing chunks back into the previous card (if within budget)
    if (chunks.length > 1) {
      var lastLen = 0;
      var lastChunk = chunks[chunks.length - 1];
      for (var j = 0; j < lastChunk.length; j++) lastLen += lastChunk[j].length;
      if (lastLen < 200) {
        var prevLen = 0;
        var prev = chunks[chunks.length - 2];
        for (var j2 = 0; j2 < prev.length; j2++) prevLen += prev[j2].length;
        var prevBudget = (chunks.length === 2) ? firstBudget : contBudget;
        if (prevLen + lastLen <= prevBudget) {
          for (var k = 0; k < lastChunk.length; k++) prev.push(lastChunk[k]);
          chunks.pop();
        }
      }
    }

    return chunks;
  }

  // ========================================================================
  // Action Bar Icons & Helpers
  // ========================================================================

  var _actionIcons = {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
    images: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="3" y="3" rx="2"/><path d="M7 21h10a2 2 0 0 0 2-2V7"/></svg>',
    story: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a3.04 3.04 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    bluesky: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.882 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>',
    threads: '<svg viewBox="0 0 192 192" fill="currentColor"><path d="M141.537 88.988c-.827-.396-1.667-.778-2.518-1.143-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.694 14.724-10.548 21.348-10.548h.076c8.25.053 14.474 2.451 18.504 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.244-15.224-1.626-23.679-1.14-23.82 1.371-39.134 15.264-38.105 34.568.521 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.23-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-44.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C34.236 139.966 28.808 120.682 28.605 96c.203-24.682 5.63-43.966 16.133-57.317C55.954 24.425 73.204 17.11 96.013 16.94c22.975.17 40.526 7.52 52.171 21.848 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.707-16.219-32.768C147.036 9.607 125.202.195 97.07 0h-.113C68.882.194 47.292 9.642 32.788 28.08 19.882 44.486 13.224 67.316 13.001 95.932L13 96l.001.068c.223 28.616 6.881 51.446 19.787 67.853C47.292 182.358 68.882 191.806 96.957 192h.113c24.964-.173 42.558-6.708 57.052-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-19.345-24.727-24.953zm-43.096 40.519c-10.44.588-21.286-4.098-21.821-14.135-.396-7.442 5.296-15.746 22.462-16.735 1.966-.114 3.895-.169 5.79-.169 6.235 0 12.068.606 17.371 1.765-1.978 24.702-13.58 28.713-23.802 29.274z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    mastodon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12v6.406z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.128 2.062 2.062 0 0 1 0 4.128zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    reddit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>'
  };

  function createActionOption(tag, config) {
    var el = document.createElement(tag);
    el.className = 'carousel-actions__option';
    if (config.action) el.setAttribute('data-action', config.action);
    if (config.social) el.setAttribute('data-social', config.social);
    if (config.href) { el.href = config.href; el.target = '_blank'; el.rel = 'noopener'; }
    if (config.hidden) el.hidden = true;
    var iconSpan = document.createElement('span');
    iconSpan.className = 'carousel-actions__icon';
    iconSpan.innerHTML = config.icon;
    el.appendChild(iconSpan);
    var labelSpan = document.createElement('span');
    labelSpan.className = 'carousel-actions__label';
    labelSpan.textContent = config.label;
    el.appendChild(labelSpan);
    return el;
  }

  // ========================================================================
  // DOM Renderer
  // ========================================================================

  function renderCarousel(cards, ariaLabel) {
    var overlay = document.createElement('div');
    overlay.className = 'carousel-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', ariaLabel || 'Story cards');

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

    var actions = document.createElement('div');
    actions.className = 'carousel-actions';

    // --- Share pill with dropdown ---
    var shareGroup = document.createElement('div');
    shareGroup.className = 'carousel-actions__group';

    var sharePill = document.createElement('button');
    sharePill.className = 'carousel-actions__pill';
    sharePill.setAttribute('aria-label', 'Share card');
    sharePill.setAttribute('aria-expanded', 'false');
    sharePill.innerHTML = _actionIcons.share + '<span>Share</span>';
    shareGroup.appendChild(sharePill);

    var shareCard = document.createElement('div');
    shareCard.className = 'carousel-actions__card';
    shareCard.setAttribute('aria-hidden', 'true');

    shareCard.appendChild(createActionOption('button', { action: 'copy-link', icon: _actionIcons.link, label: 'Copy link' }));
    if (navigator.share) {
      shareCard.appendChild(createActionOption('button', { action: 'native-share', icon: _actionIcons.send, label: 'Send' }));
    }
    shareCard.appendChild(createActionOption('a', { social: 'email', icon: _actionIcons.email, label: 'Email', href: '#' }));
    shareCard.appendChild(createActionOption('a', { social: 'whatsapp', icon: _actionIcons.whatsapp, label: 'WhatsApp', href: '#' }));
    shareCard.appendChild(createActionOption('a', { social: 'facebook', icon: _actionIcons.facebook, label: 'Facebook', href: '#' }));
    shareCard.appendChild(createActionOption('a', { social: 'bluesky', icon: _actionIcons.bluesky, label: 'Bluesky', href: '#' }));
    shareCard.appendChild(createActionOption('a', { social: 'threads', icon: _actionIcons.threads, label: 'Threads', href: '#' }));
    shareCard.appendChild(createActionOption('a', { social: 'x', icon: _actionIcons.twitter, label: 'X', href: '#' }));
    shareCard.appendChild(createActionOption('a', { social: 'mastodon', icon: _actionIcons.mastodon, label: 'Mastodon', href: '#' }));
    shareCard.appendChild(createActionOption('a', { social: 'linkedin', icon: _actionIcons.linkedin, label: 'LinkedIn', href: '#' }));
    shareCard.appendChild(createActionOption('a', { social: 'reddit', icon: _actionIcons.reddit, label: 'Reddit', href: '#' }));
    shareGroup.appendChild(shareCard);
    actions.appendChild(shareGroup);

    // --- Save pill with dropdown ---
    var downloadGroup = document.createElement('div');
    downloadGroup.className = 'carousel-actions__group';

    var downloadTrigger = document.createElement('button');
    downloadTrigger.className = 'carousel-actions__pill';
    downloadTrigger.setAttribute('aria-label', 'Save card as image');
    downloadTrigger.setAttribute('aria-expanded', 'false');
    downloadTrigger.innerHTML = _actionIcons.download + '<span>Save</span>';
    downloadGroup.appendChild(downloadTrigger);

    var downloadCard = document.createElement('div');
    downloadCard.className = 'carousel-actions__card';
    downloadCard.setAttribute('aria-hidden', 'true');

    downloadCard.appendChild(createActionOption('button', { action: 'save-card', icon: _actionIcons.image, label: 'This card (4:5)' }));
    downloadCard.appendChild(createActionOption('button', { action: 'save-card-story', icon: _actionIcons.story, label: 'This card (9:16)' }));
    downloadCard.appendChild(createActionOption('button', { action: 'save-all', icon: _actionIcons.images, label: 'All cards (4:5)' }));
    downloadCard.appendChild(createActionOption('button', { action: 'save-all-story', icon: _actionIcons.story, label: 'All cards (9:16)' }));

    downloadGroup.appendChild(downloadCard);
    actions.appendChild(downloadGroup);

    container.appendChild(actions);

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

    // Screen reader announcements
    var liveRegion = document.createElement('div');
    liveRegion.className = 'carousel-sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    overlay.appendChild(liveRegion);

    document.body.appendChild(overlay);

    overlay.offsetHeight;
    overlay.classList.add('is-open');

    return {
      overlay: overlay,
      progress: progress,
      sharePill: sharePill,
      shareCard: shareCard,
      downloadTrigger: downloadTrigger,
      downloadCard: downloadCard,
      closeBtn: closeBtn,
      counter: counter,
      cardEl: cardEl,
      prevBtn: prevBtn,
      nextBtn: nextBtn,
      liveRegion: liveRegion,
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
    var metaText = document.createElement('span');
    metaText.textContent = card.dateStr + ' \u00B7 wtfjht.com';
    meta.appendChild(metaText);
    var img = document.createElement('img');
    img.className = 'carousel-card__logo';
    img.src = logoSrc;
    img.alt = 'WTFJHT';
    meta.appendChild(img);
    inner.appendChild(meta);
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
      var para;
      if (card.continued) {
        // Continuation cards: join sentences into one flowing paragraph
        para = document.createElement('p');
        para.textContent = card.sentences.join(' ');
        bd.appendChild(para);
      } else {
        for (var i = 0; i < card.sentences.length; i++) {
          para = document.createElement('p');
          para.textContent = card.sentences[i];
          bd.appendChild(para);
        }
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
    stamp.textContent = 'Day ' + card.dayNum + ' \u00B7 ' + card.dateStr + ' \u00B7 wtfjht.com';
    ft.appendChild(stamp);
    var ftLogo = document.createElement('img');
    ftLogo.className = 'carousel-card__ft-logo';
    ftLogo.src = getLogoSrc();
    ftLogo.alt = '';
    ftLogo.setAttribute('aria-hidden', 'true');
    ft.appendChild(ftLogo);
    inner.appendChild(ft);
  }

  function renderCountdownCard(inner, card) {
    if (card.midterms) {
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
    }

    if (card.midterms && card.presidential) {
      var dv = document.createElement('div');
      dv.className = 'carousel-card__dv';
      inner.appendChild(dv);
    }

    if (card.presidential) {
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
    // if (card.storyCount) parts.push(card.storyCount + ' stories.');
    // if (card.readTime) parts.push(card.readTime.replace('-', '\u2011') + '.');
    parts.push('Subscribe to the political newsletter for normal people.');
    parts.push('Curated daily and delivered to 200,000+ people every afternoon around 3 pm Pacific.');
    desc.innerHTML = parts.join('<br>');
    inner.appendChild(desc);

    var cc = document.createElement('div');
    cc.className = 'carousel-card__cc';
    cc.textContent = 'Free. No spam. Unsubscribe anytime.';
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
  // TIOS Card Renderers
  // ========================================================================

  function renderTiosCoverCard(inner, card) {
    var logoSrc = '/favicon.svg?v=3';

    var eyebrow = document.createElement('div');
    eyebrow.className = 'carousel-card__tios-eyebrow';
    eyebrow.textContent = 'WTF Just Happened Today?';
    inner.appendChild(eyebrow);

    var prefix = document.createElement('div');
    prefix.className = 'carousel-card__tios-prefix';
    prefix.textContent = 'Today in';
    inner.appendChild(prefix);

    var hero = document.createElement('div');
    hero.className = 'carousel-card__tios-hero';
    hero.textContent = 'One\nSentence';
    var dot = document.createElement('span');
    dot.className = 'carousel-card__tios-dot';
    dot.textContent = '.';
    hero.appendChild(dot);
    inner.appendChild(hero);

    var stroke = document.createElement('div');
    stroke.className = 'carousel-card__tios-stroke';
    inner.appendChild(stroke);

    var dayquote = document.createElement('div');
    dayquote.className = 'carousel-card__tios-dayquote';
    var quoteText = card.desc ? card.desc.replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, '') : '';
    dayquote.textContent = 'Day ' + card.dayNum + ': \u201C' + quoteText + '\u201D';
    inner.appendChild(dayquote);

    var meta = document.createElement('div');
    meta.className = 'carousel-card__tios-meta';
    var metaText = document.createElement('span');
    metaText.textContent = card.dateStr + ' \u00B7 wtfjht.com';
    meta.appendChild(metaText);
    var img = document.createElement('img');
    img.className = 'carousel-card__tios-logo';
    img.src = logoSrc;
    img.alt = 'WTFJHT';
    meta.appendChild(img);
    inner.appendChild(meta);
  }

  function renderTiosSentenceCard(inner, card) {
    var logoSrc = '/favicon.svg?v=3';

    var header = document.createElement('div');
    header.className = 'carousel-card__tios-s-header';
    header.textContent = 'WTF Just Happened Today?';
    inner.appendChild(header);

    var title = document.createElement('div');
    title.className = 'carousel-card__tios-s-title';
    var titlePrefix = document.createElement('span');
    titlePrefix.className = 'carousel-card__tios-s-prefix';
    titlePrefix.textContent = 'Today in ';
    title.appendChild(titlePrefix);
    title.appendChild(document.createTextNode('One Sentence'));
    var titleDot = document.createElement('span');
    titleDot.className = 'carousel-card__tios-dot';
    titleDot.textContent = '.';
    title.appendChild(titleDot);
    inner.appendChild(title);

    var divider = document.createElement('div');
    divider.className = 'carousel-card__tios-s-divider';
    inner.appendChild(divider);

    // Body: replace semicolons with red pilcrow separators, red concluding period
    var body = document.createElement('div');
    body.className = 'carousel-card__tios-s-body';

    var text = card.tiosText || '';
    // Split on semicolons
    var parts = text.split(/;\s*/);
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (i > 0) {
        var sc = document.createElement('span');
        sc.className = 'carousel-card__tios-sc';
        sc.textContent = ' \u00B6 ';
        body.appendChild(sc);
      }
      // For the last part, check if it ends with a period and make it red
      if (i === parts.length - 1) {
        var trimmed = part.replace(/\.\s*$/, '');
        body.appendChild(document.createTextNode(trimmed));
        var endDot = document.createElement('span');
        endDot.className = 'carousel-card__tios-dot';
        endDot.textContent = '.';
        body.appendChild(endDot);
      } else {
        body.appendChild(document.createTextNode(part));
      }
    }
    inner.appendChild(body);

    var footer = document.createElement('div');
    footer.className = 'carousel-card__tios-s-footer';
    var footerText = document.createElement('span');
    footerText.textContent = 'Day ' + card.dayNum + ' \u00B7 ' + card.dateStr + ' \u00B7 wtfjht.com';
    footer.appendChild(footerText);
    var ftLogo = document.createElement('img');
    ftLogo.className = 'carousel-card__tios-logo';
    ftLogo.src = logoSrc;
    ftLogo.alt = '';
    ftLogo.setAttribute('aria-hidden', 'true');
    footer.appendChild(ftLogo);
    inner.appendChild(footer);
  }

  /**
   * Bidirectional font-size fitting for TIOS sentence body.
   * Binary-searches for the largest font size (in design units) where the
   * inner container's content still fits within the card height.  Works for
   * both the small card viewer (scales down) and the full-size export
   * (scales up to fill whitespace).
   */
  function fitTiosText(cardEl, inner) {
    if (!inner) inner = cardEl.querySelector('.carousel-card__inner');
    var bodyEl = inner ? inner.querySelector('.carousel-card__tios-s-body') : null;
    if (!inner || !bodyEl) return;

    // Clear stale overflow/mask styles from previous fit
    bodyEl.style.overflow = '';
    bodyEl.style.maskImage = '';
    bodyEl.style.webkitMaskImage = '';

    // Force reflow to ensure dimensions are available
    var cardH = cardEl.clientHeight;
    if (!cardH) {
      void cardEl.offsetHeight;
      cardH = cardEl.clientHeight;
    }
    if (!cardH) return;

    var lo = 16, hi = 52;
    for (var i = 0; i < 14; i++) {
      var mid = (lo + hi) / 2;
      bodyEl.style.fontSize = 'calc(' + mid + ' * var(--s) * 1px)';
      void inner.offsetHeight; // force layout recalc
      if (inner.scrollHeight > cardH + 1) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    // Step down slightly to absorb sub-pixel rounding from calc()
    bodyEl.style.fontSize = 'calc(' + (lo - 0.5) + ' * var(--s) * 1px)';

    // If text still overflows at minimum font size, clamp and fade
    void inner.offsetHeight;
    if (inner.scrollHeight > cardH + 1) {
      bodyEl.style.overflow = 'hidden';
      bodyEl.style.maskImage = 'linear-gradient(to bottom, black 85%, transparent)';
      bodyEl.style.webkitMaskImage = 'linear-gradient(to bottom, black 85%, transparent)';
    }
  }

  // ========================================================================
  // Card Content + Scale
  // ========================================================================

  function renderCardContent(cardEl, card, direction) {
    // Clean up stale slides from interrupted animations (keep only the last)
    var staleSlides = cardEl.querySelectorAll('.carousel-card__slide');
    for (var si = 0; si < staleSlides.length - 1; si++) {
      cardEl.removeChild(staleSlides[si]);
    }

    var oldSlide = cardEl.querySelector('.carousel-card__slide');
    var built;
    var reducedMotion = _reducedMotion;
    var shouldAnimate = !!oldSlide && direction !== 0 && !reducedMotion;

    function buildSlide() {
      cardEl.classList.remove(
        'carousel-card--cover',
        'carousel-card--story',
        'carousel-card--countdown',
        'carousel-card--cta',
        'carousel-card--tios-cover',
        'carousel-card--tios-sentence'
      );
      cardEl.classList.add('carousel-card--' + card.type);

      var slide = document.createElement('div');
      slide.className = 'carousel-card__slide';

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
        case 'tios-cover':
          renderTiosCoverCard(inner, card);
          break;
        case 'tios-sentence':
          renderTiosSentenceCard(inner, card);
          break;
      }

      slide.appendChild(inner);

      return { slide: slide, inner: inner };
    }

    if (shouldAnimate) {
      var enterFrom = direction > 0 ? '100%' : '-100%';
      var exitTo = direction > 0 ? '-100%' : '100%';

      built = buildSlide();
      var newSlide = built.slide;
      var newInner = built.inner;

      // Position new slide offscreen
      newSlide.style.transform = 'translateX(' + enterFrom + ')';
      cardEl.appendChild(newSlide);

      updateScale(cardEl);
      if (card.type === 'story') {
        fitTextToCard(cardEl, newInner);
      }
      if (card.type === 'tios-sentence') {
        fitTiosText(cardEl, newInner);
      }

      // Force reflow then animate
      newSlide.offsetHeight;
      oldSlide.classList.add('is-animating');
      newSlide.classList.add('is-animating');
      oldSlide.style.transform = 'translateX(' + exitTo + ')';
      newSlide.style.transform = 'translateX(0)';

      var cleaned = false;
      function cleanup() {
        if (cleaned) return;
        cleaned = true;
        if (oldSlide.parentNode) oldSlide.parentNode.removeChild(oldSlide);
        newSlide.classList.remove('is-animating');
      }
      newSlide.addEventListener('transitionend', function handler(e) {
        if (e.propertyName === 'transform') {
          newSlide.removeEventListener('transitionend', handler);
          cleanup();
        }
      });
      setTimeout(cleanup, 400);
    } else {
      // Non-animated: initial render, jump, or reduced-motion
      while (cardEl.firstChild) cardEl.removeChild(cardEl.firstChild);

      built = buildSlide();
      cardEl.appendChild(built.slide);

      updateScale(cardEl);
      if (card.type === 'story') {
        fitTextToCard(cardEl, built.inner);
      }
      if (card.type === 'tios-sentence') {
        fitTiosText(cardEl, built.inner);
      }
    }
  }

  function updateScale(cardEl) {
    var w = cardEl.offsetWidth;
    if (w > 0) {
      cardEl.style.setProperty('--s', (w / 1080).toFixed(4));
    }
  }

  /**
   * Fit story card text by adjusting only the body font size.
   * Binary-searches for the largest body size (28-44 scaled px) that
   * keeps inner.scrollHeight within the card, so headlines, story
   * numbers, and footers stay at a consistent size across all cards.
   */
  function fitTextToCard(cardEl, inner) {
    if (!inner) inner = cardEl.querySelector('.carousel-card__inner');
    var bodyEl = inner ? inner.querySelector('.carousel-card__bd') : null;
    if (!inner || !bodyEl) return;

    // Clear stale overflow/mask styles from previous fit
    bodyEl.style.overflow = '';
    bodyEl.style.maskImage = '';
    bodyEl.style.webkitMaskImage = '';

    var cardH = cardEl.clientHeight;
    if (!cardH) {
      void cardEl.offsetHeight;
      cardH = cardEl.clientHeight;
    }
    if (!cardH) return;

    var lo = 28, hi = 44;
    for (var i = 0; i < 14; i++) {
      var mid = (lo + hi) / 2;
      bodyEl.style.fontSize = 'calc(' + mid + ' * var(--s) * 1px)';
      void inner.offsetHeight;
      if (inner.scrollHeight > cardH + 1) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    bodyEl.style.fontSize = 'calc(' + (lo - 0.5) + ' * var(--s) * 1px)';

    // If text still overflows at minimum font size, clamp and fade
    void inner.offsetHeight;
    if (inner.scrollHeight > cardH + 1) {
      bodyEl.style.overflow = 'hidden';
      bodyEl.style.maskImage = 'linear-gradient(to bottom, black 85%, transparent)';
      bodyEl.style.webkitMaskImage = 'linear-gradient(to bottom, black 85%, transparent)';
    }
  }

  // ========================================================================
  // Image Export
  // ========================================================================

  var _html2canvasPromise = null;
  var _jszipPromise = null;
  var _exportInProgress = false;
  var _exportAllInProgress = false;

  function loadHtml2Canvas() {
    if (_html2canvasPromise) return _html2canvasPromise;
    _html2canvasPromise = new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = '/public/js/html2canvas.min.js';
      script.onload = function() {
        if (window.html2canvas) {
          resolve(window.html2canvas);
        } else {
          _html2canvasPromise = null;
          reject(new Error('html2canvas not found after loading'));
        }
      };
      script.onerror = function() {
        _html2canvasPromise = null;
        reject(new Error('Failed to load html2canvas'));
      };
      document.head.appendChild(script);
    });
    return _html2canvasPromise;
  }

  function exportCardImage(ui, format) {
    if (_exportInProgress || _exportAllInProgress) return;

    // Don't capture mid-animation
    var animating = ui.cardEl.querySelector('.is-animating');
    if (animating) return;

    _exportInProgress = true;
    format = format || FORMAT_POST;
    var trigger = ui.downloadTrigger;
    var card = ui.cards[ui.currentIndex];
    var triggerOriginal = trigger.innerHTML;
    var spinnerSvg = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 2a6 6 0 1 1-6 6" style="animation:carousel-spin 0.8s linear infinite;transform-origin:center"/></svg>';
    var checkSvg = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 9 7 13 13 3"/></svg>';

    // Add spinner keyframe if not already present
    if (!document.getElementById('carousel-spin-style')) {
      var style = document.createElement('style');
      style.id = 'carousel-spin-style';
      style.textContent = '@keyframes carousel-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);
    }

    trigger.innerHTML = spinnerSvg;

    loadHtml2Canvas().then(function(h2c) {
      return renderOffscreenAndCapture(h2c, card, format);
    }).then(function(canvas) {
      var dayNum = card.dayNum || '0';
      var cardIndex = ui.currentIndex + 1;
      var slug = ui._viewMode === 'tios' ? 'tios' : 'card';
      var suffix = format.suffix || '';
      return deliverImage(canvas, dayNum, cardIndex + suffix, slug);
    }).then(function() {
      trigger.innerHTML = checkSvg;
      setTimeout(function() { trigger.innerHTML = triggerOriginal; }, 1500);
    }).catch(function(err) {
      console.error('Card export failed:', err);
      trigger.innerHTML = triggerOriginal;
    }).then(function() {
      _exportInProgress = false;
    });
  }

  /**
   * Pre-rasterize SVG <img> elements to PNG data URIs.
   * html2canvas cannot reliably render SVGs (especially on mobile), and
   * fails entirely on SVGs that embed raster images via <image xlink:href>.
   * Drawing them to a temporary canvas first gives h2c plain PNGs at the
   * correct pixel dimensions.
   */
  function rasterizeSvgImages(container) {
    var imgs = container.querySelectorAll('img');
    var promises = [];
    for (var i = 0; i < imgs.length; i++) {
      (function(img) {
        var src = img.getAttribute('src') || '';
        if (src.indexOf('.svg') === -1) return;

        var w = parseInt(img.style.width) || 120;
        var h = parseInt(img.style.height) || 120;

        promises.push(new Promise(function(resolve) {
          var tempImg = new Image();
          tempImg.onload = function() {
            try {
              var canvas = document.createElement('canvas');
              canvas.width = w * 2;
              canvas.height = h * 2;
              var ctx = canvas.getContext('2d');
              ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
              img.src = canvas.toDataURL('image/png');
            } catch (e) {
              // Canvas tainted — leave original src
            }
            resolve();
          };
          tempImg.onerror = resolve;
          tempImg.src = src;
        }));
      })(imgs[i]);
    }
    return promises.length > 0 ? Promise.all(promises) : Promise.resolve();
  }

  function renderOffscreenAndCapture(h2c, card, format) {
    format = format || FORMAT_POST;
    var w = format.width;
    var h = format.height;

    var offscreen = document.createElement('div');
    offscreen.className = 'carousel-export-offscreen';
    if (format === FORMAT_STORY) offscreen.classList.add('carousel-export--story');
    offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + w + 'px;height:' + h + 'px;overflow:hidden;z-index:-1;';

    var cardEl = document.createElement('div');
    cardEl.className = 'carousel-card';
    cardEl.style.cssText = 'width:' + w + 'px;height:' + h + 'px;max-width:none;max-height:none;border-radius:0;';
    cardEl.style.setProperty('--s', '1');

    // Add card type class
    cardEl.classList.add('carousel-card--' + card.type);

    var slide = document.createElement('div');
    slide.className = 'carousel-card__slide';
    slide.style.cssText = 'position:absolute;inset:0;';

    var inner = document.createElement('div');
    inner.className = 'carousel-card__inner';

    switch (card.type) {
      case 'cover': renderCoverCard(inner, card); break;
      case 'story': renderStoryCard(inner, card); break;
      case 'countdown': renderCountdownCard(inner, card); break;
      case 'cta': renderCtaCard(inner, card); break;
      case 'tios-cover': renderTiosCoverCard(inner, card); break;
      case 'tios-sentence': renderTiosSentenceCard(inner, card); break;
    }

    slide.appendChild(inner);
    cardEl.appendChild(slide);
    offscreen.appendChild(cardEl);
    document.body.appendChild(offscreen);

    // Fix logo sizes for html2canvas — it may not resolve calc() with CSS
    // custom properties on some mobile browsers, causing SVGs to render at
    // their intrinsic size (256×256) instead of the intended dimensions.
    var logoImgs = offscreen.querySelectorAll('img.carousel-card__logo, img.carousel-card__ft-logo, img.carousel-card__tios-logo');
    for (var li = 0; li < logoImgs.length; li++) {
      var logoW = logoImgs[li].classList.contains('carousel-card__ft-logo') ? 100 : 120;
      if (logoImgs[li].classList.contains('carousel-card__tios-logo')) logoW = 100;
      logoImgs[li].style.width = logoW + 'px';
      logoImgs[li].style.height = logoW + 'px';
    }
    // CTA card wraps the logo img in a div.carousel-card__logo
    var ctaLogos = offscreen.querySelectorAll('.carousel-card--cta .carousel-card__logo img');
    for (var ci = 0; ci < ctaLogos.length; ci++) {
      ctaLogos[ci].style.width = '120px';
      ctaLogos[ci].style.height = '120px';
    }

    // Wait for images to load
    var images = offscreen.querySelectorAll('img');
    var imagePromises = [];
    for (var i = 0; i < images.length; i++) {
      (function(img) {
        if (img.complete) return;
        imagePromises.push(new Promise(function(resolve) {
          img.onload = resolve;
          img.onerror = resolve;
        }));
      })(images[i]);
    }

    var bgColor = (card.type === 'cta' || card.type === 'tios-cover' || card.type === 'tios-sentence')
      ? '#0a0a0a' : '#ffffff';

    return Promise.all(imagePromises).then(function() {
      // Rasterize SVG images to PNG data URIs before html2canvas runs
      return rasterizeSvgImages(offscreen);
    }).then(function() {
      if (card.type === 'story') {
        fitTextToCard(cardEl, inner);
      }
      if (card.type === 'tios-sentence') {
        fitTiosText(cardEl, inner);
      }

      // html2canvas can't render CSS mask-image, so replace with a gradient overlay div
      var maskedEl = inner.querySelector('[style*="mask-image"], [style*="maskImage"]') ||
                     (function() {
                       var els = inner.querySelectorAll('.carousel-card__bd, .carousel-card__tios-s-body');
                       for (var mi = 0; mi < els.length; mi++) {
                         if (els[mi].style.maskImage) return els[mi];
                       }
                       return null;
                     })();
      if (maskedEl) {
        maskedEl.style.maskImage = '';
        maskedEl.style.webkitMaskImage = '';
        var fadeOverlay = document.createElement('div');
        fadeOverlay.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:15%;' +
          'background:linear-gradient(to bottom, transparent, ' + bgColor + ');pointer-events:none;';
        maskedEl.style.position = 'relative';
        maskedEl.appendChild(fadeOverlay);
      }

      return h2c(offscreen, {
        scale: 1,
        width: w,
        height: h,
        backgroundColor: bgColor,
        useCORS: true,
        logging: false
      });
    }).then(function(canvas) {
      if (offscreen.parentNode) offscreen.parentNode.removeChild(offscreen);
      return canvas;
    }).catch(function(err) {
      if (offscreen.parentNode) offscreen.parentNode.removeChild(offscreen);
      throw err;
    });
  }

  /**
   * Show a "Tap to save" button when navigator.share() fails due to
   * expired user gesture (common when rendering many cards takes time).
   */
  function shareWithGestureFallback(files) {
    function tryShare() {
      return navigator.share({ files: files });
    }

    if (!navigator.canShare || !navigator.canShare({ files: files })) {
      return Promise.reject(new Error('Share not supported'));
    }

    return tryShare().catch(function(err) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        // Gesture expired or blocked — show a tap-to-share prompt
        return new Promise(function(resolve, reject) {
          var btn = document.createElement('button');
          btn.className = 'carousel-share-ready';
          btn.textContent = 'Tap to save';
          var overlay = document.querySelector('.carousel-overlay');
          if (!overlay) { reject(err); return; }
          overlay.appendChild(btn);
          void btn.offsetHeight;
          btn.classList.add('is-visible');

          btn.addEventListener('click', function() {
            btn.classList.remove('is-visible');
            setTimeout(function() { btn.remove(); }, 200);
            tryShare().then(resolve).catch(function(e) {
              if (e.name === 'AbortError') resolve(); // user cancelled
              else reject(e);
            });
          });
        });
      }
      if (err.name === 'AbortError') return Promise.resolve(); // user cancelled
      throw err;
    });
  }

  function deliverImage(canvas, dayNum, cardIndex, slug) {
    slug = slug || 'card';
    return new Promise(function(resolve) {
      canvas.toBlob(function(blob) {
        if (!blob) { resolve(); return; }
        var filename = 'wtfjht-day-' + dayNum + '-' + slug + '-' + cardIndex + '.png';
        var file = new File([blob], filename, { type: 'image/png' });
        shareWithGestureFallback([file]).then(resolve).catch(function() {
          triggerDownload(blob, filename);
          resolve();
        });
      }, 'image/png');
    });
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  function loadJSZip() {
    if (_jszipPromise) return _jszipPromise;
    _jszipPromise = new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = '/public/js/jszip.min.js';
      script.onload = function() {
        if (window.JSZip) {
          resolve(window.JSZip);
        } else {
          _jszipPromise = null;
          reject(new Error('JSZip not found after loading'));
        }
      };
      script.onerror = function() {
        _jszipPromise = null;
        reject(new Error('Failed to load JSZip'));
      };
      document.head.appendChild(script);
    });
    return _jszipPromise;
  }

  function exportAllCards(ui, format) {
    if (_exportAllInProgress || _exportInProgress) return;
    _exportAllInProgress = true;
    format = format || FORMAT_POST;
    var trigger = ui.downloadTrigger;

    var cards = ui.cards;
    var total = cards.length;
    var dayNum = cards[0].dayNum || '0';
    var originalContent = trigger.cloneNode(true);
    var checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    checkSvg.setAttribute('viewBox', '0 0 16 16');
    checkSvg.setAttribute('fill', 'none');
    checkSvg.setAttribute('stroke', 'currentColor');
    checkSvg.setAttribute('stroke-width', '2');
    checkSvg.setAttribute('stroke-linecap', 'round');
    checkSvg.setAttribute('stroke-linejoin', 'round');
    var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '3 9 7 13 13 3');
    checkSvg.appendChild(polyline);

    trigger.textContent = '0/' + total;

    loadHtml2Canvas().then(function(h2c) {
      var blobs = [];
      var chain = Promise.resolve();

      for (var i = 0; i < total; i++) {
        (function(idx) {
          chain = chain.then(function() {
            return renderOffscreenAndCapture(h2c, cards[idx], format);
          }).then(function(canvas) {
            return new Promise(function(resolve) {
              canvas.toBlob(function(blob) {
                blobs.push(blob);
                trigger.textContent = (idx + 1) + '/' + total;
                resolve();
              }, 'image/png');
            });
          });
        })(i);
      }

      return chain.then(function() { return blobs; });
    }).then(function(blobs) {
      return buildAndDownloadZip(blobs, dayNum, format.suffix, ui._viewMode);
    }).then(function() {
      trigger.textContent = '';
      trigger.appendChild(checkSvg);
      setTimeout(function() {
        trigger.textContent = '';
        while (originalContent.firstChild) {
          trigger.appendChild(originalContent.firstChild);
        }
      }, 1500);
    }).catch(function(err) {
      console.error('Export all cards failed:', err);
      trigger.textContent = '';
      while (originalContent.firstChild) {
        trigger.appendChild(originalContent.firstChild);
      }
    }).then(function() {
      _exportAllInProgress = false;
    });
  }

  function buildAndDownloadZip(blobs, dayNum, suffix, viewMode) {
    suffix = suffix || '';
    var slug = viewMode === 'tios' ? 'tios' : 'card';
    return loadJSZip().then(function(JSZip) {
      var zip = new JSZip();
      for (var i = 0; i < blobs.length; i++) {
        var padded = (i + 1).toString().padStart(2, '0');
        zip.file('wtfjht-day-' + dayNum + '-' + slug + '-' + padded + suffix + '.png', blobs[i]);
      }
      return zip.generateAsync({ type: 'blob', compression: 'STORE' });
    }).then(function(zipBlob) {
      var zipName = viewMode === 'tios' ? 'tios' : 'cards';
      triggerDownload(zipBlob, 'wtfjht-day-' + dayNum + '-' + zipName + suffix + '.zip');
    });
  }

  // ========================================================================
  // Action Bar Utilities
  // ========================================================================

  function getCardShareUrl(ui) {
    var url = new URL(window.location);
    url.searchParams.set('view', ui._viewMode || 'cards');
    url.searchParams.set('s', ui.currentIndex.toString());
    return url.toString();
  }

  function updateShareLinks(ui) {
    var url = getCardShareUrl(ui);
    var title = document.title || 'WTF Just Happened Today?';
    var enc = encodeURIComponent(url);
    var encTitle = encodeURIComponent(title);
    var links = ui.shareCard.querySelectorAll('[data-social]');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      switch (link.getAttribute('data-social')) {
        case 'email':
          link.href = 'mailto:?subject=' + encTitle + '&body=' + enc; break;
        case 'whatsapp':
          link.href = 'https://wa.me/?text=' + encTitle + '%20' + enc; break;
        case 'facebook':
          link.href = 'https://www.facebook.com/sharer/sharer.php?u=' + enc; break;
        case 'bluesky':
          link.href = 'https://bsky.app/intent/compose?text=' + encTitle + '%0A%0A' + enc; break;
        case 'threads':
          link.href = 'https://threads.com/intent/post?text=' + encTitle + '%20' + enc; break;
        case 'x':
          link.href = 'https://twitter.com/intent/tweet?text=' + encTitle + '&url=' + enc; break;
        case 'mastodon':
          link.href = 'https://mastodonshare.com/?text=' + encTitle + '&url=' + enc; break;
        case 'linkedin':
          link.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc; break;
        case 'reddit':
          link.href = 'https://www.reddit.com/submit?url=' + enc + '&title=' + encTitle; break;
      }
    }
  }

  function closeActionDropdowns(ui) {
    var hadOpen = false;
    if (ui.shareCard && ui.shareCard.classList.contains('is-open')) {
      ui.shareCard.classList.remove('is-open');
      ui.shareCard.setAttribute('aria-hidden', 'true');
      ui.sharePill.setAttribute('aria-expanded', 'false');
      hadOpen = true;
    }
    if (ui.downloadCard && ui.downloadCard.classList.contains('is-open')) {
      ui.downloadCard.classList.remove('is-open');
      ui.downloadCard.setAttribute('aria-hidden', 'true');
      ui.downloadTrigger.setAttribute('aria-expanded', 'false');
      hadOpen = true;
    }
    return hadOpen;
  }

  // ========================================================================
  // Navigation
  // ========================================================================

  function goToCard(ui, index, direction) {
    if (index < 0 || index >= ui.cards.length) return;
    if (direction === undefined) direction = 0;
    ui.currentIndex = index;
    renderCardContent(ui.cardEl, ui.cards[index], direction);

    var segments = ui.progress.querySelectorAll('.carousel-progress__segment');
    for (var i = 0; i < segments.length; i++) {
      segments[i].classList.toggle('is-active', i <= index);
    }

    ui.counter.textContent = (index + 1) + ' / ' + ui.cards.length;
    ui.prevBtn.style.display = (index === 0) ? 'none' : '';
    ui.nextBtn.style.display = (index === ui.cards.length - 1) ? 'none' : '';

    // Announce card change to screen readers
    if (ui.liveRegion) {
      var card = ui.cards[index];
      var label = card.type;
      if (card.type === 'story') label = 'story ' + card.number;
      if (card.type === 'tios-cover') label = 'Today in One Sentence cover';
      if (card.type === 'tios-sentence') label = 'Today in One Sentence';
      ui.liveRegion.textContent = 'Card ' + (index + 1) + ' of ' + ui.cards.length + ', ' + label;
    }

    updateUrlState(index, ui._firstNav, ui._viewMode);
    ui._firstNav = false;
  }

  function goNext(ui) {
    if (ui.currentIndex < ui.cards.length - 1) goToCard(ui, ui.currentIndex + 1, 1);
  }

  function goPrev(ui) {
    if (ui.currentIndex > 0) goToCard(ui, ui.currentIndex - 1, -1);
  }

  function attachNavigation(ui) {
    ui.prevBtn.addEventListener('click', function() { goPrev(ui); });
    ui.nextBtn.addEventListener('click', function() { goNext(ui); });

    // Progress bar click-to-jump
    var segments = ui.progress.querySelectorAll('.carousel-progress__segment');
    for (var pi = 0; pi < segments.length; pi++) {
      (function(index) {
        segments[index].addEventListener('click', function() {
          var dir = index > ui.currentIndex ? 1 : (index < ui.currentIndex ? -1 : 0);
          goToCard(ui, index, dir);
        });
      })(pi);
    }

    // Keyboard navigation with focus trapping
    function onKeydown(e) {
      if (e.key === 'Tab') {
        var focusable = ui.overlay.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }
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

    // Card tap zones — shift left zone inward on mobile to avoid iOS swipe-back
    function handleTapZone(clientX) {
      var rect = ui.cardEl.getBoundingClientRect();
      var x = clientX - rect.left;
      var w = rect.width;
      if (window.innerWidth < 600) {
        var ratio = x / w;
        if (ratio > 0.15 && ratio < 0.4) goPrev(ui);
        else if (ratio > 0.67) goNext(ui);
      } else {
        var third = w / 3;
        if (x < third) goPrev(ui);
        else if (x > third * 2) goNext(ui);
      }
    }

    // Click handler (fallback for desktop mouse clicks)
    ui.cardEl.addEventListener('click', function(e) {
      if (ui._dragMoved) { ui._dragMoved = false; return; }
      if (e.target.tagName === 'A' || e.target.closest('a')) return;
      handleTapZone(e.clientX);
    });

    // Swipe drag feedback with proportional threshold
    var dragStartX = 0, dragStartY = 0, isDragging = false, dragLocked = false, dragIsHorizontal = false;
    ui.cardEl.addEventListener('pointerdown', function(e) {
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      isDragging = true;
      dragLocked = false;
      dragIsHorizontal = false;
      ui._dragMoved = false;
      ui.cardEl.setPointerCapture(e.pointerId);
    });
    ui.cardEl.addEventListener('pointermove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      if (!dragLocked) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          dragLocked = true;
          dragIsHorizontal = Math.abs(dx) >= Math.abs(dy);
        } else {
          return;
        }
      }
      if (dragIsHorizontal) {
        var slide = ui.cardEl.querySelector('.carousel-card__slide');
        if (slide) {
          slide.classList.remove('is-animating');
          slide.style.transform = 'translateX(' + dx + 'px)';
        }
        ui._dragMoved = true;
      }
    });
    ui.cardEl.addEventListener('pointerup', function(e) {
      if (!isDragging) return;
      isDragging = false;
      var dx = e.clientX - dragStartX;
      var threshold = Math.max(30, ui.cardEl.offsetWidth * 0.08);
      if (dragLocked && dragIsHorizontal && Math.abs(dx) > threshold) {
        var canNav = (dx < 0 && ui.currentIndex < ui.cards.length - 1) ||
                     (dx > 0 && ui.currentIndex > 0);
        if (canNav) {
          if (dx < 0) goNext(ui); else goPrev(ui);
        } else {
          // At boundary — snap back
          var slide = ui.cardEl.querySelector('.carousel-card__slide');
          if (slide) {
            slide.classList.add('is-animating');
            slide.style.transform = 'translateX(0)';
            var boundaryCleaned = false;
            function boundaryCleanup() {
              if (boundaryCleaned) return;
              boundaryCleaned = true;
              slide.classList.remove('is-animating');
            }
            slide.addEventListener('transitionend', function handler(ev) {
              if (ev.propertyName === 'transform') {
                slide.removeEventListener('transitionend', handler);
                boundaryCleanup();
              }
            });
            setTimeout(boundaryCleanup, 400);
          }
        }
      } else if (dragLocked && dragIsHorizontal) {
        // Snap back
        var slide = ui.cardEl.querySelector('.carousel-card__slide');
        if (slide) {
          slide.classList.add('is-animating');
          slide.style.transform = 'translateX(0)';
          var snapCleaned = false;
          function snapCleanup() {
            if (snapCleaned) return;
            snapCleaned = true;
            slide.classList.remove('is-animating');
          }
          slide.addEventListener('transitionend', function handler(ev) {
            if (ev.propertyName === 'transform') {
              slide.removeEventListener('transitionend', handler);
              snapCleanup();
            }
          });
          setTimeout(snapCleanup, 400);
        }
      } else if (!dragLocked) {
        // No significant movement — treat as tap.
        // Handles mobile where setPointerCapture can suppress the click event.
        if (e.target.tagName !== 'A' && !e.target.closest('a')) {
          handleTapZone(e.clientX);
        }
        ui._dragMoved = true; // Suppress redundant click if it also fires
      }
    });
    ui.cardEl.addEventListener('pointercancel', function() {
      isDragging = false;
      var slide = ui.cardEl.querySelector('.carousel-card__slide');
      if (slide) {
        slide.classList.add('is-animating');
        slide.style.transform = 'translateX(0)';
        var cancelCleaned = false;
        function cancelCleanup() {
          if (cancelCleaned) return;
          cancelCleaned = true;
          slide.classList.remove('is-animating');
        }
        slide.addEventListener('transitionend', function handler(e) {
          if (e.propertyName === 'transform') {
            slide.removeEventListener('transitionend', handler);
            cancelCleanup();
          }
        });
        setTimeout(cancelCleanup, 400);
      }
    });

    // Pull-to-dismiss gesture (vertical swipe down)
    var pullStartX = 0, pullStartY = 0, pullActive = false;
    ui.overlay.addEventListener('pointerdown', function(e) {
      pullStartX = e.clientX;
      pullStartY = e.clientY;
      pullActive = true;
    });
    ui.overlay.addEventListener('pointerup', function(e) {
      if (!pullActive) return;
      pullActive = false;
      var dy = e.clientY - pullStartY;
      var dx = e.clientX - pullStartX;
      if (dy > 100 && Math.abs(dy) > Math.abs(dx)) {
        closeCarousel(ui);
      }
    });
    ui.overlay.addEventListener('pointercancel', function() { pullActive = false; });

    ui.closeBtn.addEventListener('click', function() { closeCarousel(ui); });

    // --- Action bar dropdowns ---
    function toggleDropdown(triggerEl, cardEl) {
      var isOpen = cardEl.classList.contains('is-open');
      closeActionDropdowns(ui);
      if (!isOpen) {
        if (cardEl === ui.shareCard) updateShareLinks(ui);
        cardEl.classList.add('is-open');
        cardEl.setAttribute('aria-hidden', 'false');
        triggerEl.setAttribute('aria-expanded', 'true');
      }
    }

    ui.sharePill.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleDropdown(ui.sharePill, ui.shareCard);
    });

    ui.downloadTrigger.addEventListener('click', function(e) {
      e.stopPropagation();
      if (_exportInProgress || _exportAllInProgress) return;
      toggleDropdown(ui.downloadTrigger, ui.downloadCard);
    });


    // Share: Copy link
    ui.shareCard.querySelector('[data-action="copy-link"]').addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof gtag === 'function') gtag('event', 'carousel_share', { method: 'copy_link' });
      var url = getCardShareUrl(ui);
      var label = this.querySelector('.carousel-actions__label');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          var orig = label.textContent;
          label.textContent = 'Copied!';
          setTimeout(function() { label.textContent = orig; closeActionDropdowns(ui); }, 800);
        }).catch(function() {
          prompt('Copy this link:', url);
          closeActionDropdowns(ui);
        });
      } else {
        prompt('Copy this link:', url);
        closeActionDropdowns(ui);
      }
    });

    // Share: Native share
    var nativeShareOpt = ui.shareCard.querySelector('[data-action="native-share"]');
    if (nativeShareOpt) {
      nativeShareOpt.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var url = getCardShareUrl(ui);
        var title = document.title || 'WTF Just Happened Today?';
        if (typeof gtag === 'function') gtag('event', 'carousel_share', { method: 'native' });
        navigator.share({ title: title, url: url }).then(function() {
          closeActionDropdowns(ui);
        }).catch(function() {});
      });
    }

    // Share: Social links close dropdown on click
    var socialLinks = ui.shareCard.querySelectorAll('[data-social]');
    for (var sli = 0; sli < socialLinks.length; sli++) {
      socialLinks[sli].addEventListener('click', function() {
        if (typeof gtag === 'function') gtag('event', 'carousel_share', { method: this.getAttribute('data-social') });
        setTimeout(function() { closeActionDropdowns(ui); }, 100);
      });
    }

    // Save: This card (4:5)
    ui.downloadCard.querySelector('[data-action="save-card"]').addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeActionDropdowns(ui);
      if (typeof gtag === 'function') gtag('event', 'carousel_save', { type: 'single', format: '4x5' });
      exportCardImage(ui, FORMAT_POST);
    });

    // Save: This card (9:16)
    ui.downloadCard.querySelector('[data-action="save-card-story"]').addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeActionDropdowns(ui);
      if (typeof gtag === 'function') gtag('event', 'carousel_save', { type: 'single', format: '9x16' });
      exportCardImage(ui, FORMAT_STORY);
    });

    // Save: All cards (4:5)
    ui.downloadCard.querySelector('[data-action="save-all"]').addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeActionDropdowns(ui);
      if (typeof gtag === 'function') gtag('event', 'carousel_save', { type: 'all', format: '4x5' });
      exportAllCards(ui, FORMAT_POST);
    });

    // Save: All cards (9:16)
    ui.downloadCard.querySelector('[data-action="save-all-story"]').addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeActionDropdowns(ui);
      if (typeof gtag === 'function') gtag('event', 'carousel_save', { type: 'all', format: '9x16' });
      exportAllCards(ui, FORMAT_STORY);
    });


    // Overlay click-to-close with generous margin around container to prevent
    // accidental dismissal from near-miss clicks on nav arrows
    ui.overlay.addEventListener('click', function(e) {
      // Close dropdowns on any click outside action groups
      if (!e.target.closest('.carousel-actions__group')) {
        if (closeActionDropdowns(ui)) return;
      }
      if (e.target === ui.overlay) {
        var containerRect = ui.overlay.querySelector('.carousel-container').getBoundingClientRect();
        var margin = 60;
        var inContainer = (
          e.clientX >= containerRect.left - margin &&
          e.clientX <= containerRect.right + margin &&
          e.clientY >= containerRect.top - margin &&
          e.clientY <= containerRect.bottom + margin
        );
        if (!inContainer) closeCarousel(ui);
      }
    });

    // Debounced resize handler to update --s scale and re-fit text
    var resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        updateScale(ui.cardEl);
        if (ui.cardEl.querySelector('.is-animating')) return;
        var card = ui.cards[ui.currentIndex];
        if (card && card.type === 'story') fitTextToCard(ui.cardEl);
        if (card && card.type === 'tios-sentence') fitTiosText(ui.cardEl);
      }, 100);
    }
    window.addEventListener('resize', onResize);
    ui._onResize = onResize;
  }

  // ========================================================================
  // Close
  // ========================================================================

  function closeCarousel(ui, skipHistory) {
    if (!ui) return;
    activeUI = null;

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

    // Restore scroll position after unlocking body
    document.body.classList.remove('carousel-open');
    var savedScroll = parseInt(document.body.dataset.carouselScroll || '0', 10);
    document.body.style.top = '';
    window.scrollTo(0, savedScroll);

    // If closed via back button, history already popped — don't push/replace again
    if (!skipHistory) {
      // Pop the carousel state we pushed
      history.back();
    }

    // Restore focus to the trigger button
    if (ui._viewMode === 'tios') {
      var moreTrigger = document.querySelector('.more-menu__trigger');
      if (moreTrigger) moreTrigger.focus();
    } else {
      var trigger = document.querySelector('.carousel-toggle');
      if (trigger) trigger.focus();
    }
  }

  // ========================================================================
  // URL State
  // ========================================================================

  function updateUrlState(index, push, viewMode) {
    var url = new URL(window.location);
    url.searchParams.set('view', viewMode || 'cards');
    url.searchParams.set('s', index.toString());
    if (push) {
      history.pushState({ carouselOpen: true }, '', url.toString());
    } else {
      history.replaceState({ carouselOpen: true }, '', url.toString());
    }
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

  var activeUI = null;

  function openCarousel(startIndex) {
    // Guard against double-open
    if (activeUI) return;

    var cards = parseCards();
    if (cards.length === 0) return;
    if (startIndex < 0 || startIndex >= cards.length) startIndex = 0;

    // Lock body scroll position to prevent peek-a-boo on mobile
    var scrollY = window.scrollY;
    document.body.dataset.carouselScroll = scrollY;
    document.body.style.top = '-' + scrollY + 'px';
    document.body.classList.add('carousel-open');
    var ui = renderCarousel(cards);
    ui._firstNav = true;
    ui._viewMode = 'cards';

    if (typeof gtag === 'function') gtag('event', 'carousel_open');

    attachNavigation(ui);
    goToCard(ui, startIndex);
    activeUI = ui;

    // Move focus into the dialog
    ui.closeBtn.focus();
  }

  function openTiosCarousel(startIndex) {
    if (activeUI) return;

    var cards = parseTiosCards();
    if (cards.length === 0) return;
    if (startIndex < 0 || startIndex >= cards.length) startIndex = 0;

    var scrollY = window.scrollY;
    document.body.dataset.carouselScroll = scrollY;
    document.body.style.top = '-' + scrollY + 'px';
    document.body.classList.add('carousel-open');
    var ui = renderCarousel(cards, 'Today in One Sentence');
    ui._firstNav = true;
    ui._viewMode = 'tios';

    if (typeof gtag === 'function') gtag('event', 'tios_carousel_open');

    attachNavigation(ui);
    goToCard(ui, startIndex);
    activeUI = ui;

    ui.closeBtn.focus();
  }

  // Expose for click handler in default.html (separate script scope)
  window.openTiosCarousel = openTiosCarousel;

  document.addEventListener('DOMContentLoaded', function() {
    var toggle = document.querySelector('.carousel-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function() {
      try { openCarousel(0); } catch (e) { console.error('Carousel error:', e); }
    });

    var params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'cards') {
      try { openCarousel(parseInt(params.get('s'), 10) || 0); } catch (e) { console.error('Carousel error:', e); }
    } else if (params.get('view') === 'tios') {
      try { openTiosCarousel(parseInt(params.get('s'), 10) || 0); } catch (e) { console.error('TIOS carousel error:', e); }
    }

    // Close carousel on browser back button
    window.addEventListener('popstate', function() {
      if (activeUI) {
        closeCarousel(activeUI, true);
      }
      // Clean URL params in case we landed on a ?view=cards URL
      cleanUrlState();
    });
  });

})();
