# Production iOS telemetry integration design

Date: 2026-09-13

Policy amendment: 2026-09-14

Bead: rb24

Status: Architecture and September 14 policy amendment independently reviewed
and accepted by root. Existing suppression, minimal OTLP wrapper design and
preservation of unrelated channels are resolved user choices. The user additionally
approved one actual OTLP observation timestamp; that amendment passed independent
review and root acceptance.
One separately authorized synthetic record now establishes immediate receiver
compatibility; the account screenshot establishes the current free allowance.
The receiver-response amendment passed independent review and root acceptance.
On September 14 the user accepted the written integration design and authorized
local production-code wiring, offline fake-transport tests and compile checks,
including eligibility from start through completion in the same epoch.
Implementation verification remains open. No app launch, further telemetry sending
or release is authorized. Execution is described in the
[local implementation plan](../plans/2026-09-14-production-telemetry-integration.md).

## Goal and authorization

Replace fragmented export of the 15 approved operation names with a centralized,
production-safe completion path: concurrent SDK callbacks become one minimal
record per eligible operation, with explicit permission and bounded delivery.
This describes actual future iOS application integration, not another fixture-only
deliverable. Its implementation would modify owner production services, startup
and tests under the September 14 local implementation approval and reviewed plan.

The user initially authorized this design only. Initial preparation inspected local source, not
personal records. It made no owner edits, created no provider/span, and ran no
compiler, app, test, exporter, deployment or live telemetry request. Website
documentation is the only changed artifact. A later, separate approval authorized
one synthetic POST; its [verification report](../verification/2026-09-14-minimal-otel-receiver.md)
records immediate receiver readback and the current Free-plan allowance screenshot.
No paid service/provisioning or further sending is authorized. Current allowance
is not a guarantee of free operation at arbitrary future volume.

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
  The user explicitly approved preserving these unrelated channels unchanged.

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

On September 14 the user chose to **retain the existing non-guest/non-test
policy**: `!AuthenticationViewModel.isGuestMode && !SuperlogTelemetry.isRunningTests`.
Preserve the current UserDefaults boolean semantics, including an absent guest
key reading false, and the existing `XCTestConfigurationFilePath` test predicate.
Do not introduce opt-in UI, migrate existing installs to opt-out, infer consent
from this predicate or silently broaden its session classification. Inject the
same predicate for offline testing; explicit harness isolation must still prevent
test traffic even when a process does not carry that XCTest environment key.

**Integration epoch rule accepted for local implementation September 14:** start
admission requires that retained predicate to permit delivery and captures its
epoch. Completion must still be permitted in the same epoch; operations begun
while suppressed or spanning suppress/re-enable cannot later export. This
intentionally differs from synthetic gate-at-completion tests and is not claimed
as existing app behavior or as a consent mechanism. Its race semantics remain
part of the accepted written design and require offline implementation verification.
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

### 4. Four-field content plus observation time, minimal OTLP wrapper and receiver evidence

The logical operation record remains exactly this JSON object:

```json
{"name":"profile.load","start":1700000000,"end":1700000001,"outcome":"success"}
```

On September 14 the user additionally approved **designing a minimal OTLP
wrapper** around name/start/end/outcome, and subsequently approved adding only
the required **actual observation timestamp**. This changes the earlier literal
top-level-four-key wire requirement. Only schema structure and that one timestamp
may accompany the four operation fields; no trace/span IDs,
resource attributes, scope/build labels, any other timestamps, duplicate signals,
counters, severity data, error text or other telemetry is authorized. The exact
schema mapping must be source-backed and reviewed before implementation.

The remaining 14 names are exactly those in the callsite table; no normalization,
prefix matching or dynamic labels. Structural tests must compare the entire
approved wrapper and nested four-field key sets/types, not merely the absence of
one known sensitive field. This is not permission to use default exporter payloads.

**Source-backed structure with a separately verified single synthetic receiver
example:** one OTLP log record
whose typed body carries the operation record:

