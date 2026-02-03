# frozen_string_literal: true

# WTFJHT Customized SEO Tag
# Based on jekyll-seo-tag v2.8.0, vendored for customization
#
# Customizations:
# - Posts use combined "Day X: quote" as page_title for social/schema
# - Posts use todayInOneSentence as description instead of the punchy quote
# - Template customized for WTFJHT content structure

require "jekyll"

module Jekyll
  class SeoTag < Liquid::Tag
    VERSION = "2.8.0-wtfjht"

    # ==================== URL Helper ====================
    module UrlHelper
      private

      def absolute_url?(string)
        return unless string
        Addressable::URI.parse(string).absolute?
      rescue Addressable::URI::InvalidURIError
        nil
      end
    end

    # ==================== Filters ====================
    class Filters
      include Jekyll::Filters
      include Liquid::StandardFilters

      def initialize(context)
        @context = context
      end
    end

    # ==================== Author Drop ====================
    class AuthorDrop < Jekyll::Drops::Drop
      def initialize(page: nil, site: nil)
        @mutations = {}
        @page = page
        @site = site
      end

      def fallback_data
        @fallback_data ||= {}
      end

      def name
        @name ||= begin
          return author_hash["name"] if author_hash["name"]
          return author_hash.to_s unless author_hash.respond_to?(:to_hash)
        end
      end

      def twitter
        @twitter ||= author_hash["twitter"]&.delete_prefix("@")
      end

      def [](key)
        return nil unless author_hash.respond_to?(:[])
        author_hash[key]
      end

      def to_h
        return {} unless author_hash.respond_to?(:to_hash)
        author_hash.to_hash
      end

      private

      def author_hash
        @author_hash ||= begin
          return {} unless page_author || site_author
          if page_author.is_a?(String)
            site_author_hash(page_author) || { "name" => page_author }
          elsif page_author.is_a?(Hash)
            page_author
          elsif site_author.is_a?(Hash)
            site_author
          else
            { "name" => site_author.to_s }
          end
        end
      end

      def page_author
        @page["author"]
      end

      def site_author
        @site["author"]
      end

      def site_author_hash(author_name)
        return unless @site["data"] && @site["data"]["authors"]
        @site["data"]["authors"][author_name]
      end
    end

    # ==================== Image Drop ====================
    class ImageDrop < Jekyll::Drops::Drop
      include UrlHelper

      def initialize(page: nil, context: nil)
        @mutations = {}
        @page = page
        @context = context
      end

      def fallback_data
        @fallback_data ||= {}
      end

      def path
        @path ||= begin
          img = raw_image
          return unless img

          if img.is_a?(String)
            absolute_or_url(img)
          elsif img.is_a?(Hash) && img["path"]
            absolute_or_url(img["path"])
          elsif img.is_a?(Hash) && img["facebook"]
            absolute_or_url(img["facebook"])
          end
        end
      end

      def raw_image
        @raw_image ||= begin
          page_data = @context.registers[:page]
          img = nil
          if page_data.respond_to?(:data) && page_data.data["image"]
            img = page_data.data["image"]
          elsif page_data.respond_to?(:[]) && page_data["image"]
            img = page_data["image"]
          elsif @page.respond_to?(:[]) && @page["image"]
            img = @page["image"]
          end
          img
        end
      end

      def height
        return unless image_hash.is_a?(Hash)
        image_hash["height"]
      end

      def width
        return unless image_hash.is_a?(Hash)
        image_hash["width"]
      end

      def alt
        return unless image_hash.is_a?(Hash)
        image_hash["alt"]
      end

      def [](key)
        return nil unless image_hash.is_a?(Hash)
        image_hash[key]
      end

      def to_h
        return {} unless image_hash.is_a?(Hash)
        image_hash.to_hash
      end

      private

      def absolute_or_url(img_path)
        return nil if img_path.nil? || img_path.to_s.empty?
        return img_path if absolute_url?(img_path)
        # Build absolute URL directly using site context
        site = @context.registers[:site]
        base_url = site.config["url"].to_s.chomp("/")
        base_path = site.config["baseurl"].to_s
        "#{base_url}#{base_path}#{img_path}"
      end

      def image_hash
        @image_hash ||= raw_image
      end
    end

    # ==================== Main Drop ====================
    class Drop < Jekyll::Drops::Drop
      include UrlHelper

      TITLE_SEPARATOR = " | "
      FORMAT_STRING_METHODS = [:markdownify, :strip_html, :normalize_whitespace, :escape_once].freeze
      HOMEPAGE_OR_ABOUT_REGEX = %r!^/(about/)?(index.html?)?$!.freeze
      EMPTY_READ_ONLY_HASH = {}.freeze
      private_constant :EMPTY_READ_ONLY_HASH

      def initialize(text, context)
        @obj = EMPTY_READ_ONLY_HASH
        @mutations = {}
        @text = text
        @context = context
      end

      def version
        VERSION
      end

      def title?
        return false unless title
        return @display_title if defined?(@display_title)
        @display_title = (@text !~ %r!title=false!i)
      end

      def site_title
        @site_title ||= format_string(site["title"] || site["name"])
      end

      def site_tagline
        @site_tagline ||= format_string site["tagline"]
      end

      def site_description
        @site_description ||= format_string site["description"]
      end

      # Page title without site title or description appended
      # WTFJHT Customization: For posts, combine title and description
      # e.g., "Day 1840: 'An unfolding emergency.'"
      def page_title
        @page_title ||= begin
          if page["layout"] == "post" && page["description"]
            format_string("#{page["title"]}: #{page["description"]}")
          else
            format_string(page["title"]) || site_title
          end
        end
      end

      def site_tagline_or_description
        site_tagline || site_description
      end

      def title
        @title ||= begin
          if site_title && page_title != site_title
            page_title + TITLE_SEPARATOR + site_title
          elsif site_description && site_title
            site_title + TITLE_SEPARATOR + site_tagline_or_description
          else
            page_title || site_title
          end
        end
        return page_number + @title if page_number
        @title
      end

      def name
        return @name if defined?(@name)
        @name = if seo_name
                  seo_name
                elsif !homepage_or_about?
                  nil
                elsif site_social["name"]
                  format_string site_social["name"]
                elsif site_title
                  site_title
                end
      end

      # WTFJHT Customization: For posts, prefer todayInOneSentence as description
      # Falls back to excerpt (first paragraph) to avoid duplicating the title
      def description
        @description ||= begin
          if page["layout"] == "post"
            # First choice: todayInOneSentence (the real summary)
            if page["todayInOneSentence"] && !page["todayInOneSentence"].to_s.empty?
              format_string(page["todayInOneSentence"])
            # Second choice: excerpt from content (avoids duplicating title)
            elsif page["excerpt"] && !page["excerpt"].to_s.strip.empty?
              format_string(page["excerpt"])
            # Final fallback for posts
            else
              site_description
            end
          else
            # Non-posts: use description field or excerpt
            format_string(page["description"] || page["excerpt"]) || site_description
          end
        end
      end

      def author
        @author ||= AuthorDrop.new(:page => page, :site => site)
      end

      def json_ld
        @json_ld ||= JSONLDDrop.new(self)
      end

      def image
        @image ||= ImageDrop.new(:page => page, :context => @context)
        @image if @image.path
      end

      # Direct access to image path for templates
      def image_path
        image&.path
      end

      def date_modified
        @date_modified ||= begin
          date = page_seo["date_modified"] || page["last_modified_at"].to_liquid || page["date"]
          filters.date_to_xmlschema(date) if date
        end
      end

      def date_published
        @date_published ||= filters.date_to_xmlschema(page["date"]) if page["date"]
      end

      def type
        @type ||= begin
          if page_seo["type"]
            page_seo["type"]
          elsif homepage_or_about?
            "WebSite"
          elsif page["date"]
            "BlogPosting"
          else
            "WebPage"
          end
        end
      end

      def links
        @links ||= begin
          if page_seo["links"]
            page_seo["links"]
          elsif homepage_or_about? && site_social["links"]
            site_social["links"]
          end
        end
      end

      def logo
        @logo ||= begin
          return unless site["logo"]
          if absolute_url? site["logo"]
            filters.uri_escape site["logo"]
          else
            filters.uri_escape filters.absolute_url site["logo"]
          end
        end
      end

      def page_lang
        @page_lang ||= page["lang"] || site["lang"] || "en_US"
      end

      def page_locale
        @page_locale ||= (page["locale"] || site["locale"] || page_lang).tr("-", "_")
      end

      def canonical_url
        @canonical_url ||= begin
          if page["canonical_url"].to_s.empty?
            filters.absolute_url(page["url"]).to_s.gsub(%r!/index\.html$!, "/")
          else
            page["canonical_url"]
          end
        end
      end

      private

      def filters
        @filters ||= Filters.new(@context)
      end

      def page
        @page ||= @context.registers[:page].to_liquid
      end

      def site
        @site ||= @context.registers[:site].site_payload["site"].to_liquid
      end

      def homepage_or_about?
        page["url"] =~ HOMEPAGE_OR_ABOUT_REGEX
      end

      def page_number
        return unless @context["paginator"] && @context["paginator"]["page"]
        current = @context["paginator"]["page"]
        total = @context["paginator"]["total_pages"]
        paginator_message = site["seo_paginator_message"] || "Page %<current>s of %<total>s for "
        format(paginator_message, :current => current, :total => total) if current > 1
      end

      attr_reader :context

      def fallback_data
        @fallback_data ||= {}
      end

      def format_string(string)
        string = FORMAT_STRING_METHODS.reduce(string) do |memo, method|
          filters.public_send(method, memo)
        end
        string unless string.empty?
      end

      def seo_name
        @seo_name ||= format_string(page_seo["name"]) if page_seo["name"]
      end

      def page_seo
        @page_seo ||= sub_hash(page, "seo")
      end

      def site_social
        @site_social ||= sub_hash(site, "social")
      end

      def sub_hash(hash, key)
        if hash[key].is_a?(Hash)
          hash[key]
        else
          EMPTY_READ_ONLY_HASH
        end
      end
    end

    # ==================== JSON-LD Drop ====================
    class JSONLDDrop < Jekyll::Drops::Drop
      extend Forwardable

      def_delegator :page_drop, :name,           :name
      def_delegator :page_drop, :description,    :description
      def_delegator :page_drop, :canonical_url,  :url
      def_delegator :page_drop, :page_title,     :headline
      def_delegator :page_drop, :date_modified,  :dateModified
      def_delegator :page_drop, :date_published, :datePublished
      def_delegator :page_drop, :links,          :sameAs
      def_delegator :page_drop, :logo,           :logo
      def_delegator :page_drop, :type,           :type

      alias_method :@type, :type
      private :type, :logo

      VALID_ENTITY_TYPES = %w(BlogPosting CreativeWork).freeze
      VALID_AUTHOR_TYPES = %w(Organization Person).freeze
      private_constant :VALID_ENTITY_TYPES, :VALID_AUTHOR_TYPES

      def initialize(page_drop)
        @mutations = {}
        @page_drop = page_drop
      end

      def fallback_data
        @fallback_data ||= { "@context" => "https://schema.org" }
      end

      def author
        return unless page_drop.author["name"]
        author_type = page_drop.author["type"]
        return if author_type && !VALID_AUTHOR_TYPES.include?(author_type)
        hash = { "@type" => author_type || "Person", "name" => page_drop.author["name"] }
        author_url = page_drop.author["url"]
        hash["url"] = author_url if author_url
        hash
      end

      def image
        return unless page_drop.image
        return page_drop.image.path if page_drop.image.keys.length == 1
        hash = page_drop.image.to_h
        hash["url"] = hash.delete("path")
        hash["@type"] = "imageObject"
        hash
      end

      def publisher
        return unless logo
        output = { "@type" => "Organization", "logo" => { "@type" => "ImageObject", "url" => logo } }
        output["name"] = page_drop.author.name if page_drop.author.name
        output
      end

      def main_entity
        return unless VALID_ENTITY_TYPES.include?(type)
        { "@type" => "WebPage", "@id" => page_drop.canonical_url }
      end
      alias_method :mainEntityOfPage, :main_entity
      private :main_entity

      def to_json(state = nil)
        keys.sort.each_with_object({}) do |(key, _), result|
          v = self[key]
          result[key] = v unless v.nil?
        end.to_json(state)
      end

      private

      attr_reader :page_drop
    end

    # ==================== Main Tag ====================
    attr_accessor :context

    MINIFY_REGEX = %r!(?<=[{}]|[>,]\n)\s+(?\!-)!.freeze

    def initialize(_tag_name, text, _tokens)
      super
      @text = text
    end

    def render(context)
      @context = context
      SeoTag.template.render!(payload, info)
    end

    private

    def options
      { "version" => VERSION, "title" => title? }
    end

    def payload
      context.registers[:site].site_payload.tap do |site_payload|
        site_payload["page"] = context.registers[:page]
        site_payload["paginator"] = context["paginator"]
        site_payload["seo_tag"] = drop
      end
    end

    def drop
      if context.registers[:site].liquid_renderer.respond_to?(:cache)
        Drop.new(@text, @context)
      else
        @drop ||= Drop.new(@text, @context)
      end
    end

    def info
      { :registers => context.registers, :filters => [Jekyll::Filters] }
    end

    class << self
      def template
        @template ||= Liquid::Template.parse template_contents
      end

      private

      def template_contents
        @template_contents ||= File.read(template_path).gsub(MINIFY_REGEX, "")
      end

      def template_path
        @template_path ||= File.expand_path("wtfjht_seo_template.html", File.dirname(__FILE__))
      end
    end
  end
end

Liquid::Template.register_tag("seo", Jekyll::SeoTag)
