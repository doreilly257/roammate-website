# Production telemetry integration implementation plan

> **For agentic workers:** Use the `subagent-driven-development` skill for execution, with independent specification and code review. This document describes implementation units, not status tracking: use Bead `roammate-website-k9xc` and linked Beads, never Markdown checkboxes. The user has approved local implementation; do not ask that same approval again.

**Goal:** Locally wire the reviewed 15-operation centralized iOS completion path and prove its safety with offline fake-transport tests and compile checks, without launching the app or sending telemetry.

**Architecture:** A concrete pinned-SDK processor consumes weak operation ownership synchronously and offers only immutable minimal values to a bounded coordinator. One serial queue owns eligibility transitions and request resume; a separate short ingress lock bounds admissions before dispatch. A synchronous once-initialized startup attaches one processor while retaining unrelated instrumentation and legacy channels.

**Tech stack:** Existing Swift language mode, Foundation locks/Dispatch/URLSession, OpenTelemetry Swift core 2.3.0 at its existing pinned checkout, existing network-denied compiler harness. No dependency, SDK, endpoint, credential or billing change.

## Authorization and source baseline

The [reviewed design](../specs/2026-09-13-production-telemetry-integration-design.md) is normative. On September 14 the user approved its local production-code wiring, offline fake-transport tests and compile checks, including operations remaining eligible from start through completion. No app launch, simulator boot, further receiver request, release, upload or live export is permitted. The separately authorized single log is already exhausted. Compilation is not runtime acceptance; local implementation is not release acceptance.

Owner root: `/Users/doreilly/Work/roammate-app-ios`. Website root owns this plan, acceptance documentation and Beads. Read owner `AGENTS.md` and `CLAUDE.md` before edits. Only the root verifier may run `xcodebuild`, and only after other agents stop; do not launch a test host. Existing owner modifications, including auth analytics, fixture files and `TelemetryResourceAttributesTests.swift`, are unrelated baseline work: preserve their exact pre-edit contents and never reset, stage or commit them incidentally. Record scoped hashes/diffs before editing; no credentials in receipts. Owner commits/pushes are outside this local-only slice; root separately commits and pushes website documentation and Beads.

Use `test-driven-development`, `swift-concurrency`, `swift-testing`, and `verification-before-completion` where applicable. Execute in the prepared project-local worktree `/Users/doreilly/Work/roammate-app-ios/.worktrees/telemetry-integration`, branch `local/telemetry-integration`, base `8fc8118`. Root overlaid 17 relevant dirty iOS/project/script prerequisites and recorded `/tmp/roammate-telemetry-integration-owner-baseline.json`; verify that manifest before implementation. The owner working tree remains untouched. Paths and commands below refer to the worktree equivalent of the owner root. Handoff is a scoped local patch, not an owner commit/push or an indiscriminate copy over newer owner work.

## File boundaries and execution order

All paths in this table are relative to the owner root. Names are proposed implementation boundaries; do not combine all state into an oversized service.

| Unit | Files | Responsibility |
|---|---|---|
| A | new `roammate/Services/OperationTelemetryRecord.swift`; new `roammate/Services/OperationTelemetryWire.swift` | Production allowlist/value validation, integer observation clock and exact wire/response contract |
| B | new `roammate/Services/OperationTelemetryDelivery.swift` | Bounded inbox, immutable epoch snapshot, serialized transitions, request lifecycle and fakeable clock/transport interfaces |
| C | new `roammate/Services/OperationTelemetryProcessor.swift` | Real `SpanSdk` callbacks, bounded weak ownership, no rich snapshots |
| D | new `roammate/Services/OperationTelemetryHTTPTransport.swift` | Non-starting HTTPS request creation, bounded delegate response streaming, no retry/persistence |
| E | modify `roammate/Services/TelemetryService.swift`, `roammate/Services/SuperlogTelemetry.swift`, `roammate/Features/Authentication/ViewModels/AuthenticationViewModel.swift`; new `roammate/Services/OperationTelemetryRuntime.swift`; modify `roammate.xcodeproj/project.pbxproj` | Exactly-once app setup, synchronous guest transition, exact-name legacy exclusion and app target registration |
| Tests | new `scripts/test-production-telemetry.py`, new `scripts/production_telemetry_fixtures.py`; retain existing `scripts/test-otel-sdk-fixture-bridge.py` and its fixture suites | Network-denied executable synthetic Swift tests of actual production sources; source-wiring and package compile checks |

