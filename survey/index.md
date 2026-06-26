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

{% if site.turnstile_site_key %}
<div class="survey-turnstile cf-turnstile" data-sitekey="{{ site.turnstile_site_key }}" data-appearance="interaction-only"></div>
{% endif %}
