# Synthetic archive-evidence verification — 2026-09-16

**Offline implementation verification, specification review and quality review passed; landing remains pending.** This document records supervising-agent, implementation-author and reviewer evidence, not execution by the report author. The historical parser stop was followed by explicit revision approval, not bypassed. The full suite passed independently under the bounded network-denied supervisor. No production acceptance or main integration is claimed.

## Scope and source

The user approved the synthetic implementation described by the [design](../specs/2026-09-16-synthetic-archive-evidence-design.md) and [plan](../plans/2026-09-16-synthetic-archive-evidence.md). Worktree branch: `feat/archive-evidence`, base **`a33918b`**. Other agents own implementation; this report does not alter their code.

The implementation concerns consistency of two supplied synthetic JSON documents only. No native command, real archive inspection, credential/provider operation, owner-repository read or production integration occurred in this verification scope. Synthetic consistency cannot establish artifact authenticity, signing acceptance or release readiness.

## Containment evidence

The existing reviewed helper **`infra/csp-nonce/run-nonce-benchmark.py --policy-check`**, from **`b53dafe`**, was located. Its SHA-256 is:

`533129d470aa2afad5a19bb10fc4f2e44767c4b0f4080cbbc5b4d1d2004472f4`

An earlier unsuccessful temporary-path search was not proof of global helper absence. The supervising agent invoked the located helper through the fixed installed Python 3.14 supervisor, checking current/parent process policy without traffic. The outside helper exited **1**; the sandboxed helper exited **0**, with current and parent inbound/outbound denial checks equal to **1**.

The exact policy was:

```text
(version 1) (allow default) (deny network*)
```

This is **network-only containment**. It provides no filesystem or credential-store protection. Exclusion of those operations relies on scope, inspected code and the planned purity checks, not an operating-system guarantee that has not been established.

Runs used clean scratch HOME/TMP, allowlisted environment with `PATH=/usr/bin:/bin:/usr/sbin:/sbin`, closed unrelated descriptors, bounded runtime and owned-child cleanup. No external traffic was generated for the policy check.

## Runtime compatibility and initial TDD evidence

Pinned interpreter: **`/usr/bin/ruby --disable-gems`**, Ruby **2.6.10**, installed JSON **2.1.0**. Initial contained compatibility checks passed for nested duplicate keys, escaped-equivalent keys, and a duplicate occurring before a later syntax error. Nesting depth **12** was accepted by the parser control; depth **13** was rejected. Those initial controls were **insufficient to establish strict JSON syntax**.

Initial TDD recorded a meaningful **missing-implementation red run (exit 1)**, followed by a minimal **happy-path green run (one case)**. The parser group first reported **31 cases: 2 passed, 29 failed**. Its latest reported run is **31 cases: 30 passed, one failed (`parse_escape`)**. The expected-fixture group reports **14 cases: zero passed, 14 failed**. Shape tests were written but not executed. These are incomplete development results, not accepted regression totals.

## Historical strict-syntax blocker and WIP checkpoint

The installed JSON 2.1.0 parser accepts invalid JSON escape **backslash-q**, decoding it as `q`. The supervising agent independently reproduced this using fixed bytes under the same sandbox; the probe exited **2** with the fixed category **`INVALID_ESCAPE_ACCEPTED_AS_Q`**. The failing `parse_escape` regression is retained.

The failing behavior was not papered over or run unsandboxed. It led to reviewed, explicit user approval of a pinned-runtime and diagnostic-contract revision, described below. At the historical checkpoint, raw-NUL classification was provisional; the resumed parser group now includes its regression. No custom lexer or fallback was introduced by that approval.

At WIP **`55a5b51`**, implementation contained **parser/caps/result-envelope scaffolding only**, and could return `synthetic_consistent` without performing all required semantics. This historical checkpoint was not usable or merged to main. It is not the current verified implementation; the completed offline suite and reviewed corrections below supersede that incomplete-code warning. Production integration remains excluded.

## Approved resumption and fresh controls

