# Pagefind production recovery — 2026-09-15

## Status and scope

**Cache correction, targeted purge, production deployment and bounded HTTP/asset verification passed; full browser search acceptance remains blocked.** This is a newer evidence receipt, not a rewrite of earlier failed attempts or rollback reports. Beads remains authoritative.

The following execution evidence was supplied by root. This report writer inspected and copied sanitized cache and verification receipts; it did not run live probes or deployments. Scope remains the reviewed public site and exact approved Pagefind cache correction/eight-URL purge. No admin, app, store, DNS or whole-zone purge changes are authorized or reported here.

## Verified cache operations

Root's actual API request and readback established:

- Added rule `77e1bb80f450494198266c6583081e38`, ref `pagefind_respect_origin`, with HTTP 200/success.
- Exact expression: `(http.host eq "roammate.com" and starts_with(http.request.uri.path, "/pagefind/"))`.
- Only new action parameter: `browser_ttl.mode = respect_origin`.
- Ruleset `449fcb98dc44432593fc537ac6737e8b` advanced from version 1 to 2. Existing rule `735fae045d894e14b778745aaf23e8d4` was preserved exactly.
- Initial eight-URL purge returned HTTP 401/error 10000. After the user confirmed a permission edit to the same credential, the retry returned HTTP 200/success at **2026-09-15T19:48:01Z**. No credential values or history contents are retained here.

The exact purge set was:

```text
https://roammate.com/search
https://roammate.com/search/
https://roammate.com/pagefind/pagefind.js
https://roammate.com/pagefind/pagefind-modular-ui.js
https://roammate.com/pagefind/pagefind-highlight.js
https://roammate.com/pagefind/pagefind-worker.js
https://roammate.com/pagefind/pagefind-ui.js
https://roammate.com/pagefind/pagefind-component-ui.js
```

Companion evidence: `2026-09-15-pagefind-production-recovery.json`, copied from sanitized `/tmp/roammate-cache-repair-receipt.json`. Its `purged_urls` names the requested allowlist; `purge_retry` records the successful retry separately from the initial failed operation.

## Pre-deployment evidence

- Source HEAD: `2d27a9d`. Root's parity comparison against reviewed `d5fdb5e` found only three offline benchmark files under `infra/csp-nonce`; no site, deploy-script or middleware changes.
- Canonical rollback deployment rechecked via MCP: `d1d8272a-bf47-4340-bb41-166cc6740d99`, production source `a95b835c`.
- Root's fresh rollback HTTP checks of `/`, `/about/`, `/faq/` and `/guides/bangkok/` returned 200 with `no-store`, nonce and canonical checks passing.
- Deployment shell `shell_dac46f7eb7ef0f93` subsequently completed with **exit 0**. Gates: **26 nonce tests**, **348 public tests**, Astro **149 files / zero errors / zero warnings / 83 hints**, build **587 authorized**, and claims **662** as reported by root.

## Completed production deployment and bounded live verification

- Canonical MCP production deployment: **`435c1c38-c4f2-4ddb-9a41-dd1984dbac8d`**, source **`2d27a9d6ad98fe7f7ae578b484d146329cb20d3f`**, ended **2026-09-15T19:50:54Z**.
- Root verified **132 assets**: 128 manifest-listed assets plus runtime, entry, WASM and integrity manifest. All checks passed for expected byte count, digest, effective revalidation and nonce absence. This is bounded HTTP evidence, not successful browser query execution.
- `/search` redirects **308** to `/search/`; search HTML returns **200**, `no-store`, fresh distinct nonces and the required WASM CSP allowance. Home/about return **200** with ordinary CSP, without that allowance.
- Legacy `/search-manifest.json` returns **404**; this is distinct from the verified Pagefind integrity manifest. Sitemap excludes search; robots references sitemap/RSS; llms and RSS return 200; deployment alias is noindex.
- Production search has no `X-Robots-Tag` header, but root's Obscura DOM check found **`<meta name="robots" content="noindex,follow">`**. Header absence alone is therefore not a noindex failure.

Copied root-generated receipts:

- `2026-09-15-pagefind-production-asset-verification.json` — 132 asset checks, source `/tmp/roammate-production-asset-verification.json`.
- `2026-09-15-pagefind-production-http-verification.json` — routes, headers, nonces and SEO checks, source `/tmp/roammate-production-http-verification.json`.

## Browser acceptance limitation and disposition

Root's Obscura UI query for **Bangkok** displayed unavailable/zero results with retry, so healthy queries, facets and error/retry recovery are **not proved**. The exact native API probe `'integrity' in Request.prototype` returned `false`, although the 128-entry manifest fetch and a minimal WASM export returning 42 passed. Reviewed `search-client.ts:72` deliberately fails closed when native request integrity is unsupported. This tool error is not proof of widespread browser failure.

No Chrome was used, no SRI protection was weakened, and no automatic rollback was triggered solely by this tool-capability limitation. The verified deployment is retained while real-browser acceptance remains unresolved. Root offered a manual Safari/Firefox checklist or retaining the verified deployment with acceptance blocked; this report does not imply either checklist was completed.

Root **closed pv7** on verified rule/purge/revalidation evidence. **xsf remains blocked** on browser acceptance; there is no claim that all production search acceptance or all Beads are complete. Admin, apps and stores remain unchanged by this recovery.
