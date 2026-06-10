---
layout: survey
title: "2026 Reader Survey"
description: "The annual WTFJHT reader survey — a few minutes to help shape the year ahead."
permalink: /survey/
sitemap: false
noindex: true
---

{%- assign form = site.data.forms["reader-survey-2026"] -%}
<div id="wtfjht-survey"
  data-form='{{ form | jsonify | xml_escape }}'
  data-api-url="https://whatthefuckjusthappenedtoday.com">
</div>

{%- comment -%}
Turnstile widget lives OUTSIDE #wtfjht-survey so forms.js (which rebuilds that
container) never wipes it. On solve, Cloudflare injects <input name="cf-turnstile-response">,
which forms.js reads at submit. Set `turnstile_site_key` in _config.yml to enable.
{%- endcomment -%}
{% if site.turnstile_site_key %}
<div class="survey-turnstile cf-turnstile" data-sitekey="{{ site.turnstile_site_key }}" data-size="flexible"></div>
{% endif %}
