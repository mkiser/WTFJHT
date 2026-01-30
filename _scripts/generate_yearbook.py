#!/usr/bin/env python3
"""
Generate WTFJHT Yearbook PDFs
Usage: python generate_yearbook.py [year]
Example: python generate_yearbook.py 2017
"""

import os
import sys
import re
import glob
from datetime import datetime
from pathlib import Path

# WeasyPrint for PDF generation
from weasyprint import HTML, CSS

# For markdown parsing
import markdown

def parse_front_matter(content):
    """Extract YAML front matter and body from a post."""
    if not content.startswith('---'):
        return {}, content

    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content

    front_matter = {}
    for line in parts[1].strip().split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            front_matter[key.strip()] = value.strip().strip('"\'')

    return front_matter, parts[2].strip()

def clean_markdown(text):
    """Clean up markdown for print."""
    # Remove Jekyll liquid tags like {{ site.baseurl }}
    text = re.sub(r'\{\{\s*site\.(baseurl|url)\s*\}\}', '', text)

    # Remove Twitter/YouTube embeds: {% twitter ... %}
    text = re.sub(r'\{%\s*twitter\s+[^%]+%\}', '', text)
    text = re.sub(r'\{%\s*youtube\s+[^%]+%\}', '', text)
    text = re.sub(r'\{%\s*facebook\s+[^%]+%\}', '', text)
    text = re.sub(r'\{%\s*instagram\s+[^%]+%\}', '', text)

    # Remove source citations in parentheses: ([Source](url)) or ([Source](url) / [Source2](url2))
    # This matches: ([text](url)) with optional additional sources separated by /
    text = re.sub(r'\s*\(\s*\[[^\]]+\]\([^)]+\)(\s*/\s*\[[^\]]+\]\([^)]+\))*\s*\)', '', text)

    # Also remove standalone parenthetical source references like (Source Name)
    # But be careful not to remove legitimate parentheticals
    # Only remove if it looks like a source: ([Source])
    text = re.sub(r'\s*\(\s*\[[^\]]+\]\s*\)', '', text)

    # Clean up resulting double slashes in URLs
    text = re.sub(r'href="//', 'href="/', text)

    # Clean up multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()

def format_date(date_str):
    """Format date string for display."""
    try:
        if ' ' in date_str:
            date_str = date_str.split(' ')[0]
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.strftime('%B %d, %Y')
    except:
        return date_str

def format_date_short(date_str):
    """Format date string for TOC."""
    try:
        if ' ' in date_str:
            date_str = date_str.split(' ')[0]
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.strftime('%b %d')
    except:
        return date_str

def load_posts(year, posts_dir):
    """Load all posts for a given year."""
    # Match both .md and .markdown extensions
    files = []
    for ext in ['*.md', '*.markdown']:
        pattern = os.path.join(posts_dir, f'{year}-{ext}')
        files.extend(glob.glob(pattern))
    files = sorted(set(files))  # Remove duplicates and sort

    posts = []
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        front_matter, body = parse_front_matter(content)

        # Extract day number from title
        title = front_matter.get('title', 'Untitled')
        day_match = re.search(r'Day\s+(\d+)', title)
        day_num = int(day_match.group(1)) if day_match else 0

        posts.append({
            'title': title,
            'date': front_matter.get('date', ''),
            'description': front_matter.get('description', ''),
            'body': clean_markdown(body),
            'day_num': day_num,
            'filename': os.path.basename(filepath)
        })

    # Sort by day number
    posts.sort(key=lambda p: p['day_num'])
    return posts

