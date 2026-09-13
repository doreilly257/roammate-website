# Production Pagefind and claims rollout — 2026-09-13

Status: **Production acceptance failed; rollback control plane confirmed, effective HTTP state mixed.**

## Authorized scope and source

The user approved public-site production publication of the reviewed Pagefind
search and claims changes only. Root owns deployment and issue updates. This
report does not authorize admin hosting, backend/mobile changes, API writes,
store publication, DNS changes or paid resources.

Root confirmed no diff from reviewed preview source `996404c` through the
deployment-source HEAD in `roammate.com`, `deploy.sh` and `infra/csp-nonce`.
Deployment source: `d5fdb5ecdcd5458461271cd31ca42ec65bc8674c`, branch `main`.
Root's `bash deploy.sh` succeeded (session `22624`, chunk `90dffa`, exit 0),
with temporary log `/Users/doreilly/.lean-ctx/tee/bash_deploy_sh_670d1625.log`.
Fresh deployment gates reported by root: 23 nonce/deployment tests, 348 public
tests across 34 files, Astro check with 0 errors/0 warnings/83 hints, build with
3,505 pages and 587 indexed pages, and 662 clean claims checks.
Root's Cloudflare API read confirmed canonical production deployment
`2eb40bea-d1e7-4ea5-b01f-15a78a165ba4`, alias
`https://2eb40bea.roammate-cs7.pages.dev`, created
`2026-09-13T11:42:54.28964Z`, deployment stage completed `11:42:55.799935Z`.
These deployment/control-plane results are root-supplied; the independent HTTP
checks below target the effective production hostname, not merely its alias.

## Independent preflight GET evidence

Before deployment, independent `curl` GETs checked rollback deployment
`https://d1d8272a.roammate-cs7.pages.dev` and current `https://roammate.com`:

| Path | Rollback status | Current production status | Canonical |
| --- | --- | --- | --- |
| `/` | 200 | 200 | `https://roammate.com/` |
| `/about/` | 200 | 200 | `https://roammate.com/about/` |
| `/faq/` | 200 | 200 | `https://roammate.com/faq/` |
| `/guides/bangkok/` | 200 | 200 | `https://roammate.com/guides/bangkok/` |
| `/search/` | 404 | 404 | `https://roammate.com/404/` |

All ten responses had `Cache-Control: no-store` and a nonce-bearing script CSP.
The rollback home contained external scripts and inert JSON-LD, with no executable
inline script requiring a nonce attribute. The current custom-domain home also
contained one nonced inline script. A zero nonce-attribute count on rollback is
not by itself a CSP failure. The rollback is deliberately pre-search: its search
404 is expected, not a failed new-search acceptance check.

Root's pre-deploy API read also confirmed the rollback's full deployment ID
`d1d8272a-bf47-4340-bb41-166cc6740d99`, production environment, successful latest
stage, source `a95b835c9dc54fbdba415f9f964fda29b2aa1717`, created
`2026-09-12T19:14:49.017717Z`. No rollback endpoint was invoked during preflight.

## Independent effective-production HTTP evidence — partial, not acceptance

At approximately 11:44–11:46 UTC, read-only `curl` GETs against
`https://roammate.com` independently established:

- `/pagefind/integrity.json` was byte-identical to the deployed local build.
  All **128 manifest assets** matched both declared SHA-256 digests and local
  bytes, fetched with at most six concurrent requests.
- `pagefind.js`, `pagefind-entry.json`, `wasm.en.pagefind` and
  `wasm.unknown.pagefind` each matched the local build byte-for-byte.
- Home, about, FAQ, Bangkok guide and search returned 200 with their exact
  production canonicals and `Cache-Control: no-store`. Their CSP nonce matched
  the observed inline script nonce. Repeated home/search GETs had distinct
  per-response nonces.
- Search contained `noindex`; sitemap and RSS returned 200 and did not include
  the search URL. Both feeds retained `public, max-age=0, must-revalidate`.
