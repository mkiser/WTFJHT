(() => {
  const root = document.getElementById('current-mood-calendar');
  if (!root) return;
  const get = (name) => root.querySelector('[data-' + name + ']');
  const records = JSON.parse(get('editions')?.textContent || '[]');
  if (!records.length) {
    for (const control of root.querySelectorAll('button, select, input')) control.disabled = true;
    for (const link of root.querySelectorAll('[data-link], [data-outlier-link]')) {
      link.hidden = true;
      link.removeAttribute('href');
    }
    get('outlier-note').closest('.cm-outlier').hidden = true;
    get('calendar-panel').hidden = true;
    if (get('all-time-panel')) get('all-time-panel').hidden = true;
    get('years-panel').hidden = true;
    get('rank-panel').hidden = false;
    get('rank-title').textContent = 'Most editions';
    get('rank-summary').textContent = '0 editions';
    get('rank-definition').textContent = '';
    const message = document.createElement('li');
    message.className = 'cm-caption cm-muted';
    message.textContent = 'No results for these filters.';
    get('ranks').replaceChildren(message);
    get('more').hidden = true;
    return;
  }
  const index = new Map(records.map((record) => [record[0], record]));
  const first = records[0][0];
  const last = records.at(-1)[0];
  const yearInput = get('year');
  const monthInput = get('month');
  const calendar = get('months');
  const emojiInput = get('emoji');
  const sizeInput = get('size');
  const modeInput = get('ranking');
  const periodInput = get('rank-period');
  const bylineInput = get('byline');
  const outlierInput = get('exclude-outlier');
  const moreButton = get('more');
  const monthNames = new Intl.DateTimeFormat('en-US', {month: 'long', timeZone: 'UTC'});
  const dates = new Intl.DateTimeFormat('en-US', {dateStyle: 'full', timeZone: 'UTC'});
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const coverage = {
    found: 'mood', mixed_payload: 'mood', no_marker: 'none',
    marker_without_emoji: 'none', no_mood_source: 'unknown',
    needs_review: 'unknown', site_only: 'unknown'
  };
  const messages = {
    no_marker: 'No current mood signoff in the sent newsletter.',
    marker_without_emoji: 'The sent signoff has no emoji.',
    no_mood_source: 'No verified sent copy.',
    site_only: 'No verified sent copy.',
    needs_review: 'Mood needs verification.'
  };
  const nameDate = (key) => dates.format(new Date(key + 'T00:00:00Z'));
  const make = (tag, className = '', content = '') => {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = content;
    return el;
  };

  const modes = {
    uses: ['Most used', 'uses', 'Every appearance counts, including repeats within one edition.'],
    reach: ['Most editions', 'editions', 'Each edition counts once per emoji, however often it appears.'],
    rare: ['Rare finds', 'uses', 'Fewest appearances among emojis that showed up at least once.'],
    solo: ['Solo acts', 'editions', 'Times an emoji was the only emoji in a mood.'],
    first: ['Opening acts', 'openings', 'Times an emoji appeared first in the sequence.'],
    last: ['Last word', 'closings', 'Times an emoji appeared last in the sequence.'],
    repeat: ['Repeat records', 'repeats', 'The most times the same emoji appeared in one edition.'],
    streak: ['Longest streaks', 'editions', 'Consecutive archived editions containing the emoji. A different, missing, or filtered mood breaks the streak.'],
    duos: ['Power pairs', 'editions', 'Two distinct emojis in the same edition. Order and repeats don’t affect the count.'],
    signature: ['Signature sequences', 'editions', 'The same sequence of emojis, in the same order, including repeats.'],
    largest: ['Biggest moods', 'emojis', 'Editions with the most emoji occurrences in one mood.'],
    varied: ['Most variety', 'distinct emojis', 'Editions with the most different emojis in one mood.']
  };
  const normalize = (token) => token.replaceAll('\uFE0F', '');
  const emojis = new Map();
  const sequences = new Map();
  const integer = new Intl.NumberFormat('en-US');
  const percent = new Intl.NumberFormat('en-US', {style: 'percent', maximumFractionDigits: 1});
  const quantity = (value, plural) => integer.format(value) + ' ' + (value === 1 ? plural.slice(0, -1) : plural);
  const orderText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const batchSize = 12;
  for (const record of records) {
    const sequence = record[8].map((token) => {
      const key = normalize(token);
      const info = emojis.get(key) || {glyph: token, uses: 0};
      if (token.includes('\uFE0F')) info.glyph = token;
      info.uses++;
      emojis.set(key, info);
      return key;
    });
    sequences.set(record[0], sequence);
  }
  const glyph = (key) => emojis.get(key).glyph;
  const preview = (tokens) => tokens.slice(0, 3).map(glyph).join(' ') +
    (tokens.length > 3 ? ' +' + (tokens.length - 3) : '');
  const outlierDate = '2019-12-18';
  const outlier = index.get(outlierDate);
  const outlierToken = sequences.get(outlierDate)?.[0];
  const outlierUses = outlier?.[7] || 0;
  const outlierTotal = emojis.get(outlierToken)?.uses || 0;
  const bylines = {matt: 'Signed Matt', guest: 'Guest signoff', shared: 'Shared signoff', unknown: 'Unverified signoff'};
  const localPath = (path) => typeof path === 'string' &&
    /^\/[A-Za-z0-9/_.-]*$/.test(path) && path[1] !== '/' &&
    !path.split('/').some((part) => part === '.' || part === '..');
  const baseurl = root.dataset.baseurl || '';
  const base = baseurl === '' ? '' : localPath(baseurl) ? baseurl.replace(/\/$/, '') : null;
  const archiveUrl = (edition) => base !== null && localPath(edition?.[5]) ? base + edition[5] : null;
  const setEditionLink = (link, edition) => {
    const url = archiveUrl(edition);
    link.hidden = !url;
    if (url) link.setAttribute('href', url);
    else link.removeAttribute('href');
  };
  if (outlier && outlierToken && outlierTotal) {
  get('outlier-note').textContent = 'December 18, 2019 · Day ' + outlier[1] + ' · House impeachment vote. ' +
    glyph(outlierToken) + ' appeared ' + outlierUses + ' times in this one sent edition (' +
    percent.format(outlierUses / outlierTotal) + ' of its ' + outlierTotal + ' all-time uses). ' +
    quantity(outlierTotal - outlierUses, 'uses') + ' without this edition.';
  }
  else {
    get('outlier-note').closest('.cm-outlier').hidden = true;
    outlierInput.disabled = true;
  }
  setEditionLink(get('outlier-link'), outlier);

  let year = last.slice(0, 4);
  let month = last.slice(5, 7);
  let selected = last;
  let view = 'rankings';
  let emojiFilter = '';
  let sizeFilter = 'any';
  let mode = 'reach';
  let period = 'all';
  let byline = 'all';
  let excludeOutlier = false;
  let expandedKey = null;
  let evidenceLimit = batchSize;
  let limit = batchSize;
  let gridDay = null;
  let rankingHighlight = null;
  const gridPanel = get('all-time-panel');
  const clearHighlight = get('clear-highlight');
  const allTime = gridPanel && typeof window.WTFJHTCurrentMoodAllTime === 'function'
    ? window.WTFJHTCurrentMoodAllTime({
        panel: gridPanel,
        records,
        get: (name) => gridPanel.querySelector('[data-' + name + ']'),
        nameDate,
        setEditionLink,
        outlierDate,
        outlierUses,
        outlierTotal,
        onSelect: openGridDay,
        onClose: closeGridDay
      })
    : null;
  const views = new Set(['calendar', 'rankings', 'years', ...(allTime ? ['all-time'] : [])]);
  if (!allTime) {
    const control = root.querySelector('button[data-view="all-time"]');
    if (control) control.hidden = true;
  }

  function validDay(key) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key) || key < first || key > last) return null;
    const date = new Date(key + 'T00:00:00Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === key ? key : null;
  }

  function saveLocation(push = false) {
    const url = new URL(window.location.href);
    if (view === 'all-time') {
      url.searchParams.set('view', 'all-time');
      if (gridDay) url.searchParams.set('date', gridDay);
      else url.searchParams.delete('date');
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('date');
    }
    const state = {
      ...window.history.state,
      currentMood: {
        view,
        highlight: rankingHighlight ? [...rankingHighlight] : null
      }
    };
    if (push) window.history.pushState(state, '', url);
    else window.history.replaceState(state, '', url);
  }

  function loadLocation() {
    const params = new URLSearchParams(window.location.search);
    const saved = window.history.state?.currentMood;
    const requested = params.get('view');
    const defaultView = views.has(saved?.view) && saved.view !== 'all-time' ? saved.view : 'rankings';
    view = requested === 'all-time' && allTime ? 'all-time' : defaultView;
    gridDay = view === 'all-time' ? validDay(params.get('date')) : null;
    rankingHighlight = view === 'all-time' && Array.isArray(saved?.highlight)
      ? new Set(saved.highlight.filter((key) => index.has(key))) : null;
    render(Boolean(gridDay));
  }

  function changeView(next) {
    if (!views.has(next) || view === next) return;
    const push = view === 'all-time' || next === 'all-time';
    view = next;
    gridDay = null;
    rankingHighlight = null;
    saveLocation(push);
    render();
  }

  function openGridDay(key, {scroll = false} = {}) {
    const date = validDay(key);
    if (!allTime || !date) return;
    const push = view !== 'all-time';
    view = 'all-time';
    gridDay = date;
    saveLocation(push);
    render(scroll || push);
  }

  function closeGridDay() {
    if (view !== 'all-time' || !gridDay) return;
    gridDay = null;
    saveLocation();
    render();
  }

  function openRankedDay(row, key) {
    if (!allTime) { openExample(key); return; }
    rankingHighlight = new Set(row.evidence.keys());
    openGridDay(key, {scroll: true});
  }

  function highlightedDates() {
    if (!rankingHighlight && !emojiFilter && sizeFilter === 'any' && byline === 'all' && !excludeOutlier) return null;
    return new Set(records.filter((record) => matches(record) &&
      (!rankingHighlight || rankingHighlight.has(record[0]))).map((record) => record[0]));
  }

  function matches(record) {
    const count = record[7];
    if (excludeOutlier && record[0] === outlierDate) return false;
    if (byline !== 'all' && (record[9] !== byline || !count)) return false;
    if (emojiFilter && !sequences.get(record[0]).includes(emojiFilter)) return false;
    switch (sizeFilter) {
      case 'solo': return count === 1;
      case 'multi': return count >= 2;
      case 'five': return count >= 5;
      default: return true;
    }
  }

  function rankRows() {
    const scores = new Map();
    const current = (key) => key.startsWith(year) && (month === 'all' || key.slice(5, 7) === month);
    const scoped = records.filter(([key]) =>
      period === 'all' || (period === 'calendar' ? current(key) : key.startsWith(period))
    );
    let editions = 0;
    let uses = 0;

    function score(key, label, sample) {
      if (!scores.has(key)) scores.set(key, {key, label, sample, value: 0, evidence: new Map()});
      return scores.get(key);
    }
    function add(key, label, sample) {
      const row = score(key, label, sample);
      row.value++;
      row.sample = sample;
      row.evidence.set(sample, (row.evidence.get(sample) || 0) + 1);
    }
    function markMax(key, label, sample, value) {
      const row = score(key, label, sample);
      if (value >= row.value) {
        if (value > row.value) row.evidence.clear();
        row.value = value;
        row.sample = sample;
        row.evidence.set(sample, value);
      }
    }

    scoped.forEach((record, position) => {
      const date = record[0];
      const sequence = sequences.get(date);
      if (!sequence.length || !matches(record)) return;
      editions++;
      uses += sequence.length;
      const unique = [...new Set(sequence)];
      switch (mode) {
        case 'uses':
        case 'rare':
          for (const key of sequence) add(key, glyph(key), date);
          break;
        case 'reach':
          for (const key of unique) add(key, glyph(key), date);
          break;
        case 'solo':
          if (sequence.length === 1) add(sequence[0], glyph(sequence[0]), date);
          break;
        case 'first':
          add(sequence[0], glyph(sequence[0]), date);
          break;
        case 'last':
          add(sequence.at(-1), glyph(sequence.at(-1)), date);
          break;
        case 'repeat': {
          const counts = new Map();
          for (const key of sequence) counts.set(key, (counts.get(key) || 0) + 1);
          for (const [key, count] of counts) {
            if (count > 1) markMax(key, glyph(key), date, count);
          }
          break;
        }
        case 'streak':
          for (const key of unique) {
            const row = score(key, glyph(key), date);
            if (row.lastPosition === position - 1) row.run++;
            else {row.run = 1; row.runStart = date;}
            row.lastPosition = position;
            if (row.run >= row.value) {
              if (row.run > row.value) row.evidence.clear();
              row.value = row.run;
              row.sample = date;
              row.start = row.runStart;
              for (let i = position - row.run + 1; i <= position; i++) {
                row.evidence.set(scoped[i][0], 1);
              }
            }
          }
          break;
        case 'duos': {
          unique.sort(orderText);
          for (let a = 0; a < unique.length; a++) {
            for (let b = a + 1; b < unique.length; b++) {
              const pair = [unique[a], unique[b]];
              add(pair.join('\0'), pair.map(glyph).join(' '), date);
            }
          }
          break;
        }
        case 'signature':
          add(sequence.join('\0'), preview(sequence), date);
          break;
        case 'largest':
        case 'varied':
          markMax(date, preview(sequence), date, mode === 'largest' ? sequence.length : unique.length);
          break;
      }
    });
    const rows = [...scores.values()].sort((a, b) =>
      (mode === 'rare' ? a.value - b.value : b.value - a.value) || orderText(a.key, b.key)
    );
    return {rows, editions, uses};
  }

  function openExample(key) {
    const keepYear = period === 'calendar' && month === 'all' && key.startsWith(year);
    year = key.slice(0, 4);
    if (!keepYear) month = key.slice(5, 7);
    selected = key;
    view = 'calendar';
    render();
    calendar.querySelector('button[data-key="' + key + '"]')?.focus();
  }

  function renderEvidence(row, id) {
    const section = make('section', 'cm-ranking-editions');
    section.id = id;
    const title = make('h3', '', quantity(row.evidence.size, 'matching editions'));
    title.id = id + '-title';
    section.setAttribute('aria-labelledby', title.id);
    const entries = [...row.evidence].sort((a, b) => orderText(b[0], a[0]));
    const headingLink = make('button', 'cm-text-action', 'View matches in All Time');
    headingLink.type = 'button';
    headingLink.hidden = !allTime;
    headingLink.addEventListener('click', () => openRankedDay(row, entries[0][0]));
    const list = make('ul', 'cm-evidence-list');
    for (const [day, count] of entries.slice(0, evidenceLimit)) {
      const entry = index.get(day);
      const item = make('li');
      const button = make('button', 'cm-button', day);
      button.type = 'button';
      button.setAttribute('aria-label', 'Show ' + nameDate(day) + (allTime ? ' in All Time' : ' in calendar'));
      button.addEventListener('click', () => openRankedDay(row, day));
      let info = entry[1] === null ? 'Edition' : 'Day ' + entry[1];
      if (day === outlierDate) info += ' · Repeat outlier';
      else if (entry[9] !== 'unknown') info += ' · ' + bylines[entry[9]];
      if (mode === 'uses' || mode === 'rare' || mode === 'repeat') info += ' · ' + quantity(count, 'uses');
      item.append(button, make('span', 'cm-caption', info));
      list.append(item);
    }
    section.append(title, headingLink, list);
    if (evidenceLimit < entries.length) {
      const more = make('button', 'search-load-more', 'More editions (' + integer.format(entries.length - evidenceLimit) + ' remaining)');
      more.type = 'button';
      more.addEventListener('click', () => {
        const next = evidenceLimit;
        evidenceLimit += batchSize;
        renderRankings();
        get('ranks').querySelector('#' + id + ' li:nth-child(' + (next + 1) + ') button')?.focus();
      });
      const actions = make('div');
      actions.append(more);
      section.append(actions);
    }
    return section;
  }

  function renderRankings() {
    const {rows, editions, uses} = rankRows();
    const [title, units, definition] = modes[mode];
    const leaderboard = get('ranks');
    get('rank-title').textContent = title;
    get('rank-summary').textContent = quantity(editions, 'editions') + ' · ' + quantity(uses, 'emoji uses');
    get('rank-definition').textContent = definition;
    leaderboard.replaceChildren();
    if (!rows.length) {
      leaderboard.append(make('li', 'cm-caption cm-muted', 'No results for these filters.'));
      moreButton.hidden = true;
      return;
    }
    let rank = 1;
    const items = rows.slice(0, limit).map((row, i) => {
      if (i && row.value !== rows[i - 1].value) rank = i + 1;
      const item = make('li', 'cm-rank');
      const rankLabel = make('span', 'cm-tabular cm-caption', String(rank));
      const showsDate = mode === 'largest' || mode === 'varied';
      const label = make('button', 'cm-button cm-rank-label', showsDate ? row.sample : row.label);
      if (showsDate) label.classList.add('is-date');
      label.type = 'button';
      label.dataset.rankIndex = String(i);
      const detailId = 'cm-editions-for-rank-' + i;
      const expanded = expandedKey === row.key;
      label.setAttribute('aria-expanded', String(expanded));
      if (expanded) label.setAttribute('aria-controls', detailId);
      const sample = row.start && row.start !== row.sample
        ? nameDate(row.start) + ' through ' + nameDate(row.sample)
        : nameDate(row.sample);
      const valueLabel = quantity(row.value, units);
      label.title = showsDate ? row.label + ' · ' + valueLabel : valueLabel + ' · ' + sample;
      label.setAttribute('aria-label', row.label + ', ' + valueLabel + ', ' + quantity(row.evidence.size, 'matching editions'));
      label.addEventListener('click', () => {
        expandedKey = expanded ? null : row.key;
        evidenceLimit = batchSize;
        renderRankings();
        leaderboard.querySelector('[data-rank-index="' + i + '"]')?.focus({preventScroll: true});
      });
      const value = make('span', 'cm-tabular cm-rank-value', integer.format(row.value));
      item.append(rankLabel, label, value);
      if (expanded) item.append(renderEvidence(row, detailId));
      return item;
    });
    leaderboard.append(...items);
    moreButton.hidden = limit >= rows.length;
    moreButton.textContent = 'Show more (' + integer.format(Math.max(0, rows.length - limit)) + ' remaining)';
  }

  function openYearRanking(value, key) {
    view = 'rankings';
    saveLocation();
    period = value;
    mode = 'reach';
    expandedKey = key;
    evidenceLimit = batchSize;
    const index = rankRows().rows.findIndex((row) => row.key === key);
    limit = Math.max(batchSize, Math.ceil((index + 1) / batchSize) * batchSize);
    render();
    get('ranks').querySelector('[data-rank-index="' + index + '"]')?.focus();
  }

  function renderYears() {
    const counts = new Map();
    const previousAppearance = new Map();
    const years = [...yearInput.options].map((option) => option.value).reverse();
    for (const y of years) counts.set(y, {total: 0, reach: new Map()});
    for (const record of records) {
      if (!record[7] || !matches(record)) continue;
      const bucket = counts.get(record[0].slice(0, 4));
      bucket.total++;
      for (const key of new Set(sequences.get(record[0]))) {
        bucket.reach.set(key, (bucket.reach.get(key) || 0) + 1);
      }
    }
    const list = get('years');
    get('years-summary').textContent = quantity([...counts.values()].filter((item) => item.total).length, 'years') + ' with matches';
    list.replaceChildren();
    const rows = [];

    function stat(name, y, item, text) {
      const box = make('div', 'cm-year-stat');
      box.append(make('h3', '', name));
      if (!item) {
        box.append(make('span', 'cm-caption cm-muted', '—'));
        return box;
      }
      const button = make('button', 'cm-button', glyph(item.key));
      button.type = 'button';
      button.setAttribute('aria-label', 'Show ' + glyph(item.key) + ' editions in ' + y + ', ' + text);
      button.addEventListener('click', () => openYearRanking(y, item.key));
      box.append(button, make('span', 'cm-caption', text));
      return box;
    }

    for (const [y, {total, reach}] of counts) {
      const previous = counts.get(String(Number(y) - 1));
      const members = [...reach].map(([key, count]) => {
        const lastYear = previousAppearance.get(key);
        const gap = lastYear === undefined ? 0 : Number(y) - lastYear - 1;
        const coveredGap = gap > 0 && years.every((earlier) =>
          Number(earlier) <= lastYear || earlier >= y || counts.get(earlier).total
        );
        previousAppearance.set(key, Number(y));
        const delta = previous?.total ? count / total - (previous.reach.get(key) || 0) / previous.total : null;
        return {key, count, delta, gap: coveredGap ? gap : 0, lastYear};
      });
      const byReach = (a, b) => b.count - a.count || orderText(a.key, b.key);
      members.sort(byReach);
      const leader = members[0];
      const tied = leader ? members.filter((entry) => entry.count === leader.count).length - 1 : 0;
      const climber = members.filter((entry) => entry.count >= 5 && entry.delta >= .0005)
        .sort((a, b) => b.delta - a.delta || byReach(a, b))[0];
      const comeback = members.filter((entry) => entry.gap)
        .sort((a, b) => b.gap - a.gap || byReach(a, b))[0];
      const section = make('section', 'cm-year-row');
      section.dataset.yearRow = y;
      const title = make('h3', '', y);
      title.id = 'cm-year-' + y;
      section.setAttribute('aria-labelledby', title.id);
      const through = y === last.slice(0, 4) && !last.endsWith('-12-31')
        ? ' · Through ' + new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'}).format(new Date(last + 'T00:00:00Z')) : '';
      section.append(title, make('p', 'cm-caption cm-muted', quantity(total, 'editions') + through));
      const stats = make('div', 'cm-year-stats');
      stats.append(
        stat('Year leader', y, leader,
          leader ? percent.format(leader.count / total) + ' · ' + quantity(leader.count, 'editions') +
            (tied ? ' · Tied with ' + tied : '') : ''),
        stat('Biggest rise', y, climber,
          climber ? '+' + (climber.delta * 100).toFixed(1) + ' points · ' + quantity(climber.count, 'editions') : ''),
        stat('Longest comeback', y, comeback,
          comeback ? quantity(comeback.gap, 'years') + ' away · Last seen ' + comeback.lastYear : '')
      );
      section.append(stats);
      rows.unshift(section);
    }
    list.append(...rows);
  }

  function monthOptions(value) {
    const options = [];
    for (let i = 1; i <= 12; i++) {
      const m = String(i).padStart(2, '0');
      const key = value + '-' + m;
      if (key < first.slice(0, 7) || key > last.slice(0, 7)) continue;
      options.push(m);
    }
    return options;
  }

  function selectRecord(key) {
    selected = key;
    const record = index.get(key);
    const [, number, status, full, , , kind, count, , signoff] = record;
    const edition = number === null ? (kind === 'weekly' ? 'Weekly edition' : 'Edition') : 'Day ' + number;
    get('date').textContent = nameDate(key);
    const detail = [edition];
    if (count > 1) detail.push(quantity(count, 'emojis'));
    if (key === outlierDate) detail.push('Repeat outlier');
    if (count) detail.push(bylines[signoff]);
    get('edition').textContent = detail.join(' · ');
    const exact = get('month-full-signoff');
    const repeat = Boolean(exact && key === outlierDate && outlierToken && count);
    get('mood').textContent = repeat ? glyph(outlierToken) + ' × ' + count : full || messages[status] || 'Mood unknown.';
    if (exact) {
      exact.hidden = !repeat;
      exact.open = false;
      get('month-exact-mood').textContent = repeat ? full : '';
    }
    get('mood').classList.toggle('cm-muted', !full);
    const link = get('link');
    setEditionLink(link, record);
    for (const button of calendar.querySelectorAll('button[data-key]')) {
      button.setAttribute('aria-pressed', String(button.dataset.key === selected));
    }
  }

  function renderMonth(m) {
    const offset = Number(m) - 1;
    const section = make('section', 'cm-month');
    const heading = make('h2', '', monthNames.format(new Date(Date.UTC(Number(year), offset, 1))));
    heading.id = 'cm-heading-' + m;
    section.setAttribute('aria-labelledby', heading.id);
    const labels = make('div', 'cm-weekdays cm-caption cm-muted');
    labels.setAttribute('aria-hidden', 'true');
    labels.append(...weekdays.map((day) => make('span', '', day)));
    const days = make('div', 'cm-days');
    const start = new Date(Date.UTC(Number(year), offset, 1)).getUTCDay();
    const length = new Date(Date.UTC(Number(year), offset + 1, 0)).getUTCDate();
    for (let i = 0; i < start; i++) {
      const spacer = make('span');
      spacer.setAttribute('aria-hidden', 'true');
      days.append(spacer);
    }
    for (let i = 1; i <= length; i++) {
      const key = year + '-' + m + '-' + String(i).padStart(2, '0');
      const cell = make('div', 'cm-cell');
      const record = index.get(key);
      if (!record || !matches(record)) {
        if (key >= first && key <= last) {
          cell.dataset.coverage = record ? 'filtered' : 'empty';
          cell.append(make('span', 'cm-day-number', String(i)));
          cell.append(make('span', 'cm-sr-only', nameDate(key) + (record ? ', filtered out' : ', no edition')));
        } else {
          cell.setAttribute('aria-hidden', 'true');
        }
      } else {
        const [, number, status, full, glyph, , , count] = record;
        const state = coverage[status] || 'unknown';
        const button = make('button', 'cm-button cm-tile', glyph || (state === 'none' ? '\u2212' : '?'));
        button.dataset.key = key;
        button.dataset.coverage = state;
        button.type = 'button';
        const day = make('span', 'cm-day-number', String(i));
        day.setAttribute('aria-hidden', 'true');
        button.prepend(day);
        button.setAttribute('aria-pressed', String(key === selected));
        const label = [
          nameDate(key), number === null ? null : 'Day ' + number,
          count > 1 ? count + ' emojis' : null, key === outlierDate ? 'repeat outlier' : null,
          count > 12 ? null : full || messages[status]
        ].filter(Boolean).join(', ');
        button.setAttribute('aria-label', label);
        button.title = label;
        button.addEventListener('click', () => selectRecord(key));
        cell.append(button);
        if (count > 1) {
          const badge = make('span', 'cm-count cm-caption cm-tabular', String(count));
          badge.setAttribute('aria-hidden', 'true');
          if (key === outlierDate) badge.classList.add('cm-outlier-count');
          cell.append(badge);
        }
      }
      days.append(cell);
    }
    section.append(heading, labels, days);
    return section;
  }

  function renderCalendar() {
    const available = monthOptions(year);
    if (month !== 'all' && !available.includes(month)) month = available.at(-1);
    yearInput.value = year;
    monthInput.replaceChildren(new Option('Full year', 'all'));
    for (const m of available) {
      const label = monthNames.format(new Date(Date.UTC(Number(year), Number(m) - 1, 1)));
      monthInput.add(new Option(label, m));
    }
    monthInput.value = month;
    const months = month === 'all' ? available : [month];
    calendar.classList.toggle('cm-year', month === 'all');
    calendar.replaceChildren(...months.map(renderMonth));
    const inPeriod = records.filter(([key]) => key.startsWith(year) && months.includes(key.slice(5, 7)));
    const matching = inPeriod.filter(matches);
    const filtering = Boolean(emojiFilter || sizeFilter !== 'any' || byline !== 'all' || excludeOutlier);
    get('filter-legend').hidden = !filtering;
    const summary = get('filter-summary');
    summary.hidden = !filtering;
    summary.textContent = integer.format(matching.length) + ' of ' + quantity(inPeriod.length, 'editions') +
      (matching.length === 1 ? ' matches' : ' match');
    if (!matching.some(([key]) => key === selected)) {
      selected = matching.at(-1)?.[0];
    }
    if (selected) selectRecord(selected);
    else {
      get('date').textContent = monthInput.selectedOptions[0].text + ' ' + year;
      get('edition').textContent = '';
      const exact = get('month-full-signoff');
      if (exact) exact.hidden = true;
      get('mood').textContent = filtering ? 'No editions match these filters.' : 'No editions in this period.';
      setEditionLink(get('link'), null);
    }
  }

  function render(scrollGrid = false) {
    if (gridPanel) gridPanel.hidden = view !== 'all-time';
    if (view !== 'all-time') allTime?.hide();
    get('calendar-panel').hidden = view !== 'calendar';
    get('rank-panel').hidden = view !== 'rankings';
    get('years-panel').hidden = view !== 'years';
    for (const control of root.querySelectorAll('button[data-view]')) {
      control.setAttribute('aria-pressed', String(control.dataset.view === view));
    }
    emojiInput.value = emojiFilter;
    sizeInput.value = sizeFilter;
    bylineInput.value = byline;
    outlierInput.checked = excludeOutlier;
    modeInput.value = mode;
    periodInput.value = period;
    if (view === 'calendar') renderCalendar();
    else if (view === 'rankings') renderRankings();
    else if (view === 'years') renderYears();
    else if (allTime) {
      if (clearHighlight) clearHighlight.hidden = !rankingHighlight;
      allTime.render({date: gridDay, open: Boolean(gridDay), highlight: highlightedDates(), scroll: scrollGrid});
    }
  }

  emojiInput.add(new Option('Any emoji', ''));
  for (const [key, info] of [...emojis].sort((a, b) => b[1].uses - a[1].uses || orderText(a[0], b[0]))) {
    emojiInput.add(new Option(info.glyph, key));
  }
  for (const [key, [label]] of Object.entries(modes)) modeInput.add(new Option(label, key));
  periodInput.add(new Option('All time', 'all'));
  periodInput.add(new Option('Calendar selection', 'calendar'));
  for (let y = Number(last.slice(0, 4)); y >= Number(first.slice(0, 4)); y--) {
    yearInput.add(new Option(String(y), String(y)));
    periodInput.add(new Option(String(y), String(y)));
  }
  yearInput.addEventListener('change', () => {year = yearInput.value; render();});
  monthInput.addEventListener('change', () => {month = monthInput.value; render();});
  function refreshRanking() {
    limit = batchSize;
    expandedKey = null;
    render();
  }
  emojiInput.addEventListener('change', () => {emojiFilter = emojiInput.value; refreshRanking();});
  sizeInput.addEventListener('change', () => {sizeFilter = sizeInput.value; refreshRanking();});
  bylineInput.addEventListener('change', () => {byline = bylineInput.value; refreshRanking();});
  outlierInput.addEventListener('change', () => {excludeOutlier = outlierInput.checked; refreshRanking();});
  modeInput.addEventListener('change', () => {mode = modeInput.value; refreshRanking();});
  periodInput.addEventListener('change', () => {period = periodInput.value; refreshRanking();});
  moreButton.addEventListener('click', () => {
    const firstNew = limit;
    limit += batchSize;
    renderRankings();
    get('ranks').children[firstNew]?.querySelector('button')?.focus();
  });
  for (const control of root.querySelectorAll('button[data-view]')) {
    control.addEventListener('click', () => changeView(control.dataset.view));
  }
  clearHighlight?.addEventListener('click', () => {
    rankingHighlight = null;
    saveLocation();
    render();
    gridPanel.querySelector('[data-all-year]')?.focus({preventScroll: true});
  });
  window.addEventListener('popstate', loadLocation);
  loadLocation();
})();
