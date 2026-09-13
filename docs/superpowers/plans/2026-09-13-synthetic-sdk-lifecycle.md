# Synthetic SDK Lifecycle Implementation Plan

> For agentic workers: execute using the reviewed plan and TDD; independent
> source/spec review is required. Root owns Bead wowl and commit/push. Beads,
> not Markdown checkboxes, tracks progress.

**Goal:** Verify actual pinned SDK start/end callbacks with synthetic-only handle
ownership and the explicitly approved in-flight shutdown contract.

**Architecture:** Extend the accepted offline compiler harness with an optional
lifecycle fixture module. The module generates standalone Swift containing a
fixture-only processor and acceptance cases; no app Swift source or project
membership changes. Actual `SpanSdk.startSpan` receives all explicit synthetic
inputs. Reuse the unchanged bridge, adapter and projector.

**Tech stack:** Python standard library, Swift 5 language mode on the accepted
Apple toolchain, complete pinned OpenTelemetryApi/SDK 2.3.0 sources and existing
verified outer network-denial controls.

## Scope and files

Approved [design](../specs/2026-09-13-synthetic-sdk-lifecycle-design.md).
User explicitly approved implementation including the fact that a completion
already in its gate may deliver once after that gate shuts down the processor.

Owner `/Users/doreilly/Work/roammate-app-ios`:

- New `scripts/otel_sdk_lifecycle_fixtures.py`: Swift implementation and test
  strings, fixed negative-process modes/expected diagnostics only.
- Modify `scripts/test-otel-sdk-fixture-bridge.py`: add `--lifecycle`; when set,
  append the generated fixture source to the existing 91-case executable and
  run its separate negative-process modes under the same sanitized outer policy.
  Default invocation preserves existing behavior. No generic arbitrary extension
  loading or new compile flags are introduced.
- Existing Services Swift, project file, lockfile, SDK checkout and other owner
  files remain unchanged. Capture their hashes, dirty status and original harness
  bytes before edits. Root selected direct surgical edits to preserve the approved
  uncommitted prerequisite harness rather than a disconnected worktree.

Website report to create after verification:
`docs/superpowers/verification/2026-09-13-synthetic-sdk-lifecycle.md`.
No owner commit/push, SDK/provider execution outside the verified fixture, app
launch/build, dependency tools/downloads, exports or app-target registration.

## Ordered implementation steps

### 1. Preserve baseline and add failing acceptance fixtures

Read current owner instructions and accepted harness, capture relevant baseline
bytes/hashes plus HEAD/status under a new temporary handoff directory. Record
unrelated dirty files without reading personal records or credentials.

Add `--lifecycle` selection and a fixed import of the sibling fixture module.
Keep preflight ordering, sanitized environment, all 314 original SDK source files,
actual macro-wrapper permission receipts and regression runs unchanged. Compile
the lifecycle fixture with the already accepted flags/imports/linking. Initial
fixture refers to not-yet-defined `LifecycleProcessor` to establish an intended
missing-implementation RED after successful SDK compilation.

Command from owner root (same command for RED, GREEN and root rerun):

```sh
python3 scripts/test-otel-sdk-fixture-bridge.py --lifecycle \
  --sdk-core /Volumes/Overflow/DerivedData/roammate-gdszpracthwyqqbkrfjzlseryvys/SourcePackages/checkouts/opentelemetry-swift-core
```

Any SDK/toolchain/isolation prerequisite failure is not lifecycle RED: stop and
report it without weakening the boundary. `--preflight-only --lifecycle` remains
available and performs no SDK/compiler command.

### 2. Implement minimal fixture processor

Implement a class conforming to actual `SpanProcessor`. Capture the constructing
thread; assert that thread at entry to all stateful fixture methods before any
map, gate or adapter mutation. Cross-thread negative fixture must fail with a
fixed diagnostic and nonzero exit, never a racing positive test.

Processor owns one adapter/bridge, active identity-to-handle map, strong seen
identity-to-span registry and terminal closed flag. On start, reject closed or
seen object, enforce seen.count <256 before handle allocation, then make/store
the owned handle and strongly retain the span. All registry instrumentation is
fixture-only; expose fixed counters as needed to assert no handle mint/snapshot
occurs on rejected paths, never raw SDK contents.

On end: thread check, closed/identity/mapping checks, unfinished check, remove
active handle, then snapshot and submit. Strong seen entries persist until
shutdown; repeated start cannot remint completed ownership. Shutdown marks closed
before clearing maps and adapter shutdown, and is idempotent; explicit deferred
shutdown breaks span/processor retention cycles. Flush is a no-buffer no-op.

The processor does not read context IDs or other raw fields. Only actual eligible
span snapshot creation feeds the accepted bridge. Test callbacks injected by
the fixture are labeled separately from real SDK callback observations.

### 3. Complete acceptance matrix

Generate actual SDK spans with explicit fixed valid context IDs, scope/resource,
nil parent, false remote-parent, internal kind, limits, attributes/links, fixed
clock and explicit dates. Never create/register provider/tracer or active scopes.
Assert disposable initial/final active span nil; real end's global removal is
acknowledged and allowed only inside this fresh process.

Cover all 45 name/status mappings; start-before-return and settled real-end
callback; actual duplicate-end suppression; manually injected duplicate start/end,
unknown and early unfinished end; same IDs/different objects and foreign
processor isolation; final name/time invalidity; both gate transition cases;
gate/sink reentry, another eligible ended object, reentrant start; flush/shutdown,
pending and late hooks. Gate-triggered shutdown returning true must deliver the
already-entered completion once but reject all later hooks.

Use a separate negative executable invocation mode for cross-thread violation
and registry overflow (257th distinct start); require nonzero termination and
the exact fixed diagnostic. The Python harness must run these modes through the
same `run` policy, capture output, validate expected failure and not print raw
backtraces. Positive 256-object case plus source/state checks establish boundary
ordering and no eviction. Check weak span/processor references release after
explicit shutdown. Use controlled test-double hooks only where needed to prove
no snapshot on rejected objects, clearly separated from actual SDK lifecycle.

Synthetic poison fields stay out of records and normal diagnostic output. All
captured records retain exactly name/start/end/outcome and existing validation.
Do not log span descriptions or context values. Test assertion labels are fixed.

### 4. Run GREEN and regressions

Run the full command above under unchanged outer policy. Require lifecycle
positive/negative results plus existing 91 snapshot, 73 adapter, 3 compile-negative
and 45 projector combinations/gates. Count lifecycle cases from actual execution,
not a predicted total. Classify fixture compilation corrections separately from
intended missing-implementation RED; keep source unchanged if build prerequisite
fails. Do not run concurrent SDK builds or xcodebuild.

Check Python syntax without leaving bytecode in owner, owner/website whitespace,
and exact pre/post hashes for every unchanged prerequisite. Record targeted
harness patch/new file hashes for handoff. Existing default harness invocation
must still retain its baseline semantics by source review and full retained suites.

### 5. Independent acceptance and handoff

Send source and evidence to completion_slices for independent spec/quality review;
fix actual findings, rerun affected gates, then notify root for one independent
full command rerun. Root handles Bead closure and website report commit/push.
Report exact commands, source/toolchain hashes, RED/GREEN failures and scope of
network proof, counts and limitations. No app/provider/export acceptance claim.

## Review gate

Independent and root plan review approved before owner edits or SDK execution.
Implementation and author verification evidence are recorded in the
[verification report](../verification/2026-09-13-synthetic-sdk-lifecycle.md);
root independent rerun passed that final local-fixture acceptance gate.
