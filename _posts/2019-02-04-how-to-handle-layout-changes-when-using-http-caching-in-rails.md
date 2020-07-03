---
layout: post
title: How to handle layout changes when using HTTP caching in Rails
categories: Software
image: /public/featured_images/rails-layout-changes.jpg
---

It is very easy to [get started with HTTP caching in Rails](/getting-started-with-http-caching-in-rails/), but there are a few small things you need to watch out for. Handling layout changes is one of those things.

Let's say we have set up HTTP caching in our app using the following code:

```ruby
def show
  @category = Category.find(params[:id])
  fresh_when @category
end
```

With just one line of code, Rails will check our `Category` object, and automatically send the right HTTP headers to the client based on whether the object has changed or not.

Rails will also take the template for the `show` action into account. Whenever you make a change in `app/views/categories/show.html.erb`, Rails will tell the client that the page has changed.

So far so good. Let's assume that we also have the following layout file, e.g. `application.html.erb`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ... -->
</head>
<body>

<h1>My Site</h1>
<%= yield %>

</body>
</html>
```

And we decide to change the title:

```erb
<!-- ... -->

<h1>My Awesome Site</h1>
<%= yield %>

<!-- ... -->
```

Now, if you go to `categories/show`, you will see that, even though we indirectly made a change to that page by changing the layout, Rails will still send a `304 (Not Modified)` response to the client.

Turns out, Rails only checks the template for the page that is being rendered when deciding whether or not the page is stale.

But fear not, there are a few simple tricks we can use to handle this situation ourselves.

## Using a version constant
One option we have is to keep the version of our app in a constant and tell Rails to incorporate this into its ETag[^1] calculation.

One way to add an app version is to use a global version variable. We can put this in `config/initializers/app_version.rb`:

```ruby
APP_VERSION = '0.0.1'
```

And we can tell Rails to take this into account when calculating an ETag by adding the following line to our `ApplicationController`:

```ruby
etag { APP_VERSION }
```

Now, whenever you update the app version, the HTTP cache will be "invalidated[^2]."

## Using Heroku's app version environment variable
The previous method works perfectly fine, but it's error-prone. What if you forget to change the app version and push the code to production?

Luckily, if you are using Heroku, there is a very simple way to get the current app version from the environment variables. Heroku automatically updates this variable whenever a new deployment is made, so you don't need to manually change it.

To use this environment variable, we first need to activate an experimental Heroku feature, called [Dyno Metadata](https://devcenter.heroku.com/articles/dyno-metadata). Here is how you can do it using the Heroku CLI:

```bash
heroku labs:enable runtime-dyno-metadata -a <app name>
```

The environment variable we will use is named `HEROKU_RELEASE_VERSION`. In our `application_controller.rb`, we can tell Rails to use this environment variable when calculating an ETag:

```ruby
class ApplicationController < ActionController::Base
  etag { heroku_version }

  private

  def heroku_version
    ENV['HEROKU_RELEASE_VERSION'] if Rails.env == 'production'
  end
end
```

## What if you are not using Heroku?
In this case, what I would recommend is to create a deployment script that automatically writes the latest Git commit hash to an environment variable, and use the same method we used above for Heroku.

[^1]: ETag is the HTTP header that is used to identify the version of a resource. Rails uses a few different data points, for example when the object was updated, the template being rendered, etc., and creates a hash which ends up as the ETag header.
[^2]: In a loose sense.
