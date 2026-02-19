# roammate Website

## Project Structure

- `roammate.com/` — Astro site for roammate.com
- `www.old/` — Legacy static HTML site (archived, not deployed)
- `deploy.sh` — Builds and deploys to Surge.sh at roammate.com

## Deployment

- Hosted on **Surge.sh** behind **Cloudflare** (proxy ON, SSL Full)
- CNAME: `roammate.com` → `geo.surge.world`
- Deploy command: `bash deploy.sh`

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
