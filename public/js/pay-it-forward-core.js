/* Pay it forward — pure helpers (no DOM). All amounts are integer cents.
   Node: module.exports. Browser: window.PIF. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.PIF = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isCents(n) {
    return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n >= 0;
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // Checkout param: always decimal dollars with two places — "5.89", "7.00", "20.00".
  function priceParam(cents) {
    if (!isCents(cents)) return '';
    return Math.floor(cents / 100) + '.' + pad2(cents % 100);
  }

  // People covered for a month: cents * 12 / yearly cost, rounded to nearest ($5.89 → 34).
  function readersMonth(cents, costYearCents) {
    if (!isCents(cents) || !isCents(costYearCents) || costYearCents === 0) return 0;
    return Math.round((cents * 12) / costYearCents);
  }

  function checkoutHref(origin, planId, cents) {
    return origin + '/checkout?plan=' + encodeURIComponent(planId) + '&price=' + priceParam(cents);
  }

  return {
    priceParam: priceParam,
    readersMonth: readersMonth,
    checkoutHref: checkoutHref
  };
});
