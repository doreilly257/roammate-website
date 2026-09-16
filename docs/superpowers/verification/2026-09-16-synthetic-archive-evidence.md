# Synthetic archive-evidence verification — 2026-09-16

**INCOMPLETE / BLOCKED — do not use or integrate this validator.** This document records supervising-agent evidence, not execution by the report author. Work stopped on a parser compatibility blocker; no complete contract acceptance or final independent review is claimed. A WIP feature-branch checkpoint is pending the supervising agent's commit/push receipt, not a merge to main.

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

## Blocking strict-syntax finding

The installed JSON 2.1.0 parser accepts invalid JSON escape **backslash-q**, decoding it as `q`. The supervising agent independently reproduced this using fixed bytes under the same sandbox; the probe exited **2** with the fixed category **`INVALID_ESCAPE_ACCEPTED_AS_Q`**. The failing `parse_escape` regression is retained.

Do not paper over this behavior with a passing test expectation, weaken the strict-syntax contract, run unsandboxed, change interpreter or add an improvised parser. A revised approach requires review and authorization. Provisional raw-NUL classification as an encoding error also requires later review; it is not a settled acceptance claim.

Implementation currently contains **parser/caps/result-envelope scaffolding only**. Schema validation, semantic comparisons, purity coverage and full mutation acceptance are incomplete. In particular, the incomplete function can return `synthetic_consistent` without performing all required semantics on supplied fictional inputs. **That label is currently unsafe even as a claim of complete synthetic consistency. Do not use it as a validator or integrate it anywhere.**

## Current evidence limits

Bead **`pxrg`** is to be marked blocked. The supervising agent intends to preserve the failing regression and unfinished work in a **WIP feature-branch-only commit/push**, not main integration; its exact hash/status remains pending. No further code or runtime changes followed this stop instruction.

Do not infer completion, final passing counts, a reviewed implementation, source/artifact attestation or production readiness. No `adapter.inspect` wiring, owner `p2z9` acceptance, real collector, archive extractor, provider transport or release operation is established. The warning README deliberately offers no executable bypass or unchecked invocation.
