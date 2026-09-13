# Synthetic telemetry adapter — design only

Date: 2026-09-13. Bead: `roammate-website-cf3`; parent: `sie`.
Status: **Independently reviewed and root accepted; implementation not authorized.**

## Goal and authorization

Design the smallest next adapter stage that proves completion mapping, duplicate
handling and lifecycle behavior against synthetic input and an in-memory sink.
The user approved preparing this design, not implementing or enabling it.

No live SDK/provider registration, real span subscription, automatic HTTP
instrumentation, exporter, network request, endpoint, credentials, personal
records, app launch, release, deployment or paid resource belongs to this stage.
Existing live telemetry remains untouched; this design does not certify its
privacy or delivery behavior.

## Source baseline

Read-only inspection used iOS HEAD `aeb8e14` plus its existing local approved
changes, and Android HEAD `45fb2edd`. These are source snapshots, not releases.

- iOS `roammate/Services/OfflineTelemetryProjection.swift` already provides the
  exact 15-name allowlist, finite ordered time validation, three outcomes and a
  synchronous injected `Collector`. The collector rechecks its gate for each
  acceptance, has a nonthrowing sink, and has no queue or exporter. Its `accept`
  method returns no delivery receipt. It has no identity deduplication.
- iOS `TelemetryService.swift` registers the actual provider and HTTP
  instrumentation; its span helper separately emits through `SuperlogTelemetry`.
  Those paths accept richer attributes and error text. **Do not attach this
  proposal to either path or claim it sanitizes them.**
- Android `TelemetryStartupPolicy.kt` suppresses instrumentation startup;
  `GuestBlockedExporters.kt` gates export and flush at call time and reports a
  blocked batch as success to avoid retries. It still delegates shutdown.
  `SpanFailure.kt` intentionally leaves status unset for some expected failures
  and cancellation. Unset must therefore not become fabricated success.
- No equivalent fixed-name/four-field Android projection was found in
  `core/telemetry/src`. This proposal is **iOS-only**, with Android behavior as
  a policy comparison, not a claim of implemented cross-platform parity.

## Alternatives

| Option | Benefit | Cost / boundary |
| --- | --- | --- |
| **A. SDK-neutral synthetic completion adapter — recommended** | Adds the missing lifecycle and duplicate-attempt contract while reusing the existing pure projection and collector; no SDK state or external dependencies. | Does not prove compatibility with real OTel callback types or live export. |
| B. Unregistered real-SDK snapshot adapter with synthetic spans | Exercises installed SDK types and completion extraction closer to a future processor. | Requires a separately pinned SDK callback/threading contract and broader fixture setup; unnecessary for deciding this lifecycle contract. No provider registration would be permitted even here. |
| C. Attach a processor/exporter to current application telemetry | Would exercise actual delivery. | Explicitly excluded: live callback duplication, consent transitions and existing richer export paths need a separate design and authorization. |

Choose **A** for the next local stage. Do not silently expand to B to claim SDK
integration, or to C to obtain a real delivery demonstration. If SDK-type
compatibility is the desired next acceptance instead, revise this design before
implementation rather than combining two stages.

## Components and flow

The proposed adapter is a small SDK-neutral type alongside the existing iOS
projection. A test fixture creates it with the existing collector's injected
gate and an in-memory recording sink. There is no default initializer that
discovers a service, global singleton, destination or consent state.

1. The adapter issues an opaque **synthetic completion handle** to the fixture.
2. The fixture supplies that handle and a completed value: fixed name, start,
   end and finite-enum status. There is no start-span hook, active context or
   parent relationship.
3. The adapter checks handle ownership/lifecycle and atomically consumes its
   single completion opportunity within the serial fixture execution model.
4. It calls the existing projector. Invalid input is discarded without calling
   the collector or producing a replacement record.
5. A projected record is offered to the existing collector; the collector checks
   its gate immediately before the synchronous recording sink.

The adapter must not reconstruct a record by copying an arbitrary dictionary or
serialize its input wholesale. Reuse the projector and collector rather than
introducing another allowlist, outcome mapping or timestamp validator.

## Exact input/output contract

Allowed names, case-sensitive with no prefix matching or normalization:

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

The sink receives exactly `name`, `start`, `end`, `outcome`. Names remain unchanged.
`start` and `end` are seconds represented as `TimeInterval`, finite, with
`start >= 0` and `end >= start`. Synthetic fixtures use fixed values from one
declared time basis; the adapter does not read a clock, convert SDK nanoseconds,
infer an epoch or add a duration field. Time-origin conversion for an SDK is
outside Option A.

Mapping uses existing `OfflineTelemetryProjection.Status`: `success` becomes
`"success"`, `error` becomes `"error"`, and `unset` becomes `"unknown"`.
Do not infer status from exception text, attributes, HTTP codes or expected-error
categories. A future SDK mapping must be separately reviewed.

Raw HTTP spans, arbitrary attributes/events/resources, trace/span/parent IDs,
user/device IDs, locations, URLs, messages, error descriptions, campaign/build
labels and consent identifiers are not adapter input fields and cannot appear
at the sink. Even hashes of those values are excluded. Synthetic poison fixtures
may contain such fields outside the adapter boundary solely to prove they are
never read or copied; they must contain no real records.

## Identity and duplicate attempts

Each handle is an adapter-issued, process-local fixture object with a consumed
bit and issuer identity. It is not derived from OTel IDs, timestamps, names,
user state, hashes or randomness from a live source, and is never output,
logged, serialized or persisted. The adapter retains no global handle registry
or historical identity cache; the fixture owns handle lifetime.

