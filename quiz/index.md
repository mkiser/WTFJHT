---
layout: quiz
title: "Last Week in WTFJHT News Quiz"
description: "Test your knowledge of this week's news with the WTFJHT Weekly News Quiz"
permalink: /quiz/
---

{%- assign sorted_quizzes = site.data.quizzes | sort -%}
{%- assign latest_pair = nil -%}
{%- for pair in sorted_quizzes reversed -%}
{%- if pair[1].status == "published" -%}
{%- assign latest_pair = pair -%}
{%- break -%}
{%- endif -%}
{%- endfor -%}

{%- comment -%}
Build a day_number → post_url JSON map for all day numbers referenced by
editions and question source_days. Passed to JS so per-question feedback
can auto-link "Covered in Day N" to the actual post. Graceful: if a day has
no matching post, it's omitted and JS falls back to plain text.
{%- endcomment -%}
{%- assign q_day_urls_json = "{}" -%}
{%- if latest_pair -%}
  {%- assign all_day_nums = latest_pair[1].editions | default: empty -%}
  {%- for q in latest_pair[1].questions -%}
    {%- if q.source_day -%}
      {%- assign all_day_nums = all_day_nums | push: q.source_day -%}
    {%- endif -%}
  {%- endfor -%}
  {%- assign all_day_nums = all_day_nums | uniq -%}
  {%- capture q_pairs_raw -%}
    {%- assign q_is_first = true -%}
    {%- for day_num in all_day_nums -%}
      {%- assign day_title = "Day " | append: day_num -%}
      {%- for post in site.posts -%}
        {%- if post.title == day_title -%}
          {%- if q_is_first == false -%},{%- endif -%}
"{{ day_num }}":"{{ post.url | relative_url }}"
          {%- assign q_is_first = false -%}
          {%- break -%}
        {%- endif -%}
      {%- endfor -%}
    {%- endfor -%}
  {%- endcapture -%}
  {%- assign q_day_urls_json = "{" | append: q_pairs_raw | append: "}" -%}
{%- endif -%}

<div class="quiz-header">
<h1>Weekly News Quiz</h1>
{%- if latest_pair %}
<p class="quiz-week">{{ latest_pair[1].week_label }}</p>
<p class="quiz-intro">Test yourself on this week's news.</p>
{%- endif %}
</div>

{%- if latest_pair %}
<div id="wtfjht-quiz"
data-quiz='{{ latest_pair[1] | jsonify | xml_escape }}'
data-day-urls='{{ q_day_urls_json | xml_escape }}'
data-api-url="https://whatthefuckjusthappenedtoday.com">
</div>
{%- else %}
<div class="quiz-empty">
<p>No quiz available yet. Check back Friday!</p>
</div>
{%- endif %}
