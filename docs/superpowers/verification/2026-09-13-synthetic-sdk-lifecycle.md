# Synthetic SDK lifecycle verification

Date: 2026-09-13

Bead: wowl

Status: Source/spec review approved; final author and independent root runs passed.
This is local fixture verification, not app integration.

## Authorized scope and implementation

The user approved the reviewed
[design](../specs/2026-09-13-synthetic-sdk-lifecycle-design.md), including the
explicit rule that an already-entered completion may deliver once if its gate
shuts down the processor and then returns true. The
[implementation plan](../plans/2026-09-13-synthetic-sdk-lifecycle.md) passed
independent and root review before owner edits.

Exactly two owner script files changed:

- New `scripts/otel_sdk_lifecycle_fixtures.py`: generated standalone Swift fixture
  processor, actual SDK lifecycle tests and explicitly labeled defensive doubles.
- `scripts/test-otel-sdk-fixture-bridge.py`: optional `--lifecycle` fixed sibling
  fixture loading and negative-process checks using the existing sanitized,
  network-denied runner. Default invocation still runs its existing fixture.

No application Swift, project membership, lockfile, SDK source, provider,
exporter or application caller was added or changed. No xcodebuild, application
launch, simulator, personal records, owner commit/push or deployment was used.
These owner changes remain local/uncommitted for owner handoff; the root manages
website documentation commits independently.

## Reproducible command and boundary

From `/Users/doreilly/Work/roammate-app-ios`:

```sh
python3 scripts/test-otel-sdk-fixture-bridge.py --lifecycle \
  --sdk-core /Volumes/Overflow/DerivedData/roammate-gdszpracthwyqqbkrfjzlseryvys/SourcePackages/checkouts/opentelemetry-swift-core
```

The accepted [SDK fixture verification](2026-09-13-otel-sdk-fixture-bridge.md)
describes the unchanged complete-module compilation and isolation controls.
Before any compiler/version/dependency command, the runner verifies local TCP
and UDP observer positive controls, explicit sandbox permission denial and
spawned-child inheritance. Every compiler, executable and regression child uses
`sandbox-exec` with `(version 1) (allow default) (deny network*)` and a freshly
constructed environment with temporary HOME/TMPDIR and no inherited loader,
credential or tracing settings.

The actual compiler-spawned SwiftMacros wrapper requires TCP/UDP EPERM/EACCES,
then execs the unchanged Apple plugin server in the same PID with unchanged
protocol streams. Successful runs require sanitized receipts. This observes the
wrapper's socket attempts and relies on exec inheritance; it does not claim the
Apple plugin itself attempted sockets or that a packet capture was performed.

The existing approved inner-only `-disable-sandbox`, package-name and full-module
`-Onone` route is unchanged. No stubs, source omissions, SDK patches, downloads,
SwiftPM resolution or `-Ounchecked` are used. The two negative lifecycle modes
run under the same outer policy and must exit nonzero with their exact fixed
stderr diagnostic; captured output/backtraces are not dumped.

## Provenance

Core SDK version 2.3.0 revision:
`240c8d5e36c3c7b774ed961325369f0b1f2c965f`.
Actual compiler: Apple Swift 6.3.3 (`swiftlang-6.3.3.1.3`,
`clang-2100.1.1.101`), target arm64-apple-macosx26.0.

Complete sorted path/per-file-hash source inventories:

| Module | Original sources | Inventory SHA256 |
|---|---:|---|
| OpenTelemetryApi | 167 | `12fcd581e069b294c9759dbe381259c3fe739058c278641cfdc74f9ec1e0e106` |
| OpenTelemetrySdk | 147 | `81dee12b2f575de2b573f765835770c140881cf7760bae2cf023ca51f16a5472` |

Actual Apple `swift-plugin-server` SHA256:
`438b8b9027176baed23c149a51250a94dc6a6360116aa818523168d1c4df68c8`.
Actual `libSwiftMacros.dylib` SHA256:
`c784a93aee72e0b1ad0305feb281c46f4e83cd3d5bf20761f23f2fa72e801870`.
Their exact installed paths remain documented in the preceding SDK report and
are printed by the unchanged runner on each full invocation.

## RED/GREEN chronology and review

1. Intended RED `55574` / `8b6efb`, exit **1**: network controls, all 314 original
   SDK sources and two compiler macro receipts passed; lifecycle fixture then
   failed compilation because `LifecycleProcessor` did not yet exist. This was
   the expected missing implementation, not a compiler prerequisite failure.
2. First GREEN `7984` / `d45385`, exit **0**: 61 lifecycle cases, two lifecycle
   negative processes, 91 SDK snapshot cases, 73 synthetic adapter cases, three
   negative-compilation boundaries and 45 projection combinations/gates passed.
