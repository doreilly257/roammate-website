# Production iOS telemetry integration design

Date: 2026-09-13

Bead: rb24

Status: Independently reviewed architecture proposal, accepted by root. Consent,
transport and other-channel policy gates remain open; not implementation-ready.
Implementation and release are not authorized.

## Goal and authorization

Replace fragmented export of the 15 approved operation names with a centralized,
production-safe completion path: concurrent SDK callbacks become one minimal
record per eligible operation, with explicit permission and bounded delivery.
This describes actual future iOS application integration, not another fixture-only
deliverable. Its implementation would modify owner production services, startup
and tests after the remaining policy choices and written plan are approved.

The user authorized this design only. Preparation inspected local source, not
personal records. It made no owner edits, created no provider/span, and ran no
compiler, app, test, exporter, deployment or live telemetry request. Website
documentation is the only changed artifact. No paid service or provisioning is
proposed; a supported no-cost transport is an unresolved prerequisite.

The completed [synthetic lifecycle verification](../verification/2026-09-13-synthetic-sdk-lifecycle.md)
proves useful SDK behavior, not production concurrency, consent or export safety.
Its permissive in-flight shutdown semantics are **not** a consent policy.

## Current source evidence

Owner source: `/Users/doreilly/Work/roammate-app-ios/roammate/`.

- `App/roammateApp.swift:20` calls `TelemetryService.setup()` synchronously in app
  initialization. `Services/TelemetryService.swift` registers a real global SDK
  provider without a processor/exporter and retains first-party URLSession
  instrumentation. Trace propagation is separately injected into requests.
- `TelemetryService.span` emits independent Superlog spans and counters after
  ending the SDK span; success calls are at lines 144/147, error at 156/164.
  `recordError` independently emits at 177/185 before attaching to an active SDK
  span or creating `app.error`. These are the only executable direct
  `SuperlogTelemetry.emitSpan`/`emitCounter` callsites found in the app Swift tree.
  The helper's only `TelemetryService.shared.span(...)` match in that search was
  its documentation example; future helper use must nevertheless be safe.
- `Services/SuperlogTelemetry.swift` turns one `emitSpan` into both trace and log
  requests, creates independent random trace/span IDs, adds resource/build/repo
  metadata and forwards caller attributes/error text. `emitCounter` is another
  request. This is **not** a four-field wire contract and must not be reused as
  an opaque sink for the new path.
- Its present `shouldEmit` is `!isGuestMode && !isRunningTests`; tests are detected
  by `XCTestConfigurationFilePath`. Guest mode is a UserDefaults boolean whose
  absent value reads false. This is neither explicit telemetry opt-in nor proof
  that an unknown/new session consented. A detached network task is created after
  the current gate check; consent transitions are not serialized with send start.
- `Services/AnalyticsService.swift:386` separately emits fatal exceptions.
  PostHog analytics/replay, general errors, automatic HTTP spans and W3C trace
  propagation are distinct existing channels, not made private by this design.

Direct approved SDK span callsites:

| Owner file | Names |
|---|---|
| `Services/AuthService.swift` | `auth.apple`, `auth.google`, `auth.facebook`, `auth.email`, `auth.register` |
| `Services/WebSocketService.swift` | `websocket.connect`, `websocket.send` |
| `Features/Excursions/ViewModels/ExcursionsViewModel.swift` | `excursion.join`, `excursion.leave`, `excursion.create` |
| `Features/Connect/ViewModels/ConnectViewModel.swift` | `connect.loadNearby` |
| `Features/Chat/ViewModels/ChatViewModel.swift` | `chat.loadMessages`, `chat.sendMessage` |
| `Features/Profile/ViewModels/ProfileViewModel.swift` | `profile.load`, `profile.update` |

Pinned core SDK 2.3.0 revision
`240c8d5e36c3c7b774ed961325369f0b1f2c965f`, beneath the previously verified local
DerivedData checkout. Relevant `Sources/OpenTelemetrySdk/Trace/` APIs:

- `SpanSdk` publicly exposes name/status/hasEnded and read-only startTime/endTime.
  Unlike `ReadableSpan`, its concrete type permits dates without `toSpanData()`.
- Actual `end` marks ended under the SDK lock, then assigns endTime, removes
  global context and invokes onEnd. Repeated real end is suppressed. The proposed
  bridge accepts only this real callback path, not arbitrary concurrent snapshots
  or manually injected unfinished objects in production.
