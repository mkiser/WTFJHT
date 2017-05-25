source 'https://rubygems.org'

require 'json'
require 'open-uri'
versions = JSON.parse(open('https://pages.github.com/versions.json').read)

gem 'github-pages', versions['github-pages']
gem 'jekyll-sitemap'
gem 'amp-jekyll'
gem 'jekyll-paginate'
gem 'jekyll-redirect-from'
gem 'jekyll-extlinks'
gem 'jekyll-twitter-plugin'

group :jekyll_plugins do
  gem 'algoliasearch-jekyll'
  gem 'jekyll_pages_api'
end
