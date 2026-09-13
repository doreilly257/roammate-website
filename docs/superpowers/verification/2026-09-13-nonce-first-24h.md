# Public nonce: preliminary first-24-hour observation

Date: 2026-09-13. Bead `9lk`; this is an eligible first-window observation,
**not full cost/latency acceptance or a claim that the follow-up is complete**.
No settings, deployment, alert, subscription or billing configuration was changed.

## Window and evidence

The [original production rollout](../../../infra/csp-nonce/production-2026-09-12.md)
was created **2026-09-12 16:24:40 UTC**. Root queried the following exact half-open
windows with `datetime_geq` / `datetime_lt`:

- Before: September 11 16:24:40 → September 12 16:24:40 UTC.
- After: September 12 16:24:40 → September 13 16:24:40 UTC.

Queries were captured at approximately **16:26–16:28 UTC**, after the full first
24 hours elapsed, but only minutes after the end: analytics ingestion lag can
still affect this preliminary result. An earlier rounded 16:25 boundary included
the first 20 seconds/three production invocations in the supposed baseline and
was discarded. The retained baseline uses the exact rollout second.

The [sanitized evidence receipt](2026-09-13-nonce-first-24h-evidence.json) preserves
root's GraphQL queries/responses and 15 HTTP samples. This report author inspected
those receipts and independently checked totals; the author did not issue the
queries. No personal request records, credentials or raw nonces are included.

## Invocation and CPU observations

| Dataset | Before requests | After requests | Reported invocation errors before / after |
| --- | ---: | ---: | ---: |
| Public production Pages script | No returned row | 8,323 | No row / 0 |
| All Pages Functions | 4,227 | 8,561 | 0 / 0 |
| Workers, separate dataset | 10,263 | 12,916 | 0 / 0 |
| Combined account invocation counts | 14,490 | 21,477 | 0 / 0 |

The public script is `pages-worker--18564688-production`, mapped by the original
tagged production tail. Its after-window CPU **p50 was 2,378 μs (2.378 ms)** and
**p99 was 6,091 μs (6.091 ms)**. These quantiles are neither mean nor maximum CPU;
they cannot be multiplied by invocation count to establish total CPU or a bill.
The reported average sampling interval was approximately **1.20588**; this is an
adaptive analytics result, not a complete unsampled request log.

The baseline Pages rows were public preview 2,704 and two other scripts with 2
and 1,521 requests. Absence of the public production Function row is consistent
with its pre-activation state, but does **not** mean zero public HTTP traffic or
provide a comparable production CPU baseline. Preview CPU is not a substitute.
The combined account counts include unrelated workloads and are not incremental
nonce charges. Zero reported invocation errors does not establish that every
HTTP response was successful; an intentional 404 can be a successful invocation.

## Bounded HTTP/cache check

Root's receipt timestamp is **16:17:54 UTC**, before the after-window ended.
Three samples each of `/`, `/about/`, `/faq/` and `/guides/bangkok/` returned 200;
three samples of `/nonce-observation-20260913` returned the expected 404.
All **15** responses had `no-store`, `CF-Cache-Status: DYNAMIC`, a CSP nonce and
no ETag. This is functional/cache-guard evidence only, not a complete 24-hour
route-error survey or proof of static asset routing/cache ratios.

Observed local-client time-to-headers ranged **476.03–2,100.10 ms**. There is no
matched pre-rollout HTML timing baseline, controlled network/edge population or
representative sampling here, so no pre/post latency increase, improvement or
nonce-attributable delay is established. CPU quantiles are not end-user latency.

## Confounds and remaining follow-up

The interval includes subsequent public releases, operator/test traffic and the
September 13 Pagefind deployment `2eb40bea` followed by control-plane rollback
to `d1d8272a`. The [incident report](2026-09-13-production-search-rollout.md)
records mixed effective HTTP responses across requests/edges. Script-level
aggregation does not isolate versions or attribute usage to the nonce middleware
alone. Other Pages/Worker workloads also changed during the comparison window.

Workers Paid remains **user-confirmed**, not a verified invoice or remaining
entitlement. Aggregate billed CPU, actual charges and a causal latency comparison
remain unavailable. This observation makes **no zero-cost guarantee**, forecast
or new Free-plan quota claim; the dated
[operations review](../../../infra/csp-nonce/operations-2026-09-12.md) retains its
historical assumptions and limits.

Prefer a **48-hour follow-up at or after September 14 16:24:40 UTC**, requerying
the first window for late ingestion as well as the later observation interval.
Preserve version/rollback context and keep static-cache measurements separate.
No alert or scheduled job was created, and this document does not itself close
`9lk` or substitute for the still-missing billing/latency evidence.
