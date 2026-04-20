(function () {
  'use strict';

  var VERDICTS = {
    0: "Didn't read a word",
    1: 'Skimmed the headlines',
    2: 'Paying some attention',
    3: 'Solid, but a few slipped by',
    4: 'Wow, look at you',
    5: "You didn't miss a thing",
  };

  var quizEl = document.getElementById('wtfjht-quiz');
  if (!quizEl) return;

  var raw = quizEl.getAttribute('data-quiz');
  if (!raw) return;

  var quizData;
  try {
    // xml_escape encodes quotes, decode them
    var decoded = raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
    quizData = JSON.parse(decoded);
  } catch (e) {
    console.error('Failed to parse quiz data:', e);
    return;
  }

  // Build day_number → post_url lookup from the data-day-urls attribute
  // (Jekyll-computed at build time; empty object if none available)
  var dayUrls = {};
  var dayUrlsRaw = quizEl.getAttribute('data-day-urls');
  if (dayUrlsRaw) {
    try {
      var dayDecoded = dayUrlsRaw.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      dayUrls = JSON.parse(dayDecoded) || {};
    } catch (e) { dayUrls = {}; }
  }

  // Capture subscriber identity from URL params (newsletter merge tags)
  var urlParams = new URLSearchParams(window.location.search);
  var subscriberId = urlParams.get('s') || '';
  var editionDate = urlParams.get('ed') || '';
  var source = urlParams.get('src') || 'direct';

  // Strip identity params from visible URL
  if (subscriberId || editionDate || source !== 'direct') {
    var cleanUrl = window.location.pathname;
    history.replaceState(null, '', cleanUrl);
  }

  var questions = quizData.questions || [];
  if (!questions.length) return;

  // State
  var state = {
    current: 0,
    answers: [],
    score: 0,
    locked: false,
  };

  // Elements
  var app = document.getElementById('quiz-app');
  var progressFill = document.getElementById('quiz-progress');
  var currentEl = document.getElementById('quiz-current');
  var totalEl = document.getElementById('quiz-total');
  var questionText = document.getElementById('quiz-question-text');
  var optionBtns = document.querySelectorAll('.quiz-option');
  var feedbackPanel = document.getElementById('quiz-feedback');
  var feedbackResult = document.getElementById('quiz-feedback-result');
  var feedbackExplanation = document.getElementById('quiz-feedback-explanation');
  var feedbackSource = document.getElementById('quiz-feedback-source');
  var nextBtn = document.getElementById('quiz-next-btn');
  var resultsPanel = document.getElementById('quiz-results');
  var scoreEl = document.getElementById('quiz-score');
  var verdictEl = document.getElementById('quiz-verdict');
  var breakdownEl = document.getElementById('quiz-breakdown');
  var shareBtn = document.getElementById('quiz-share-btn');
  var questionPanel = document.getElementById('quiz-question-panel');

  // Show the app
  app.style.display = '';
  totalEl.textContent = questions.length;

  // === Aggregate stats (from Worker) =======================
  // Fetch current-quiz aggregates. If Worker is unreachable (not deployed,
  // offline, or returning non-OK), the aggregate UI stays hidden — no error.
  var aggregates = null;

  function renderAggregates() {
    if (!aggregates) return;
    var aggEl = document.getElementById('quiz-aggregate');
    var avgEl = document.getElementById('qa-avg');
    var countEl = document.getElementById('qa-count');
    if (!aggEl || !avgEl || !countEl) return;
    // Worker response shape: { completions, averageScore, perQuestion: [pct...] }
    var avg = typeof aggregates.averageScore === 'number' ? aggregates.averageScore : null;
    var count = typeof aggregates.completions === 'number' ? aggregates.completions : null;
    if (avg !== null && count !== null && count > 0) {
      avgEl.textContent = avg.toFixed(1) + '/' + questions.length;
      countEl.textContent = count.toLocaleString();
      aggEl.style.display = '';
    }
  }

  (function fetchAggregates() {
    var apiRoot = quizEl.getAttribute('data-api-url');
    if (!apiRoot || !quizData.id) return;
    fetch(apiRoot + '/api/quiz/results?w=' + encodeURIComponent(quizData.id))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        aggregates = data;
        // If results are already showing, update them now
        if (resultsPanel && resultsPanel.style.display !== 'none') {
          renderAggregates();
        }
      })
      .catch(function () { /* silent */ });
  })();

  // === Completion memory (localStorage) ====================
  var storageKey = 'wtfjht_quiz_' + (quizData.id || 'unknown');
  var returningBanner = document.getElementById('quiz-returning');
  var returningRetakeBtn = document.getElementById('quiz-returning-retake');

  function loadPreviousResult() {
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function savePreviousResult(score, total) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        score: score,
        total: total,
        completedAt: Date.now(),
      }));
    } catch (e) { /* storage full or disabled — non-fatal */ }
  }

  function showReturningBanner(prev) {
    if (!returningBanner || !prev) return;
    var scoreSpan = document.getElementById('qr-score');
    var totalSpan = document.getElementById('qr-total');
    if (scoreSpan) scoreSpan.textContent = prev.score;
    if (totalSpan) totalSpan.textContent = prev.total;
    returningBanner.style.display = '';
  }

  function hideReturningBanner() {
    if (returningBanner) returningBanner.style.display = 'none';
  }

  var previousResult = loadPreviousResult();
  if (previousResult) showReturningBanner(previousResult);

  function restartQuiz() {
    state.current = 0;
    state.answers = [];
    state.score = 0;
    state.locked = false;
    resultsPanel.style.display = 'none';
    questionPanel.style.display = '';
    document.querySelector('.quiz-progress-bar').style.display = '';
    document.querySelector('.quiz-counter').style.display = '';
    var prev = loadPreviousResult();
    if (prev) showReturningBanner(prev);
    renderQuestion(0);
    questionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (returningRetakeBtn) {
    returningRetakeBtn.addEventListener('click', restartQuiz);
  }

  // Track start
  if (typeof gtag === 'function') gtag('event', 'quiz_start', { week: quizData.id || '' });

  function renderQuestion(index) {
    var q = questions[index];
    state.locked = false;

    currentEl.textContent = index + 1;
    var diffEl = document.getElementById('quiz-difficulty');
    if (diffEl && q.difficulty) {
      diffEl.textContent = q.difficulty;
      diffEl.className = 'quiz-difficulty quiz-difficulty-' + q.difficulty;
    }
    progressFill.style.width = ((index + 1) / questions.length * 100) + '%';
    questionText.textContent = q.question;

    feedbackPanel.style.display = 'none';
    questionPanel.style.display = '';
    var hintEl = document.getElementById('quiz-keyboard-hint');
    if (hintEl) hintEl.style.display = '';

    optionBtns.forEach(function (btn, i) {
      if (i >= (q.options || []).length) {
        btn.style.display = 'none';
        return;
      }
      btn.style.display = '';
      var textSpan = btn.querySelector('.quiz-option-text');
      textSpan.textContent = (q.options && q.options[i]) || '';
      var letterSpan = btn.querySelector('.quiz-option-letter');
      if (letterSpan) letterSpan.textContent = String.fromCharCode(65 + i);
      btn.className = 'quiz-option';
      btn.disabled = false;
      btn.setAttribute('aria-label', 'Option ' + String.fromCharCode(65 + i) + ': ' + (q.options[i] || ''));
    });
  }

  function handleOptionClick(e) {
    if (state.locked) return;
    var btn = e.currentTarget;
    var chosen = parseInt(btn.getAttribute('data-index'), 10);
    var q = questions[state.current];
    var correct = q.correct;

    state.locked = true;
    var hintEl = document.getElementById('quiz-keyboard-hint');
    if (hintEl) hintEl.style.display = 'none';
    var isCorrect = chosen === correct;

    if (isCorrect) state.score++;
    state.answers.push({ question: state.current, chosen: chosen, correct: correct, isCorrect: isCorrect });

    // Highlight
    optionBtns.forEach(function (b, i) {
      b.classList.add('locked');
      if (i === correct) b.classList.add('correct');
      if (i === chosen && !isCorrect) b.classList.add('wrong');
    });

    // Color-independent indicators
    optionBtns.forEach(function (b, i) {
      var letterSpan = b.querySelector('.quiz-option-letter');
      if (i === correct) letterSpan.textContent = '\u2713';
      if (i === chosen && !isCorrect) letterSpan.textContent = '\u2717';
    });

    // Feedback
    feedbackResult.textContent = isCorrect ? 'Correct' : 'Incorrect';
    feedbackResult.className = 'quiz-feedback-result ' + (isCorrect ? 'correct' : 'wrong');
    feedbackPanel.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');

    var revealEl = document.getElementById('quiz-feedback-reveal');
    if (revealEl) {
      if (isCorrect) {
        revealEl.style.display = 'none';
        revealEl.textContent = '';
      } else {
        revealEl.style.display = '';
        revealEl.textContent = 'The answer is ' + String.fromCharCode(65 + correct) + ': ' + q.options[correct] + '.';
      }
    }

    feedbackExplanation.textContent = q.explanation || '';

    // Build source link + per-question stat (safe DOM, no innerHTML).
    // Priority for source: explicit source_url > looked-up day URL > plain text.
    // Per-question stat from aggregates.per_question[idx].correct_pct — shows
    // inline after source with a middle-dot separator. Hidden if Worker data
    // is unavailable.
    feedbackSource.textContent = '';
    var sourceHasContent = false;

    if (q.source_day) {
      var sourceLabel = 'Covered in Day ' + q.source_day;
      var preferredUrl = q.source_url || dayUrls[q.source_day];
      if (preferredUrl) {
        var link = document.createElement('a');
        link.href = preferredUrl;
        if (q.source_url) {
          // External-provided URL — open in new tab for safety
          link.target = '_blank';
          link.rel = 'noopener';
        }
        link.textContent = sourceLabel;
        feedbackSource.appendChild(link);
      } else {
        feedbackSource.appendChild(document.createTextNode(sourceLabel));
      }
      sourceHasContent = true;
    }

    if (aggregates && Array.isArray(aggregates.perQuestion)) {
      // Worker returns perQuestion as array of percentages (0–100).
      var pct = aggregates.perQuestion[state.current];
      if (typeof pct === 'number' && isFinite(pct)) {
        if (sourceHasContent) {
          feedbackSource.appendChild(document.createTextNode(' \u00b7 '));
        }
        feedbackSource.appendChild(
          document.createTextNode(Math.round(pct) + '% got this right')
        );
      }
    }

    var isLast = state.current >= questions.length - 1;
    nextBtn.textContent = isLast ? 'See results' : 'Next question \u2192';

    feedbackPanel.style.display = '';
    feedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    nextBtn.focus({ preventScroll: true });

    if (typeof gtag === 'function') {
      gtag('event', 'quiz_answer', {
        question: state.current + 1,
        correct: isCorrect,
        week: quizData.id || '',
      });
    }
  }

  function showResults() {
    questionPanel.style.display = 'none';
    feedbackPanel.style.display = 'none';
    progressFill.style.width = '100%';
    document.querySelector('.quiz-progress-bar').style.display = 'none';
    document.querySelector('.quiz-counter').style.display = 'none';
    hideReturningBanner();

    savePreviousResult(state.score, questions.length);

    scoreEl.textContent = state.score;
    var pct = questions.length > 0 ? state.score / questions.length : 0;
    var scoreClass = pct >= 0.8 ? 'score-great'
      : pct >= 0.5 ? 'score-good'
      : 'score-low';
    scoreEl.className = 'quiz-score-number ' + scoreClass;

    // Map percentage to verdict key (works for any quiz length)
    var verdictKey = pct >= 1    ? 5
                   : pct >= 0.75 ? 4
                   : pct >= 0.5  ? 3
                   : pct >= 0.3  ? 2
                   : pct > 0     ? 1
                   : 0;
    verdictEl.textContent = VERDICTS[verdictKey] || '';

    // Screen reader announcement
    var announce = document.getElementById('quiz-result-announce');
    if (announce) announce.textContent = 'You scored ' + state.score + ' out of ' + questions.length + '. ' + (VERDICTS[verdictKey] || '');

    // Breakdown — safe DOM construction (no innerHTML, prevents XSS via question text)
    breakdownEl.textContent = '';
    state.answers.forEach(function (a, i) {
      var row = document.createElement('div');
      row.className = 'quiz-breakdown-item';
      var iconSpan = document.createElement('span');
      iconSpan.className = 'quiz-breakdown-icon ' + (a.isCorrect ? 'correct' : 'wrong');
      iconSpan.textContent = a.isCorrect ? '\u2713' : '\u2717';
      var textSpan = document.createElement('span');
      textSpan.textContent = questions[i].question;
      row.appendChild(iconSpan);
      row.appendChild(textSpan);
      if (!a.isCorrect) {
        var detailSpan = document.createElement('span');
        detailSpan.className = 'quiz-breakdown-detail';
        detailSpan.textContent = 'You said ' + String.fromCharCode(65 + a.chosen) + '. Answer: ' + String.fromCharCode(65 + a.correct) + ': ' + (questions[i].options[a.correct] || '');
        row.appendChild(detailSpan);
      }
      breakdownEl.appendChild(row);
    });

    // Update score denominator (not hardcoded)
    var totalSpan = document.querySelector('.quiz-score-total');
    if (totalSpan) totalSpan.textContent = '/ ' + questions.length;

    resultsPanel.style.display = '';
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderAggregates();

    // Fire-and-forget result submission
    var apiUrl = quizEl.getAttribute('data-api-url');
    if (apiUrl) {
      var selectedAnswers = state.answers.map(function (a) { return a.chosen; });
      var duration = Math.round((Date.now() - startTime) / 1000);
      fetch(apiUrl + '/api/quiz/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          w: quizData.id || '',
          s: subscriberId,
          answers: selectedAnswers,
          duration: duration,
          src: source,
        }),
      }).catch(function (err) { console.error('Quiz result POST failed:', err); });
    }

    if (typeof gtag === 'function') {
      gtag('event', 'quiz_complete', {
        score: state.score,
        total: questions.length,
        verdict: VERDICTS[verdictKey] || '',
        week: quizData.id || '',
      });
    }
  }

  function confirmShareButton() {
    var original = shareBtn.textContent;
    shareBtn.textContent = 'Copied to clipboard';
    shareBtn.disabled = true;
    setTimeout(function () {
      shareBtn.textContent = original;
      shareBtn.disabled = false;
    }, 1600);
  }

  function shareAsText() {
    var text = 'I scored ' + state.score + '/' + questions.length +
      ' on the WTF Just Happened Today? Weekly News Quiz.\n' +
      'https://whatthefuckjusthappenedtoday.com/quiz';
    if (navigator.share) {
      navigator.share({ text: text }).catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(confirmShareButton).catch(function () {
        prompt('Copy your result:', text);
      });
    } else {
      prompt('Copy your result:', text);
    }
  }

  function handleShare() {
    shareAsText();

    if (typeof gtag === 'function') {
      gtag('event', 'quiz_share', { score: state.score, week: quizData.id || '' });
    }
  }

  // Bind events
  optionBtns.forEach(function (btn) {
    btn.addEventListener('click', handleOptionClick);
  });

  nextBtn.addEventListener('click', function () {
    if (state.current >= questions.length - 1) {
      showResults();
    } else {
      // Scroll the question panel back to the top of the viewport before advancing
      questionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      questionPanel.classList.add('fading');
      setTimeout(function() {
        state.current++;
        renderQuestion(state.current);
        questionPanel.classList.remove('fading');
        questionText.focus({ preventScroll: true });
      }, 200);
    }
  });

  shareBtn.addEventListener('click', handleShare);

  // Keyboard nav: 1-4 to select options
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (resultsPanel.style.display !== 'none') return;

    var key = parseInt(e.key, 10);
    if (key >= 1 && key <= 4 && !state.locked) {
      optionBtns[key - 1].click();
    }
    if ((e.key === 'Enter' || e.key === ' ') && state.locked && feedbackPanel.style.display !== 'none') {
      e.preventDefault();
      nextBtn.click();
    }
    if (e.key === 'Escape' && state.locked && feedbackPanel.style.display !== 'none') {
      nextBtn.click();
    }
  });

  document.getElementById('quiz-retake-btn').addEventListener('click', restartQuiz);

  // Start
  var startTime = Date.now();
  renderQuestion(0);
})();
