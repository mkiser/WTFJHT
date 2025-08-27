require "json"
require "time"
require "date"
require_relative "years_ago_helpers"

module Jekyll
  class YearsAgoIndex < Generator
    safe true
    priority :lowest  

    def generate(site)
      max_chars = (YearsAgo::Utils.cfg(site, "years_ago", "max_chars", default: 240)).to_i
      max_beats = (YearsAgo::Utils.cfg(site, "years_ago", "max_beats", default: 5)).to_i

      latest = site.posts.docs.max_by { |p| p.data["date"] }
      return unless latest

      latest_abs = YearsAgo::Utils.absolutize(site, latest.url.to_s)

      url_map  = {}
      date_map = {}
      site.posts.docs.each do |p|
        url_map[p.url] = p
        d = p.data["date"]
        date_map[[d.year, d.month, d.day]] = p
      end

      yesterday = nil
      target_date = latest.data["date"].to_date - 1
      match = date_map[[target_date.year, target_date.month, target_date.day]]
      if match
        one = YearsAgo::Utils.extract_today_in_one_sentence(match)
        one = (match.data["description"] || "").to_s.strip if one.empty?
        one = YearsAgo::Utils.fallback_summary_from_doc(site, match) if one.empty?
        beats  = YearsAgo::Utils.beats_from_summary(one)
        yabs   = YearsAgo::Utils.absolutize(site, match.url)
        header = "✨ Yesterday's news today:"
        social = YearsAgo::Utils.build_social_post(
          header: header,
          beats: beats,
          abs_url: yabs,
          max_chars: max_chars,
          max_beats: max_beats
        )
        yesterday = {
          "label"        => "Yesterday's news today",
          "title"        => match.data["title"],
          "desc"         => (match.data["description"] || "").to_s,
          "one_sentence" => one,
          "beats"        => beats,
          "url"          => yabs,
          "social_post"  => social
        }
      end

      enriched = (latest.data["years_ago_links"] || [])
        .sort_by { |h| h["years_ago"].to_i }
        .map do |h|
          rel = h["url"].to_s
          rel = "/#{rel}" unless rel.start_with?("/")
          doc = url_map[rel]

          one   = ""
          beats = []
          if doc
            one = YearsAgo::Utils.extract_today_in_one_sentence(doc)
            one = (doc.data["description"] || "").to_s.strip if one.empty?
            one = YearsAgo::Utils.fallback_summary_from_doc(site, doc) if one.empty?
            beats = YearsAgo::Utils.beats_from_summary(one)
          end

          abs    = YearsAgo::Utils.absolutize(site, rel)
          header = YearsAgo::Utils.header_for_years(h["years_ago"].to_i)
          social = YearsAgo::Utils.build_social_post(
            header: header,
            beats: beats,
            abs_url: abs,
            max_chars: max_chars,
            max_beats: max_beats
          )

          {
            "years_ago"    => h["years_ago"],
            "title"        => h["title"],
            "desc"         => h["desc"] || "",
            "one_sentence" => one,
            "beats"        => beats,
            "url"          => abs,
            "social_post"  => social
          }
        end

      payload = {
        "generated_at" => Time.now.utc.iso8601,
        "latest_post"  => {
          "title" => latest.data["title"],
          "url"   => latest_abs,
          "date"  => latest.data["date"].iso8601
        },
        "yesterday_link"  => yesterday,         
        "years_ago_links" => enriched
      }

      page = Jekyll::PageWithoutAFile.new(site, site.source, "", "years-ago.json")
      page.content = JSON.pretty_generate(payload)
      page.data["layout"]  = nil
      page.data["sitemap"] = false
      site.pages << page

      # Jekyll.logger.info "years-ago.json", "emitted #{enriched.size} link(s)#{yesterday ? ' + yesterday' : ''}"
    end
  end
end
