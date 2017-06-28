---
layout: default
title: What The Fuck Just Happened Today? Archive
image:
  twitter: /public/wtfjht-t.jpg
  facebook: /public/wtfjht-f.jpg
---

<!-- MailChimp -->
{% include email.html %}

<div class="posts">
  <article class="post">
  {% for post in site.posts %}
    <h2 class="post-title">
      <a href="{{ site.baseurl }}{{ post.url }}">
        {{ post.title }}:
      <span class="post-small">{{ post.description }}</span></a>
    </h2>
    <time datetime="{{ post.last_modified | date_to_xmlschema }}" class="post-date">
       {{ post.date | date: "%m/%d/%Y" }}
    <small><em>Updated: {{ post.last_modified | date: "%m/%d/%Y %r %Z"}} 
    </em></small>
  </time>
  {% endfor %} 
  </article>
</div> 