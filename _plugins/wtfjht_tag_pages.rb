# Generates /tags/<slug>/ archive pages from post frontmatter at build time.
# Replaces the committed tags/*.html archives + scripts/generate_tag_pages.rb
# (both retired 2026-07-16). tags/index.html remains a committed static page:
# jekyll-redirect-from's generator runs at normal priority and must see it.
# Layout contract (_layouts/tag-archive.html): STRING-keyed page data —
# tag_display, posts_count, tag_posts[] of {url,title,description,date},
# with date preformatted "Mon D, YYYY". sitemap: false (jekyll-sitemap honors it).
# Structural guard only, not taxonomy validation: well-formed off-taxonomy
# slugs still get pages; malformed values warn + skip so one bad frontmatter
# edit can never block the daily build.
module Jekyll
  class TagArchivePage < PageWithoutAFile
    def initialize(site, slug, display, description, posts_data)
      @site = site
      @base = site.source
      @dir  = File.join("tags", slug)
      @name = "index.html"
      process(@name)
      self.data = {
        "layout"      => "tag-archive",
        "title"       => "Posts tagged: #{display}",
        "description" => description,
        "tag_display" => display,
        "tag_slug"    => slug,
        "posts_count" => posts_data.length,
        "sitemap"     => false,
        "tag_posts"   => posts_data,
      }
      self.content = ""
    end
  end

  class WtfjhtTagPagesGenerator < Generator
    safe true
    priority :low

    SLUG_RE  = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/
    RESERVED = %w(index).freeze

    def generate(site)
      # Tag pages are OFF the publish path (Matt, 2026-07-16): only the nightly
      # scheduled build (or a manual dispatch) sets BUILD_TAG_PAGES=true. On
      # skip builds S3 retains the previously deployed pages (deploy never
      # deletes), so staleness is bounded by the schedule — accepted tradeoff.
      unless ENV["BUILD_TAG_PAGES"] == "true"
        Jekyll.logger.info("TagPages:", "skipped (BUILD_TAG_PAGES != true; pages refresh on the scheduled build)")
        return
      end

      overrides    = site.data["tag_display"]
      overrides    = {} unless overrides.is_a?(Hash)
      descriptions = site.data["tag_descriptions"]
      descriptions = {} unless descriptions.is_a?(Hash)

      posts_by_tag = Hash.new { |h, k| h[k] = [] }
      site.posts.docs.reverse_each do |post|
        tags = post.data["tags"]
        next unless tags.is_a?(Array)
        tags.map(&:to_s).uniq.each do |tag|
          if SLUG_RE.match?(tag) && !RESERVED.include?(tag)
            posts_by_tag[tag] << post
          else
            Jekyll.logger.warn("TagPages:", "skipping invalid tag #{tag.inspect} in #{post.path}")
          end
        end
      end

      posts_by_tag.each do |slug, posts|
        begin
          display = overrides[slug].is_a?(String) ? overrides[slug] : slug.split("-").map(&:capitalize).join(" ")
          entry   = descriptions[slug]
          summary = entry.is_a?(Hash) ? entry["summary"] : nil
          description = if summary.is_a?(String) && !summary.strip.empty?
                          summary.strip.gsub(/\s+/, " ")
                        else
                          "All WTF Just Happened Today posts about #{display.downcase}"
                        end
          posts_data = posts.map do |post|
            {
              "title"       => (post.data["title"] || "").to_s,
              "description" => (post.data["description"] || "").to_s,
              "url"         => post.url,
              "date"        => post.date.strftime("%b %-d, %Y"),
            }
          end
          site.pages << TagArchivePage.new(site, slug, display, description, posts_data)
        rescue StandardError => e
          Jekyll.logger.error("TagPages:", "skipping tag #{slug.inspect}: #{e.class}: #{e.message}")
        end
      end
    end
  end
end
