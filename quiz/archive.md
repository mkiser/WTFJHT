---
layout: quiz
title: "Weekly News Quiz Archive"
description: "Past editions of the WTFJHT Weekly News Quiz."
permalink: /quiz/archive/
---

{%- assign sorted_quizzes = site.data.quizzes | sort -%}

<div class="quiz-header">
<h1>Quiz Archive</h1>
<p class="quiz-intro">Past editions of the Weekly News Quiz. <a href="{{ site.url }}{{ site.baseurl }}/quiz/">Back to this week's quiz &rarr;</a></p>
</div>

{%- if sorted_quizzes.size == 0 %}
<div class="quiz-empty">
<p>No past quizzes yet. Check back Friday!</p>
</div>
{%- else %}
<ul class="quiz-archive-list">
{%- for pair in sorted_quizzes reversed %}
  {%- assign quiz = pair[1] %}
  {%- assign q_count = quiz.questions | size %}
  <li class="quiz-archive-item">
    <div class="quiz-archive-item__head">
      <h2 class="quiz-archive-item__label">{{ quiz.week_label }}</h2>
      <span class="quiz-archive-item__meta">
        {{ q_count }} question{% if q_count != 1 %}s{% endif %}
        {%- if quiz.generated_at %} &middot; Posted {{ quiz.generated_at | date: "%b %-d" }}{% endif %}
        {%- if quiz.status == "published" %} &middot; <span class="quiz-archive-item__status">Current</span>{% endif %}
      </span>
    </div>
    {%- if quiz.editions and quiz.editions.size > 0 %}
    <ul class="quiz-archive-item__editions">
      {%- for day_num in quiz.editions %}
        {%- assign day_title = "Day " | append: day_num %}
        {%- assign matched = nil %}
        {%- for post in site.posts %}
          {%- if post.title == day_title %}
            {%- assign matched = post %}
            {%- break %}
          {%- endif %}
        {%- endfor %}
        {%- if matched %}
        <li>
          <a href="{{ matched.url | relative_url }}">
            <span class="quiz-archive-day">Day {{ day_num }}</span>
            <span class="quiz-archive-date">{{ matched.date | date: "%a %b %-d" }}</span>
          </a>
        </li>
        {%- endif %}
      {%- endfor %}
    </ul>
    {%- endif %}
    {%- if quiz.status == "published" %}
    <p class="quiz-archive-item__action">
      <a href="{{ site.url }}{{ site.baseurl }}/quiz/">Take this quiz &rarr;</a>
    </p>
    {%- endif %}
  </li>
{%- endfor %}
</ul>
{%- endif %}
