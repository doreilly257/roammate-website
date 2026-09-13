# Offline OTel SDK fixture bridge implementation plan

> Root and independent plan review precede delegated TDD implementation. Bead
> `roammate-website-a2a` is the sole task/status tracker.

**Goal:** Implement approved Option A of the
[SDK fixture design](../specs/2026-09-13-otel-sdk-fixture-bridge-design.md), proving
real pinned `SpanData` extraction without provider/span construction or export.

**Architecture:** Decode authored synthetic JSON into actual SDK snapshots. A
small bridge rejects unfinished snapshots, maps only name/Date/status and calls
the unchanged synthetic adapter. The offline harness compiles unmodified actual
SDK source modules directly on Darwin, avoiding package-manager resolution.

**Tech stack:** Existing macOS sandbox-exec, Python standard library, Swift
compiler, verified OpenTelemetry Swift core 2.3.0. No package downloads or edits.

## Exact scope and pre-edit preservation

Owner: `/Users/doreilly/Work/roammate-app-ios`; snapshot HEAD, dirty status,
project bytes and existing projector/adapter hashes before edits. Root selected
direct surgical changes; preserve other agents' `api/` and all dirty owner files.

- Create `roammate/Services/OTelSDKFixtureBridge.swift`.
- Create `scripts/test-otel-sdk-fixture-bridge.py`; it generates temporary
  synthetic Swift/JSON rather than adding fixture Swift to the app target.
- Add exactly four membership lines to `roammate.xcodeproj/project.pbxproj`
  (build file/reference/group/Sources), as owner AGENTS requires. No production
  call site, service initializer, provider/processor/exporter or global SDK use.

Do not modify either existing safety layer or its harness. No owner commit/push,
app launch, native XCTest runtime or `xcodebuild` is authorized.

## 1. Establish the no-network boundary before build tooling

The harness must first validate Darwin and `/usr/bin/sandbox-exec`. Use a local
loopback-only Python TCP listener and confirm an ordinary local child can connect
to it. Then execute the same client under a sandbox policy allowing default
operations but **denying all network operations**; require an explicit permission
denial, not merely a timeout/refused connection. Repeat inside a spawned child to
prove inheritance. Exercise UDP socket/send denial too; no external destination,
DNS query, credential, production request or host-wide firewall change is needed.

All later compiler and fixture subprocesses run under that same network-denying
sandbox policy, with explicit sanitized environment, empty temporary HOME and
temporary build/module caches. No shell inheritance of provider configuration.
If the sandbox cannot be established or controls do not discriminate, stop before
any build/dependency command and report the exact failure. Do not substitute an
untested proxy, env flag or source-only no-network assertion.

## 2. Verify and compile actual pinned modules offline

Require an explicit local core checkout argument. Before compilation check its
clean Git state and exact revision
`240c8d5e36c3c7b774ed961325369f0b1f2c965f`, and owner `Package.resolved` core version
2.3.0/revision match. Record the entire API/SDK Swift source inventory and hashes.
No checkout reset, SDK source edit or package-manager invocation is permitted.

Read-only inventory found 167 API and 147 SDK Swift source files. On Darwin the
SDK's Atomics import is conditional on `!canImport(Darwin)`, and the core package
has no API/SDK resources or mandatory build plugin. Compile all original sources
for each module directly with `swiftc -swift-version 5 -emit-library -emit-module`,
explicit module names `OpenTelemetryApi` then `OpenTelemetrySdk`, temporary module
cache/output, and SDK's import/link search path pointing only to those temporary
products. Do not copy reduced SDK types, omit source files to evade errors, or
call `swift package` to resolve the manifest's declared Atomics dependency.

Compiler/library commands and the fixture executable remain under the verified
network sandbox. Record compiler version and actual module source digests. If
the complete pinned source does not compile through this route, stop with exact
diagnostics for root review rather than add dependencies, patch SDK code or
switch to downloaded/prebuilt unverified modules. This is source-module fixture
acceptance, not a SwiftPM or Xcode package-build claim.

### Observed compiler prerequisites — execution stopped for approval

The first authorized complete API module attempt passed the network controls but
failed before SDK or bridge compilation. Swift 6.3.3 requires `-package-name` for
the pinned sources' package-access declarations. Its bundled `@TaskLocal` macro
server also failed because the nested compiler sandbox could not be applied
(`sandbox_apply: Operation not permitted`). This is a compiler-route failure,
**not** the intended missing-bridge RED and not evidence of a defective SDK.

Root verified under the unchanged outer network-denying policy that the compiler
documents `-disable-sandbox` for its own subprocess sandbox, then requested
explicit approval for that narrowly scoped adjustment plus the package name.
At that stop neither flag had been applied to a build and no retry was authorized
while the answer was pending. Any amended route must keep the outer all-network denial,
sanitized environment and inherited child boundary intact; it may not remove
SDK source, omit the macro or run a compiler/plugin outside that boundary.
See the [attempt evidence](../verification/2026-09-13-otel-sdk-fixture-bridge-attempt.md).

