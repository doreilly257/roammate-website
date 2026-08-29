# roammate Website Dev Log

## Working State
**Session:** 5 | **Date:** 2026-08-29

### Active task
None. All shipped, deployed, verified on production against a cleared
Cloudflare cache. 9 commits, working tree clean.

### Shipped today (migration + fixes)
- **Surge → Cloudflare Pages** (af44145). Apex cut over; `deploy.sh` uses
  `wrangler pages deploy` (+`--preview`, + PUBLIC_POSTHOG_KEY guard). Surge is
  the rollback until ~2026-09-05 (ao2).
- **Headers + CSP** (af44145, 180a14c). `public/_headers`: security headers,
  immutable asset caching, `noindex` scoped to `*.pages.dev`. CSP moved from
  `<meta>` to a real header. Closes vjs and epic 21r (11/11).
- **404 triage** (d004a83). Sitemap was clean — all URLs resolve. Old
  `/guides/cities/` + `/guides/places/` nesting and 7 stale region hubs now 301.
- **Images** (ec59508, 3d09f60, a02823c). companions/[slug] rebuilt its hero path
  from the slug instead of reading heroImage → 34 pages with a dead hero, dead
  preload and broken og:image. 39 city guides showed another place's photo (7
  cross-border), re-sourced and visually verified. 18 blog heroes brought under
  200KB (saved 1,063KB).
- **Sitemap lastmod** (13da821). 1,801 URLs claimed 2023, before the site existed.
  Now per-guide from git. Live: zero pre-2026 dates.
- **Thin content** (c6e83e9). companions 96.1%→73.7% similar, best-time
  79.5%→61.2%, from per-city data the templates already had. Nothing invented.
- **validate.ts blind spot** (6c5336f). All 7 checks read source data, which is why
  it passed while 34 pages shipped a dead hero. `validateBuiltLinks()` now crawls
  dist (incl. `url(...)` in inline styles). Wired into `npm run build`. 31 tests.

### Acted on the 3-month Search Console export (late session)
Performance data arrived and **reversed the plan above**. By section:
`/companions/` 6,015 impr → 565 clicks (**9.39% CTR**, best on site, ~6x average);
`/itinerary/` 91k → 1,374 (1.51%); `/budget/` 90k → 720 (0.80%);
`/best-time-to-visit/` 33k → **65** (0.20%); `/statistics/` 2.2k → 35.
The split is not thin-vs-rich, it is **informational vs commercial**.
- **d0d5986** — built `/companions/` for all 442 destinations (was 232, gated by
  CITY_GUIDE_SLUGS_LIST). The best-converting template was simply missing for
  Petra, Machu Picchu, Angkor Wat and 207 others, which is also where the 222
  `/companions/` 404s came from. 3,279 → 3,489 pages. I had previously proposed
  CONSOLIDATING this section — that would have destroyed the best page type.
- **62c6174** — FAQ + FAQPage schema on roammate-vs-gaffl for the review-shaped
  queries that already rank ~pos 6 and convert 3.5–6% ("is gaffl legit" 6.0%).
  Scoped to GAFFL only: it is the sole competitor with demand (1,021 impr);
  Backpackr gets 254 impr / 1 click and the other seven do not appear at all.
  Also fixed BlogPostLayout swallowing a post's `<Fragment slot="head">`.
- **84l (closed record)** — decided NOT to invest further in best-time/statistics.
  They rank (~pos 10) and are not click-worthy: a demand problem, not indexing.
  No code change; pruning 554 pages on a hunch contradicts the evidence.

### Unresolved: the zero-click anomaly
`"macau itinerary 7 days"` ranks **pos 3.4 with 12,325 impressions and 0 clicks**;
`"tallinn itinerary 7 days"` pos 2.7, 4,224 impr, 0 clicks. Not a snippet problem —
titles and descriptions are well-formed. The tell: the SAME Istanbul page gets
10.1% for "istanbul 7 day itinerary" and 0.3% for "istanbul itinerary 7 days".
Hypothesis is AI Overviews absorbing the informational queries. **Unverified** —
Google blocks the headless browser, and `browse --headed` fails to start. Needs a
human to search it. If confirmed, 214k impressions of informational programmatic
content is a declining asset and the strategy should follow the commercial pages.

### Next steps
1. Delete the Surge project after the rollback window (~2026-09-05, ao2).
2. **Verify the zero-click SERPs by hand** — gates the whole content strategy.
3. Recheck Search Console in ~2 weeks, especially whether the 210 new
   `/companions/` pages pick up impressions at the section's 9.39% CTR.
4. cd7 blocked: no per-city counts endpoint. Not shipping invented numbers.

### Known, accepted
- Cloudflare injects `/cdn-cgi/challenge-platform/.../jsd` at zone level; our CSP
  blocks it. Cosmetic (pages.dev serves the same build clean). Bot Fight Mode is
  OFF and it still injects. Left by choice.
- API tokens remain in public git history; closed at user direction (21r.5).

---
---

## Session Archive

### Session 5 — 2026-08-29: Cloudflare Pages migration + Search Console fixes
**What we did:** Migrated roammate.com off Surge.sh to Cloudflare Pages (project
`roammate`), then used the new ability to send real response headers to move CSP
out of a `<meta>` tag and add security + immutable-caching headers. Triaged a
Search Console report of 447 404s and 867 crawled-not-indexed: added redirects for
two dead URL structures, fixed 34 companions pages shipping a dead hero image,
replaced 39 city-guide photos showing the wrong place, fixed a sitemap lastmod
scheme that claimed 1,801 URLs were unchanged since 2023, and enriched the two
thinnest page sets from per-city data they already had. Closed the loop by giving
validate.ts a built-output link check, then brought 18 oversized blog heroes under
budget.
**Files:** deploy.sh, public/_headers, public/_redirects, scripts/validate.ts,
scripts/build-lastmod.mjs, astro.config.mjs, package.json, companions/[slug].astro,
best-time-to-visit/[city].astro, statistics|budget/[city].astro, 39 guide JSONs +
images, 18 blog images.
**Decisions:** Kept 222 /companions/{place}/ as 404s rather than redirects — Pages
free plan caps _redirects at ~100 rules and evaluates them before static assets, and
those URLs only ever existed via an internal linking bug. Declined to ship invented
traveler counts for cd7. Chose raster-shrinking over quality-crushing to hit the
image budget.
**Commits:** af44145, 180a14c, c3ee941, ec59508, d004a83, 3d09f60, 13da821,
c6e83e9, 6c5336f, a02823c.


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
