# Synthetic UDP Control-Channel Assessment Implementation Plan

> **For agentic workers:** Use the applicable subagent-driven-development or executing-plans skill for implementation and independent review. Bead `c2r4` is the tracking authority; numbered implementation instructions below are not a second issue tracker.

**Goal:** Implement and assess only the user-approved synthetic fixed-port UDP containment design, failing closed without adopting a new policy for Gradle or runtime work.

**Architecture:** One Python standard-library assessment module owns fixed synthetic fixtures, scratch-only policy copies, bounded subprocesses, parent marker counters, and sanitized receipts. A separate unittest module injects fake process/socket outcomes to verify orchestration and failure handling without real socket operations. Actual host-synthetic execution follows tests and review; its negative result is valid evidence, not a reason to widen permission.

**Tech stack:** Installed Python, stdlib `unittest`, `subprocess`, `socket`, `tempfile`, `hashlib`, and installed macOS sandbox tooling. No dependency installation, Java requirement, Gradle invocation, native build, app, daemon, or emulator.

## Approved source and file boundaries

Worktree: `/Users/doreilly/Work/roammate-website/.worktrees/gradle-udp-controls`.

Design: `docs/superpowers/specs/2026-09-16-gradle-control-channel-isolation-design.md`. The user approved its synthetic implementation after review; its historic proposal label does not enlarge scope.

- Create `tools/android/udp_control_assessment.py`: pure policy/result helpers plus explicitly invoked synthetic runner. Import must not open sockets, start processes, or create a scratch directory.
- Create `tools/android/test_udp_control_assessment.py`: fake-driven unit tests; mock socket creation and process launch so ordinary test execution cannot contact the network.
- Create a bounded verification report/receipt under `docs/superpowers/verification/` only after actual execution. Preserve the design, installed profiles, owner repositories and existing preboot tooling unchanged.

## 1. Establish red tests before implementation

Write independent unittest cases for missing/new module behavior, then run:

```sh
python3 -m unittest discover -s tools/android -p 'test_udp_control_assessment.py' -v
```

Confirm a genuine missing implementation/assertion failure, not a broken test invocation. Unit tests must cover:

- Valid port bounds and rejection of invalid ports/unsafe profile interpolation; exact shared sentinel restrictions in both scratch profile copies; deny-all baseline; only the proposed fixed-port receive exception in the experimental copy; no network-outbound exception or wildcard-host fallback.
- Exact fixed argument vectors, pinned executable/fixture hashes, minimal fresh HOME/TMP environment, `close_fds=True`, and no inherited network sockets. Import is side-effect-free.
- Result classification: failure on unexpected allowed operation, wildcard bind, malformed output, incorrect/extra marker, collision, timeout, missing readiness, changed hash, or unsupported profile syntax. Unavailable IPv6 positive controls classify incomplete, never pass.
- Matching successful unsandboxed positive controls are prerequisites for denied-case claims. Child exit alone never substitutes for marker receipt.
- Stop sequencing: a first failure/incomplete control cannot cause a weaker retry or real Gradle invocation; remaining cases are explicitly unexecuted, not passed.
- Sanitization rejects arbitrary exception/output/environment content; cleanup terminates/reaps only owned children and deletes only the verified scratch root, including exception paths.

Implement minimal pure helpers until these tests pass. Keep expected results explicit in the tests rather than deriving them from the same implementation table being tested.

## 2. Implement fixture and orchestration seams with fake-driven tests

Add each behavior with a failing test, the smallest implementation, and rerun the same unittest command before proceeding.

1. Generate fixed Python fixtures for bind/receive, attempted send, and synthetic sentinel read/write operations. Use only literal loopback/bind addresses, fixed markers, and pipe-based readiness/results. No DNS or external-address request exists in the fixture surface.
2. Allocate a fresh scratch HOME/TMP, hash the interpreter and fixture bytes, and create two independently named scratch-only profiles. Preserve secret/personal-path restrictions without probing real personal files; explicit sentinel denials concern only synthetic designated paths and do not claim general write containment.
3. Reserve an IPv4 loopback UDP port with no reuse, close the reservation immediately before child bind, and treat the non-atomic handoff as fallible. Require exclusive child bind and pipe readiness before parent marker send. A conflict invalidates the run; never inspect/kill a foreign listener or recycle an occupied port.
4. Maintain owned-process/socket registries, bounded deadlines, exact marker counters and a strict output parser. Each case uses a fresh child and releases its port before the next case. `run_child` caps stdout and stderr at **4,096 bytes each**, without `communicate`; overflow fails closed. Kill and wait for owned children during cleanup. Expose only allowlisted category/errno fields, hashes, synthetic ports, counts, exit status and elapsed time.
5. Add a guarded CLI entry point with an explicit output path and unambiguous pass/fail/incomplete exit behavior. Document the exact final invocation in `--help`; do not make importing or running unit tests trigger the host assessment.