- `toSpanData()` copies raw attributes/events/context/resource: it is excluded
  from production projection. The prior synthetic snapshot bridge stays a fixture
  and is not promoted into this production callback.
- Builder no-parent still reads active global span and can fall back to launch
  environment context. This design does not claim existing tracing is globally
  context-free; it prevents those contents from entering its output.

## Alternatives

**A — Central provider processor plus minimal delivery coordinator (recommended).**
Attach one processor to the existing provider at synchronous startup, project
directly from pinned real SDK span getters, and retire all legacy exports for
the same 15 operation names. Preserves instrumentation callsites and captures
their real completions. Requires carefully reviewed synchronization, provider
registration, permission and supported transport contracts.

**B — Replace the 15 callsites with a typed operation wrapper.** Own timing and
completion without depending on SDK callbacks or object registries. Easier
minimal-data ownership, but broad auth/chat/profile/excursion/WebSocket edits,
potential timing/active-context changes and more migration risk. A fallback if
the pinned direct-access boundary proves unmaintainable.

**C — Standard batch SDK exporter alongside current helper.** Familiar SDK path,
but copies rich snapshots, risks default resource/identity export and duplicates
existing trace/log/counter delivery. Rejected for this narrow output contract.

## Proposed production components

### 1. Concrete SDK projection at callback time

Create a production processor separate from the serial-only synthetic adapter.
It accepts actual `SpanSdk` objects from the registered pinned provider, not
arbitrary `ReadableSpan` implementations. Reject unsupported concrete types.

Start-name **and** final-name must be on the same 15-name allowlist. An unlisted
start is never registered even if later renamed to an allowed name; an allowed
start renamed to unlisted is consumed and dropped. Allowed-to-allowed renames
produce the final allowed name. These semantics deliberately narrow the generic
final-only projector and require explicit tests.

After eligible real onEnd ownership is consumed, read only name, startTime,
endTime, hasEnded and status case. No provisional clock fallback is permitted;
missing/nonfinite/negative/reversed timestamps drop the completion. Preserve
epoch seconds, allow zero duration, and map `.ok`/`.error`/`.unset` to
success/error/unknown without binding or formatting error text.

Reuse the pure allowlist/validation behavior through a production-named minimal
value type; do not instantiate the fixture adapter or SDK snapshot bridge in the
application. No attributes, events, IDs, hashes of IDs, URL, user, location,
message, exception text, scope, resource or SDK description is read for export.

### 2. Concurrent identity and lifecycle state

A short private state lock protects weak object-identity entries, consumed flags,
processor generation and closed state. No SDK getter, caller closure, queue sync,
network operation or destruction-sensitive retained object release occurs while
holding that lock. Obtain permitted SDK scalar fields outside the lock; use
generation rechecks where lifecycle state may change during extraction.

On start, type/name checks precede lock acquisition. Atomically claim a new weak
object identity and operation token for the current generation. Tokens are
internal ownership only and never serialized. On end, confirm real ended state,
atomically consume eligible ownership, unlock, extract/project fields and offer
only the immutable record to delivery. Unknown/consumed/closed callbacks do not
allocate ownership or snapshot. Concurrent or reentrant duplicate callbacks can
claim no second completion. Never pass raw SDK objects into asynchronous work.

Weak tombstones remain while completed objects live, preventing re-start-hook
reminting without retaining spans or creating processor cycles. Dead weak entries
are pruned before admission. Proposed limit: **1024 live entries**, including
active and completed tombstones. At capacity drop new operations; never crash,
evict a live tombstone, grow without bound or admit an end with no start. A
retained long-lived span can consume capacity; that is a deliberate bounded-loss
trade-off. Tests must prove identity reuse after actual deallocation is safe.

Shutdown is idempotent: close/increment generation, clear ownership, then notify
delivery after releasing the state lock. Setup attaches one processor exactly
once, remains synchronous before startup instrumentation, and must not replace
or attach competing providers during repeated calls. The implementation plan
must specify the startup serialization primitive and prove concurrent/repeated
setup, rather than treating a return during partially completed setup as success.

### 3. Permission and transport serialization

Production consent source and its migration policy are unresolved below. All
unknown/missing/corrupt states default to no delivery in the recommended policy.
Tests, guest/demo mode and explicit disablement independently suppress this path.
Test detection must be injectable and cover unit/UI fixtures, previews and the
approved offline harness rather than assuming one environment key covers all.

