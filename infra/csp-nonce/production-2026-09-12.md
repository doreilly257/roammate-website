# Public CSP nonce production verification — 2026-09-12

## Authorization and deployment

The user approved public-site nonce deployment after isolated staging and the
quota/failure-behavior review. Cloudflare MCP confirmed public Pages deployment
`8a9276b8-5cd8-4908-b8ae-71567eb0bc37` successful, created at **16:24:40 UTC**,
source commit `8925d4b`. The separate admin deployment remained `bd33bcb1`.
Existing `fail_open: true` was unchanged. No bot, WAF, cache-rule, plan or
failure-mode setting was changed for this rollout.

Before upload, the operator rechecked static deployment
`a70bd978-9b79-48e1-98ea-f0e95f62ab50` as the known-good rollback target.
Future rollouts must recheck their own target. Normal `deploy.sh` now includes
the reviewed nonce Function and is **not** a static-only rollback path.

Local gates passed: **15 nonce/workflow tests, 116 public tests, Astro checks,
3,504-page build/link validation, and claims checks covering 659 files**.
Deployment assembled reviewed Functions/routes with built static assets in a
scratch directory using pinned Wrangler 4.131.1; source `public/` and Astro
`dist/` remained static.

## HTTP verification

The root operator's 27-check matrix passed (local evidence archive
`892fbf1a5bcbd45b`):

- Nine distinct HTML response nonces across repeated homepage GETs, blog,
  Bangkok companions, Kratie guide, missing-page 404, HEAD, conditional and
  range requests.
- HTML returned the expected statuses, `no-store`, `CF-Cache-Status: DYNAMIC`,
  no ETag/Last-Modified validators, no public noindex, and no
  `script-src 'unsafe-inline'`.
- Slash normalization remained a **308** redirect without a nonce.
- CSS, JavaScript, font and image probes each returned **MISS → HIT → HIT**,
  retained immutable caching and matched the exact built bytes:
  - `/_astro/404.B79QYsut.css`
  - `/_astro/404.astro_astro_type_script_index_0_lang.BAIBiFgl.js`
  - `/fonts/fraunces-latin-italic.woff2`
  - `/images/app-phone-profile.webp`
- Robots, RSS and sitemap returned **200**, without nonce headers.
- Admin authentication boundary remained **302**; API health returned **200**.

These are sampled request checks, not a global cache-ratio or performance study.

## Independent live browser verification

Fresh Chromium contexts visited each of:

| Public path | HTTP | Injected JSD nonce matches response CSP | CSP errors | Page errors |
|---|---:|---|---:|---:|
| `/` | 200 | Yes | 0 | 0 |
| `/companions/bangkok/` | 200 | Yes | 0 | 0 |
| `/guides/kratie/` | 200 | Yes | 0 | 0 |
| `/blog/` | 200 | Yes | 0 | 0 |

Every page had one observed injected JSD script whose DOM `.nonce` property
matched its document's response-header nonce. All four loaded real
challenge-platform `main.js` through **302 → 200**. The Bangkok, Kratie and blog
contexts also observed **oneshot 200**; homepage oneshot completion was not
observed before that context closed. Neither robots meta tags nor response
headers marked these public pages noindex.

A further fresh blog context verified:

- Search/show-more behavior: **12 visible cards → 0 for an unmatched search →
  12 after clearing → 24 after Show more**.
- PostHog SDK absent before consent; clicking Accept fetched the real
  `array.js` with **200** and initialized the SDK.
- No page errors; real JSD oneshot returned **200**.

Analytics ingestion and Cloudflare RUM requests were intercepted to avoid
polluting production telemetry. JSD requests were **not mocked**. The consent
check proves SDK loading/initialization, not successful event ingestion.
No raw nonces, cookies or credentials were included in evidence output.
The dedicated browser and fresh contexts were closed; local browser artifacts
were moved to `/tmp/roammate-nonce-live-browser-2026-09-12/`.

## Tagged production Function-tail verification

A header-filtered tail used `x-roammate-nonce-check: 20260912-production`
for five requests: `/blog/`, an image, a font, CSS and the missing path
`/nonce-routing-production-check`. Only the blog **200** and missing-page **404**
produced Function events; both had outcome `ok` and empty exception lists.
The three interleaved static asset requests returned **200** without Function
events in this filtered sample.

The observed script was `pages-worker--18564688-production`, version
`b8c46321-6cf4-415c-968a-65a239b5f071` (local evidence archive
`ff0595facaaa6069`). The tail was stopped after verification. This is a bounded
empirical routing check, not proof covering every path or all production traffic.
No IP addresses, raw nonces, cookies or credentials are reproduced here.

## Limits and follow-up

This verifies the former JSD/CSP conflict is absent on the sampled production
navigations, not that every browser or future request is error-free. JSD injection
is not guaranteed on every response.

The user confirmed **Workers Paid**. This deployment does not establish a
zero-cost guarantee, invoice total, aggregate billed CPU or long-term latency
impact. HTML now invokes the Function and uses no-store; static route exclusions
preserve asset caching. Monitor usage, errors and cost against the dated
[operations review](operations-2026-09-12.md).

Search Console follow-up was deferred by the user. This deployment does not
resolve or prove Google indexing outcomes. The exact proposed terms wording
remained awaiting approval; no unapproved legal correction is implied here.

Historical [staging evidence](staging-2026-09-12.md) remains unchanged.