### Subsequently approved bounded compiler adjustment

The user subsequently explicitly approved testing the package-name and
inner-sandbox adjustment while retaining verified outer network denial. Root
and independent review must accept this concrete amendment before a retry:

- Add `-package-name opentelemetry_swift_core` consistently to the two actual SDK
  module commands, and `-disable-sandbox` only to compiler invocations already
  enclosed by the unchanged outer `sandbox-exec` policy.
  Root also approved `-whole-module-optimization -Onone` for bounded compilation
  batching of the same complete sources; do not use `-Ounchecked` or disable
  fixture preconditions.
- Use the compiler's documented `-load-resolved-plugin` mapping for
  `SwiftMacros`, pointing to the actual installed Xcode `libSwiftMacros.dylib`
  and a temporary executable wrapper. The wrapper is not a replacement macro:
  it runs explicit TCP/UDP permission-denial probes in the compiler-spawned
  process, writes only a sanitized PID/denial receipt, then `exec`s the actual
  installed Xcode `swift-plugin-server` with its arguments and stdin/stdout
  untouched. No host toolchain file or SDK source is modified.
- The probes use the same loopback endpoints whose working observer controls
  already passed. They must fail specifically with `EPERM`/`EACCES`; absence of
  a successful compiler-spawned wrapper receipt is a hard failure, even if the
  SDK compiles. Probe output must not corrupt the compiler's plugin protocol.
  Record actual plugin/library paths and hashes. The wrapper's `exec` preserves
  process identity and the inherited outer policy; do not claim that generic
  child controls alone prove this real plugin route.
- Re-run all initial positive/negative controls on each invocation. Empty HOME,
  fixed executable names, sanitized environment (no ambient `DYLD_*`), complete
  source inventory and no dependency resolution remain mandatory. On any
  unsupported flag, plugin mapping, missing receipt or isolation failure, stop
  without a weaker fallback.

This adjustment addresses build-tool compatibility only. It does not authorize
provider creation, app startup, altered SDK behavior, source omission or network
access, and cannot be reported as bridge RED/GREEN until those stages are reached.

## 3. TDD bridge and fixtures

Write the harness/fixtures first. After preflight and verified SDK module build,
run `python3 scripts/test-otel-sdk-fixture-bridge.py --sdk-core <verified-path>`
and capture RED caused by the absent bridge source/type. Do not count an SDK
compilation or decode-fixture defect as the intended bridge RED.

Implement a small bridge holding only an injected existing
`SyntheticTelemetryAdapter`. Its submit method accepts that adapter's handle and
real `SpanData`. Guard `hasEnded` first, then switch SDK `.ok/.unset/.error` to the
existing status cases without binding error text. Forward unchanged name and
`Date.timeIntervalSince1970` through the actual synthetic adapter. No new
registry/gate/lifecycle implementation: callers retain the adapter and use its
existing handle/flush/shutdown methods. No snapshot retention or Codable output.

Fixture construction uses real `JSONDecoder`, explicit `.secondsSince1970` and
all required SDK fields, fixed valid synthetic identifiers and synthetic
resource/scope values. SDK snapshot property/setter tests use actual public APIs,
not `@testable` or patched declarations. Execute a fixed-name synthetic binary;
never print decoded snapshots or associated error text.

GREEN acceptance covers:

- 45 actual SDK name/status combinations with fractional epoch seconds and
  exact four-field output.
- Zero duration, negative/pre-1970, reversed and nonfinite/extreme public-Date
  setter cases; invalid names/case/prefix/HTTP variants rejected.
- Unfinished probe leaves a handle unconsumed; later ended snapshot completes
  once. Ended invalid input consumes, so corrected retry cannot revive it.
- Duplicate, same-snapshot/different-handle, foreign handle, gate transitions
  and shutdown use unchanged synthetic adapter semantics.
- Required-field omission/corrupt JSON fail decoding without invoking bridge.
- Real SDK snapshots containing synthetic poison attributes/events/resources,
  links/IDs and error text still emit only the safe fields. Pair output-canary
  assertions with source review allowing reads of only `hasEnded`, `name`,
  `startTime`, `endTime`, `status`; concrete SDK getters cannot be trap fixtures.

## 4. Preservation, regressions and independent acceptance

Run the completed harness again under the verified boundary. Run the existing
73-case/three-negative-compilation adapter harness and 45-case projection harness
under the same no-network sandbox and sanitized environment; validate project
plist and Python syntax. Run diff checks and focused bridge lint where available.
Strip the four new project lines and compare byte-for-byte with the dirty
pre-edit snapshot; existing projector/adapter hashes must remain unchanged.

Independent reviewer checks actual source, full-SDK provenance, no-provider or
SDK-singleton paths, isolation controls and exact additive project entries.
Root independently reruns the bounded acceptance commands. Record hashes,
RED/GREEN receipts and any limitations in the main verification report. Root
owns website commit/push and Bead status. No implementation finding authorizes a
dependency change, live SDK callback, app build, release or export.
