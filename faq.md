---
layout: page
title: What The Fuck Does It Cost To Run This?
image:
  twitter: /public/wtfjht-t.jpg
  facebook: /public/wtfjht-f.jpg
---

<p class="lead">The cost of running What The Fuck Just Happened Today? isn't free. I'm donating my time and paying these costs out of pocket to keep the WTFJHT newsletter and site going. Here's a rough estimate of the monthly costs:</p>

**Hosting:**
The site is hosted on as a free <a href="https://pages.github.com/" target="_blank">GitHub Page</a>. It's great, but there are some limitations, including <a href="https://help.github.com/articles/what-is-github-pages/" target="_blank">bandwidth limits</a> and it's difficult for a n00b like me to setup continious integration. 

I'm moving the site to an Amazon S3 bucket because it's highly scalable, reliable, fast, and generally an inexpensive data storage infrastructure option. _Monthly Cost:_ ~$20

**Site Search:**
This giant repository of news isn't very valuable if you can't find the what you're looking for. I've implemented <a href="https://www.algolia.com/" target="_blank">Algolia</a>, the best instant search option out there. _Monthly Cost:_ $59

**Email Sending:**
Oh boy, here's the most expensive part of running this site. I use <a href="https://mailchimp.com/" target="_blank">MailChimp</a> because the ease of use, templating, reporting, and pre-built forms are the best in the business. While there are cheaper options out there, the time-savings is huge. 

MailChimp charges by the number of subscribers you have AND the number of monthly emails sent. WTFJHT sends over 1.5M emails/month (50,000+ subscribers x 30 days) Check out the <a href="https://mailchimp.com/pricing/growing-business/" target="_blank">MailChimp Pricing Calculator</a> and stick 150,000 in there to see the pricing for sending 1,800,000 emails/month. Yeah. And, we're still growing...

So while the costs of sending email will continue to go up as more people subscribe, MailChimp is an awesome company, they've provided us with a 15% discount. _Monthly Cost:_ At least $465

**Civilized Discussion Forum:**
While not technically launched, yet, I'm launching a private community forum. It's a [Discourse](http://www.discourse.org/){:target="_blank"} community hub, which is amazing, free, and open sourced. It needs to be hosted somewhere, however. The provider of choice is [Digital Ocean](https://www.digitalocean.com){:target="_blank"}. _Monthly Cost:_ $20

**Labor:**
While I'm donating my time to keep this project going, let's do some math and see what this would cost if I needed to make an income. Here's my conservative daily breakdown in time spent:

* 1 hour researching and collecting stories
* 1 hour curating the daily post
* .5 hour setting up the post, cutting images, publishing, testing
* .5 hour distributing to Twitter and Facebook 
* .75 hour setting up and sending the newsletter 
* 1 hour site maintenance, help desk/support, etc

Okay, so ~4.75 hours/day. And, let's pretend I make the Federal minimum wage ($7.25). _Monthly Cost:_ 4.75 x 30 x $7.25 = <strong>$1,033.13</strong>

---

**TOTAL MONTHLY COST:**

$20 (hosting) + $59 (site search) + $465 (email) $20 (community) + $1,033.13 (labor) = <strong>$1,597.13</strong>
