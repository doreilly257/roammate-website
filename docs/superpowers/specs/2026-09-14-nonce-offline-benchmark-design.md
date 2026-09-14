# Offline nonce middleware benchmark design

**Status:** Independently reviewed under **design-only approval**; awaiting user implementation/execution approval. No benchmark has run, and no production acceptance criterion is replaced.

**Goal:** Measure the actual middleware's incremental **local Node response-construction overhead** against an in-memory origin control, using synthetic data and no network. This is an alternative investigation after the [bounded retained-baseline search](../verification/2026-09-14-nonce-baseline-search.md), not a reconstruction of missing production latency.

## Alternatives and recommendation

Judgment scores weight progress 40%, safety 40%, effort/cost 20%; dimensions are out of ten, not measured probabilities.

| ID | Approach | Progress / safety / effort-cost | Score | Disposition |
| --- | --- | --- | ---: | --- |
| A | Reuse unmatched production header samples as the missing baseline | 1 / 8 / 10 | 5.6 | Reject as evidence: no valid causal comparison |
| B | In-memory Node paired control versus actual middleware | 8 / 10 / 10 | **9.2** | Recommend: bounded local overhead evidence, no new dependency or service |
| C | Synthetic local Workers runtime comparison | 8 / 8 / 5 | 7.4 | Defer: closer runtime, but additional setup and isolation work; still not historical production latency |

Recommend **B only** for this stage. A is not a complementary acceptance shortcut. C is a possible separately designed later stage, not implied implementation scope.

## Scope and artifacts

- Production source: `infra/csp-nonce/functions/_middleware.js`, read/imported without modification. Record full source SHA-256, repository revision and source dirty-state before running. Root's inspected source was at `01a93db`; revalidate rather than infer it remains unchanged.
- Proposed implementation artifact: `infra/csp-nonce/nonce.benchmark.mjs`, using installed Node **26.8.2** and built-in APIs only. If installed runtime differs, stop and update the design/review, not silently install or switch versions.
- Proposed sanitized result: `docs/superpowers/verification/2026-09-14-nonce-offline-benchmark.json`, containing fixture definitions, runtime/source provenance, pair/block timing data and validity checks. No actual nonce, raw response headers, cookies, personal data or production body content.
- No source wiring, deploy command, HTTP listener, browser, live request, SDK, new package, paid resource or automatic CI latency gate.

## Isolation prerequisite — fail closed

Before test/benchmark execution, root must verify an existing process-level deny-all-network boundary covers the Node process and any children. Record the boundary, effective runtime and successful denial-control evidence without contacting production. Use a reviewed non-listening denial check; never launch a local server for this stage. A source review showing no fetch call alone is not isolation proof.

If that proof cannot be established under current approved controls, stop execution and report the prerequisite. Do not weaken sandboxing, change host security settings, install isolation software or reinterpret design approval as authority to do so. The design can be reviewed while execution is blocked.

## Correctness before timing

Within the verified boundary run only the existing functional suite:

```sh
node --test infra/csp-nonce/nonce.test.mjs
```

Require exit zero; do not assume a historical assertion count. Do not run `deploy.test.mjs` or introduce its subprocess/deployment dependencies into this scope.

Discard the existing test child process's stdout and stderr without capturing or persisting them: assertion failures can include a CSP policy and nonce. Retain only its exit status and fixed safe stage labels. The benchmark must use fixed safe failure codes, never assertions or error messages containing raw headers/nonces or actual/expected values. Do not expose uncaught raw exceptions through child output; retain sanitized structured results only after successful validation. This is a new wrapper requirement, not a claim that current test diagnostics are already private; privacy applies before output reaches tools or persisted artifacts.

The benchmark's own fixture preflight must separately verify status, body parity and expected header behavior. Include unexpected-upstream-CSP rejection as a **correctness-only** case; do not blend exception timings with successful response timings.

## Paired experiment

Define A as `await next(request)` and B as `await onRequest({ request, next })`, importing the real reviewed middleware. `next` is a deterministic in-memory synthetic origin, not `fetch`. Each arm receives a fresh `Request` constructed from the same fixture URL/method/header definitions. The origin produces a **fresh Response and fresh body source per call** from the same immutable fixture definition; never share a consumed Response/stream across arms.

