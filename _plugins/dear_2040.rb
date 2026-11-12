require "date"

module Dear2040
  def self.closes_at(last_day, time_zone)
    day = last_day.is_a?(Date) ? last_day : Date.iso8601(last_day.to_s)
    after = day + 1
    zone = time_zone.to_s
    raise ArgumentError, "dear_2040.time_zone is required" if zone.empty?
    raise ArgumentError, "dear_2040.time_zone #{zone} is not a known zone" unless File.file?(File.join("/usr/share/zoneinfo", zone))
    previous = ENV["TZ"]
    begin
      ENV["TZ"] = zone
      local = Time.local(after.year, after.month, after.day, 0, 0, 0)
      unless local.year == after.year && local.month == after.month && local.day == after.day &&
             local.hour.zero? && local.min.zero? && local.sec.zero?
        raise ArgumentError, "#{after} has no unambiguous midnight in #{zone}"
      end
      local.getutc.strftime("%Y-%m-%dT%H:%M:%SZ")
    ensure
      ENV["TZ"] = previous
    end
  end

  class EditionGenerator < Jekyll::Generator
    safe true
    priority :highest

    def generate(site)
      data = site.data["dear_2040"]
      return unless data.is_a?(Hash)
      data["closes_at"] = Dear2040.closes_at(data["last_day"], data["time_zone"])
    end
  end
end
