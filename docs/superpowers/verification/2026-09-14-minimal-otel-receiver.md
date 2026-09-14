# Minimal OTLP receiver verification

Date: 2026-09-14

Related design: [production iOS telemetry integration](../specs/2026-09-13-production-telemetry-integration-design.md), rb24.

Status: Independently reviewed and root accepted. One explicitly authorized
synthetic record was accepted into the targeted receiver log view. This is not
application integration or release acceptance.

## Approval and cost boundary

The user explicitly authorized exactly one synthetic log POST despite the stated
unverified-cost condition. The user also supplied an account screenshot that
showed roammate / Default on **Free**, approximately **77K of 5M logs**, and a
**$0 current bill**. This establishes the current visible free-plan/allowance
baseline, not a guarantee of unlimited free ingestion, unchanged future pricing,
long-term retention or a post-request billing reconciliation.

No billing setting, subscription, deployment, app code, provider, instrumentation
or app runtime was changed. No personal records were queried. The single-record
authorization does not authorize further probes or production sending.

## Exact synthetic request

The root executed a single JSON POST to the configured Superlog logs intake using
the existing owner-source public ingest credential, loaded locally without
printing it (not an MCP connection); this report intentionally contains no token
or authentication value. Request payload was **340 bytes**, containing only OTLP
structural containers, one actual observation timestamp and the four operation
values below. No client resource/scope attributes, IDs, severity, flags,
`timeUnixNano`, error text, additional log or counter was supplied.

| Value | Sent value |
|---|---|
| name | `profile.load` |
| start | `1700000042` (epoch-second double value) |
| end | `1700000043` (epoch-second double value) |
| outcome | `unknown` |
| observedTimeUnixNano | `1789379175331786000` (decimal string) |
| Observation UTC | `2026-09-14T09:46:15.331786Z` |

Body structure was `resourceLogs[].scopeLogs[].logRecords[]`, with
`observedTimeUnixNano` and `body.kvlistValue.values` containing exactly name,
start, end and outcome. The operation dates were fixed synthetic values; actual
observation time was captured separately, not derived from operation end.

The first attempted inline command produced a Python `SyntaxError` caused by
inline shell quoting, before any Python body execution or POST. The corrected
temporary script ran as session
`41524`, chunk `b06cf4`, exit **0**. Its receipt records **requestsAttempted: 1**;
there was no retry or followed redirect. The failed inline command must not be
counted as another request or represented as a receiver rejection.

## Response and independent readback

The one request returned:

- HTTP **200**
- Content-Type **`application/x-protobuf`**
- Response body **0 bytes**

The probe's deliberately JSON-only parser classified this as
`ambiguous_response_not_json`. That classification is preserved in the receipt;
it was not silently rewritten to success based on HTTP status. A separate targeted
read-only `query_logs` check in **Default**, searching the synthetic start marker
`1700000042`, returned **no records before** the POST and **exactly one record
after** it. The root inspected that record and reported:

- All four body values matched the request.
- Displayed timestamp was `2026-09-14T09:46:15.331786000`, matching observation time.
- Trace/span IDs, log attributes, service and severity were empty.
- The only resource metadata was receiver-stamped `superlog.project_id`.

The project stamp was added by the server, not sent by the client. Consequently,
this evidence supports a minimal **client-supplied** payload, not a claim that
the receiver stores no metadata. The targeted readback confirms this one record's
immediate ingestion and visibility independently of the probe's response parser.
It does not prove long-term retention, every outcome/name, production volume,
application concurrency or future receiver behavior.

## Proposed bounded response-contract amendment

The primary [OTLP logs response schema](https://raw.githubusercontent.com/open-telemetry/opentelemetry-proto/main/opentelemetry/proto/collector/logs/v1/logs_service.proto)
defines `ExportLogsServiceResponse` with optional partial success. An empty binary
protobuf message represents its default response with no rejected records; a valid
JSON `{}` likewise represents default success. These are encoding-specific
interpretations, not a rule that any empty HTTP response succeeds.

For this receiver, the future adapter should explicitly support the observed
combination **HTTP 200 + `application/x-protobuf` + exactly zero body bytes** as
the default binary success response. Unsupported content types, empty JSON or
missing/undecodable expected content remain ambiguous; arbitrary 2xx is not
acceptance. Nonempty protobuf must be parsed with a bounded schema-aware decoder
or classified unsupported/ambiguous—never assumed successful. JSON partial-success
responses still require documented rejection-count handling.

Retain the proposed **16 KiB** streamed response limit, fixed internal outcomes,
no raw response diagnostic logging/persistence, no retries and matching-request
terminal acknowledgement before releasing the single request slot. The
[OTLP specification](https://opentelemetry.io/docs/specs/otlp/) allows partial
success with HTTP 200; status alone remains insufficient. This proposed parser
change is not implemented by the one-off probe or authorized for app integration.

## Receipt and limitations

Read directly for this report:
`/tmp/roammate-single-otel-receiver-probe-20260914.json`.

SHA256:
`f3fe0af285894d9d8d2bb24e2a7390bf7d7e9480bb3745e88c9897acef4a3463`.

The temporary receipt contains synthetic payload/response metadata only; it is
not a durable credential, raw user log export or application build artifact.
Readback/account evidence above was supplied by the root's targeted tool check
and the user's screenshot; the report author did not issue another request.

Remaining gates are written acceptance of the production integration/race design,
its implementation plan, offline serialization/response/concurrency tests, later
approved app verification and any release/network scope. Preserve the selected
non-guest/non-test policy and unrelated channels; remove duplicate legacy exports
only for the exact 15 migrated names. No whole-app telemetry privacy claim follows
from this one synthetic result.
