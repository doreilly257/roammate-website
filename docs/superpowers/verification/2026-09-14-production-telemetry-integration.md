# Local production telemetry integration — interim verification

Date: 2026-09-14

**Status: IN PROGRESS. This is not an implementation-completion or release-acceptance report.**

Bead: `roammate-website-k9xc` (`in_progress` at this evidence snapshot).

Scope: [reviewed design](../specs/2026-09-13-production-telemetry-integration-design.md) and [implementation plan](../plans/2026-09-14-production-telemetry-integration.md). Website plan/spec changes were pushed as `b98f92e`. This interim report documents root-provided execution receipts and the current Bead; its documentation author did not independently rerun tests or inspect every tool transcript.

## Authorization boundary

The user approved local production-code wiring, offline fake-transport tests and compile checks, including operations remaining eligible from start through completion in the same epoch. Unrelated telemetry channels remain unchanged. No app launch, simulator boot, further telemetry sending, release, store upload, deployment or billing change is authorized by this implementation slice.

The separately authorized [single synthetic receiver check](2026-09-14-minimal-otel-receiver.md) is historical evidence only. Its one-send authorization is exhausted; no additional live request was made for the evidence below. These offline results do not establish app-runtime behavior, deployed integration, sustained-volume cost or released-journey acceptance. The broader `sie` acceptance is not closed by a passing component suite.

## Isolated source and preservation boundary

Implementation work is confined to `/Users/doreilly/Work/roammate-app-ios/.worktrees/telemetry-integration`, branch `local/telemetry-integration`, based on `8fc8118`. Root copied 17 relevant existing dirty iOS/project/script prerequisites into that worktree rather than discard or overwrite them. The manifest is `/tmp/roammate-telemetry-integration-owner-baseline.json` with the base and per-file preservation evidence. Four additional pre-edit boundary copies are retained under `/tmp/roammate-telemetry-edit-baseline` for the intended existing-file edits.

The owner working tree remains untouched by this implementation slice. There is no owner commit or push. Future local patch handoff must compare the captured boundary against any intervening owner changes rather than copy blindly. Temporary manifests and edit-boundary copies are local evidence aids, not committed artifacts or permanent storage guarantees; do not include credential values in the website report.

Root owns code changes, compiler/test processes, Bead status and repository landing. This report is documentation only. No full app build or production wiring acceptance is claimed at this snapshot.

## Retained offline baseline

Root ran the existing pinned-SDK lifecycle harness before the new production integration units. Native session `3759`, completion chunk `9a0302`, exited zero. Reported retained evidence:

| Evidence | Result |
|---|---|
| Snapshot bridge | 91 cases passed |
| Synthetic SDK lifecycle | 64 cases passed |
| Lifecycle negative checks | 2 passed |
| Synthetic adapter | 73 cases passed |
| Compile-negative checks | 3 passed |
| Pure projection | 45 cases passed |
| Pinned SDK compilation | 314 SDK source files |
| Compiler macro isolation | 2 macro-denial receipts |

The harness retained the verified outer deny-all-network isolation and previously approved bounded compiler adjustment. This fresh baseline preserves fixture evidence; it does not prove the new production processor, concurrency state machine, real transport or app wiring, which require their own acceptance.

## Unit A — minimal record, clock and wire contract

Unit A supplies the production 15-name record boundary, checked integer observation clock, exact minimal OTLP serialization and fixed bounded response classification. Root reports independent specification and code-quality approval for the final Unit A state.

| Root session / chunk | Evidence and classification |
|---|---|
| `8454` / `aedca0` | Initial harness `SyntaxError`; a nonbehavioral setup failure, not the intended product red test. Corrected before behavioral evidence. |
| `84920` / `551281` | Intended RED: missing production implementation. |
| `77145` / `45f08d` | Fixture autoclosure compilation problem; corrected, not counted as a production behavior failure. |
| `60487` / `eab41d` | First GREEN: 220 assertions. Superseded by the additional regression and final run below. |
| `46121` / `6dda45` | Behavioral RED for malformed known `errorMessage` handling in response parsing. |
| `8134` / `54d304` | Final reported GREEN: 226 assertions, including 45 allowed-name/outcome mappings. Specification and code-quality review approved. |

The progression distinguishes harness defects from intended behavioral red tests. The final passing count is not a claim that all integration paths are complete. Response parsing recognizes only the reviewed success cases and carries fixed internal outcomes; response diagnostic text is not a new exported field. There was no live receiver retry to validate Unit A.

## Unit B — bounded delivery and eligibility

Unit B now has independent specification and code-quality approval for the corrected local state. Its initial implementation and a first-winner regression passed locally, but specification review subsequently identified a deadline defect: the 15-second budget must be measured from request resume, not extended by the time taken inside resume. Root recorded the targeted behavioral red test and a fresh passing run after correction; the earlier preliminary greens alone were not acceptance evidence for that defect.

| Root session / chunk | Evidence and classification |
|---|---|
| `67865` / `1a8626` | Intended RED for the missing delivery implementation. |
| `38790` / `e3a93b` | Initial GREEN: 28 assertions; preliminary only. |
| `68151` / `489104` | Behavioral RED for first-winner handling. |
| `99142` / `b16634` | Subsequent GREEN: 47 assertions after first-winner correction; not final Unit B acceptance. |
| `83519` / `5ae833` | Behavioral RED: expected elapsed-budget assertion for the reviewed 15-second-from-resume deadline. |
| `53015` / `a2873d` | Corrected GREEN, exit zero: 63 assertions. Independent specification and code-quality review approved. |

The deadline correction uses a monotonic UInt64 resume anchor and deducts elapsed time from the remaining budget. Terminal-arrival validation rejects a synchronously reported accepted response that arrives after the deadline. Missing clock readings or clock regression fail closed. These are offline component results, not measured app-runtime timing guarantees.

The reviewed delivery contract retains at most 256 unsent immutable records, one coalesced wakeup and one in-flight request. Record disposition and transport terminal acknowledgement are separate; cancellation or timeout must not free an unacknowledged request slot. Eligibility transitions are synchronous and epoch checked, with no replay after disable/re-enable. Review explicitly accepted an already-resumed request's terminal callback winning internal disposition during the revocation-publication/cancellation gap. That does not authorize a new old-epoch resume, recall an already-started request, or establish that suppression can undo receiver visibility. Unit B approval does not substitute for the integrated processor, transport and app-wiring checks.

## Remaining acceptance scope

At this snapshot Unit C implementation is active with `telemetry_processor`: concrete SDK processor/weak lifecycle ownership is not yet accepted. Units D and E have not started: real transport exercised with offline fakes and atomic local app startup/guest-mode/legacy-export wiring remain unverified. Integrated retained-suite runs, root compile checks, preservation comparison and complete independent review are also still required before local implementation completion can be considered.

Progress and blocker state remain in Beads; this narrative is an evidence snapshot, not a parallel task tracker. Root must amend this report with subsequent receipts before making any broader completion claim. Even a completed local implementation would not authorize app launch, further export or release.