**Proposed consent-epoch rule, pending user policy approval:** start admission
also requires enabled permission and captures its epoch. Completion must still
be permitted in that same epoch; operations begun before consent or spanning
revoke/re-enable cannot later export. This intentionally differs from synthetic
gate-at-completion tests and is not claimed as the existing app contract.
Callbacks read a small synchronized immutable permission snapshot, never sync
into the delivery queue or await an actor. Carry its epoch as internal metadata,
not an exported field. Because permission can change after that snapshot, the
coordinator independently checks the epoch at enqueue **and** immediately before
send; an old offer racing revocation is discarded at either boundary.

A dedicated serial delivery coordinator owns the effective permission epoch,
bounded record inbox and request lifecycle. Proposed inbox limit: **256 records**;
overflow drops the newest record, without raw diagnostics or fallback transport.
Admission occurs synchronously under the coordinator's short ingress-state lock
**before dispatching any closure**: check the captured start epoch against current
permission, enforce capacity, insert only the record/epoch and set a coalesced
wakeup flag. Dispatch at most one drain after releasing that lock. Never enqueue
an unbounded series of offer closures and call that a bounded inbox. Registry and
ingress locks are never nested, and neither invokes callbacks or queue sync.

Allow **one in-flight request** at most, in addition to the 256 unsent records.
The serial drain starts no other request while one is active. Proposed deadline:
**15 seconds** from resume, enforced by one coordinator-owned timer plus explicit
URLSession request/resource timeouts. Completion or deadline atomically consumes
that record once; timeout cancels best effort and drops it, never retries it.
Keep the single request slot occupied until URLSession reports terminal completion,
even after timeout or revocation; if cancellation never completes, remain stalled
and bounded rather than starting overlapping replacement requests. A late
completion cannot free a later attempt's slot. Keep **record disposition**
(one-shot delivered/dropped) separate from **transport terminal acknowledgement**
(one-shot slot release for the matching attempt). A timeout consumes the record
but must not suppress the later URLSession terminal callback: that callback
releases the matching timed-out slot without delivering or dropping again.
Both event types use bounded flags and one coalesced coordinator wakeup, not an
unbounded queue of control closures. Cancellation,
shutdown and permission changes cancel that bounded timer and discard unsent
records; no network wait is performed in a synchronous barrier. No disk
persistence, retries or automatic reconnect replay in the initial design.

Permission revocation is a synchronous coordinator barrier: apply the new epoch,
discard unsent records and cancel already-started requests best effort. After the
barrier returns, no old-epoch request may newly resume. A request already resumed
before revocation cannot be recalled or guaranteed unread; the UI/policy must
not promise otherwise. Re-enabling does not revive discarded records. This
revocation contract is stronger and separately specified from synthetic shutdown.

The coordinator never synchronously calls the main actor, registry lock owner or
SDK; a caller never synchronously enters the coordinator while holding the
registry lock. Queue-specific detection handles same-queue permission calls
without self-deadlock. Network completion callbacks enqueue state updates and
cannot block revocation. Request construction is non-starting; permission/epoch
is rechecked immediately before serialized request resume. No user-supplied gate
closure executes between that check and resume. Tests use deterministic barriers
to distinguish pending, prepared and actually resumed requests.

Limits 1024/256, one in-flight request and the 15-second deadline are proposed
initial safety bounds, **not measured production
tuning**. Any local drop counters must be fixed categories/numbers only; do not
add exported fields, identifiers or another diagnostic telemetry channel.

### 4. Literal four-field output and unresolved transport

Each application payload must be exactly this JSON object, with no additional
envelope, resource, identifiers, counter, log or build labels:

```json
{"name":"profile.load","start":1700000000,"end":1700000001,"outcome":"success"}
```

The remaining 14 names are exactly those in the callsite table; no normalization,
prefix matching or dynamic labels. Structural tests compare the entire key set
and types, not merely the absence of one known sensitive field.

No existing supported receiver for this literal payload was established.
Current `SuperlogTelemetry.emitSpan` is incompatible. Do not invent a Superlog
endpoint/ingestion schema, silently wrap records in OTLP or reuse its credential
as proof of authorization. A documented receiver contract and no-cost operating
path are required before transport implementation. An injected interface can be
tested offline, but is not the completed production integration by itself.

Ordinary HTTPS routing/authentication and network metadata are separate from the
application payload; the receiver can still observe a source network address.
Four-field JSON is not anonymity or zero network metadata. No new authentication
header value, endpoint provisioning or traffic is authorized by this design.

