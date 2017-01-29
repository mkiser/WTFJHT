source 'https://rubygems.org'

require 'json'
require 'open-uri'
versions = JSON.parse(open('https://pages.github.com/versions.json').read)

gem 'jekyll-twitter-plugin'
gem 'jekyll-gist'
gem 'github-pages', versions['github-pages']
gem 'jekyll-seo-tag'
gem 'jekyll-last-modified-at'