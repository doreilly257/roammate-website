# Unregistered OTel SDK fixture bridge — design only

Date: 2026-09-13. Bead: `roammate-website-eag`; follows synthetic adapter `d4j`.
Status: **Independently reviewed and root accepted; awaiting user implementation approval.**

## Goal and approval boundary

Prove that a small bridge can extract only the approved projection from the
**actual pinned Swift SDK snapshot type**, using entirely synthetic fixtures.
The user authorized this design, not bridge implementation, SDK changes, app
wiring or export. This is the next type-compatibility stage after the
[verified SDK-neutral adapter](../verification/2026-09-13-synthetic-telemetry-adapter.md),
not a live telemetry pilot or an Android change.

No owner files, package manifests, lockfiles or SDK checkout files were modified
for this design. No build, test, app launch, provider creation, callback
registration, instrumentation, credentials or telemetry request was performed.

## Verified local provenance

Source inspection used owner HEAD `5dcab9b1aaf2673f554e393c8e03936782f74bf9` plus
the existing uncommitted approved projector and synthetic adapter. Owner
`roammate.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`
SHA-256 was `de7e6a0a2bbfe0db51f46342327603e7c48a98c33bad1c3462fdd1e5475b3674`.

| Package | Pinned version | Pinned and actual clean checkout revision |
| --- | --- | --- |
| `opentelemetry-swift-core` | 2.3.0 | `240c8d5e36c3c7b774ed961325369f0b1f2c965f` |
| `opentelemetry-swift` | 2.3.0 | `df57cc4fd0b4cf4f9d715253c6aaba4b6912f7e0` |

Both checkouts were found beneath
`/Volumes/Overflow/DerivedData/roammate-gdszpracthwyqqbkrfjzlseryvys/SourcePackages/checkouts/`;
their Git HEADs match the lockfile and both returned clean status. The local Xcode
DerivedData setting identified that path; no application records were inspected.
These checkout paths are machine-local evidence, not portable dependencies.

Relevant paths inside the core checkout:

- `Sources/OpenTelemetrySdk/Trace/Data/SpanData.swift`: public `Equatable, Codable`
  value type with getters for name, dates, status and `hasEnded`. It has no public
  top-level initializer; public `setting…` methods permit fixture mutations.
- `Sources/OpenTelemetryApi/Trace/Status.swift`: `.ok`, `.unset`,
  `.error(description: String)`. Its textual description includes error text.
- `Sources/OpenTelemetrySdk/Trace/ReadableSpan.swift`: `toSpanData()` returns the
  SDK snapshot; `hasEnded` is available separately on a live readable span.
- `Sources/OpenTelemetrySdk/Trace/SpanSdk.swift`: unfinished snapshots substitute
  `clock.now` for an absent end time. Actual `end(time:)` suppresses repeated end
  calls, removes global span context and invokes the processor synchronously.
- `Sources/OpenTelemetrySdk/Trace/SpanBuilderSdk.swift`: `setNoParent()` selects
  the no-parent branch, but the helper still reads the global active span before
  selection and returns `parentContext ?? tracerSharedState.launchEnvironmentContext`.
  It therefore does not guarantee an absent effective parent when launch context
  exists; neither this helper nor that context path belongs in Option A.
- `Sources/OpenTelemetrySdk/Trace/SpanProcessor.swift`: synchronous start/end
  hooks and flush/shutdown requirements. This design does **not** implement or
  claim conformance to that protocol.
- `Sources/OpenTelemetrySdk/Resources/Resource.swift`: the default resource
  initializer reads the process name. `SpanData` declares a default `Resource()`;
  whether synthesized decoding elides that initializer was not tested. Do not
  claim zero ambient SDK reads merely because no provider is constructed.

## Options and recommendation

| Option | Benefit | Trade-off |
| --- | --- | --- |
| **A. Real `SpanData` from synthetic Codable fixtures — recommended** | Exercises actual SDK property/status/date types without constructing a provider, tracer or live span, and reuses the verified lifecycle adapter. | Proves snapshot mapping only; SDK callback delivery and actual span-end behavior remain untested. Fixture Codable layout is pinned-version-specific. |
| B. Private, unregistered provider producing synthetic spans | Would test actual builder/end/snapshot behavior without global provider registration or an exporter. | SDK source still accesses global context in these paths; requires extra clock/ID/context isolation and lifecycle acceptance. Separate future design, not silently added to Option A. |
| C. Register a processor on the application's provider | Would exercise real callback delivery. | Excluded: changes app wiring, privacy and duplicate-delivery boundaries; not covered by this approval. |

