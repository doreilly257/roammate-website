# Apple / Play Offline Comparison Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans`. **Beads alone tracks execution** under project instructions (current planning Bead **5wg2**); numbered procedures below are not a duplicate tracker. User approval covers this plan only, not implementation.

**Status:** Technical review passed; planning only. Implementation requires separate approval.

**Goal:** Specify a small pure-Python synthetic harness for native-metric semantic eligibility and explicit shared-date coverage, without reading reports or calculating metric values.

**Architecture:** Immutable in-memory request/evidence structures feed a deterministic evaluator returning fixed reason codes and synthetic date-coverage metadata. Evidence statuses are assertions supplied by fixtures, not verification of a real provider. Separate native metric descriptors never become a common cross-platform unit.

**Tech Stack:** Python standard library `dataclasses`, `enum`, `datetime`, `unittest`; no dependencies, CLI, parser, provider wiring, filesystem API or runtime launcher.

**Approved design:** [Apple / Play comparison contract](../specs/2026-09-15-apple-play-comparison-design.md). The user has now reviewed that design; implementation remains a separate approval after this plan. No worktree or code is created by planning.

## Exact future files and execution gate

Tracked filenames show no existing `tools/analytics` files; sibling `tools/store` uses `test_*.py` unittest modules. Create only:

| File | Responsibility |
| --- | --- |
| `tools/analytics/comparison_contract.py` | Frozen structures, strict validation and pure eligibility/coverage evaluator. |
| `tools/analytics/test_comparison_contract.py` | Inline synthetic fixtures and unittest assertions, no external fixture reads. |
| `tools/analytics/README.md` | Offline command, input/output boundaries and real-evidence disclaimer. |

Do not alter store tools, owner repositories or deployment/build integration. A future implementation must first establish an isolated project-local worktree and independently verify inherited OS network denial; that setup is not performed or authorized by this plan. If denial cannot be verified, do not run tests without it. From the future worktree, use this exact command for each RED/GREEN cycle after that gate:

```sh
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)' python3 -B -m unittest discover -s tools/analytics -p 'test_comparison_contract.py'
```

Do not invoke `/usr/bin/python3` or install an interpreter as an automatic fallback. Use the already verified Python resolution; if it differs from the verified environment, stop for review. No network probes, private fixture reads or actual test execution occur during planning.

## 1. Establish strict synthetic structures with TDD

1. Write `test_comparison_contract.py` first, importing the missing module and asserting a valid three-day synthetic request is accepted structurally. Run the command above: expected RED `ModuleNotFoundError` before production implementation exists.
2. Implement frozen structures: `Selection` (inclusive intended start/end, fixed families, metric/grain descriptors, intersection policy, contiguous-required flag, enumerated `requested_operation` defaulting to `NONE`); `Evidence` per platform (daily observations, gate statuses, provenance/correction descriptors); `Observation` (real `date` object, synthetic full-grain key tuple, presence status, logical report and selected version); `Result` (eligibility enum, fixed reason codes, coverage metadata only). No numeric metric-value field or dimension values from real data. Pin the public API to `evaluate(selection: Selection, apple: Evidence, play: Evidence) -> Result`. Dataclass constructors do not coerce or validate semantic field types; `evaluate` validates them and returns fixed-code `INVALID_INPUT` for malformed fields or arbitrary wrong top-level objects, without leaking exceptions. There is no accepted mapping API: unknown constructor keywords produce ordinary dataclass `TypeError`, outside the advertised sanitized evaluator boundary.
3. Define enums for `VERIFIED`/`UNKNOWN`/`FAILED` evidence and `PRESENT`/`EXPLICIT_ZERO`/`MISSING`/`SUPPRESSED`/`UNKNOWN` presence. `EXPLICIT_ZERO` is a synthetic categorical marker, not a retained metric value. Exact enum types are mandatory: reject strings, booleans and coercion. Any actual boolean field uses `type(value) is bool`; never accept `1`, `"true"` or truthiness. Require `type(day) is date`, not datetime or a filename/month string.
4. Add failing validation subcases for wrong types, start after end, wrong top-level objects, absent descriptors, invalid observation keys and inconsistent families; implement minimal fixed-code invalid-input results. Do not interpolate arbitrary inputs into errors. Rerun: expected GREEN for valid structure and each rejection.

## 2. Model every semantic/evidence gate, not a real evidence verifier

