# roammate Website

## Project Structure

- `roammate.com/` — Astro site for roammate.com
- `www.old/` — Legacy static HTML site (archived, not deployed)
- `deploy.sh` — Builds and deploys to Cloudflare Pages at roammate.com

## Deployment

- Hosted on **Cloudflare Pages**, project `roammate` (`roammate-cs7.pages.dev`)
- CNAME: `roammate.com` → `roammate-cs7.pages.dev` (proxied)
- `www` → apex 301 is a zone-level Redirect Rule, independent of the host
- Deploy command: `bash deploy.sh` (production) or `bash deploy.sh --preview`
  - Requires `npx wrangler login` once, or `CLOUDFLARE_API_TOKEN`
  - Aborts if `roammate.com/.env` lacks a real `PUBLIC_POSTHOG_KEY` — a build
    without it silently ships with analytics disabled
  - Uploads are incremental; only changed files go over the wire

### Response headers

`roammate.com/public/_headers` is Pages-only config (never served as a file):
security headers site-wide, `immutable` year-long caching for `/_astro/*`,
`/images/*`, `/fonts/*`, and `X-Robots-Tag: noindex` scoped to `*.pages.dev`
so preview deployments stay out of the index. Host-scoped rules only match
that host — verified, the `noindex` does not reach `roammate.com`.

Pages serves `/404.html` automatically with a 404 status, 308-redirects
`/path` → `/path/` (matching `trailingSlash: 'always'`), and skips dotfiles
on upload except `.well-known/`.

## SEO Files

**IMPORTANT**: `robots.txt`, `sitemap.xml`, and `llms.txt` in `roammate.com/public/` must be updated:
- Before any deployment that adds, removes, or restructures pages
- When adding new pages to `roammate.com/src/pages/`
- When changing URL paths or page slugs

All pages must include a canonical link tag (handled automatically by `BaseLayout.astro`).

## RSS Feed

- RSS feed is generated at build time via `@astrojs/rss` at `src/pages/rss.xml.ts`
- Available at `https://roammate.com/rss.xml`
- Includes all city guides, place guides, backpacker routes, and static pages
- Dates are deterministically generated from slug hashes (consistent across builds)
- **Must be kept in sync**: When adding new guides or routes, update the RSS endpoint if the data source changes (currently auto-reads from `guides.ts`)
- The `robots.txt` should reference the RSS feed URL

## Agent Workflow

**Always spawn subagents** (via the Task tool) for creating, updating, or modifying guide pages and other content. The main conversation thread should remain available as a supervisor — delegating work to subagents and coordinating results. Never block the main thread with long-running file creation tasks.