The user explicitly approved the reviewed parser revision and original offline implementation resumption. Document review passed, and amended contract commit **`6c1f7ff`** records the new boundary: exact **`/opt/homebrew/Cellar/ruby/4.0.7/bin/ruby --disable-gems`**, JSON **2.18.0**, `allow_duplicate_key: false`, duplicate syntax failures mapped to `INPUT_SYNTAX`, and typed nesting failures mapped to `INPUT_LIMIT`. Duplicate rejection remains mandatory; diagnostic granularity intentionally changes. No message regex, Hash-hook dependency, custom lexer or fallback is authorized.

Fresh supervising-agent checks again returned policy-control outside exit **1**, inside exit **0**, without traffic. The executable hash matched the approved value:

`0abc5dafa91bf31774888e70580d9b7d2739006beecf37795d3a2c3d383b974f`

Loaded JSON features were checked within the Cellar **`4.0.7/lib/ruby/4.0.0`** tree, with no RubyGems or Fastlane loaded. The parser bundle SHA-256 was:

`08896f89bf181995d87dfba2084031899bdeda8f5aeb6cce194a111f82c62c12`

Resumed execution used fresh owned scratch `/private/tmp/archive-resume-7u109ycw` and the pinned clean-environment supervisor with **25-second** time bound, **16 KiB** output bound and propagated child exit status. The network-only policy remains unchanged and still does not provide filesystem/credential isolation.

## Resumed implementation-author checkpoints

These are implementation-author red/green development checkpoints; they are distinct from the independently repeated full suite below:

| Group | Reported red | Reported green |
| --- | --- | --- |
| Parser | 31 cases: 28 passed / 3 failed | 32 / 32, including raw-NUL regression |
| Shape | 1,389 cases: 36 passed / 1,353 failed | 1,389 passed |
| Expected fixture | 14 cases: 1 passed / 13 failed | 14 passed |
| Binding | 18 cases: 0 passed / 18 failed | 18 passed |
| Inventory | 18 cases: 3 passed / 15 failed | 18 passed |
| Symbols | 12 cases: 0 passed / 12 failed | 12 passed |
| Policy | 17 cases: 0 passed / 17 failed | 17 passed |
| Purity | 4 cases: 3 passed / 1 failed | 4 passed |

The final suite includes added two-architecture coverage, duplicate/depth precedence and scalar-edge regressions. Incremental groups should not be summed to infer the final total; the actual full-suite result is recorded below.

## Final offline suite and mutation evidence

The implementation author reported **1,548 / 1,548 cases passing**. The supervising agent independently repeated the full suite under the same bounded network-denied supervisor: **1,548 / 1,548 passed, exit 0**. Validator SHA-256 matched the author's identity:

`e9f9b369a268d79f499f2c20c6fd393cbba60c29686e3a825514b0866595eaef`

Four disposable code mutants were exercised, respectively removing an inventory condition, removing an identity condition, making `pairs_equal?` always true, and removing policy equality. Each mutation-group run had **four cases: three passed and one targeted sensitivity case failed**. Mutant copies were removed and the original validator hash remained unchanged. These targeted mutations demonstrate sensitivity of the corresponding assertions; they are not an exhaustive proof of correctness.

Independent **specification review passed**, based on source inspection rather than reviewer runtime execution. Its two earlier coverage gaps—two-architecture acceptance and duplicate/depth precedence—were fixed before the final result. Independent **quality review passed with no blocking findings**: the reviewer inspected parser/bounds, input dispatch, ambiguous-counterpart suppression, diagnostics, test oracles and purity limits, and independently ran **1,548 / 1,548 cases, exit 0**, through the approved supervisor. That reviewer used supplied containment-control and mutation receipts rather than rerunning those controls/mutants. The README has been updated to reflect the current offline scope rather than the historical incomplete scaffolding.

## Current evidence limits

The historical `pxrg` parser stop and WIP **`55a5b51`** have been superseded by approved resumption and the bounded offline verification/reviews above. Current Bead status and final commit/push/integration receipt remain pending with the supervising agent; this report does not close the task.

The passing counts establish the executed synthetic suite only, not source/artifact authenticity or production readiness. No `adapter.inspect` wiring, owner `p2z9` acceptance, real collector, archive extractor, provider transport or release operation is established. No native or provider acceptance follows from these results.
