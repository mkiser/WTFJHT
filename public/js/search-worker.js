// Search Web Worker - runs search operations in background thread
importScripts('https://cdn.jsdelivr.net/npm/minisearch@6.3.0/dist/umd/index.min.js');

var miniSearch = null;
var allRecords = null;
var recordMap = {};
var tagLookup = [];

// Synonym map: search terms that should boost specific tags
// Organized by category for maintainability
var synonymToTags = {
  // === LGBTQ terms → lgbtq-rights ===
  'transgender': ['lgbtq-rights'], 'trans': ['lgbtq-rights'], 'gay': ['lgbtq-rights'],
  'lesbian': ['lgbtq-rights'], 'lgbtq': ['lgbtq-rights'], 'lgbt': ['lgbtq-rights'],
  'same-sex': ['lgbtq-rights'], 'queer': ['lgbtq-rights'], 'nonbinary': ['lgbtq-rights'],
  'drag': ['lgbtq-rights'], 'gender affirming': ['lgbtq-rights'], 'marriage equality': ['lgbtq-rights'],
  'dont say gay': ['lgbtq-rights'], 'bathroom bill': ['lgbtq-rights'],

  // === Immigration terms → immigration ===
  'daca': ['immigration'], 'dreamer': ['immigration'], 'dreamers': ['immigration'],
  'deportation': ['immigration'], 'deport': ['immigration'], 'ice': ['immigration'],
  'asylum': ['immigration'], 'refugee': ['immigration'], 'border wall': ['immigration'],
  'family separation': ['immigration'], 'migrant': ['immigration'], 'caravan': ['immigration'],
  'remain in mexico': ['immigration'], 'title 42': ['immigration'], 'cbp': ['immigration'],
  'border patrol': ['immigration'], 'sanctuary city': ['immigration'], 'undocumented': ['immigration'],
  'green card': ['immigration'], 'visa ban': ['immigration'], 'travel ban': ['immigration'],
  'muslim ban': ['immigration'], 'zero tolerance': ['immigration'],

  // === Healthcare terms → healthcare ===
  'obamacare': ['healthcare'], 'aca': ['healthcare'], 'medicaid': ['healthcare'],
  'medicare': ['healthcare'], 'insulin': ['healthcare'], 'preexisting condition': ['healthcare'],
  'individual mandate': ['healthcare'], 'public option': ['healthcare'],
  'drug pricing': ['healthcare'], 'prescription drug': ['healthcare'],

  // === Reproductive rights terms ===
  'abortion': ['reproductive-rights'], 'roe': ['reproductive-rights'], 'roe v wade': ['reproductive-rights'],
  'dobbs': ['reproductive-rights'], 'pro-choice': ['reproductive-rights'], 'pro-life': ['reproductive-rights'],
  'planned parenthood': ['reproductive-rights'], 'mifepristone': ['reproductive-rights'],
  'heartbeat bill': ['reproductive-rights'], 'fetal': ['reproductive-rights'],

  // === Climate terms → climate ===
  'paris agreement': ['climate'], 'epa': ['climate'], 'emissions': ['climate'],
  'fossil fuel': ['climate'], 'global warming': ['climate'], 'climate change': ['climate'],
  'carbon': ['climate'], 'greenhouse': ['climate'], 'renewable': ['climate'],
  'clean energy': ['climate'], 'keystone': ['climate'], 'pipeline': ['climate'],
  'drilling': ['climate'], 'offshore drilling': ['climate'], 'fracking': ['climate'],

  // === Mueller/Russia investigation terms ===
  'mueller': ['mueller-investigation'], 'collusion': ['mueller-investigation'],
  'comey': ['mueller-investigation'], 'manafort': ['mueller-investigation'],
  'roger stone': ['mueller-investigation'], 'michael flynn': ['mueller-investigation'],
  'flynn': ['mueller-investigation'], 'papadopoulos': ['mueller-investigation'],
  'obstruction': ['mueller-investigation', 'oversight'], 'special counsel': ['mueller-investigation'],
  'rosenstein': ['mueller-investigation'], 'sessions': ['mueller-investigation'],
  'steele dossier': ['mueller-investigation'], 'russian interference': ['mueller-investigation', 'russia'],

  // === Jan 6 terms ===
  'capitol riot': ['jan-6'], 'insurrection': ['jan-6'], 'january 6': ['jan-6'],
  'proud boys': ['jan-6'], 'oath keepers': ['jan-6'], 'stop the steal': ['jan-6'],
  'jan 6': ['jan-6'], 'capitol attack': ['jan-6'], 'capitol breach': ['jan-6'],
  'seditious conspiracy': ['jan-6'], 'enrique tarrio': ['jan-6'], 'stewart rhodes': ['jan-6'],
  'ray epps': ['jan-6'], 'ashli babbitt': ['jan-6'],

  // === COVID terms ===
  'coronavirus': ['covid'], 'pandemic': ['covid'], 'vaccine': ['covid'],
  'fauci': ['covid'], 'lockdown': ['covid'], 'covid-19': ['covid'], 'covid19': ['covid'],
  'mask mandate': ['covid'], 'social distancing': ['covid'], 'hydroxychloroquine': ['covid'],
  'ventilator': ['covid'], 'cdc': ['covid'], 'quarantine': ['covid'], 'wuhan': ['covid'],
  'operation warp speed': ['covid'],

  // === Impeachment terms ===
  'impeach': ['impeachment'], 'impeached': ['impeachment'], 'articles of impeachment': ['impeachment'],
  'high crimes': ['impeachment'], 'misdemeanors': ['impeachment'],
  'ukraine call': ['impeachment', 'ukraine'], 'perfect call': ['impeachment', 'ukraine'],
  'quid pro quo': ['impeachment', 'ukraine'], 'burisma': ['impeachment', 'ukraine'],
  'vindman': ['impeachment'], 'sondland': ['impeachment'], 'yovanovitch': ['impeachment'],

  // === Trump trials/legal terms ===
  'indictment': ['trump-trials'], 'indicted': ['trump-trials'],
  'stormy daniels': ['trump-trials'], 'hush money': ['trump-trials'],
  'alvin bragg': ['trump-trials'], 'manhattan da': ['trump-trials'],
  'fani willis': ['trump-trials'], 'georgia case': ['trump-trials'],
  'jack smith': ['trump-trials', 'classified-documents'], 'e jean carroll': ['trump-trials'],
  'fraud trial': ['trump-trials'], 'civil fraud': ['trump-trials'],
  'letitia james': ['trump-trials'], 'engoron': ['trump-trials'],

  // === Classified documents ===
  'classified': ['classified-documents'], 'mar-a-lago': ['classified-documents'],
  'classified documents': ['classified-documents'], 'documents case': ['classified-documents'],
  'archives': ['classified-documents'], 'national archives': ['classified-documents'],
  'espionage act': ['classified-documents'], 'top secret': ['classified-documents'],

  // === Voting/elections ===
  'voter fraud': ['voting-rights', 'elections'], 'election fraud': ['voting-rights', 'elections'],
  'ballot': ['voting-rights', 'elections'], 'gerrymandering': ['voting-rights'],
  'voter suppression': ['voting-rights'], 'voter id': ['voting-rights'],
  'electoral college': ['elections'], 'recount': ['elections'],
  'mail-in voting': ['voting-rights', 'elections'], 'absentee': ['voting-rights', 'elections'],
  'dominion': ['elections'], 'voting machine': ['elections'],
  'stop the count': ['elections', 'jan-6'], 'certification': ['elections', 'jan-6'],

  // === Supreme Court ===
  'scotus': ['supreme-court'], 'kavanaugh': ['supreme-court'], 'barrett': ['supreme-court'],
  'gorsuch': ['supreme-court'], 'alito': ['supreme-court'], 'thomas': ['supreme-court'],
  'roberts': ['supreme-court'], 'judicial nomination': ['supreme-court'],
  'court packing': ['supreme-court'], 'merrick garland': ['supreme-court'],

  // === Congress ===
  'filibuster': ['congress'], 'debt ceiling': ['congress', 'budget'],
  'government shutdown': ['congress', 'budget'], 'continuing resolution': ['congress', 'budget'],
  'reconciliation': ['congress'], 'cloture': ['congress'], 'mcconnell': ['congress'],
  'pelosi': ['congress'], 'schumer': ['congress'], 'mccarthy': ['congress'],

  // === Oversight/accountability ===
  'subpoena': ['oversight'], 'whistleblower': ['oversight'], 'contempt': ['oversight'],
  'testimony': ['oversight'], 'congressional hearing': ['oversight'],
  'executive privilege': ['oversight'], 'inspector general': ['oversight'],
  'ethics violation': ['oversight', 'corruption'], 'emoluments': ['oversight', 'corruption'],

  // === Pardons ===
  'pardon': ['pardon'], 'clemency': ['pardon'], 'commute': ['pardon'],
  'arpaio': ['pardon'], 'self-pardon': ['pardon'],

  // === Trade/tariffs ===
  'tariff': ['tariffs'], 'trade war': ['tariffs', 'trade'], 'trade deal': ['trade'],
  'nafta': ['trade'], 'usmca': ['trade'], 'tpp': ['trade'],
  'wto': ['trade'], 'trade deficit': ['trade'], 'import': ['tariffs', 'trade'],

  // === Foreign policy - Ukraine ===
  'zelensky': ['ukraine'], 'kyiv': ['ukraine'], 'kiev': ['ukraine'],
  'crimea': ['ukraine', 'russia'], 'donbas': ['ukraine'], 'javelin': ['ukraine'],
  'military aid': ['ukraine'], 'zelenskyy': ['ukraine'],

  // === Foreign policy - Russia ===
  'putin': ['russia'], 'kremlin': ['russia'], 'sanctions': ['russia'],
  'oligarch': ['russia'], 'soviet': ['russia'], 'moscow': ['russia'],
  'election interference': ['russia', 'elections'],

  // === Foreign policy - China ===
  'xi jinping': ['china'], 'beijing': ['china'], 'taiwan': ['china'],
  'hong kong': ['china'], 'tiktok': ['china'], 'huawei': ['china'],
  'uyghur': ['china'], 'xinjiang': ['china'],

  // === Foreign policy - Middle East ===
  'hamas': ['israel-palestine'], 'gaza': ['israel-palestine'], 'netanyahu': ['israel-palestine'],
  'west bank': ['israel-palestine'], 'two-state': ['israel-palestine'],
  'saudi arabia': ['middle-east'], 'mbs': ['middle-east'], 'khashoggi': ['middle-east'],
  'iran deal': ['iran'], 'jcpoa': ['iran'], 'soleimani': ['iran'],

  // === Foreign policy - North Korea ===
  'kim jong un': ['north-korea'], 'pyongyang': ['north-korea'],
  'denuclearization': ['north-korea'], 'icbm': ['north-korea'],

  // === Cabinet/personnel ===
  'cabinet': ['cabinet'], 'acting': ['cabinet'], 'confirmation': ['cabinet'],
  'resign': ['cabinet'], 'fired': ['cabinet'], 'tillerson': ['cabinet'],
  'mattis': ['cabinet'], 'kelly': ['cabinet'], 'nielsen': ['cabinet'],
  'pompeo': ['cabinet'], 'barr': ['cabinet'], 'bolton': ['cabinet'],

  // === Media ===
  'fake news': ['media'], 'enemy of the people': ['media'], 'press briefing': ['media'],
  'cnn': ['media'], 'acosta': ['media'], 'press freedom': ['media'],

  // === Economy ===
  'jobs report': ['economy'], 'unemployment': ['economy'], 'recession': ['economy'],
  'inflation': ['economy'], 'interest rate': ['economy'], 'fed': ['economy'],
  'stock market': ['economy'], 'gdp': ['economy'], 'deficit': ['economy', 'budget'],
  'stimulus': ['economy', 'covid'], 'bailout': ['economy'],

  // === Taxes ===
  'tax cut': ['taxes'], 'tax reform': ['taxes'], 'tax return': ['taxes'],
  'irs': ['taxes'], 'corporate tax': ['taxes']
};

