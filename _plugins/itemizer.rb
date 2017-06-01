# Jekyll plugin to itemize each post for JSON output
# Parses the current pattern of every item beginning with
# <p><Number>/ ...

require 'jekyll'
require 'json'


module Jekyll
  module Itemizer

    def itemize(post)

      # splits the contents into items for each story. Slice off
      # the first one, since it's an empty string
      item_list = post.content.split(/<p>\d\//).slice(1..-1)

      # make the list into an indexed array
      items = Hash[(1...item_list.size).zip item_list]

      # setup the entire output with any other desired keys
      output = ({
        :title        => post['title'],
        :description  => post['description'],
        :date         => post['date'],
        :items        => items
      })

      # ship it!
      output.to_json
    end

  end
end
Liquid::Template.register_filter(Jekyll::Itemizer)