Execute A, B, C, D, E, then combined acceptance. Distinct agents may review independently; do not concurrently edit shared harness/project/service files. A worker receives this plan, the design, exact ownership paths and existing scoped diff. Each unit records failing evidence before implementation, then passing evidence; root updates Beads. No commit step may scoop up the dirty owner baseline.

## Fixed interfaces and synchronization contract

Use production names, not `SyntheticTelemetryAdapter` or `OTelSDKFixtureBridge`, in app wiring. Minimal interfaces should express these boundaries (exact Swift access levels may follow existing conventions):

```swift
struct OperationTelemetryRecord: Sendable {
    let name: String
    let start: Double
    let end: Double
    let outcome: Outcome // success, error, unknown only
}
struct EligibilitySnapshot: Sendable {
    let enabled: Bool
    let epoch: UInt64
}
struct ObservedOperation: Sendable {
    let record: OperationTelemetryRecord
    let observedTimeUnixNano: String
}
// All callbacks carry only fixed dispositions/scalars, never response text.
// prepare creates a suspended request; only the coordinator may resume it.
protocol OperationTelemetryRequest: AnyObject {
    func resume()
    func cancel()
}
```

If an internal monotonically increasing epoch/token/attempt counter would overflow, close/drop rather than wrap and accidentally authorize stale work. Internal token/epoch/attempt identity never reaches wire output.

### Startup serialization

Replace the mutable unguarded setup storage with Swift's thread-safe synchronous `static let` initialization of a retained startup state. `TelemetryService.setup()` forces that value; concurrent callers wait for full initialization, rather than return early because a Boolean says initialization started. Build one processor, attach it to one provider before registering that provider, then construct and retain the same existing first-party `URLSessionInstrumentation`. Repeated calls return the retained completed state without replacing the provider or instrumentation. Keep the call in `roammateApp.init()` synchronous and in its existing order.

The once initializer may not invoke injected application callbacks, MainActor work, `TelemetryService.setup()` recursively, or guest setters. Its runtime dependency initializes only local state and lazy transport dependencies, never sends or constructs a span. Test the once primitive with a blocked factory and competing callers: none may report setup completion until the first factory completes; factory/provider attachment/instrumentation construction counts are each one. Exercise the production setup seam with synthetic dependencies offline, not by initializing the app. Source-check the real wiring as well; a stand-in once class alone does not establish the real setup path.

### Guest-mode transition integration

All currently found writes to `roammate.isGuestMode` go through `AuthenticationViewModel.isGuestMode`. Its getter must preserve `UserDefaults.standard.bool(forKey:)`, including missing-key false. Change its setter to call a **synchronous** runtime transition. Do not start a `Task`, call the analytics actor, wait for MainActor, or alter `applyAnalyticsSuppression()`: the owner source documents a prior actor/MainActor deadlock when asynchronous analytics work was added to this setter.

Initialize the independent runtime singleton from the raw UserDefaults Boolean and the existing `XCTestConfigurationFilePath` predicate, not from the authentication getter/setter or `TelemetryService.setup()`. This avoids static-initialization recursion and supports guest changes before telemetry setup. It does not install a provider or start transport. Production initialization reads the existing test predicate; offline fixtures inject the same Boolean semantics and a fake transport, even when XCTest's environment key is absent.

