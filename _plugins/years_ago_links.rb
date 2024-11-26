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
        target_date = (current_date - (years_ago * 365)).strftime('%Y-%m-%d')
        matching_post = site.posts.docs.find { |p| p.data['date'].strftime('%Y-%m-%d') == target_date }

        if matching_post
          years_ago_data << {
            'years_ago' => years_ago,
            'title' => matching_post.data['title'],
            'desc' => matching_post.data['description'] || '',
            'url' => matching_post.url
          }
        end
      end

      current_post.data['years_ago_links'] = years_ago_data
    end
  end
end
