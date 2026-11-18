require 'digest'

module Jekyll
  module AssetVersionFilter
    STYLESHEET = '/styles.css'.freeze
    SASS_GEMS = %w(sass jekyll-sass-converter).freeze
    SASS_EXTENSIONS = %w(.scss .sass .css).freeze
    SASS_EXCLUDED_KEYS = %w(load_paths).freeze

    @cache = {}

    class << self
      attr_reader :cache

      def reset
        @cache = {}
      end

      def source_bytes(site, path)
        raise ArgumentError, "asset_v: #{path} contains a .. segment" if path.to_s.split('/').include?('..')
        file = File.join(site.source, path.to_s)
        raise ArgumentError, "asset_v: #{path} does not exist at #{file}" unless File.file?(file)
        bytes = File.binread(file)
        raise ArgumentError, "asset_v: #{path} begins with front matter" if bytes.start_with?('---')
        bytes
      end

      def file_digest(site, path)
        @cache["#{site.source}\0file:#{path}"] ||= Digest::SHA256.hexdigest(source_bytes(site, path))[0, 10]
      end

      def group_digest(site, paths)
        sorted = paths.map(&:to_s).sort
        @cache["#{site.source}\0group:#{sorted.join("\0")}"] ||= begin
          sha = Digest::SHA256.new
          sorted.each do |path|
            sha << path << "\0" << source_bytes(site, path) << "\0"
          end
          sha.hexdigest[0, 10]
        end
      end

      def sass_files(root)
        Dir.glob('**/*', File::FNM_DOTMATCH, base: root).select do |rel|
          !File.basename(rel).start_with?('.') && SASS_EXTENSIONS.include?(File.extname(rel)) && File.file?(File.join(root, rel))
        end.sort
      end

      def stylesheet_digest(site)
        @cache["#{site.source}\0stylesheet"] ||= begin
          sass = site.config['sass'] || {}
          sass_dir = sass['sass_dir'].to_s.empty? ? '_sass' : sass['sass_dir'].to_s
          root = File.join(site.source, sass_dir)
          sha = Digest::SHA256.new
          sha << File.binread(File.join(site.source, 'styles.scss'))
          sass_files(root).each do |rel|
            sha << rel << "\0" << File.binread(File.join(root, rel)) << "\0"
          end
          sass.keys.map(&:to_s).reject { |key| SASS_EXCLUDED_KEYS.include?(key) }.sort.each do |key|
            value = sass.key?(key) ? sass[key] : sass[key.to_sym]
            sha << "#{key}=#{value.to_s}" << "\0"
          end
          SASS_GEMS.each do |name|
            spec = Gem.loaded_specs[name]
            raise ArgumentError, "asset_v: gem #{name} is not loaded" unless spec
            sha << "#{name}=#{spec.version}" << "\0"
          end
          sha.hexdigest[0, 10]
        end
      end
    end

    def asset_v(input)
      site = @context.registers[:site]
      path = input.to_s
      digest = path == STYLESHEET ? AssetVersionFilter.stylesheet_digest(site) : AssetVersionFilter.file_digest(site, path)
      "#{path}?v=#{digest}"
    end

    def asset_v_group(input)
      AssetVersionFilter.group_digest(@context.registers[:site], Array(input))
    end
  end
end

Jekyll::Hooks.register :site, :after_reset do |_site|
  Jekyll::AssetVersionFilter.reset
end

Liquid::Template.register_filter(Jekyll::AssetVersionFilter)
