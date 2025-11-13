# CLAUDE.md - AI Assistant Guide for WTFJHT

**Last Updated:** 2025-11-13
**Repository:** [mkiser/WTFJHT](https://github.com/mkiser/WTFJHT)
**Live Site:** https://whatthefuckjusthappenedtoday.com

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Content Types & Collections](#content-types--collections)
4. [Front Matter Conventions](#front-matter-conventions)
5. [Development Workflows](#development-workflows)
6. [Build & Deployment](#build--deployment)
7. [Key Technical Patterns](#key-technical-patterns)
8. [Common Tasks](#common-tasks)
9. [Important Files](#important-files)
10. [Critical Considerations](#critical-considerations)

---

## Project Overview

**What The Fuck Just Happened Today?** (WTFJHT) is a Jekyll-based static news website that provides daily summaries of political news from Washington D.C. Started during the Trump administration, it curates and aggregates political news into digestible daily posts.

### Key Characteristics

- **Platform:** Jekyll static site generator
- **Hosting:** AWS S3 + CloudFront CDN + Cloudflare
- **CI/CD:** Travis CI
- **Search:** Algolia full-text search
- **Newsletter:** MailChimp integration
- **Podcasts:** Audio summaries with RSS feed
- **Analytics:** Google Analytics, Facebook Pixel, custom engagement tracking

### Project Philosophy

- Independent voice with personal accountability
- Editorial curation of news (not original reporting)
- Sources are meticulously cited
- Diversity of news sources prioritized
- Day-by-day chronological logging of events

---

## Codebase Structure

```
WTFJHT/
├── _authors/           # Author profile pages (3 authors)
├── _data/              # YAML data files (status.yml for tracking)
├── _includes/          # Reusable template components (40+ files)
├── _layouts/           # Page layout templates (9 layouts)
├── _plugins/           # Custom Ruby plugins (5 plugins)
├── _posts/             # Daily news posts (246 files, ~2MB)
├── _podcasts/          # Podcast episodes (42 episodes)
├── _sass/              # SCSS stylesheets (10 files)
├── _topics/            # Topic aggregation pages (5 topics)
├── _uploads/           # Media files (podcasts, images, ~505MB)
├── public/             # Static assets (CSS, JS, fonts, images, ~29MB)
├── api/                # API endpoint templates
├── script/             # Build automation scripts
├── _config.yml         # Jekyll configuration
├── Gemfile             # Ruby dependencies
└── [20+ root pages]    # Static pages (index, about, archive, etc.)
```

### Directory Purposes

| Directory | Purpose | File Count |
|-----------|---------|------------|
| `_posts/` | Daily news summaries | 246 |
| `_podcasts/` | Audio episodes | 42 |
| `_includes/` | Reusable components | 40+ |
| `_layouts/` | Page templates | 9 |
| `_plugins/` | Custom Ruby plugins | 5 |
| `_topics/` | Topic pages | 5 |
| `_authors/` | Author profiles | 3 |
| `public/` | Static assets | 393 |

---

## Content Types & Collections

### 1. Posts (`_posts/`)

Daily news summaries following a strict chronological pattern.

**Naming Convention:** `YYYY-MM-DD-Day-N.md` or `YYYY-MM-DD-day-N.markdown`

**Examples:**
- `2017-01-20-Day-1.md` (Inauguration Day)
- `2017-11-22-day-307.markdown`

**URL Pattern:** Pretty URLs (`/2017/01/20/day-1/`)

**Content Format:**
```markdown
1/ **Headline in bold** with details and [source link](url)

2/ Next story with **bold emphasis** and [citations](url)

poll/ Special poll data

_Related:_
* Bullet point 1
* Bullet point 2
```

**Key Points:**
- Numbered list format (1/, 2/, 3/, etc.)
- Special prefixes: `poll/`, `related:`
- Always cite original sources
- Use bold for headlines/key phrases
- Line breaks between items

---

### 2. Podcasts (`_podcasts/`)

Audio summaries of daily posts.

**Naming Convention:** `day-N-title.markdown`

**Examples:**
- `day-264-power-of-the-pen.markdown`

**URL Pattern:** `/:year/:month/:day/podcast/`

**Key Points:**
- Links to MP3 files in `_uploads/`
- References corresponding post by title
- Includes duration and file size
- Author defaults to "Joe Amditis"
- Excluded from sitemaps/search

---

### 3. Topics (`_topics/`)

Aggregate pages for recurring themes.

**Examples:**
- `trump-travel-ban.markdown`
- `trump-health-care.markdown`
- `trump-russia-investigation.markdown`

**Key Points:**
- Collections of related posts
- Custom images in `/public/topics/`
- Used for thematic navigation
- Can have redirect aliases

---

### 4. Authors (`_authors/`)

Author profile pages.

**Current Authors:**
- Matt Kiser (founder, primary curator)
- Joe Amditis (podcast producer)
- Clayton Aldern (contributor)

**Key Points:**
- Includes photo, Twitter handle, email
- Excluded from sitemaps/search
- Used for bylines and author pages

---

## Front Matter Conventions

### Post Front Matter

```yaml
---
title: Day 307                    # Sequential day number
date: 2017-11-22 00:00:00 -08:00 # PST timezone
layout: post                      # Always 'post' for articles
description: Short tagline        # Shown in listings and meta
image:
  twitter: "/public/307-t.jpg"    # Twitter card (1.91:1, ~54KB)
  facebook: "/public/307-f.jpg"   # Facebook OG (1.91:1, ~66KB)
author: Matt Kiser                # Defaults to Matt Kiser
---
```

**Optional Fields:**
- `last_modified` - Update timestamp
- `contributors` - Number of contributors
- `seo.type` - Defaults to "NewsArticle"

---

### Podcast Front Matter

```yaml
---
title: 'Day 264: Power of the pen.'         # Episode title
date: 2017-10-10 14:35:00 -07:00           # Publication time
file: "/uploads/Day-264-Power.mp3"         # Path to MP3
post: Day 264                               # Links to post title
duration: '04:59'                           # Audio length (MM:SS)
length: 6615832                             # File size in bytes
image: "/uploads/264-update.jpg"            # Episode artwork
author: Joe Amditis                         # Podcast producer
---
```

**Required Fields:** `title`, `date`, `file`, `post`, `duration`, `length`

---

### Topic Front Matter

```yaml
---
title: Trump's Travel Ban.                  # Topic name
date: 2017-10-21 00:00:00 -07:00           # Last update
alt: Travel Ban                             # Short name
description: Here's the latest on...        # Summary
image: "/public/topics/trump-travel-ban.jpg"
seo:
  name: Trump's Travel Ban News
redirect_from: "/travel-ban/"               # URL aliases
---
```

---

### Author Front Matter

```yaml
---
title: Matt Kiser                           # Display name
twitter: matt_kiser                         # Twitter handle
image: "/public/author-imgs/matt.jpg"       # Profile photo
email: matt@whatthefuckjusthappenedtoday.com
---
```

---

## Development Workflows

### Local Development

```bash
# Install dependencies
bundle install

# Run local server
bundle exec jekyll serve

# View at http://localhost:4000
```

### Creating a New Post

1. **Create file:** `_posts/YYYY-MM-DD-day-N.markdown`
2. **Add front matter** with title, date, description
3. **Write content** using numbered list format
4. **Add images** to `/public/` with naming: `N-t.jpg` (Twitter), `N-f.jpg` (Facebook)
5. **Cite sources** with inline links
6. **Preview locally** before committing
7. **Commit and push** - Travis CI handles deployment

### Content Guidelines

**DO:**
- ✅ Number items sequentially (1/, 2/, 3/)
- ✅ Bold the main headline of each item
- ✅ Cite original source for every claim
- ✅ Use descriptive link text
- ✅ Include social media images
- ✅ Check for typos and grammar
- ✅ Verify all links work

**DON'T:**
- ❌ Skip day numbers in sequence
- ❌ Use editorial language without attribution
- ❌ Omit source citations
- ❌ Use generic link text like "here" or "link"
- ❌ Forget social media images
- ❌ Push directly without local testing

### Editing Existing Posts

1. **Find post** in `_posts/YYYY-MM-DD-day-N.markdown`
2. **Edit content** preserving front matter
3. **Add `last_modified` field** to front matter if significant changes
4. **Commit with clear message** explaining the update
5. **Push** - Travis will rebuild and deploy

---

## Build & Deployment

### Build Process

**Script:** `./script/cibuild`

```bash
#!/usr/bin/env bash
set -e # halt script on error

JEKYLL_ENV=production bundle exec jekyll build
bundle exec jekyll algolia push
```

**Steps:**
1. Build Jekyll site with production environment
2. Push content to Algolia search index

---

### CI/CD Pipeline (Travis CI)

**Configuration:** `.travis.yml`

**Workflow:**
1. **Trigger:** Push to `master` branch
2. **Environment:** Ruby 2.3.3, bundler cache
3. **Build:** Execute `./script/cibuild`
4. **Deploy:** Upload `_site/` to S3 bucket
5. **Cache Purge:** Clear Cloudflare cache via API
6. **Notify:** Send Slack notification

**Environment Variables Required:**
- AWS credentials (for S3 deployment)
- `ALGOLIA_API_KEY` (for search indexing)
- Cloudflare API credentials (for cache purging)
- Twitter API keys (for tweet plugin)
- Slack webhook (for notifications)

**Important:** Only `master` branch deploys to production.

---

## Key Technical Patterns

### Layouts Architecture

```
default.html (base template)
├── post.html (articles)
├── pod.html (podcasts)
├── author.html (author pages)
├── topics.html (topic pages)
├── page.html (static pages)
├── month-archive.html (monthly archives)
└── year-archive.html (yearly archives)
```

**Special Layouts:**
- `amp.html` - Accelerated Mobile Pages version
- `river.html` - Experimental (disabled)

---

### Includes Structure

**Navigation & Layout:**
- `head.html` - Meta tags, CSS, favicons, feeds
- `foot.html` - Footer, scripts, analytics
- `archive-nav.html` - Archive navigation
- `45nav.html`, `45tout.html` - First 100 days

**Content Components:**
- `pod.html` - Audio player (audiojs)
- `email.html` - MailChimp signup form
- `social.html` - Share buttons
- `pledge.html` - Membership drive (DonorBox)
- `comments.html` - Discourse integration

**Analytics & Tracking:**
- `ga.html` - Google Analytics
- `fb.html` - Facebook Pixel
- `scrolldepth.html` - Scroll tracking
- `clickEvent.html` - Click tracking
- `riveted.min.js` - Engagement tracking
- `push.html` - OneSignal notifications

**Technical:**
- `algolia.html` - Search implementation
- `anchors.html` - Header anchor links
- `seo.html` - SEO metadata
- `read_time.html` - Reading time estimate
- `post-modified.html` - Last modified meta

---

### Custom Plugins

**Location:** `_plugins/`

1. **itemizer.rb**
   - Parses numbered list items into JSON structure
   - Used for API endpoints (`/api/v1/status.json`)
   - Splits by pattern: `<p>\d+/`

2. **rssgenerator.rb**
   - Custom RSS 2.0 feed generation
   - Respects `rss_post_limit` config

3. **jekyll-twitter-plugin.rb**
   - Embeds tweets from Twitter API
   - Caches tweets in filesystem
   - **Requires:** Twitter API credentials in ENV

4. **last_modified.rb**
   - Tracks last modified date for posts
   - Updates `page.last_modified` automatically

5. **youtube.rb**
   - YouTube video embed support

**Note:** `river.rb` is present but disabled.

---

### Liquid Template Patterns

**Author Lookup:**
```liquid
{% assign author = site.authors | where: 'title', page.author | first %}
<a href="{{ author.url }}">{{ author.title }}</a>
```

**Podcast Linking:**
```liquid
{% assign ep = site.podcasts | where: 'post', page.title | first %}
{% if ep %}
  <a href="{{ ep.url }}">Listen to podcast</a>
{% endif %}
```

**Pagination:**
```liquid
{% for post in paginator.posts %}
  <article>{{ post.content }}</article>
{% endfor %}
```

**Date Formatting:**
```liquid
{{ page.date | date: "%-m/%-d/%Y" }}  # 1/20/2017
{{ page.date | date: "%B %d, %Y" }}   # January 20, 2017
```

---

### Algolia Search

**Configuration:** `_config.yml`

```yaml
algolia:
  application_id: UI0QYYDNB1
  index_name: WTFJHT
  read_only_api_key: 50fe80eaf3c61b236fe7408e8be4bc30
  record_css_selector: p,li,blockquote
```

**Features:**
- Instant search overlay
- Content indexed: paragraphs, lists, blockquotes
- 32+ excluded files (static pages, archives, feeds)
- Search analytics enabled

**Implementation:** `/public/js/algolia.js` + `_includes/algolia.html`

---

### External Link Handling

**Plugin:** `jekyll-extlinks`

**Configuration:**
```yaml
extlinks:
  attributes:
    target: _blank
    rel: noopener
    class: external
  rel_exclude:
  - whatthefuckjusthappenedtoday.com
```

**Result:** All external links open in new tab with security attributes.

---

### Archive Generation

**Plugin:** `jekyll-archives`

**Enabled Archives:**
- Yearly: `/archive/2017/`
- Monthly: `/archive/2017/11/`

**Layouts:**
- `year-archive.html`
- `month-archive.html`

---

## Common Tasks

### Task 1: Add a New Daily Post

```bash
# 1. Create new post file
touch _posts/$(date +%Y-%m-%d)-day-XXX.markdown

# 2. Add front matter and content
# (Use editor to add YAML front matter and numbered items)

# 3. Add social media images
# Save to /public/XXX-t.jpg and /public/XXX-f.jpg

# 4. Preview locally
bundle exec jekyll serve

# 5. Commit and push
git add _posts/$(date +%Y-%m-%d)-day-XXX.markdown public/XXX-*.jpg
git commit -m "Add Day XXX post"
git push origin master
```

---

### Task 2: Create a New Topic Page

```bash
# 1. Create topic file
touch _topics/new-topic.markdown

# 2. Add front matter
cat > _topics/new-topic.markdown <<EOF
---
title: New Topic Name
date: $(date +%Y-%m-%d) 00:00:00 -08:00
alt: Short Name
description: Topic description
image: "/public/topics/new-topic.jpg"
---
EOF

# 3. Add topic image
# Save image to /public/topics/new-topic.jpg

# 4. Commit and push
git add _topics/new-topic.markdown public/topics/new-topic.jpg
git commit -m "Add new topic: New Topic Name"
git push origin master
```

---

### Task 3: Add a Podcast Episode

```bash
# 1. Upload MP3 to _uploads/
cp episode.mp3 _uploads/Day-XXX-title.mp3

# 2. Get file size
stat -f%z _uploads/Day-XXX-title.mp3

# 3. Get duration (use audio tool)

# 4. Create podcast file
cat > _podcasts/day-XXX-title.markdown <<EOF
---
title: 'Day XXX: Episode Title'
date: $(date +%Y-%m-%d) 14:00:00 -07:00
file: "/uploads/Day-XXX-title.mp3"
post: Day XXX
duration: 'MM:SS'
length: FILESIZE
image: "/uploads/XXX-pod.jpg"
---
EOF

# 5. Commit and push
git add _podcasts/ _uploads/
git commit -m "Add Day XXX podcast"
git push origin master
```

---

### Task 4: Update Site Configuration

```bash
# 1. Edit _config.yml
vim _config.yml

# 2. Test locally (config changes require restart)
bundle exec jekyll serve

# 3. Commit and push
git add _config.yml
git commit -m "Update site configuration: [describe change]"
git push origin master
```

---

### Task 5: Add a New Include Component

```bash
# 1. Create include file
touch _includes/new-component.html

# 2. Add HTML/Liquid markup

# 3. Use in layout
# {% include new-component.html %}

# 4. Test locally
bundle exec jekyll serve

# 5. Commit and push
git add _includes/new-component.html
git commit -m "Add new include: new-component"
git push origin master
```

---

### Task 6: Update Styles

```bash
# 1. Edit SCSS files in _sass/
vim _sass/_posts.scss

# 2. Preview locally
bundle exec jekyll serve

# 3. Commit and push
git add _sass/
git commit -m "Update post styles: [describe change]"
git push origin master
```

---

## Important Files

### Configuration Files

| File | Purpose |
|------|---------|
| `_config.yml` | Jekyll configuration, collections, plugins, external service keys |
| `Gemfile` | Ruby dependencies |
| `Gemfile.lock` | Locked dependency versions |
| `.travis.yml` | CI/CD configuration |
| `.gitignore` | Git exclusions |

---

### Key Template Files

| File | Purpose |
|------|---------|
| `_layouts/default.html` | Base template for all pages |
| `_layouts/post.html` | Article page template |
| `_includes/head.html` | Site header, meta tags, CSS |
| `_includes/foot.html` | Site footer, scripts, analytics |
| `_includes/algolia.html` | Search implementation |

---

### Data Files

| File | Purpose |
|------|---------|
| `_data/status.yml` | Tracks Trump admin status, cabinet, initiatives |

---

### Build Scripts

| File | Purpose |
|------|---------|
| `script/cibuild` | Main build script (Jekyll build + Algolia push) |

---

### API Endpoints

| File | Purpose |
|------|---------|
| `api/today.json` | Today's post as JSON |
| `api/v1/status.json` | Status data (uses itemizer plugin) |

---

### Feed Files

| File | Purpose |
|------|---------|
| `atom.xml` | Atom feed (50 posts) |
| `news.xml` | News feed |
| `instant-feed.xml` | Instant updates |
| `instantfeed.xml` | Alternative instant feed |

---

## Critical Considerations

### 1. SEO and Social Media

**Always include social media images** for posts:
- Twitter: `N-t.jpg` (54KB, 1.91:1 ratio)
- Facebook: `N-f.jpg` (66KB, 1.91:1 ratio)

**Meta tags are critical:**
- Title must be under 60 characters
- Description should be 150-160 characters
- All posts have `seo.type: NewsArticle`

---

### 2. Source Attribution

**NEVER write content without attribution.** Every claim must cite the original source with:
- Inline link to original article
- Publication name in parentheses
- Example: `([NY Times](url))`

---

### 3. Content Formatting

**Numbered list format is required:**
```markdown
1/ Headline here with [source](url)

2/ Next item with [source](url)
```

**NOT:**
```markdown
1. Headline here
2. Next item
```

**Special prefixes:**
- `poll/` for poll data
- `_Related:_` for related links
- Bold (`**text**`) for headlines

---

### 4. File Naming Conventions

**Posts:** MUST follow `YYYY-MM-DD-day-N.markdown` or `YYYY-MM-DD-Day-N.md`
- Lowercase "day" in newer posts
- Uppercase "Day" in older posts
- Sequential day numbering

**Images:** `N-t.jpg` (Twitter), `N-f.jpg` (Facebook)

**Podcasts:** `day-N-title.markdown`

**Topics:** `slug-with-hyphens.markdown`

---

### 5. Timezone Considerations

**All dates use Pacific Time (PST/PDT):**
```yaml
date: 2017-11-22 00:00:00 -08:00  # PST
date: 2017-06-15 00:00:00 -07:00  # PDT
```

---

### 6. Build and Deployment

**Only `master` branch deploys to production.**

**Build failures will prevent deployment:**
- Syntax errors in Liquid templates
- Invalid YAML front matter
- Missing dependencies
- Plugin errors

**Always test locally before pushing:**
```bash
bundle exec jekyll serve
```

**Watch the Travis CI build:**
- Check build logs for errors
- Verify deployment to S3
- Confirm Cloudflare cache purge
- Check Slack notification

---

### 7. Search Indexing

**Algolia indexing happens automatically on build.**

**To manually update Algolia:**
```bash
ALGOLIA_API_KEY=your_key bundle exec jekyll algolia push
```

**Excluded from search:**
- Static pages (about, FAQ, etc.)
- Archives
- Author pages
- Podcast pages
- Feeds

---

### 8. Performance Considerations

**Image optimization is critical:**
- Social media images should be under 100KB
- Use JPG for photos, PNG for graphics
- Optimize before committing

**CDN usage:**
- CloudFront serves media from `_uploads/`
- Cloudflare caches the entire site
- Cache purge happens automatically on deploy

---

### 9. Analytics and Tracking

**Multiple tracking systems are active:**
- Google Analytics (UA-91051784-1)
- Facebook Pixel (181350185699344)
- Scroll depth tracking
- Engagement tracking (Riveted.js)
- Click event tracking

**Privacy considerations:**
- All tracking in production only
- Users can opt-out via browser settings

---

### 10. Content Update Strategy

**For corrections or updates:**
1. Edit the original post file
2. Add `last_modified` field to front matter
3. Add editor's note in content if significant
4. Commit with clear message explaining update
5. Push to trigger rebuild

**For breaking news:**
1. Update existing post if same day
2. Create new post if next day
3. Link between related posts

---

## Environment Variables

Required for full functionality:

```bash
# Algolia Search
ALGOLIA_API_KEY=xxx

# Twitter Plugin
TWITTER_CONSUMER_KEY=xxx
TWITTER_CONSUMER_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_TOKEN_SECRET=xxx

# Deployment (Travis CI)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_EMAIL=xxx
CLOUDFLARE_API_KEY=xxx
SLACK_WEBHOOK_URL=xxx
```

---

## Dependencies

### Ruby Gems

```ruby
gem 'github-pages'          # GitHub Pages compatible Jekyll
gem 'jekyll-sitemap'        # XML sitemap generation
gem 'jekyll-paginate'       # Pagination (3 posts/page)
gem 'jekyll-redirect-from'  # URL redirects
gem 'jekyll-extlinks'       # External link handling
gem 'jekyll-archives'       # Archive generation
gem 'algoliasearch-jekyll'  # Algolia search indexing
gem 'jekyll_pages_api'      # API endpoint generation
```

### JavaScript Libraries

- jQuery 3.x
- Algolia InstantSearch
- Hogan.js (Mustache templates)
- Moment.js (date handling)
- Riveted.js (engagement tracking)
- Audio.js (podcast player)
- Anchor.js (header links)
- jQuery ScrollDepth

---

## Troubleshooting

### Build Fails on Travis CI

1. Check `.travis.yml` syntax
2. Verify environment variables are set
3. Check Jekyll build locally
4. Review Travis CI logs for specific error
5. Ensure all dependencies in `Gemfile`

### Search Not Working

1. Verify `ALGOLIA_API_KEY` is set
2. Check Algolia dashboard for index
3. Rebuild and push to Algolia: `bundle exec jekyll algolia push`
4. Check browser console for JS errors
5. Verify read-only API key in `_config.yml`

### Images Not Loading

1. Check CloudFront URL in `_config.yml`
2. Verify images exist in `/public/` or `/_uploads/`
3. Check S3 bucket for uploaded files
4. Clear Cloudflare cache manually if needed
5. Verify image paths are absolute (start with `/`)

### Local Build Fails

1. Run `bundle install` to update dependencies
2. Clear `_site/` directory: `rm -rf _site/`
3. Clear `.jekyll-metadata`: `rm .jekyll-metadata`
4. Check Ruby version (2.3.3 required)
5. Check for invalid YAML in front matter

### Podcast Not Playing

1. Verify MP3 file exists in `_uploads/`
2. Check file path is absolute in front matter
3. Verify CloudFront URL is correct
4. Check file size and duration are accurate
5. Test MP3 file plays in standalone player

---

## Quick Reference

### Day Numbering

- Day 1: January 20, 2017 (Inauguration Day)
- Sequential numbering from Day 1
- Last post in repo: Day 307 (November 22, 2017)

### Color Scheme

- Primary: Blue (#0066CC)
- Accent: Red (#FF0000)
- Text: Dark gray (#333)
- Background: White (#FFF)

### Fonts

- Headings: Oswald (Google Fonts)
- Body: Poppins (Google Fonts)
- Fallbacks: System fonts

### Image Sizes

- Twitter cards: 1200x628px (1.91:1)
- Facebook OG: 1200x630px (1.91:1)
- Author photos: 300x300px (square)
- Topic images: Varies

---

## Resources

- **Live Site:** https://whatthefuckjusthappenedtoday.com
- **GitHub Repo:** https://github.com/mkiser/WTFJHT
- **Jekyll Docs:** https://jekyllrb.com/docs/
- **Liquid Docs:** https://shopify.github.io/liquid/
- **Algolia Docs:** https://www.algolia.com/doc/
- **Travis CI Docs:** https://docs.travis-ci.com/

---

## Contact

- **Founder/Editor:** Matt Kiser
- **Email:** matt@whatthefuckjusthappenedtoday.com
- **Twitter:** [@WTFJHT](https://twitter.com/WTFJHT) / [@matt_kiser](https://twitter.com/matt_kiser)

---

## License

Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License

---

**Note for AI Assistants:** This documentation is comprehensive but may not cover every edge case. When in doubt:
1. Check existing files for patterns
2. Test locally before pushing
3. Review recent commits for context
4. Ask clarifying questions if requirements are unclear
5. Prioritize content accuracy and source attribution above all else
