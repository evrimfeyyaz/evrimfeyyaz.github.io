---
layout: post
title: Adding Google Analytics to a Rails 5 / Turbolinks 5 app
categories: Software
tags: [Rails, Google Analytics, Turbolinks]
image: /public/featured_images/adding-google-analytics-to-a-rails-5-turbolinks-5-app.jpg
---

When you're setting up Google Analytics, you are instructed to add the following code to the `<head>` section of your website:

```html
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-XXXXXXXXX-X"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-XXXXXXXXX-X');
</script>
```

Seems simple, but if you are using Turbolinks (which you probably are, as it is turned on by default on Rails) you will notice that this does not work properly.

As you probably already know, Turbolinks does not reload the `<head>` section when transitioning between pages (to speed up the transition), and thus does not send the page view to Google Analytics.

Here is the part of the above code that sends the page view to Google Analytics:

```js
gtag('config', 'UA-XXXXXXXXX-X');
```

We need to make sure this method is called every time Turbolink loads a new page. Lucky for us, Turbolinks provides an event for exactly this purpose, named `turbolinks:load`.

## Step by step instructions for setting up Google Analytics
### Step 1
Add the following code right before the `</head>` tag in your `application.html.erb` file:
```erb
<% if Rails.env.production? %>
  <!-- Global site tag (gtag.js) - Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=UA-XXXXXXXXX-X"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
  </script>
<% end %>
```

Don't forget to replace `UA-XXXXXXXXX-X` with your own tracking ID.

This is the tracking script from Google Analytics wrapped in a conditional to only send page views to Google Analytics in production, and not while you are testing the app in development.

### Step 2
Create a file named `google_analytics.js` in `app/assets/javascripts` with the following content:
```js
document.addEventListener('turbolinks:load', function() {
  gtag('config', 'UA-XXXXXXXXX-X')
});
```

Again, don't forget to replace `UA-XXXXXXXXX-X` with your own tracking ID.


## Not working?
If Google analytics is not registering your page views, here are two reasons why that might be:

### You are trying this in development
As I've already mentioned, the Google Analytics script is wrappeed in a conditional that checks if we are in the production environment.

If you want Google Analytics to register page views in development as well, remove the `<% if Rails.env.production? %>` and `<% end %>` lines.

### You are using an ad blocker
Your ad blocker might be blocking Google Analytics from tracking you. Try turning it off.