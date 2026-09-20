require "json"
require "date"
require_relative "edition_stats/calculator"

module Jekyll
  class EditionStatsGenerator < Generator
    safe true
    priority :high

    ROLLUP_PATH = "api/v1/time-saved.json".freeze
    STAT_KEYS = %w[story_count word_count time_saved time_saved_raw].freeze
    WINDOWS = { "last_12_months" => 365 }.freeze

    def generate(site)
      settings = site.data["edition_stats"] || {}
      config = EditionStats.config(settings)
      measured = []

      eligible(site).each do |post|
        begin
          stats = EditionStats.compute(post.content, settings)
          post.data["edition_stats"] = stats.select { |k, _| STAT_KEYS.include?(k) }
          measured << [post, stats]
        rescue StandardError => e
          Jekyll.logger.warn "EditionStats:", "#{post.relative_path}: #{e.class}: #{e.message}"
        end
      end

      site.data["edition_stats_rollup"] = register_rollup(site, measured, config)
    rescue StandardError => e
      Jekyll.logger.error "EditionStats:", "disabled for this build: #{e.class}: #{e.message}"
    end

    private

    def eligible(site)
      site.posts.docs.reject do |post|
        post.data["draft"] || post.data["post_type"] == "week-in-review"
      end
    end

    def register_rollup(site, measured, config)
      data = rollup(site, measured, config)
      page = PageWithoutAFile.new(site, site.source, File.dirname(ROLLUP_PATH), File.basename(ROLLUP_PATH))
      page.content = JSON.pretty_generate(data)
      page.data["layout"] = nil
      page.data["sitemap"] = false
      page.data["render_with_liquid"] = false
      site.pages << page
      data
    end

    def rollup(site, measured, config)
      years = Hash.new { |h, k| h[k] = [] }
      measured.each { |post, stats| years[format("%04d", post.data["date"].year)] << stats }
      latest = measured.map { |post, _| post.data["date"] }.max

      {
        "as_of" => latest ? latest.to_date.iso8601 : nil,
        "method" => "Each credited story stands in for one #{config['source_words_per_story']}-word article, " \
                    "read at #{config['wpm']} words per minute, minus the time to read this briefing. " \
                    "A rough estimate under that assumption, not a measurement of any reader's time.",
        "words_per_minute" => config["wpm"],
        "words_per_source_article" => config["source_words_per_story"],
        "totals" => period(measured.map { |_, s| s }),
        "avg_hours_saved_per_year" => avg_hours_saved_per_year(measured),
        "windows" => windows(measured, latest),
        "by_year" => years.sort.to_h.transform_values { |s| period(s) }
      }
    end

    def avg_hours_saved_per_year(measured)
      return 0 if measured.empty?

      dates = measured.map { |post, _| post.data["date"].to_date }
      years = (dates.max - dates.min + 1).to_f / 365.25
      return 0 if years <= 0

      raw = measured.sum { |_, stats| stats["time_saved_raw"] }
      (raw / 60.0 / years).round
    end

    def windows(measured, latest)
      return {} unless latest

      anchor = latest.to_date
      WINDOWS.each_with_object({}) do |(name, days), out|
        cutoff = anchor - days
        out[name] = period(measured.select { |post, _| post.data["date"].to_date > cutoff }.map { |_, s| s })
      end
    end

    def period(stats)
      raw = stats.sum { |s| s["time_saved_raw"] }
      {
        "editions" => stats.length,
        "stories" => stats.sum { |s| s["story_count"] },
        "words" => stats.sum { |s| s["word_count"] },
        "hours_saved" => (raw / 60.0).round,
        "hours_saved_precise" => (raw / 60.0).round(1),
        "avg_minutes_per_edition" => stats.empty? ? 0 : (raw / stats.length).round,
        "avg_words_per_edition" => stats.empty? ? 0 : (stats.sum { |s| s["word_count"] } / stats.length)
      }
    end
  end
end
