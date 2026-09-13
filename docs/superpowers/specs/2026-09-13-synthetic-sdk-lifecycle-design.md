# Synthetic SDK lifecycle design

Date: 2026-09-13

Bead: 9b1n

Status: Independently reviewed and root accepted; awaiting user implementation approval.

## Purpose and authorization

Exercise actual pinned SDK start/end callbacks and operation-handle ownership in
a disposable, synthetic-only process. Reuse the accepted snapshot bridge,
adapter and four-field projector. This is the next minimal lifecycle stage,
not an application telemetry integration.

Shutdown rejects new completions but is not strict cancellation: an in-flight
completion whose gate triggers shutdown and returns true may still deliver once.
This preserves the existing adapter contract and is an explicit approval choice.

The user approved preparing this design. No provider, SDK span, compiler or test
was executed while preparing it. No owner file was changed. A separately
approved implementation plan is required before adding or running fixtures.

Excluded: application launch/build/wiring, exporters, live telemetry, personal
records, production context, SDK changes/downloads, owner commits or deployment.
There is no paid service or resource provisioning.

## Options

**A — Direct public SDK span lifecycle in a fresh process (recommended).**
Use public `SpanSdk.startSpan` with every input explicit and a fixture-only
`SpanProcessor`; call the real returned span's `end(time:)`. This proves actual
callbacks and ownership with the smallest surface. It does not cover provider,
builder, sampling or production concurrency behavior.

**B — Local unregistered provider and tracer.** Construct a fully explicit
`TracerProviderSdk`, without global registration or exporter. This adds builder,
sampler and provider shutdown coverage, but introduces launch-environment
extraction, global active-span reads and additional clock behavior. Defer until
that coverage is specifically needed and approved.

**C — Manually call processor hooks on decoded snapshots/test doubles.** Smaller
but cannot establish real SDK callback ordering or object identity; retain such
injection only for clearly labeled defensive tests alongside A, not as its
replacement.

## Pinned local API evidence

Local checkout:
`/Volumes/Overflow/DerivedData/roammate-gdszpracthwyqqbkrfjzlseryvys/SourcePackages/checkouts/opentelemetry-swift-core`.
Version 2.3.0, revision `240c8d5e36c3c7b774ed961325369f0b1f2c965f`.
Paths below are relative to its `Sources/` directory.

- `OpenTelemetrySdk/Trace/SpanSdk.swift`: public `startSpan` accepts context,
  name, scope, kind, parent, limits, processor, clock, resource, attributes,
  links and start date; it synchronously invokes `onStart` before returning.
- Its `end(time:)` marks ended/not-recording under a writer lock, assigns end
  time after releasing that lock, removes global context for the span, then
  synchronously calls `onEnd`. Repeated actual end returns before another hook.
  An arbitrary concurrent snapshot after the ended flag changes is not evidence
  that the end timestamp is settled; only the supported serial callback path is.
- `SpanProcessor.swift`: synchronous hooks on the calling thread; `onEnd` and
  shutdown are mutating protocol requirements (a class implementation is valid).
  `ReadableSpan` inherits class-bound span identity; no SDK ID lookup is needed.
- `SpanSdk.toSpanData()` copies attributes, events, links, context, resource and
  scope as well as permitted fields. This fixture boundary therefore permits
  synthetic snapshot materialization, not a claim of production raw-data safety.
- `SpanBuilderSdk.getParentContext` reads global active span even with no-parent,
  and its nil result falls back to `TracerSharedState.launchEnvironmentContext`.
  Shared-state initialization extracts parent context from process environment.
  `setNoParent` alone does not establish isolation.
- `TracerProviderBuilder` initializes default resource; direct provider defaults
  may use `EnvVarResource`. `Resource()` reads the process name. Option A supplies
  `Resource(attributes:)` and never constructs either provider/builder.
- `Common/Clock.swift` is a public class-bound `now: Date` protocol. Direct start
  permits an injected fixed clock and explicit start/end dates, avoiding the
  builder's monotonic-clock wrapper and random generator.

