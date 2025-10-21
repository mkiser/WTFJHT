# _plugins/years_ago_helpers.rb
require "time"
require "cgi"

module YearsAgo
  module Utils
    module_function

    # Read nested config with a default
    def cfg(site, *keys, default: nil)
      site.config.dig(*keys) || default
    end

    # Build absolute URL from site.url + site.baseurl + path
    def absolutize(site, path)
      base = "#{cfg(site, "url", default: "")}#{cfg(site, "baseurl", default: "")}".sub(%r{/*$}, "")
      return path if path.to_s.start_with?("http://", "https://")
      "#{base}/#{path.to_s.sub(%r{^/}, "")}"
    end

    # ---------- Markdown/HTML → plain text helpers ----------

    def md_to_plain(s)
      s = s.to_s
      s = s.gsub(/\[([^\]]+)\]\([^)]+\)/, '\1') # [text](url) -> text
      s = s.gsub(/!\[[^\]]*\]\([^)]+\)/, "")   # remove images
      s = s.gsub(/[*_`~#>]/, "")               # strip md punctuation
      CGI.unescapeHTML(s)
    end

    def normalize_text(s)
      s.to_s.gsub(/[“”]/, '"').gsub(/[‘’]/, "'").gsub(/\s+/, " ").strip
    end

    # Extract "Today in one sentence" from front matter first; else parse content.
    def extract_today_in_one_sentence(doc)
      # 1) Prefer explicit front-matter keys
      one = [
        doc.data["todayInOneSentence"],
        doc.data["today_in_one_sentence"],
        doc.data["today-in-one-sentence"]
      ].compact.map(&:to_s).map(&:strip).find { |v| !v.empty? }
      return normalize_text(one) if one && !one.empty?

      # 2) Inline form (same-line) e.g. "**Today in one sentence:** Text…"
      raw  = doc.content.to_s
      text = raw.gsub("\r\n", "\n")
      if (m = text.match(/today\s*,?\s*in\s+one\s+sentence\s*[:：]\s*(.+?)(?:\n{2,}|$)/i))
        return normalize_text(md_to_plain(m[1]))
      end

      # 3) Heading line followed by a paragraph
      lines = text.split("\n")
      idx   = lines.find_index { |ln| ln =~ /^[ #>*-]*today\s*,?\s*in\s+one\s+sentence\s*[:：]?\s*$/i }
      if idx
        i = idx + 1
        i += 1 while i < lines.length && lines[i].strip.empty?
        buff = []
        while i < lines.length && !lines[i].strip.empty?
          buff << lines[i]; i += 1
        end
        return normalize_text(md_to_plain(buff.join(" ")))
      end

      "" # no match
    rescue
      ""
    end

    # Fallback summary when no "one sentence" exists
    def fallback_summary_from_doc(site, doc)
      truncate_len = (cfg(site, "years_ago", "fallback_truncate_chars", default: 1000)).to_i
      txt = md_to_plain(doc.content.to_s).gsub(/\s+/, " ").strip
      txt.length > truncate_len ? (txt[0, truncate_len].rstrip + "…") : txt
    end

    def beats_from_summary(summary)
      normalize_text(summary).split(";").map { |s| normalize_text(s) }.reject(&:empty?)
    end

    # ---------- Social line helpers ----------

    def header_for_years(n)
      case n
      when 1 then "✨ Last year today:"
      when 2 then "✨ Two years ago today:"
      when 3 then "✨ Three years ago today:"
      when 4 then "✨ Four years ago today:"
      when 5 then "✨ Five years ago today:"
      when 6 then "✨ Six years ago today:"
      when 7 then "✨ Seven years ago today:"
      when 8 then "✨ Eight years ago today:"
      when 9 then "✨ Nine years ago today:"
      else        "✨ #{n} years ago today:"
      end
    end

    # Small, safe compressions for character budget
    def compress_phrase(s)
      s = s.gsub(/\bUnited States\b/, "U.S.")
      s = s.gsub(/\bRepublicans\b/, "GOP")
      s = s.gsub(/\bDemocrats\b/, "Dems")
      s = s.gsub(/\badministration\b/, "admin")
      s = s.gsub(/\bDepartment of Justice\b/, "DOJ")
      s = s.gsub(/\bFederal Trade Commission\b/, "FTC")
      s = s.gsub(/\bAttorney General\b/, "AG")
      s = s.gsub(/\battorneys\b/, "attys")
      s = s.gsub(/\bpercent\b/i, "%")
      s.strip
    end

    def assemble_sentence(header, clauses)
      body = clauses.join("; ").sub(/^and\s+/i, "")
      "#{header} #{body}."
    end

    # Build a single-line social post ≤ max_chars (including URL)
    def build_social_post(header:, beats:, abs_url:, max_chars:, max_beats:)
      clauses = beats.first(max_beats).map { |b| compress_phrase(b).sub(/\.\s*$/, "") }
      sentence = assemble_sentence(header, clauses)

      # Drop last beats until within budget
      while (sentence.length + 1 + abs_url.length) > max_chars && clauses.size > 1
        clauses.pop
        sentence = assemble_sentence(header, clauses)
      end

      # Last resort: truncate last clause if still long
      if (sentence.length + 1 + abs_url.length) > max_chars && !clauses.empty?
        fixed_prefix = "#{header} ".length + clauses[0..-2].join("; ").length
        fixed_prefix += 2 if clauses.size > 1 # for "; "
        fixed_suffix = 1 + abs_url.length     # " " + URL
        room = max_chars - fixed_prefix - fixed_suffix - 1 # minus final period
        if room > 3
          clauses[-1] = clauses[-1][0, room - 1].rstrip + "…"
          sentence = assemble_sentence(header, clauses)
        else
          clauses.pop
          sentence = assemble_sentence(header, clauses)
        end
      end

      "#{sentence} #{abs_url}".strip
    end
    
    # Calculate read time string from document content
    def read_time_string(doc, reading_speed: 200)
      return "" unless doc

      # Strip HTML and count words
      words = doc.content.to_s.gsub(/<[^>]*>/, "").split.size
      
      # Format word count with commas
      word_count_str = words.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse
      
      # Calculate minutes
      minutes_decimal = words.to_f / reading_speed
      minutes_whole = minutes_decimal.floor
      minutes_fraction = minutes_decimal - minutes_whole
      
      # Determine minute display
      minute_str = if minutes_whole < 1 && minutes_fraction < 0.5
        "1-minute"
      elsif minutes_fraction < 0.25
        "#{minutes_whole}-minute"
      elsif minutes_fraction < 0.75
        "#{minutes_whole}½-minute"
      else
        "#{minutes_whole + 1}-minute"
      end
      
      "Today's edition is #{word_count_str} words, a #{minute_str} read."
    end

  end
end