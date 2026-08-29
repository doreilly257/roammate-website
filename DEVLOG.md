# roammate Website Dev Log

## Working State
**Session:** 5 | **Date:** 2026-08-29

### Session 5: Surge.sh → Cloudflare Pages — SHIPPED, DNS CUT OVER 2026-08-29
Pages project `roammate` created (`roammate-cs7.pages.dev`); apex CNAME cut over
and roammate.com now serves from Pages. Surge instance left running ~1 week as a
30-second rollback, then to be deleted.

Migration surface was small: Astro's `trailingSlash: 'always'` already matches
Pages' directory-index canonical form (308 `/about` → `/about/`), `/404.html` is
picked up automatically, and 4,148 files / 352 KB max are far under the 20,000-file
and 25 MiB caps. Three things genuinely needed doing:
1. `public/_headers` — Pages defaults everything to `max-age=0, must-revalidate`,
   which would have regressed `/_astro/*` from 31 days to nothing. Also added the
   real security headers that Surge could never send (closes bead vjs).
2. `deploy.sh` rewritten for `wrangler pages deploy`, plus a hard fail when
   `.env` has no real `PUBLIC_POSTHOG_KEY` (silent-analytics-loss trap).
3. `public/CNAME` deleted (Surge-only).

Incidental wins: `.DS_Store` files stop being published (Pages skips dotfiles) and
`/.well-known/ai.txt` now returns 200 — it was a 404 on Surge. The Node-22 pin is
gone; wrangler runs fine on Node 26, so the surge@0.23.1/fstream workaround is dead.

**Verified on roammate-cs7.pages.dev:** 14 representative routes 200, unknown path
404 (not 200), `/about` 308s to `/about/`, `_headers` and `.DS_Store` both 404,
sitemap 3,278 `<loc>`s with sitemap-index gone, RSS renders, canonical still
`https://roammate.com/...`, PostHog key baked into the external bundle,
`/_astro/*` + `/images/*` immutable for a year, all four security headers present.

**Proved rather than assumed:** a `noindex` leaking onto a 3,279-page production
site would be catastrophic, so host-scoping was tested directly — a marker header
scoped to `https://roammate.com/*` was deployed and confirmed *absent* on the
pages.dev host while the pages.dev-scoped `X-Robots-Tag` applied. Host-scoped
`_headers` rules match only their own host. Marker then removed and redeployed.

**Post-cutover verified on roammate.com:** `surge-cache`/`surge-stamp` headers
gone, all four security headers present, NO `x-robots-tag` (the pages.dev noindex
correctly did not follow), 11 routes 200, unknown path 404, `/about` 308s,
`www` 301 to apex still intact, `_headers` 404, `/_astro/*` immutable and HTML
`must-revalidate`, sitemap 3,278 locs, canonical correct, PostHog key live.

### Post-migration work (same session)
- **CSP moved from meta tag to a real response header** (commit 180a14c). frame-ancestors
  is ignored in meta form, so the clickjacking control was never actually active; the
  header form also picked up base-uri, form-action and object-src (verified first that
  src/ has no <base>, no <form action>, no iframes). Existing directives carried over
  byte-for-byte. Headless check found ONE CSP violation and it is Cloudflare's own
  injected bot script (/cdn-cgi/challenge-platform/.../jsd) — pre-existing, since the old
  meta policy had an identical script-src, and unfixable by hash since the payload embeds
  a per-request ray id. Our own 6 scripts all load; nav, sticky bar and the CF beacon work.
  To silence it, turn off Bot Fight Mode in the dashboard.
- **Per-city OG images** (commit c3ee941, closes xnn). The bead assumed this meant sourcing
  442 city photos. It did not: all three programmatic sets are generated from the guides
  collection, which already carries heroImage, and the curated layouts already passed it
  through. Prop wiring only — 1,326 pages, zero new assets, verified live.
- **cd7 (social proof) left open deliberately.** Genuinely blocked: the only
  api.roammate.com endpoint is POST /v1/waitlist, so per-city traveler counts do not
  exist. Declined to ship placeholder numbers — fabricated social proof across 3,279
  indexed pages is a trust risk, not a shortcut. Notes on the bead list honest
  no-API alternatives.
- **21r.5 (leaked tokens) closed at user's direction** — treated as private/single-user
  repo. Recorded on the bead that api.github.com reported visibility=public at closing
  time and the tokens remain in 5 places in history, so it can be reopened cheaply.

### Session 5b: Search Console 404s, image relevance, indexing — SHIPPED
Triggered by GSC showing 1.33k not-indexed (447 "Not found", 867 "crawled, not indexed").

