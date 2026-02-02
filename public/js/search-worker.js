// Search Web Worker - runs search operations in background thread
importScripts('https://cdn.jsdelivr.net/npm/minisearch@6.3.0/dist/umd/index.min.js');

var miniSearch = null;
var allRecords = null;
var recordMap = {};
var tagLookup = [];

// Handle messages from main thread
self.onmessage = function(e) {
  var msg = e.data;

  if (msg.type === 'init') {
    initIndex(msg.data);
  } else if (msg.type === 'search') {
    performSearch(msg.query, msg.id, msg.filters);
  }
};

// Initialize the search index
function initIndex(data) {
  // Store tag lookup array
  tagLookup = data.g || [];

  // Handle v1 (legacy), v2 (deduplicated), and v3 (with tags) formats
  if (data.v >= 3 || data.g) {
    // V3 format with tags: expand records with tag data
    allRecords = expandRecordsV3(data);
  } else if (data.v === 2 || data.p) {
    // V2 deduplicated format: expand records
    allRecords = expandRecords(data);
  } else {
    // V1 legacy format: use records directly
    allRecords = data.records;
  }

  // Build lookup map
  allRecords.forEach(function(r) {
    recordMap[r.id] = r;
  });

  // Initialize MiniSearch
  miniSearch = new MiniSearch({
    fields: ['content'],
    storeFields: ['id']  // Only store ID, lookup full record from recordMap
  });
  miniSearch.addAll(allRecords);

  self.postMessage({ type: 'ready', tagCount: tagLookup.length });
}

// Expand deduplicated v2 format into full records
function expandRecords(data) {
  var posts = data.p;
  var compactRecords = data.r;
  var expanded = [];

  for (var i = 0; i < compactRecords.length; i++) {
    var rec = compactRecords[i];
    // rec = [postIndex, content, type]
    var postIdx = rec[0];
    var post = posts[postIdx];

    expanded.push({
      id: i,  // Use array index as ID
      url: post.u,
      title: post.t,
      description: post.d,
      date: post.dt,
      timestamp: post.ts,
      content: rec[1],
      type: rec[2] === 1 ? 'p' : 'li',
      tags: []  // No tags in v2
    });
  }

  return expanded;
}

// Expand v3 format with tags into full records
function expandRecordsV3(data) {
  var posts = data.p;
  var compactRecords = data.r;
  var expanded = [];

  for (var i = 0; i < compactRecords.length; i++) {
    var rec = compactRecords[i];
    // rec = [postIndex, content, type]
    var postIdx = rec[0];
    var post = posts[postIdx];
    // Resolve tag indices to tag names
    var tags = (post.g || []).map(function(idx) { return tagLookup[idx]; });

    expanded.push({
      id: i,
      url: post.u,
      title: post.t,
      description: post.d,
      date: post.dt,
      timestamp: post.ts,
      content: rec[1],
      type: rec[2] === 1 ? 'p' : 'li',
      tags: tags
    });
  }

  return expanded;
}

// Parse tag: syntax from query
function parseQuery(query) {
  var tagPattern = /tag:(\S+)/gi;
  var tags = [];
  var match;
  while ((match = tagPattern.exec(query)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  var textQuery = query.replace(tagPattern, '').trim();
  return { textQuery: textQuery, queryTags: tags };
}

// Check if record tags match filter tags
function matchesTags(recordTags, filterTags) {
  if (!recordTags || recordTags.length === 0) return false;
  return filterTags.every(function(ft) {
    return recordTags.some(function(rt) {
      return rt.toLowerCase().indexOf(ft) !== -1;
    });
  });
}

// Calculate boost based on tag matches with search terms
function calculateTagBoost(tags, queryTerms) {
  if (!tags || tags.length === 0 || queryTerms.length === 0) return 1.0;
  var boost = 1.0;
  queryTerms.forEach(function(term) {
    if (tags.some(function(t) { return t.toLowerCase() === term; })) {
      boost *= 1.5;  // Exact tag match
    } else if (tags.join(' ').toLowerCase().indexOf(term) !== -1) {
      boost *= 1.2;  // Partial tag match
    }
  });
  return Math.min(boost, 2.5);  // Cap boost
}

// Perform search and return results
function performSearch(query, requestId) {
  if (!miniSearch) {
    self.postMessage({ type: 'error', error: 'Index not ready', id: requestId });
    return;
  }

  // Parse tag: syntax from query (kept for future use)
  var parsed = parseQuery(query);
  var results;

  if (parsed.textQuery.length >= 2) {
    // Text search
    results = miniSearch.search(parsed.textQuery, {
      fuzzy: 0.2,
      prefix: true,
      boost: { content: 1 }
    });
  } else if (parsed.queryTags.length > 0) {
    // Tag-only search (no text query)
    results = allRecords
      .filter(function(r) { return matchesTags(r.tags, parsed.queryTags); })
      .map(function(r) { return { id: r.id, score: 1 }; });
  } else {
    // Query too short and no tags
    self.postMessage({ type: 'results', results: [], id: requestId });
    return;
  }

  // Apply tag filters from tag: syntax if present
  if (parsed.queryTags.length > 0 && parsed.textQuery.length >= 2) {
    results = results.filter(function(result) {
      var record = recordMap[result.id];
      return matchesTags(record.tags, parsed.queryTags);
    });
  }

  // Limit results for performance
  if (results.length > 500) {
    results = results.slice(0, 500);
  }

  // Extract search terms for phrase matching (exclude tag: syntax)
  var searchTerms = parsed.textQuery.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 1; });

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

    // Tag boost - boost results where search terms match tag names
    var tagBoost = calculateTagBoost(record.tags, searchTerms);

    return {
      id: result.id,
      score: result.score,
      finalScore: result.score * recencyBoost * typeBoost * phraseBoost * tagBoost,
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