Fixtures, all synthetic and fixed before execution:

| Fixture | Request / origin response | Required correctness |
| --- | --- | --- |
| HTML 200 | GET `https://roammate.com/`, fixed small HTML body, 200, `text/html` | B retains body/status and supplies nonce/no-store, removes validators |
| HTML 404 | GET synthetic missing path on the same host, fixed HTML body, 404 | Same transformation despite expected 404 |
| HTML HEAD | HEAD `/`, null body, 200 HTML headers | Null body and expected header transformation |
| Search HTML | GET `/search/`, fixed HTML body, 200 HTML | Scoped WASM CSP permission and nonce; ordinary HTML fixture lacks WASM permission |
| Static bypass | GET `/images/synthetic.webp`, fixed synthetic bytes and image content type | B delegates unchanged status/body/headers; no nonce transformation |

Use explicit fake validator/cache headers where relevant. Keep upstream CSP absent for the timed fixtures to avoid coupling to copied production policy text; test mismatch rejection separately. Retain the real `crypto.getRandomValues` CSPRNG: deterministic fixtures/order do **not** mean deterministic or reused nonces. Check nonce presence/valid encoding without printing it. Header assertions and body draining occur after timing and retain only pass/fail results.

For each fixture use **200 warm-up pairs**, excluded from results, then **five blocks of 1,000 measured pairs**. Alternate AB/BA order deterministically by pair index, continuing across blocks; record the rule and actual order. Use sequential execution, no concurrent fixture runs and no explicit forced GC. Preserve GC/scheduler outliers rather than trimming them after seeing results.

Construct each arm's `Request` before starting its clock. Use monotonic `process.hrtime.bigint()` immediately before invoking the arm and stop immediately after its awaited Response becomes available. This includes each arm's origin Response construction and B's internal request/header/response work; it excludes setup, assertions and body consumption. Drain/check each response outside the timed interval before proceeding, so streams/resources do not accumulate. This measures time-to-local-Response, not transfer completion or remote time to headers.

Enforce a **120-second hard execution cap** around the benchmark process with an independently enforced parent timeout; an in-process timer alone cannot stop a stalled event loop. On timeout, correctness failure, isolation loss or source/runtime drift, stop and mark the run **invalid**. Partial timing data must not be labeled a successful or complete benchmark. No automatic retry or adaptive reduction of sample counts.

## Output and interpretation

Record fixture/block/pair index, AB/BA order, A elapsed nanoseconds, B elapsed nanoseconds and signed paired delta **B − A**. Retain negative deltas. For each fixture/block report paired-delta min, median, p95, p99 and max using a declared nearest-rank percentile rule; report A/B distributions separately for context. Do not subtract marginal percentiles and call that a paired percentile. Preserve all measured pairs in sanitized output; warm-ups may be summarized by count only.

Record start/end UTC, monotonic total duration, CPU/OS/runtime metadata, source hash/revision, sample counts and validity outcomes. Do not include machine username, absolute home path, nonce values or synthetic Response dumps. No arbitrary performance pass/fail threshold is introduced: validity is a correctness/isolation/completeness decision, while timings are descriptive observations.

The result establishes only overhead in this Node runtime with these fixtures. It cannot establish Cloudflare CPU billing, isolate production JSD behavior, simulate HTML-cache loss, measure network/end-user latency, predict cost, or replace a matched pre-rollout production baseline. No claim that the nonce is “fast enough” follows without an independently agreed criterion.

## Approval and acceptance boundary

**Review receipt — September 14, 2026:** Independent comparison against the actual middleware and functional tests approved the design without blocking findings. Root tightened diagnostic privacy to discard existing test-child output and require fixed safe benchmark failure codes before implementation.

Root reviews this design and obtains implementation/execution approval before adding or running the harness. The local result may inform a later acceptance discussion, but **does not close `9lk`**, prove zero cost, or redefine its original requirements. Any proposed change to acceptance criteria or live experiment is a separate explicit decision; routine production reprobes are not part of this design.