def generate_html(year, posts):
    """Generate the complete HTML document."""
    md = markdown.Markdown(extensions=['extra', 'smarty'])

    # Calculate stats
    total_days = len(posts)
    first_day = posts[0]['day_num'] if posts else 0
    last_day = posts[-1]['day_num'] if posts else 0

    html_parts = []

    # Cover page
    html_parts.append(f'''
    <div class="cover">
        <div class="cover-content">
            <h1 class="cover-title">WTF Just Happened Today?</h1>
            <div class="cover-year">{year}</div>
            <div class="cover-subtitle">Today's essential guide to the daily shock and awe in national politics.</div>
            <div class="cover-meta">
                Days {first_day}&ndash;{last_day}<br>
                {total_days} Editions
            </div>
        </div>
    </div>
    ''')

    # Table of contents - compact multi-column layout
    html_parts.append('<div class="toc"><h2>Contents</h2><div class="toc-columns">')

    current_month = None
    for post in posts:
        try:
            date_str = post['date'].split(' ')[0] if ' ' in post['date'] else post['date']
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            month_name = dt.strftime('%B')

            if month_name != current_month:
                if current_month:
                    html_parts.append('</div>')  # Close previous month
                current_month = month_name
                html_parts.append(f'<div class="toc-month"><span class="toc-month-name">{month_name}</span>')
        except:
            pass

        short_date = format_date_short(post['date'])
        html_parts.append(f'<a href="#day-{post["day_num"]}" class="toc-item">'
                         f'<span class="toc-day">{post["day_num"]}</span>'
                         f'<span class="toc-date">{short_date}</span></a>')

    html_parts.append('</div></div></div>')  # Close last month, columns, and TOC

    # Posts
    for post in posts:
        post_html = md.convert(post['body'])
        md.reset()

        formatted_date = format_date(post['date'])

        html_parts.append(f'''
        <article class="post" id="day-{post['day_num']}">
            <header class="post-header">
                <div class="post-day">Day {post['day_num']}</div>
                <div class="post-date">{formatted_date}</div>
                <h2 class="post-title">{post['description']}</h2>
            </header>
            <div class="post-content">
                {post_html}
            </div>
        </article>
        ''')

    # Colophon
    html_parts.append(f'''
    <div class="colophon">
        <h2>About This Edition</h2>
        <p>This yearbook contains {total_days} editions of <strong>What The Fuck Just Happened Today?</strong>
        from {year}, covering Days {first_day} through {last_day}.</p>
        <p>WTFJHT is a free, independent newsletter that chronicles the daily shock and awe
        in American national politics. Started on Inauguration Day 2017.</p>
        <p>Source citations have been removed for readability.
        Visit the website for fully sourced editions with links to original reporting.</p>
        <p class="colophon-url">whatthefuckjusthappenedtoday.com</p>
        <p class="colophon-generated">Generated {datetime.now().strftime('%B %d, %Y')}</p>
    </div>
    ''')

    # Wrap in document
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>WTF Just Happened Today? - {year}</title>
</head>
<body>
    {''.join(html_parts)}
</body>
</html>'''

    return html

def get_css():
    """Return the print stylesheet - matching WTFJHT brand."""
    return '''
@page {
    size: letter;
    margin: 0.75in 0.75in 1in 0.75in;

    @bottom-center {
        content: counter(page);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif;
        font-size: 9pt;
        color: #767676;
    }
}

@page :first {
    @bottom-center { content: none; }
}

* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #515151;
}

