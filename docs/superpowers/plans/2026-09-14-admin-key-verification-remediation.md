# Admin Key Verification and Remediation Procedure

**Status:** Proposed procedure; no secret retrieval, credential probe, configuration change or deployment executed by this document task.

**Goal:** Establish whether the active admin console uses the backend's scoped credential rather than its master credential; if historical attestation is impossible, define a separately approved safe forward remediation.

**Architecture:** Prefer existing deployment-bound provenance over live credential experiments. Keep key identity, code provenance, and contract availability as separate acceptance claims. All issue status remains in Beads, not this procedure.

**Scope:** User selected read-only bundle tracing plus preparation of this procedure. Execution involving secret material or any production write requires separate, explicit approval. Use the executing-plans or subagent-driven-development skill for any subsequently approved implementation.

## Existing evidence and limits

Parent investigation reports the following identifiers; revalidate active deployment IDs before any future execution:

| Component | Observed evidence | What it does not establish |
| --- | --- | --- |
| Backend | September 10 version `b100e60a` (version number 231) declares both `ADMIN_CONSOLE_KEY` and `ADMIN_API_KEY`; inspected authorization accepts either through `matchesAny([env.ADMIN_CONSOLE_KEY, env.ADMIN_API_KEY], supplied)` | Presence does not establish distinct values, console possession of either value, or September 13 contract availability |
| Admin Pages | Production deployment `c185fa92`, source `6f4cf940`, sends its `ADMIN_API_KEY` binding as `X-Admin-Key` | The Pages binding's name does not identify whether its encrypted value is the backend scoped key or master key |
| Backend provenance | Source commit absent from available deployment metadata and original deployment log | An artifact match may narrow candidates but is not automatically a unique source-commit attestation |

Cloudflare documents that Pages secrets are hidden after being set and must be configured before a deployment uses them. Therefore current project configuration is not evidence of the secret associated with a particular already-created deployment; record project environment and deployment identity separately. Do not treat a project settings edit as retroactively modifying an immutable deployment's bindings. [Pages bindings and secrets](https://developers.cloudflare.com/pages/functions/bindings/#secrets)

Success on a route accepting both keys cannot distinguish them. Failure can reflect routing, access policy, expiry or configuration rather than key scope. Do not query personal records, use master-only routes as probes, add temporary diagnostic endpoints, disclose hashes of secrets, or infer equality from timestamps/names.

## Stage 1 — Nonsecret provenance inventory

This is the preferred read-only next action, not a request for the user to guess unknown facts.

1. Identify the exact active Worker version/deployment and Pages production deployment, account/project/environment, and any alternate serving deployment. Stop on concurrent deployment changes and refresh the inventory.
2. Inspect only nonsecret deployment receipts, CI run metadata, and secret-manager version-reference metadata already accessible under the approved scope. Do not open secret values, environment dumps, screenshots of secret forms, or broad logs likely to expose values.
3. Look for an existing trusted provisioning receipt linking the same scoped secret version to the exact backend version and Pages deployment; also require evidence that the backend master uses a distinct value/version lineage. Different secret-manager item names alone do not prove different bytes.
4. Distinguish an authoritative injection receipt from a local `.env` file or project configuration snapshot. A local value is not evidence of what an immutable live deployment received.
5. Record only deployment IDs, source/artifact identifiers, nonsecret receipt references, evidence timestamp, and a verdict: `verified scoped`, `verified not scoped`, or `unknown`. Never record credentials or credential fingerprints/hashes. Do not copy sensitive secret-manager paths into a public repository.

**Acceptance:** A trustworthy chain must bind the value identity and its distinction from the master to both exact deployments, with no intervening secret/configuration change invalidating the chain. If the chain is incomplete, remain `unknown`; do not repeat the same metadata query indefinitely.

## Stage 2 — Secure comparison, only if separately approved and feasible

This stage is conditional and is not authorized by approval to prepare this procedure.

An authorized operator may use an approved secure environment and known-source provisioning records if it already has legitimate access to the relevant secret versions. No attempt is made to extract hidden values from deployed runtimes.

1. First establish that the available versions were actually injected into the identified deployments. Without that provenance, comparison proves only local candidate equality and does not solve the deployment question.
2. Review a minimal comparison tool and its secret-handling boundary before using real material. Verify it using synthetic unequal/equal/absent cases offline. It must have no network, tracing, crash dumps, command echo or persisted secret output; use approved protected input channels rather than arguments or shell history. Never place real values in chat, source, temporary fixtures or generated reports.
3. In that secure boundary, compare the Pages candidate to the backend scoped candidate **and separately confirm the scoped candidate differs from the backend master candidate**. Treat missing or empty material as inconclusive. If master comparison is unavailable, do not claim “not master.” Do not print lengths, prefixes, hashes, error payloads or any values.
4. Emit only the three-state verdict and the nonsecret deployment/receipt references. Destroy ephemeral comparison state according to the secure environment's policy; do not claim guaranteed memory erasure from a high-level language.

