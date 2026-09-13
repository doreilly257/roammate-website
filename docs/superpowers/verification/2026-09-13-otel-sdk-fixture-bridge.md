# Real OTel SDK fixture bridge — offline verification

Date: 2026-09-13. Bead: `roammate-website-a2a`, following design `eag`.
Status: **Offline implementation independently reviewed and root rerun passed.**

## Approval and actual local scope

The user approved the provider-free `SpanData` fixture bridge in the
[reviewed design](../specs/2026-09-13-otel-sdk-fixture-bridge-design.md).
Root and independent review approved the
[implementation plan](../plans/2026-09-13-otel-sdk-fixture-bridge.md), then the
user separately approved the bounded compiler adjustment described below.

Owner: `/Users/doreilly/Work/roammate-app-ios`; recorded pre-edit HEAD
`5dcab9b1aaf2673f554e393c8e03936782f74bf9`. Changes are **local and uncommitted**:

- New `roammate/Services/OTelSDKFixtureBridge.swift`: 32-line SDK-typed bridge
  holding only an injected existing `SyntheticTelemetryAdapter`.
- New `scripts/test-otel-sdk-fixture-bridge.py`: guarded full-source SDK build,
  actual Codable fixtures, network controls and existing regression execution.
- Exactly four additive `project.pbxproj` membership lines for the new Swift
  file: build file, file reference, Services group and Sources phase.

No existing projector, synthetic adapter or their harnesses were changed.
Backend, auth, metadata and other dirty owner changes were preserved. Membership
permits compilation; source search found no app call site beyond the bridge's
declaration. No provider, tracer/span builder, processor, global SDK access,
instrumentation, transport or exporter was added.

The bridge reads only `hasEnded`, `status`, `name`, `startTime` and `endTime` from
the actual SDK value. Unfinished snapshots do not consume a fixture handle.
Ended snapshots map status cases without inspecting error text, convert the SDK
`Date` properties using `timeIntervalSince1970`, and pass the safe primitives to
the unchanged adapter/projector/collector. The sink still receives exactly
`name`, `start`, `end`, `outcome`; serial fixture execution and synthetic handle
identity remain explicit, not concurrent SDK callback or exactly-once guarantees.

## Actual SDK and compiler provenance

Core checkout:
`/Volumes/Overflow/DerivedData/roammate-gdszpracthwyqqbkrfjzlseryvys/SourcePackages/checkouts/opentelemetry-swift-core`.
Every complete harness invocation checks clean Git state and owner lockfile
agreement with **2.3.0**, revision
`240c8d5e36c3c7b774ed961325369f0b1f2c965f`.

Compiler: **Apple Swift 6.3.3** (`swiftlang-6.3.3.1.3`,
`clang-2100.1.1.101`), target `arm64-apple-macosx26.0`.

| Complete source module | Files | Sorted path/per-file-hash inventory SHA-256 |
| --- | ---: | --- |
| `OpenTelemetryApi` | 167 | `12fcd581e069b294c9759dbe381259c3fe739058c278641cfdc74f9ec1e0e106` |
| `OpenTelemetrySdk` | 147 | `81dee12b2f575de2b573f765835770c140881cf7760bae2cf023ca51f16a5472` |

All original Swift files in both module directories were compiled directly; no
SDK stub, private initializer access, source omission or SDK patch was used.
There was no SwiftPM resolution, package download or dependency update. This is
Darwin source-module acceptance, not a SwiftPM/Xcode package-build claim.

Module flags include `-swift-version 5 -parse-as-library -emit-library
-emit-module -package-name opentelemetry_swift_core
-whole-module-optimization -Onone`, explicit module/output/cache paths and only
the newly built temporary API/SDK module/library paths. `-Ounchecked` is not used.
The fixture executable is named `otel-fixture`, with a temporary build/module
cache and explicit synthetic resources rather than provider/default detection.

## Network boundary and compiler adjustment

