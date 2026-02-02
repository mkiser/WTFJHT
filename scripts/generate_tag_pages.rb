#!/usr/bin/env ruby
# frozen_string_literal: true

# Generate static tag archive pages.
#
# This script creates individual HTML pages for each tag, listing all posts
# that use that tag. Run daily via GitHub Actions to avoid regenerating
# tag pages on every content push.
#
# Usage:
#   ruby generate_tag_pages.rb              # Generate all tag pages
#   ruby generate_tag_pages.rb --dry-run    # Preview without writing

require 'yaml'
require 'date'
require 'fileutils'

REPO_ROOT = File.expand_path('..', __dir__)
POSTS_DIR = File.join(REPO_ROOT, '_posts')
TAGS_DIR = File.join(REPO_ROOT, 'tags')
TAG_TAXONOMY_PATH = File.join(REPO_ROOT, '_data', 'tag_taxonomy.yml')

def extract_frontmatter(content)
  return nil unless content.start_with?('---')

  parts = content.split('---', 3)
  return nil if parts.length < 3

  begin
    frontmatter = YAML.safe_load(parts[1], permitted_classes: [Date, Time])
    [frontmatter, parts[2]]
  rescue StandardError
    nil
  end
end

def get_posts_by_tag
  posts_by_tag = Hash.new { |h, k| h[k] = [] }

  # Get all post files, sorted newest first
  post_files = Dir.glob(File.join(POSTS_DIR, '*.{md,markdown}')).sort.reverse

  post_files.each do |filepath|
    content = File.read(filepath, encoding: 'UTF-8')
    result = extract_frontmatter(content)
    next unless result

    frontmatter, = result
    next unless frontmatter

    tags = frontmatter['tags']
    next unless tags&.any?

    title = frontmatter['title'] || ''
    description = frontmatter['description'] || ''
    date = frontmatter['date']

    # Build URL from filename (YYYY-MM-DD-slug.md -> /YYYY/MM/DD/slug/)
    filename = File.basename(filepath, '.*')
    match = filename.match(/(\d{4})-(\d{2})-(\d{2})-(.+)/)
    next unless match

    year, month, day, slug = match.captures
    url = "/#{year}/#{month}/#{day}/#{slug}/"

    # Format date for display
    date_str = case date
               when Date, Time, DateTime
                 date.strftime('%b %-d, %Y')
               when String
                 date[0..9]
               else
                 ''
               end

    post_info = {
      title: title,
      description: description,
      url: url,
      date: date_str
    }

    tags.each { |tag| posts_by_tag[tag] << post_info }
  end

  posts_by_tag
end

def format_tag_name(tag)
  tag.split('-').map(&:capitalize).join(' ')
end

def escape_html(text)
  text.to_s
      .gsub('&', '&amp;')
      .gsub('<', '&lt;')
      .gsub('>', '&gt;')
      .gsub('"', '&quot;')
end

def generate_tag_page(tag, posts)
  tag_display = format_tag_name(tag)

  # Convert posts to proper format for YAML serialization
  posts_data = posts.map do |post|
    {
      'title' => post[:title].to_s,
      'description' => post[:description].to_s,
      'url' => post[:url],
      'date' => post[:date]
    }
  end

  frontmatter = {
    'layout' => 'tag-archive',
    'title' => "Posts tagged: #{tag_display}",
    'description' => "All WTF Just Happened Today posts about #{tag_display.downcase}",
    'tag_display' => tag_display,
    'posts_count' => posts.length,
    'sitemap' => false,
    'tag_posts' => posts_data
  }

  "---\n#{YAML.dump(frontmatter).sub(/\A---\n/, '')}---\n"
end

def generate_tag_index
  # Redirect /tags/ to /archive/ which now serves as the unified index
  <<~HTML
    ---
    layout: default
    title: "Browse the Archive"
    description: "Browse WTF Just Happened Today posts by topic and date"
    redirect_to: /archive/
    sitemap: false
    ---

    <meta http-equiv="refresh" content="0; url=/archive/">
    <p>Redirecting to <a href="/archive/">Browse the Archive</a>...</p>
  HTML
end

# Main execution
dry_run = ARGV.include?('--dry-run')

puts 'Scanning posts for tags...'
posts_by_tag = get_posts_by_tag

puts "Found #{posts_by_tag.length} tags with posts"

# Create tags directory
FileUtils.mkdir_p(TAGS_DIR) unless dry_run

# Generate individual tag pages
posts_by_tag.each do |tag, posts|
  tag_file = File.join(TAGS_DIR, "#{tag}.html")
  content = generate_tag_page(tag, posts)

  if dry_run
    puts "  Would create #{tag}.html (#{posts.length} posts)"
  else
    File.write(tag_file, content, encoding: 'UTF-8')
    puts "  Created #{tag}.html (#{posts.length} posts)"
  end
end

# Generate index page (redirect to /archive/)
index_file = File.join(TAGS_DIR, 'index.html')
index_content = generate_tag_index

if dry_run
  puts '  Would create index.html'
else
  File.write(index_file, index_content, encoding: 'UTF-8')
  puts '  Created index.html'
end

puts "\nDone! Generated #{posts_by_tag.length + 1} pages in #{TAGS_DIR}"
