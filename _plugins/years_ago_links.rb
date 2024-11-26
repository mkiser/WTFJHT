module Jekyll
  class YearsAgoLinks < Generator
    safe true

    def generate(site)
      site.posts.docs.each do |post|
        generate_years_ago_links(site, post)
      end
    end

    private

    def generate_years_ago_links(site, current_post)
      current_date = current_post.data['date']
      years_ago_data = []

      # Iterate for 1 to 6 years ago
      (1..6).each do |years_ago|
        target_year = current_date.year - years_ago
        target_month = current_date.month
        target_day = current_date.day

        # Find a post with the same month and day in the target year
        matching_post = site.posts.docs.find do |p|
          p.data['date'].year == target_year &&
          p.data['date'].month == target_month &&
          p.data['date'].day == target_day &&
          p != current_post
        end

        if matching_post
          years_ago_data << {
            'years_ago' => years_ago,
            'title' => matching_post.data['title'],
            'desc' => matching_post.data['description'] || '',
            'url' => matching_post.url
          }
        end
      end

      # Store the collected data in the current post
      current_post.data['years_ago_links'] = years_ago_data
    end
  end
end