// Concept clusters: abstract concepts that map to multiple related tags
// These capture conceptual searches that don't map to specific terminology
var conceptClusters = {
  // === Constitutional/governance concepts ===
  'abuse of power': ['impeachment', 'oversight', 'corruption'],
  'executive overreach': ['executive-order', 'oversight', 'impeachment'],
  'constitutional crisis': ['impeachment', 'supreme-court', 'oversight', 'jan-6'],
  'checks and balances': ['oversight', 'congress', 'supreme-court'],
  'rule of law': ['oversight', 'trump-trials', 'justice-department'],
  'separation of powers': ['oversight', 'executive-order', 'congress'],
  'authoritarianism': ['executive-order', 'democracy', 'media'],
  'democratic norms': ['democracy', 'elections', 'oversight'],

  // === Corruption/ethics concepts ===
  'corruption': ['corruption', 'oversight', 'emoluments'],
  'conflicts of interest': ['corruption', 'emoluments', 'oversight'],
  'self-dealing': ['corruption', 'emoluments', 'ethics'],
  'cover-up': ['mueller-investigation', 'oversight', 'impeachment', 'jan-6'],
  'obstruction of justice': ['mueller-investigation', 'oversight', 'impeachment'],
  'witness tampering': ['mueller-investigation', 'oversight', 'trump-trials'],
  'grift': ['corruption', 'emoluments'],

  // === Election integrity concepts ===
  'election integrity': ['voting-rights', 'elections', 'jan-6'],
  'big lie': ['elections', 'jan-6', 'voting-rights'],
  'stolen election': ['elections', 'jan-6', 'voting-rights'],
  'voter suppression': ['voting-rights'],
  'election denial': ['elections', 'jan-6'],
  'democracy': ['voting-rights', 'elections', 'jan-6', 'democracy'],

  // === National security concepts ===
  'national security': ['russia', 'china', 'classified-documents', 'national-security'],
  'foreign interference': ['russia', 'elections', 'mueller-investigation'],
  'espionage': ['classified-documents', 'russia', 'china'],
  'intelligence': ['national-security', 'classified-documents', 'oversight'],

  // === Civil rights concepts ===
  'civil rights': ['lgbtq-rights', 'voting-rights', 'reproductive-rights', 'immigration'],
  'civil liberties': ['lgbtq-rights', 'voting-rights', 'reproductive-rights'],
  'discrimination': ['lgbtq-rights', 'voting-rights', 'immigration'],
  'equal rights': ['lgbtq-rights', 'voting-rights', 'reproductive-rights'],
  'bodily autonomy': ['reproductive-rights', 'healthcare', 'covid'],

  // === Economic concepts ===
  'economic policy': ['economy', 'taxes', 'tariffs', 'trade'],
  'trade war': ['tariffs', 'trade', 'china'],
  'economic inequality': ['economy', 'taxes'],
  'consumer protection': ['economy', 'healthcare'],

  // === Environmental concepts ===
  'climate denial': ['climate', 'epa'],
  'environmental protection': ['climate', 'epa'],
  'clean air': ['climate', 'epa'],
  'clean water': ['climate', 'epa'],

  // === Government function concepts ===
  'government dysfunction': ['congress', 'budget', 'cabinet'],
  'cabinet chaos': ['cabinet', 'white-house'],
  'turnover': ['cabinet', 'white-house'],
  'acting officials': ['cabinet'],

  // === Media/truth concepts ===
  'disinformation': ['media', 'elections', 'covid', 'disinformation'],
  'misinformation': ['media', 'elections', 'covid', 'disinformation'],
  'propaganda': ['media', 'russia', 'disinformation'],
  'press freedom': ['media'],
  'truth': ['media', 'disinformation'],

  // === Justice system concepts ===
  'criminal justice': ['justice-department', 'trump-trials'],
  'political prosecution': ['trump-trials', 'justice-department'],
  'weaponization': ['justice-department', 'oversight'],

  // === Foreign policy concepts ===
  'foreign policy': ['russia', 'china', 'ukraine', 'iran', 'north-korea'],
  'diplomacy': ['russia', 'china', 'ukraine', 'iran', 'north-korea'],
  'alliance': ['nato', 'trade'],
  'war': ['ukraine', 'middle-east', 'iran']
};

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

