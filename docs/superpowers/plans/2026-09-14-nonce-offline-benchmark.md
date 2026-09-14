# Offline Nonce Benchmark Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans`. Track execution exclusively in Bead **`roammate-website-e0ia`**; numbered steps below define the procedure, not a second task tracker.

**Goal:** Implement and run the user-approved isolated paired local middleware benchmark, without changing production source or claiming production latency acceptance.

**Architecture:** A Node standard-library module compares fresh in-memory origin responses with the actual imported middleware. A Python standard-library supervisor establishes and verifies the deny-network process boundary, runs silent correctness tests, enforces the benchmark deadline, validates sanitized results and publishes only a complete valid artifact.

**Tech stack:** Installed Node 26.8.2, Python standard library, existing macOS process sandbox; no install, listener, browser, SDK, deployment or package changes.

**Reviewed contract:** [Offline benchmark design](../specs/2026-09-14-nonce-offline-benchmark-design.md). User subsequently approved implementation; the design's historical awaiting-approval status does not expand scope. Work only in `.worktrees/nonce-benchmark`. Root owns execution, evidence review, Bead status and commits.

## File boundaries

| Artifact | Responsibility |
| --- | --- |
| Create `infra/csp-nonce/nonce.benchmark.mjs` | Fixture definitions, actual middleware import, paired timing, fixed-code correctness checks, signed statistics and sanitized complete JSON |
| Create `infra/csp-nonce/nonce.benchmark.test.mjs` | Deterministic unit/fixture tests; no real network or benchmark-sized workload |
| Create `infra/csp-nonce/run-nonce-benchmark.py` | Isolation controls, child supervision, private output handling, schema/provenance validation, atomic valid-result publication; embedded self-tests |
| Create `docs/superpowers/verification/2026-09-14-nonce-offline-benchmark.json` | Validated full measured pairs and metadata, only on complete successful run |
| Create `docs/superpowers/verification/2026-09-14-nonce-offline-benchmark.md` | Scoped results and limits, independently reviewed by root |

Do not modify `_middleware.js`, `nonce.test.mjs`, `deploy.test.mjs`, package manifests or deployment files. No automatic CI performance gate.

## Unit 1 — Deterministic benchmark core and fixtures (TDD)

1. Write tests against exported pure helpers and fixture execution before adding implementation. Suggested contracts: `nearestRank(values, percentile)`, `summarize(values)`, `orderForPair(index)`, `validatePair(pair)`, `runFixturePreflight()`. Imports must not auto-run a full benchmark.
2. Under root's verified outer boundary, root runs the new test child with stdout/stderr discarded and fixed stage/exit reporting. Expected RED is the missing module/export or failing intended assertion, never a claim from an unrelated syntax failure. Root records the safe failure category.
3. Implement minimum helpers. Nearest rank selects sorted index `ceil(p*n)-1` for nonempty arrays, retaining negative deltas; median uses the declared same rule. Reject empty/nonfinite data and malformed pairs with fixed error codes. `deltaNs` must equal `bNs-aNs`; raw arm times must be nonnegative safe integers. Alternate AB/BA continuously by pair index.
4. Implement the five reviewed fixtures: HTML GET 200, HTML GET 404, HTML HEAD with null body, search HTML, static image bypass. Use fresh per-arm Request and fresh per-call Response/body sources from immutable synthetic definitions. Upstream CSP is absent for timed fixtures; mismatch rejection is a separate correctness case. Keep real CSPRNG; no entropy patching.
5. Add fixture tests proving status/body parity, expected nonce presence/encoding without printing values, HTML cache/validator transformation, search-only WASM permission, null HEAD body and unchanged bypass headers. Test mismatch rejects safely; check control and middleware body sources are not reused. No actual/expected header contents in failure diagnostics.
6. Root reruns until GREEN, then independently reviews the core and tests. Do not weaken correctness or reduce fixture coverage to obtain green.

## Unit 2 — Supervisor and output boundary (TDD)