1. Add RED cases toggling each gate from VERIFIED to UNKNOWN and FAILED. Gate fields cover predeclared selection; actual daily dates; authoritative day-boundary definition and compatibility; complete pages/instances/segments; expected app/package and schema; documented event/dimension grain; metric population/unit/aggregation semantics; report identity/version/checksum status where applicable; retrieval/correction/late-arrival policy and selected-version precedence. Distinguish documented checksum not-applicable from unknown with an explicit status where needed. All required unknown/failed states block matching/metric eligibility.
2. Implement the pinned `evaluate(selection: Selection, apple: Evidence, play: Evidence) -> Result` with fixed family enforcement: Apple Discovery and Engagement Standard DAILY only, Play overview daily-date observations only. Reject Detailed, Downloads substitution, weekly/monthly families and mixed families. Even VERIFIED flags cannot override incompatible or missing day-boundary identifiers or absent required descriptors. The evaluator checks structure/consistency of synthetic claims; it does not fetch or authenticate their authority.
3. Add RED cases for requested unique-count aggregation across days/dimensions without verified permission, unsupported Counts aggregation, Play user/device/event/stock identity collapse, stock summation without permission and cross-platform ratios/sums/ranking/attribution requests. Implement explicit native metric identity plus requested operation (`NONE` by default) and verified aggregation-permission gates. Forbidden cross-platform operations always reject; no operation computes values even when permitted synthetically. Unique and ordinary counts remain distinct.
4. Add RED cases for two selected versions of the same logical report, unresolved precedence and missing correction policy; implement rejection rather than summing versions or choosing the last input. Accepted correction fixture supplies one explicit selected version plus consistent verified supersession metadata; excluded old versions are provenance only, not eligible observations. Rerun all tests: expected GREEN; no semantic or version gate silently defaults to VERIFIED.

## 3. Derive synthetic date coverage without hiding exclusions

1. Add RED fixtures for identical endpoints with a missing interior day, legitimate different-grain rows on the same day, repeated identical full-grain keys, out-of-interval dates, explicit zero versus missing, suppressed/unknown days and inconsistent mixed presence at the same declared daily grain. Implement full-key duplicate detection within selected versions; legitimate dimension keys do not inflate unique-date counts. Inconsistent presence blocks the affected coverage rather than becoming zero.
2. Compute the intended inclusive calendar-day denominator from Selection only. Retain date classifications and exclusions; select eligible dates only after gate checks, deduplicate days for coverage and intersect the two sets. Out-of-interval observations must not alter the denominator or extend the selection. Do not infer absent days from min/max completeness: enumerate the intended calendar interval.
3. Return available unique date sets for each platform, shared set, missing/suppressed/unknown sets, exclusions/reasons, denominator and coverage numerator/denominator pairs. These are coverage metadata, not metric ratios. Distinguish `INVALID_INPUT`, `UNAVAILABLE`, `GAPPED` and `ELIGIBLE_SYNTHETIC`; failed/unknown gates cannot produce certified shared dates. Local diagnostic date coverage may be retained but explicitly unverified. Empty/disjoint sets return UNAVAILABLE, never zero activity.
4. Add RED cases for noncontiguous shared dates with unchanged denominator, missing endpoints, and contiguous-required selection. Implement GAPPED when comparison permits explicitly gapped coverage; contiguous-required blocks any missing day in the intended interval, not merely interior gaps in the intersection. Even contiguous partial subsets retain partial coverage and cannot masquerade as complete. No UI/display implementation is included.
5. Rerun: expected GREEN. Use synthetic examples including Apple September 10–12 versus Play September 1–8, month-label rejection, swapped input order and duplicated corrected versions; no retained private reports are loaded. Assert result determinism and unchanged input structures.

## 4. Verify scope, document and obtain review

1. Add synthetic tests proving no metric-value fields or combined units/totals are emitted, arbitrary secret-marker strings never appear in fixed failure output, and unknown statuses cannot turn eligible through Python coercion. Where descriptors are returned, allow only enumerated synthetic contract labels, not arbitrary supplied text.
2. Run the full command above under verified denial; expected all synthetic tests PASS. Keep test names/counts and fixed failure codes, not raw fixtures. Do not promise a test count before implementation. Inspect imports/source for no socket/HTTP, subprocess, file reading/writing, report parsing or provider SDK use in the evaluator; Python source/module loading by the test runner is not a claim of zero filesystem activity by the interpreter.
3. Write README with the command, accepted synthetic structures and explicit disclaimers: booleans/statuses model supplied evidence, not real-source verification; no private reads, metric totals, display, release or growth acceptance. Do not add CI, broad infrastructure or automatic provider refresh.
4. Obtain independent spec/plan-conformance and quality review of the implementation and evidence. Resolve findings and rerun affected tests before scoped supervisor landing and Bead updates. A private coverage refresh, semantic-source verification, metric calculation or display requires a separate authorized scope; a synthetic PASS does not unblock those real-world acceptance gates.
