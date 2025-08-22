require "time"

module YearsAgo
  module Utils
    module_function

    def cfg(site, *keys, default: nil)
      site.config.dig(*keys) || default
    end

    def absolutize(site, path)
      base = "#{cfg(site, "url", default: "")}#{cfg(site, "baseurl", default: "")}".sub(%r{/*$}, "")
      return path if path.to_s.start_with?("http://", "https://")
      "#{base}/#{path.to_s.sub(%r{^/}, "")}"
    end

    def md_to_plain(s)
      s = s.to_s
      s = s.gsub(/\[([^\]]+)\]\([^)]+\)/, '\1') 
      s = s.gsub(/!\[[^\]]*\]\([^)]+\)/, "")   
      s = s.gsub(/[*_`~#>]/, "")              
      s
    end

    def normalize_text(s)
      s.to_s.gsub(/[“”]/, '"').gsub(/[‘’]/, "'").gsub(/\s+/, " ").strip
    end

    def extract_today_in_one_sentence(doc)
      one = [
        doc.data["todayInOneSentence"],
        doc.data["today_in_one_sentence"],
        doc.data["today-in-one-sentence"]
      ].compact.map(&:to_s).map(&:strip).find { |v| !v.empty? }
      return normalize_text(one) if one && !one.empty?

      raw  = doc.content.to_s
      text = raw.gsub("\r\n", "\n")
      if (m = text.match(/today\s*,?\s*in\s+one\s+sentence\s*[:：]\s*(.+?)(?:\n{2,}|$)/i))
        return normalize_text(md_to_plain(m[1]))
      end

      lines = text.split("\n")
      idx   = lines.find_index { |ln| ln =~ /^[ #>*-]*today\s*,?\s*in\s+one\s+sentence\s*[:：]?\s*$/i }
      if idx
        i = idx + 1
        i += 1 while i < lines.length && lines[i].strip.empty?
        buff = []
        while i < lines.length && !lines[i].strip.empty?
          buff << lines[i]
          i += 1
        end
        return normalize_text(md_to_plain(buff.join(" ")))
      end

      "" 
    rescue
      ""
    end

    def fallback_summary_from_doc(site, doc)
      truncate_len = (cfg(site, "years_ago", "fallback_truncate_chars", default: 1000)).to_i
      txt = md_to_plain(doc.content.to_s).gsub(/\s+/, " ").strip
      txt.length > truncate_len ? (txt[0, truncate_len].rstrip + "…") : txt
    end

    def beats_from_summary(summary)
      normalize_text(summary).split(";").map { |s| normalize_text(s) }.reject(&:empty?)
    end

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

    def build_social_post(header:, beats:, abs_url:, max_chars:, max_beats:)
      clauses = beats.first(max_beats).map { |b| compress_phrase(b).sub(/\.\s*$/, "") }

      sentence = assemble_sentence(header, clauses)
      while (sentence.length + 1 + abs_url.length) > max_chars && clauses.size > 1
        clauses.pop
        sentence = assemble_sentence(header, clauses)
      end

      if (sentence.length + 1 + abs_url.length) > max_chars && !clauses.empty?
        fixed_prefix = "#{header} ".length + clauses[0..-2].join("; ").length
        fixed_prefix += 2 if clauses.size > 1 
        fixed_suffix = 1 + abs_url.length   
        room = max_chars - fixed_prefix - fixed_suffix - 1
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
  end
end
