---
layout: page
title: Projects
---

Here, you can find some of the projects I worked on.

## Software
{% for project in site.software_projects %}
* [{{ project.title }}]({{ project.url }})
{% endfor %}

## Other
{% for project in site.other_projects %}
* [{{ project.title }}]({{ project.url }})
{% endfor %}