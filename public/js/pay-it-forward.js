/* Pay it forward — the chooser. Depends on window.PIF (pay-it-forward-core.js) and the JSON in
   #pif-config (_data/pay_it_forward.yml). Tapping an amount chip updates the sentence and the pay
   link. Without this script the page still shows the sentence at the floor amount and a working
   checkout link. */
(function () {
  'use strict';
  var PIF = window.PIF;
  var root = document.getElementById('pif');
  var cfgEl = document.getElementById('pif-config');
  if (!PIF || !root || !cfgEl) return;
  var cfg;
  try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
  var copy = cfg.copy || {};
  var COST_YEAR = cfg.cost_per_reader_year_cents;
  if (!COST_YEAR || !cfg.checkout_origin || !cfg.plan_id) return;

  var chipsEl = document.getElementById('pif-chips');
  var chips = Array.prototype.slice.call(chipsEl.querySelectorAll('button.pif-chip'));
  var amountEl = document.getElementById('pif-static');
  var readersEl = document.getElementById('pif-readers');
  var go = document.getElementById('pif-go');
  var goAmt = document.getElementById('pif-go-amt');
  var live = document.getElementById('pif-live');

  function withCommas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  // "5.89", "25", "200": the amount as the sentence shows it, no currency sign.
  function amountText(cents) {
    var whole = Math.floor(cents / 100), rest = cents % 100;
    return withCommas(whole) + (rest ? '.' + (rest < 10 ? '0' : '') + rest : '');
  }

  var liveTimer = 0;
  function choose(chip, announce) {
    var cents = +chip.getAttribute('data-cents');
    if (!cents) return;
    var dollars = '$' + amountText(cents);
    var readersText = withCommas(PIF.readersMonth(cents, COST_YEAR));
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
    amountEl.textContent = amountText(cents);
    readersEl.textContent = readersText;
    goAmt.textContent = ' ' + dollars;
    go.setAttribute('href', PIF.checkoutHref(cfg.checkout_origin, cfg.plan_id, cents));
    clearTimeout(liveTimer);
    if (announce) {
      liveTimer = setTimeout(function () {
        live.textContent = [copy.before, dollars, copy.middle, readersText, copy.people_word, copy.after]
          .filter(Boolean).join(' ');
      }, 600);
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { choose(chip, true); });
  });

})();
