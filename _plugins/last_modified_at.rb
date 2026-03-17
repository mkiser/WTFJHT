# _plugins/last_modified_at.rb
#
# Sets `last_modified_at` on posts based on the newest post sharing the same
# calendar date (month/day) across all years.  This gives search engines a
# meaningful <lastmod> / dateModified without touching source files or git.
#
# Runs after YearsAgoLinks so the on-this-day index is already built.

module Jekyll
  class LastModifiedAt < Generator
    safe true
    priority :lowest

    def generate(site)
      # Build index: [month, day] -> array of posts
      by_month_day = Hash.new { |h, k| h[k] = [] }
      site.posts.docs.each do |post|
        d = post.data["date"]
        by_month_day[[d.month, d.day]] << post
      end

      by_month_day.each_value do |posts|
        # Find the newest post in this month/day group
        newest = posts.max_by { |p| p.data["date"] }

        posts.each do |post|
          # Only set last_modified_at when a newer sibling exists
          next if post == newest
          post.data["last_modified_at"] = newest.data["date"]
        end
      end
    end
  end
end
