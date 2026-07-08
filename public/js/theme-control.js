/* Footer appearance control — 3-state (auto/day/night).
   Highlight reflects PREFERENCE, not resolved theme. */
(function () {
  var KEY = (window.WTFTheme && window.WTFTheme.KEY) || 'wtfjht-theme';
  var btns = Array.prototype.slice.call(document.querySelectorAll('.theme-control__btn'));
  if (!btns.length) return;
  function pref() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) { return 'auto'; }
    return (v === 'day' || v === 'night') ? v : 'auto';
  }
  function paint() {
    var p = pref();
    btns.forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-theme-pref') === p));
    });
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-theme-pref');
      try {
        if (v === 'auto') { localStorage.removeItem(KEY); }
        else { localStorage.setItem(KEY, v); }
      } catch (e) {}
      if (window.WTFTheme) { window.WTFTheme.apply(window.WTFTheme.stored()); }
      paint();
    });
  });
  // radio keyboard contract (ARIA APG): arrows move + select within the group
  btns.forEach(function (b, i) {
    b.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 :
              (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var next = btns[(i + d + btns.length) % btns.length];
      next.focus();
      next.click();
    });
  });
  window.addEventListener('storage', paint);
  paint();
})();
