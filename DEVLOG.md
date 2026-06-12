# roammate Website Dev Log

## Working State
**Session:** 1 | **Date:** 2026-06-12

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
