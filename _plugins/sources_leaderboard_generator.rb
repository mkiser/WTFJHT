# Jekyll plugin to generate Sources Leaderboard data
# Extracts all external links from posts and calculates percentages

require 'nokogiri'
require 'json'
require 'uri'

Jekyll::Hooks.register :site, :post_write do |site|
  Jekyll.logger.info "Sources Leaderboard:", "Analyzing external links..."

  domain_counts = Hash.new(0)
  total_links = 0
  total_editions = 0
  links_by_year = Hash.new { |h, k| h[k] = Hash.new(0) }
  year_totals = Hash.new(0)
  domain_names = {}  # Store display names

  # Common display name mappings
  display_names = {
    'nytimes.com' => 'New York Times',
    'washingtonpost.com' => 'Washington Post',
    'cnn.com' => 'CNN',
    'politico.com' => 'Politico',
    'nbcnews.com' => 'NBC News',
    'wsj.com' => 'Wall Street Journal',
    'bloomberg.com' => 'Bloomberg',
    'apnews.com' => 'Associated Press',
    'axios.com' => 'Axios',
    'cnbc.com' => 'CNBC',
    'abcnews.go.com' => 'ABC News',
    'abcnews.com' => 'ABC News',
    'npr.org' => 'NPR',
    'thehill.com' => 'The Hill',
    'reuters.com' => 'Reuters',
    'theguardian.com' => 'The Guardian',
    'twitter.com' => 'Twitter/X',
    'x.com' => 'Twitter/X',
    'cbsnews.com' => 'CBS News',
    'usatoday.com' => 'USA Today',
    'thedailybeast.com' => 'The Daily Beast',
    'vox.com' => 'Vox',
    'theatlantic.com' => 'The Atlantic',
    'huffpost.com' => 'HuffPost',
    'businessinsider.com' => 'Business Insider',
    'latimes.com' => 'Los Angeles Times',
    'buzzfeednews.com' => 'BuzzFeed News',
    'foxnews.com' => 'Fox News',
    'bbc.com' => 'BBC',
    'bbc.co.uk' => 'BBC',
    'msnbc.com' => 'MSNBC',
    'pbs.org' => 'PBS',
    'nymag.com' => 'New York Magazine',
    'newyorker.com' => 'The New Yorker',
    'propublica.org' => 'ProPublica',
    'motherjones.com' => 'Mother Jones',
    'rawstory.com' => 'Raw Story',
    'salon.com' => 'Salon',
    'slate.com' => 'Slate',
    'time.com' => 'Time',
    'newsweek.com' => 'Newsweek',
    'rollingstone.com' => 'Rolling Stone',
    'vanityfair.com' => 'Vanity Fair',
    'lawfaremedia.org' => 'Lawfare',
    'justsecurity.org' => 'Just Security'
  }

  # Process all built posts
  Dir.glob(File.join(site.dest, '20*/**/*.html')).sort.each do |file|
    year = file.match(%r{/(\d{4})/})[1] rescue next

    doc = Nokogiri::HTML(File.read(file))
    post_content = doc.at_css('.post-content')
    next unless post_content

    total_editions += 1

    post_content.css('a[href^="http"]').each do |link|
      href = link['href']
      next if href.nil? || href.empty?

      begin
        uri = URI.parse(href)
        next if uri.host.nil?
        next if uri.host.include?('whatthefuckjusthappenedtoday')
        next if uri.host.include?('wtfjht')
        next if uri.host.include?('localhost')
        next if uri.host.include?('127.0.0.1')

        # Normalize domain (remove www and subdomains for known sites)
        domain = uri.host.downcase.sub(/^www\./, '')

        # Skip non-news domains
        skip_domains = %w[
          twitter.com x.com t.co
          coronavirus.jhu.edu
          projects.fivethirtyeight.com fivethirtyeight.com
          vote.org
          youtube.com youtu.be
          facebook.com fb.com
          instagram.com
          linkedin.com
          reddit.com
          archive.org web.archive.org
          docs.google.com drive.google.com
          en.wikipedia.org wikipedia.org
        ]
        next if skip_domains.any? { |d| domain == d || domain.end_with?(".#{d}") }

        # Consolidate subdomains to root domains
        domain_mappings = {
          # CNN variants
          'money.cnn.com' => 'cnn.com',
          'edition.cnn.com' => 'cnn.com',
          'amp.cnn.com' => 'cnn.com',
          # Politico variants
          'politico.eu' => 'politico.com',
          # HuffPost variants
          'huffingtonpost.com' => 'huffpost.com',
          'huffingtonpost.co.uk' => 'huffpost.com',
          # BuzzFeed variants
          'buzzfeednews.com' => 'buzzfeed.com',
          # NYT variants
          'nytimes.com' => 'nytimes.com',
          # BBC variants
          'bbc.co.uk' => 'bbc.com',
          # Guardian variants
          'theguardian.co.uk' => 'theguardian.com',
          # NBC variants
          'msnbc.com' => 'nbcnews.com',
          # ABC variants
          'abcnews.go.com' => 'abcnews.com',
          # Business Insider
          'businessinsider.com' => 'businessinsider.com',
          'insider.com' => 'businessinsider.com',
        }
        domain = domain_mappings[domain] || domain

        # For remaining subdomains of known news sites, consolidate to root
        news_roots = %w[cnn.com nytimes.com washingtonpost.com politico.com nbcnews.com wsj.com bloomberg.com npr.org]
        news_roots.each do |root|
          if domain.end_with?(".#{root}") || domain.end_with?(root.sub('.com', '') + '.com')
            domain = root
            break
          end
        end

        domain_counts[domain] += 1
        links_by_year[year][domain] += 1
        year_totals[year] += 1
        total_links += 1
      rescue URI::InvalidURIError
        next
      end
    end
  end

  # Build leaderboard data
  years = links_by_year.keys.sort

  # Top 20 sources with percentages
  top_sources = domain_counts.sort_by { |_, count| -count }.first(20).map do |domain, count|
    pct = (count.to_f / total_links * 100).round(2)

    # Year-by-year percentages
    yearly = {}
    years.each do |year|
      year_count = links_by_year[year][domain] || 0
      yearly[year] = year_totals[year] > 0 ? (year_count.to_f / year_totals[year] * 100).round(2) : 0
    end

    {
      'domain' => domain,
      'name' => display_names[domain] || domain.split('.').first.capitalize,
      'count' => count,
      'percent' => pct,
      'yearly' => yearly
    }
  end

  # Year summaries
  year_data = years.map do |year|
    {
      'year' => year,
      'total' => year_totals[year]
    }
  end

  leaderboard = {
    'generated' => Time.now.utc.iso8601,
    'total_links' => total_links,
    'total_editions' => total_editions,
    'unique_domains' => domain_counts.size,
    'years' => year_data,
    'sources' => top_sources
  }

  # Write JSON file
  json_path = File.join(site.dest, 'sources-leaderboard.json')
  File.open(json_path, 'w') { |f| f.write(JSON.pretty_generate(leaderboard)) }

  Jekyll.logger.info "Sources Leaderboard:", "#{total_links} links from #{domain_counts.size} domains"
  Jekyll.logger.info "Sources Leaderboard:", "Wrote sources-leaderboard.json"
end
