# roammate Website Dev Log

## Working State
**Session:** 5 | **Date:** 2026-08-29

### Active task
None — deliberately. See "STOP" below. Everything is shipped, deployed and verified
on production against a cleared Cloudflare cache. Working tree clean.

### 8hq analysed (diagnosis only — nothing shipped)
Offline against the built `dist/`. One hypothesis dead, one strong candidate found.
- **Under-linking DISPROVED, and backwards.** Contextual inlinks per page (nav/footer
  stripped): `/guides/` **16** — best on the site — vs `/companions/` 7, `/itinerary/`,
  `/budget/`, `/best-time/`, `/blog/` all 5, `/statistics/` **0**. Strike it.
- **Cannibalisation is the best candidate.** 442 of 458 destinations (97%) are targeted
  by five templates at once — ~6.5 pages per city. Sharpest collision: **115 guides**
  titled "<City> Travel Guide 2026 — 3-Day Itinerary" where a dedicated
  `/itinerary/<city>-3-day/` page also exists, **100% of them**. Same city, same
  duration, same intent, two URLs.
- **88% of guides (402/457) have a bare place-name H1** ("Macau"), all descriptive terms
  stranded in the `<title>`. Strongest content, weakest on-page signal.
- **Incidental:** 422 of 442 `/statistics/` pages have zero contextual inlinks. 84l stands.
- **Not proof** — structural candidates only. Confirming needs query-level GSC data (3on)
  showing guide and itinerary pages on the SAME queries. And 8hq's own precondition
  fired: AI blocks absorb informational queries and city guides are informational, so
  de-cannibalising may reach page 1 and still earn no clicks.

### SHIPPED: GEO schema holdout on /itinerary/ (2u3)
First test of the 8ho finding. The pages losing to AI blocks were the least
machine-extractable on the site — `BreadcrumbList` and nothing else.
- **Test:** 40 cities / 105 pages emit `TouristTrip` (ItemList of days) + `HowTo`
  (day sections, morning/afternoon/evening steps) + `FAQPage`.
  **Control:** 402 cities / 999 pages untouched. Zero overlap, verified in `dist/`.
- **Why a holdout, given STOP:** it measures WITHIN one period instead of across a
  before/after in which Google also changed — better attribution than waiting, not
  worse. Existing measurements are untouched.
- Assignment is by city (variants never split), a pure function of the slug, stable
  across builds — `src/lib/geoTestSet.ts`. **Never reassign a city mid-experiment.**
- `macau`, `tallinn`, `istanbul` forced in as hand-measurable probes; excluded from
  CTR stats. **Pre-treatment baseline captured 2026-08-29T14:43Z: AI block present on
  all three, roammate cited in none** (organic #2 / not-in-top-6 / #6).
- Every emitted field derives from existing page data. Nothing invented.
- **Power warning:** 40 of 442 cities is small and traffic is concentrated. A null
  result may mean underpowered, not ineffective. Check crawl dates first — an
  unrecrawled page cannot have responded.

### STOP — decision in force
**Do not ship further SEO changes until the next Search Console export** — except as a
holdout with an untouched control, which is how 2u3 above was allowed to proceed. 12 commits
landed 2026-08-29 and every one is an unmeasured bet; Google has not recrawled any of
it. Stacking more changes makes attribution impossible. This is the same argument as
"do not re-optimise before data", and it applies more now, not less.

### Pick up here (beads carry full context; `bd ready`)
1. **2u3 (P1)** — measure the GEO holdout. Citation check is manual in headed Chrome
   (GSC does not report AI citation); CTR/position comparison lands with 3on.
2. **3on (deferred 2026-09-11)** — re-export GSC and measure the 12 Session-5 bets.
   Baseline table is in the bead. Check crawl dates before interpreting anything.
3. **8hq (in progress)** — cannibalisation and bare-H1 fixes are ANALYSED BUT UNSHIPPED,
   gated on 3on. If shipped, use a holdout like 2u3.
4. **ao2 (deferred 2026-09-05)** — delete the Surge instance. It is the rollback until then.
5. **cd7 (blocked in practice)** — needs a per-city counts API. Not shipping invented numbers.

### Known, accepted
- Cloudflare injects `/cdn-cgi/challenge-platform/.../jsd` at zone level and our CSP
  blocks it. Cosmetic; Bot Fight Mode is OFF and it still injects. Left by choice.
- API tokens remain in public git history; closed at user direction (21r.5).

---
---

## Session Archive

### Session 5 (cont.) — 2026-08-29: SERP verification + GEO holdout
**Zero-click anomaly RESOLVED (8ho).** Verified by hand in headed Chrome. On
`macau itinerary 7 days` the entire above-the-fold is a generated day-by-day
itinerary citing Traveloka (x2), Plantrip, Alexis Jetsets, YouTube, Instagram —
not roammate — while we sit organic #2. Ranking and intent are real; the click is
consumed. **The Istanbul phrasing hypothesis was disproved:** both phrasings return
near-identical SERPs with roammate at organic #6, so the 10.1% vs 0.3% split is a
volume artifact, not SERP composition. Tooling: `browse --headed` was never blocked
by Google — the Playwright chromium binary had simply never been downloaded.
**8hq analysed:** under-linking disproved (guides are the best-linked section at 16
median contextual inlinks); cannibalisation identified instead (97% of destinations
carry 5 templates; 115 guides collide head-on with an `/itinerary/<city>-3-day/`
page at a 100% collision rate); 88% of guides have a bare place-name H1.
**Shipped:** the GEO schema holdout (2u3). Nothing else — STOP still holds.

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