Before **any** compiler/version/dependency command, each run starts IPv4
loopback-only TCP/UDP observer controls. Ordinary local children must deliver the
synthetic sentinel; the observer must receive it. The same clients under
`/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)'` must fail
specifically with `EPERM`/`EACCES`. Spawned children repeat these denials to check
inheritance. No external endpoint or DNS lookup is part of the controls.

All subsequent compiler and fixture children run under that unchanged outer
policy, with an explicit sanitized environment, empty temporary HOME and no
ambient `DYLD_*` or provider configuration. Existing adapter/projection harnesses
also run inside this boundary. No host-wide security setting was changed.

The original complete API attempt failed on missing package name and the
compiler's **nested** macro sandbox; see the retained
[historical attempt report](2026-09-13-otel-sdk-fixture-bridge-attempt.md).
The user then explicitly approved adding the package name and disabling only
Swift's inner subprocess sandbox while retaining outer all-network denial.
Root independently verified compiler help; root and independent review approved
the concrete retry route, including whole-module batching without disabling
preconditions.

`-disable-sandbox` is therefore used only on compiler commands already inside
the outer policy. The frontend's `-load-resolved-plugin` maps `SwiftMacros` to
the actual installed Apple macro library and a temporary probe/exec wrapper.
That wrapper runs in the **compiler-spawned process**, requires TCP and UDP
permission denials, writes a sanitized PID/denial receipt without touching
stdout, then `os.execv`s the actual Apple plugin server with its arguments and
stdin/stdout unchanged. The actual SDK/plugin implementation is not replaced.

Final implementer execution retained **two successful transient wrapper
receipts**. The observer listeners have closed before these later probes, so
connection refusal or timeout is explicitly not accepted as proof. The receipt
proves denied probes in the actual compiler-spawned wrapper before same-PID exec;
it does **not** claim the Apple plugin itself attempted sockets. Policy
inheritance across that exec is the stated boundary, not an independent packet
capture of the plugin process. Successful SDK macro compilation followed those
receipts; a missing/invalid receipt would fail the harness even after compilation.

| Actual installed Apple component | SHA-256 |
| --- | --- |
| `/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/usr/bin/swift-plugin-server` | `438b8b9027176baed23c149a51250a94dc6a6360116aa818523168d1c4df68c8` |
| `/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/usr/lib/swift/host/plugins/libSwiftMacros.dylib` | `c784a93aee72e0b1ad0305feb281c46f4e83cd3d5bf20761f23f2fa72e801870` |

No toolchain or SDK file was changed. Temporary wrappers, receipts and compiled
modules are cleaned by the harness; these hashes and source-controlled harness
logic describe reproduction, not a retained binary artifact.

## TDD sequence and final results

Reproduction command from the owner root:

```sh
python3 scripts/test-otel-sdk-fixture-bridge.py \
  --sdk-core /Volumes/Overflow/DerivedData/roammate-gdszpracthwyqqbkrfjzlseryvys/SourcePackages/checkouts/opentelemetry-swift-core
```

The first failure was a compiler-route prerequisite, **not** bridge RED. After
the approved adjustment, both real SDK modules compiled and two macro wrapper
receipts passed; only then did the expected missing
`OTelSDKFixtureBridge.swift` error establish intended RED. The minimal bridge
was subsequently written. A later fixture-only compile failure revealed that
the SDK's mutating `setting…` methods cannot be chained on returned value
copies; two fixture chains were split into separate calls. Neither failure is
misrepresented as a bridge behavior regression.

| Terminal receipt | Actual outcome |
| --- | --- |
| `57417` / `50f7a0` | Preflight-only controls passed, exit 0, before compiler tooling. |
| `92926` / `a1320b` | Original API compiler prerequisites failed, exit 1. No bridge RED or SDK fixture acceptance. |
| `54939` / `7a2e15` | Adjusted complete API/SDK build and two actual macro receipts passed; intended missing-bridge RED, exit 1. |
| `56055` / `123786` | Complete SDK build/receipts passed; two fixture setter-chain compile errors, exit 1. |
| `80960` / `7d3910` | Final complete harness and all regressions below passed, exit 0. |

