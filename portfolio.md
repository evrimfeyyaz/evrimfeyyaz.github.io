---
layout: page
title: Portfolio
---

Here, you can find some of the projects I worked on.

{% for project in site.projects %}
<div class="portfolio-item">
  <img src="{{ project.thumbnail }}" class="portfolio-item-thumbnail">
  <div class="portfolio-item-info-container">
    <a href="{{ project.url }}">{{ project.title }}</a>
    <p class="portfolio-item-category">
      {{ project.category }}
    </p>
  </div>
</div>
{% endfor %}