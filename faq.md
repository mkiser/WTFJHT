---
title: What The Fuck Does It Cost To Run This?
date: 2017-01-20 21:53:00 -08:00
image:
  twitter: "/public/wtfjht-t.jpg"
  facebook: "/public/wtfjht-f.jpg"
layout: page
sitemap: false
---

The cost of running What The Fuck Just Happened Today isn't free. It's [my full-time job]({{ site.baseurl }}/meta/trump-creates-one-new-job/) and I'm determined to keep this ad-free and sustainable. 

Here's a rough estimate of the monthly costs:

**Hosting:**
The site is hosted on Amazon S3 because it's highly scalable, reliable, fast, and generally an inexpensive data storage infrastructure option. _Monthly Cost:_ ~$30

**Podcast and Hosting:**
I also use AWS S3 to host the [daily podcast]({{ site.baseurl }}/podcasts/) and cache the files with AWS CloudFront. I also compensate Joe for producing and recording the daily podcast. Although he loves doing it, I strongly feel that people deserve to be compensated for their work. I provide him with a monthly stipend. All-in, it costs me about $1,000 to run the pod. _Monthly Cost:_ ~$1000

**S3 Stat:**
Spending all this money hosting a podcast doesn't mean much if you can't measure it. Using [S3 Stat](https://www.s3stat.com) let's me easily understand who is playing what pod on what device. _Monthly Cost:_ $10

**Site Search:**
This giant repository of news isn't very valuable if you can't find what you're looking for. I've implemented <a href="https://www.algolia.com/" target="_blank">Algolia</a>, the best instant search option out there. _Monthly Cost:_ $59

**Live Chat:**
I like to engage with the WTF family, so I've installed Chat.io, a livechat widget on the site. _Monthly Cost:_ $10

**Email Service:**
Oh boy, here's one of the most expensive parts of running the site. I use <a href="https://mailchimp.com/" target="_blank">MailChimp</a> because the ease of use, templating, reporting, and pre-built forms are the best in the business. While there are cheaper options out there, the time-savings is huge. For now, at least...

MailChimp charges by the number of subscribers you have AND the number of monthly emails sent. WTFJHT sends over 2.5M emails/month, and growing.

The costs of sending email will continue to go up as more people subscribe. MailChimp is an awesome company and they've provided us with a 15% discount. _Monthly Cost:_ At least $800; usually more.

**WTF Member Forum:**
The [WTF Member Forum](https://talk.whatthefuckjusthappenedtoday.com/) is a community that exists 24/7/365 to discuss the news, coordinate actions, share perspectives, and connect with likeminded people. It's a [Discourse](http://www.discourse.org/){:target="_blank"} community hub, which is amazing, free, and open sourced. It needs to be hosted somewhere, however. The provider of choice is [Digital Ocean](https://www.digitalocean.com){:target="_blank"}. _Monthly Cost:_ ~$20

**NewsWhip Spike:**
I recently started using [Spike by NewsWhip](https://www.newswhip.com/newswhip-spike/) to help me more quickly source the daily news. Their tool is incredible, but very expensive. They belive in the WTF mission and cut me a deal for access. _Monthly Cost:_ $100

**Python Anywhere:**
I wrote a Python script to help me source the top political news from across the web. I host it on Python Anywhere so I can access it on the go. _Monthly Cost:_ $5

**News Subscriptions:**
Quality journalism ain't free. I have subscriptions to the New York Times, Washington Post, and the Wall Street Journal. _Monthly Cost:_ ~$50

**Labor:**
Here's my conservative daily breakdown in time spent:

* 3-5 hours researching and collecting stories
* 2-3 hours curating the daily post
* 2-2 hours producing the newsletter, setting up the post, cutting images, publishing, troubleshooting, fixing typos
* 1-3 hours community management and distributing to Twitter and Facebook
* 1-4 hour site maintenance, help desk/support, etc

And, since I'm both the writer/editor and web developer running this, let's pretend my salary is the average between the two professions in Seattle. Via Glassdoor: [News Editor](https://www.glassdoor.com/Salaries/seattle-news-editor-salary-SRCH_IL.0,7_IM781_KO8,19.htm): $63,718. [Senior Web Developer](https://www.glassdoor.com/Salaries/seattle-senior-web-developer-salary-SRCH_IL.0,7_IM781_KO8,28.htm): $98,464. _Monthly Cost:_ ($63,718 + $98,464) / 2 = $81,091/year. <strong>$6,757</strong>

---

**TOTAL MONTHLY COST:**

$2,084 (hosting, email, tools, etc.) + $6,757 (labor) = <strong>$8,841</strong>.

As you can see, nobody is getting rich here. I'm just trying to keep WTF Just Happened Today sustainable. That's why your support is so important. [Become a member today]({{ site.baseurl }}/membership/).