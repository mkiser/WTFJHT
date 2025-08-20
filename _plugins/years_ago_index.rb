require "json"
require "time"

module Jekyll
  class YearsAgoIndex < Generator
    safe true
    priority :low  

    def generate(site)
      latest = site.posts.docs.max_by { |p| p.data["date"] }
      return unless latest

      links = latest.data["years_ago_links"] || []
      return if links.empty?

      base = "#{site.config['url']}#{site.config['baseurl']}".to_s.sub(%r{/*$}, "")

      normalize = proc do |path|
        path = path.to_s.sub(%r{^/}, "")
        "#{base}/#{path}"
      end

      payload = {
        "generated_at" => Time.now.utc.iso8601,
        "latest_post" => {
          "title" => latest.data["title"],
          "url"   => normalize.call(latest.url),
          "date"  => latest.data["date"].iso8601
        },
        "years_ago_links" => links
          .sort_by { |h| h["years_ago"].to_i }
          .map { |h|
            {
              "years_ago" => h["years_ago"],
              "title"     => h["title"],
              "desc"      => h["desc"] || "",
              "url"       => normalize.call(h["url"])
            }
          }
      }

      page = Jekyll::PageWithoutAFile.new(site, site.source, "", "years-ago.json")
      page.content = JSON.pretty_generate(payload)
      page.data["layout"] = nil
      page.data["sitemap"] = false

      site.pages << page
      Jekyll.logger.info "years-ago.json", "added virtual page with #{links.size} link(s)"
    end
  end
end