3. Three remaining planned acceptance cases were added without changing the core
   processor: held actual-ended other-object reentry, observable rejected-snapshot
   boundaries and completed-registry lifetime. Expanded GREEN `30496` / `e536c9`,
   exit **0**, passed **64 lifecycle cases and two negative lifecycle processes**,
   all retained 91/73/3/45 suites and the full 314-source compilation with two
   macro-wrapper permission receipts. No compiler or fixture correction was
   needed between intended RED and these successful runs.
4. Independent reviewer approved the complete source/spec with no blocking
   findings; the reviewer performed source inspection only, not a parallel build.
5. Root independent rerun `6318` / `6a6e37`, exit **0**, passed the final 64
   lifecycle cases and two negative processes, all retained 91/73/3/45 suites,
   all 314 SDK sources with matching inventories/toolchain/plugin hashes and two
   macro-wrapper permission receipts. Root independently verified all five
   protected source/project/lockfile hashes unchanged.

Counts describe separate suites, not a deduplicated total. The negative process
fixtures separately exercise thread confinement and the 257th distinct start;
their fixed diagnostics are `synthetic-lifecycle-thread-violation` and
`synthetic-lifecycle-capacity-exceeded`.

## Behavioral evidence and limits

The fixture uses public `SpanSdk.startSpan` with explicit synthetic IDs, nil
parent, resource, scope, clock and dates. Its real synchronous start hook owns a
handle before start returns; real end settles its timestamp and removes
process-global context before the real synchronous end hook. Initial and final
active context assertions concern only the fresh disposable process. This is
not zero global SDK access and does not exercise providers/builders/sampling.

Ownership is object identity, not SDK IDs. The seen registry strongly retains
at most 256 distinct objects; overflow fails before handle allocation. Completed
objects remain seen so duplicate injected starts cannot remint ownership; pending
and completed references are cleared on explicit shutdown to break cycles.
Eligible active entries are removed before snapshot creation and external
callbacks. Unknown, unfinished, consumed and closed paths do not materialize a
snapshot. The observable `ReadableSpan` double proves getter boundaries without
pretending concrete SDK getters were instrumented.

Real repeated SDK end is suppressed; defensive duplicate/reordered hook tests
are deliberately labeled manual injections. The held-ended fixture uses actual
SDK end plus a fixture-only forwarding processor which intentionally defers its
hook. Reentry, gate transitions, invalid final inputs, flush, terminal shutdown
and late hooks retain the reviewed semantics, including in-flight delivery after
gate-triggered shutdown. Tests do not establish production thread safety.

Only name/start/end/outcome reaches the in-memory sink, using the existing 15-name
allowlist, finite nonnegative epoch seconds and success/error/unknown values.
SDK snapshots internally copy synthetic raw fields; no real user span handling
or raw-data minimization claim is inferred from this fixture. Synthetic poison
fields are never output as records or normal diagnostics. No exporter exists.

## Source preservation and handoff

Temporary evidence directory:
`/tmp/roammate-sdk-lifecycle-2026-09-13/` contains original harness bytes, HEAD and
dirty-status receipts, baseline/source hashes and a patch against that dirty
baseline. This temporary directory is not a durable owner commit or backup.

Current two-script SHA256 values:

- Harness: `02a758d7e8372bd9be224f149167dbb7248687cd8da23cc8f998ba6bc941e5cd`.
- Fixture: `a5e6c09f54e7764d76da73d5b275749dceadc796ebdb3dbefca7853c61b98564`.
- Original harness: `39d7888145cc0f995cd27a9b4863306f2f54ae011b9e305c8434191aea47bc18`.

Verification `992826`, exit **0**, parsed both Python files with `ast.parse`
without bytecode writes, checked their whitespace, and confirmed all five
protected baseline hashes unchanged: snapshot bridge, adapter, projector,
project file and lockfile. Website `git diff --check` also passed. The new
documents still require the root's staged whitespace check when added.

Unchanged protected SHA256 values:

| Owner path | SHA256 |
|---|---|
| `roammate/Services/OTelSDKFixtureBridge.swift` | `b16fe2792fe40e811961a88d8770d95533ff1bcee85cfe0d32755dee8e07f814` |
| `roammate/Services/SyntheticTelemetryAdapter.swift` | `cc64451256e907f9753277579e522d8d65aaccd3ee05a4506721c33680054d99` |
| `roammate/Services/OfflineTelemetryProjection.swift` | `93eba7cee3a60eb9af450cfd89933a7e6bdc312ac7f353070a41512524712603` |
| `roammate.xcodeproj/project.pbxproj` | `a5aa9b93420281ea00eed71588b0fc3b874feddc8a7e63bcd0c4930d5ff72c55` |
| `roammate.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` | `de7e6a0a2bbfe0db51f46342327603e7c48a98c33bad1c3462fdd1e5475b3674` |

The approved local fixture stage passed independent verification. Owner changes
remain uncommitted; no provider, application wiring, exporter, live telemetry or
production concurrency acceptance is implied.