## 3. Encode the complete strict matrix

For each case, first establish its bounded unsandboxed positive control where required, then execute the applicable deny-all/experimental checks. Denial must reflect the intended operation, not missing fixtures or unavailable runtime support.

Required matrix: fixed IPv4 UDP bind plus parent marker receipt; deny-all baseline; different UDP local port; TCP on the same numeric port; IPv6 loopback including that port; IPv4 and IPv6 wildcard binds; ephemeral/wildcard Gradle-shaped bind; attempted child send to parent receivers at allowed-number and other-port targets; explicit read and write sentinel denials in both scratch profiles with matching unsandboxed success.

The matrix contains **36 cases**, including a bound-reply positive control, deny-all baseline, and experimental-policy case. The child never needs an outbound exception for the approved receive case. Its ordinary receive evidence uses parent-to-child marker delivery and pipe reporting, not a network reply. The separate bound-reply control must explicitly reach **READY → RECEIVED → attempted send** before a permitted-source outbound-denial claim is valid. This distinguishes denial of sending from denial of the earlier bind. The strict deny-all baseline establishes only bind denial; it cannot establish post-receive send denial. The unsandboxed bound-reply positive must deliver its marker, while the experimental case must reach the send attempt and deny it with zero parent reply markers.

Retain both existing unbound-send target controls (allowed-number and other-port receivers). They are additional evidence, not substitutes for the bound-reply sequence. All send-denial observations require a working positive receiver and are described only as evidence for their tested paths.

Any wildcard bind success is failure even if later delivery appears filtered. If the supported localhost selector cannot enforce IPv4-only behavior, fail; if IPv6 positive control is unavailable, mark incomplete. Neither permits broader localhost or IPv6 permission. No optional TCP exception is implemented by this plan.

## 4. Review, then bounded host-synthetic execution

Run the full fake-driven unittest suite and `git diff --check`. Review the code against the exact approved spec before invoking the real assessment: process ownership, no hidden socket inheritance, no broad outbound rule, fail-fast behavior, collision handling, output bounds, and unchanged existing profiles must be clear.

After review, execute only the explicit assessment CLI from this worktree with fresh scratch resources. Record the exact invocation and tool identities in the receipt. Do not run Gradle, native builds, devices, emulators, or external-network probes. Stop at the first failed/incomplete required control; retain its sanitized evidence and label later cases unexecuted. Do not repair a failed platform restriction by relaxing the policy.

Rerun the unit suite after any harness correction, distinguish harness errors from observed sandbox semantics, and require review for any changed scope. Clean only this run's owned resources.

## 5. Report and integration handoff

Produce a concise verification report and JSON with case IDs, hashes, protocol/family, synthetic ports, expected/observed outcomes, marker counts, bounded exit/category/timing, and final disposition. Scan retained artifacts for secrets, personal paths, raw environment values and unrelated device identifiers. Report actual executed cases separately from planned/unexecuted ones.

Obtain independent specification and code-quality review; resolve findings and rerun affected unit tests. Parent handles Bead updates and normal reviewed commit/push workflow. No deployment follows this tooling change.

A pass means only the measured synthetic matrix passed. It is not Gradle compatibility (actual Gradle uses wildcard/ephemeral UDP and may require daemon TCP), an app-attributed observer, fresh artifact acceptance, or proof that no unobserved send was attempted. A fail/incomplete outcome leaves strict deny-all and the existing compiled-model JUnit path as the approved baseline.

## Review checkpoint

The supervising agent reports **20 pure tests passing** after the bound-reply and bounded-output corrections, with independent review completed before host execution. The subsequent host assessment stopped at case 12 after 11 passes: experimental IPv6 bind was unexpectedly allowed; 24 remaining cases were not run. See the [actual execution report](../verification/2026-09-16-gradle-udp-controls.md) and its JSON receipt. Pure test success does not override this real containment failure; no weaker retry or runtime adoption follows.