- A second completion using the same handle is discarded, even if its payload
  changes or the first attempt was invalid, gated off or occurred after shutdown.
- Two independently issued handles with identical name/time/status are distinct
  fixture completions and may each produce one record. Content equality is not
  identity and must not deduplicate legitimate equal-valued operations.
- A handle from another adapter is rejected and not consumed by that adapter.
  The issuing adapter may still consume it later.
- Consume before invoking the collector/sink so a same-handle reentrant call
  cannot produce a second record.

This is **at-most-once completion opportunity per synthetic handle**, not
exactly-once delivery, persistent deduplication or protection against two live
telemetry paths representing one operation. There is no retry or replay after
gate changes and no policy for deduplicating actual SDK span IDs in this stage.

## Lifecycle, execution and errors

Use one explicitly serial synthetic execution context for all adapter calls,
handle state changes, gate changes and recording-sink callbacks. The adapter is
not `Sendable` and makes no concurrent SDK-callback guarantee. Serial confinement
is a caller-enforced precondition of this synthetic harness; absence of
`Sendable` does not itself enforce thread confinement. No production caller is
permitted in this stage. Do not add a
background task, actor hop, lock around arbitrary callbacks or timed buffer to
this stage. Reentrant use of the same consumed handle is safe; fixtures must not
recursively generate new handles from the sink.

The adapter starts open. `flush` while open is a side-effect-free no-op: there is
no buffer and it does not call the sink or change gate state. `shutdown` is
idempotent, permanently closes this adapter, and performs no flush/export.
New handles are refused after shutdown; outstanding handles may be submitted
only to be consumed and discarded. Flush after shutdown remains a no-op.
Shutdown during a synchronous sink callback does not retract the record already
offered, but prevents subsequent completions.

Gate-off drops a valid record without buffering or retry. Re-enabling allows
still-unconsumed handles issued in either gate state to complete; it does not
revive consumed completions, including attempts already dropped while disabled.
The gate is checked
at acceptance, not captured when a handle is created. Serial ordering defines
the transition boundary; this does not prove a real concurrent logout guarantee.

Invalid names/times, duplicate/foreign handles and closed lifecycle produce no
record and no log. The collector's current sink is synchronous and nonthrowing;
the proposed fixture sink must retain that contract. A throwing or asynchronous
exporter is not a conforming replacement. Unexpected fixture failures fail the
test; there is no exception-text telemetry, failure queue or retry mechanism.
Do not interpret the collector's void return as delivery success: acceptance
tests assert the recording sink directly.

## Synthetic acceptance for a later approved implementation

Use a standalone offline Swift harness and existing synthetic XCTest patterns,
without launching the application or installing/registering any SDK. Run only
after implementation approval; this design pass ran no tests.

Required evidence:

- All 15 names × three statuses preserve exact four-field values (45 cases);
  unset remains unknown. Existing projection/gate regression coverage still
  passes, including nonfinite, negative and reversed times.
- Unknown/dynamic/HTTP-style names produce no sink record; case/prefix variants
  are rejected. Poison fields are neither accessed nor copied and the final
  record inventory is exactly four fields.
- Same-handle repeat and altered-payload repeat each produce at most one sink
  call; equal payloads under different handles produce two. Foreign handles do
  not affect their owner's later acceptance.
- Gate-off then gate-on cannot replay a consumed handle; a new enabled handle
  succeeds. Gate changes before completion are observed, including when the
  handle was issued while enabled. A handle issued while disabled, but never
  completed, succeeds on its first completion after enabling; a handle already
  completed while disabled remains consumed and its retry is dropped.
- An invalid first completion consumes its opportunity. Correcting and replaying
  that handle cannot produce a record; a new valid handle can.
- Same-handle reentrant completion from the sink is dropped. Shutdown in the
  sink prevents a later new completion without retroactively changing that call.
- Repeated flush/shutdown, pending handle after shutdown, handle issuance after
  shutdown and independent adapter instances obey the lifecycle above.
- Source/build-boundary inspection shows no SDK registration, real span
  listener, automatic instrumentation, URLSession/HTTP client, endpoint, file
  persistence, timer, exporter or invocation from application startup. Harness
  output contains only synthetic assertion results, not arbitrary payloads.

Passing these cases establishes only the synthetic adapter contract. It does
not establish Android runtime no-egress, native full-app test acceptance,
consent correctness of existing live telemetry, OTel callback compatibility,
cross-platform released parity or journey conversion baselines.

## Review and next authorization

Independent review by the cache agent found no blocking findings in the exact
contract, lifecycle or acceptance boundaries. Root accepted the design after
clarifying that unconsumed handles issued while disabled can complete after
enabling, consumed attempts cannot replay, and serial confinement is a
caller-enforced synthetic-harness precondition rather than a `Sendable`
guarantee. The paired gate-transition cases are included above. This is design
review only: no adapter implementation, SDK wiring or execution was approved or
performed by these reviews.

Root records the Bead outcome and asks for separate written-scope approval.
Recommended prompt:

> I recommend Option A: implement and test only the synthetic iOS completion
> adapter described here, leaving all SDK/provider wiring and live telemetry
> untouched. Alternatively, we can revise the design for an unregistered
> real-SDK fixture adapter before implementation. Which approach do you approve?

After the user approves the written scope, prepare a separate implementation
plan. No approval is inferred for owner release/commit scope, live export,
Android changes or production measurement from accepting this design.
