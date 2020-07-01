---
layout: post
title: Getting started with HTTP caching in Rails
categories: Software
image: /public/featured_images/getting-started-with-http-caching-in-rails.jpg
---

Rails provides a few different methods of HTTP caching out of the box, and one of them is conditional GET requests. Here is how it works by default:

First request:
1. Client requests a page.
1. Rails prepares the page, and hashes it.
1. Rails sends the response to the client, and includes the hash in the ETag header[^1].
1. Client receives the response and shows the page.

Subsequent requests:
1. Client requests a page and includes the ETag it received previously.
1. Rails prepares the page, and hashes it.
1. Rails compares the ETag sent by the client to the one it just calculated.
1. If the ETags match, Rails only responds with `304 Not Modified`.
1. Client shows the page it has in its cache, without needing to download the page again.

This is great, but there is a problem with this. Even though this is useful to some extent, as the client does not need to re-download the page, we don't end up saving any server time. Rails still needs to calculate the full response in every single request.

## Speeding up the default HTTP caching mechanism
What we need is a way to decide whether or not a page has changed without having to render it.

Let's take the following action as an example:

```ruby
def show
  @category = Category.find(params[:id])
end
```

What do we need to check to see if the page this action renders has changed?

1. We need to check if our object has changed. In our example, `@category`.
1. We need to check if the page template has changed. In our example, `categories/show`.

Let's start with the first point.

## How to check if the object has changed
Now, what we need to do is to check if our category has changed. A good way to do that is to check its `updated_at` attribute.

Rails provides a useful method called [`fresh_when`](https://api.rubyonrails.org/classes/ActionController/ConditionalGet.html#method-i-fresh_when) for this purpose. Here is how we can use it:

```ruby
def show
  @category = Category.find(params[:id])
  fresh_when(etag: @category)
end
```

Or simply:

```ruby
def show
  @category = Category.find(params[:id])
  fresh_when @category
end
```

This way, when the `updated_at` column of our category changes, the generated ETag won't match the ETag that was previously sent to the client.

What about the changes in template? In the method call above, Rails already includes the default `controller/action` template when calculating the ETag. Convention over configuration.

Another good thing is, we can even include other objects in the `fresh_when` call. For example if this page depended on both the category and the current user, we could easily do this:

```ruby
def show
  @category = Category.find(params[:id])
  fresh_when [@category, current_user]
end
```

## That sounds too simple, what's the catch?
Continuing with the example above, imagine that you have articles that belong to categories.

```ruby
class Category < ApplicationRecord
  has_many :articles
end

class Article < ApplicationRecord
  belongs_to :category
end
```

Now, let's imagine that your `categories/show` page shows all the articles that belong to a given category. That would mean that every time an article changes[^2], we need to tell the client the category it belonged to has changed as well, so that it won't reuse the category page it has in its cache. But, remember that we decided whether or not our page changed based on the `updated_at` column of our category, which does not get updated when its articles change. We need to take articles into consideration as well when checking whether our category page has changed.

Here is one way of doing exactly that:

```ruby
def show
  @category = Category.find(params[:id])
  fresh_when [@category, @category.articles]
end
```

This time, Rails checks the `updated_at` column of our category **and** the `updated_at` columns of its articles. Pretty cool, but this is not the method I prefer[^3].

## A better way to handle changes in associations
The reason why we incorporated `@categories.articles` into our `fresh_when` method call was that the `updated_at` column of our category did not change when its articles changed. What if we update the timestamp of our category when its articles change?

There is a very simple way to achieve this in Rails:

```ruby
class Article < ApplicationRecord
  belongs_to :category, touch: true
end
```

Now, whenever an article is changed, Rails will automatically update the timestamp on its category, so we can revert our action to the way it was before:

```ruby
def show
  @category = Category.find(params[:id])
  fresh_when @category
end
```

---

That's all for now. This is good enough as an introduction, but there are a few issues you might face dealing with HTTP caching headers that I've written about:

1. [How do you propagate changes when you're using `has_and_belongs_to_many` or another type of many-to-many mapping?](/invalidating-caches-when-using-many-to-many-associations-in-rails) You can't use the `belongs_to category, touch: true` method we mentioned above, as it is not supported.
1. Rails takes the template into consideration when checking for changes on a page, but it doesn't take the layout into consideration. [How do you handle layout changes?](/how-to-handle-layout-changes-when-using-http-caching-in-rails)

[^1]: There is also another header named "Last-Modified" that is used for the same purpose together with ETags, but Rails automatically sets it when we're using the shorter `fresh_when object` call, so I decided not to mention it for brevity.
[^2]: This also includes the scenario where an article is added to or removed from a category.
[^3]: The reason why I don't prefer this method is that it gets cumbersome when you're also using "Russian doll caching." I might get into that in another article. That being said, there is one advantage to this method. Imagine that on `categories/show` we're showing all articles of a category, but on the `categories/index` page we are not showing any article. With this method, on the `categories/show` page we can check both the category and its articles for changes (`fresh_when [@category, @category.articles]`) and only the category on the `categories/index` page (`fresh_when @category`).