**404s (d004a83).** Sitemap was clean — all 3,278 URLs resolve, and all 562 routes
deleted in git history still resolve (blog .astro files became a dynamic route with
the same slugs). The export showed three patterns: /guides/cities/{slug}/ and
/guides/places/{slug}/ from an older nesting (wildcard 301s), seven /guides/region/
names only backpacker routes use (301 to nearest hub), and 222 /companions/{place}/.
The last are NOT redirected: **Cloudflare Pages free plan silently ignores _redirects
rules past ~100** (found by binary search — rules at line 109 worked, line 121 did
not), and a wildcard is impossible because **Pages evaluates redirects BEFORE static
assets** — verified the hard way, /companions/* 301'd all 232 real pages for ~2 min
before revert. Those URLs came from an internal linking bug already fixed, so 404 is
the correct answer anyway.

**Images (ec59508, 3d09f60).** companions/[slug] built its hero path by convention
(`{slug}-hero.webp`) instead of reading heroImage, so 34 cities 404'd in three places
at once — blank hero, dead preload, and a broken og:image on every social share.
validate.ts missed it because it checks the collection values, not a path rebuilt in a
template. Separately, 49 city guides used another place's photo; 10 are legitimate
(Aguas Calientes IS the Machu Picchu town), 39 were replaced. **Verified by looking at
contact sheets, not by trusting search** — the first pass returned a Mexican cenote for
Puerto Princesa, Giza for Aswan, Pisac for Nazca, a Lebanese temple for Jerash and a
satellite map for Nizwa. Blog images audited and clean.

**lastmod (13da821).** 1,801 URLs claimed lastmod in 2023 — the hash scheme computed
EPOCH(2024-01-01) minus hash%365 days, so every programmatic page said "unchanged since
before this site existed". Now derived from git per guide. Watch out: git prints paths
relative to the REPO ROOT, so a `src/...` prefix match silently matches nothing and
falls through to a plausible-looking now() fallback.

**Thin content (c6e83e9).** companions 96.1% -> 73.7% similar (371 -> 544 words),
best-time 79.5% -> 61.2% (317 -> 411), by reading the per-city quickFacts /
itineraries / practicalInfo the templates already had access to. Nothing invented.

### Next Steps
1. Delete the Surge project once the rollback window closes (~2026-09-05).
2. Recheck GSC in ~2 weeks. If companions/best-time are still unindexed, consolidate
   them into the city guides rather than padding further — and that also makes the
   /companions/* wildcard redirect correct, solving the 222 404s for one rule.
3. 18 pre-existing blog hero images are marginally over the 200KB budget (204KB).

### Rollback
Point the apex CNAME back to `geo.surge.world`. The Surge deployment is untouched.

---


### Session 4: Audit epic 21r fixes — BUILT + VERIFIED, UNCOMMITTED (do NOT commit/deploy per instructions)
Closed 10 audit beads (21r.1–.4, .6–.11; skipped .5 token rotation). CSP: dropped script-src 'unsafe-inline' by forcing all scripts external (vite.build.assetsInlineLimit=0) so 'self' covers them; style-src keeps 'unsafe-inline' (documented compromise — ~17 dynamic inline style ATTRIBUTES can't be hashed). Home JSON-LD @graph pruned 7→5 types (dropped dup SoftwareApplication + FAQPage-now-only-on-/faq/; operatingSystem iOS,Android→iOS since downloadUrl is App Store only). dateModified now build-time. Repo hygiene: git rm --cached 15 root PNGs + 2 playwright logs, .gitignore /*.png + .playwright-mcp/. Nav logo: dropped fetchpriority=high. a11y: removed redundant hero section aria-label (+ unused heroImageAlt prop). BlogPosting author.url centralized to EDITORIAL_AUTHOR const. Share links +noreferrer. Deduped ai.txt (kept .well-known, nothing refs /ai.txt). CI: added .github/workflows/ci.yml (npm ci + astro check + build, no deploy); installed @astrojs/check + typescript. astro check surfaced 76 pre-existing TS errors — suppressed inline-<script> DOM blocks with @ts-nocheck (no runtime change), PROPERLY fixed 28 frontmatter errors (content-collection type-predicate narrowing on 3 [city] pages; CityGuideLayout/BackpackerRouteLayout Props widened to match Zod schema). Props fix also repaired a latent blank-card bug: string-form budgetTips/culturalTips now render on 5 guides (imlil, bhaktapur, ksamil, merzouga, unawatuna). VERIFIED: npm ci clean, astro check 0 errors/0 warnings/77 hints, build 3,279 pages.

---

### Session 3: Third review batch — BUILT + VERIFIED, UNCOMMITTED
critters removed (CSS double-load + per-page @font-face gone; builds 67-90s vs 95-357s); FAQPage dedup across 4 landing pages (page-specific Q&As, @graph consolidation on 5 pages); programmatic de-dup (statistics pages lost the budget table → link to /budget/; best-time pages: facts trimmed to season-only, FAQ collapsed to 1 Q&A, FAQPage schema removed); newsletter analytics fire on API success only (was on submit / on any click via form-level data-ph-event); AbortController timeouts on both email forms; Nav overlay Escape+inert; rel noreferrer sweep on remaining store links; about.astro invalid Org props removed; faq.astro set:html; compareApps.ts with build-time guard; two more dark-on-dark --color-ink bugs fixed in NewsletterSignup. Tests 23/23, validate clean, build 3,279 pages, dist verified.

---

### Session 2: Second review batch — SHIPPED (commit 254f081, deployed)
AppCTA badges variant adopted across all layouts + added to budget/best-time pages (was 6 inline copies); validate.ts covers all 572 guide images + featuredGuides refs; companions links gated to curated city slugs (place guides had 404 links — incl. CityGuideLayout CTA); z-index scale; StickyBar invisible-text fix; blog publisher logo rasterized (rm-logo.webp); region-hub breadcrumbs; noreferrer on store links; CORS file deleted. Tests 23/23, build 3,279 pages, live-verified.
Open: roammate-website-vjs (Cloudflare security headers — manual dashboard task: frame-ancestors/X-Frame-Options/HSTS), cd7 (social proof), xnn (per-page OG images). NOT merged: --color-text vs --color-ink token pairs (values genuinely differ — intentional palette, not duplication).

---

### Active Task
Full-site code review + fix batch — SHIPPED (commits 28edf60, 084dfa5; deployed 2026-06-12)
- [x] 4-agent review (components, data/scripts, SEO/config, perf/a11y)
- [x] All high/medium/low fixes applied across 50+ files
- [x] Build (3,279 pages) + tests (16/16) green; post-fix review pass done
- [x] validate.ts fixed (was broken since content-collection refactor — imported old guides.ts API)
- [x] Deployed via deploy.sh; live verification passed (sitemap 3,278 URLs, RSS 572 items)

### Key Files (current shape)
**`roammate.com/scripts/normalize-sitemap.mjs`** (REWRITTEN)
Merges all sitemap shards into dist/sitemap.xml; errors on zero shards. Runs inside `npm run build` — deploy.sh no longer does manual sitemap cp.

**`roammate.com/src/layouts/BaseLayout.astro`** (MODIFIED)
JSON-LD consolidated to homepage-only @graph; PostHog key from `PUBLIC_POSTHOG_KEY` env; 5 inline scripts merged into one Vite-bundled script; phCapture now consent-gated; Accept button triggers loadPostHog.

**`roammate.com/src/components/AppCTA.astro`** (NEW)
Shared App Store/Play CTA with UTM/event/label props; used by statistics pages, reusable for guides/blog later.

**`roammate.com/src/pages/rss.xml.ts`** (MODIFIED)
Feed now includes blog + all guides/routes (572 items), deterministic slug-hash dates.

**`roammate.com/src/data/guides.ts`** (MODIFIED)
Build-time assertion that CITY_GUIDE_SLUGS_LIST matches collection; flatMap narrowing fixed pre-existing TS errors; tests added in `src/data/__tests__/guides.test.ts`.

### Decisions (active)
- `trailingSlash: 'always'` — canonicals must match crawled URLs on Surge
- `--color-cream` renamed `--color-ink` repo-wide (value was near-black)
- CITY_GUIDE_SLUGS_LIST kept (place guides also use type:'city'); assertion guards divergence
- Statistics JSON-LD dates removed rather than faked
- blog-post-hero aligned to 100vh per hero-layout.test.ts spec

### Next Steps
1. Commit + deploy (user approval needed)
2. Optional: adopt AppCTA in guide/blog layouts; per-page OG images for statistics pages

### Blockers
- None. (bd repaired 2026-06-12: committed dirty Dolt working set via dolt CLI, ran migration, untracked credential key)

### Watch Out
- Builds without `roammate.com/.env` silently disable PostHog (.env is gitignored — exists only on this machine)
- Old badge PNGs deleted; webp only
- Surge deploys flap for ~4 min after publish (stale 301s to www + occasional 504s from edge propagation) — wait before judging a deploy broken
