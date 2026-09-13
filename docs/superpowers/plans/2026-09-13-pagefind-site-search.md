# Pagefind Site Search Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (available here), or `superpowers:executing-plans` if delegation is unavailable. Beads is the sole status tracker; numbered procedures below are execution instructions, not a parallel checklist.

**Goal:** Add free, accessible, privacy-preserving search across published public guides, routes and blog articles, using the exact Astro release output.

**Architecture:** An explicit content manifest authorizes article indexing; Pagefind generates a local index after Astro renders. A header form hands a query to a dedicated `/search/` page through transient session storage, never URL state. Only that page loads the runtime and receives the additional WebAssembly CSP permission.

**Tech Stack:** Astro 7, TypeScript, pinned local Pagefind development dependency, Vitest, existing Node nonce tests, Cloudflare Pages static assets.

**Authority:** The user approved proceeding after the reviewed [design](../specs/2026-09-13-pagefind-site-search-design.md). Its historical “approval pending” line is not a new approval requirement. No deployment, paid resources, credentials, GitHub CI, backend changes or unrelated feature work belongs in this plan.

## Execution and file ownership

Root owns Beads, one isolated worktree, integration/reviews, final commits and push. Implementers do not create competing worktrees or commit shared changes. Root must keep distinct open issues visible; this document does not close other Beads. Read `@test-driven-development`, `@verification-before-completion` and `@requesting-code-review` before implementation.

Area A owns `roammate.com/package.json`, `package-lock.json`, `scripts/build-search-index.mjs`, `scripts/__tests__/search-index.test.ts`, `src/lib/search-manifest.ts`, `src/pages/search-manifest.json.ts`, `src/layouts/{CityGuideLayout,BackpackerRouteLayout,BlogPostLayout}.astro`, and explicit standalone article body boundaries where necessary. Content/template changes must be delegated.

Area B owns `src/components/{Nav,SiteSearch}.astro`, `src/pages/search.astro`, `src/lib/{search-client,search-handoff}.ts`, `src/layouts/BaseLayout.astro`, `scripts/__tests__/{search-ui,search-handoff,analytics-init,nav-menu}.test.ts`, `astro.config.mjs`, `public/{robots,llms}.txt`, and scoped styles in the new component/current navigation.

Area C owns `infra/csp-nonce/{functions/_middleware.js,_routes.json,nonce.test.mjs,deploy.test.mjs,README.md}`, `roammate.com/public/_headers`, and static-policy regression tests. `deploy.sh` changes only if tests reveal the existing exact-dist scratch assembly needs an explicit search artifact gate; preserve all existing gates and Wrangler pin.

All site paths above are relative to `roammate.com/` unless already prefixed. Agree these interfaces before parallel work:

```ts
type SearchArticle = {
  path: string;                 // same-origin /guides/slug/ or /blog/slug/
  title: string;
  description: string;
  type: 'Guide' | 'Route' | 'Blog';
  countries: string[];
};
// build-only manifest route: { articles: SearchArticle[] }
// Pagefind result metadata: title, description, type
// Pagefind filters: country (multiple values), type (one value)
// Runtime: /pagefind/pagefind.js; baseUrl '/'; noWorker true.
```

Implementers must verify the pinned Pagefind release's official API/types for `createIndex`, custom records or HTML indexing, `getFiles`, result enumeration, `options`, `filters`, and multi-value filter attributes before encoding calls. Do not invent an API or rely on the unstable binary fragment format. Prefer one Node API build script that indexes only authorized rendered article files, retains returned indexed URLs, verifies exact manifest equality, then writes the generated files. The build-only manifest JSON is consumed and removed before final dist validation; it is not a second public search endpoint.

## Area A — authorized index and build lifecycle

### A1. Test public metadata independently of Astro loaders