Recommend **A** as the smallest meaningful real-SDK step. Do not construct
`TracerProviderSdk`, `TracerProviderBuilder`, a tracer/span builder or a
`SpanProcessor` merely to manufacture fixtures. Do not import an exporter or
instrumentation package. The only SDK products needed are `OpenTelemetryApi`
and `OpenTelemetrySdk` from the verified core source.

## Proposed components and data flow

**Fixture factory, test-only:** decode an explicitly authored synthetic JSON
object into the real `OpenTelemetrySdk.SpanData` using its existing `Codable`
conformance. Supply all required pinned fields and valid fixed synthetic
trace/span IDs; these are test data, never generated from a user or SDK context.
Set `JSONDecoder.dateDecodingStrategy = .secondsSince1970` explicitly. This JSON
is a Swift fixture encoding, **not an OTLP payload or supported export format**.
Do not use `@testable` access, SDK source patches, a replacement `SpanData` type,
live captures or automatic fixture regeneration from real telemetry.
Use a fixed synthetic executable name and an explicit synthetic resource in each
decoded fixture; do not invoke resource detectors or omit resource data in the
hope that a default is empty. Potential SDK default process-name initialization
does not authorize reading, retaining or forwarding that resource through the
bridge.

**Bridge:** a tiny typed method accepts a real `SpanData` value plus a
fixture-issued `SyntheticTelemetryAdapter.Handle`. It reads only `hasEnded`,
`name`, `startTime`, `endTime` and the status enum case. It forwards the extracted
safe primitives to the existing adapter, which still owns issuer/lifecycle/gate
checks and calls the unchanged projector/collector. The bridge has no identity
registry, clock, queue, transport, SDK callback registration or background task.

**Sink:** the same injected synchronous, nonthrowing in-memory recorder used by
the existing synthetic adapter tests. No default/global service or exporter is
discoverable from this path. SDK snapshot values are neither retained by the
bridge nor exposed to the sink after extraction.

This stage necessarily accepts a richer **synthetic SDK object** at the outer
fixture boundary. It does not widen the existing adapter/projector inputs or
permit actual private span snapshots. Raw SDK fields remain confined to authored
test objects and cannot be accepted as production telemetry under this design.

## Exact projection and timing

The sink record remains exactly `name`, `start`, `end`, `outcome`. Reuse the
existing case-sensitive 15-name allowlist without normalization or new aliases:

```text
auth.apple
auth.google
auth.facebook
auth.email
auth.register
websocket.connect
websocket.send
excursion.join
excursion.leave
excursion.create
connect.loadNearby
chat.loadMessages
chat.sendMessage
profile.load
profile.update
```

| SDK input | Safe adapter input |
| --- | --- |
| `name` | Same string, validated by the existing projector. |
| `startTime: Date` | `startTime.timeIntervalSince1970`, seconds. |
| `endTime: Date` | `endTime.timeIntervalSince1970`, seconds. |
| `.ok` | `.success` → `"success"`. |
| `.unset` | `.unset` → `"unknown"`. |
| `.error(description: …)` | `.error` → `"error"`; associated text is discarded without binding, formatting or inspection. |

The pinned source's comments mention nanoseconds, but its properties are
Foundation `Date`. Do **not** divide or multiply their epoch seconds, interpret
them as Unix nanoseconds, or use seconds since Foundation's 2001 reference date.
The unchanged projector rejects nonfinite, negative-start and reversed times;
zero-duration spans are allowed. No duration or timestamp-source field is added.

Do not call `String(describing:)`, `description`, JSON encoding or reflection on
the whole snapshot/status. Do not read attributes, events, resources, links,
scope, trace/span/parent IDs, flags, platform/build labels, URLs, messages,
locations, exception text or any hashes derived from them. Error classification
is the SDK status case only, not an interpretation of HTTP or error attributes.

## Snapshot versus lifecycle boundaries

`hasEnded == false` is rejected **before** name/status/date extraction and before
calling the synthetic adapter. It is not a completion opportunity: the same
still-unconsumed fixture handle may later be submitted with an ended snapshot.
This prevents the SDK's provisional end time from masquerading as completed
timing. Fixture JSON decode failure likewise invokes no bridge/adapter operation.

For an ended snapshot, the bridge forwards one completion opportunity to the
existing adapter. Its established rules are unchanged: own handles consume even
on invalid name/time, disabled gate or closed lifecycle; foreign handles are not
consumed; retries cannot revive a consumed handle. Two independently issued
handles carrying the same snapshot remain distinct. The bridge must never use
SDK trace/span IDs, value equality or timestamps to infer identity or claim
exactly-once SDK delivery.

