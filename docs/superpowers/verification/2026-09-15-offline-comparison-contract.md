# Offline comparison contract — synthetic verification

Date: 2026-09-15. Status: **spec re-review and quality review approved; landing not yet recorded**.

This draft records supervisor and implementation-agent receipts for the approved [design](../specs/2026-09-15-apple-play-comparison-design.md) and [plan](../plans/2026-09-15-apple-play-offline-comparison.md). No tests or probes were performed by its author.

## Scope

Implementation is limited to `tools/analytics/comparison_contract.py`, `tools/analytics/test_comparison_contract.py` and `tools/analytics/README.md`, plus this evidence report, in `.worktrees/apple-play-contract`. The evaluator consumes in-memory synthetic structures and produces eligibility/reason codes and date-coverage metadata. It does not parse private reports, compute native metric values, install dependencies or wire a provider, CLI or display.

Synthetic evidence flags model supplied claims; passing tests cannot certify actual source semantics, report completeness, timezone definitions or a matched real-world baseline.

## Execution boundary

The supervisor verified `sandbox_check` using the current process PID: network inbound and outbound returned **1** for both parent and child under denial, with an unsandboxed control returning **0**. An initial PID-zero query was an invalid gate and was replaced by the valid current-PID check; it is not counted as enforcement evidence. No actual network traffic was used for these checks.

The policy is **allow-default with network denial only**, not credential or filesystem isolation. Interpreter: `/opt/homebrew/opt/python@3.14/bin/python3.14`. The supervisor independently reproduced the final **20 unittest test methods PASS** under this boundary. Existing keyword-guard baseline and supervisor post-implementation rerun: **29 tests PASS** under network denial, separately from the comparison suite.

Reproduction command from the isolated website worktree, after verifying the inherited denial boundary:

```sh
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)' /opt/homebrew/opt/python@3.14/bin/python3.14 -B -m unittest discover -s tools/analytics -p 'test_comparison_contract.py'
```

## Recorded red/green sequence

| Stage | Observed RED | Observed GREEN |
| --- | --- | --- |
| Initial contract | Missing contract implementation | 3 test methods PASS |
| Semantic gates | 76 subcase failures across 7 test methods | 7 test methods PASS |
| Coverage | 7 failures across 14 test methods | 14 test methods PASS |
| README boundary | 1 failure across 18 test methods | 18 test methods PASS |
| Spec-review corrections | 2 failures across 20 test methods | 20 test methods PASS |

Counts distinguish unittest methods from subtest failures; these are not additive totals or claims of hundreds of independent tests. Spec review identified two gaps: typed checksum-not-applicable handling and coverage output. Both received failing regression tests, fixes and passing reruns; spec re-review approved. Independent quality review approved with no blockers and independently reran the exact network-denied command: **20 test methods PASS**.

## Limits and disposition

No private report reads, metric-value calculation, package installation, provider wiring, production change or release occurred in this scope. Network denial does not establish read isolation or credentials protection, and synthetic PASS does not resolve the real Apple/Play measurement prerequisites. Separate authorization and verified source evidence remain necessary for private coverage refreshes, semantic verification, calculations or display.

The supervisor must record landing outcomes before completion is claimed. No commit, push or clean-worktree state is asserted here.
