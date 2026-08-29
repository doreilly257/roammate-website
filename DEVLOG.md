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

### Next Steps
1. Delete the Surge project once the rollback window closes (~2026-09-05).

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
