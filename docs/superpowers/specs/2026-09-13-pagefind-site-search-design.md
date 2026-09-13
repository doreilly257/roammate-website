# Pagefind site search

Date: 2026-09-13  
Status: Independently reviewed — written-spec user approval pending. No implementation or deployment authorized by this document alone.

## Goal and constraints

Add free, site-wide search for roammate's public guides, backpacker routes and blog posts, with snippets, country/content-type filters, and usable mobile and keyboard interactions. Use Pagefind's static build index hosted with the existing Astro/Cloudflare Pages site. No paid search service, Meilisearch instance, new server, credentials, or GitHub Actions workflow. Existing platform limits still apply; this introduces no separate search subscription or infrastructure.

## Selected approach

Build Pagefind's index from the exact rendered Astro release, not a second copy of editorial content. A compact, labelled header search form submits to `/search/`; on small screens it remains discoverable without colliding with the existing mobile menu. The dedicated search page contains the input, filters, result count and results. Keep the runtime on this page only, rather than introducing a site-wide modal or loading search on every page.

Use locally generated Pagefind runtime assets and its JavaScript API with a small project-owned accessible UI. Prefer `noWorker: true` initially to avoid a `blob:` worker permission; check performance against the actual full index before accepting this choice. Use built-in heading weighting rather than a custom ranking engine. Typo-tolerance equivalent to Meilisearch is not promised.

## Existing integration points

- `src/layouts/BaseLayout.astro` provides the canonical URL, shared `main`, navigation and footer. Do not mark its generic `main` as searchable: that would opt every page in.
- `src/components/Nav.astro` already has a mobile overlay, Escape handling and sibling `inert` management; preserve these behaviors when adding the form.
- `CityGuideLayout.astro` and `BackpackerRouteLayout.astro` render city/place guides and routes; both are reached through `/guides/[slug]/`.
- `BlogPostLayout.astro` renders collection-backed articles and all nine standalone `/blog/roammate-vs-*` comparison pages (confirmed during implementation). Preserve comparison-specific extra-slot content, including GAFFL FAQs, within the shared article index boundary; do not add duplicate standalone wrappers.
- `src/lib/blog-data.ts`, `src/data/guides.ts` and `src/content.config.ts` supply existing content metadata. Current collection loaders do not implement draft/gated flags, so do not claim such filtering already exists.

## Public index contract

Build an explicit manifest of allowed public canonical article paths from the existing guide/blog collections and the reviewed standalone comparison pages. Only those rendered pages may carry `data-pagefind-body`. Validate the indexed result set against that manifest, failing closed on unexpected paths or missing expected entries. Do not merely index every file below `dist/` or trust a URL prefix as publication authorization.

V1 includes canonical city/place guides, backpacker routes and public blog articles, including their own substantive FAQ sections. It excludes search itself, homepage/marketing and legal pages, category/listing pages, standalone FAQ, 404, admin/API material, legacy `www.old/`, and derived budget/itinerary/statistics/companions/best-time-to-visit pages to avoid near-duplicate results. Standalone FAQ and other public informational pages can be added through explicit future opt-in; they are not implied by “site-wide.”

Mark only article content for indexing and exclude navigation, footer, cookie UI, signup/gated sections, app CTAs and related-content cards with explicit ignore boundaries. Never export hidden subscriber content simply because it exists in HTML. Any future draft/private/gated publication state must be excluded before generating the manifest and body markers; add negative fixtures to protect that boundary. A static index is publicly downloadable and cannot enforce authorization.

Each result has title, canonical-path URL, description/excerpt and content type (`Guide`, `Route`, `Blog`). Use actual page heading/title, retain default heading relevance, and use query-matched excerpts rather than indexing navigation labels. Keep trailing-slash paths consistent with Astro; use same-origin result URLs and Pagefind base URL `/` so preview results stay on their preview host. Production canonical tags remain supplied by BaseLayout, including on preview pages.

Country values come from guide `heroCountry`; routes use each explicitly authored `countries[].name`, deduplicated. Blog countries are derived only from valid authored `cities` references joined to guide metadata; unknown references do not invent countries. Articles without a reliable country have no country facet, remain visible under “All countries,” and are excluded when a specific country is selected. A multi-country route matches each applicable country. Normalize harmless whitespace and deduplicate labels, but do not infer geography from body text. Start with one country and one type selection at a time, combined with AND; show only values represented in the index.

## Interaction, accessibility and failure handling

The header uses a native labelled search form; submitting carries the query to `/search/`. Search results update after a short debounce, with stale requests prevented from replacing newer results. Empty queries show instructions instead of an unbounded list. Initially show 10 results, then a labelled “Load more” button adds batches of 10; hydrate only visible results. Results use real links, headings, snippets and type labels. Filters have persistent labels and an obvious reset control.

