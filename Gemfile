source 'https://rubygems.org'

require 'json'
require 'open-uri'
versions = JSON.parse(open('https://pages.github.com/versions.json').read)

# gem 'jekyll-twitter-plugin'
# gem 'jekyll-gist'
gem 'github-pages', versions['github-pages']
gem 'jekyll-sitemap'
gem 'amp-jekyll'
gem 'jekyll-paginate'
gem 'jekyll-redirect-from'
gem 'jekyll-extlinks'
group :jekyll_plugins do
  gem 'jekyll_pages_api'
  gem 'algoliasearch-jekyll', '~> 0.8.0'
  # gem 'jekyll-admin'
end
# gem 'jekyll-last-modified-at'