# _plugins/years_ago_index.rb
require "json"
require "time"
require "date"
require_relative "years_ago_helpers"

module Jekyll
  class YearsAgoIndex < Generator
    safe true
    priority :lowest # run after the frontend links generator

    def generate(site)
      # knobs (safe defaults if not set)
      max_chars = (YearsAgo::Utils.cfg(site, "years_ago", "max_chars", default: 240)).to_i
      max_beats = (YearsAgo::Utils.cfg(site, "years_ago", "max_beats", default: 5)).to_i

      latest = site.posts.docs.max_by { |p| p.data["date"] }
      return unless latest

      latest_abs = YearsAgo::Utils.absolutize(site, latest.url.to_s)

      # ---- O(1) maps for lookups ----
      url_map  = {}
      date_map = {}
      site.posts.docs.each do |p|
        url_map[p.url] = p
        d = p.data["date"]
        date_map[[d.year, d.month, d.day]] = p
      end

      # ---------- YESTERDAY: strictly the calendar day before latest_post ----------
      yesterday = nil
      target_date = latest.data["date"].to_date - 1
      ydoc = date_map[[target_date.year, target_date.month, target_date.day]]
      if ydoc
        yone = YearsAgo::Utils.extract_today_in_one_sentence(ydoc)
        yone = (ydoc.data["description"] || "").to_s.strip if yone.empty?
        yone = YearsAgo::Utils.fallback_summary_from_doc(site, ydoc) if yone.empty?
        ybeats  = YearsAgo::Utils.beats_from_summary(yone)
        yabs    = YearsAgo::Utils.absolutize(site, ydoc.url)
        yheader = "✨ Yesterday's news today:"
        ysocial = YearsAgo::Utils.build_social_post(
          header:   yheader,
          beats:    ybeats,
          abs_url:  yabs,
          max_chars: max_chars,
          max_beats: max_beats
        )
        yesterday = {
          "label"        => "Yesterday's news today",
          "title"        => ydoc.data["title"],
          "desc"         => (ydoc.data["description"] || "").to_s,
          "one_sentence" => yone,
          "beats"        => ybeats,
          "url"          => yabs,
          "social_post"  => ysocial
        }
      end

      # ---------- YEARS-AGO: enrich with absolute URL, summaries, beats, social ----------
      base_links = (latest.data["years_ago_links"] || []).sort_by { |h| h["years_ago"].to_i }
      enriched = base_links.map do |h|
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
          header:   header,
          beats:    beats,
          abs_url:  abs,
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

      # ---------- Flattened items[] + posting order ----------
      items = []
      order = []

      if yesterday
        items << {
          "key"          => "yesterday",
          "type"         => "yesterday",
          "header"       => "✨ Yesterday's news today:",
          "label"        => "Yesterday's news today",
          "url"          => yesterday["url"],
          "beats"        => yesterday["beats"] || [],
          "one_sentence" => yesterday["one_sentence"] || "",
          "social_post"  => yesterday["social_post"]
        }
        order << "yesterday"
      end

      label_for = {
        1 => "✨ Last year today:",
        2 => "✨ Two years ago today:",
        3 => "✨ Three years ago today:",
        4 => "✨ Four years ago today:",
        5 => "✨ Five years ago today:",
        6 => "✨ Six years ago today:",
        7 => "✨ Seven years ago today:",
        8 => "✨ Eight years ago today:",
        9 => "✨ Nine years ago today:"
      }

      enriched.each do |h|
        yr   = h["years_ago"].to_i
        hdr  = label_for[yr] || "✨ #{yr} years ago today:"
        # key: stable + unique (years + date path + slug)
        date_path = h["url"][%r{/(\d{4}/\d{2}/\d{2})/}, 1] || ""
        slug      = h["url"].to_s.split("/").last(2).join("-")
        key       = "#{yr}y-#{date_path}-#{slug}"

        items << {
          "key"          => key,
          "type"         => "years_ago",
          "years_ago"    => yr,
          "header"       => hdr,
          "label"        => hdr.sub("✨ ", "").sub(":", ""),
          "url"          => h["url"],
          "beats"        => h["beats"] || [],
          "one_sentence" => h["one_sentence"] || "",
          "social_post"  => h["social_post"]
        }
        order << key
      end

      payload = {
        "generated_at" => Time.now.utc.iso8601,
        "latest_post"  => {
          "title" => latest.data["title"],
          "url"   => latest_abs,
          "date"  => latest.data["date"].iso8601
        },

        # keep existing fields for compatibility
        "yesterday_link"  => yesterday,
        "years_ago_links" => enriched,

        # new, LLM/zap-friendly section
        "meta"  => { "max_chars" => max_chars, "order" => order },
        "items" => items
      }

      page = Jekyll::PageWithoutAFile.new(site, site.source, "", "years-ago.json")
      page.content = JSON.pretty_generate(payload)
      page.data["layout"]  = nil
      page.data["sitemap"] = false
      site.pages << page

      Jekyll.logger.info "years-ago.json", "emitted #{enriched.size} link(s)#{yesterday ? ' + yesterday' : ''}"
    end
  end
end
