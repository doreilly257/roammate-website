# Static-cache measurement: first eligible 24-hour window

Bead: `roammate-website-dmp`. Read-only collection on September 13, 2026, starting at 14:16 UTC. No configuration, deployment, purge, paid upgrade, or rollback was performed by this measurement.

## Window and scope

- Rule enabled September 12 at 13:51:15 UTC; the measured window is **September 12 14:00–September 13 14:00 UTC**, excluding the first 8 minutes 45 seconds of cold warm-up.
- Baseline was re-queried for **September 11 12:00–September 12 12:00 UTC** using the same filters rather than treating the historical whole-public-site 77.9% ratio as an identical population.
- GraphQL `httpRequestsAdaptiveGroups`: exact host `roammate.com`, `requestSource: "eyeball"`; path patterns for `/images/` with webp/png/jpg/jpeg/avif/svg/gif, `/fonts/` with woff/woff2, and `/_astro/` with js/css. HTML, admin, API, and Pagefind are outside the selected path families.
- This is a path-scoped proxy, **not an exact count of rule matches**: the analytics query cannot reproduce the rule's Authorization-header exclusion. The GraphQL LIKE patterns are recorded verbatim in the accompanying JSON, including the Astro pattern. No request headers, IP addresses, user identifiers, or query values were exported.
- Only HIT and MISS enter the reported denominators. Other statuses are preserved separately in the JSON, not silently interpreted as hits or misses.
- Response byte totals use `sum.edgeResponseBytes`; counts are returned `count` values. Average sample intervals range above 1 for multiple groups, so these are adaptive analytics estimates, not an unsampled event census. Do not multiply the already returned aggregate counts by the sample interval. See [Cloudflare's metric mapping](https://developers.cloudflare.com/analytics/graphql-api/migration-guides/graphql-api-analytics/) and [sampling documentation](https://developers.cloudflare.com/analytics/graphql-api/sampling/).

## Results

Request rate is HIT requests / (HIT + MISS requests); byte rate uses the same formula with response bytes.

| Population | Baseline HIT / MISS requests | After HIT / MISS requests | Request hit rate, before → after | Byte hit rate, before → after |
| --- | ---: | ---: | ---: | ---: |
| All selected static families | 4,002 / 1,083 | 3,465 / 2,507 | 78.70% → 58.02% | 50.21% → 31.03% |
| Images | 1,583 / 683 | 1,564 / 1,754 | 69.86% → 47.14% | 32.22% → 23.66% |
| Fonts | 493 / 65 | 391 / 165 | 88.35% → 70.32% | 87.86% → 70.43% |
| Astro JS/CSS | 1,926 / 335 | 1,510 / 588 | 85.18% → 71.97% | 84.52% → 71.73% |
| WebP images only, subset of images | 556 / 673 | 571 / 1,693 | 45.24% → 25.22% | 22.28% → 19.84% |

The selected static after-window returned 80,920,918 HIT bytes and 179,852,429 MISS bytes. Baseline returned 63,488,399 HIT bytes and 62,958,454 MISS bytes. WebP MISS bytes rose from 57,645,531 to 167,225,086 in these differently timed samples.

The after-window additionally includes 643 BYPASS requests, 622 NONE requests, and one REVALIDATED request across these selected families; these are excluded from the ratios above, not omitted from the evidence.

## Segmentation and limitations

- Query-string segmentation was attempted and explicitly denied: `zone ... does not have access to the field 'clientrequestquery'`. No upgrade was requested. Query-variant efficacy remains unavailable from this plan's analytics.
- A supplemental path-only query checked the Astro LIKE pattern against literal `/_astro/` prefixes: all 54 baseline and 51 after-window paths matched the literal prefix, with zero out-of-prefix paths; each result was below its 1,000-group limit. An initial combined 50-hour query was rejected because this zone allows at most one day per query; the two separate 24-hour queries succeeded. Future 48-hour analysis must combine separate windows, not request an unsupported two-day interval.
- Colo segmentation succeeded: 250 status/colo groups, below the query limit of 1,000. Examples of after-window HIT/MISS counts: AMS 1,329/373; SIN 443/174; IAD 163/307; LAX 371/70; ATL 3/395; PDX 2/156. Strong geographic heterogeneity remains; these totals are independently sampled and must not be forced to equal another query's aggregates.
- The window includes public-site deployment, rollback, and verification traffic. `eyeball` excludes Worker subrequests, but does **not** exclude bots or synthetic HTTP verification. Traffic mix, newly requested images, deployment churn, and colo distribution are plausible confounders, not established causes.
- The first 24 hours after the short excluded interval are not proof that every asset in every colo is fully warm. The preferred September 14 window remains valuable.
- Initial exploratory path-group output was too large for the tool's response limit and was not used to calculate these ratios. The final calculations use compact status-only queries, each comfortably below its group limit of 100. Two query-construction syntax errors were corrected before successful final queries; they made no state changes.

## Configuration and disposition

Read-only ruleset verification still shows ruleset `449fcb98dc44432593fc537ac6737e8b`, version **1**, with only enabled rule `735fae045d894e14b778745aaf23e8d4`, version **1**, last updated September 12 at 13:51:15.482743 UTC. Its query-string exclusion and cache-deception armor remain unchanged, with no TTL override. This measurement did not attempt the separate approved Pagefind cache fix.

**No cache-lift claim is supported. The first eligible comparison is lower, but does not isolate a causal rule regression.** Do not roll back or broaden caching based solely on these confounded ratios. Keep `dmp` deferred for the already scheduled September 14 14:00 UTC follow-up, collect a second 24-hour window September 13 14:00–September 14 14:00, and compare hourly/colo and unchanged asset cohorts where available. That is the remaining validation work, not a request for new paid resources.

Raw aggregate evidence and the primary query: `2026-09-13-static-cache-measurement.json` in this directory. No secrets or personal request records are included.