The setter's transition serializes **both the raw defaults mutation and the coordinator's effective eligibility update** on the coordinator queue. Concurrent setters therefore cannot reorder the stored value and epoch. Use a queue-specific key: a same-queue transition executes inline; an off-queue transition uses a synchronous barrier. On any effective enabled/disabled change advance the epoch, atomically publish its snapshot under the ingress lock, discard unsent records and cancel the timer/in-flight request best effort when disabling. Duplicate assignments that leave effective eligibility unchanged need not change the epoch. Never hold a processor lock while entering this barrier; ingress lock is released before callbacks/cancellation/destruction. The queue never synchronously requests MainActor, SDK getters or registry access.

After the setter returns no old-epoch request can newly resume. Requests already resumed cannot be recalled; cancellation is best effort. Re-enable does not revive old operations or queued records. A disable/re-enable cycle during an operation invalidates it even if completion currently sees enabled. Tests also exercise equivalent injected test-policy transitions, without changing the production XCTest detection rule. Any newly discovered direct defaults writer is part of the inventory: route it through the synchronous transition or report an unresolved bypass, never claim atomic suppression while leaving it.

## Unit A: Minimal values, observation clock and protocol parser

1. Create the isolated harness entrypoint and fixtures first. Reuse the existing SDK harness's verified outer deny-all-network preflight and compiler-child checks; expose `--suite record|delivery|processor|transport|wiring|all` and `--sdk-core PATH`. No SwiftPM resolution, network fallback or app initialization. A missing prerequisite exits `BLOCKED` before compilation; it is not a test pass.
2. Write failing record tests for all exact 15 names and three outcomes, nonallowlisted prefixes/case/suffixes, missing/negative/nonfinite/reversed dates and zero duration. The expected failure must be the missing/new behavior, not an unrelated environment failure.
3. Implement only immutable value validation and the exact allowlist. Reuse pure validation without coupling production to a fixture class. Status error descriptions must never be bound or formatted. Compile and run the record suite.
4. Add failing clock cases: injected integer seconds/nanoseconds; nanos `0..<1_000_000_000`; checked multiply/add; zero, negative and overflow rejection; one actual capture at observation preserved through delayed enqueue. Implement the actual system-wall-clock component reader and checked conversion; no Double-to-UInt64 conversion for observation time or end-time fallback. Body start/end remain finite doubles.
5. Add failing full-structure JSON equality tests for precisely one resourceLogs/scopeLogs/logRecords element and precisely `observedTimeUnixNano` plus typed four-field body. Implement deterministic encoding with no resource/scope/IDs/attributes/severity/timeUnixNano/error text. Assert exact nested key sets, not a short denylist.
6. Add response tests before parser implementation: HTTP 200 plus empty `application/x-protobuf` is accepted; HTTP 200 valid JSON `{}` is accepted; empty JSON, other 2xx, unsupported media type, malformed bytes and nonempty protobuf are ambiguous; explicit valid rejected count yields rejected, invalid counts are ambiguous. Choose the reviewed explicit unsupported/ambiguous branch for nonempty protobuf, avoiding a new decoder dependency. Handle documented JSON partial-success defaults and reject out-of-range/nonintegral counts for a one-record request. Never retain diagnostic text in outcomes.

Command after each group, from owner root:

```sh
python3 scripts/test-production-telemetry.py --sdk-core "$SDK_CORE" --suite record
```

`SDK_CORE` must identify the already verified core checkout at `/Volumes/Overflow/DerivedData/roammate-gdszpracthwyqqbkrfjzlseryvys/SourcePackages/checkouts/opentelemetry-swift-core`, pinned revision `240c8d5e36c3c7b774ed961325369f0b1f2c965f`. Assert its revision before use. Expected final result: each named case passes and harness exits zero, with explicit network-denial receipts.

## Unit B: Eligibility and bounded delivery state machine

