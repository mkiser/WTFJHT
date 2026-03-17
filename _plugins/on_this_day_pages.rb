# _plugins/on_this_day_pages.rb
#
# Generates 366 "On This Day" pages (one per calendar date, including Feb 29).
# Each page lists every post published on that month/day across all years.
#
# URLs:  /on-this-day/january-1/
#        /on-this-day/march-17/
#        /on-this-day/february-29/

require "date"

module Jekyll
  class OnThisDayPages < Generator
    safe true
    priority :low

    MONTH_NAMES = %w[
      january february march april may june
      july august september october november december
    ].freeze

    MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].freeze

    def generate(site)
      # Build index: [month, day] -> array of posts (sorted oldest-first)
      index = Hash.new { |h, k| h[k] = [] }
      site.posts.docs.each do |post|
        d = post.data["date"]
        index[[d.month, d.day]] << post
      end

      # Generate one page per calendar date (only if posts exist)
      MONTH_DAYS.each_with_index do |days, month_idx|
        month = month_idx + 1
        month_name = MONTH_NAMES[month_idx]
        month_name_cap = month_name.capitalize

        (1..days).each do |day|
          posts = index[[month, day]]
          next if posts.empty?

          # Sort chronologically (oldest first)
          posts.sort_by! { |p| p.data["date"] }

          slug = "#{month_name}-#{day}"
          years = posts.map { |p| p.data["date"].year }
          min_year = years.min
          max_year = years.max

          post_data = posts.map do |p|
            title = p.data["title"] || ""
            # Extract the day number from "Day N" title
            day_number = title.match(/Day\s+(\d+)/i) ? $1.to_i : nil

            {
              "year"        => p.data["date"].year,
              "title"       => title,
              "description" => (p.data["todayInOneSentence"] || p.data["description"] || "").to_s,
              "url"         => p.url,
              "date"        => p.data["date"],
              "day_number"  => day_number,
            }
          end

          newest_date = posts.last.data["date"]

          page = PageWithoutAFile.new(site, site.source, "on-this-day/#{slug}", "index.html")
          page.data.merge!(
            "layout"           => "on-this-day",
            "title"            => "On This Day: #{month_name_cap} #{day}",
            "description"      => "Every #{month_name_cap} #{day} post from WTF Just Happened Today?, spanning #{min_year} to #{max_year}",
            "image"            => "/uploads/og-image.jpg",
            "month_name"       => month_name_cap,
            "day_number"       => day,
            "month_day_slug"   => slug,
            "posts"            => post_data,
            "last_modified_at" => newest_date,
            "sitemap"          => true,
            "seo"              => { "type" => "CollectionPage" },
          )

          site.pages << page
        end
      end
    end
  end
end
