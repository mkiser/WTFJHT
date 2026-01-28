# Jekyll plugin to generate a paragraph-level search index
# Each <p> and <li> becomes a separate searchable record
# Outputs to _site/search-index.json

require 'jekyll'
require 'json'
require 'nokogiri'

module Jekyll
  class SearchIndexGenerator < Generator
    safe true
    priority :lowest  # Run after other generators

    def generate(site)
      # Store reference to site for the hook
      @@site = site
    end

    def self.site
      @@site
    end
  end
end

# Use a hook that runs after the site is written
Jekyll::Hooks.register :site, :post_write do |site|
  Jekyll.logger.info "Search Index:", "Generating paragraph-level search index..."

  records = []
  record_id = 0

  # Process posts in reverse chronological order (newest first)
  site.posts.docs.reverse_each do |post|
    # Skip drafts
    next if post.data['draft']

    # Get post metadata
    url = post.url
    title = post.data['title'] || ''
    description = post.data['description'] || ''
    date = post.date.strftime('%Y-%m-%d')
    timestamp = post.date.to_i

    # Get rendered content from the output
    rendered_content = post.output

    # Skip if no output
    next unless rendered_content

    # Parse HTML with Nokogiri - parse the full page
    doc = Nokogiri::HTML(rendered_content)

    # Find the post content div
    post_content = doc.at_css('.post-content')
    next unless post_content

    # Track position within post
    position = 0

    # Extract paragraphs and list items from post content only
    post_content.css('p, li').each do |element|
      # Skip empty elements
      text = element.text.strip
      next if text.empty?

      # Skip very short content (likely just numbers or labels)
      next if text.length < 20

      # Skip elements inside code blocks or "today in one sentence"
      next if element.ancestors('pre, code').any?
      next if element.ancestors('.tios').any?
      next if element['class']&.include?('tios')

      # Skip poll elements
      next if element.parent&.name == 'poll'

      # Determine element type
      element_type = element.name == 'p' ? 'p' : 'li'

      # Clean up the text content
      content = clean_text(text)

      # Skip if content is still too short after cleaning
      next if content.length < 20

      records << {
        'id' => "#{post.data['slug'] || post.basename_without_ext}-#{record_id}",
        'url' => url,
        'title' => title,
        'description' => description,
        'date' => date,
        'timestamp' => timestamp,
        'content' => content,
        'type' => element_type,
        'position' => position
      }

      record_id += 1
      position += 1
    end
  end

  Jekyll.logger.info "Search Index:", "Generated #{records.length} records from #{site.posts.docs.length} posts"

  # Create the index data
  index_data = {
    'records' => records,
    'version' => 1,
    'generated' => Time.now.utc.iso8601
  }

  # Write to destination
  index_path = File.join(site.dest, 'search-index.json')

  File.open(index_path, 'w') do |f|
    f.write(JSON.generate(index_data))
  end

  Jekyll.logger.info "Search Index:", "Wrote #{File.size(index_path)} bytes to search-index.json"
end

def clean_text(text)
  # Remove extra whitespace
  text = text.gsub(/\s+/, ' ').strip

  # Remove common prefixes like "1/ " or "poll/ "
  text = text.gsub(/^[0-9]+\/\s*/, '')
  text = text.gsub(/^poll\/\s*/i, '')

  text.strip
end
