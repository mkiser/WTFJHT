module Jekyll
  module SanitizeXML
    def xml_sanitize(input)
      return "" if input.nil?
      s = input.to_s
      s = s.gsub(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/, "") # strip illegal controls
      s = s.gsub(/[\u200B-\u200D\uFEFF]/, "")                    # strip zero-width chars/BOM
      s.encode(xml: :text)
    end
  end
end
Liquid::Template.register_filter(Jekyll::SanitizeXML)
