# _plugins/years_ago_links.rb
require "date"

module Jekyll
  class YearsAgoLinks < Generator
    safe true
    priority :low  # runs before the JSON generator

    def generate(site)
      keep_years = site.config.dig("years_ago", "keep_years") # e.g., [1,5,6]; omit to include all

      # O(1) index: [year, month, day] -> post
      index = {}
      site.posts.docs.each do |p|
        d = p.data["date"]
        index[[d.year, d.month, d.day]] = p
      end

      site.posts.docs.each do |post|
        current_date   = post.data["date"]
        blog_start_y   = 2017
        current_year   = Date.today.year
        max_years_ago  = current_year - blog_start_y
        years_ago_data = []

        # Minimal years-ago data for frontend (relative URL, unchanged template)
        (1..max_years_ago).each do |years_ago|
          next if keep_years && !keep_years.include?(years_ago)

          y = current_date.year - years_ago
          m = current_date.month
          d = current_date.day
          d = 28 if m == 2 && d == 29 && !Date.leap?(y)  # Feb 29 adjust

          match = index[[y, m, d]]
          next unless match && match != post

          years_ago_data << {
            "years_ago" => years_ago,
            "title"     => match.data["title"],
            "desc"      => (match.data["description"] || "").to_s,
            "url"       => match.url  # keep RELATIVE for {{ link.url | absolute_url }} in your template
          }
        end

        post.data["years_ago_links"] = years_ago_data.sort_by { |h| h["years_ago"].to_i }

        # Optional: compute a yesterday link for templates if you ever render it
        prev = post.respond_to?(:previous) ? post.previous : nil
        if prev
          cd = post.data["date"].to_date
          pd = prev.data["date"].to_date
          if (cd - pd) == 1
            post.data["yesterday_link"] = {
              "label" => "Yesterday's news today",
              "title" => prev.data["title"],
              "desc"  => (prev.data["description"] || "").to_s,
              "url"   => prev.url  # RELATIVE
            }
          end
        end
      end
    end
  end
end