### 5. Atomic legacy cutover and duplicate prevention

In the same future implementation, the six direct helper emission callsites
inventoried above must no longer emit spans/logs/counters for these 15 names.
Add a defensive target-name exclusion at legacy `emitSpan` and `emitCounter`
entrypoints so a future direct call cannot bypass the central owner. Do not
filter only at the helper and leave the public legacy sink as a bypass.

No automatic legacy fallback when central permission is off, queue is full,
transport fails or initialization is incomplete. Otherwise failure would restore
the richer payload and duplicate policy. The central path is the single emission
owner for allowlisted operations, or those operations produce no export.

`recordError` with an allowlisted custom name is covered by that exclusion; its
default `app.error`, fatal exception emission and PostHog are not covered by an
allowlist claim. Re-run the complete app-tree callsite inventory during future
implementation to catch source drift. Counters/logs previously derived from
these 15 names are deliberately retired rather than silently double-counted;
dashboard consequences need owner acceptance before release.

## Unresolved policy gates

1. **Consent:** recommend explicit telemetry opt-in, unknown/off by default,
   including existing-install migration and revocation. The current non-guest
   boolean is insufficient to infer that choice. Root has asked the user; no
   answer is assumed. Specify UI/storage/version, signed-out behavior and which
   authority changes the permission epoch before implementing integration.
2. **Transport:** identify a documented, authorized, no-cost receiver accepting
   literal four-field JSON. If the user instead wants OTLP envelope metadata,
   revise and approve that different data contract explicitly; do not disguise
   it as the current four-field design.
3. **Other channels:** explicitly decide whether general errors/fatal reports,
   PostHog/replay, HTTP instrumentation and trace headers remain unchanged or
   become separately gated/removed. Current source does not justify a claim that
   consent for this new path governs those channels or all app telemetry.
4. **Release:** after design/policies and local implementation are reviewed,
   app build/runtime verification, staged network acceptance, store/release and
   any backend/receiver changes require their own applicable approvals. This
   design does not authorize sending a sample from a personal device.

## Future implementation and acceptance shape

Production ownership would reside in `Services/TelemetryService.swift`, a new
production processor/minimal-record component, a permission/delivery coordinator
and `Services/SuperlogTelemetry.swift` legacy exclusions. Startup and consent UI/
storage files depend on resolved policy. Add owner-required project entries for
new app Swift files only under the later implementation plan; none are added now.

Acceptance must include actual pinned SDK callbacks with synthetic input,
concurrent start/end/duplicate/setup/shutdown stress, supported Swift concurrency
checks and race detection where the approved runtime permits. Test all 15 names
and three outcomes, start/final rename behavior, weak identity reuse, both caps,
closed/unknown objects and no raw getter/snapshot access. Use deterministic
barriers for consent revocation at offer/preparation/resume/completion, including
reentrant transitions and guest/test state changes.
Explicitly test disabled-start/enabled-end and enabled-start/revoke/re-enable/end:
under the proposed epoch rule both produce zero exports. Also interleave policy
snapshot, callback extraction, enqueue and send to prove stale epochs cannot win
a race through either coordinator gate.
Saturate callbacks before the delivery queue runs and prove at most 256 records
and one drain wakeup are admitted; while the transport is stalled prove at most
one request/timer exists. Race timeout, cancellation and late completion to prove
one terminal transition, no slot reuse bug, no retry and bounded control wakeups.

An offline fake transport must assert exact four-field bytes and no unexpected
legacy trace/log/counter requests for every inventoried path. Retain the existing
91 snapshot, 64 lifecycle, two lifecycle-negative, 73 adapter, three input-negative
and 45 projector combinations/gates. These do not substitute for the eventual
approved real application integration tests or receiver acceptance.

The final production acceptance record must identify the reviewed receiver,
privacy/permission policy, source/release version, one-owner cutover, bounded
failure behavior and rollback behavior. Rollback may disable the new path; it
must not automatically re-enable richer legacy exports without separate review.

## Review status

Independent architecture review approved with no remaining findings after
clarifying pre-dispatch ingress bounds, immutable start consent epochs and the
separate record-disposition/request-terminal acknowledgement states. Root accepted
the architecture proposal. Consent, supported literal-payload transport and
other-channel decisions still require explicit written resolution and user design
acceptance. No implementation-ready approval or completion of production
integration is claimed while those gates remain open.
