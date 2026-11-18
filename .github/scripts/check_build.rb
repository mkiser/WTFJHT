require "date"
require "digest"
require "jekyll"
require "json"
require "nokogiri"
require "set"
require "time"
require "uri"
require "yaml"

module CheckBuild
  POST_NAME = /\A(\d{2,4})-(\d{1,2})-(\d{1,2})-(.+)(\.[^.]+)\z/
  FRONT_MATTER = /\A---\s*\n(.*?\n?)^(?:---|\.\.\.)\s*$/m
  TAG_SLUG = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/
  RESERVED_TAGS = %w[index].freeze
  MONTHS = %w[january february march april may june july august september october november december].freeze
  ONE_SENTENCE_PAGE = "one-sentence/index.html"
  REQUIRED = %W[
    index.html 404.html styles.css rss.xml atom.xml feed.json podcasts/index.xml sitemap.xml
    search-index.json search-version.json sources-leaderboard.json service-worker.js register-sw.js
    corrections/index.html archive/index.html quiz/index.html survey/index.html
    pay-it-forward/index.html about/index.html #{ONE_SENTENCE_PAGE}
  ].freeze
  SIZE_EXEMPT = %w[search-version.json].freeze
  MIN_BYTES = 100
  XML_FEEDS = %w[rss.xml atom.xml podcasts/index.xml sitemap.xml].freeze
  JSON_FEEDS = %w[feed.json].freeze
  FIXED_ASSETS = %w[
    /public/js/audio-player.js /public/js/search-worker.js /public/js/minisearch.min.js
    /public/js/html2canvas.min.js /public/js/jszip.min.js
  ].freeze
  ASSET_EXEMPT = {
    "wtf-is-civics/index.html" => %w[/wtf-is-civics/app.css /wtf-is-civics/app.js],
  }.freeze
  SEARCH_DIGEST = /\A[0-9a-f]{16}\z/
  ARCHIVE_DEFAULTS = { "year" => "/:year/", "month" => "/:year/:month/" }.freeze
  ASSET_EXTENSION = /\.(?:js|css)/i
  URL_LIKE_KEY = %r{\A(?:/|\./|\.\./|[a-zA-Z][a-zA-Z0-9+.-]*:)}

  class Run
    def initialize(source, site, pretend, require_digest)
      @source = source
      @site = site
      @pretend = pretend
      @require_digest = require_digest
      @failures = []
      @notes = []
    end

    def call
      config = load_yaml(File.join(@source, "_config.yml"))
      ENV["TZ"] = config["timezone"].to_s if config["timezone"]
      build_path = File.join(@source, "_config_build.yml")
      build = File.exist?(build_path) ? load_yaml(build_path) : {}
      @config = config.merge(build)
      @cutoff = cutoff_from(build["time"])
      @future = config["future"] == true

      posts_dir = File.join(@source, "_posts")
      return abort_run("source-posts", posts_dir, "is not a directory") unless File.directory?(posts_dir)

      posts = load_posts(posts_dir)
      @expected = posts.select { |post| expected?(post) }
      return abort_run("source-posts", posts_dir, "yields zero expected posts at cutoff #{@cutoff.strftime('%Y-%m-%d %H:%M:%S %z')}") if @expected.empty?

      @notes << "pretending #{@pretend} is missing" if @pretend
      @notes << "requiring the search digest" if @require_digest
      check_posts
      check_redirects
      check_tags
      check_on_this_day
      check_archives
      check_required
      check_feeds
      check_search
      check_assets
      @notes << "cutoff #{@cutoff.strftime('%Y-%m-%d %H:%M:%S %z')}; #{@expected.size} expected posts, #{@tag_count} tags, #{@otd_count} On This Day pages, #{@archive_count} archive pages, #{@html_count} HTML files scanned"

      report
    end

    private

    def report
      @notes.each { |line| puts "check_build: #{line}" }
      @failures.each { |check, path, detail| puts ["FAIL", "#{check}:", path, detail].compact.join(" ") }
      puts "check_build: #{@failures.size} failures"
      @failures.empty? ? 0 : 1
    end

    def abort_run(check, path, detail)
      fail!(check, path, detail)
      report
    end

    def load_yaml(path)
      YAML.safe_load(File.read(path, encoding: "UTF-8"), permitted_classes: [Date, Time], aliases: true) || {}
    end

    def cutoff_from(value)
      case value
      when nil then Time.now
      when Time then value.localtime
      when Date then Time.local(value.year, value.month, value.day)
      else Time.parse(value.to_s).localtime
      end
    end

    def fail!(check, path, detail = nil)
      @failures << [check, path, detail]
    end

    def state(rel)
      @states ||= {}
      @states[rel] ||= begin
        path = File.join(@site, rel)
        if rel == @pretend || !File.file?(path)
          :missing
        elsif File.zero?(path)
          :empty
        else
          :ok
        end
      end
    end

    def present?(rel)
      state(rel) == :ok
    end

    def front_matter(path)
      match = File.read(path, encoding: "UTF-8").match(FRONT_MATTER)
      return {} unless match

      YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true) || {}
    end

    def local_time(value, fallback)
      case value
      when Time then value.localtime
      when Date then Time.local(value.year, value.month, value.day)
      when String then Time.parse(value).localtime
      else fallback
      end
    end

    def tags_of(data)
      Jekyll::Utils.pluralized_array_from_hash(data, "tag", "tags").map(&:to_s).uniq
    end

    def redirects_of(data)
      [data["redirect_from"]].flatten.compact.map(&:to_s).reject(&:empty?)
    end

    def special?(name)
      name.start_with?(".", "_", "#", "~") || name.end_with?("~")
    end

    def load_posts(root)
      Dir.glob("**/*", base: root).sort.filter_map do |rel|
        path = File.join(root, rel)
        next unless File.file?(path)
        next if rel.split("/").any? { |part| special?(part) }

        parts = POST_NAME.match(File.basename(rel))
        next unless parts

        data = front_matter(path)
        date = local_time(data["date"], Time.local(parts[1].to_i, parts[2].to_i, parts[3].to_i))
        permalink = data["permalink"]&.to_s
        url = if permalink.nil?
                date.strftime("/%Y/%m/%d/") + Jekyll::Utils.slugify((data["slug"] || parts[4]).to_s, mode: "pretty", cased: true) + "/"
              elsif !permalink.include?(":")
                permalink
              end
        {
          "file" => File.join("_posts", rel),
          "date" => date,
          "data" => data,
          "url" => url,
          "tags" => tags_of(data),
          "redirects" => redirects_of(data),
        }
      end
    end

    def expected?(post)
      data = post["data"]
      return false if data["published"] == false
      return true if @future

      post["date"].to_i <= @cutoff.to_i
    end

    def unescape(text)
      text.b.gsub(/%[0-9A-Fa-f]{2}/) { |pair| pair[1, 2].hex.chr }.force_encoding("UTF-8")
    end

    def output_path(url)
      rel = unescape(url.to_s).sub(%r{\A/+}, "")
      rel += "index.html" if rel.empty? || rel.end_with?("/")
      rel += ".html" unless rel.end_with?(".html")
      rel
    end

    def expect_pages(check, paths)
      paths.uniq.sort.each do |rel|
        case state(rel)
        when :missing then fail!(check, rel)
        when :empty then fail!(check, rel, "is empty")
        end
      end
    end

    def check_posts
      @expected.reject { |post| post["url"] }.each do |post|
        fail!("post-pages", post["file"], "has a front matter permalink with placeholders, which the check does not support")
      end
      expect_pages("post-pages", @expected.filter_map { |post| post["url"] && output_path(post["url"]) })
    end

    def check_redirects
      expect_pages("redirect-pages", @expected.flat_map { |post| post["redirects"].map { |from| output_path("/" + from.sub(%r{\A/+}, "")) } })
    end

    def check_tags
      tags = @expected.flat_map { |post| post["tags"] }.select { |tag| TAG_SLUG.match?(tag) && !RESERVED_TAGS.include?(tag) }
      @tag_count = tags.uniq.size
      expect_pages("tag-pages", tags.map { |tag| File.join("tags", tag, "index.html") })
    end

    def check_on_this_day
      days = @expected.reject { |post| post["data"]["post_type"] == "week-in-review" }.map { |post| [post["date"].month, post["date"].day] }.uniq
      @otd_count = days.size
      expect_pages("on-this-day-pages", days.map { |month, day| File.join("on-this-day", "#{MONTHS[month - 1]}-#{day}", "index.html") })
    end

    def check_archives
      block = @config["jekyll-archives"].is_a?(Hash) ? @config["jekyll-archives"] : {}
      enabled = block["enabled"]
      permalinks = block["permalinks"].is_a?(Hash) ? block["permalinks"] : {}
      paths = %w[year month].flat_map do |type|
        next [] unless enabled == "all" || Array(enabled).map(&:to_s).include?(type)

        pattern = (permalinks[type] || ARCHIVE_DEFAULTS[type]).to_s
        @expected.map do |post|
          date = post["date"]
          output_path(pattern.gsub(":year", date.strftime("%Y")).gsub(":month", date.strftime("%m")))
        end
      end
      @archive_count = paths.uniq.size
      expect_pages("archive-pages", paths)
    end

    def check_required
      REQUIRED.each do |rel|
        case state(rel)
        when :missing then fail!("required-files", rel, "is missing")
        when :empty then fail!("required-files", rel, "is empty")
        else
          size = File.size(File.join(@site, rel))
          fail!("required-files", rel, "is #{size} bytes, not over #{MIN_BYTES}") if !SIZE_EXEMPT.include?(rel) && size <= MIN_BYTES
        end
      end
    end

    def check_feeds
      XML_FEEDS.each do |rel|
        next unless present?(rel)

        begin
          Nokogiri::XML(File.read(File.join(@site, rel))) { |options| options.strict }
        rescue Nokogiri::XML::SyntaxError => e
          fail!("feeds-parse", rel, e.message.lines.first.to_s.strip)
        end
      end
      JSON_FEEDS.each do |rel|
        next unless present?(rel)

        begin
          JSON.parse(File.read(File.join(@site, rel)))
        rescue JSON::ParserError => e
          fail!("feeds-parse", rel, e.message.lines.first.to_s.strip[0, 200])
        end
      end
    end

    def check_search
      rel = "search-index.json"
      return unless present?(rel)

      bytes = File.binread(File.join(@site, rel))
      begin
        index = JSON.parse(bytes.dup.force_encoding("UTF-8"))
      rescue JSON::ParserError => e
        fail!("search-index", rel, "does not parse: #{e.message.lines.first.to_s.strip[0, 200]}")
        return
      end
      unless index.is_a?(Hash) && index["p"].is_a?(Array)
        fail!("search-index", rel, "has no p array")
        return
      end

      urls = index["p"].map { |entry| entry.is_a?(Hash) ? entry["u"].to_s : "" }
      urls.tally.select { |_url, count| count > 1 }.keys.sort.each { |url| fail!("search-index", url, "appears more than once in #{rel}") }
      indexed = urls.to_set
      wanted = @expected.select { |post| post["url"] && !post["data"]["draft"] }.map { |post| post["url"] }.to_set
      (wanted - indexed).sort.each { |url| fail!("search-index", url, "is an expected post missing from #{rel}") }
      (indexed - wanted).sort.each { |url| fail!("search-index", url, "is in #{rel} but is not an expected post") }

      generated = index["generated"]
      version_rel = "search-version.json"
      if present?(version_rel)
        begin
          version = JSON.parse(File.read(File.join(@site, version_rel)))
          stamp = version.is_a?(Hash) ? version["generated"] : nil
          fail!("search-index", version_rel, "generated #{stamp.inspect} does not equal #{rel} generated #{generated.inspect}") unless stamp == generated
        rescue JSON::ParserError => e
          fail!("search-index", version_rel, "does not parse: #{e.message.lines.first.to_s.strip[0, 200]}")
        end
      end

      if generated.is_a?(String) && SEARCH_DIGEST.match?(generated)
        digest = Digest::SHA256.hexdigest(JSON.generate(index.reject { |key, _value| key == "generated" }))[0, 16]
        if digest == generated
          @notes << "#{rel} generated #{generated} equals the recomputed digest"
        else
          fail!("search-index", rel, "generated #{generated} does not equal the recomputed digest #{digest}")
        end
      elsif @require_digest
        fail!("search-index", rel, "generated #{generated.inspect} is not 16 lowercase hexadecimal characters")
      else
        same = JSON.generate(index).b == bytes.b
        @notes << "#{rel} #{same ? 'reproduces' : 'does not reproduce'} exactly from JSON.generate of its parsed form"
      end
    end

    def site_origin
      url = @config["url"].to_s
      return nil if url.empty?

      parsed = URI.parse(url)
      parsed.host ? [parsed.host.downcase, port_of(parsed)] : nil
    rescue URI::Error
      nil
    end

    def port_of(parsed)
      [80, 443].include?(parsed.port) ? nil : parsed.port
    end

    def baseurl
      @config["baseurl"].to_s.sub(%r{/+\z}, "")
    end

    def local_path(ref, page_rel)
      value = ref.to_s.strip
      return nil if value.empty? || value.start_with?("#")

      if value.start_with?("//")
        value = "http:" + value
      end
      if value.match?(/\A[a-zA-Z][a-zA-Z0-9+.-]*:/)
        return nil unless value.match?(%r{\Ahttps?://}i)

        begin
          parsed = URI.parse(value)
        rescue URI::Error
          return nil
        end
        return nil unless parsed.host
        return nil unless @origin && [parsed.host.downcase, port_of(parsed)] == @origin

        path = parsed.path.to_s
      else
        path = value.sub(/[?#].*\z/m, "")
        path = File.join("/", File.dirname(page_rel), path) unless path.start_with?("/")
      end
      path = path.sub(/[?#].*\z/m, "")
      return nil unless path.downcase.end_with?(".js", ".css")

      path = unescape(path)
      path = File.expand_path(path, "/")
      base = baseurl
      path = path.delete_prefix(base) if !base.empty? && path.start_with?(base + "/")
      path
    end

    def import_map_refs(doc, page_rel)
      doc.xpath("//script[@type='importmap']").flat_map do |node|
        map = JSON.parse(node.text)
        unless map.is_a?(Hash)
          fail!("import-map", page_rel, "has an import map that is not a JSON object")
          next []
        end

        entries = []
        [map["imports"], *(map["scopes"].is_a?(Hash) ? map["scopes"].values : [])].each do |table|
          next unless table.is_a?(Hash)

          table.each do |key, value|
            entries << key.to_s if URL_LIKE_KEY.match?(key.to_s)
            entries << value.to_s
          end
        end
        entries
      rescue JSON::ParserError => e
        fail!("import-map", page_rel, "has an import map that does not parse: #{e.message.lines.first.to_s.strip[0, 200]}")
        []
      end
    end

    def check_assets
      @origin = site_origin
      missing = Hash.new { |hash, key| hash[key] = [] }
      pages = Dir.glob("**/*.html", base: @site).sort.select { |rel| present?(rel) }
      @html_count = pages.size
      pages.each do |page_rel|
        text = File.read(File.join(@site, page_rel), encoding: "UTF-8")
        next unless text.match?(ASSET_EXTENSION)

        doc = Nokogiri::HTML(text)
        if page_rel == ONE_SENTENCE_PAGE && doc.xpath("//script[@type='importmap']").empty?
          fail!("import-map", page_rel, "has no import map")
        end
        refs = doc.xpath("//@src | //@href").map(&:value) + import_map_refs(doc, page_rel)
        exempt = ASSET_EXEMPT.fetch(page_rel, [])
        refs.each do |ref|
          path = local_path(ref, page_rel)
          next unless path
          next if exempt.include?(path)

          missing[path] << page_rel unless present?(path.delete_prefix("/"))
        end
      end
      missing.keys.sort.each do |path|
        users = missing[path].uniq
        fail!("local-assets", path.delete_prefix("/"), "#{asset_problem(path)}; referenced by #{users.size} page(s), first #{users.first}")
      end
      FIXED_ASSETS.each do |path|
        next if present?(path.delete_prefix("/")) || missing.key?(path)

        fail!("local-assets", path.delete_prefix("/"), "#{asset_problem(path)}; fixed list")
      end
    end

    def asset_problem(path)
      state(path.delete_prefix("/")) == :empty ? "is empty" : "is not in the build"
    end
  end

  def self.clean_relative(path)
    parts = []
    path.split("/").each do |part|
      next if part.empty? || part == "."

      if part == ".."
        return nil if parts.empty?

        parts.pop
      else
        parts << part
      end
    end
    parts.empty? ? nil : parts.join("/")
  end

  def self.main(argv)
    args = argv.dup
    pretend = nil
    require_digest = false
    if args.delete("--require-digest")
      require_digest = true
    end
    if (at = args.index("--pretend-missing"))
      raw = args[at + 1]
      args.slice!(at, 2)
      pretend = raw && clean_relative(raw)
      unless pretend
        warn "check_build: --pretend-missing needs a non-empty path inside the site, got #{raw.inspect}"
        return 2
      end
    end
    if args.size != 2 || args.any? { |arg| arg.start_with?("--") }
      warn "usage: check_build.rb SOURCE SITE [--pretend-missing PATH] [--require-digest]"
      return 2
    end
    unless File.directory?(args[1])
      warn "check_build: site directory #{args[1]} not found"
      return 2
    end

    Run.new(args[0], args[1], pretend, require_digest).call
  end
end

exit CheckBuild.main(ARGV)