```json
{
  "resourceLogs": [{
    "scopeLogs": [{
      "logRecords": [{
        "observedTimeUnixNano": "1700000002000000000",
        "body": {
          "kvlistValue": {
            "values": [
              {"key": "name", "value": {"stringValue": "profile.load"}},
              {"key": "start", "value": {"doubleValue": 1700000000}},
              {"key": "end", "value": {"doubleValue": 1700000001}},
              {"key": "outcome", "value": {"stringValue": "success"}}
            ]
          }
        }
      }]
    }]
  }]
}
```

The primary [OTLP logs schema](https://raw.githubusercontent.com/open-telemetry/opentelemetry-proto/main/opentelemetry/proto/logs/v1/logs.proto)
permits omitted resource/scope (meaning unknown) and optional trace/span IDs;
the [common AnyValue schema](https://raw.githubusercontent.com/open-telemetry/opentelemetry-proto/main/opentelemetry/proto/common/v1/common.proto)
defines `kvlist_value` with typed values. The
[OTLP specification](https://opentelemetry.io/docs/specs/otlp/)
defines lower-camel-case JSON fields, `application/json` and the logs POST path
`/v1/logs`. Root read these primary sources on September 14; the linked `main`
schemas are moving references and must be rechecked/pinned at implementation.

The logs schema requires `observedTimeUnixNano` once the event is observed by
OpenTelemetry. The user has now approved this field only, resolving the earlier
timestamp-permission conflict. Capture the **actual observer clock once when the
local callback path observes the eligible completed operation record**, before
asynchronous enqueue; carry that immutable observation with the record. Never
recapture at send, timeout or replay, derive it from the operation's end, or use
zero/a fabricated fallback. The example represents a synthetic observer clock
reading 1700000002 seconds, distinct from its operation end at 1700000001.

Encode observation time as a **uint64 decimal string of Unix nanoseconds**, per
the protobuf JSON mapping, not a floating-point JSON number. The later clock
adapter must perform checked range/conversion: reject negative, nonfinite,
out-of-range or unrepresentable readings before integer conversion and avoid
unchecked multiplication/overflow. Specify the observer clock as integer Unix
seconds plus a nanosecond component in `0..<1_000_000_000`; convert nonnegative
seconds to UInt64, checked-multiply by 1_000_000_000, checked-add the component,
and reject overflow or a zero/unknown result. No Double-to-UInt64 cast is needed
for this field; body start/end retain their existing Double representation.
The production adapter must obtain these components from the actual system
wall clock, not estimate extra precision from an operation timestamp.
Nanosecond encoding does not establish nanosecond clock accuracy; no clock
precision/source label is exported. Zero represents unknown and is rejected,
not emitted as a sentinel. Queued records retain their original observation value
through delayed drains and never regenerate it.
Use an injected deterministic observer clock in offline tests. A failed capture
or conversion drops the record without substituting end time or extra diagnostics.
The mapping alone is not receiver evidence; the separate single-record readback
below supplies that limited evidence without proving all production behavior.

This candidate omits `resource`, `scope`, both resource/record attributes,
schema URLs, severity, trace/span IDs, flags and `timeUnixNano`. Start/end remain
unchanged finite epoch-second doubles only in the body; `observedTimeUnixNano`
is the sole separately approved clock reading. No operation timestamps or outcomes
are duplicated into other OTLP fields. Although
the structural containers are named resourceLogs/scopeLogs, no resource or scope
identity/attribute data is supplied. One log request replaces the target operation's
old trace/log/counter trio; it is not an additional signal.

The separately authorized [single-record receiver check](../verification/2026-09-14-minimal-otel-receiver.md)
sent exactly one 340-byte synthetic request. A targeted Default log query was
empty before and returned exactly one matching four-value body afterward, with
the actual observation timestamp and empty client IDs/log attributes/service/
severity. The server added `superlog.project_id`; this was not client-supplied
and precludes a claim of metadata-free storage. Current `SuperlogTelemetry.emitSpan`
remains incompatible with this minimal client payload.

The user account screenshot showed Free, approximately 77K/5M logs and a $0
current bill. This supports the present allowance baseline, not unlimited free
production traffic, post-request billing reconciliation or long-term retention.
No second probe, app integration or further sending follows from that approval.

Evidence levels must remain distinct: (1) primary schema supports the proposed
typed body and actual observation-time mapping, with timestamp permission resolved;
(2) exact offline serialization/response tests remain future implementation work;
(3) actual targeted readback establishes immediate acceptance/display for that
one synthetic record, and the screenshot establishes the current free allowance.
Long-term retention, all names/outcomes and sustained-volume cost/operation are
not established. No broader level-3 result may be inferred from schema support.

The OTLP specification permits HTTP 200 with `partialSuccess` rejections; a 2xx
status alone must never be reported as accepted. The primary
[OTLP logs response schema](https://raw.githubusercontent.com/open-telemetry/opentelemetry-proto/main/opentelemetry/proto/collector/logs/v1/logs_service.proto)
defines the response and partial-success count. A valid `{}` response expresses
full success/default zero rejection counts; it is not a missing response.
The authorized probe returned HTTP 200, `application/x-protobuf` and zero bytes;
its JSON-only parser correctly retained an ambiguous classification, while the
independent readback established actual ingestion. The proposed receiver adapter
must explicitly recognize **HTTP 200 + `application/x-protobuf` + zero bytes** as
the default empty protobuf `ExportLogsServiceResponse`. This is not generic empty
body success: empty JSON, unsupported types or arbitrary 2xx remain ambiguous.
Nonempty protobuf requires a bounded schema-aware decoder or an explicit
unsupported/ambiguous result, never an assumed success. The adapter
must bound response bytes before decoding (initial limit **16 KiB**, including
streamed bodies irrespective of Content-Length), inspect the documented rejected
record count, and distinguish accepted, rejected and ambiguous responses using
fixed internal outcomes. With one submitted record, reject malformed/invalid
counts or an undecodable/missing expected response rather than infer success;
do not reject a valid empty JSON object merely because it omits default fields.
Any response diagnostic text is never logged, persisted or exported. Exact
response schema/content-type cases require offline tests before app integration;
the one-off JSON-only probe did not implement this production parser amendment.
Retain no retries, one in-flight slot and the existing terminal-acknowledgement
rules; HTTP errors, partial rejection or ambiguous responses drop the record
without replay or a richer legacy fallback. This policy adds no output fields.

Ordinary HTTPS routing/authentication and network metadata are separate from the
application payload; the receiver can still observe a source network address.
Four-field content is not anonymity or zero network metadata. No new authentication
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
allowlist claim and remain unchanged under the user's preservation decision.
HTTP instrumentation and trace headers likewise remain unchanged. The four-field
boundary applies only to the 15 migrated operation names, not all app telemetry.
Re-run the complete app-tree callsite inventory during future
implementation to catch source drift. Counters/logs previously derived from
these 15 names are deliberately retired rather than silently double-counted;
dashboard consequences need owner acceptance before release.

## Resolved choices and remaining gates

1. **Suppression choice resolved September 14:** retain the exact existing
   non-guest/non-XCTest predicate, including its missing-guest-key behavior.
   No opt-in UI/storage/migration or consent claim is added. The proposed start
   epoch/admission/race behavior was accepted for local implementation September 14;
   its offline verification remains required.
2. **Wrapper design and single-record compatibility resolved September 14:**
   a minimal OTLP structure may carry the four permitted operation values plus
   the subsequently approved actual `observedTimeUnixNano`, with no IDs/resource
   attributes/other telemetry. The timestamp-permission conflict is resolved;
   checked observer-clock conversion remains a concrete implementation requirement.
   The separately approved one-record POST and targeted readback establish
   immediate compatibility for that synthetic example. The account screenshot
   establishes the current free allowance, not future unlimited cost/retention.
   Review/test the explicit empty-protobuf response rule before implementation;
   no additional sending is authorized by the completed single-record probe.
3. **Other-channel choice resolved September 14:** the user explicitly chose
   to preserve unrelated PostHog/replay, fatal/general error reporting, HTTP
   instrumentation and trace headers unchanged. Remove duplicate legacy exports
   only for the 15 migrated names. Do not extend this path's suppression or
   four-field boundary to unrelated channels or claim whole-app minimization.
4. **Release:** after design/policies and local implementation are reviewed,
   app build/runtime verification, staged network acceptance, store/release and
   any backend/receiver changes require their own applicable approvals. This
   design does not authorize sending a sample from a personal device.

## Future implementation and acceptance shape

Production ownership would reside in `Services/TelemetryService.swift`, a new
production processor/minimal-record component, a permission/delivery coordinator
and `Services/SuperlogTelemetry.swift` legacy exclusions. Retain current session
storage; no new consent UI or migration is included. Startup and state-transition
integration details are specified in the linked local implementation plan. Add
owner-required project entries for new production Swift files during that local
implementation; this document amendment itself adds none.

Acceptance must include actual pinned SDK callbacks with synthetic input,
concurrent start/end/duplicate/setup/shutdown stress, supported Swift concurrency
checks and race detection where the approved runtime permits. Test all 15 names
and three outcomes, start/final rename behavior, weak identity reuse, both caps,
closed/unknown objects and no raw getter/snapshot access. Use deterministic
barriers for suppression changes at offer/preparation/resume/completion, including
reentrant transitions and guest/test state changes.
Explicitly test disabled-start/enabled-end and enabled-start/revoke/re-enable/end:
under the proposed epoch rule both produce zero exports. Also interleave policy
snapshot, callback extraction, enqueue and send to prove stale epochs cannot win
a race through either coordinator gate.
Saturate callbacks before the delivery queue runs and prove at most 256 records
and one drain wakeup are admitted; while the transport is stalled prove at most
one request/timer exists. Race timeout, cancellation and late completion to prove
one terminal transition, no slot reuse bug, no retry and bounded control wakeups.

An offline fake transport must assert the exact reviewed minimal OTLP wrapper,
only the four permitted operation values plus the one actual observation timestamp,
and no unexpected
legacy trace/log/counter requests for every inventoried path. Retain the existing
91 snapshot, 64 lifecycle, two lifecycle-negative, 73 adapter, three input-negative
and 45 projector combinations/gates. These do not substitute for the eventual
approved real application integration tests or receiver acceptance.
Regression acceptance must also prove unrelated PostHog, fatal/general error,
HTTP instrumentation and trace-header behavior is unchanged; the legacy export
exclusions match only the exact 15 migrated names, not broader prefixes/channels.
Observation-clock tests must inject deterministic readings and prove one capture
at local observation, unchanged across delayed enqueue/send, independent of body
start/end, correctly encoded as a uint64 decimal string. Test conversion boundaries,
negative/nonfinite/zero/overflow rejection and absence of `timeUnixNano` or fallback
values; reject any extra wire field. The separate authorized probe captured a real
observer clock; this document update performs no runtime capture or sending.
Response acceptance must include HTTP 200/zero-byte protobuf default success,
valid JSON `{}`, partial rejection, empty JSON, unsupported/malformed encodings
and oversized streamed bodies. Never equate generic empty/2xx with success.

The final production acceptance record must identify the reviewed receiver,
privacy/permission policy, source/release version, one-owner cutover, bounded
failure behavior and rollback behavior. Rollback may disable the new path; it
must not automatically re-enable richer legacy exports without separate review.

## Review status

The September 13 independent architecture review approved with no remaining findings after
clarifying pre-dispatch ingress bounds, immutable start permission epochs and the
separate record-disposition/request-terminal acknowledgement states. Root accepted
the architecture proposal. The September 14 user choices now retain existing
non-guest/non-test suppression, permit minimal OTLP wrapper design only, and
preserve unrelated channels unchanged. A subsequent explicit approval adds only
the actual observation timestamp alongside the four operation fields.
The amendment passed independent review and root acceptance after correcting
schema-structural versus semantic compatibility and valid empty-response handling.
The observation-time amendment passed independent review and root acceptance;
its prior permission blocker is
resolved, not a remaining policy question. Separately authorized single-record
receiver readback and the current free-allowance screenshot now replace the
previous missing-evidence premises. The bounded response amendment passed
independent review and root acceptance;
the user subsequently accepted the written integration design, including its
start-through-completion eligibility rule, and approved local code wiring,
offline fake-transport tests and compile checks. Implementation verification is
still open; no completed production integration, app launch, additional sending
or release is claimed or authorized by this amendment.
