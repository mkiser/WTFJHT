# TO DO: get list of links, format, and pass to frontend

# module Jekyll

#   class RiverPage < Page
#     def initialize(site, base, dir)
#       @site = site
#       @base = base
#       @dir = dir
#       @name = 'index.html'

#       self.process(@name)
#       self.read_yaml(File.join(base, '_layouts'), 'river.html')
#       self.data['title'] = "River of News"
#       self.data['content'] = ""
#     end
#   end

#   class CategoryPageGenerator < Generator
#     safe true

#     def generate(site)
#       dir = 'river'
#       site.pages << RiverPage.new(site, site.source, dir)
#     end
#   end

# end
