# Pagefind chunk integrity hardening

Date: 2026-09-13  
Bead: `roammate-website-f6o`  
Status: Independently reviewed and approved; local implementation and verification authorized by the user's subsequent instruction to proceed until done. Deployment remains unauthorized.

## Goal and scope

Prevent malformed HTTP-200 Pagefind index/filter responses from appearing as successful empty or incomplete search results. Preserve the existing search error/Retry/browse fallback and no-additional-cost static architecture. This extends the approved site-search design, rather than introducing a new search engine or global transport layer.

Authorization covers local implementation and verification only. No production/preview deployment, backend/admin change, paid service, dependency upgrade, new infrastructure, GitHub Actions workflow, search telemetry, or customer-data probe is included. Generated output remains in `dist/pagefind/`, never `public/` or tracked source. Keep Pagefind pinned to `1.5.2`.

## Confirmed defect and selected approach

The pinned runtime's `_loadGenericChunk` catches decoding/backend failures instead of rejecting to its caller. Existing `observePagefindFetch` detects network and non-2xx failures only. Public Pagefind types expose neither a custom transport nor a chunk-error callback. The official releases page still lists 1.5.2 as latest at investigation time.

A real Chrome localhost fixture generated two documents with the installed Pagefind Node API and used transpiled copies of the actual controller/observer. Healthy Bangkok search returned one result; malformed index HTTP 200 returned `ready` with zero results and healthy transport; malformed filter HTTP 200 returned `ready` with missing facets. Native `RequestInit.integrity` SHA256 checks converted both failures into fetch rejections: the controller rendered `error`, and restoring bytes plus Retry recovered one result. Destroying the singleton between cases is essential: cached valid chunks otherwise mask corruption.

Choose a build-generated digest manifest plus native Fetch integrity in the existing search-page observer. Verify downloaded bytes before Pagefind consumes them without inspecting its binary format or altering generated runtime. Existing sticky transport health turns swallowed fetch rejection into an explicit UI failure.

Alternatives:

- **Wait for upstream:** lower maintenance but leaves reproduced false-success behavior unresolved; no newer supported fix was verified.
- **Patch generated runtime or decode chunks ourselves:** rejected; couples the site to private binary/implementation details and creates an unsupported patch obligation.
- **Clone responses and hash with Web Crypto:** feasible but adds unnecessary application-owned buffering/body handling when native Fetch integrity supplies the signal.

