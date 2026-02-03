#!/usr/bin/env ruby
# frozen_string_literal: true

# Backfill tags for all posts based on synonym mappings.
#
# This script analyzes post content against _data/tag_synonyms.yml
# and adds missing tags where synonym terms are found.
#
# Usage:
#   ruby scripts/backfill_tags.rb              # Apply tags (writes files)
#   ruby scripts/backfill_tags.rb --dry-run    # Preview changes only
#   ruby scripts/backfill_tags.rb --verbose    # Show detailed matching info

require 'yaml'
require 'fileutils'

REPO_ROOT = File.expand_path('..', __dir__)
POSTS_DIR = File.join(REPO_ROOT, '_posts')
SYNONYMS_PATH = File.join(REPO_ROOT, '_data', 'tag_synonyms.yml')
TAXONOMY_PATH = File.join(REPO_ROOT, '_data', 'tag_taxonomy.yml')

MAX_TAGS = 5  # Maximum tags per post
MIN_MATCHES = 1  # Minimum synonym matches to add a tag

# Tags that are high-signal (single mention is enough)
HIGH_SIGNAL_TAGS = %w[
  lgbtq-rights
  reproductive-rights
  jan-6
  mueller-investigation
  impeachment
  classified-documents
  covid
].freeze

# Parse command line args
DRY_RUN = ARGV.include?('--dry-run')
VERBOSE = ARGV.include?('--verbose')

def load_synonyms
  synonyms = YAML.safe_load(File.read(SYNONYMS_PATH))

  # Build a reverse lookup: term -> [tags]
  # and a forward lookup: tag -> [terms]
  term_to_tags = Hash.new { |h, k| h[k] = [] }
  tag_to_terms = {}

  synonyms.each do |tag, terms|
    tag_to_terms[tag] = terms.map(&:downcase)
    terms.each do |term|
      term_to_tags[term.downcase] << tag
    end
  end

  [term_to_tags, tag_to_terms]
end

def load_taxonomy
  taxonomy = YAML.safe_load(File.read(TAXONOMY_PATH))
  taxonomy.values.flatten.to_set
end

def extract_frontmatter(content)
  return nil unless content.start_with?('---')

  parts = content.split('---', 3)
  return nil if parts.length < 3

  begin
    frontmatter = YAML.safe_load(parts[1], permitted_classes: [Date, Time])
    [frontmatter, parts[1], parts[2]]
  rescue StandardError => e
    puts "  YAML parse error: #{e.message}"
    nil
  end
end

def find_matching_tags(content, tag_to_terms, existing_tags)
  content_lower = content.downcase
  matches = Hash.new(0)

  tag_to_terms.each do |tag, terms|
    next if existing_tags.include?(tag)

    term_matches = []
    terms.each do |term|
      # Use word boundary matching for short terms to avoid false positives
      if term.length <= 3
        # Short terms: require word boundaries
        if content_lower =~ /\b#{Regexp.escape(term)}\b/i
          term_matches << term
        end
      else
        # Longer terms: simple include check is usually fine
        if content_lower.include?(term)
          term_matches << term
        end
      end
    end

    if term_matches.length >= MIN_MATCHES
      matches[tag] = term_matches.length
      if VERBOSE
        puts "    #{tag}: #{term_matches.length} matches (#{term_matches.first(3).join(', ')}#{term_matches.length > 3 ? '...' : ''})"
      end
    end
  end

  # Sort by number of matches, return tags
  matches.sort_by { |_, count| -count }.map(&:first)
end