// Calculate boost based on tag matches with search terms (including synonyms and concepts)
function calculateTagBoost(tags, queryTerms, queryText) {
  if (!tags || tags.length === 0) return 1.0;
  var boost = 1.0;
  var queryLower = queryText.toLowerCase();
  var matchedTags = {};  // Track which tags already got boosted to avoid double-boosting

  // Check direct tag matches
  queryTerms.forEach(function(term) {
    if (tags.some(function(t) { return t.toLowerCase() === term; })) {
      boost *= 1.5;  // Exact tag match
      matchedTags[term] = true;
    } else if (tags.join(' ').toLowerCase().indexOf(term) !== -1) {
      boost *= 1.2;  // Partial tag match
    }
  });

  // Check synonym matches - if query contains a synonym term, boost posts with that tag
  Object.keys(synonymToTags).forEach(function(synonym) {
    if (queryLower.indexOf(synonym) !== -1) {
      var targetTags = synonymToTags[synonym];
      targetTags.forEach(function(targetTag) {
        if (!matchedTags[targetTag] && tags.some(function(t) { return t.toLowerCase() === targetTag; })) {
          boost *= 1.8;  // Synonym-to-tag match (strong signal)
          matchedTags[targetTag] = true;
        }
      });
    }
  });

  // Check concept cluster matches - for abstract/conceptual queries
  Object.keys(conceptClusters).forEach(function(concept) {
    if (queryLower.indexOf(concept) !== -1) {
      var relatedTags = conceptClusters[concept];
      var conceptMatchCount = 0;
      relatedTags.forEach(function(relatedTag) {
        if (!matchedTags[relatedTag] && tags.some(function(t) { return t.toLowerCase() === relatedTag; })) {
          conceptMatchCount++;
          matchedTags[relatedTag] = true;
        }
      });
      // Boost based on how many related tags match (diminishing returns)
      if (conceptMatchCount > 0) {
        boost *= 1 + (0.4 * Math.min(conceptMatchCount, 3));  // Max 2.2x for 3+ matches
      }
    }
  });

  return Math.min(boost, 4.0);  // Cap boost (raised to accommodate concept clusters)
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

    // Tag boost - boost results where search terms or synonyms match tags
    var tagBoost = calculateTagBoost(record.tags, searchTerms, parsed.textQuery);

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
