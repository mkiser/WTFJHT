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
  const permalink = url => url.replace(/\/$/, '');
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

  let start = utc('2017-01-20');
  const now = new Date();
  let stop = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  for (const [date, url, title, declaredMood] of read('posts')) {
    const entries = postsByDate.get(date) || [];
    const mood = byUrl.get(permalink(url));
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
  const sunday = start - new Date(start).getUTCDay() * day;

  function linkFor(post, key, formattedDate, onlyPost) {
    // An unlinked send must agree with the sole post's explicit mood on that date.
    const candidates = withoutUrl.get(key);
    const mood = post.mood?.date === key ? post.mood :
      onlyPost && candidates?.length === 1 && candidates[0].sequence === post.declaredMood ? candidates[0] : null;
    const link = el('a', 'calendar-day');
    link.href = baseurl + post.url;
    const label = [post.title, formattedDate];
    if (mood) {
      const glyph = el('span', 'mood-glyph', mood.glyph);
      glyph.setAttribute('aria-hidden', 'true');
      link.classList.add('has-post');
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
      if (!label.textContent && (time === start || key.endsWith('-01'))) {
        label.textContent = month.format(time);
      }
      if (!entries) {
        week.append(el('span', 'calendar-day'));
        continue;
      }
      const formattedDate = fullDate.format(time);
      if (entries.length === 1) {
        week.append(linkFor(entries[0], key, formattedDate, true));
      } else {
        const cell = el('div', 'calendar-day mood-editions');
        for (const post of entries) cell.append(linkFor(post, key, formattedDate, false));
        week.append(cell);
      }
    }
    fragment.append(week);
  }
  grid.append(fragment);

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
      tooltip.replaceChildren(el('strong', '', formattedDate), el('span', 'tooltip-title', title));
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

  function linkFrom(target) {
    const link = target?.closest?.('a.calendar-day');
    return details.has(link) ? link : null;
  }

  grid.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const link = linkFrom(event.target);
    if (!link || link === hovered) return;
    hovered = link;
    dismissed = null;
    updateTooltip();
  });
  grid.addEventListener('pointerout', event => {
    if (event.pointerType === 'touch' || !hovered || hovered === linkFrom(event.relatedTarget)) return;
    hovered = null;
    updateTooltip();
  });
  grid.addEventListener('focusin', event => {
    const link = linkFrom(event.target);
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
  window.addEventListener('scroll', updateTooltip, {passive: true});
  window.addEventListener('resize', updateTooltip);
})();
