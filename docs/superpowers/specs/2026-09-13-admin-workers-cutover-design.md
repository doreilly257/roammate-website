# Admin Workers cutover and whole-deployment rollback design

Date: 2026-09-13. Status: **Design only; independently reviewed, no blocking findings.**
Independent review on 2026-09-13 approved the planning document only; this is not
execution approval and does not authorize implementation or cutover actions.
Issues: `roammate-website-1wi` (dependency exposure), `roammate-website-d3m`
(admin acceptance). Beads remain the status authority.

## Authorization and decision boundary

The user approved preparing this design, not performing the cutover. No Worker
creation/upload, service binding, DNS/custom-domain change, Access change, secret
write, production request carrying credentials, backend change or paid resource
is authorized by this document. Plan review must precede any such action, followed
by explicit approval of the exact operational scope. Main runtime/package files
remain Pages-compatible and unchanged.

The [local evaluation](../verification/2026-09-13-admin-workers-evaluation.md)
demonstrated Astro 7.3.2 / adapter 14.3.1 / Wrangler 4.131.1 with zero npm audit
findings, 247 passing tests, successful check/build and synthetic built-Worker
acceptance. Independent review reran 53 Access/runtime tests. Its source is local
branch `evaluation/admin-workers-2026-09-13`, commit
`26449774e009aa1918d39aaba2ae3231421e4926`, based on `996404c`; it is not pushed,
merged or deployed. Root decides its later durable handoff. Local success does
not establish production networking, keyscope or Access coverage.

## Proposed architecture

Replace only the admin SSR host with an explicitly approved Worker plus its
version-coupled static assets. Preserve the public `roammate.com` Pages project,
its deploy workflow, nonce Functions, DNS and all public content. Keep the existing
`roammate-admin` Pages project, complete known-good deployment, configuration and
Access protection intact as the rollback target; do not delete or rebuild it.

