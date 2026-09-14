# Offline nonce benchmark — September 14, 2026

**Valid local run completed; not production latency acceptance.** Bead `roammate-website-e0ia` covers this approved local experiment. The missing matched production baseline in `9lk` remains unresolved.

This report uses the adjacent [validated JSON](2026-09-14-nonce-offline-benchmark.json) and root's execution receipts. The report author inspected the JSON and recomputed fixture medians/negative counts, but did not execute the benchmark, access the network or change production. Method and scope are defined by the [reviewed design](../specs/2026-09-14-nonce-offline-benchmark-design.md) and [implementation plan](../plans/2026-09-14-nonce-offline-benchmark.md).

## Successful execution and provenance

- Root job `47daa611c3d4ccfd` exited zero after isolation, functional/unit checks and validated publication. Root independently verified all 25,000 pairs, statistics, order and signed deltas.
- Recorded interval: **18:34:29.317–18:34:37.104 UTC**; monotonic duration **7.781548667 seconds**, within the 120-second cap. UTC timestamps and monotonic duration are separate clock observations.
- Runtime: Node `v26.8.2`, Apple M2, 8 CPUs, Darwin `25.6.0`, arm64.
- Production middleware SHA-256: `44a5f803deb9664505f0a5cc8a2c5a525cd37c6fb232d3df7cb8c6a55cfff357`.
- Source revision: `7066662e1fdbd4e9e61c464bcc96532b0cd22a4c`; source `dirty: false` and before/after preservation checks passed. This describes the inspected production source, **not a claim that the newly authored harness was already committed at that revision**.
- Runtime SHA-256: `902b6a6984d5d825829ea9064ab73b734548df37bc0683990dca31c8dc2a9253`.
- JSON validity flags: correctness, isolation before/after, unchanged source and completeness all true. Existing test-child raw stdout/stderr were discarded; only safe stage/failure codes and validated structured results were retained.

## Experiment and results

A is an in-memory synthetic origin response; B invokes the actual middleware with that origin. Each arm receives fresh inputs/Response bodies. Real CSPRNG nonce generation remains enabled. Timing ends when the awaited local Response becomes available; Request setup, body draining and assertions occur outside the timed interval.

Each fixture has **200 warm-up pairs**, excluded, followed by **five blocks of 1,000 measured pairs**. Total: 1,000 warm-up pairs and 25,000 measured pairs. Pair order alternates even AB / odd BA; signed delta is **B − A**. No samples were reduced, outliers trimmed or negative deltas discarded.

| Synthetic fixture | Measured pairs | Median paired delta, ns | Median paired delta, μs | Negative deltas retained |
| --- | ---: | ---: | ---: | ---: |
| HTML GET 200 | 5,000 | 42,875 | 42.875 | 207 |
| HTML GET 404 | 5,000 | 35,624 | 35.624 | 166 |
| HTML HEAD | 5,000 | 33,000 | 33.000 | 72 |
| Search HTML | 5,000 | 34,583 | 34.583 | 167 |
| Static image bypass | 5,000 | 1,000 | 1.000 | 546 |

Table medians use nearest-rank selection over all 5,000 signed deltas per fixture, not an average of block medians or a subtraction of A/B percentiles. The JSON retains each pair and each block's A/B/delta min, median, p95, p99 and max. HTML bodies were 61 synthetic bytes, HEAD zero bytes and bypass 21 synthetic bytes; no production body or raw nonce appears in the report.

Negative deltas and large outliers remain observations of paired execution under runtime/scheduler noise, not proof the middleware accelerates origin handling. No arbitrary performance threshold or “fast enough” pass claim is applied.

## Earlier invalid attempt — unresolved cause

The first full execution reported generic **`BENCHMARK_INVALID`** and published no result artifact. Its exact cause was not recovered. Minimal 4 MiB pipe, environment/schema and synthetic-publication tests subsequently passed. Fixed diagnostic codes were added and reviewed, then **one root-controlled diagnostic full run** produced the valid result above.

This was not an automatic retry and did not reduce sample counts. A later valid instrumented run does **not** prove the original failure was identified or fixed. The first attempt remains invalid and is not mixed into the reported timing population.

## Interpretation and disposition

The evidence establishes local Node response-construction overhead for these small synthetic fixtures under the verified isolation boundary. Host scheduling, garbage collection and other local activity remain possible influences; this was not a controlled production performance experiment.

It does not measure Cloudflare runtime CPU, JSD, edge/cache behavior, network or end-user latency, aggregate billing or nonce-attributable cost. No production settings changed and no zero-cost or matched historical latency claim is made. The [retained-baseline search](2026-09-14-nonce-baseline-search.md) and [48-hour observation](2026-09-14-nonce-48h.md) retain their separate limits.

Root may close **e0ia** on the reviewed complete local-run evidence. **9lk remains blocked** on its unmatched production-latency comparison; this result neither substitutes for that requirement nor authorizes a live experiment or release.
