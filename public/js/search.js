// Custom paragraph-level search for WTFJHT
// Uses Web Worker for non-blocking search

(function() {
  'use strict';

  // Configuration
  var RESULTS_PER_PAGE = 50;
  var DEBOUNCE_MS = 300;
  var MIN_QUERY_LENGTH = 2;
  var FRAGMENT_LEAD_WORDS = 12;
  var FRAGMENT_MAX_LENGTH = 300;
  var DB_NAME = 'wtfjht-search';
  var DB_VERSION = 1;
  var STORE_NAME = 'search-index';
  var INDEX_KEY = 'index-data';

  // State
  var worker = null;
  var isReady = false;
  var isLoading = false;
  var currentQuery = '';
  var currentResults = [];
  var displayedResults = 0;
  var searchRequestId = 0;
  var requestQuery = '';
  var searchFailed = false;

  // DOM elements
  var searchInput = document.querySelector('.js-algolia__input');
  var initialContent = document.querySelector('.js-algolia__initial-content');
  var searchContent = document.querySelector('.js-algolia__search-content');
  var resultsContainer = searchContent ? searchContent.querySelector('.algolia__results') : null;
  var banner = document.querySelector('.banner');

  if (!searchInput || !initialContent || !searchContent || !resultsContainer) {
    console.warn('Search: Required DOM elements not found');
    return;
  }

  // Initialize on first real user interaction
  var focusHandler = function(e) {
    // Only initialize on trusted user events, not programmatic focus
    if (e.isTrusted) {
      beginSearch();
    }
  };
  searchInput.addEventListener('focus', focusHandler);
  searchInput.addEventListener('input', function() {
    if ((searchInput.value || '').trim() !== requestQuery) {
      invalidateRequests();
    }
  });
  searchInput.addEventListener('input', debounce(onQueryChange, DEBOUNCE_MS));

  function beginSearch() {
    searchInput.removeEventListener('focus', focusHandler);
    initSearch();
  }

  document.addEventListener('keydown', function(e) {
    if (e.key !== '/' || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var target = e.target;
    if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
    if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
    e.preventDefault();
    try {
      beginSearch();
    } catch (err) {
      console.error('Search worker failed:', err);
    }
    searchInput.focus();
  });

  // Show/hide results
  function showResults() {
    initialContent.classList.add('algolia__initial-content--hidden');
    if (banner) banner.hidden = true;
    searchContent.classList.add('algolia__search-content--active');
  }

  function hideResults() {
    initialContent.classList.remove('algolia__initial-content--hidden');
    if (banner) banner.hidden = false;
    searchContent.classList.remove('algolia__search-content--active');
  }

  // Initialize Web Worker and load index
  function initSearch() {
    if (searchFailed) {
      showErrorIfQuery();
      return;
    }
    if (worker || isLoading) return;
    isLoading = true;

    // Create worker
    try {
      worker = new Worker('/public/js/search-worker.js');
    } catch (err) {
      failSearch(err);
      return;
    }

    worker.onmessage = function(e) {
      var msg = e.data;

      if (msg.type === 'ready') {
        isReady = true;
        isLoading = false;
        // If user already typed, search now
        if (currentQuery.length >= MIN_QUERY_LENGTH) {
          doSearch(currentQuery);
        }
      } else if (msg.type === 'results') {
        // Only use results if they match current request
        if (isCurrentRequest(msg.id)) {
          currentResults = msg.results;
          displayedResults = 0;
          renderResults(requestQuery, msg.id);
        }
      } else if (msg.type === 'error') {
        console.error('Search worker error:', msg.error);
        if (isCurrentRequest(msg.id)) {
          showSearchError();
        }
      }
    };

    worker.onerror = failSearch;

    // Load index and send to worker
    loadIndex()
      .then(function(data) {
        if (!searchFailed) {
          worker.postMessage({ type: 'init', data: data });
        }
      })
      .catch(failSearch);
  }

  function failSearch(err) {
    if (searchFailed) return;
    console.error('Search failed:', err);
    searchFailed = true;
    isReady = false;
    isLoading = false;
    if (worker) worker.terminate();
    worker = null;
    if (searchContent.classList.contains('algolia__search-content--active')) {
      onQueryChange({ target: searchInput });
    }
  }

  function showErrorIfQuery() {
    if ((searchInput.value || '').trim().length >= MIN_QUERY_LENGTH) {
      showSearchError();
    }
  }

  // Load index from cache or network (with version checking)
  function loadIndex() {
    return loadFromIndexedDB()
      .then(function(cached) {
        if (cached && cached.generated) {
          // Check if server has a newer version
          return checkVersion(cached.generated)
            .then(function(isStale) {
              if (isStale) {
                console.log('Search: Cache is stale, fetching fresh index');
                return fetchIndex();
              }
              console.log('Search: Loaded from IndexedDB cache (version current)');
              return cached;
            })
            .catch(function() {
              // If version check fails, use cached data
              console.log('Search: Version check failed, using cached data');
              return cached;
            });
        }
        return fetchIndex();
      });
  }

  // Check if cached version is stale
  function checkVersion(cachedGenerated) {
    if (searchFailed) return Promise.reject(new Error('Search failed'));
    return fetch('/search-version.json', { cache: 'no-store' })
      .then(function(response) {
        if (!response.ok) throw new Error('Version file not found');
        return response.json();
      })
      .then(function(data) {
        return data.generated !== cachedGenerated;
      });
  }

  // Fetch index from network (Cloudflare serves Brotli/gzip automatically)
  function fetchIndex() {
    if (searchFailed) return Promise.reject(new Error('Search failed'));
    return fetch('/search-index.json')
      .then(function(response) {
        if (!response.ok) throw new Error('Index not found');
        return response.json();
      })
      .then(function(data) {
        if (!searchFailed) saveToIndexedDB(data);
        return data;
      });
  }

  // IndexedDB operations
  function openDB() {
    return new Promise(function(resolve, reject) {
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = function() { reject(request.error); };
      request.onsuccess = function() { resolve(request.result); };
      request.onupgradeneeded = function(event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  function loadFromIndexedDB() {
    return openDB()
      .then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction(STORE_NAME, 'readonly');
          var store = tx.objectStore(STORE_NAME);
          var request = store.get(INDEX_KEY);
          request.onerror = function() { reject(request.error); };
          request.onsuccess = function() { resolve(request.result); };
        });
      })
      .catch(function() { return null; });
  }

  function saveToIndexedDB(data) {
    openDB()
      .then(function(db) {
        if (searchFailed) return;
        var tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(data, INDEX_KEY);
      })
      .catch(function(err) {
        console.warn('Search: Failed to cache index', err);
      });
  }

  // Handle query changes
  function onQueryChange(event) {
    currentQuery = (event.target.value || '').trim();

    if (currentQuery.length === 0) {
      invalidateRequests();
      hideResults();
      return;
    }

    if (currentQuery.length < MIN_QUERY_LENGTH) {
      invalidateRequests();
      showResults();
      resultsContainer.innerHTML = '<div class="search-hint">Type at least ' + MIN_QUERY_LENGTH + ' characters...</div>';
      return;
    }

    showResults();

    if (isReady) {
      doSearch(currentQuery);
    } else {
      resultsContainer.innerHTML = '<div class="search-loading">Loading search...</div>';
      initSearch();
    }
  }

  // Visible failure state — never strand readers on "Loading search..."
  function showSearchError() {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '<div class="search-hint">Search couldn\u2019t load. Refresh the page to try again.</div>';
  }

  // Send search to worker
  function doSearch(query) {
    if (typeof gtag === 'function') gtag('event', 'search_used');
    searchRequestId++;
    requestQuery = query;
    resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
    worker.postMessage({
      type: 'search',
      query: query,
      id: searchRequestId
    });
  }

  function invalidateRequests() {
    searchRequestId++;
    requestQuery = '';
  }

  function isCurrentRequest(id) {
    return id === searchRequestId &&
      requestQuery !== '' &&
      requestQuery === (searchInput.value || '').trim();
  }

  function encodeTextDirective(text) {
    return encodeURIComponent(text).replace(/-/g, '%2D');
  }

  function fitExcerpt(words, start) {
    for (var n = Math.min(FRAGMENT_LEAD_WORDS, words.length - start); n > 0; n--) {
      var excerpt = encodeTextDirective(words.slice(start, start + n).join(' '));
      if (excerpt.length <= FRAGMENT_MAX_LENGTH) return excerpt;
    }
    return '';
  }

  function resultHref(url, text) {
    if (!url || url.indexOf('#') !== -1 || !('fragmentDirective' in document)) return url;
    var words = (text || '').split(/\s+/).filter(function(w) { return w.length > 0; });
    if (words.length === 0) return url;
    var excerpt = encodeTextDirective(words.join(' '));
    if (excerpt.length > FRAGMENT_MAX_LENGTH) {
      excerpt = '';
    }
    for (var start = 0; !excerpt && start < words.length; start++) {
      excerpt = fitExcerpt(words, start);
    }
    return excerpt ? url + '#:~:text=' + excerpt : url;
  }

  // Render results
  function renderResults(query, requestId) {
    if (currentResults.length === 0) {
      resultsContainer.innerHTML = '<div class="search-hint">Fake news not found.</div>';
      return;
    }

    var toShow = currentResults.slice(0, displayedResults + RESULTS_PER_PAGE);
    displayedResults = toShow.length;

    var html = toShow.map(function(result) {
      var r = result.record;
      return '<div class="algolia__result">' +
        '<h3 class="post-title"><a class="algolia__result-link" href="' + escapeHtml(resultHref(r.url, r.content)) + '">' +
        escapeHtml(r.title) + ': ' + escapeHtml(r.description) + '</a></h3>' +
        '<div class="algolia__result-date">' + formatDate(r.date) + '</div>' +
        '<div class="algolia__result-text">' + highlightTerms(r.content, query) + '</div>' +
        '</div>';
    }).join('');

    if (currentResults.length > displayedResults) {
      var remaining = currentResults.length - displayedResults;
      html += '<button class="search-load-more" onclick="window.searchLoadMore()">Load more (' + remaining + ' remaining)</button>';
      window.searchLoadMore = function() {
        if (isCurrentRequest(requestId)) {
          renderResults(query, requestId);
        }
      };
    }

    resultsContainer.innerHTML = html;
  }

  // Highlight search terms
  function highlightTerms(text, query) {
    var terms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 1; });
    var escaped = escapeHtml(text);
    terms.forEach(function(term) {
      var regex = new RegExp('(' + escapeRegex(term) + ')', 'gi');
      escaped = escaped.replace(regex, '<mark class="ais-Highlight">$1</mark>');
    });
    return escaped;
  }

  // Format relative date
  function formatDate(dateStr) {
    var diffDays = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return diffDays + ' days ago';
    var weeks = Math.floor(diffDays / 7);
    if (diffDays < 30) return weeks + (weeks === 1 ? ' week ago' : ' weeks ago');
    var months = Math.floor(diffDays / 30);
    if (diffDays < 365) return months + (months === 1 ? ' month ago' : ' months ago');
    var years = Math.floor(diffDays / 365);
    return years + (years === 1 ? ' year ago' : ' years ago');
  }

  // Utilities
  function debounce(fn, delay) {
    var timer;
    return function(e) {
      clearTimeout(timer);
      timer = setTimeout(function() { fn(e); }, delay);
    };
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

})();
