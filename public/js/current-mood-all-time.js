(() => {
  const calendar = document.getElementById('current-mood-calendar');
  const grid = calendar.querySelector('.calendar-grid');
  const tooltip = calendar.querySelector('.calendar-tooltip');
  const read = name => JSON.parse(calendar.querySelector('[data-' + name + ']').textContent);
  const day = 86400000;
  const utc = date => Date.parse(date + 'T00:00:00Z');
  const keyFor = time => new Date(time).toISOString().slice(0, 10);
  const month = new Intl.DateTimeFormat('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'});
  const fullDate = new Intl.DateTimeFormat('en-US', {dateStyle: 'full', timeZone: 'UTC'});
  // Case-insensitive: 38 early-2017 posts live at /Day-NNN/ while the mood data says /day-NNN/.
  const permalink = url => url.replace(/\/$/, '').toLowerCase();
  const byUrl = new Map();
  const withoutUrl = new Map();
  const postsByDate = new Map();

  for (const row of read('editions')) {
    const [date, , , sequence, glyph, url, , count] = row;
    if (!sequence || !glyph || !(count > 0)) continue;
    const mood = {date, sequence, glyph, count};
    if (url) {
      byUrl.set(permalink(url), mood);
    } else {
      const entries = withoutUrl.get(date) || [];
      entries.push(mood);
      withoutUrl.set(date, entries);
    }
  }

  // The archive is the verified sent copy and wins wherever it has a mood. Any other post
  // supplies its own currentMood front matter: new editions (PostLite writes it, Relay sends it)
  // and moods recovered from the campaign archive. Graphemes, not string length, give the count.
  const graphemes = new Intl.Segmenter('en', {granularity: 'grapheme'});
  // Emoji graphemes only, so a literal symbol in a sent mood (Day 848's ▲) is not counted.
  const emojiIn = text => Array.from(graphemes.segment(text), part => part.segment)
    .filter(mark => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(mark));
  function frontMatterMood(date, declared) {
    const sequence = typeof declared === 'string' ? declared.trim() : '';
    if (!sequence) return undefined;
    const marks = emojiIn(sequence);
    return marks.length ? {date, sequence, glyph: marks[0], count: marks.length} : undefined;
  }

  let start = utc('2017-01-20');
  const now = new Date();
  let stop = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  for (const [date, url, title, declaredMood] of read('posts')) {
    const entries = postsByDate.get(date) || [];
    const mood = byUrl.get(permalink(url)) || frontMatterMood(date, declaredMood);
    entries.push({url, title, declaredMood, mood});
    postsByDate.set(date, entries);
    start = Math.min(start, utc(date));
    stop = Math.max(stop, utc(date));
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  const details = new WeakMap();
  const baseurl = calendar.dataset.baseurl;
  const fragment = document.createDocumentFragment();
  const weeks = [];
  const sunday = start - new Date(start).getUTCDay() * day;

  const shownMoods = [];
  function linkFor(post, key, formattedDate, onlyPost) {
    // An unlinked send must agree with the sole post's explicit mood on that date.
    const candidates = withoutUrl.get(key);
    const mood = post.mood?.date === key ? post.mood :
      onlyPost && candidates?.length === 1 && candidates[0].sequence === post.declaredMood ? candidates[0] : null;
    const link = el('a', 'calendar-day');
    link.href = baseurl + post.url;
    const label = [post.title, formattedDate];
    if (mood) {
      shownMoods.push(mood);
      const glyph = el('span', 'mood-glyph', mood.glyph);
      glyph.setAttribute('aria-hidden', 'true');
      link.classList.add('mood-present');
      link.append(glyph);
      if (mood.count > 1) link.dataset.count = mood.count;
      label.push(mood.glyph.repeat(mood.count) === mood.sequence && mood.count > 1
        ? mood.glyph + ' repeated ' + mood.count + ' times' : mood.sequence);
    }
    link.setAttribute('aria-label', label.join(', '));
    details.set(link, {formattedDate, title: post.title, mood});
    return link;
  }

  for (let weekStart = sunday; weekStart <= stop; weekStart += 7 * day) {
    const week = el('div', 'calendar-week');
    const firstDate = Math.max(start, weekStart);
    // Big Grid gutter: a month label only on the week where a month starts (and the first week).
    const label = el('span', 'calendar-month-col');
    week.append(label);
    for (let column = 0; column < 7; column++) {
      const time = weekStart + column * day;
      const key = keyFor(time);
      const entries = postsByDate.get(key);
      if (time < start || time > stop) {
        week.append(el('span', 'calendar-day outside-range'));
        continue;
      }
      if (time === start || key.endsWith('-01')) {
        if (!label.textContent) label.textContent = month.format(time);
      }
      const formattedDate = fullDate.format(time);
      if (!entries) {
        const empty = el('span', 'calendar-day');
        details.set(empty, {formattedDate});
        week.append(empty);
        continue;
      }
      if (entries.length === 1) {
        week.append(linkFor(entries[0], key, formattedDate, true));
      } else {
        const cell = el('div', 'calendar-day mood-editions');
        for (const post of entries) cell.append(linkFor(post, key, formattedDate, false));
        week.append(cell);
      }
    }
    weeks.push({
      date: firstDate,
      // null = outside the range, '' = no mood, otherwise the day's first glyph.
      marks: Array.from(week.children).slice(1).map(tile => tile.matches('.outside-range') ? null :
        (tile.querySelector('.mood-glyph')?.textContent || ''))
    });
    fragment.append(week);
  }
  grid.append(fragment);

  // Header stats, counted from exactly what the grid shows.
  const stats = {
    moodPosts: shownMoods.length,
    emojiTotal: shownMoods.reduce((sum, mood) => sum + mood.count, 0)
  };
  for (const node of document.querySelectorAll('[data-mood-stat]')) {
    const value = stats[node.dataset.moodStat];
    if (Number.isFinite(value)) node.textContent = value.toLocaleString('en-US');
  }

  let hovered = null;
  let focused = null;
  let dismissed = null;
  let shown = null;

  function updateTooltip() {
    const anchor = hovered || focused;
    if (!anchor || anchor === dismissed) {
      tooltip.hidden = true;
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    if (rect.bottom <= 0 || rect.top >= height) {
      tooltip.hidden = true;
      return;
    }

    if (anchor !== shown) {
      const {formattedDate, title, mood} = details.get(anchor);
      tooltip.replaceChildren(el('strong', '', formattedDate));
      if (title) tooltip.append(el('span', 'tooltip-title', title));
      if (mood) {
        tooltip.append(el('span', 'mood-sequence', mood.sequence));
        if (mood.count > 1) {
          const outlier = mood.date === '2019-12-18' && mood.count === 181;
          tooltip.append(el('span', '', mood.count + ' emojis' + (outlier ? ' \u00b7 Repeat outlier' : '')));
        }
      }
      shown = anchor;
    }
    tooltip.hidden = false;
    const gap = 8;
    const left = rect.left + (rect.width - tooltip.offsetWidth) / 2;
    const below = rect.bottom + gap;
    const above = rect.top - gap - tooltip.offsetHeight;
    tooltip.style.left = Math.max(gap, Math.min(left, width - tooltip.offsetWidth - gap)) + 'px';
    tooltip.style.top = (below + tooltip.offsetHeight <= height - gap ? below : Math.max(gap, above)) + 'px';
  }

  function tileFrom(target) {
    const tile = target?.closest?.('.calendar-day');
    return details.has(tile) ? tile : null;
  }

  grid.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const link = tileFrom(event.target);
    if (!link || link === hovered) return;
    hovered = link;
    dismissed = null;
    updateTooltip();
  });
  grid.addEventListener('pointerout', event => {
    if (event.pointerType === 'touch' || !hovered || hovered === tileFrom(event.relatedTarget)) return;
    hovered = null;
    updateTooltip();
  });
  grid.addEventListener('focusin', event => {
    const link = tileFrom(event.target);
    if (!link?.matches(':focus-visible')) return;
    hovered = null;
    focused = link;
    dismissed = null;
    updateTooltip();
  });
  grid.addEventListener('focusout', () => {
    focused = null;
    updateTooltip();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !tooltip.hidden) {
      dismissed = shown;
      updateTooltip();
    }
  });
  const canvas = calendar.querySelector('#minimap-canvas');
  const years = calendar.querySelector('.minimap-years');
  const viewport = calendar.querySelector('.minimap-viewport');
  const ctx = canvas.getContext('2d');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let mapHeight = 0;
  let currentWeek = 0;

  function updateViewport() {
    if (!mapHeight) return;
    const bounds = grid.getBoundingClientRect();
    if (!bounds.height) return;
    const from = clamp(-bounds.top / bounds.height, 0, 1);
    const to = clamp((window.innerHeight - bounds.top) / bounds.height, 0, 1);
    viewport.hidden = to <= from;
    const height = Math.min(mapHeight, Math.max(15, (to - from) * mapHeight));
    viewport.style.height = height + 'px';
    viewport.style.top = Math.min(from * mapHeight, mapHeight - height) + 'px';

    currentWeek = bounds.top < 0 && bounds.bottom <= window.innerHeight ? weeks.length - 1 :
      clamp(Math.floor((1 - bounds.top) / bounds.height * weeks.length), 0, weeks.length - 1);
    canvas.setAttribute('aria-valuenow', currentWeek + 1);
    canvas.setAttribute('aria-valuetext', 'Week of ' + fullDate.format(weeks[currentWeek].date));
  }

  // The average color of an emoji as drawn by this browser, cached per glyph.
  const inks = new Map();
  function glyphInk(glyph, fallback) {
    if (!inks.has(glyph)) {
      const size = 24;
      const probe = document.createElement('canvas');
      probe.width = probe.height = size;
      const pen = probe.getContext('2d', {willReadFrequently: true});
      pen.textAlign = 'center';
      pen.textBaseline = 'middle';
      pen.font = '20px sans-serif';
      pen.fillText(glyph, size / 2, size / 2);
      const px = pen.getImageData(0, 0, size, size).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 128) continue;
        r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
      }
      inks.set(glyph, n ? `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})` : null);
    }
    return inks.get(glyph) || fallback;
  }

  function drawMinimap() {
    if (!ctx || !canvas.getClientRects().length) {
      mapHeight = 0;
      return;
    }
    const width = 50;
    mapHeight = Math.min(weeks.length * 2, Math.max(1, window.innerHeight - 120));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(mapHeight * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = mapHeight + 'px';
    ctx.scale(dpr, dpr);

    const rowHeight = mapHeight / weeks.length;
    // Like the Big Grid minimap, paint what the grid shows: a mood day in its emoji's color,
    // every other day in the grid's own blank fill (theme-aware).
    const blank = grid.querySelector('.calendar-day:not(.mood-present):not(.outside-range):not(.mood-editions)');
    const emptyInk = blank ? getComputedStyle(blank).backgroundColor : '';
    const fallbackInk = getComputedStyle(calendar).getPropertyValue('--c-meta').trim();
    const labels = document.createDocumentFragment();
    let lastYear;
    weeks.forEach(({date, marks}, index) => {
      const y = index * rowHeight;
      marks.forEach((glyph, dayIndex) => {
        if (glyph === null) return;
        ctx.fillStyle = glyph ? glyphInk(glyph, fallbackInk) : emptyInk;
        ctx.fillRect(6 + dayIndex * 5.5, y, 5, rowHeight * .75);
      });
      const year = new Date(date).getUTCFullYear();
      if (year !== lastYear) {
        const marker = el('span', '', String(year));
        marker.style.top = Math.round(y) + 'px';
        labels.append(marker);
        lastYear = year;
      }
    });
    years.replaceChildren(labels);
    years.style.height = mapHeight + 'px';
    updateViewport();
  }

  function jumpToWeek(index, behavior) {
    const week = grid.children[clamp(index, 0, weeks.length - 1)];
    const rect = week.getBoundingClientRect();
    window.scrollTo({top: window.scrollY + rect.top, behavior});
  }

  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    const index = Math.floor((event.clientY - rect.top) / rect.height * weeks.length);
    jumpToWeek(index, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth');
  });

  canvas.addEventListener('keydown', event => {
    const destinations = {
      ArrowUp: currentWeek - 1, ArrowLeft: currentWeek - 1,
      ArrowDown: currentWeek + 1, ArrowRight: currentWeek + 1,
      PageUp: currentWeek - 10, PageDown: currentWeek + 10,
      Home: 0, End: weeks.length - 1
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    jumpToWeek(destinations[event.key], 'instant');
    updateViewport();
  });

  canvas.setAttribute('aria-valuemax', weeks.length);
  drawMinimap();
  new MutationObserver(drawMinimap).observe(document.documentElement,
    {attributes: true, attributeFilter: ['data-theme']});

  let scrollFrame;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      updateTooltip();
      updateViewport();
    });
  }, {passive: true});
  window.addEventListener('resize', () => {
    drawMinimap();
    updateTooltip();
  });
})();
