// Search Web Worker - runs search operations in background thread
importScripts('https://cdn.jsdelivr.net/npm/minisearch@6.3.0/dist/umd/index.min.js');

var miniSearch = null;
var allRecords = null;
var recordMap = {};

// Handle messages from main thread
self.onmessage = function(e) {
  var msg = e.data;

  if (msg.type === 'init') {
    initIndex(msg.data);
  } else if (msg.type === 'search') {
    performSearch(msg.query, msg.id);
  }
};

// Initialize the search index
function initIndex(data) {
  allRecords = data.records;

  // Build lookup map
  allRecords.forEach(function(r) {
    recordMap[r.id] = r;
  });

  // Initialize MiniSearch
  miniSearch = new MiniSearch({
    fields: ['content'],
    storeFields: ['url', 'title', 'description', 'date', 'timestamp', 'content', 'type']
  });
  miniSearch.addAll(allRecords);

  self.postMessage({ type: 'ready' });
}

// Perform search and return results
function performSearch(query, requestId) {
  if (!miniSearch) {
    self.postMessage({ type: 'error', error: 'Index not ready', id: requestId });
    return;
  }

  var results = miniSearch.search(query, {
    fuzzy: 0.2,
    prefix: true,
    boost: { content: 1 }
  });

  // Limit results for performance
  if (results.length > 500) {
    results = results.slice(0, 500);
  }

  // Extract search terms for phrase matching
  var searchTerms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 1; });

  // Apply custom scoring
  var now = Date.now() / 1000;
  results = results.map(function(result) {
    var record = recordMap[result.id];
    if (!record) return result;

    var ageInDays = (now - record.timestamp) / 86400;
    var recencyBoost = Math.max(0.75, 1 - (ageInDays / 730));
    var typeBoost = record.type === 'p' ? 1.0 : 0.5;

    // Phrase/proximity boost
    var phraseBoost = calculatePhraseBoost(record.content, searchTerms);

    return {
      id: result.id,
      score: result.score,
      finalScore: result.score * recencyBoost * typeBoost * phraseBoost,
      record: record
    };
  });

  // Sort by final score
  results.sort(function(a, b) {
    return b.finalScore - a.finalScore;
  });

  self.postMessage({ type: 'results', results: results, id: requestId });
}

// Calculate boost based on phrase matching and word proximity
function calculatePhraseBoost(content, terms) {
  if (terms.length < 2) return 1.0;

  var contentLower = content.toLowerCase();

  // Check for exact phrase match (huge boost)
  var exactPhrase = terms.join(' ');
  if (contentLower.indexOf(exactPhrase) !== -1) {
    return 2.5;  // 2.5x boost for exact phrase
  }

  // Find positions of each term
  var positions = terms.map(function(term) {
    var pos = contentLower.indexOf(term);
    return pos;
  });

  // If any term not found, no boost
  if (positions.some(function(p) { return p === -1; })) {
    return 1.0;
  }

  // Check if terms appear in order
  var inOrder = true;
  for (var i = 1; i < positions.length; i++) {
    if (positions[i] < positions[i - 1]) {
      inOrder = false;
      break;
    }
  }

  // Calculate average distance between consecutive terms
  var totalDistance = 0;
  for (var j = 1; j < positions.length; j++) {
    totalDistance += Math.abs(positions[j] - positions[j - 1]);
  }
  var avgDistance = totalDistance / (positions.length - 1);

  // Proximity boost: closer terms = higher boost (max 1.5x for very close)
  var proximityBoost = Math.max(1.0, 1.5 - (avgDistance / 100));

  // Order boost: if terms appear in search order, extra boost
  var orderBoost = inOrder ? 1.3 : 1.0;

  return proximityBoost * orderBoost;
}