Sources: [pinned loader](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts#L333-L363), [public types](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/types/index.d.ts), [releases](https://github.com/Pagefind/pagefind/releases), [Fetch integrity](https://fetch.spec.whatwg.org/#dom-requestinit-integrity).

## Build contract

Extend `scripts/build-search-index.mjs` after its authorized URL-set and runtime-file checks. Hash relevant `index.getFiles()` byte arrays, not source HTML, decoded payloads, filename hashes, or HTTP transfer encoding.

Generate exactly `/pagefind/integrity.json` with this schema (the illustrative digest placeholder is not a valid value):

```json
{
  "version": 1,
  "pagefindVersion": "1.5.2",
  "assets": {
    "/pagefind/filter/en_example.pf_filter": "sha256-<canonical base64 digest>",
    "/pagefind/index/en_example.pf_index": "sha256-<canonical base64 digest>"
  }
}
```

Use Node's built-in SHA256 over exact emitted bytes; encode the 32-byte digest as canonical base64 with the `sha256-` prefix. Sort asset keys lexically and serialize deterministically with a final newline. Include no timestamp, build path, query, document text, or transient article-authorization manifest.

Allowed asset keys match this regular expression, with literal dots:

```text
^/pagefind/(?:index/[A-Za-z0-9_-]+\.pf_index|filter/[A-Za-z0-9_-]+\.pf_filter)$
```

Each complete path is at most 160 ASCII characters. Reject duplicate emitted paths before object construction, unknown files inside `index/` or `filter/`, and unsafe paths under existing checks. Exactly cover every emitted index/filter chunk once; this site's build must contain at least one of each kind. Exclude JS, entry JSON, metadata, WASM, fragments, and the integrity manifest itself.

Shared generator/consumer limits: **2,048 asset entries** and **262,144 UTF-8 bytes** for the complete manifest. Exceeding either fails the build; never truncate. Verify the installed package version equals the declared 1.5.2 pin rather than labeling an arbitrary runtime. Future runtime/schema changes require deliberate review and fixture verification.

Write the manifest only after all chunk writes succeed. Existing clean-output and catch/finally cleanup must cover it: write/validation/index-cleanup failure must not leave deployable partial `pagefind/` output. Preserve authorized article coverage, transient manifest deletion, and quality gates. These are generated assets, not HTML pages; no sitemap/RSS entry is added and article/canonical/robots/llms behavior is unchanged.

## Manifest loading and strict validation

Keep installation on `/search/` through `SiteSearch.astro`, and retain `noWorker: true` because the observer runs in the window realm. Do not wrap fetch on other pages or instrument console messages.

The observer owns an epoch object containing a sticky failure bit, optional manifest promise, and whether it is a Retry epoch. A watched request captures this object at invocation. The first watched request lazily starts one manifest load using captured original fetch, avoiding wrapper recursion. Concurrent watched requests share the promise. Empty queries and unrelated fetches do not load it. Retain a rejected promise until explicit Retry rather than repeatedly retrying in the background.

Use fixed same-origin `/pagefind/integrity.json`, `cache: 'no-store'`, and `redirect: 'error'`. Append no query, facet, identifier, or timestamp. Require HTTP success. Bound the actual streamed body to 262,144 bytes before parsing and cancel on overflow; Content-Length is only an early rejection hint. Reject absent/unreadable bodies, invalid UTF-8/JSON, unsupported schema/runtime versions, arrays/null where objects are required, unknown top-level fields, invalid paths/digests, too many entries, or missing either chunk kind. Accept only canonical single SHA256 SRI strings, not whitespace or multiple algorithms. Store validated entries in a Map or null-prototype record with own-key lookup.

Duplicate paths in generated input are a build error. Consumer validation operates on parsed JSON; it must not claim ordinary JSON.parse detects duplicate JSON object keys. No custom JSON parser is needed for this trusted-origin corruption contract: altered manifest data still cannot silently relax the required path/digest validation.

## Watched fetch behavior

Every same-origin index/filter request recognized by the current observer must obtain a validated own manifest entry before proceeding. Missing/invalid/unavailable manifest or unknown requested chunk fails closed; never fall back to unchecked fetch. Keep existing matching broad enough that malformed names within its already-watched path shapes cannot bypass verification.

Resolve Request, URL, and string inputs using the same URL semantics as existing observation. Match by exact normalized same-origin pathname, including for chunk URLs with query/hash. Queries/hashes do not select a different digest or get copied to manifest URLs/diagnostics. Forward the original chunk input without adding or moving query data. Pagefind's chunk requests contain content-derived asset names, not user queries; this change must not introduce query-bearing transport. Nonwatched/cross-origin requests retain the exact original argument list.

For a watched request, forward its original input and a fresh init object with the expected `integrity`. Preserve native Request inheritance: headers, method, credentials, signal, and other settings come from the Request unless explicitly overridden by caller init. Do not replace a Request with its URL string, consume/clone its body, mutate caller init, or merge headers incorrectly. If effective caller/Request integrity is nonempty and differs from the expected exact digest, reject rather than silently weakening or replacing it; matching integrity is retained. Empty integrity is filled with the required digest.

The only deliberate settings beyond filling integrity are `redirect: 'error'` for watched chunk fetches and Retry cache policy below. Reject redirects before any follow-up request, including foreign-origin redirects, so there is no new metadata/query disclosure to a redirect target. Other native request settings and explicit overrides remain unchanged; tests must document these two narrow exceptions rather than claiming byte-identical watched options.

Require native Request integrity support; absence fails closed through the existing error UI, not an unchecked fallback or new polyfill. A capability/property check is a guard, not proof of enforcement: verify digest mismatch in a real browser. Fetch returns its original successful Response or rejection. Do not manually decode, download a chunk twice, hash a Response clone, replace its body, or log queries/payloads. Do not intercept or send browser/Pagefind console errors to telemetry.

## Failure, concurrency, Retry, and caches

Manifest, unknown-chunk, integrity, network, and non-2xx failures mark only the captured epoch failed. `hasFailed()` reads the current epoch. A late pre-Retry request must not replace the current manifest or poison its health; a failed old request still rejects to its own caller. Existing controller generation tokens suppress stale UI completions.

Health remains sticky across queries/facet changes. Existing checks after `filters()` and `search()` must render error, not successful empty/partial results. Normal input changes cannot rehabilitate a partially loaded runtime. For the new-query index/filter failures covered here, the controller clears items and total before loading; retained facets must not be presented as successful new output. Preserve existing pagination behavior, including already-rendered items on a later hydration failure, without unrelated UI changes. No new UI or query-bearing diagnostics are required.

Explicit Retry replaces the epoch, clears its manifest promise and the controller runtime promise, retains query/facets, and uses the existing loader's public `destroy()` before reapplying options. Each watched chunk request in a Retry epoch deliberately sets `cache: 'reload'`, overriding an inherited/explicit cache mode to avoid reusing corrupt HTTP-cache bytes. All other settings follow the contract above. Refetch the manifest with `no-store`; merely clearing its failure bit is insufficient. Do not automatically replay failed chunks, introduce cache-busting URLs, or add unbounded background retries.

Retain the existing maximum four distinct module import URLs (initial plus three content-free retry counters) and reload-required behavior after exhausted import failures. This bounds **module import failures**, not every user Retry of an already loaded module. Introduce no second runtime identity scheme.

Stale manifest, cached runtime, or mixed release/chunk bytes may yield unknown-path or digest errors. This is intentional fail-closed availability loss, never false zero or silent omission. Refetched manifest, cache-reloaded chunks, and destroyed singleton should recover once the origin serves a consistent release. Persistent inconsistency remains an error; page reload replaces a cached module/build. Do not promise Retry can repair an inconsistent origin or detect every semantic cross-release mismatch. Any later deployment must retain atomic HTML/runtime/index upload and rollback discipline; deployment remains outside this approval.

## Guarantee boundaries

Protect only watched index/filter bytes relative to the trusted-origin manifest. This is not an authenticity signature against a compromised origin, replacement for CSP, validation of Pagefind's data model, or detection of malicious/invalid bytes consistently emitted and hashed by a build. Existing handling for entry/meta/WASM/fragments/runtime remains unchanged. Browser capability checks do not establish support for every historical browser.

## Acceptance and implementation surface

Use TDD: first failing focused tests demonstrating the defect, then the smallest implementation and regression runs. Expected source scope: `scripts/build-search-index.mjs`, `src/lib/search-client.ts`, existing search tests, and a small shared contract helper if needed. Change `SiteSearch.astro` only if wiring requires it. No dependency or generated-runtime edits.

Required acceptance evidence:

- Deterministic exact-byte hashes and exact coverage; duplicate/unsafe/unknown paths, wrong installed version, empty required chunk kinds, count/byte overflow, write failure, and cleanup failures reject.
- Consumer rejects invalid JSON/schema/version/UTF-8/hash/path, actual streamed overflow despite absent/false Content-Length, manifest network/non-2xx/redirect failures, and unknown watched paths. Digest mismatch never falls back unchecked.
- Single-flight lazy loading per epoch; sticky failure; manifest recovery after Retry; old manifest/chunk completions cannot affect new health. Verify unchanged unrelated/cross-origin arguments and successful Response identity; Request/URL/string, signals, overrides, conflicting integrity, query/hash mapping, redirect refusal, and Retry-only cache override.
- Controller error for swallowed index/filter integrity failures and recovery through Retry; preserve generation, four-import bound, fragment/runtime recovery, pagination, safe-link, and privacy tests.
- Real locally served generated Pagefind 1.5.2 with at least two documents: healthy search; malformed HTTP-200 index; restore plus Retry; malformed HTTP-200 filter; restore plus Retry; genuine unmatched query. Corruption must show error, never ready/0 or incomplete successful facets. Genuine unmatched query remains ready/0. Destroy/reset between cases to defeat in-memory caches. Exercise stale/missing manifest entry and recovery, plus request redirect refusal without any redirect-target request. Capture fixed asset traffic showing one manifest load per epoch, no duplicate verification downloads, and no query-bearing search requests.
- Repeat healthy/error/recovery against the full local generated site with enforced search CSP and no production telemetry. Run public tests, Astro type-check, full build/link/index validation, and applicable nonce/deploy tests. Verify complete generated manifest and unchanged sitemap/RSS behavior. Record actual browser/version and results, not untested coverage claims.

Independent review approved this design without serious gaps. The user's subsequent instruction authorizes proceeding with local implementation and verification without another approval prompt. Local evidence cannot establish deployed activation; preview/production release and live verification require separate authorization.