1. Create pure metadata helpers in `src/lib/search-manifest.ts`, with loader glue isolated so Vitest can pass guide/blog fixtures without importing Astro virtual modules. First write `search-index.test.ts` cases for a city (`heroCountry`), a multi-country route (`countries[].name`), blog cities joining known guide IDs, unknown references, blank/duplicate country labels, and canonical trailing slashes.
2. Add negative fixtures for draft/private/gated entries, duplicate paths, noncanonical paths and unsupported types. Current loaders have no publication flags: explicitly reject those flags if encountered; do not advertise existing draft support or add a new CMS schema as scope creep.
3. Run `cd roammate.com && npx vitest run scripts/__tests__/search-index.test.ts`; observe failure because helpers do not exist.
4. Implement the smallest typed helper with strict path validation, whitespace normalization, deterministic sorting and deduplication. No body-text geography inference. Run the same command and expect all metadata cases to pass.
5. Add `src/pages/search-manifest.json.ts` using actual guide/blog loaders. All nine standalone comparisons use `BlogPostLayout` (confirmed during implementation), including GAFFL's extra-slot FAQ content. Include every reviewed published comparison once through the shared layout; never authorize arbitrary `/blog/*` files by glob alone or create duplicate body wrappers. Cross-check known blog metadata and explicit reviewed standalone paths, rejecting overlaps or missing rendered pages.

### A2. Test and apply article-only indexing boundaries

1. Add source/rendered fixture assertions: generic BaseLayout `main` has no `data-pagefind-body`; authorized guide/route/blog content does; header, footer, newsletter, gated content, app CTAs and related cards do not enter indexed text. Include comparison body and substantive FAQ coverage.
2. Run the focused test and confirm it fails before editing layouts.
3. Add body boundaries at article layouts and only missing standalone wrappers. Emit title/description/type and country facets from the shared authorized manifest entry, using `Astro.url.pathname` to resolve the canonical article. Set body markers only for a manifest match. Verify Pagefind's documented multi-value syntax; do not join country values into a single facet accidentally. Ignore nested nonarticle sections explicitly. Leave derived pages unmarked.
4. Run focused tests and `npx astro check`; expect clean results, without unrelated guide rewrites.

### A3. Generate and verify exact release artifacts

1. Extend tests with a temporary dist fixture: allowed article, unapproved article containing a body marker, missing allowed article, mismatched/duplicate returned URL, stale prior index, and a forced indexing failure. Assert manifest equality, removal of stale output, nonzero build failure, and no publication of partial successful-looking output. Inspect actual indexed text for chrome/CTA exclusion, not merely source attributes.
2. Run tests and capture the intended failures. Check npm metadata and official Pagefind documentation, select an available exact version, then `npm install --save-dev --save-exact pagefind@<verified-version>`; commit the resulting lockfile with implementation later.
3. Implement `scripts/build-search-index.mjs`: read and validate the build-only manifest; check rendered output for unexpected body markers; clear only `dist/pagefind/`; index authorized local HTML with base URL `/`; retain API-returned indexed URL identities; assert equality against manifest; write generated assets; assert entry/runtime/WASM existence; remove the consumed manifest. On any error exit nonzero and leave no deployable partial index. Export testable helpers and avoid side effects on module import.
4. Set build order exactly: lastmod → Astro → sitemap normalization → search build/verification → existing `tsx scripts/validate.ts --dist`. Add `build:search` only if useful for focused tests; normal `npm run build` must enforce it, not depend on a separate manual command.
5. Run focused tests, `npm run build`, and repeat `npm run build` after seeding a harmless stale file in `dist/pagefind/`; stale file must disappear. Query the real index in browser integration for one known guide, route and blog topic. Assert result URL set parity using supported Pagefind API/build return values, not an empty-query assumption.
6. Root reviews and commits this area after integration checks: `feat: build authorized static Pagefind index`.

## Area B — header handoff, accessible search and privacy

### B1. Lock query transport and analytics behavior in tests