**Stop condition:** No trustworthy existing injection provenance or approved secret access means no comparison. Prepare Stage 3 rather than asking the user again which credential they used.

## Stage 3 — Forward remediation proposal, not execution

Remediation establishes the future state; it cannot prove which key the old deployment used. A concrete change request must include all of the following before approval is sought:

### Consumer and change inventory

- Enumerate every known consumer of backend `ADMIN_CONSOLE_KEY`, including Pages production, previews, scripts, automation and any other services. Use source/configuration references without reading or publishing credential values. Unexplained consumers or incomplete ownership prevent a blind rotation.
- Enumerate affected Worker versions/routes, Pages aliases/environments and deployment artifacts. Preserve unrelated bindings, secrets, routes, access policies, master consumers, DNS, stores and apps.
- Prefer a **Pages-only re-provisioning** when a trusted, recoverable, distinct scoped value and its current backend injection are established. Do not rotate the backend merely because the Pages value is unreadable.
- If the scoped source value is unavailable or cannot be distinguished from master, propose a coordinated scoped-key rotation with every affected consumer and a bounded outage/recovery plan. Leave the master unchanged. No blind overwrite, bulk secret replacement, or opportunistic migration is permitted.

### Artifact and rollback gate

- Identify and independently review the exact production-compatible backend artifact and exact Pages artifact to use. Do not deploy current dirty source or the isolated Astro/Workers migration as a side effect of a secret change. Code/binding parity must be demonstrated; any unavoidable source change needs its own review and explicit inclusion in approval.
- Record a rechecked known-good backend version and Pages **production** deployment, their compatibility, and the recovery procedure. A rollback target existing in history does not prove its credentials still work. Cloudflare permits rollback to successful production deployments, not previews. [Pages rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/)
- Prove how old credentials/bindings can be recovered under the exact platform operation without exposing them; if no safe rollback exists, stop. A fallback to the master is not an acceptable recovery plan.
- For scoped rotation, specify overlap or maintenance sequencing and every intermediate state. The current single scoped binding does not imply dual-scoped-key support. Adding dual-key code requires separate review/approval; otherwise explicitly account for consumer downtime and recovery. Do not assume atomic updates across Worker and Pages.
- Specify the exact production mutation mechanism and its activation behavior before execution. `wrangler secret put` creates and immediately deploys a new Worker version; `wrangler versions secret put` creates a version without that immediate deployment. Neither is a read-only verification command. [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/#via-wrangler)
- Treat Pages project secret configuration and the new deployment consuming it as distinct steps. Capture the resulting deployment-bound receipt, not just “settings saved.” Revalidate semantics against current official documentation and synthetic staging before relying on secret rollback behavior.

### Validation and stop rules

- First rehearse the exact change and rollback with fake keys and synthetic data in an approved non-production environment; no paid resources or new infrastructure are inferred as approved.
- Predeclare any live acceptance request in the change approval: endpoint, safe semantics, request cap, aggregate-only response handling, and absence of mutation/personal data. No live request is authorized here. HTTP method alone does not prove a route is non-mutating.
- Require a deployment-bound provisioning attestation proving Pages scoped equality and scoped/master distinction. Availability checks alone cannot prove scope because the existing backend accepts both keys.
- On failed acceptance or unexpected deployment/binding drift, stop and invoke the separately approved rollback/recovery. Do not retry with the master, widen permissions, inspect private records or rotate unrelated credentials.
- Record only sanitized version IDs, artifact provenance, timestamps, verdicts and recovery outcome. Close only the credential prerequisite if proved; moderation/admin contract, hosting, release and other Beads retain their independent gates.

## Decision options after this procedure

Judgment scores use progress 40%, safety 40%, effort/cost 20%; they are prioritization estimates, not measured probabilities. Each dimension is scored out of 10.

| ID | Next action | Progress | Safety | Effort/cost | Weighted score | Boundary |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| A | Finish the bounded nonsecret provisioning/consumer inventory | 8 | 10 | 9 | **9.0/10** | Read-only; no secret values |
| B | Turn identified gaps into an exact artifact/rollback/remediation change request | 9 | 9 | 7 | **8.6/10** | Planning only; conditional on A |
| C | Retain unknown key attestation and await an authoritative existing receipt | 3 | 10 | 10 | **7.2/10** | No production change; delays acceptance |

**Recommendation: A + B in that order**, unless A proves the prerequisite and makes remediation unnecessary. A secure comparison or production remediation is a distinct future approval request, not an automatic consequence of choosing this combination.

**Final approval boundary:** This document does not authorize secret retrieval, secret creation/rotation, Pages settings edits, Worker version creation, deployment, rollback, credential probes, personal-record queries, billing changes or release. Present the exact bounded operation and recovery evidence for separate approval only after prerequisites are satisfied.
