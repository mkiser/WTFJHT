# h/t https://github.com/18F/jekyll-get
require 'open-uri'
require 'csv'

module Polls_Get
  class Generator < Jekyll::Generator
    safe true
    priority :highest

    def generate(site)
      config = site.config['polls_get']
      if !config
        return
      end
      if !config.kind_of?(Array)
        config = [config]
      end
      config.each do |d|
        begin
          source = open(d['csv'])
          # Assigns poll data to site.data[d['data']] variable
          site.data[d['data']] = CSV.read(source,:headers => true,:encoding => site.config["encoding"]).map(&:to_hash)
          # Uncomment to save data to _data folder
          # data_source = (site.config['data_source'] || '_data')
          # path = "#{data_source}/#{d['data']}.csv"
          # IO.copy_stream(source, path)
        rescue
          next
        end
      end
    end
  end
end