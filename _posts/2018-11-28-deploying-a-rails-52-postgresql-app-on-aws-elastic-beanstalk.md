---
layout: post
title: Deploying a Rails 5.2 PostgreSQL app on AWS Elastic Beanstalk
categories: Software
tags: [AWS, Rails, PostgreSQL, Elastic Beanstalk]
image: /public/featured_images/deploying-a-rails-52-postgresql-app-on-aws-elastic-beanstalk.jpg
---

It's official, having used [Heroku](https://heroku.com/) for all my Rails projects so far spoiled me rotten. After receiving some AWS credits thanks to a pitch competition, I decided to deploy my latest project on [Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/) (Heroku's equivalent on [AWS](https://aws.amazon.com/)), and all I have to say is that I miss Heroku.

Alas, if you are in a similar situation, here are step-by-step instructions to deploying your Rails 5.2 / PostgreSQL app on Elastic Beanstalk.

## Installing the Elastic Beanstalk CLI
We will use the terminal in this tutorial, so let's begin with installing the "Elastic Beanstalk Command Line Interface." Here is how to do it on macOS using [Homebrew](https://brew.sh/):

```bash
brew install awsebcli
```

If you are using another platform, googling "how to install awsebcli on [your platform]" should lead you in the right direction.

## Initializing Elastic Beanstalk
I will assume that you already have an Amazon Web Services account, if not go ahead and create one. Now, go into the directory of your project, and initialize Elastic Beanstalk:

```bash
cd my_project
eb init
```

Then the EB CLI will ask you a few questions to initialize the Elastic Beanstalk application. The initialization part is straightforward, but if you get stuck anywhere you can check out the ["Configure the EB CLI"](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-configuration.html) page from the documentation.

## Creating a new environment
As you probably already know, your application can have multiple environments (think of them as different configurations). For example, you might have a "production" environment, which is the environment that you use for the user-facing version of your app. But you might want to have another environment named "staging" which you use to try new versions of your app, before pushing it to the production environment.

We can create an environment using the command below:

```bash
eb create production
```

## Deploying to Elastic Beanstalk
Assuming you are using Git, commit your changes before deploying your application. The EB CLI deploys your last commit, so if you deploy before committing, you will deploy an earlier version of your app.

After committing your changes, deploy using the following:

```bash
eb deploy
```

So far so good, now we need to set a few things before our app actually starts working.

## Setting up the master key
You can use the CLI for this purpose as well, but I prefer using the web panel for this. Here is how:

1. Go to AWS, choose "Services -> Elastic Beanstalk," then click on your environment.
2. Open the "Configuration" tab, and click "Modify" under the box titled "Software."
3. Under "Environment properties," add a new key named `RAILS_MASTER_KEY`, and set its value to the content of your "master.key" file. You can find this file in the "config" directory of your Rails app.
4. Click on the "Apply" button at the bottom of the page.

## Setting up a PostgreSQL database
Elastic Beanstalk provides an easy way to set up a database, which you can reach through "Configuration -> Database." I prefer not to use that, because if you need to rebuild your Elastic Beanstalk environment, your database will be deleted. So, we will set up the database separate from our Elastic Beanstalk environment.

### Creating a PostgreSQL database on RDS
1. Go to AWS, choose "Services -> RDS."
2. Choose "Create database."
3. Choose "PostgreSQL," and click "Next."
4. Select your use case, "Production" or "Dev/Test," and click "Next."
5. Here, you can try different options, and see what the estimated monthly costs are. Settle with something that is within your budget. You can start with a `db.t2.micro` instanance, no multi-AZ deployment and a general purpose SSD.
6. Choose an instance identifier, this is sort of a "namespace."
7. Choose a username and password, keep these handy for now, click "Next."
8. On the "Configure advanced settings" section, the important thing is the security groups. Select "Choose existing VPC security groups," and select the security group that looks like "...-AWSEBSecurityGroup-..."
9. Pick a database name, such as `my_app_production`.
10. Click on "Create database," this will take a while.

### Allowing access to the database
In the mean time, let's add Postgres access to your security group:

1. Go to AWS, choose "Services -> EC2."
2. Click on "Security Groups" on the left panel.
3. Choose the security group from the previous section.
4. Go to the "Inbound" tab, and click on "Edit."
5. Click on "Add Rule." For "Type," choose "PostgreSQL," and for "Source" choose "Anywhere."
6. Click "Save."

### Setting up the production database configuration
Now, in your Rails directory, open `config/database.yml`. Change it as such:

```yaml
# ...

production:
  <<: *default
  database: <%= ENV['RDS_DB_NAME'] %>
  username: <%= ENV['RDS_USERNAME'] %>
  password: <%= ENV['RDS_PASSWORD'] %>
  host: <%= ENV['RDS_HOSTNAME'] %>
  port: <%= ENV['RDS_PORT'] %>
```

### Adding relevant environment variables to Elastic Beanstalk
We told Rails to get the information for the production database using the above environment variables, but now we need to make sure that our Elastic Beanstalk environment includes these variables:

1. Go to AWS, choose "Services -> Elastic Beanstalk," then click on your environment.
2. Open the "Configuration" tab, and click "Modify" under the box titled "Software."
3. Under "Environment properties," add the following key-value pairs:
    1. `RDS_DB_NAME`: Database name you picked when setting up your database.
    2. `RDS_USERNAME`: User name you picked when setting up your database.
    3. `RDS_PASSWORD`: Password you picked when setting up your database.
    4. `RDS_HOSTNAME`: Go to "Services -> RDS," and you can find this information under the "Connect" section of your database instance information page. It is called "Endpoint."
    5. `RDS_PORT`: Set this to 5432.
6. Click on the "Apply" button at the bottom of the page.

After this, commit your Rails app directory again, and run `eb deploy`. You might want to wait a few minutes before doing this, because Elastic Beanstalk does some stuff in the background after updating environment variables.

After these steps, your Rails app "should" be running.

## Still not working?
If there are any issues, you can go to your EB environment on the AWS web panel, click on "Logs," and choose "Request Logs -> Last 100 Lines" to see the logs. But before doing that, I'd recommend trying to run your Rails app using the production environment on your local machine by using the command `rails s RAILS_ENV=production`.

---

I'll be first to admit that I'm not the most experinced person when it comes to deployment. As I said, I always used Heroku in the past, and I probably will use it for my future projects as well. These steps worked for me after a few days of scratching my head trying to set up my Rails app on Elastic Beanstalk, so I wanted to share these in hopes to save time for people who are in the same situation I was. So, take this all with a grain of salt, and good luck!