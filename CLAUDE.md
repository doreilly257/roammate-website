# roammate Website

## Ground Rules

- **No GitHub CI on this repo.** `.github/workflows/ci.yml` was removed 2026-08-29 by
  explicit instruction. Do not re-add a workflow, re-trigger one, or suggest it.
- **Verification is local, and now enforced.** `npm run build` runs `validateBuiltLinks()`
  but does **not** type-check. That gap let `routeOverview[i+1].colour` reach `main` in
  547513d, rendering `undefined` into every route-map gradient for ten days while the
  build passed. There is now a pre-push hook:

      git config core.hooksPath .githooks      # once per clone

  It runs `npx astro check` when `.astro`/`.ts` files changed, and
  `node scripts/check-claims.mjs` when copy changed. Bypass with `git push --no-verify`
  and say so in the PR — both checks exist because something shipped.
- **Copy claims are linted.** `scripts/check-claims.mjs` fails if the site reintroduces a
  claim whose gate is closed: mandatory identity verification (the mandate is inert),
  request-to-join (route gated off), the AI Concierge (endpoint 404s), or SMS alerts (SMS
  was removed 2026-08-25). A rule needs evidence the CLAIM is false — a flag that is off,
  an endpoint that 404s, a route that is gated. An open ticket near a claim is a reason to
  look, never a reason to add a rule: ticket titles describe work remaining, claims
  describe capability, and they share nouns. Retire a rule by SHIPPING the feature and
  deleting the rule, never by softening the sentence until it stops matching.
  A clean run means no LISTED claim matched a KNOWN-FALSE pattern. It does not mean the
  copy is honest.
- **This session is website-only.** Backend and mobile work goes to the
  `roammate-app-ios` / `roammate-app-android` sessions via SendMessage. The backend lives
  in `roammate-app-ios/api`. When told to hand something off, stop investigating it
  immediately and report the handoff — do not keep digging.
- Those sessions cannot write to beads in this workspace, so relay their findings onto
  the relevant bead here on their behalf.

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
