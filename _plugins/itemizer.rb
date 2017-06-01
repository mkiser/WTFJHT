# Jekyll plugin to itemize each post for JSON output
# Parses the current pattern of every item beginning with
# <p><Number>/ ...
require 'jekyll'
require 'json'


module Jekyll
  module Itemizer

    def itemize(post)


      item_list = post.content.split(/<p>\d\//).slice(1..-1)
      items = Hash[(1...item_list.size).zip item_list]
      output = ({
        :title        => post['title'],
        :description  => post['description'],
        :date         => post['date'],
        :items        => items
      })

      output.to_json
    end

  end
end
Liquid::Template.register_filter(Jekyll::Itemizer)