These are pinned-source claims, not guarantees for newer SDK versions. Retain
the existing actual-SDK provenance/hash checks and stop on drift. The accepted
[snapshot bridge design](2026-09-13-otel-sdk-fixture-bridge-design.md) and
[verification](../verification/2026-09-13-otel-sdk-fixture-bridge.md) remain the
baseline; this document does not supersede their completed results.

## Isolation and deterministic inputs

Run only a new standalone executable process, never inside the app, simulator,
XCTest host, existing process or a process supplied with personal state. Reuse
the approved sanitized-environment and outer deny-all-network harness, including
pre-build TCP/UDP positive controls, explicit permission denials and actual
compiler-child wrapper proof. No ambient loader, credential or tracing variables
are inherited. Do not weaken isolation to make a build work.

Fresh process context is the safety boundary: the SDK's real `end` still touches
its process-global context provider. Do not claim zero global SDK access.
Never register a tracer provider, set an active span, use active-span scopes,
load app modules or install an exporter. The harness may assert initial/final
active span is nil in this disposable process; it must not introspect another
process's context. Unexpected context fails the fixture without dumping it.

Supply fixed valid synthetic `SpanContext` IDs, nil parent, false remote parent,
explicit scope, internal kind, explicit limits, `Resource(attributes:)`, empty
attributes/links and explicit finite dates plus fixed clock. No default ID
generator is needed. Include a collision case with identical synthetic SDK IDs
on different real span objects: ownership must still be distinct. Synthetic
poison fields are permitted only in dedicated fixtures and never emitted.

## Fixture processor and ownership

The fixture-only class processor uses the existing adapter and snapshot bridge;
it is not registered globally or with an application service. Keep its source
in the offline harness/test subtree, not an app-target Swift file. No new project
registration or production API is required by this stage.

All starts, ends, gate changes, injected callbacks and lifecycle calls occur on
one explicitly asserted fixture execution thread. Caller confinement is a
tested harness restriction, not a consequence of non-Sendable declarations.
Cross-thread invocation fails with a fixed diagnostic before touching mutable
state; no locks, queues, asynchronous callbacks or thread-safety claim are added.

On actual `onStart`, reject closed processor or already-seen object; issue one
adapter-owned handle and associate it with `ObjectIdentifier(span)`. Do not read
context IDs, parent contents, name, resource or attributes. Handle association
happens here, before `startSpan` returns, not in a post-start registration window.
The processor is supplied only to fixture-authorized spans.

Keep an active map of object identity to handle and a bounded, strong-reference
seen registry capped at **256 span objects per processor** for this finite test
run. Reject capacity overflow with a fixed fixture-failure diagnostic before
allocating a handle or inserting either registry entry; no eviction or identity
reuse is allowed. Use fresh processors for larger independent case matrices.
This prevents address reuse and repeated
start-hook injection from obtaining a second handle. Completed entries leave
the active map but remain in the seen registry until shutdown. Strong retention
can form span/processor cycles; explicit deferred shutdown must clear both maps
on normal completion and ordinary thrown fixture failure. No unbounded or
production registry is proposed.

On `onEnd`: assert confinement, reject closed/unknown/already-completed object
before reading a snapshot, and reject an unfinished probe without consuming its
mapping. Remove the eligible active entry **before** `toSpanData()` and before
calling the bridge, gate or sink. Keep the local owned handle through that call.
Submit the real snapshot to the unchanged bridge; its `hasEnded` check and the
adapter's consume-before-callback semantics remain the final safeguards.

Reentrant delivery of the same object sees no active mapping. Reentrant delivery
of another eligible ended object may complete synchronously; no map iterator or
lock spans user callbacks. Reentrant start is permitted while open. Reentrant
shutdown closes state before clearing associations and shutting down the adapter;
no work may be created afterward. An already-entered adapter completion may
finish, including entering its sink if its gate calls shutdown and then returns
true. This preserves the unchanged adapter/collector contract: shutdown rejects
new completion opportunities, not an in-flight collector acceptance. Explicitly
test this case; do not add a new sink wrapper or change the accepted adapter.
Sink/gate closures are synchronous and nonthrowing.

