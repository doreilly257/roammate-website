# Retained nonce latency baseline search — September 14, 2026

**Result: no qualifying matched pre-rollout public HTML timing receipt found within the bounds below.** This is a bounded absence finding, not proof that no receipt exists anywhere. No network requests, secret reads, browser-profile access, builds, production changes or Bead updates were performed by the report author.

## Required evidence

The missing comparison needs measurements before **September 12, 2026 at 16:24:40 UTC** for public production HTML, with enough route, client/timing methodology, cache/edge conditions and deployment metadata to compare meaningfully against later measurements. A response timestamp is not elapsed request time; preview CPU or post-rollout HTTP timings cannot substitute for this baseline.

## Exact search boundary

- Enumerated tracked filenames under website `docs/` and `infra/` matching `nonce|csp|perf|lighthouse|header|latency`, then searched tracked content under those roots for `latency|time_starttransfer|time.to.headers|lighthouse|TTFB`. Used `git grep`/`git ls-files`, not the earlier capped 35-result context search as an exhaustive inventory.
- Inspected the retained nonce staging, production, operations, first-24-hour and 48-hour reports/receipts and the preview-integrity report identified by those searches. Unrelated admin/feature-flag design hits were not treated as public latency evidence.
- Inspected recent Git history and the latest pre-rollout candidate snapshot `8925d4b` (September 12 at 16:23:19 UTC). Enumerated matching tracked filenames and searched timing terms under its `docs/` and `infra/`. This was one selected historical snapshot, not every historical object or branch.
- Enumerated immediate `/tmp` entries with `nonce|csp|perf|lighthouse|header` in the name using `find -H /tmp -maxdepth 1` (following `/tmp` itself). An initial `find` without `-H` did not traverse that symlink and its empty output was not used as evidence of absence.
- Selected only nonce aggregate/header JSON metadata and five named `roammate-*.headers` files for content inspection. Header output was restricted to status, Date, Cache-Control and CF-Cache-Status; no raw nonce, cookie or response body was printed. Did not recursively search unrelated temporary content, general logs, browser profiles, home directories, secret locations, external CI or remote storage.

## Candidates and outcome

| Candidate | Retained evidence | Why it is not the missing baseline |
| --- | --- | --- |
| `infra/csp-nonce/staging-2026-09-12.md` | Pre-rollout production home 200/DYNAMIC/no nonce; separate staging/browser compatibility checks | No production elapsed HTML timing series or matched client/edge timing metadata |
| `infra/csp-nonce/operations-2026-09-12.md` | Pre-rollout account usage and preview CPU quantiles | Invocation/CPU metrics, not public HTML latency |
| Pre-rollout Git snapshot `8925d4b`, `docs/` and `infra/` | Timing-term search returned the nonce README's prospective warning that no-store may affect repeat-view latency | Warning, not a measured receipt |
| `infra/csp-nonce/production-2026-09-12.md` | Production rollout and functional HTTP/browser/tail evidence | Post-activation checks; report expressly excludes a performance study |
| `docs/superpowers/verification/2026-09-13-preview-integrity-rollout.md` | Preview integrity and functionality evidence | Later preview, not pre-rollout production latency |
| First-24-hour and 48-hour nonce reports/evidence JSON | Post-rollout local-client time-to-headers and invocation/CPU observations | Both explicitly lack a matched pre-rollout HTML timing baseline |
| `/tmp/roammate-nonce-24h-aggregate.json` | `capturedAt` September 13 16:26–16:28 UTC; aggregate baseline/after/Workers fields | Aggregate invocations, not pre-rollout public HTML timing |
| `/tmp/roammate-nonce-http-observation.json` | `checkedAt` September 13 16:17:54.320437 UTC; small synthetic header timings | Post-rollout; explicitly not a pre/post comparison |
| `/tmp/nonce-followup-headers.json` | `checkedAt` September 14 17:15:10.250234 UTC; synthetic local time to headers | Post-rollout; no representative matched baseline |
| `/tmp/roammate-prod-pre-retire.headers`, `/tmp/roammate-retained-pre-retire.headers` | Response Date September 13 09:30:53 GMT; status/cache headers | “Pre-retire” means before later retirement, not before nonce rollout; no elapsed timing receipt |
| `/tmp/roammate-rollback-home.headers`, `/tmp/roammate-rollback-search.headers`, `/tmp/roammate-rollback-search-final.headers` | Response Dates September 13 11:49:08 / 11:50:30 GMT | Later rollback response headers, not matched pre-rollout timings |

Filename discovery also found `/tmp/nonce-followup-headers.py` and `/tmp/roammate-integrity-nonce-gates.log`; these were not opened or executed because a collector script/build-gate log is not an identified retained pre-rollout timing receipt. The production report references `/tmp/roammate-nonce-live-browser-2026-09-12/`; no nonce/CSP/performance/Lighthouse-named immediate directory was present in the current `/tmp` inventory. That does not establish whether an archive exists elsewhere.

## Disposition

Keep the original matched-latency acceptance gap explicit. Repeating routine unmatched live probes cannot recover a missing historical control. The user's approved next step is **offline alternative design only**, which may measure local middleware overhead but must not be relabeled as historical Cloudflare or end-user latency acceptance. No live baseline recreation, rollback, deployment or additional telemetry is authorized by this search.

The [48-hour observation](2026-09-14-nonce-48h.md) remains useful bounded operations evidence. This search neither closes `9lk` nor changes its original acceptance requirements; root owns the disposition and any separate proposal to revise those requirements.
