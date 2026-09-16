# INCOMPLETE / BLOCKED — DO NOT USE

This directory is an unfinished synthetic archive-evidence experiment, **not a usable validator**. Do not invoke it for acceptance, depend on its result, integrate it into an adapter, or treat it as production evidence.

## Why work stopped

The fixed Ruby 2.6.10 / JSON 2.1.0 runtime accepts invalid JSON backslash-q escapes. An independently repeated, sandboxed fixed-byte probe confirmed `INVALID_ESCAPE_ACCEPTED_AS_Q`; the strict-syntax regression `parse_escape` remains failing. Earlier duplicate-key and depth controls did not establish complete parser compatibility.

The current code implements only parser/cap/result-envelope scaffolding. Schema validation, expected-fixture semantics, inventory/symbol/policy checks, purity and mutation coverage are incomplete. It can emit **`synthetic_consistent` without all required semantic checks**. That output must not be trusted even for synthetic contract acceptance.

## Recorded development checkpoint

- Initial missing-implementation red, then one happy-path green case.
- Latest parser group: **30 passed / one failed**, out of 31 cases.
- Expected-fixture group: **zero passed / 14 failed**.
- Shape tests written but not executed; remaining coverage incomplete.
- Raw-NUL error classification remains provisional and requires review.

See the [verification report](../../../docs/superpowers/verification/2026-09-16-synthetic-archive-evidence.md), [approved contract](../../../docs/superpowers/specs/2026-09-16-synthetic-archive-evidence-design.md), and [implementation plan](../../../docs/superpowers/plans/2026-09-16-synthetic-archive-evidence.md). Tracking: `pxrg` blocked; owner `p2z9` integration acceptance has not been obtained.

## Boundaries

No native build, real archive, credential, provider operation or owner integration belongs here. The tested sandbox denies network only; it does not provide filesystem or credential-store isolation. No main-branch merge, user acceptance, full test pass or production readiness is claimed.

The planned checkpoint preserves unfinished work and its failing regression on a WIP feature branch only. Resuming requires an explicitly reviewed parser approach and applicable approval; do not bypass the failure, relax JSON requirements, change runtimes, install dependencies or run uncontained to obtain a green result. No runnable command is supplied by this blocked README.
