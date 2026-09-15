# Public search headers — bounded observation

Date: 2026-09-15. Supervisor performed normal GETs from one client; the report author made no additional requests. The [exact receipt](2026-09-15-public-search-headers.json) records these observations. No query-string cache busting, JavaScript execution, purge, deployment or control-plane authorization probe occurred.

| Requested path on roammate.com | Status | Cache observations | Cloudflare edge suffix |
| --- | ---: | --- | --- |
| `/` | 200 | `no-store`, `DYNAMIC` | AMS |
| `/search` | 404 | `no-store`, `DYNAMIC` | CDG |
| `/search/` | 200 | `no-store`, `DYNAMIC`; `Age: 191090` | HKG |
| `/pagefind/pagefind.js` (previous stable asset path) | 404 | `no-store`, `BYPASS` | AMS |

No redirect normalization between the two search paths was observed. Different edge suffixes are response metadata from a single client, **not a controlled regional test**. An Age header alongside no-store does not by itself identify the cache layer responsible or establish the current origin state.

HTML inspection was bounded to 300,000 bytes per page and found no matching Pagefind references. Consequently, this pass did not discover and verify a referenced asset set: it must not be described as checking all referenced assets. The separate request to the previously stable Pagefind JavaScript URL returned 404; that alone does not enumerate current assets or demonstrate JavaScript behavior.

## Disposition

Search functionality, cache-fix application and production acceptance are **not established**. Beads **pv7** and **xsf** remain blocked. The historical write-authorization blocker was not freshly tested; public GET success or failure is not evidence of current cache-rule/purge permissions.

These observations neither diagnose the cache layer nor authorize a purge, rule change or redeployment. The [Android reconciliation sidecar](2026-09-15-android-reconciliation-sidecar.md) is a separate retained-evidence task, not part of this public request verification.
