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
