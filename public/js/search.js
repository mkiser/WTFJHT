// Custom paragraph-level search for WTFJHT
// Uses Web Worker for non-blocking search

(function() {
  'use strict';

  // Configuration
  var RESULTS_PER_PAGE = 50;
  var DEBOUNCE_MS = 300;
  var MIN_QUERY_LENGTH = 2;
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

  // DOM elements
  var searchInput = document.querySelector('.js-algolia__input');
  var initialContent = document.querySelector('.js-algolia__initial-content');
  var searchContent = document.querySelector('.js-algolia__search-content');
  var resultsContainer = searchContent ? searchContent.querySelector('.algolia__results') : null;

  if (!searchInput || !initialContent || !searchContent || !resultsContainer) {
    console.warn('Search: Required DOM elements not found');
    return;
  }

  // Initialize on first real user interaction
  var focusHandler = function(e) {
    // Only initialize on trusted user events, not programmatic focus
    if (e.isTrusted) {
      searchInput.removeEventListener('focus', focusHandler);
      initSearch();
    }
  };
  searchInput.addEventListener('focus', focusHandler);
  searchInput.addEventListener('input', debounce(onQueryChange, DEBOUNCE_MS));

  // Show/hide results
  function showResults() {
    initialContent.classList.add('algolia__initial-content--hidden');
    searchContent.classList.add('algolia__search-content--active');
  }

  function hideResults() {
    initialContent.classList.remove('algolia__initial-content--hidden');
    searchContent.classList.remove('algolia__search-content--active');
  }

  // Initialize Web Worker and load index
  function initSearch() {
    if (worker || isLoading) return;
    isLoading = true;

    // Create worker
    worker = new Worker('/public/js/search-worker.js');

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
        if (msg.id === searchRequestId) {
          currentResults = msg.results;
          displayedResults = 0;
          renderResults(currentQuery);
        }
      } else if (msg.type === 'error') {
        console.error('Search worker error:', msg.error);
      }
    };

    worker.onerror = function(err) {
      console.error('Search worker failed:', err);
      isLoading = false;
    };

    // Load index and send to worker
    loadIndex()
      .then(function(data) {
        worker.postMessage({ type: 'init', data: data });
      })
      .catch(function(err) {
        console.error('Search: Failed to load index', err);
        isLoading = false;
      });
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
    return fetch('/search-version.json', { cache: 'no-store' })
      .then(function(response) {
        if (!response.ok) throw new Error('Version file not found');
        return response.json();
      })
      .then(function(data) {
        return data.generated !== cachedGenerated;
      });
  }

  // Fetch index from network
  function fetchIndex() {
    // Try uncompressed first (Cloudflare serves Brotli automatically)
    // Fall back to pre-compressed .gz for environments without Brotli
    return fetch('/search-index.json')
      .then(function(response) {
        if (!response.ok) throw new Error('Index not found');
        return response.json();
      })
      .catch(function() {
        console.log('Search: Falling back to gzip version');
        return fetch('/search-index.json.gz')
          .then(function(response) {
            if (!response.ok) throw new Error('Compressed index not found');
            return response.blob().then(decompressGzip);
          });
      })
      .then(function(data) {
        saveToIndexedDB(data);
        return data;
      });
  }

  // Decompress gzipped data
  function decompressGzip(blob) {
    if (typeof DecompressionStream !== 'undefined') {
      var ds = new DecompressionStream('gzip');
      return new Response(blob.stream().pipeThrough(ds)).json();
    }
    if (typeof pako !== 'undefined') {
      return blob.arrayBuffer().then(function(buffer) {
        return JSON.parse(pako.inflate(new Uint8Array(buffer), { to: 'string' }));
      });
    }
    throw new Error('No decompression method available');
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
      hideResults();
      return;
    }

    if (currentQuery.length < MIN_QUERY_LENGTH) {
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

  // Send search to worker
  function doSearch(query) {
    searchRequestId++;
    resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
    worker.postMessage({ type: 'search', query: query, id: searchRequestId });
  }

  // Render results
  function renderResults(query) {
    if (currentResults.length === 0) {
      resultsContainer.innerHTML = 'Fake news not found.';
      return;
    }

    var toShow = currentResults.slice(0, displayedResults + RESULTS_PER_PAGE);
    displayedResults = toShow.length;

    var html = toShow.map(function(result) {
      var r = result.record;
      return '<div class="algolia__result">' +
        '<h1 class="post-title"><a class="algolia__result-link" href="' + escapeHtml(r.url) + '">' +
        escapeHtml(r.title) + ': ' + escapeHtml(r.description) + '</a></h1>' +
        '<div class="algolia__result-date">' + formatDate(r.date) + '</div>' +
        '<div class="algolia__result-text">' + highlightTerms(r.content, query) + '</div>' +
        '</div>';
    }).join('');

    if (currentResults.length > displayedResults) {
      var remaining = currentResults.length - displayedResults;
      html += '<button class="search-load-more" onclick="window.searchLoadMore()">Load more (' + remaining + ' remaining)</button>';
      window.searchLoadMore = function() {
        renderResults(query);
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