1. Create `search-handoff.test.ts`: header submission stores a bounded query under `roammate.search.query`, navigates only to `/search/`, destination removes the key immediately after reading, and denied/throwing storage still navigates safely to an empty search page. Queries never enter location search/hash, links, logs, analytics properties or HTML serialization. Test empty/whitespace query and reloading after one-time consumption.
2. Run `npx vitest run scripts/__tests__/search-handoff.test.ts` and observe failure, then implement a tiny dependency-injected helper in `src/lib/search-handoff.ts`. Use `try/catch` around storage; no durable `localStorage` query history.
3. Extend existing analytics tests before changing BaseLayout. Add a page-scoped opt-out (`analyticsEnabled = true` default; search passes false) that gates SDK initialization and manual captures even with previously granted consent. Existing nonsensitive-page analytics behavior must remain unchanged. Header form/input/submission controls use `ph-no-capture` and `ph-mask`; search controls, status and results are also excluded/masked. Verify supported current PostHog marker behavior against official docs and actual network inspection.
4. Run focused analytics tests for red, add the opt-out in `BaseLayout.astro`, and run them for green. Prefer omitting search-page analytics initialization entirely, not merely suppressing custom search events. Do not disable analytics globally or remove the deployment key gate.

### B2. Build progressive header and page shell

1. Add failing source/component tests for a labelled `<form role="search" action="/search/" method="get">`, search input without a `name` attribute, submit button, masked container and ordinary accessible browse fallback. No `name` means native no-JS fallback never places the query in an HTTP URL; explain on the destination that JavaScript is required and offer `/guides/` and `/blog/`.
2. Add the compact header form in `Nav.astro`. Its external bundled script prevents default only for the intended form, uses the handoff helper, and navigates with a clean URL. Preserve menu Escape, focus, inert and existing link handling; do not introduce another modal or focus trap.
3. Add `search.astro` using BaseLayout's canonical behavior, `noindex,follow` metadata via a narrowly scoped layout prop, and analytics opt-out. Add `SiteSearch.astro`: persistent query/country/type labels, instructions, polite live status, results list, reset, retry and Load more controls, and noscript browse links. Do not autofocus.
4. Run `npx vitest run scripts/__tests__/search-ui.test.ts scripts/__tests__/nav-menu.test.ts scripts/__tests__/analytics-init.test.ts` and `npx astro check`; expect green. Add scoped responsive styles matching existing site tokens, minimum touch targets, visible focus, and no 320px overflow.

### B3. Test asynchronous search and minimal runtime

1. Add pure-controller tests in `search-ui.test.ts` using mocked Pagefind API and fake timers: empty query does not enumerate all results; debounce coalesces input; request generation tokens reject stale query/filter responses including late failures; country/type filters combine with AND; unknown country remains in All only; reset clears both filters; first hydration calls only 10 result `data()` functions; Load more hydrates next 10 only; failed import/search/hydration renders a retryable error; retry retries failed runtime import rather than caching a rejected promise forever.
2. Run focused tests for red. Implement `search-client.ts` and wire it from `SiteSearch.astro`. Dynamic import `/pagefind/pagefind.js` only on search route via Vite-safe external dynamic import, call documented options with `baseUrl: '/'` and `noWorker: true`, fetch represented filter values, debounce about 200ms, and bound each hydration batch to 10. Reuse native controls and keep focus where the user left it.
3. Construct result nodes with DOM APIs and `textContent`. For excerpts, either implement a tested allowlist retaining only Pagefind's intended `<mark>` text highlighting, or safely turn excerpt markup into text without exposing literal tags. Never assign query, title, URL or arbitrary excerpt to `innerHTML`. Validate result URLs as same-origin authorized canonical article paths before setting `href`; reject schemes/external URLs rather than relying solely on trusted index generation.
4. Run focused tests and `npx astro check`; expect green. In a complete built preview, test known city/route/blog searches, single/combined facets, no match, rapid typing, reset, pagination, retry and keyboard navigation. Inspect title/snippet/type correctness and current-host result navigation.
5. Add sitemap filtering for `/search/` and the transient manifest endpoint in `astro.config.mjs`; verify neither appears in generated sitemap. Review robots/llms deliberately: retain crawl access so noindex is visible, preserve sitemap/RSS references, and document search as a client-side utility only if it improves existing llms guidance. Never add it to RSS. Add test coverage for canonical/noindex/sitemap exclusions.
6. Root reviews and commits: `feat: add private accessible site search`.