1. Add an embedded `--self-test` mode to the Python supervisor using `unittest` and synthetic in-memory metadata/child scenarios. First cover invalid Node version, malformed/truncated/oversized JSON, wrong source hash, missing pairs/blocks, unexpected fields, invalid signed delta, invalid order, child failure/timeout and no publication on failure. Tests must not require production data, network listeners or additional files beyond disposable supervisor-owned result paths.
2. Root runs RED in its pre-established boundary. Implement only the supervisor functions needed to satisfy each test, then root reruns GREEN. Self-test mode must never run the full benchmark or publish the real report.
3. Before tests/benchmark, inspect exact Node version and production-source hash/revision/dirty state, using safe structured subprocess handling. Recheck source/runtime after execution; drift invalidates the result. A dirty unrelated worktree is not permission to alter production source.
4. Launch controlled children under root's verified `sandbox-exec` deny-`network*` boundary. Root verified that socket allocation is allowed: do **not** incorrectly require allocation itself to fail. Use the actual Node `net.connect` to `127.0.0.1:9`, with no listener, and require `EPERM`/`EACCES`, never connection-refused or timeout. A Python child uses `ctypes`/`sandbox_check` to verify both itself and its actual Node parent PID report denial (`1`) for network-inbound/outbound; root's unsandboxed policy-only control reports `0` without connecting. Reproduce and validate these effective-process controls before workload; a policy string alone is insufficient. Do not bind/listen or contact production. Missing proof fails closed before Node tests run.
5. Discard both stdout and stderr from existing `node --test infra/csp-nonce/nonce.test.mjs` and the new benchmark tests; preserve only exit status and safe stage codes. Do not run `deploy.test.mjs`. Unexpected exceptions must not leak raw diagnostics to parent tools.
6. Benchmark results need a distinct bounded channel: capture only expected JSON into bounded parent memory, discard stderr, never display unvalidated stdout and never store raw partial output. Limit capture to **16 MiB**; overflow invalidates and terminates the run. Strictly validate allowed schema/field types and counts before publishing. Only synthetic fixture IDs, declared order, numeric timing, safe runtime/OS/CPU metadata and code provenance may survive; forbid raw nonce/header/body/path-to-home fields.
7. Enforce **120 seconds from benchmark child start** with the Python parent's monotonic deadline. Kill and reap the benchmark process group on expiry/failure so descendants cannot continue. The deadline and bounded output drain must work even if the Node event loop stalls or stdout fills. No automatic retry, partial pass or sample-count reduction.
8. Write validated JSON atomically to the named result path only after child success, complete validation and unchanged-source check. Preserve any earlier result on failure and report the current run's failure separately; never misrepresent an old artifact as a fresh success. Test timeout/malformed-output paths using short synthetic children under the same boundary, without emitting their raw output.

## Unit 3 — Full paired run and acceptance evidence

1. Add/run the full workload only after Units 1–2 review: per fixture **200 warm-up pairs**, then **five blocks × 1,000 measured pairs**. Sequential fixtures, alternating AB/BA, no forced GC or outlier removal. Total measured pairs **25,000**, warm-up pairs **1,000**.
2. Construct Request before the clock. Time from immediately before `await next(request)` (A) or `await onRequest({request,next})` (B) until the Response is available using `process.hrtime.bigint()`. Drain/check body and headers outside timing before the next arm. Record A/B nanoseconds and signed B−A per measured pair; never print real nonce values.
3. Record UTC start/end, monotonic duration, exact runtime, safe CPU/OS description, source hash/revision/dirty state, fixture/block/pair/order, all measured pairs, and per-block A/B/delta min/median/p95/p99/max. Verify nearest-rank summaries from raw pairs in Python independently, without subtracting marginal percentiles. Include warm-up counts and fixed validity outcomes only.
4. Root executes from worktree root:

```sh
python3 infra/csp-nonce/run-nonce-benchmark.py --self-test
python3 infra/csp-nonce/run-nonce-benchmark.py --output docs/superpowers/verification/2026-09-14-nonce-offline-benchmark.json
```

The supervisor, not these bare command strings, must enforce all isolation and diagnostic requirements. Expected success is fixed safe stage labels, exit zero and a complete validated artifact; isolation unavailable or timeout is an explicit invalid run, not a benchmark result.

5. Root independently validates pair counts, ordering, statistics, source preservation, no raw sensitive output and absence of production changes. Run `git diff --check`; review precisely scoped changes. Capture red/green and supervisor-negative receipts without raw child logs.
6. Author the results report only from validated evidence. Explain local Node response-construction overhead, negative/outlier handling and runtime limitations. Do not claim Cloudflare CPU, JSD/network/end-user latency, cache-loss cost, invoice effect, production performance pass or zero cost. A valid local benchmark can complete **e0ia**, not the missing matched-latency acceptance requirement in **9lk**.
7. Root obtains final independent review, updates Beads, commits only approved artifacts and pushes under repository workflow. If isolation or another prerequisite blocks execution, record the actual blocker and leave implementation/result acceptance incomplete rather than manufacturing a valid result.

## Stop conditions and review boundary

Production source change, runtime mismatch, unreliable inherited isolation, nonce-bearing diagnostics, invalid/partial result, timeout or unauthorized scope expansion stops the run. No fallback to live probes, servers, deployment, extra dependencies or arbitrary latency thresholds. Review is mandatory before the first measured execution and before publishing success.
