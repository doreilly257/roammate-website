# Static-cache measurement: second eligible 24-hour window

Bead: `roammate-website-dmp`. Root's read-only collection completed **September 14, 2026 at 16:08:34 UTC**; individual query start times were not separately recorded. This report uses the accompanying aggregate JSON and the [recorded first-day report](2026-09-13-static-cache-measurement.md). The report author made no network calls. No configuration, deployment, purge, paid upgrade or rollback was performed by this measurement.

## Window, method and denominator

- Second window: **September 13 14:00–September 14 14:00 UTC**, start inclusive and end exclusive. Together with the first window, this supplies the requested 24–48-hour follow-up after the rule enabled September 12 at 13:51:15 UTC; the original first 8 minutes 45 seconds remain outside these windows.
- Root queried `httpRequestsAdaptiveGroups` through the [Cloudflare GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/). Exact queries and returned aggregates are retained in [the accompanying JSON](2026-09-14-static-cache-measurement.json).
- Exact host `roammate.com`, `requestSource: "eyeball"`; selected path families: `/images/` webp/png/jpg/jpeg/avif/svg/gif, `/fonts/` woff/woff2, and `/_astro/` js/css. HTML, admin, API and Pagefind are outside this selected population.
- This is a path-scoped proxy, not an exact rule-match population: the Authorization-header exclusion is not reproduced. Query-string variant segmentation was unavailable in the prior authorized attempt and was **not retried**; its measurement gap remains.
- Request hit rate = HIT / (HIT + MISS). Byte hit rate uses the same formula with `sum.edgeResponseBytes`. BYPASS, NONE and REVALIDATED are retained separately, excluded from these denominators.
- Main rates below use the main family status aggregates only. Returned counts/bytes are adaptive analytics estimates; sample intervals above one are recorded. Do not multiply returned totals by those intervals. Independently sampled cohort, hourly, colo and WebP queries need not reconcile exactly with the main-family aggregates.

## Second-window results

| Population | HIT requests | MISS requests | Request hit rate | HIT response bytes | MISS response bytes | Byte hit rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| All three selected families | 4,692 | 1,524 | **75.48%** | 178,337,642 | 99,178,698 | **64.26%** |
| Images | 1,975 | 1,026 | 65.81% | 140,294,687 | 90,253,167 | 60.85% |
| Fonts | 521 | 126 | 80.53% | 32,285,521 | 7,902,857 | 80.34% |
| Astro JS/CSS | 2,196 | 372 | 85.51% | 5,757,434 | 1,022,674 | 84.92% |
| WebP images, independently queried subset | 1,402 | 987 | 58.69% | 134,171,259 | 89,861,875 | 59.89% |

The main family query additionally returned **7 BYPASS / 37,467 bytes**, **3 NONE / 5,754 bytes**, and **2 REVALIDATED / 20,258 bytes**, all in images. They are not counted as hits or misses. The WebP row is a subset and must not be added to the all-family total.

## Comparison with recorded earlier windows

These earlier figures are taken from the September 13 report and JSON, **not a freshly queried baseline in this run**.

| Population | Recorded baseline request / byte hit rate | Recorded first-day request / byte hit rate | Second-day request / byte hit rate |
| --- | ---: | ---: | ---: |
| All selected families | 78.70% / 50.21% | 58.02% / 31.03% | 75.48% / 64.26% |
| Images | 69.86% / 32.22% | 47.14% / 23.66% | 65.81% / 60.85% |
| Fonts | 88.35% / 87.86% | 70.32% / 70.43% | 80.53% / 80.34% |
| Astro JS/CSS | 85.18% / 84.52% | 71.97% / 71.73% | 85.51% / 84.92% |
| WebP subset | 45.24% / 22.28% | 25.22% / 19.84% | 58.69% / 59.89% |

Recorded baseline window: September 11 12:00–September 12 12:00 UTC. First day: September 12 14:00–September 13 14:00 UTC. The second-day aggregate request ratio is higher than the first day's but remains below the recorded baseline; the byte ratio is above both. These observations do **not** identify a causal rule effect.

## Shared Astro path cohort

Separate path/status queries returned 88 first-day rows and 65 second-day rows, each below the 1,000 limit. They observed 51 and 40 paths respectively, with **35 shared paths** and zero paths outside literal `/_astro/`. The JSON retains the shared path list and aggregate cohort totals.

| Shared-path cohort | HIT / MISS requests | Request hit rate | HIT / MISS bytes | Byte hit rate |
| --- | ---: | ---: | ---: | ---: |
| First day | 1,485 / 515 | 74.25% | 4,286,748 / 1,513,031 | 73.91% |
| Second day | 2,191 / 365 | 85.72% | 5,745,924 / 1,006,268 | 85.10% |

First-day cohort also includes 10 NONE / 2,975 bytes and one BYPASS / 940 bytes, excluded from the ratios. Shared paths narrow asset-name churn but **do not prove immutable byte identity** or equal clients, colos, query variants or cache age. This is not an unchanged-byte experiment or causal efficacy test.

## Hour and colo segmentation

The first full segment response was truncated and discarded. A compact server-side summary query was rerun successfully; the retained result reports **54 hour/status rows and 127 colo/status rows**, both below the 1,000 query limit, with all **24 hourly buckets** and the retained **top ten colo summaries** in JSON. The top ten are not the entire colo distribution.

| Retained colo | HIT / MISS requests | Request hit rate |
| --- | ---: | ---: |
| AMS | 1,668 / 405 | 80.46% |
| SIN | 661 / 71 | 90.30% |
| IAD | 427 / 89 | 82.75% |
| LAX | 278 / 50 | 84.76% |
| SJC | 277 / 8 | 97.19% |
| HKG | 193 / 35 | 84.65% |
| LHR | 148 / 14 | 91.36% |
| YYZ | 108 / 45 | 70.59% |
| DFW | 91 / 19 | 82.73% |
| MXP | 81 / 20 | 80.20% |

Hourly and colo data provide distribution context, not alternative inputs for the main rates. `eyeball` does not remove bots or synthetic verification traffic. Public-site rollout/rollback, probes, request mix, asset churn and geography remain confounders; none is established as the cause of the observed movement.

## Configuration and disposition

Root's read-only ruleset GET still reports ruleset `449fcb98dc44432593fc537ac6737e8b`, version **1**, with enabled rule `735fae045d894e14b778745aaf23e8d4`, version **1**, last updated `2026-09-12T13:51:15.482743Z`. Query-string exclusion and cache-deception armor remain unchanged, with **no TTL override**.

**The requested follow-up measurement is delivered. No causal regression is demonstrated by these confounded estimates; retain the rule rather than roll back or broaden it on this evidence.** This is not proof of cache lift, query-variant efficacy, universal warm caches or exact rule-match performance. Closing the measurement Bead is a root acceptance decision, not an automatic claim made by this report.

The separate Pagefind cache authorization/fix remains outside scope and is not resolved by these static-family measurements. No personal request records, secret values, header values or query-string values are included.
