document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('form[action*="list-manage.com/subscribe"]').forEach(function(form) {
    form.addEventListener('submit', function(event) {
      // public/js/subscribe.js preventDefaults this submit and fires sign_up
      // itself once the worker confirms the address, so counting here too
      // would count the addresses the worker rejects. Anything that still
      // posts natively to Mailchimp is counted here, on intent.
      if (event.defaultPrevented || typeof gtag !== 'function') return;
      gtag('event', 'sign_up_attempt', {
        // Split into the STANDARD method param on purpose: a custom param
        // would need a dimension registered in the GA4 admin to be reportable.
        method: /^\/unsubscribe(\/|$)/.test(window.location.pathname) ? 'newsletter-resubscribe' : 'newsletter'
      });
    });
  });

  // Member CTA click
  var memberCta = document.querySelector('a.nav-cta[href*="membership"]');
  if (memberCta) {
    memberCta.addEventListener('click', function() {
      if (typeof gtag === 'function') gtag('event', 'member_cta_click');
    });
  }

  // Scroll depth tracking (25%, 50%, 75%, 100%)
  var scrollThresholds = [25, 50, 75, 100];
  var scrollFired = {};
  function checkScrollDepth() {
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var percent = Math.round((window.scrollY / docHeight) * 100);
    for (var i = 0; i < scrollThresholds.length; i++) {
      var t = scrollThresholds[i];
      if (percent >= t && !scrollFired[t]) {
        scrollFired[t] = true;
        if (typeof gtag === 'function') gtag('event', 'scroll_depth', { percent: t });
      }
    }
  }
  var scrollTimer;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(checkScrollDepth, 150);
  }, { passive: true });

  // On This Day link clicks
  var otdLinks = document.querySelectorAll('.historical-posts__item');
  for (var oi = 0; oi < otdLinks.length; oi++) {
    otdLinks[oi].addEventListener('click', function() {
      var yearsEl = this.querySelector('.historical-posts__years');
      var years = yearsEl ? parseInt(yearsEl.textContent) : 0;
      if (typeof gtag === 'function') gtag('event', 'on_this_day_click', { years_ago: years });
    });
  }

  // Read complete — fires once when bottom of post content is reached
  var postContent = document.querySelector('.post-content');
  if (postContent && window.IntersectionObserver) {
    var sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    postContent.appendChild(sentinel);
    var readObserver = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        if (typeof gtag === 'function') gtag('event', 'read_complete');
        readObserver.disconnect();
      }
    }, { threshold: 1.0 });
    readObserver.observe(sentinel);
  }

});

(function() {
  // Random post (footer easter egg); falls back to /archive/ if the JS failed to load
  var rnd = document.getElementById('random-post-link');
  if (rnd) rnd.addEventListener('click', function (e) {
    if (typeof randomPost === 'function') { e.preventDefault(); randomPost(); }
  });
})();

(function() {
  document.addEventListener('keydown', function(e) {
    // Ignore if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }

    if (document.body.classList.contains('carousel-open')) return;

    // Get nav links for homepage navigation
    var navLinks = document.querySelector('.nav-quick');
    var latestLink = navLinks ? navLinks.querySelector('a:first-of-type') : null;
    var prevLink = navLinks ? navLinks.querySelectorAll('a')[1] : null;

    if (e.key === 'j' || e.key === 'ArrowRight' || e.key === 'k' || e.key === 'ArrowLeft') {
      if (typeof gtag === 'function') gtag('event', 'keyboard_nav');
    }

    if (e.key === 'j' || e.key === 'ArrowRight') {
      // j/Right = go to newer post
      if (document.body.hasAttribute('data-nav-next')) {
        window.location.href = document.body.getAttribute('data-nav-next');
      } else if (document.body.hasAttribute('data-nav-home')) {
        if (latestLink) window.location.href = latestLink.href;
      }
    } else if (e.key === 'k' || e.key === 'ArrowLeft') {
      // k/Left = go to older post
      if (document.body.hasAttribute('data-nav-prev')) {
        window.location.href = document.body.getAttribute('data-nav-prev');
      } else if (document.body.hasAttribute('data-nav-home')) {
        if (prevLink) window.location.href = prevLink.href;
      }
    }
  });
})();