Prefer a Worker **Custom Domain** for `admin.roammate.com`, since this Worker is
the application origin. Cloudflare distinguishes this from a route layered in
front of another origin. Existing Pages association/DNS conflict must be resolved
in the reviewed runbook, not by assuming both origins can own the hostname
simultaneously. No broad `*.roammate.com/*` route is acceptable.
[Cloudflare routing guidance](https://developers.cloudflare.com/workers/configuration/routing/routes/).

### Required production-network compatibility resolution

The existing admin API client uses global `fetch` to `https://api.roammate.com`.
The owner's current routing evidence identifies Worker `roammate-api-production`
behind an API route. **Do not infer same-zone connectivity from the loopback mock.**
Cloudflare documents that a Worker on a same-zone route cannot be targeted by
ordinary Worker-to-Worker fetch; a service binding is required, whereas a target
Custom Domain supports that fetch path.
[Worker-to-Worker rules](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#worker-to-worker-communication).

Before implementation approval, obtain non-secret confirmation of the API's actual
route/custom-domain topology and exact target Worker/environment. If it is routed,
the proposed resolution is an **admin-only `ADMIN_API` service binding** to the
existing correct API Worker, with a reviewed API-client transport seam. Preserve
the exact `/v1/admin/*` URL, method/body, abort deadline, redirect refusal and
`X-Admin-Key` authorization; binding access must never replace backend auth.
No backend code, API DNS migration, secret rotation or new API service is implied.

That seam is **not implemented or verified by the evaluation commit**. Required
local acceptance is a two-Worker synthetic test exercising authenticated reads,
denied/malformed requests, timeout and credential-bearing redirect rejection
without fallback to an unintended network target. Fail closed when a required
production binding is absent. If topology permits existing fetch instead, record
why with owner evidence and verify that exact topology before live acceptance.
No workaround using public aliases or bypassing Access may be improvised.

## Security and no-cost invariants

| Boundary | Required invariant |
| --- | --- |
| Primary host | Preserve the intended Access app, allowed operator identities, identity-provider restriction, issuer and audience; exact current values come from a reviewed non-secret snapshot, not stale README examples. |
| Every alternate host | Keep `workers_dev: false` and `preview_urls: false`. Inventory default, version, branch and any validation/custom hosts; disabled hosts must be verified unavailable. Any deliberately enabled validation host needs its own reviewed Access protection **before** serving the candidate. |
| Retained Pages hosts | Continue protecting `roammate-admin.pages.dev` and `*.roammate-admin.pages.dev`, including the exact retained deployment URL. Keeping rollback does not permit an exposed alternate console. |
| Application auth | Retain signature/RS256, issuer, audience, expiry and malformed-token rejection. A token for an unrelated Access application must fail. Edge protection alone is insufficient. |
| API key | The console binding named `ADMIN_API_KEY` must contain the API owner's **scoped `ADMIN_CONSOLE_KEY`**, not the migration-capable master key and not a guessed legacy `ADMIN_READ_KEY`. Establish this through owner-controlled secure provisioning and non-secret attestation; never print values. |
| Data/cache | All authenticated SSR pages/fragments/errors/PRG responses retain no-store; denied responses retain no-store/noindex. No admin secret, private record or query data in static assets, source maps, logs or browser requests. |
| Static assets | Preserve Worker-first asset routing and validate actual auth/asset behavior rather than assuming `_headers` protects SSR. Static client files must contain no private data. |
| Mutations | Preserve same-origin enforcement, strict singleton form parsing, selected/open report checks, actor identity and no automatic retries. Read-only smoke is not mutation authorization. |
| Moderation media | Keep original-media prototype **off in production** (`localMediaEnabled(false, ...)` remains false); video/untyped/unsupported review remains unavailable. No runtime setting or migration approval enables it. |
| Resources/cost | Preserve `session: false`, image passthrough, no new KV/D1/R2/Images/DO/queue/AI resources, no paid plan, no GitHub CI, no paid monitoring. A binding to an existing API is still a configuration change requiring approval. |

Before an eventual upload, review actual account entitlements, current limits and
expected admin traffic. Worker-first requests consume Worker execution; a claim of
zero incremental cost cannot be inferred from the small local bundle. If the
proposed operation requires a paid plan/resource or exceeds the approved existing
allowance, stop for a separate decision. Do not auto-provision sessions or Images.
[Worker-first behavior](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/#run-worker-before-each-request).

## Review gates and proposed sequence — not execution instructions

**Gate 1 — exact source and topology.** Review the evaluation diff, production API
transport decision and any resulting implementation plan. Rebase/port only the
reviewed changes against then-current main; never overwrite intervening admin
hardening. Inventory Pages deployment, DNS ownership, Access applications,
binding names/types and API release identity using non-secret evidence. Historical
Pages `b31868a4` / source `e7974b2` is only a rollback **candidate** until rechecked;
`ef10ab34` was explicitly rejected as known-good because of the API redirect bug.

**Gate 2 — reproducible release artifact.** A separately approved implementation
must pass complete tests, type-check, build, fresh dependency audit, two-Worker
transport tests where needed, actual built-runtime auth/mutation-refusal checks,
local media-off checks and client-secret scan. Record exact commit, lockfile,
Worker version/asset manifest hashes and generated production configuration diff.
The evaluation's fake domain/loopback API and disabled deploy command are not
production configuration. Generated configuration must contain no bypass value,
unused resource bindings, accidental routes or inherited parent-project settings.

**Gate 3 — rollback-ready operational approval.** Approve the exact Worker name,
hostname ownership operations, Access changes if any, scoped-secret provisioning,
existing-API binding and operator verification window. Record the operator who can
authorize and execute rollback, and confirm permissions for both directions.
Snapshot the current DNS record IDs/values/proxy state, Pages custom-domain status,
retained deployment ID, Access application/policy settings and secret names/types.
Do not export secret values. Retain a complete Pages deployment, not just HTML.

**Gate 4 — protected candidate verification.** Under that later approval, provision
only the reviewed candidate. No default or preview URL is opened for convenience.
If pre-cutover live testing needs a separate hostname, its exact name/resource and
Access policy require approval first; a synthetic AUD is never carried into live
configuration. Verify token isolation, unauthenticated refusals, origin checks,
scoped-key ownership and safe authenticated read behavior. Do not enable routes or
attach the primary domain to an unconfigured candidate. A 200 error page is not
successful API acceptance.

**Gate 5 — controlled origin switch.** Pause operator mutations during the switch.
Perform only the pre-reviewed Pages-domain/DNS-to-Worker ownership transition,
keeping Access protection continuous. Verify certificate/routing status rather
than assuming an instantaneous change. Compare primary-host behavior and every
alternate host with the approved boundary matrix; inspect representative overview,
quality, lists, selected details, moderation limitations and flags read state.
Record the serving Worker version and matched asset build, not merely a successful
upload. Do not resume mutations until the operator accepts the new host.

Live destructive operations, feature-flag writes, review decisions and test-account
creation are outside read acceptance. Any required valid-mutation verification
must have its own explicit safe target/rollback approval; otherwise the relevant
`d3m` mutation acceptance remains outstanding. Likewise a source-only backend
album/webhook/media contract is not newly declared deployed by this migration.

## Whole-deployment rollback

Rollback triggers include authentication bypass, unexpected alternate-host access,
secret/private-data exposure, failed or misrouted backend calls, broken operator
reads/forms, missing privacy headers, unavailable required assets, unexpected
resource/cost activation or inability to prove the approved version is serving.
Do not wait for multiple occurrences of a security failure.

The pre-approved reverse transition must first stop operator mutations and ensure
the affected hostname remains Access-protected (or fail-closed) throughout. Detach
only the candidate Worker association/route that was added, restore the captured
Pages custom-domain association and exact proxied DNS state, and verify that the
retained **whole known-good Pages deployment** serves again: Function, static assets,
configuration and existing secret bindings together. If Pages' production pointer
changed, restore the explicitly retained deployment rather than rebuilding current
main. Recheck TLS, unauthenticated refusals, authenticated read acceptance and
all Pages aliases; do not loosen Access to make rollback appear successful.

Do not describe this as instantaneous: domain ownership/certificate reattachment
and propagation must be accounted for in the approved maintenance window. If a
safe reverse association cannot be specified from current account state, Gate 3
does not pass. The fallback during uncertainty is a protected unavailable console,
not a public one or an emergency master-key substitution.

Rolling back hosting does not undo backend mutations. Record any approved mutations
already committed and reconcile their outcomes before resuming work; never replay
ambiguous requests automatically. Retain the candidate privately for diagnosis;
deletion, key rotation or destruction of either host is a separate authorization.
The public website remains unaffected in both directions.

## Acceptance and issue disposition

This design can be accepted as a reviewed plan without changing production.
`1wi` production exposure remains open until an authorized serving deployment is
verified with the patched dependency artifact (or an alternative supported remedy).
`d3m` retains its scoped-key, authenticated-route, media and mutation acceptance
requirements; do not infer their completion from local tests or migration alone.

Independent plan review must specifically assess same-zone API routing, complete
hostname coverage, secret scope, no-cost constraints and the reversible hostname
ownership sequence. **No cutover action follows automatically from approving the
document.** Root obtains the applicable execution authorization separately.
