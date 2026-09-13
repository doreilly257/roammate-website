# Synthetic telemetry adapter implementation plan

> Agent workflow: root-reviewed plan, delegated TDD implementation and independent
> review. Bead `roammate-website-d4j` is the sole task/status tracker.

**Goal:** Implement only approved Option A of the
[reviewed design](../specs/2026-09-13-synthetic-telemetry-adapter-design.md): a
synthetic completion adapter and offline acceptance harness.

**Architecture:** Reuse the actual existing iOS `OfflineTelemetryProjection` and
synchronous gated collector. The adapter owns an issuer object and closed state;
each issued handle retains only issuer identity and its consumed bit. No registry,
SDK, network, timer, persistence or production invocation is added. Calls are
confined by the serial fixture harness, not advertised as thread-safe.

**Tech stack:** Existing Swift compiler/Foundation and Python standard library.
No dependencies, app launch, native XCTest runtime or `xcodebuild`.

## Exact files and shared-owner safeguards

Root explicitly selected direct surgical owner edits, preserving existing
uncommitted prerequisites rather than copying a dirty project to another tree.
The concurrent flag agent owns only `api/`; this task must not edit that subtree.
Record owner HEAD and SHA-256/snapshot of the existing dirty project and approved
projection before any edits. Preserve all existing project content byte-for-byte
except the four required additive membership entries.

- Create `roammate/Services/SyntheticTelemetryAdapter.swift`.
- `scripts/test-synthetic-telemetry-adapter.py`
- Modify `roammate.xcodeproj/project.pbxproj`: unique IDs in PBXBuildFile,
  PBXFileReference, Services group and Sources phase as owner AGENTS requires.

The Python harness generates its synthetic `main.swift` only in a temporary
directory, following the existing offline harness. App compilation membership is
not startup/service instantiation: no production caller or SDK wiring is added.
Root explicitly approved this narrow project-registration scope; no exemption
from owner instructions is used.

## Test-first sequence

1. Write the Swift fixture and Python compile/run harness first. The harness
   compiles the actual unchanged projector, proposed adapter path and fixture to a
   temporary executable with a temporary Swift module cache. Run
   `python3 scripts/test-synthetic-telemetry-adapter.py`; record expected RED
   because the adapter source/type does not yet exist, not a toolchain failure.
2. Implement a final adapter with injected gate/nonthrowing sink, optional handle
   issuance while open, completion taking handle/name/start/end/status, no-op
   flush and idempotent shutdown. Reject foreign handles before consuming;
   consume own handles before lifecycle/projection/collector callbacks. Use the
   existing projector and collector unchanged. No logging or return-value
   delivery claim.
3. Run the same command GREEN. Required fixture cases: 45 name/status mappings;
   exact four fields; rejected unknown/case/prefix/HTTP names; nonfinite,
   negative and reversed times; duplicate/changed-payload retries; identical
   payloads with different handles; foreign-handle ownership; disabled/reenabled
   gates including unconsumed handles issued while disabled; invalid-first
   consumption; same-handle reentrancy; shutdown from sink; flush/shutdown
   idempotence; post-shutdown pending handles/issuance; independent instances.
4. Poison fixture getters for raw attributes/IDs/URLs/messages/error text throw
   if accessed. The adapter receives only declared primitive fields; verify no
   poison access and no extra record fields. Inspect new source for forbidden
   SDK imports/network/clock/timer/persistence and confirm no app call sites or
   SDK wiring changed beyond required compilation membership. Tests use synthetic
   assertion output only.
5. Rerun `python3 scripts/test-offline-auth-telemetry.py telemetry` against the
   actual unchanged projector. No auth-source edits or full app tests are needed.

## Review and handoff

Run `git diff --check`, Python syntax validation without persistent bytecode and
the offline harness again, plus project plist validation. Compare the pre-edit
project snapshot with the result to prove only the four membership entries were
added; verify the projector hash is unchanged. Capture exact source hashes,
commands/counts and limitations. Obtain independent code/spec review, then root
rerun. No owner commit/push, merge, production integration or app build is
authorized. Root owns the main verification record, commit/push and Bead status.
