# Security Policy

## Scope

This repository holds the Jekyll source for the public WTFJHT site
(whatthefuckjusthappenedtoday.com): the site build (`_layouts`, `_includes`,
`_plugins`, `_data`, `_posts`), the GitHub Actions deploy pipeline
(`.github/workflows/`), the published HTML/CSS/JS output, and the
third-party script embeds loaded by published pages (Google Tag Manager,
Cloudflare Turnstile, jsDelivr-hosted html2canvas).

Out of scope:

- The newsletter/email delivery platform (Mailchimp) and the subscriber
  database itself.
- Memberful account and subscription surfaces.
- PasteUp, the separate private publishing platform this site's workflows
  call out to (`trigger-audio-edition.yml`).
- Notion, Airtable, and Slack, and any other third-party account or
  integration this repository does not directly control.
- The GitHub, AWS, and Cloudflare accounts themselves — report account-level
  issues (stolen credentials, account takeover) to those providers, not here.
- Denial-of-service or load testing against the live site.

## Assets

The things a vulnerability here can put at risk:

- **Publication integrity.** The published content readers see. An attacker
  who can alter it can misattribute statements to WTFJHT or serve malicious
  content to readers under a trusted domain.
- **Deploy credentials.** The AWS S3 write credentials and Cloudflare
  cache-purge API key that let the pipeline publish to production.
- **GitHub Actions secrets.** All repository secrets used by the three
  workflows in `.github/workflows/`, including the deploy credentials above
  plus the Slack webhook URL, the Podcast Index API key/secret, and the
  PasteUp audio auth token.
- **Reader-facing JS.** Code that runs in a real reader's browser
  (`public/js/*`, inline scripts in `_layouts`), including the subscribe flow
  and any third-party script the site loads.

## Trust boundaries

- **Contributor / pull request → build.** A pull request runs no workflow
  with repository secrets (see Security invariants). A push to `master`
  from a repository collaborator does trigger the deploy pipeline.
- **GitHub Actions → AWS S3.** `build-and-deploy.yml` authenticates to AWS
  with the `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` secrets and writes
  the built `_site/` directly to the production S3 bucket.
- **Build output → Cloudflare → reader browser.** The S3-published site is
  served to readers through Cloudflare, which the pipeline also
  cache-purges on every deploy using a separate Cloudflare API key.
- **Third-party scripts → reader browser.** Published pages load Google
  Tag Manager (`googletagmanager.com`) on every page, Cloudflare Turnstile
  (`challenges.cloudflare.com`) on the subscribe form and `pulse/` pages,
  and jsDelivr-hosted html2canvas (`cdn.jsdelivr.net`) on `live.html`. Each
  of these runs first-party-equivalent script in every reader's browser.

## Security invariants

Properties that must hold, verified against the current workflow and
plugin source:

- No workflow in this repository triggers on `pull_request` or
  `pull_request_target`. Every workflow that can read repository secrets —
  `build-and-deploy.yml`, `notify-slack-on-new-file.yml`,
  `trigger-audio-edition.yml` — triggers only on `push` to `master`,
  `schedule`, `workflow_dispatch`, or `repository_dispatch`. A pull request
  opened from a fork cannot execute with repository secrets or obtain
  deploy credentials.
- `build-and-deploy.yml` declares `permissions: contents: read` at the
  workflow level. Write access to the published site comes from the AWS
  and Cloudflare secrets passed into individual steps, never from the
  GitHub Actions token itself.
- `trigger-audio-edition.yml` validates every post slug against
  `^[a-z0-9][a-z0-9-]*$` before using it in a shell command or an HTTP
  request to the PasteUp audio endpoint.
- The subscribe flow (`_includes/email.html`, `public/js/subscribe.js`)
  requires a completed Cloudflare Turnstile challenge before the subscribe
  API accepts a request.
- The Jekyll build plugins (`_plugins/*.rb`) contain no `system`, `exec`,
  backtick, or `eval` calls. Building the site does not execute post
  content as code.
- Deploy and integration credentials (AWS keys, Cloudflare API key and
  email, PasteUp audio auth, Podcast Index key/secret, Slack webhook) are
  held only as GitHub Actions repository secrets and are never read from
  committed files. No credential belongs in committed source or in
  reader-facing JavaScript; any credential found there is a defect, and the
  remedy is to revoke and rotate it, not merely to delete the line.

## Reporting a vulnerability

Email **matt@whatthefuckjusthappenedtoday.com** with a description of the
issue, the steps to reproduce it, and its impact.

This is a single-operator project with no bug bounty. Acknowledgement is
best-effort, not guaranteed on any timeline.

Do not open a public GitHub issue for a suspected vulnerability. Do not
test against the live site in any way that degrades it or affects real
readers — no load testing, no submitting real reader-looking data through
the subscribe or survey forms, no actions against real subscriber or
Memberful accounts.

## Severity policy

| Severity | Example on this site |
|---|---|
| **Critical** | Repository secrets (AWS keys, Cloudflare API key, PasteUp audio auth) are exposed or exfiltratable, e.g. via a workflow that can be made to leak them into logs or into an attacker-controlled request. |
| **High** | Stored or reflected XSS that runs in a real reader's browser on a published page (e.g. via the quiz, survey, or subscribe flow), or a bypass of the Turnstile challenge that lets automated submissions reach the subscribe API at scale. |
| **Medium** | A workflow input (e.g. a crafted post slug or filename) that is not validated before reaching a shell command or an HTTP request, without a demonstrated path to secret exposure. |
| **Low** | Information disclosure with no further exploitability, e.g. a stack trace or internal path exposed to readers. |
| **Informational** | Missing security headers or hardening best practices with no demonstrated impact on this site. |

## Out of scope

The following are not actionable vulnerability reports on their own:

- Volumetric or denial-of-service testing against the live site.
- Social engineering directed at the operator or at readers.
- Missing best-practice headers (CSP, HSTS, etc.) reported without a
  demonstrated impact specific to this site.
- Raw output from an automated scanner with no proof of exploitability
  against this site's actual configuration.

## Closing note

Removal of a secret from HEAD is not remediation. A real credential must
be revoked and rotated.
