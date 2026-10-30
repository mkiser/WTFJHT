---
layout: survey
title: "Last Week in WTF feedback"
permalink: /survey/lwiwtf-beta-feedback-2026/
sitemap: false
noindex: true
---

{%- assign form = site.data.forms["lwiwtf-beta-feedback-2026"] -%}
<div id="wtfjht-survey"
  data-form='{{ form | jsonify | xml_escape }}'
  data-api-url="https://whatthefuckjusthappenedtoday.com">
</div>
