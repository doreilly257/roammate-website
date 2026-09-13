# Admin service-binding transport — local verification

Date: 2026-09-13. Status: **Local implementation verified; independently reviewed.**
Scoped issue: `roammate-website-v3j`. Related issues: `roammate-website-1wi`,
`roammate-website-d3m`; Beads remain the status authority.

## Authorization and scope

The user approved local `ADMIN_API` transport implementation and two synthetic
local Worker tests only. Implementation stays in
`.worktrees/admin-workers-evaluation`; main runtime and package configuration
remain unchanged. This does not authorize a live binding, Worker upload, deployment,
DNS/domain/Access change, secret write, production API request, backend change,
paid resource, evaluation-branch push or merge.

This extends the [local Astro 7 evaluation](2026-09-13-admin-workers-evaluation.md),
whose baseline source is local commit
`26449774e009aa1918d39aaba2ae3231421e4926`. The independently reviewed
[cutover design](../specs/2026-09-13-admin-workers-cutover-design.md) remains a
planning document, not execution approval. Its original evaluation commit does
not contain this subsequent transport work.

## Implemented local contract

The transport selects the required service binding without
silently falling back to global network fetch. The service binding does not replace
backend authorization: the server-side scoped key remains in `X-Admin-Key`.
The existing `/v1/admin/*` path, query, method, JSON body, redirect refusal and
15-second deadline through response-body consumption remain intact.

Every non-loopback target now requires `ADMIN_API`. Ordinary fetch is retained only
for the local mock: HTTP, hostname exactly `127.0.0.1`, `[::1]` or `localhost`,
without URL userinfo. HTTPS localhost, lookalike hostnames and credential-bearing
local URLs do not obtain this exception. Invalid URL configuration fails closed.
An existing binding takes precedence even for a local target; its receiver is
preserved, and a binding rejection never triggers network fallback.

## Evidence record

Implementation source is local-only branch `evaluation/admin-workers-2026-09-13`,
commit **`8a6bfd111a5ffddafd0da17d93898623dad018fe`**, following baseline
`26449774e009aa1918d39aaba2ae3231421e4926`. The evaluation worktree is clean; neither
commit was merged or pushed. The four changed files are:

- `admin.roammate.com/src/lib/api.ts` — binding selection and fail-closed guard.
- `admin.roammate.com/src/env.d.ts` — optional binding type, no value/configuration.
- `admin.roammate.com/dev/api-client.test.mjs` — existing transport fixture alignment.
- `admin.roammate.com/dev/service-transport.test.mjs` — guards and two-Worker tests.

The report author inspected the source, tests and final commit identity; execution
results below were supplied by the implementing root and independently reviewed.
These are new results, not the earlier 247-test baseline or 53-test review.

| Command in evaluation `admin.roammate.com` | Observed result |
| --- | --- |
| `npm test` | Final 255 passed, 0 failed, 0 skipped; approximately 22.1 seconds. |
| `npm run check` | 0 errors, 0 warnings, 2 existing hints. |
| `npm run build` | Passed. |
| `node dev/workers-evaluation-smoke.mjs` | Existing synthetic built-Worker smoke passed. |

Final suite evidence: root terminal session `6963`, chunk `65f763`, exit 0.
Check/build/smoke evidence: root session `13806`, chunk `66a5b0`, exit 0.
Only test enhancements followed those gates; product source did not change.
No new retained filesystem log path was supplied; these terminal references are
not durable log files. Re-run the commands above from the recorded local commit
to reproduce results. The initial focused RED run had two failing tests before
implementation; the later focused run passed 32 tests before final additions.
Independent transport review reported no remaining findings. No new audit run is
claimed here; dependencies/configuration were unchanged from the prior evaluation.

### Actual two-Worker assertions

The test transpiles the real `src/lib/api.ts` into a synthetic console Worker and
binds it to a second synthetic API Worker in local Miniflare/workerd. The complete
matrix is one node:test case, not an additional count of separately named tests.

- GET/POST/PUT preserve exact `/v1/admin/ok?fixture=one`, method, synthetic key,
  JSON content type and body; missing/wrong keys return 403.
- All five redirect statuses (301/302/303/307/308), for all three methods, are
  refused. The destination receives no request and no global network call occurs.
- API 400 detail and malformed JSON are handled; missing remote binding returns
  503 without reaching the synthetic API.
- Concurrent stalled-header GET and stalled-body POST exercise the real
  15-second deadline, completing within the asserted 14–23-second window. Mutation
  timeout retains the unknown-outcome warning; receiver counts prove each request
  was attempted once. The delayed body tail keeps an actual pending runtime event,
  rather than mistaking workerd's hung-request cancellation for the deadline.
- Both Workers use a denying outbound observer. A positive synthetic probe first
  proves the observer returns 502 and records the request; after reset, the entire
  transport matrix records zero outbound requests. These are synthetic URLs and
  fixtures, not production traffic or backend mutations.

Separate source-level tests assert exact missing-binding failure, malformed/local
lookalike configurations, preserved binding receiver and rejection without global
fetch fallback. Existing suite coverage and built-Worker smoke retain application
Access/form/privacy behavior; this two-Worker fixture itself is a transport test,
not proof of live Access policy or real scoped-key provisioning.

## Remaining deployment boundary

Even successful local two-Worker tests do not establish the actual API Worker
target/environment, live route topology, production scoped-key provenance,
Access coverage, account entitlements or reversible hostname ownership. These
remain the cutover design's separately authorized gates. Local results alone do
not close production dependency exposure or `d3m` live acceptance requirements.
