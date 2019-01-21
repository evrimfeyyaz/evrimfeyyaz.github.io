---
layout: post
title: Invalidating caches when using many-to-many associations in Rails
categories: Software
tags: [Rails, Caching]
image: /public/featured_images/invalidating-caches-when-using-many-to-many-associations-in-rails.jpg
---

[When declaring a one-to-many association, invalidating caches in Rails](/getting-started-with-http-caching-in-rails/) is mostly as simple as using the `touch` parameter[^1]:

```ruby
class Article < ApplicationRecord
  belongs_to :category, touch: true
end
```

Now, whenever an article is updated, the timestamp of its category will also be updated.

This works great with a simple `belongs_to` association, but if we want to use a many-to-many mapping (`has_and_belongs_to_many` or `has_many` on both ends of the association), we can't use the `touch` method, as it is not supported. We need another method of propogating changes from an object to its associated objects.

## Updating timestamps of associated objects in a many-to-many mapping

Let's say we have articles which can have multiple categories (and vice-versa), and we use a join model named `Categorization`:

```ruby
class Article < ApplicationRecord
  has_many :categorizations
  has_many :categories, through: :categorizations
end

class Categorization < ApplicationRecord
  belongs_to :article
  belongs_to :category
end

class Category < ApplicationRecord
  has_many :categorizations
  has_many :articles, through: :categorizations
end
```

Now, let's say whenever an article changes, we want to update the timestamp on its categories. As I already mentioned, we cannot do this:

```ruby
class Article < ApplicationRecord
  has_many :categorizations

  # This does NOT work!
  has_many :categories, through: :categorizations, touch: true
end
```

So, we will have to manually write the method that updates the timestamp on associated objects, and then make sure it is called.

Let's start with writing a method that would update the timestamp on all referenced categories:

```ruby
class Article < ApplicationRecord
  # ...

  private

    def touch_categories
      categories.find_each(&:touch)
    end
end
```

When this method is called, we are calling the `touch` method on all the categories that are referenced.

Why not use `each` instead of [`find_each`](https://api.rubyonrails.org/classes/ActiveRecord/Batches.html#method-i-find_each)? When you call `each`, all the records are loaded into the memory, which might cause issues if you have many associated objects. `find_each` on the other hand loads these objects in batches.

Keep in mind that, this method will still load all the associated categories, and then call `touch` on them individually. Here are the SQL queries that would be produced by an article that has two categories:

```sql
Category Load (0.8ms)  SELECT  "categories".* FROM "categories" INNER JOIN "categorizations" ON "categories"."id" = "categorizations"."category_id" WHERE "categorizations"."article_id" = $1 ORDER BY "categories"."id" ASC LIMIT $2  [["article_id", 28], ["LIMIT", 1000]]

  (0.1ms)  BEGIN
Category Update (0.4ms)  UPDATE "categories" SET "updated_at" = $1 WHERE "categories"."id" = $2  [["updated_at", "2018-11-30 10:06:31.097594"], ["id", 2]]
  (1.0ms)  COMMIT

 (0.1ms)  BEGIN
Category Update (0.4ms)  UPDATE "categories" SET "updated_at" = $1 WHERE "categories"."id" = $2  [["updated_at", "2018-11-30 10:06:31.100250"], ["id", 5]]
 (0.3ms)  COMMIT
```

You can see that Rails first loads the two categories, and then updates their timestamps one by one.

There is another method we can use that would create a more performant SQL query:

```ruby
class Article < ApplicationRecord
  # ...

  after_save :touch_categories

  private

    def touch_categories
      categories.update_all(updated_at: Time.now)
    end
end
```

And this produces the following SQL query:

```sql
Category Update All (54.9ms)  UPDATE "categories" SET "updated_at" = '2018-11-30 10:05:22.302699' WHERE "categories"."id" IN (SELECT "categories"."id" FROM "categories" INNER JOIN "categorizations" ON "categories"."id" = "categorizations"."category_id" WHERE "categorizations"."article_id" = $1 ORDER BY "categories"."title" ASC)  [["article_id", 28]]
```

Here, we updated the timestamp of all categories in one swoop. This is a simpler and relatively more performant query.

Now that we have our method, how do we make sure this is called whenever an article is updated? Luckily, this is a perfect use-case for Rails' `after_save` callback:

```ruby
class Article < ApplicationRecord
  # ...

  after_save :touch_categories

  private

    def touch_categories
      categories.update_all(updated_at: Time.now)
    end
end
```

So far so good, whenever an article is updated, its categories will be updated as well.

But what happens when an article is added to a category? Notice that, when this happens, the only thing that changes is a `Categorization` object. Our articles don't have a database column referencing any categories, and vice-versa. The only thing that creates the association between articles and categories is the `Categorization` model. This means, we need to update our categories when a `Categorization` object that references it is updated. Here is how:

```ruby
class Categorization < ApplicationRecord
  belongs_to :article
  belongs_to :category, touch: true
end
```

## How about `has_and_belongs_to_many`?
What if we were using a `has_and_belongs_to_many` association, in which case we wouldn't have a `Categorization` model? For this, Rails provides `after_add` and `after_remove` parameters:

```ruby
class Category < ApplicationRecord
  # ...

  has_and_belongs_to_many :articles,
                          after_add: :touch_updated_at,
                          after_remove: :touch_updated_at

  private

    def touch_updated_at
      self.touch if persisted?
    end
end
```

In our `touch_updated_at` method, we are first checking if our record is persisted, then we are touching it. The reason for that is if we try to touch a new object (one that is not yet persisted in the database), Rails gives an error.

There is one small gotcha though. `after_add` and `after_remove` parameters only work if you add a new object to the association directly through the object that provides these parameters. It sounds a bit confusing, so I'll just show what I mean in code:

```ruby
# This will call the `after_add` callback.
category.articles << some_article

# This won't call the `after_add` callback.
Resource.new(categories: [some_category])
```

---

This is all I have on how you can invalidate caches when you are using many-to-many associations. Good luck!

[^1]: I'm using the term "invalidating caches" in a very loose sense here. Updating timestamps on an object doesn't directly invalidate a cache, but as Rails by default looks at the timestamp of an object to check if it's stale, updating timestamps generally "invalidates caches," albeit indirectly.