# Pagefind integrity: local verification

Date: 2026-09-13  
Bead: `roammate-website-f6o`  
Scope: reviewed local implementation; **no production or preview deployment**.

## Implementation and review

The [approved design](../specs/2026-09-13-pagefind-integrity-design.md) and
[implementation plan](../plans/2026-09-13-pagefind-integrity.md) retain Pagefind
1.5.2 and the no-additional-cost static architecture. The builder emits a bounded,
strict SHA256 manifest for every emitted index/filter chunk. The search-only
observer lazily shares one manifest load per epoch and uses native Fetch SRI,
redirect refusal and sticky transport health. Explicit Retry replaces the epoch,
destroys the previous runtime and reloads watched chunks. Other assets and
unrelated fetches retain their existing behavior.

- Builder/shared contract, `7f6c310`: independent review approved; **93 focused tests**.
- Observer, `4ebf345`: independent review approved; **50 focused tests**; implementation verification also ran **145 search tests**.
- Local browser fixture: independent review approved; **2 focused tests**.

These counts describe overlapping runs, not additive coverage. Evidence below
was supplied by the supervising session; this report does not imply another
independent browser execution by its documentation author.

## Local quality gates

From `roammate.com/`, the supervising session verified:

- `npm test`: **296 tests in 31 files passed**.
- `npx astro check`: **146 files, 0 errors, 0 warnings, 83 hints**.
- Full build: **3,505 pages**, **587 authorized indexed articles**, valid built links.
- `node scripts/check-claims.mjs --all`: **662 files clean**.

The nonce/deployment suite passed **23 tests** and the middleware TypeScript
check passed using the exact flags from `deploy.sh`. Initial attempts to invoke
nonexistent `check`/`check:claims` npm scripts and a nonexistent TypeScript config
failed; the corrected commands above and deployment-script TypeScript invocation
passed. This records individual successful gates, not a successful exit for the
initial composite invocation.

Independent hashing of **all 128 manifest entries** (**126 index, 2 filter**)
matched the exact emitted bytes. The manifest was **11,831 bytes**, schema version
**1**, Pagefind **1.5.2**. Sitemap/RSS contained no search assets, and the transient
`search-manifest.json` was absent from the finished output.

## Real-browser fault and recovery evidence

The actual implementation ran in **Chromium 153.0.8010.37** at
`http://127.0.0.1:4178/search/`. The tiny fixture uses the real builder, installed
Pagefind, actual `SiteSearch.astro` markup/script and actual nonce middleware.
External traffic was blocked before navigation. Independent cases reloaded the
page to prevent a healthy in-memory chunk cache from hiding a fault.

| Case | Observed result |
| --- | --- |
| Healthy `travel` query | 2 results |
| Malformed index bytes, HTTP 200 | Search unavailable, 0 items, Retry available |
| Malformed filter bytes, HTTP 200 | Search unavailable, 0 items, Retry available |
| Valid manifest missing requested index entry | Search unavailable, 0 items, Retry available; missing index was not fetched |
| Stale digest | Search unavailable, 0 items, Retry available |
| Watched chunk redirect | Search unavailable, 0 items, Retry available; **0 redirect-target requests** |
| Restore healthy mode, same-page Retry after each fault | 2 results, without reloading the page |
| Genuine unmatched query | Ordinary no-results state, no Retry |

Browser logs explicitly reported native SRI digest rejection. Fixed-path fixture
counters recorded one manifest load per epoch and each needed chunk once per
epoch: verification did not duplicate downloads. The query stayed out of the
page URL. This is evidence of native enforcement in the tested browser, not just
the presence of `Request.prototype.integrity`.

## Full built-site browser verification

The supervising session repeated verification against the actual 3,505-page
build through the fixture's read-only `--dist` mode at port **4179**, using the
same Chromium version and external-traffic interception before navigation.

- Initial status was “Enter a topic to begin”; asset counters were empty,
  confirming lazy loading.
- `Bangkok` returned **73 results**, showing **10** initially, with
  `/guides/bangkok/` first. Selecting country Thailand returned **15 results**.
- All five fault modes (`index`, `filter`, `missing`, `stale`, `redirect`)
  produced unavailable status and **0 items**. Restoring healthy mode and clicking
  Retry on the same page recovered **73 results**, showing **10**, for every case.
- Each needed asset and the manifest were requested **once per epoch**. The
  missing requested index was not fetched; redirect-target requests stayed **0**.
- Genuine `zzzzzznonexistent` produced ordinary “No results” without Retry.
  The URL remained `/search/`, without the query.
- A CSP-violation listener installed before navigation recorded **no violations**
  in each case. The actual middleware enforced a nonce-bearing policy with
  `script-src 'self'` and `'wasm-unsafe-eval'`, without broad `'unsafe-eval'`.

These checks exercised the built UI/runtime and local middleware together, not
only the two-document fixture. They retain the same local/no-store and trusted-
manifest limitations below.

## Reproduction

From `roammate.com/`:

```sh
npm test -- scripts/search-integrity-fixture.test.mjs
node scripts/search-integrity-fixture.mjs --port 4178
# Alternatively, serve an already-built release read-only:
node scripts/search-integrity-fixture.mjs --dist "$PWD/dist" --port 4179
```

Use a browser with external traffic blocked before navigation. Fixture controls
accept `POST /__fixture/mode/healthy`, with `index`, `filter`, `missing`, `stale`
or `redirect` in place of `healthy`. Mode changes reset counters;
`GET /__fixture/stats` returns only fixed asset paths, request counts/cache
headers and a redirect-target count. For independent faults reload after setting
the mode, search, inspect the error, restore healthy mode, then click Retry on
the same page. Tiny queries `travel` and `Bangkok` return 2 and 1 healthy results.

## Limits and release boundary

The fixture deliberately serves `no-store`; this does **not** prove production
HTTP-cache behavior. It is not a Cloudflare edge, routing or JSD emulator.
Digest checks cover watched index/filter bytes relative to a trusted-origin
manifest, not origin authenticity, consistently corrupt bytes hashed by the
build, all Pagefind file types or every browser. No new telemetry, service,
dependency upgrade or deployment was performed. Existing preview evidence
predates this integrity implementation; production activation remains separate.