Flush forwards only the existing no-buffer adapter flush; it does not end spans,
snapshot objects, evaluate gates, emit records or clear pending ownership.
Shutdown is terminal and idempotent, emits nothing, releases retained spans and
invalidates pending handles; late actual ends/injected hooks are ignored.
No provider shutdown behavior is claimed by Option A.

## Output and privacy contract

Only `{name, start, end, outcome}` may reach the in-memory collector. Preserve
finite nonnegative epoch-seconds ordering and success/error/unknown mapping.
Exactly these 15 names remain allowed:

`auth.apple`, `auth.google`, `auth.facebook`, `auth.email`, `auth.register`,
`websocket.connect`, `websocket.send`, `excursion.join`, `excursion.leave`,
`excursion.create`, `connect.loadNearby`, `chat.loadMessages`,
`chat.sendMessage`, `profile.load`, `profile.update`.

Do not serialize/log snapshots, IDs, attributes, URLs, locations, events, resource,
scope, parent or associated error text. Status switches match cases only.
Diagnostic output contains fixed case names/counts, hashes and sanitized isolation
receipts, not SDK object descriptions. This stage's synthetic snapshot copying
does not authorize processing any real user span later.

## Offline acceptance for a later implementation

Retain all accepted 91 snapshot, 73 adapter, 3 negative-compilation and 45
projection combinations/gates; report lifecycle cases separately without inventing
a count before execution. Compile complete unchanged pinned modules with the
existing approved toolchain route; no downloads, stubs or source omissions.

New cases must establish:

1. Actual `onStart` occurs before start returns, actual `onEnd` after explicit end,
   and each allowed name/status combination produces only its four-field record.
2. Actual repeated end invokes one end hook; separate explicitly labeled manual
   hook injections test duplicate start/end, unknown objects and reentry defenses.
3. Same SDK IDs on different objects remain separate operations; distinct
   processor/adapter ownership does not consume another processor's handle.
4. Early injected unfinished end preserves ownership for the eventual real end;
   invalid final name/time and gate-off real completion consume their opportunity.
5. A span started while disabled may first complete after enabling; an end while
   disabled never revives on retry. Gate/sink reentry cannot duplicate a record.
6. Reentrant completion of another ended span, reentrant start, flush, shutdown,
   pending-span shutdown and late hooks honor the ordering above without deadlock.
   Specifically, gate-triggered shutdown followed by a true gate result allows
   the already-entered completion's sink once, while subsequent hooks emit nothing.
7. Controlled cross-thread misuse fails in a separate negative process with a
   fixed confinement diagnostic, rather than racing shared mutable state.
8. Synthetic poison snapshot fields never enter captured records or diagnostics;
   no snapshot is requested for unknown/closed/consumed objects (prove through
   clearly labeled observable test-double hooks where concrete SDK getters cannot
   trap, alongside source review—not by claiming the SDK getter was instrumented).
9. The 257th distinct start fails before handle allocation without evicting prior
   ownership; pending/seen references release at shutdown, initial/final disposable global
   active context is nil, no provider/exporter/app caller appears, and existing
   owner files outside the eventual approved harness scope remain unchanged.

## Review and next gate

Independent source/spec review approved with no blocking findings after the
in-flight shutdown clarification and explicit 256-object registry cap. Root
accepted the updated full design with no findings, including that contract and
the requested upfront approval callout. No runtime
verification is claimed by either source review. Root owns Bead updates,
the website documentation commit and the user approval prompt. Recommendation:
approve Option A implementation only after this written design is reviewed;
provider integration, production thread-safety and live export remain separate.
The approval prompt must explicitly mention the compatible in-flight completion
rule above, not describe shutdown as cancelling an already-entered completion.
