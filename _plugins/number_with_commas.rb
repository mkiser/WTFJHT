module Jekyll
  module NumberWithCommasFilter
    def number_with_commas(input)
      input.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse
    end
  end
end

Liquid::Template.register_filter(Jekyll::NumberWithCommasFilter)
