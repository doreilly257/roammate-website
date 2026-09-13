# Search integrity and capability copy: preview verification — September 13, 2026

## Deployment scope and supplied gates

The supervising session reported successful authorized **preview-only** deployment
of source `996404cdc0aaa063c78e72ea2797d41fd2427cfb`, deployment
`02832491-8fab-4fe1-8ad1-d99924833840`, to
<https://02832491.roammate-cs7.pages.dev>, with **23
nonce/deployment tests**, **348 public tests**, Astro **0 errors / 0 warnings**,
**3,505 built pages**, **587 indexed articles**, and the **662-file claims guard**
passing. These gate results are supplied by the supervisor, not rerun by this
reviewer. This report does not claim production activation or an admin release.

## Independent live HTTP verification

At approximately **09:34 UTC**, the delegated reviewer fetched the deployment
directly using curl. No search query was placed in a remote request URL.

| Route | Observed effective response |
| --- | --- |
| `/search` | 308 to `/search/`; one CSP with scoped WASM permission, no nonce; preview `noindex, nofollow` |
| `/search/` | 200 HTML; one CSP with one nonce and scoped WASM permission; `no-store`; preview `noindex, nofollow` |
| `/` | 200 HTML; one CSP with one nonce, no WASM permission; `no-store`; preview `noindex, nofollow` |
| `/pagefind/integrity.json` | 200 JSON; `public, max-age=0, must-revalidate`; no nonce |
| `/pagefind/wasm.en.pagefind` | 200 `application/octet-stream`; `public, max-age=0, must-revalidate`; no nonce |
| `/search-manifest.json` | 404; transient build manifest not exposed |
| `/sitemap.xml` and `/rss.xml` | Both 200 XML; neither body contained `/search/`, `/pagefind/` or `/search-manifest.json` references |

The search canonical was `https://roammate.com/search/`; the homepage canonical
was `https://roammate.com/`. This verifies these sampled responses, not every
route, client, edge location or future request.

## Complete integrity-manifest asset comparison

The deployed `/pagefind/integrity.json` was **byte-identical** to the local
`roammate.com/dist/pagefind/integrity.json`. Its SHA-256 was:

```text
99b4b41f85a37c44a6b960d7095268d29e978257bd61b63bd58b2382e236f594
```

Using six bounded concurrent curl fetches, the reviewer retrieved **all 128
assets listed in that manifest**. All 128 matched both their manifest SHA-256
SRI value and the corresponding local `dist` bytes; **zero fetch or comparison
failures** occurred. This manifest contains **126 index assets and two filter
assets**, not fragments. Complete coverage of its entries must not be described
as a hash audit of every file in the Pagefind directory.

Three additional runtime assets independently matched local bytes:

| Asset under `/pagefind/` | Deployed SHA-256 |
| --- | --- |
| `pagefind.js` | `252d272bd34d483d19a752060f6a065114d15ab12c42d8f905ca565e2768a009` |
| `pagefind-entry.json` | `84f1ba1477c9a1dd03c844a31898065b3fa916bf04fdfea46e7d589e79129bdf` |
| `wasm.en.pagefind` | `6c8406154b5d460fc8b6cdbf2c99c008c43c465efdb1f9c15c192f5cf30dcd85` |

Byte/hash parity establishes deployment consistency for the checked artifacts.
It does not by itself establish browser integrity enforcement or corrupt-response
recovery.

## Representative capability copy

Independent live body checks returned 200 for the homepage, comparison pages and
`/llms.txt` and found the intended qualifications:

- Homepage and `/blog/roammate-vs-gaffl/`: **Optional identity verification**.
- `/blog/best-travel-companion-apps-2026/`: advises reviewing suggested profiles
  and discussing plans to assess compatibility; explicitly says a compatible
  companion is not guaranteed for the destination and dates.
- Homepage and `/llms.txt`: **Discuss your plans to assess compatibility.**

These are representative deployed-copy checks, not a new certification of all
underlying app capabilities or every sentence on the site.

## Supervisor-supplied live browser evidence

The supervisor tested this preview in actual Chrome **153** through Playwright CLI:

- Bangkok returned **73 results**, initially showing **10**; Thailand returned
  **15**, initially showing **10**; adding Guide returned **10**, all with guide
  paths. At 320px, `clientWidth` and `scrollWidth` both measured **320**.
- `window.posthog` was undefined on search. External traffic was blocked before
  typing; this is scoped evidence, not unrestricted telemetry verification.
- Browser-intercepted **HTTP-200 corrupt index** and **corrupt filter** responses
  each produced an unavailable/error state with visible Retry and **zero result
  items**. Removing the fault and using same-page Retry recovered to **73**.
- An intercepted **missing manifest entry** and **stale digest** each produced
  the same zero-items/error state and recovered to **73** through Retry.
- An intercepted **302 index redirect** to a local dummy target produced the
  unavailable state with **zero items** and **zero target requests**. Removing
  the interception and using same-page Retry recovered to **73**.
- `Bangkok Antarctica Reykjavik` produced genuine **No results** without Retry.
  The tested single-word gibberish queries returned results, so they were not
  used as zero-result fixtures.
- At a 1280px homepage viewport, submitting Bangkok through the header reached
  the exact clean preview `/search/` URL, restored Bangkok in the input and
  returned **73 results**, initially showing **10**. The handoff session-storage
  key was `null`; captured request URLs contained no Bangkok query, the captured
  PostHog request list was empty, and `window.posthog` was undefined.

The injected faults produced expected SRI errors, and the blocked Cloudflare
beacon produced an error. These checks do **not** establish globally clean
console output. The supervisor found no CSP violations in the checked console
log. All external traffic remained blocked before typing, including during the
handoff check; absence of captured PostHog traffic is not a claim about every
unintercepted browser session.

The supervisor retained CLI screenshot and console artifacts at
`/tmp/roammate-preview-integrity-02832491/cli-artifacts` and closed its browser.

## Limits

This reviewer independently performed the HTTP/hash/copy checks above; browser
results are explicitly attributed to the supervisor. The reviewer did not inspect
personal records, mutate production, change Beads, or deploy anything. No claim
of production-zone JSD compatibility, unrestricted telemetry privacy, long-term
cost/latency, or universal corrupt-response recovery follows from these checks.

The supervisor additionally reported that its post-preview Cloudflare API check
still identified production deployment `d1d8272a-bf47-4340-bb41-166cc6740d99`,
source `a95b835c9dc54fbdba415f9f964fda29b2aa1717`, with the apex still a proxied
CNAME to `roammate-cs7.pages.dev`. This is separately supplied production-state
evidence, not an independent production check by this reviewer or a claim that
production search was activated.