## Area C — route-scoped CSP and static delivery

### C1. Regression tests before policy edits

1. Extend `nonce.test.mjs` with `/search/` and normalized `/search` HTML/non-HTML/redirect/error cases: WASM permission only for intended route, unchanged unrelated policies, fresh nonces and existing directives retained, strict expected-upstream-policy validation including rejecting wrong-route or comma-combined policies. Include a non-search URL containing `search` in a slug to disallow loose substring matching.
2. Extend deployment tests asserting `/pagefind/*` is excluded from Function invocation, preserved in scratch output, not copied to public source, and remains revalidated rather than blanket immutable. Assert all prior exclusions and release gates remain.
3. Run `node --test infra/csp-nonce/*.test.mjs`; capture expected failures.

### C2. Implement minimal equivalent route policy

1. Derive the search policy from the existing public CSP by adding only `'wasm-unsafe-eval'` to `script-src`. No `'unsafe-eval'`, script `'unsafe-inline'`, worker/blob relaxation, new remote script origin, or global WASM permission.
2. In middleware choose the expected policy by exact intended search path before the upstream guard; use that same expected policy for stamping and nonce insertion. Add `pagefind` to asset short-circuit and `/pagefind/*` to `_routes.json` (the latter actually prevents invocation).
3. In `_headers` use Cloudflare's documented unset/replace syntax so overlapping `/*` and search rules yield one effective route-specific CSP, not two conjunctive policies. Verify current official Pages semantics before writing syntax. Cover `/search` redirect and `/search/` document consistently; do not broad-match `/search*`. Preserve preview host noindex rules.
4. Run `node --test infra/csp-nonce/*.test.mjs` and the exact existing middleware `tsc` command from `deploy.sh`; expect green. Static textual checks alone do not prove effective response behavior.
5. Document build-plus-preview instructions and local production-style CSP verification in `infra/csp-nonce/README.md`, including index/HTML rollback coupling and search-specific WASM expectation. Root reviews and commits: `fix: scope Pagefind WASM policy to search`.

## Integration acceptance and handoff

Run these locally from repository root, without uploading:

```sh
cd roammate.com
npm run validate
npm test
npx astro check
npm run build
npm run validate:dist
node scripts/check-claims.mjs
cd ..
node --test infra/csp-nonce/*.test.mjs
# Also run the existing exact middleware type-check command from deploy.sh.
git diff --check
```

All exit codes must be zero. Serve the exact built HTML/index with local Pages/nonce scratch assembly using the already pinned Wrangler, without deployment. Verify real effective headers for search, ordinary HTML, redirect/error and Pagefind assets; correct JS/WASM content types; static route exclusion; no runtime CSP errors; successful noWorker WASM load. Also test static fallback response policy separately. If local emulation cannot establish actual production header behavior, state that limit and retain live verification as a Bead; do not claim deployed compatibility.

Use browser automation/inspection against the real built index: keyboard-only completion, mobile menu regression, 320px viewport, 200% zoom, touch controls, no unexpected focus movement, polite result announcements, denied session storage, disabled JavaScript, runtime asset failure/retry, stale-response prevention and filter/pagination behavior. Record actual index asset size and representative full-index responsiveness before accepting `noWorker`; avoid invented performance claims.

With analytics consent both granted and denied, inspect outgoing requests during header typing/submission and result interaction. Test a unique sentinel query and confirm it appears nowhere in request URLs, referrers, analytics bodies, or replay/autocapture data. Only same-origin Pagefind assets may be requested for search. Search-page SDK suppression and clean URL transport must both hold. Do not expose user secrets in test logs.

Root conducts independent spec and code review, resolves findings with fresh tests, records any remaining externally blocked validation in Beads, and closes implementation work only to the level actually verified. Run the repository completion protocol: commit scoped changes, `git pull --rebase`, `bd dolt push`, `git push`, verify origin synchronization and clean status, and hand off deployment/live-verification separately. Do not erase another agent's stash or unrelated changes during cleanup.