1. Write fake-request/clock fixtures and failing deterministic queue tests before implementation. Fakes record prepared/resumed/cancelled/terminal events without opening a socket. Fixtures may manually release barriers; never rely on sleeps to establish ordering.
2. Implement a short ingress lock protecting current immutable permission snapshot, a maximum 256 unsent immutable records and one coalesced wakeup. Admission checks epoch and capacity before dispatch. Queue state owns at most one in-flight attempt and timer. Processor and ingress locks must never nest.
3. Test 257 simultaneous offers while drain is held: only 256 admitted, newest dropped, one drain wakeup. Test no raw SDK objects or unbounded offer/control closures cross dispatch. Use bounded pending timeout/terminal flags and one coalesced control wakeup.
4. Implement synchronous transition behavior above. Test disabled start/enabled completion, enabled start/disable/re-enable/completion, changes during extraction/offer/preparation/pre-resume, same-queue transitions, concurrent setters and guest change before startup. Each stale operation produces zero resumed requests. Assert no old resume after disable barrier return.
5. Implement separate record disposition and request terminal acknowledgement. Test 15-second fake deadline, cancellation without acknowledgement, late completion, duplicate terminal callbacks and callback arriving synchronously inside resume/cancel. Timeout consumes the record once but holds its request slot until matching terminal acknowledgement. A never-acknowledged cancellation stays stalled and bounded. An old completion cannot free a newer attempt.
6. Test shutdown idempotence, queue clearing and absence of retry/disk/fallback. All failure dispositions remain internal fixed categories. Run `python3 scripts/test-production-telemetry.py --sdk-core "$SDK_CORE" --suite delivery`; final expected exit zero with every barrier/state assertion passing.

## Unit C: Pinned concrete processor and weak lifecycle ownership

1. Add failing real-SDK synthetic callback fixtures for concurrent start/end, duplicate start/end, unsupported concrete spans, unknown ownership and shutdown. Reuse the pinned SDK source compilation, not `toSpanData()` fixtures as a substitute for production callbacks.
2. Implement only concrete `SpanSdk` start name and final scalar access outside registry lock. Start requires enabled epoch and allowlisted name. Claim weak object identity/token/generation under the short registry lock; end consumes once, extracts permitted scalars outside lock and rechecks generation before immutable offer. No SDK getter, callback, queue sync or destruction-sensitive retained release under that lock.
3. Test allowlisted-to-allowlisted final rename accepted under final name, unlisted-to-allowed rejected, allowed-to-unlisted consumed/dropped. Poison fake/readable rich getters where possible and source-audit no `toSpanData`, attributes, events, resource/context IDs or error description access in production projection.
4. Add live weak tombstones, pruning dead weak entries before admission, hard 1024 live-entry cap including completed objects, no live eviction. Test duplicate remint suppression, capacity pressure, actual deallocation/identity reuse and no strong-retain cycle. Do not assert arbitrary allocator address reuse deterministically; use controlled registry identity seams plus real lifetime evidence.
5. Test shutdown closes/increments generation before notifying delivery outside the lock; extraction races cannot enqueue after closure. Run processor suite and retained snapshot/lifecycle suites. No SDK raw object may be retained by a delivery closure.

## Unit D: Real transport implementation, exercised only offline

1. Write delegate-driven synthetic response chunk tests, injected suspended-task tests and endpoint/header configuration assertions before implementation. Inject a session/task factory so tests never create a live URLSession request. Never paste the existing public ingest key into test fixtures or receipts.
2. Implement a non-starting request factory for existing `https://intake.superlog.sh/v1/logs`, reusing the existing credential through a narrow internal configuration accessor rather than duplicating its value. HTTPS authentication is unchanged. Use an ephemeral/no-persistence session, no redirect following or application retry, and explicit 15-second request/resource timeouts alongside coordinator deadline.
3. Stream response through a delegate, checking each chunk against the 16 KiB cap before appending, regardless of Content-Length. An oversized response cancels/drops without buffering arbitrary data; forwarding its terminal callback remains required. Test chunks crossing the boundary, deceptive lengths, synchronous cancel callbacks and late terminal callbacks. Forward only bounded classification data, not raw response/error descriptions, to coordinator.
4. Prove task creation cannot resume, fake timers cannot multiply, network errors never restore legacy sending, and response text is not logged/persisted/exported. Run transport suite. This is real transport code compile/offline evidence, not a new live receiver test.