/* Cover page */
.cover {
    page-break-after: always;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.cover-content {
    max-width: 5in;
}

.cover-title {
    font-size: 24pt;
    font-weight: 600;
    margin: 0 0 0.15in 0;
    color: #313131;
    line-height: 1.2;
}

.cover-year {
    font-size: 96pt;
    font-weight: 700;
    color: #313131;
    margin: 0.15in 0;
    letter-spacing: -3pt;
    line-height: 1;
}

.cover-subtitle {
    font-size: 11pt;
    color: #767676;
    margin: 0.3in 0;
    font-style: italic;
}

.cover-meta {
    font-size: 10pt;
    color: #767676;
    margin-top: 0.5in;
    line-height: 1.6;
}

/* Table of Contents - compact multi-column */
.toc {
    page-break-after: always;
}

.toc h2 {
    font-size: 14pt;
    font-weight: 600;
    margin: 0 0 0.2in 0;
    color: #313131;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 0.1in;
}

.toc-columns {
    columns: 3;
    column-gap: 0.25in;
    font-size: 8pt;
}

.toc-month {
    break-inside: avoid;
    margin-bottom: 0.15in;
}

.toc-month-name {
    display: block;
    font-weight: 600;
    color: #313131;
    font-size: 9pt;
    margin-bottom: 0.03in;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 0.02in;
}

.toc-item {
    display: inline-block;
    text-decoration: none;
    color: #515151;
    margin-right: 0.08in;
    white-space: nowrap;
}

.toc-day {
    font-weight: 600;
    color: #313131;
}

.toc-date {
    color: #767676;
    font-size: 7pt;
}

/* Posts */
.post {
    page-break-before: always;
}

.post-header {
    margin-bottom: 0.2in;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 0.15in;
}

.post-day {
    font-size: 10pt;
    font-weight: 600;
    color: #767676;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
}

.post-date {
    font-size: 9pt;
    color: #767676;
    margin-top: 0.02in;
}

.post-title {
    font-size: 16pt;
    font-weight: 600;
    margin: 0.1in 0 0 0;
    color: #313131;
    line-height: 1.25;
}

.post-content {
    columns: 1;
}

.post-content p {
    margin: 0 0 0.12in 0;
    text-align: left;
}

.post-content strong {
    color: #313131;
    font-weight: 600;
}

.post-content a {
    color: #515151;
    text-decoration: none;
}

.post-content em {
    font-style: italic;
}

/* Lists */
.post-content ul, .post-content ol {
    margin: 0 0 0.12in 0.2in;
    padding: 0;
}

.post-content li {
    margin-bottom: 0.06in;
}

/* Blockquotes */
.post-content blockquote {
    margin: 0.12in 0 0.12in 0.2in;
    padding-left: 0.12in;
    border-left: 2px solid #ccc;
    color: #767676;
}

.post-content blockquote p {
    margin-bottom: 0.06in;
}

/* Horizontal rules */
.post-content hr {
    border: none;
    border-top: 1px solid #e5e5e5;
    margin: 0.15in 0;
}

/* Colophon */
.colophon {
    page-break-before: always;
    text-align: center;
    padding-top: 2in;
}

.colophon h2 {
    font-size: 12pt;
    font-weight: 600;
    color: #313131;
    margin-bottom: 0.2in;
}

.colophon p {
    font-size: 9pt;
    color: #767676;
    max-width: 4.5in;
    margin: 0.08in auto;
    line-height: 1.5;
}

.colophon strong {
    color: #515151;
}

.colophon-url {
    font-weight: 600;
    color: #313131 !important;
    margin-top: 0.3in !important;
    font-size: 10pt !important;
}

.colophon-generated {
    font-size: 8pt !important;
    color: #ccc !important;
    margin-top: 0.4in !important;
}
'''

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_yearbook.py <year>")
        print("Example: python generate_yearbook.py 2017")
        sys.exit(1)

    year = sys.argv[1]

    # Paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    posts_dir = project_root / '_posts'
    output_dir = project_root / 'downloads' / 'yearbooks'
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating WTFJHT Yearbook for {year}...")

    # Load posts
    posts = load_posts(year, posts_dir)
    if not posts:
        print(f"No posts found for {year}")
        sys.exit(1)

    print(f"Found {len(posts)} posts")

    # Generate HTML
    html = generate_html(year, posts)

    # Debug: save HTML for inspection
    html_path = output_dir / f'wtfjht-{year}.html'
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Saved HTML to {html_path}")

    # Generate PDF
    pdf_path = output_dir / f'wtfjht-{year}.pdf'
    print(f"Generating PDF...")

    css = CSS(string=get_css())
    HTML(string=html, base_url=str(project_root)).write_pdf(pdf_path, stylesheets=[css])

    print(f"Saved PDF to {pdf_path}")

    # File size
    size_mb = os.path.getsize(pdf_path) / (1024 * 1024)
    print(f"PDF size: {size_mb:.1f} MB")

if __name__ == '__main__':
    main()
