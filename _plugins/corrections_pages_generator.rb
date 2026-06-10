# Generates /corrections/<year>/ pages from _data/corrections.json and
# enriches each entry with its post's real URL (resolved from site.posts —
# never constructed by hand). Pages set sitemap: false (jekyll-sitemap honors it).
# Data contract: scripts/generate_corrections.py.

module Jekyll
  class CorrectionsYearPage < PageWithoutAFile
    def initialize(site, year)
      @site = site
      @base = site.source
      @dir  = File.join("corrections", year.to_s)
      @name = "index.html"
      process(@name)
      self.data = {
        "layout"  => "corrections-year",
        "title"   => "Corrections and Revisions: #{year}",
        "year"    => year,
        "sitemap" => false,
        "noindex" => true,
      }
      self.content = ""
    end
  end

  class CorrectionsGenerator < Generator
    safe true
    priority :low

    def generate(site)
      data = site.data["corrections"]
      return unless data && data["entries"] && !data["entries"].empty?

      url_map = {}
      site.posts.docs.each do |doc|
        url_map[File.basename(doc.path).sub(/\.(md|markdown)\z/, "")] = doc.url
      end
      data["entries"].each { |e| e["post_url"] = url_map[e["post"]] }

      data["entries"].map { |e| e["year"] }.uniq.each do |year|
        site.pages << CorrectionsYearPage.new(site, year)
      end

      Jekyll.logger.info "Corrections:", "#{data['entries'].length} entries, " \
        "#{data['entries'].map { |e| e['year'] }.uniq.length} year pages"
    end
  end
end