## Unit E: Atomic local app wiring and exact legacy retirement

1. Re-run the complete Swift-tree inventories for span creation, `SuperlogTelemetry.emitSpan`/`emitCounter`, guest-key writes and provider setup. Record new drift before patching. Write failing production-wiring source/seam tests for one processor attachment, unchanged existing first-party instrumentation/trace-header code, synchronous once setup and exact setter transition.
2. Implement the runtime/startup/guest contracts above. No detached startup work, opt-in storage/UI, test-predicate broadening or change to PostHog suppression calls. Test app-independent runtime with injected defaults/environment/fake transport; import no app entrypoint into executable fixtures.
3. Guard all six helper legacy span/counter callsites for exact migrated names, including custom allowlisted `recordError` names. Defensively exclude the same names at both legacy sink entrypoints. No prefix matching and no fallback when the central path is disabled/full/uninitialized/failing. Retain default `app.error`, fatal/general-error, PostHog, HTTP instrumentation and trace propagation behavior.
4. Add call-spy seams and source checks showing zero legacy trace/log/counter requests for every migrated helper path across success/error/suppression/failure, while representative unrelated names retain the old path. Do not execute unrelated real exports during tests. Verify all 15 existing direct SDK callsites are still captured without broader feature edits.
5. Register every new production Swift file once in PBXBuildFile, PBXFileReference, PBXGroup and PBXSourcesBuildPhase with unique 24-character hexadecimal IDs. Preserve existing local project entries and all test edits. Do not add synthetic fixture helpers to production startup.
6. Run wiring suite and all suites. Independently review complete integrated diff for spec compliance and concurrency/code quality before reporting implementation success.

## Combined offline verification and handoff

The root verifier owns all compile processes. A worker cannot use a build timeout as permission to start another build. Poll the same handle to completion. The owner prohibits `xcodebuild` while any other agent is running; wait for all workers/reviewers to finish before a single compile-only invocation.

```sh
python3 scripts/test-production-telemetry.py --sdk-core "$SDK_CORE" --suite all
python3 scripts/test-otel-sdk-fixture-bridge.py --sdk-core "$SDK_CORE" --lifecycle
python3 scripts/test-synthetic-telemetry-adapter.py
python3 scripts/test-offline-auth-telemetry.py
git diff --check
```

Retain 91 snapshot, 64 lifecycle, two lifecycle-negative, 73 adapter, three compile-negative and 45 projection cases without replacing assertions or interpreting negative-test failures as product failures. Record exact commands, exit codes, case counts and isolation receipts; do not claim pre-existing counts without a fresh run. Check harness usage if owner drift changes accepted flags, but do not weaken checks. Reuse only the approved compiler package-name/inner-sandbox adjustment while retaining and verifying outer deny-all-network for compiler children. No package download, SDK mutation, security-setting change or new permission is implied.

For a full app compile, root first establishes an offline compile environment with cached packages and no script-triggered sending. Use `build`, never `test`, `run` or installation, destination `generic/platform=iOS Simulator`, separate scratch DerivedData, code signing disabled, automatic package resolution disabled and only existing resolved package versions. Inspect build-phase scripts and cached SDK availability first. Missing cached dependencies or an unverified network-denial setup is a reported compile blocker, not a reason to fetch packages, launch the app or weaken isolation. Swift module compile success alone must not be called full app-build success.

Root records scoped changed-file hashes, independent review results, production-source compile evidence and known runtime/release limits in `docs/superpowers/verification/2026-09-14-production-telemetry-integration.md` in the website. This plan does not claim that future report exists. Keep `sie` and broad released-journey acceptance blocked until their separate evidence exists. Close only the approved implementation Bead when its local acceptance is genuinely met; otherwise identify the exact remaining gate in Beads. Website landing steps belong to root; owner files remain local under this approval.