Use native inputs/selects/buttons and ordinary Tab/Enter navigation, visible focus, sufficient contrast, touch-sized controls, and no horizontal overflow at 320px or 200% zoom. A polite live region announces loading completion/result count without moving focus. Preserve the mobile menu's Escape and focus behavior; no extra focus-trap implementation is needed on the dedicated page. Do not steal initial focus from assistive technology.

Provide distinct loading, no-results, and index/runtime-error states; errors offer retry and links to `/guides/` and `/blog/`. A `noscript` message explains that search needs JavaScript and offers the same browse links. Render query strings, titles and metadata as text. Do not insert arbitrary query/result HTML into the DOM; any excerpt highlighting must safely allow only the intended highlight markup. Do not add query analytics. Review existing analytics/autocapture so header query URLs and input values are not unintentionally collected; use fragment-carried query state if needed to keep search terms out of HTTP requests and pageview URLs.

A fragment alone does not guarantee privacy: verify analytics SDK URL capture as well as input/autocapture behavior, excluding search terms from both.

## Build and release lifecycle

Pin Pagefind as a local development dependency and update the lockfile. Extend `npm run build` in this order: lastmod generation, Astro output, sitemap normalization, Pagefind generation, index verification, existing dist/link validation. Generated asset references must exist before link checks run. A clean build must not retain stale Pagefind files; index-generation or manifest-validation failures abort the release. Dev instructions must explain that `astro dev` alone does not create a production index; validate using a complete build plus preview.

Generated assets live only in `dist/pagefind/`, never committed or copied into `public/`. `deploy.sh` must upload the exact tested HTML/index pair through its existing scratch assembly, preserving authentication, nonce tests/type-check, public tests/validation, Astro checks, claims gates and pinned Wrangler. Do not upload or mutate the index separately. Preview builds have their own index on their own origin and retain `noindex` headers; no shared production index or remote synchronization exists. Retain revalidation for stable Pagefind runtime/entry filenames rather than blanket immutable caching. Existing known-good deployment rollback returns both HTML and its matching index together.

## CSP and Cloudflare boundaries

Pagefind uses WebAssembly. Validate the pinned release against the enforced policy and permit only the narrowly required `script-src 'wasm-unsafe-eval'` on `/search/` (including redirect/error behavior as applicable), not global `'unsafe-eval'`, new script `'unsafe-inline'`, or third-party script origins. With `noWorker: true`, no worker-policy relaxation should be necessary. If measured performance requires workers, review a separate search-only `worker-src 'self' blob:` decision before changing the policy.

Both static fallback `roammate.com/public/_headers` and nonce middleware `infra/csp-nonce/functions/_middleware.js` must implement equivalent scoped search policy. The middleware's exact-upstream-policy guard must validate the expected route-specific policy before stamping a nonce, retaining refusal of unexpected upstream policies. Test actual effective headers: overlapping Cloudflare CSP rules must not accidentally combine into a policy that blocks WASM or broadens unrelated routes. Preserve nonce generation and all other directives. Add `/pagefind/*` to `infra/csp-nonce/_routes.json` exclusions so static search assets do not invoke the nonce Function or introduce per-asset Function usage; a middleware extension short-circuit alone does not prevent invocation. Verify content types, successful WASM loading and absence of CSP errors in the deployed-style preview before claiming compatibility.

## Verification and SEO acceptance

Implementation acceptance requires tests for manifest inclusion/exclusion, snippets without chrome/gated text, known/unknown/multiple countries, filters, canonical trailing-slash paths, standalone comparisons, index failure aborts and stale-entry removal. Exercise real built-index searches for a known city, a route and a blog topic, combined filters, empty/no-match input, rapid changes, retry, keyboard-only interaction and narrow screens. Include production-style CSP/nonce tests and a browser network audit confirming local assets and no new third-party search requests. Preserve all existing quality gates.

Review `public/robots.txt` and `public/llms.txt` for the new `/search/` route. Give the search utility page a canonical `/search/` and `noindex,follow`; exclude it from the generated sitemap while retaining the existing sitemap/RSS references. Do not add search to RSS or fabricate publication dates. Verify the generated sitemap and dist link validation after the route is introduced.

## Scope boundary and approval

This document is design only. User review of this written spec, then implementation planning and tracked work, precede code changes. Production/preview deployment and live activation verification are separate actions, not accomplished here. Broader open-bead work is outside this focused design.

Reference for verified Pagefind deployment requirements: https://pagefind.app/docs/hosting/ . The implementation must recheck API/indexing options against the pinned Pagefind release and official documentation.
