require "yaml"

module EditionStats
  DEFAULTS = {
    "wpm" => 200,
    "source_words_per_story" => 600
  }.freeze

  ITEM_MARKER = /^\d+\//
  SIBLING_MARKER = /^(?:poll|study|forecast|bonus|report|notable)\/(?=\s|\z)/i
  ATX_HEADER = /^\#{1,6}\s/
  HR_LINE = /^-{3,}\s*$/
  DOT_MARKER = /^\s*\d+\.\s/
  BULLET_MARKER = /^\s*[*-]\s+\S/
  SOURCE_CITATION = /\((?:\s*\[[^\]]*\]\([^)]*\)\s*(?:[\/;,]\s*)?)+\)/
  UNICODE_SPACE = /[   -   　]/

  UNICODE_MAP = {
    "’" => "'", "‘" => "'", "“" => '"', "”" => '"',
    "—" => " ", "–" => " ", "…" => "..."
  }.freeze

  module_function

  def config(overrides = nil)
    base = DEFAULTS.dup
    return base unless overrides.is_a?(Hash)
    overrides.each { |k, v| base[k.to_s] = v if base.key?(k.to_s) }
    base
  end

  def prepare(text)
    text.to_s.gsub(UNICODE_SPACE, " ")
  end

  def normalize(text)
    s = prepare(text)
    s.gsub!(/<!--.*?-->/m, "")
    s.gsub!(/\{%.*?%\}/m, "")
    s.gsub!(/\{\{.*?\}\}/m, "")
    s.gsub!(%r{<blockquote[^>]*twitter-tweet.*?</blockquote>}m, "")
    s.gsub!(%r{<(script|iframe|figure|noscript)\b.*?</\1>}m, "")
    s.gsub!(SOURCE_CITATION, "")
    s.gsub!(/<[^>]+>/, "")
    s.gsub!(/^\#{1,6}\s.*$/, "")
    s.gsub!(HR_LINE, "")
    s.gsub!(/!\[[^\]]*\]\([^)]*\)/, "")
    s.gsub!(/\[([^\]]*)\]\([^)]*\)/) { Regexp.last_match(1) }
    s.gsub!(/[*_]{1,3}/, "")
    s.gsub!(/\\(.)/m) { Regexp.last_match(1) }
    s.gsub!(/^\s*>+\s*/, "")
    s.gsub!(/^\s*[*-]\s+/, "")
    s.gsub!(/^\s*\d+[\/.]\s*/, "")
    UNICODE_MAP.each { |from, to| s.gsub!(from, to) }
    s.gsub!(/[[:space:]]/, " ")
    s
  end

  def word_count(text)
    n = 0
    normalize(text).scan(/\S+/) { n += 1 }
    n
  end

  def credited?(line)
    return true if line.match?(ITEM_MARKER)
    return false unless line.match?(DOT_MARKER) || line.match?(BULLET_MARKER)
    line.match?(SOURCE_CITATION)
  end

  def story_count(body)
    prepare(body).split("\n", -1).count { |l| !l.match?(ATX_HEADER) && credited?(l) }
  end

  def compute(body, overrides = nil)
    cfg = config(overrides)
    wpm = cfg["wpm"].to_f
    raise ArgumentError, "wpm must be positive" unless wpm > 0

    stories = story_count(body)
    words = word_count(prepare(body))
    saved = (stories * cfg["source_words_per_story"].to_f - words) / wpm

    {
      "story_count" => stories,
      "word_count" => words,
      "time_saved" => saved.floor,
      "time_saved_raw" => saved
    }
  end
end