The fixture explicitly owns the one-handle-per-synthetic-operation convention.
No real callback-to-handle mapping or deduplication policy is being implemented.
Flush/shutdown are the existing adapter's no-op/terminal synthetic lifecycle,
not promises to satisfy `SpanProcessor` flush/shutdown semantics. All calls,
gate changes and recorder callbacks run in one caller-enforced serial fixture
context; no cross-thread SDK safety is inferred from these tests.

## Offline build and isolation requirements for a later plan

No build is authorized by this design pass. After separate implementation
approval, the plan must identify a standalone local fixture target using the
actual pinned API/SDK sources, with no application startup target or global
provider setup. Any new owner Swift file must follow owner AGENTS membership
rules without creating a production call site; temporary generated test Swift
does not become application source.

Preflight must verify the recorded lockfile/checkouts and every required local
dependency before compiling. The core package manifest declares `swift-atomics`
even though its SDK target dependency is Linux-conditional; do not assume macOS
execution eliminates package resolution. No package update, remote resolution,
download, SDK source edit, extra plugin, exporter or dependency upgrade is
authorized. If the selected offline build route cannot run with available
verified local material and network disabled, stop and report that precise
prerequisite instead of fetching or substituting SDK stubs.

Use an isolated temporary build/module cache and sanitized environment; do not
load app credentials or endpoint configuration. Disable package telemetry and
optional build plugins. The later plan must demonstrate the chosen no-network
boundary before executing dependency/build tooling; absence of an exporter in
application source alone is not proof that tooling performed no network I/O.
Never launch an app/emulator or run `xcodebuild` concurrently with other agents.

## Required synthetic acceptance

Future implementation acceptance must include:

- Compile the bridge against verified real SDK products without `@testable`,
  private initializer access, patched SDK declarations or a mocked snapshot type.
  Record compiler/toolchain, checkout revisions, source hashes and build route.
- All 15 names × three real SDK status cases preserve exact four-field records
  and unchanged values. Use fractional epoch-second fixtures to catch mistaken
  nanosecond scaling and Foundation reference-date conversion.
- Explicit zero-duration, pre-1970, reversed and extreme/nonfinite `Date`
  cases. Where JSON cannot encode nonfinite numbers, construct those `Date`
  values through public SDK fixture setters; do not weaken JSON parsing or
  change production validation to manufacture a case.
- Non-ended snapshot → no sink call and no consumed opportunity; an ended
  fixture with the same handle can then complete once. An ended invalid-time or
  invalid-name attempt consumes its opportunity, unlike the non-ended probe.
- Missing/malformed fixture fields fail decoding and never call the bridge.
  Treat errors as test failures or deliberate negative cases, without printing
  arbitrary snapshots or full decoded error payloads.
- SDK fixtures with synthetic poison attributes/events/resources/links/IDs and
  error text still yield the identical four-field safe result. Concrete SDK
  properties cannot be replaced with trap getters: pair canary-output assertions
  with direct bridge source review proving only the five permitted SDK fields
  are read. Output absence alone does not prove fields were never accessed.
- Existing 73 synthetic adapter cases, three compiler-boundary tests and the
  existing projection harness continue to pass. Add bridge-level gate-off,
  duplicate, equal-snapshot/distinct-handle, foreign-handle and shutdown cases;
  no change to their established serial semantics is allowed.
- Static/source and executed harness evidence shows no provider/tracer/span
  construction, `OpenTelemetry` singleton access, processor registration,
  instrumentation, exporter, HTTP client, credentials, persistent SDK data or
  production call sites. No new external traffic is permitted; only bounded
  synthetic case counts and sanitized diagnostics leave the in-memory fixtures.

Passing this stage establishes compatibility only with the pinned **snapshot
type and projection**. It does not establish actual SDK start/end callbacks,
live consent/logout races, exporter behavior, app-target compilation, Android
parity, released events or journey baselines. A newer SDK revision requires a
fresh API review and fixture rerun rather than inherited acceptance.

## Review and next question

Root reviewed the written design and pinned SDK source with no blocking findings.
Independent review approved after two provenance clarifications: SDK default
resource initialization may read the process name, and `setNoParent()` still has
global/launch-context interactions. Both are documented above; the recommended
provider-free snapshot boundary is unchanged. Neither review executed a build,
created a provider or authorized implementation.

Root presents the reviewed written design to the user.
Recommended option is A: implement only this real-snapshot fixture bridge and
offline tests, leaving provider construction, registration and app wiring absent.
Alternative B requires revising this design to address actual SDK context
interactions before implementation. No implementation plan or owner edits start
until the written scope is separately approved; accepting this design does not
approve a live processor or export.
