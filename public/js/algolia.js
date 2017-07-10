// Init the search box
$(function(config) {
  'use strict';

  var applicationId = config.applicationId;
  var apiKey = config.apiKey;
  var indexName = config.indexName;

  var algolia = algoliasearch(applicationId, apiKey);
  var helper = algoliasearchHelper(algolia, indexName);
  helper.setQueryParameter('distinct', false);
  helper.on('result', onResult);

  // Input listening for queries
  var $searchInput = $('.js-algolia__input');
  $searchInput.on('keyup', onQueryChange);

  // Content to hide/show when searching
  var $initialContent = $('.js-algolia__initial-content');
  var $searchContent = $('.js-algolia__search-content');
  var $searchContentResults = $searchContent.find('.algolia__results');
  $searchContentResults.on('click', 'a', onLinkClick);
  // Rendering templates
  var templateResult = Hogan.compile($('#algolia__template').html());
  var templateNoResults = $('#algolia__template--no-results').html();

  var lastQuery;

  // Toggle result page
  function showResults() {
    // window.scroll(0, 0);
    // $('algolia__input').scrollTop();
    $initialContent.addClass('algolia__initial-content--hidden');
    $searchContent.addClass('algolia__search-content--active');

  }
  function hideResults() {
    $initialContent.removeClass('algolia__initial-content--hidden');
    $searchContent.removeClass('algolia__search-content--active');
  }

  // Handle typing query
  function onQueryChange() {
    lastQuery = $(this).val();
    if (lastQuery.length === 0) {
      hideResults();
      return false;
    }
    helper.setQuery(lastQuery).search();
    showResults();
  }

  function onResult(data) {
    // Avoid race conditions, discard results that do not match the latest query
    if (data.query !== lastQuery) {
      return false;
    }
    var content = data.nbHits ? renderResults(data) : templateNoResults;
    $searchContentResults.html(content);
  }

  function renderResults(data) {
    return $.map(data.hits, function(hit) {
      if (hit.posted_at) {
        hit.posted_at_readable = moment.unix(hit.posted_at).fromNow();
      }
      hit.css_selector = encodeURI(hit.css_selector);
      hit.full_url = config.baseurl + hit.url;

      return templateResult.render(hit);
    }).join('');
  }

  // Scroll page to correct element
  function getAnchorSelector(hash) {
    var anchor = hash.substring(1);
    if (!anchor.match(/^algolia:/)) {
      return false;
    }
    return decodeURI(anchor.replace(/^algolia:/, ''));
  }

  function scrollPageToSelector(selector) {
    var target = $('.page,.post').find(selector);
    var targetOffset = target[0].getBoundingClientRect().top + window.pageYOffset - 20;
    window.setTimeout(function() {
      window.scroll(0, targetOffset);
    }, 100);
  }

  function onLinkClick(event) {
    var selector = getAnchorSelector(event.target.hash);
    // Normal link, going to another page
    if (event.target.pathname !== window.location.pathname || !selector) {
      return true;
    }
    // Scrolling to a result on the same page
    hideResults();
    scrollPageToSelector(selector);
    event.preventDefault();
    return false;
  }

  window.setTimeout(function() {
    var selector = getAnchorSelector(window.location.hash);
    if (selector) {
      scrollPageToSelector(selector);
    }
  }, 100);


}(window.ALGOLIA_CONFIG));
