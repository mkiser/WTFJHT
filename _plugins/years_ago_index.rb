# _plugins/years_ago_index.rb
require "json"
require "time"
require "date"
require_relative "years_ago_helpers"

module Jekyll
  class YearsAgoIndex < Generator
    safe true
    priority :lowest  # run after YearsAgoLinks

    def generate(site)
      max_chars = (YearsAgo::Utils.cfg(site, "years_ago", "max_chars", default: 240)).to_i
      max_beats = (YearsAgo::Utils.cfg(site, "years_ago", "max_beats", default: 5)).to_i

      latest = site.posts.docs.max_by { |p| p.data["date"] }
      return unless latest

      latest_abs   = YearsAgo::Utils.absolutize(site, latest.url.to_s)
      edition_time = latest.data["date"]               # Time object
      edition_iso  = edition_time.iso8601              # e.g., "2025-10-08T15:47:00-07:00"
      run_day      = edition_time.to_date.iso8601      # e.g., "2025-10-08"  (stable per edition)

      # O(1) maps
      url_map  = {}
      date_map = {}
      site.posts.docs.each do |p|
        url_map[p.url] = p
        d = p.data["date"]
        date_map[[d.year, d.month, d.day]] = p
      end

      # ---------- Yesterday (strict calendar day before latest) ----------
      items = []
      order = []

      target_date = edition_time.to_date - 1
      ydoc = date_map[[target_date.year, target_date.month, target_date.day]]
      if ydoc
        yone   = YearsAgo::Utils.extract_today_in_one_sentence(ydoc)
        yone   = (ydoc.data["description"] || "").to_s.strip if yone.empty?
        yone   = YearsAgo::Utils.fallback_summary_from_doc(site, ydoc) if yone.empty?
        ybeats = YearsAgo::Utils.beats_from_summary(yone)
        yabs   = YearsAgo::Utils.absolutize(site, ydoc.url)
        yhead  = "✨ Yesterday's news today:"
        ypost  = YearsAgo::Utils.build_social_post(
          header:    yhead,
          beats:     ybeats,
          abs_url:   yabs,
          max_chars: max_chars,
          max_beats: max_beats
        )

        items << {
          "key"          => "yesterday",
          "type"         => "yesterday",
          "years_ago"    => nil,
          "label"        => "Yesterday's news today",
          "header"       => yhead,
          "url"          => yabs,
          "one_sentence" => yone,
          "beats"        => ybeats,
          "social_post"  => ypost,
          "item_date"    => ydoc.data["date"].iso8601   # the yesterday post's own timestamp
        }
        order << "yesterday"
      end

      # ---------- Years-ago links (enrich with summaries, beats, social) ----------
      base_links = (latest.data["years_ago_links"] || []).sort_by { |h| h["years_ago"].to_i }

      base_links.each do |h|
        rel = h["url"].to_s
        rel = "/#{rel}" unless rel.start_with?("/")
        doc = url_map[rel]

        one   = ""
        beats = []
        item_iso = nil

        if doc
          one = YearsAgo::Utils.extract_today_in_one_sentence(doc)
          one = (doc.data["description"] || "").to_s.strip if one.empty?
          one = YearsAgo::Utils.fallback_summary_from_doc(site, doc) if one.empty?
          beats = YearsAgo::Utils.beats_from_summary(one)
          item_iso = doc.data["date"].iso8601
        end

        abs    = YearsAgo::Utils.absolutize(site, rel)
        yr     = h["years_ago"].to_i
        header = YearsAgo::Utils.header_for_years(yr)
        post   = YearsAgo::Utils.build_social_post(
          header:    header,
          beats:     beats,
          abs_url:   abs,
          max_chars: max_chars,
          max_beats: max_beats
        )

        # stable key: "#{yr}y-YYYY/MM/DD-last-two-slugs"
        date_path = abs[%r{/(\d{4}/\d{2}/\d{2})/}, 1] || ""
        slug      = abs.to_s.split("/").last(2).join("-")
        key       = "#{yr}y-#{date_path}-#{slug}"

        items << {
          "key"          => key,
          "type"         => "years_ago",
          "years_ago"    => yr,
          "label"        => header.sub("✨ ", "").sub(":", ""),
          "header"       => header,
          "url"          => abs,
          "one_sentence" => one,
          "beats"        => beats,
          "social_post"  => post,
          "item_date"    => item_iso
        }
        order << key
      end

      # ---------- Unified array feed (newest first), with stable per-day dedupe ----------
      by_key = {}
      items.each { |i| by_key[i["key"]] = i }

      array = order.map do |k|
        i = by_key[k]
        next nil unless i

        dedupe_key = "#{run_day}:#{i['key']}"  # stable per edition day
        {
          "id"           => dedupe_key,        # Zapier's dedupe field
          "dedupe_key"   => dedupe_key,        # explicit, if a tool wants a named field
          "published_on" => run_day,           # the edition day (YYYY-MM-DD)
          "created_at"   => edition_iso,       # exact edition timestamp (stable)
          "key"          => i["key"],
          "type"         => i["type"],         # "yesterday" | "years_ago"
          "years_ago"    => i["years_ago"],
          "label"        => i["label"],
          "header"       => i["header"],
          "url"          => i["url"],
          "one_sentence" => i["one_sentence"],
          "beats"        => i["beats"] || [],
          "social_post"  => i["social_post"],
          "item_date"    => i["item_date"]     # the linked post's own date/time
        }
      end.compact

      unified = Jekyll::PageWithoutAFile.new(site, site.source, "", "social-feed.json")
      unified.content = JSON.pretty_generate(array)
      unified.data["layout"]  = nil
      unified.data["sitemap"] = false
      site.pages << unified

      Jekyll.logger.info "social-feed.json", "emitted #{array.size} items (newest first; run_day=#{run_day})"
    end
  end
end