- Integrity manifest, entry metadata and both WASM responses retained
  `public, max-age=0, must-revalidate`. The observed runtime `pagefind.js` policy
  was `public, max-age=2678400, must-revalidate`; this report does not conflate it
  with the metadata policy.
- Synthetic missing `/pagefind/does-not-exist.pf_index` returned 404 with
  `no-store`, not a cached successful Pagefind response.
- Home and the GAFFL comparison contained **Optional identity verification**;
  home, about and `/llms.txt` contained **Discuss your plans to assess
  compatibility.** The best-companion-apps comparison contained the qualification
  that compatibility is not guaranteed. These are representative copy checks,
  not certification of every underlying app capability.

## Cache-policy incident and rollback disposition

The effective production runtime cache lifetime above is an acceptance failure,
not an approved policy exception. Root independently confirmed that the new
deployment alias served `pagefind.js` with `max-age=0`, while the custom domain
served it with `max-age=2678400`. Byte equality proves this response contained
the correct current runtime; it does not make prolonged reuse safe across later
index/runtime changes. The 128-asset hash results remain valid partial evidence,
not successful rollout acceptance.

Root performed whole-deployment rollback to the rechecked `d1d8272a` target.
The first MCP rollback request failed authentication with code 10000; this did
not establish a successful rollback. Root then reported a successful rollback
using the existing Wrangler OAuth credential without printing/storing its value;
a separate MCP GET confirmed canonical production had returned to
`d1d8272a-bf47-4340-bb41-166cc6740d99`.

Independent post-rollback home/about/FAQ/Bangkok GETs returned 200 with correct
canonicals, nonce CSP and no-store. The first search check still returned 200
while runtime JS returned 404: rollback was not instantaneous across sampled
paths. At **11:50:01 UTC**, a follow-up `/search/` GET returned the expected 404
with no-store and nonce CSP; a query-control GET also returned 404. The integrity
manifest still returned 200 with an Age header and `public, s-maxage=604800`.
Root subsequently again observed `/search/` 200 with new HTML and runtime JS 200
with `max-age=2678400`. Consequently these checks establish **mixed responses
across requests/edges**, not uniform effective restoration. A single 404 sample
does not establish global removal, and residual responses do not mean the
control-plane rollback failed. No claim that every cache or previously loaded
browser was cleared is made.
Root's later **11:53 UTC** sample returned search 404 with no query input; it
does not erase the earlier mixed-state observations or prove uniform restoration.

Root's read-only cause investigation found zone `browser_cache_ttl=2678400`
(modified 2026-02-22), no Page Rules, and an existing cache rule limited to images,
fonts and `/_astro`, not Pagefind. Root requested a narrowly scoped `/pagefind/*`
respect-origin browser-TTL rule, affected JS URL purge and redeployment; that
request is not execution approval. Root also requested separately bounded rollback
cleanup purges of `/search` and `/search/`; no such purge is asserted completed.
No cache setting, rule or purge was changed
as part of this recorded attempt. No activation addendum has been made to the
nonce README. The failed rollout ID remains `2eb40bea-d1e7-4ea5-b01f-15a78a165ba4`;
the control-plane production target is pre-search `d1d8272a`, while effective
HTTP restoration remains unverified because responses were mixed.
Related issues `pv7` and `xsf` remain blocked. Approval for the narrow cache rule,
affected JS purge and redeployment, and separately the two HTML cleanup purges,
was still pending at this report's final update.

## Supervisor-supplied production browser evidence

Root opened production search and observed HTTP 200 after correcting a local
browser-instrumentation `URL`-global error. External traffic was blocked before
queries; **no query was entered** before the cache incident aborted the attempt
and the browser was closed. There is no production search interaction acceptance
from this attempt. Earlier preview browser tests are not represented as
production acceptance. HTTP nonce checks alone do
not establish all JavaScript challenge behavior, clean console output or
unrestricted telemetry privacy. Historical reports remain unchanged.
Root retained browser artifacts at
`/tmp/roammate-production-search-2eb40bea/cli-artifacts`; this temporary location
does not constitute durable browser acceptance evidence.