Final results, separate suites rather than a deduplicated combined test count:

- **91 real SDK snapshot cases:** 45 name/status mappings, six invalid names,
  eight invalid date pairs, three zero-duration/finite-extreme cases, five
  lifecycle/gate/identity cases, 19 required-field omissions, four corrupt
  decode cases and one rich synthetic poison snapshot.
- Existing **73 synthetic adapter cases** and **three intended compiler-boundary
  rejections** passed.
- Existing **45 projection combinations**, rejected name/timing cases, gate
  rechecks and exact four-field inventory passed.

Fixtures decode actual `SpanData` using all required fields and explicit
`.secondsSince1970`; nonfinite dates use public SDK setters, not relaxed JSON.
Synthetic attributes/events/resources/links/IDs/error text remain outside the
output. Because concrete SDK getters cannot trap access, output canaries are
paired with source review confirming the five-field read allowlist. No arbitrary
snapshot or error description is printed.

Project plist validation and Python syntax checks passed. Focused owner
`swiftlint lint --quiet roammate/Services/OTelSDKFixtureBridge.swift` also passed
under sanitized outer network denial, session `17454`, chunk `afd41a`, exit 0
with no output. Owner and website diff checks passed.

## Dirty-state preservation and source hashes

Removing exactly four `OTelSDKFixtureBridge.swift` membership lines reproduces
the pre-edit dirty project byte-for-byte. Independent review repeated that proof.
Existing projection and synthetic-adapter hashes remained unchanged; their
preexisting registrations and all other dirty project content were preserved.

| Current source / snapshot | SHA-256 |
| --- | --- |
| New bridge | `b16fe2792fe40e811961a88d8770d95533ff1bcee85cfe0d32755dee8e07f814` |
| New harness | `39d7888145cc0f995cd27a9b4863306f2f54ae011b9e305c8434191aea47bc18` |
| Project before this task | `31238512d3922e8a9895ec37e1cb21f38d995d52e5ea2702eab6fc0627b943e8` |
| Project after four entries | `a5aa9b93420281ea00eed71588b0fc3b874feddc8a7e63bcd0c4930d5ff72c55` |
| Existing projector, unchanged | `93eba7cee3a60eb9af450cfd89933a7e6bdc312ac7f353070a41512524712603` |
| Existing synthetic adapter, unchanged | `cc64451256e907f9753277579e522d8d65aaccd3ee05a4506721c33680054d99` |

Temporary handoff directory `/tmp/roammate-otel-fixture-2026-09-13` contains the
pre-edit project/status/HEAD snapshots, `implementation.patch` and
`source-hashes.json`. The patch includes only the two new files and four
membership lines against that dirty baseline. This is temporary handoff material,
not an owner commit or durable backup.

## Independent acceptance and limits

Independent final source/spec/quality review approved with **no blocking
findings**, including the amended compiler boundary, fixture setter correction,
no-provider bridge, read allowlist and four-line project preservation. The
reviewer did not claim a separate test execution.

Root independently ran the complete harness and project plist validation:
session `89106`, terminal chunk `e9a04f`, exit **0**. Both full SDK modules
(314 original sources total) had the same source hashes, compiler and actual
plugin/library hashes; controls and two real compiler-spawned wrapper receipts
passed. Root reproduced **91 SDK cases, 73 adapter cases, three negative compiler
checks and 45 projection combinations plus gate/rejection checks**; plist
validation returned **OK**. Root also independently verified the current bridge
and harness hashes and repeated the exact four-line project stripping proof
against the pre-edit dirty snapshot; current project hash matched the table.

This acceptance is limited to the pinned real SDK **snapshot type and
projection**. No app build/launch, native XCTest runtime, actual span start/end
callbacks, provider registration, global SDK context use, real records, exporter,
release, deployment, owner commit or owner push was performed. Current live
telemetry is unchanged and not certified by this fixture work. Future SDK
versions, concurrency/consent races, callback identity mapping, Android runtime
no-egress and released journey baselines remain separate work.