def update_frontmatter_tags(frontmatter_str, new_tags)
  lines = frontmatter_str.lines

  # Find where tags section is and detect indentation style
  tags_start = nil
  tag_indent = ''

  lines.each_with_index do |line, i|
    if line.strip == 'tags:'
      tags_start = i
    elsif tags_start && line =~ /^(\s*)- \S/
      # Detect the indentation used for tag items
      tag_indent = $1
      break
    end
  end

  if tags_start
    # Find the end of tags list
    actual_end = tags_start
    (tags_start + 1...lines.length).each do |i|
      if lines[i] =~ /^#{Regexp.escape(tag_indent)}- /
        actual_end = i
      elsif lines[i] =~ /^\s*- / && tag_indent.empty?
        # No indent style - matches lines starting with "- "
        actual_end = i
      else
        break
      end
    end

    # Build new tags section using detected indentation
    new_tags_lines = ["tags:\n"] + new_tags.map { |t| "#{tag_indent}- #{t}\n" }

    lines = lines[0..tags_start - 1] + new_tags_lines + lines[actual_end + 1..-1]
  else
    # No tags section, add at the end (use no indent to match common style)
    new_tags_lines = ["tags:\n"] + new_tags.map { |t| "- #{t}\n" }
    lines = lines + new_tags_lines
  end

  lines.join
end

# Main execution
puts "Loading synonyms from #{SYNONYMS_PATH}..."
term_to_tags, tag_to_terms = load_synonyms
puts "Loaded #{tag_to_terms.length} tags with synonyms"

puts "Loading taxonomy from #{TAXONOMY_PATH}..."
valid_tags = load_taxonomy
puts "Loaded #{valid_tags.length} valid tags"

puts "\nScanning posts..."
puts "Mode: #{DRY_RUN ? 'DRY RUN (no files will be modified)' : 'LIVE (files will be updated)'}"
puts "Min matches required: #{MIN_MATCHES}"
puts "-" * 60

post_files = Dir.glob(File.join(POSTS_DIR, '*.{md,markdown}')).sort
total_posts = post_files.length
posts_updated = 0
tags_added_total = 0
skipped_at_max = 0

post_files.each_with_index do |filepath, index|
  filename = File.basename(filepath)

  content = File.read(filepath, encoding: 'UTF-8')
  result = extract_frontmatter(content)

  unless result
    puts "[#{index + 1}/#{total_posts}] #{filename}: Could not parse frontmatter, skipping"
    next
  end

  frontmatter, frontmatter_str, body = result
  existing_tags = (frontmatter['tags'] || []).map(&:to_s)

  # Skip if already at max tags
  if existing_tags.length >= MAX_TAGS
    skipped_at_max += 1
    if VERBOSE
      puts "[#{index + 1}/#{total_posts}] #{filename}: Already has #{existing_tags.length} tags, skipping"
    end
    next
  end

  # Find matching tags based on content
  full_content = "#{frontmatter['title']} #{frontmatter['description']} #{body}"
  matching_tags = find_matching_tags(full_content, tag_to_terms, existing_tags)

  # Only add valid taxonomy tags
  matching_tags = matching_tags.select { |t| valid_tags.include?(t) }

  # Limit to not exceed MAX_TAGS
  slots_available = MAX_TAGS - existing_tags.length
  tags_to_add = matching_tags.first(slots_available)

  if tags_to_add.empty?
    if VERBOSE && (index + 1) % 100 == 0
      puts "[#{index + 1}/#{total_posts}] #{filename}: No new tags to add"
    end
    next
  end

  new_tags = existing_tags + tags_to_add

  puts "[#{index + 1}/#{total_posts}] #{filename}"
  puts "  Existing: #{existing_tags.join(', ')}"
  puts "  Adding:   #{tags_to_add.join(', ')}"

  unless DRY_RUN
    # Rebuild the file with updated frontmatter
    new_frontmatter_str = update_frontmatter_tags(frontmatter_str, new_tags)
    new_content = "---#{new_frontmatter_str}---#{body}"

    File.write(filepath, new_content, encoding: 'UTF-8')
  end

  posts_updated += 1
  tags_added_total += tags_to_add.length
end

puts "-" * 60
puts "\nSummary:"
puts "  Posts scanned:     #{total_posts}"
puts "  Posts updated:     #{posts_updated}"
puts "  Posts at max tags: #{skipped_at_max} (skipped)"
puts "  Tags added:        #{tags_added_total}"
puts "\n#{DRY_RUN ? 'DRY RUN - no files were modified' : 'Done! Files have been updated.'}"
