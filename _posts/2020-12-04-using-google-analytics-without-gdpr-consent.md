---
layout: post
title: Using Google Analytics without GDPR consent
categories: Software
---

**If you'd rather just copy/paste the code, feel free to jump to "[The final script](#the-final-script)" section below.**

---

I care about my privacy and the privacy of the visitors of this website. For that reason, I had stopped using Google Analytics, as I deemed it too intrusive. But I also wanted to know if people visit this website, and what the most popular pieces of content were on here.

If you are in the same boat as me, here is how you can use Google Analytics without invading your users' privacy.

## Hey, what about other analytics providers?

Back when I used [Netlify](https://www.netlify.com/) for a project of mine, I used their [Analytics](https://www.netlify.com/products/analytics/) feature, but it costs $9 a month, and you can't retrieve the analytics data beyond a 30-day window.

There are other options like [Matomo](https://matomo.org), [Fathom](https://usefathom.com/), [Plausible](https://plausible.io/) and [Simple Analytics](https://simpleanalytics.com), but none of them offer a free option. Don't get me wrong, they deserve every penny they get, but I currently cannot afford a monthly fee for my simple analytics needs.

## Why not show a cookie banner?

I only care about page views and unique visitors, and I don't want to collect any personally identifiable information. For that reason, I didn't want to bother my readers with a cookie banner.

So, I decided to look into how I can use Google Analytics without the need for a GDPR cookie consent banner.

## How to use Google Analytics without a cookie consent banner

***Disclaimer:** I am not a lawyer, and I know very very little about GDPR. This is a simple blog, and my aim was only to avoid collecting any personally identifiable information from my visitors, as I don't like it when other sites collect mine.*

*If you are running a business, and want to make sure you are GDPR compliant, you shouldn't be getting your information from me.*

As far as I can tell, if we're not collecting any personally identifiable information (e.g. IP) and not storing any tracking cookies, we should be fine. Out of the box, Google Analytics collects IP addresses and sets a tracking cookie with a unique client ID. This is a no go when it comes to GDPR.

Here is our usual Google Analytics tracking script:

```js
<!-- Google Analytics -->
<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
  
  ga('create', 'UA-XXXXX-Y', 'auto'); 
  ga('send', 'pageview');
</script>
<!-- End Google Analytics -->
```

Let's see what we need to change.

## Anonymizing the visitor IP and not storing cookies

Telling Google Analytics not to store cookies and to anonymize visitor IPs are very simple. We just need to make the following changes:

```js
// ...

ga('create', 'UA-XXXXX-Y', {
  // Don't store any cookies.
  'storage': 'none',
});
// Anonymize the visitor's IP.
ga('set', 'anonymizeIp', true);
ga('send', 'pageview');

// ...
```

## But, how do we tell visitors apart now?

Now the problem is we are not assigning a unique visitor ID to visitors anymore, and thus Google Analytics can't tell them apart. If we leave the code like this, all visits would count as a new unique visitor.

This might be fine if you only care about page views. If not, we need to create a unique visitor ID that doesn't contain any personally identifiable information.

## Creating a unique ID for a visitor

In an article titled [Google Analytics: Cookieless Tracking Without GDPR Consent](https://helgeklein.com/blog/2020/06/google-analytics-cookieless-tracking-without-gdpr-consent/), [Helge Klein](https://twitter.com/HelgeKlein) uses the following information to create a unique client ID hash:

> IP address + website domain + user agent + language + validity days

Getting the website domain, the user agent and the language are simple using JavaScript, and we set the validity days to a number we want. The tricky part here is getting the user's IP address.

Unfortunately, there is no way of getting a user's IP address that I know of using only JavaScript.

## Getting a visitor's IP

In his article, Helge uses the fact that he controls the server that serves his website, so he embeds the visitor IP in the script that's served to the visitor.

I am using [GitHub Pages](https://pages.github.com) for this website, so I didn't have the option to do so. The best way I found to get a user's IP address is to call the following address from [Cloudflare](https://www.cloudflare.com)[^1]:

```js
fetch("https://www.cloudflare.com/cdn-cgi/trace")
  .then((response) => response.text())
  .then((text) => {
    // The response containts the IP.
  })
```

Here is an example of what we get from Cloudflare:

```
fl=189f34
h=www.cloudflare.com
ip=12.123.12.12
ts=1607016247.122
visit_scheme=https
uag=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Safari/605.1.15
colo=IST
http=http/2
loc=TR
tls=TLSv1.3
sni=plaintext
warp=off
gateway=off
```

We can easily get the IP from this response with a simple regular expression, such as `/ip=([\d.]*)\n/`.

## The final script {#the-final-script}

When we combine it all, we come up with the following code:

```js
<!-- Google Analytics -->
<script>
  // Based on https://helgeklein.com/blog/2020/06/google-analytics-cookieless-tracking-without-gdpr-consent/ 
  // and https://stackoverflow.com/a/52171480.
  const cyrb53 = function (str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed,
      h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  };
  
  // If your website is served through Cloudflare, you can use 
  // "/cdn-cgi/trace" instead.
  fetch("https://www.cloudflare.com/cdn-cgi/trace")
    .then((response) => response.text())
    .then((text) => {
      // We get the client IP here.
      const clientIP = text.match(/ip=([\d.]*)\n/)[1];
      // The validity interval is set to four days.
      const validityInterval = Math.round(new Date() / 1000 / 3600 / 24 / 4);
      // We combine all the information in a string.
      const clientIDSource = clientIP + ";" + window.location.host + ";" + navigator.userAgent + ";" + navigator.language + ";" + validityInterval;
      // And here we create a hash from the string.
      const clientIDHashed = cyrb53(clientIDSource).toString(16);

      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
          (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
          m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
      
      // Don't forget to replace this with your tracking ID.
      ga('create', 'UA-XXXXX-Y', {
        // Don't store any cookies.
        'storage': 'none',
        // We send our hash as the client ID.
        'clientId': clientIDHashed,
      });
      // Anonymize the visitor's IP.
      ga('set', 'anonymizeIp', true);
      ga('send', 'pageview');
    })
</script>
<!-- End Google Analytics -->
```

And, this is it. Replace your current Google Analytics script with this, and you're good to go.

[^1]: I couldn't find a terms of use for this resource, so use it at your own risk. If you'd rather use another provider for this, there is [a great answer by T. H. Doan on Stack Overflow](https://stackoverflow.com/a/35123097) with many options.