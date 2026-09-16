# Synthetic archive-evidence consistency

Standalone, Ruby-standard-library-only **synthetic consistency checks**, not archive authentication, extraction, signing validation, credential scanning or release acceptance. The expected fixture is separately authored and reviewed; controlling both inputs can produce mutually consistent fiction. No actual bytes are authenticated by digest labels.

## API and boundaries

`SyntheticArchiveEvidence.validate(expected_json, observed_json)` accepts two ordinary in-memory strings and returns only string-keyed JSON-compatible values:

```json
{"schema":"synthetic-archive-result/v1","mode":"synthetic","outcome":"synthetic_consistent","reasons":[]}
```

Rejected inputs use `synthetic_rejected` and fixed reason codes, never input excerpts or exceptions. Expected syntax, bounds, shape and internal consistency precede observed validation. Inventories are order-independent; duplicate identities are excluded before maps are constructed, and missing/ambiguous counterparts suppress dependent comparisons. Independent comparisons continue. Limits and exact fields are in the [approved contract](../../../docs/superpowers/specs/2026-09-16-synthetic-archive-evidence-design.md).

This result **must not be used as `adapter.inspect`, an upload prerequisite or production evidence**. It never returns `true`, but Ruby Hashes are truthy: no result shape prevents incorrect boolean coercion by a caller. Review and absence of integration enforce this boundary. The test's fake production reader is deliberately independent; it is not an owner prerequisite implementation. Owner `p2z9` acceptance and a separately reviewed production collector/trust model remain necessary before any integration.

## Pinned execution and containment

Approved runtime: `/opt/homebrew/Cellar/ruby/4.0.7/bin/ruby --disable-gems`, JSON 2.18.0, executable SHA-256 `0abc5dafa91bf31774888e70580d9b7d2739006beecf37795d3a2c3d383b974f`. JSON uses `allow_duplicate_key: false`, `create_additions: false`, `allow_nan: false`, `max_nesting: 12`. Duplicates and other parser errors return `INPUT_SYNTAX`; typed nesting errors return `INPUT_LIMIT`. There is no custom Hash interception, alternate lexer, exception-message classification or runtime fallback. Historical system Ruby 2.6.10 / JSON 2.1.0 accepted invalid escapes and is **not supported**.

Before **every resumed execution session**, repeat the reviewed no-traffic sandbox controls and runtime/loaded-library identity checks described in the [implementation plan](../../../docs/superpowers/plans/2026-09-16-synthetic-archive-evidence.md). Use fresh owned HOME/TMP, an `env -i` allowlist and a bounded argument-vector supervisor. Stop if these controls fail; do not run Ruby without containment or install dependencies. The required child argument vector is:

```text
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)'
  /usr/bin/env -i HOME=<owned-scratch> TMPDIR=<owned-scratch>
  PATH=/usr/bin:/bin:/usr/sbin:/sbin
  /opt/homebrew/Cellar/ruby/4.0.7/bin/ruby --disable-gems
  <absolute-test_validator.rb> --group all
```

The displayed policy is one literal argument, not shell-expanded input. The supervisor must use closed stdin, `close_fds=True`, a new owned process group, at most 30 seconds, bounded output, cleanup of that group in `finally`, and propagated child status. The verified session used 25 seconds, 16,000 output bytes, sanitized stdout and this exact supervisor invocation (ephemeral paths are not reusable prerequisites):

```text
/opt/homebrew/opt/python@3.14/bin/python3.14 -B /private/tmp/archive-resume-7u109ycw/run.py all
```

The sandbox **denies network only**, not filesystem or credential stores. Narrow audited imports and post-load sentinels enforce test boundaries, not OS filesystem isolation. No native build, real archive, credential access, owner checkout read, provider operation, Fastlane load, installation, deployment or candidate wiring is part of this unit.

## Tests

The manual runner has no gem/test-framework dependency. Fixed groups: `happy`, `parse`, `shape`, `expected`, `binding`, `inventory`, `symbols`, `policy`, `determinism`, `purity`, `mutations`, `all`. Other arguments or zero selected cases fail. Output contains at most twenty fixed failing case IDs plus aggregate counts; exceptions, backtraces and inputs are never printed. Counts are test cases, not individual assertions.

`fixtures.rb` holds independently authored expected and observed JSON literals. Tests cover strict parsing and exact bounds, recursive field/type mutations, expected conflicts, binding/inventory/UUID/policy checks, two-architecture permutations, fabricated consistency, no-echo diagnostics, sentinel controls and fake production-schema rejection. Every validator call is wrapped with restored filesystem/process/network/environment/clock/provider sentinels and output capture. Sentinel controls invoke already-replaced methods only; they never open a socket, file or process. Post-load sentinels do not prove arbitrary native-code purity or replace source/import review and outer network denial.

Four disposable code-removal mutants independently fail the inventory, identity, UUID and policy regressions; no mutant or bypass remains in this directory. See the [verification report](../../../docs/superpowers/verification/2026-09-16-synthetic-archive-evidence.md) for actual receipts, review status and the historical stopped checkpoint. A green suite establishes only this synthetic contract, not owner acceptance or release readiness.
