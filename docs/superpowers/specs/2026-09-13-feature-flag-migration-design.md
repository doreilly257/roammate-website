# Feature-flag provider migration design

Date: September 13, 2026. Bead: `roammate-website-bu9`, discovered from `on8`.

**Status: independently reviewed design proposal, awaiting user approval of the written scope.** Approval to prepare this document is not approval to implement it or change an effective flag. No provider request, live inventory, SDK installation, deployment, flag write, secret change, or paid resource is part of this work.

## Goal and boundaries

Make the standing PostHog-only flag policy executable without silently changing existing backend behavior, mobile availability, notification delivery, or excursion privacy. Establish a typed inventory, deliberate failure behavior, server-authoritative evaluation, and a reversible path from legacy KV/env evaluation.

The first implementable proposal is an **offline, synthetic contract/parity harness**, requiring separate approval after this design is reviewed. A later operational migration requires effective-state inventory and explicit cutover approvals. The source inventory below is not a statement of current production state.

Non-goals: turn on dark features, change verification eligibility, restore obsolete profile-setup gating, create a growth experiment, enable notification delivery, change excursion visibility, create a new flag provider, or expose raw provider definitions to clients. No unrelated feature may be coupled to another flag.

## Verified starting point

Read-only source inspection used iOS/backend owner HEAD `aeb8e14d5e47cf83b098f454dcdfb9059deaa8ba`, plus its existing uncommitted local typed-boolean fix, and Android HEAD `45fb2eddca7ac13f3ea216cc3675f000e3939d00`. Owner files were not changed. The earlier [reconciliation report](../verification/2026-09-13-feature-flag-reconciliation.md) records historical evidence and the 93-case local regression acceptance; those tests were not rerun as part of this design.

- Owner `CLAUDE.md` says all feature flags belong in PostHog and forbids new KV/env flag authorities. The closed migration Bead `i6kt` explicitly deferred the remaining migration; closure does not establish provider parity.
- `api/src/services/feature-flags.ts` still reads and writes `DATA_STORE` key `feature_flags`. It does not implement PostHog synchronization. `/v1/admin/flags` GET/PUT in `api/src/index.ts` accepts the existing scoped console key as well as the master key; PUT is a real global KV mutation. The proposed operator path must use the scoped key, never require the master key.
- The local fix rejects malformed known boolean patches before KV access and normalizes malformed stored known fields to their individual defaults. Unknown extension fields and valid partial updates remain supported. Do not expand that compatibility contract during migration by coercing strings or interpreting unknown fields as executable flags.
- iOS `FeatureFlagService.swift` reads PostHog independently. Its eight executable fallbacks are all false, contrary to stale beta-on comments. Android `FeatureFlagService.kt` and `FeatureFlagBridge.kt` expose four typed keys; `Analytics.isFeatureEnabled` returns false for absent values or exceptions. Android wiring installs the PostHog bridge in `RoammateApplication`; neither platform proves backend parity.

### Known inventory and compatibility defaults

These defaults describe current source behavior, not desired production values.

| Server key / source | Type and fallback | Relevant enforcement / client mapping |
| --- | --- | --- |
| `proximity_enabled`, KV | boolean, true | Proximity middleware; same iOS/Android key, client fallback false |
| `ai_concierge_enabled`, KV | boolean, false | Suggestions middleware; same iOS/Android key, false |
| `trip_memory_enabled`, KV | boolean, true | Private/public trip routes; same iOS/Android key, false |
| `tonight_push_enabled`, KV | boolean, false | Scheduled push work; same iOS/Android key, false |
| `notifications_canonical_shadow`, KV | boolean, false | Notification mode selection; no verified typed mobile counterpart |
| `notifications_canonical_active`, KV | boolean, false | Active mode takes precedence over shadow in current source |
| `matchmaking_enabled`, KV | boolean, false | Bespoke matchmaking gate; iOS same key, false; intentional closed-surface 404 preserved |
| `verification_gate_enabled`, KV | boolean, false | Mutating-request verification enforcement; no verified typed mobile counterpart |
| `ENABLE_CHAT_TRANSLATION`, env | exact stringification to `true`, otherwise false | Maps to iOS PostHog key `chat_translation`; translation mounts verified |
| `ENABLE_CHAT_WHATSAPP_HANDOFF`, env | same boolean parsing | Maps to iOS `chat_whatsapp_handoff`; invite mounts verified |
| `ENABLE_CHAT_LOCATION_MESSAGES`, env | same declared guard parsing | Maps to iOS `chat_location_messages`; declaration is not proof of every route mount |
| `EXCURSION_PRIVACY_ENABLED`, env | enum `off/read/write/full`, unknown → off | `read` adds discovery filtering; `write` enables invitation/access routes; `full` currently passes both predicates |

`PROFILE_SETUP_ENABLED` is historical, not an active gate to migrate. The first inventory review must reconcile all additional direct callers, not assume this table is exhaustive merely because the known service interface has eight keys.

## Options and recommendation

1. **Recommended target: PostHog as the sole configured authority, behind a typed backend evaluation boundary.** Separate definition transport, evaluation, capability projection, and business enforcement. First prove semantics with synthetic definitions and identities. A production-compatible transport/cache strategy must be reviewed later; this proposal does not assume a free or supported Cloudflare Worker adapter already exists.
2. **Remote evaluation for every request.** Easier to delegate targeting to the provider, but adds latency, outage coupling, request consumption, and potentially identity/property disclosure. Not recommended for mutating authorization paths or scheduled work, and never an automatic fallback from local evaluation without separate privacy/cost approval.
3. **Retain KV/env and add only a registry.** Lowest immediate behavioral risk and a useful transitional baseline, but leaves dual authorities and does not satisfy the standing policy. Do not rename it a completed PostHog migration or implement a new permanent KV flag system.

The selected architectural target does not select an SDK, add a dependency, or authorize a persistent definition cache. PostHog documents that local evaluation needs server-side secret access and that stateless/edge initialization with only an in-memory cache can inflate requests. A future shared cache would need an explicit **cache-only** policy decision, bounded expiry, and infrastructure/no-cost review; it must never become an independently writable flag authority. If those constraints cannot be met, keep the existing runtime unchanged rather than silently choosing a paid or privacy-expanding alternative. See [PostHog local evaluation](https://posthog.com/docs/feature-flags/local-evaluation).

## Proposed boundaries and data flow

**Registry:** one typed entry per logical flag: canonical key, legacy mapping, boolean/enum schema, current compatibility fallback, owning service, enforcement points, client-safe capability name if applicable, expected configuration state, migration stage, and rollback class. Expected states distinguish deliberately disabled from missing/unavailable without treating unavailable as false or healthy. The registry describes defaults; it does not override provider values with a second operator-editable store.

**Definition adapter:** accepts versioned validated definitions from a synthetic fixture initially. Future provider integration returns `available`, `unavailable`, or `invalid` with a nonsecret revision marker. Partial or malformed refreshes never overwrite a valid snapshot. Unknown enum values, boolean strings, missing required targeting inputs, and unsupported rule operators produce an explicit non-success result; there is no implicit truthiness or remote fallback.

**Evaluator:** takes a registry key, validated snapshot, and trusted evaluation context; returns typed value, bounded reason (`evaluated`, `legacy`, `fallback`, `unavailable`, `invalid`), and revision. It is pure in the initial harness: no fetch, disk persistence, analytics capture, SDK initialization, or side effect. A request evaluates once against one snapshot, avoiding mixed values within a transaction.

**Enforcement:** backend middleware/services remain authoritative on every protected operation. A client flag, cached capability, request body, or analytics property cannot authorize access, bypass membership/privacy/verification checks, or start expensive scheduled work. Preserve existing HTTP statuses and `code: "feature_disabled"` contracts; do not turn known disabled surfaces into generic server errors or change intentional matchmaking concealment as migration cleanup.

**Client projection:** eventual authenticated responses expose only allowlisted resolved capabilities and a coarse freshness state, never provider definitions, targeting rules, secrets, or security configuration. Existing PostHog UI checks remain independent until an approved client migration. During compatibility testing, server denial always wins; unsupported/missing capability data keeps the current false client fallback. A stale true value must not optimistically unlock a write. Guest/public responses may contain only public capabilities, not user-specific decisions, and no authenticated projection may enter shared HTTP caches.

## Targeting and identity

The legacy server booleans are global. Do not accidentally replace them with per-user targeting during a provider migration. The first synthetic parity set uses global definitions with exactly matched values. Cron/service gates use an explicit service/global evaluation context, never an arbitrary user's cached assignment.

Percentage rollouts, cohorts, platform/version predicates, or identity changes are separate policy choices. If later approved, use one server-derived stable opaque subject and defined guest-to-account transition; clients cannot nominate another subject or supply trusted eligibility properties. Compare exactly the same identity, properties, definition revision, and provider hashing semantics across iOS, Android, and backend. Do not implement a home-grown bucketing algorithm and call it provider parity.

Missing properties or unsupported cohorts are unavailable evaluations, not matches. No new raw user IDs, email, phone, location, message content, verification evidence, contact lists, or personal profile properties may be sent to a provider for migration. Even pseudonymous IDs remain sensitive and require explicit approval before any new external flow. Synthetic IDs are the only identifiers permitted in the first harness.

## Failure and offline behavior

The baseline migration default is **per-flag compatibility**, not blanket fail-closed: proximity and trip-memory server defaults remain true; high-cost/notification/matchmaking flags remain false; verification-gate fallback remains false to avoid a provider outage unexpectedly making existing accounts read-only. Authentication, object authorization, and existing privacy enforcement still run independently.

For synthetic transport experiments, use a proposed maximum validated snapshot age of 60 seconds, no stale-true extension for high-cost gates, and deterministic clock injection. This number is a test parameter, not an approved live freshness guarantee. A production cache lifetime and propagation SLO must be accepted per risk class after Worker/transport measurements. Expired or absent snapshots produce the documented fallback plus an unavailable reason; they must not masquerade as an operator-selected false. Revocation-sensitive gates cannot cut over until the owner accepts and tests the maximum stale-enable interval.

Mobile startup/offline behavior retains current false defaults. Account logout/switch clears any future account-bound capability projection before another account can observe it. A provider refresh failure does not block app launch or change onboarding requirements.

### Excursion privacy is a separate safety boundary

`off` is a compatibility default, **not a universal privacy-safe fallback**: current `isDiscoveryFilterEnabled` returns false at off. Once private data or invitations exist, automatically falling from write/full to off can disable filtering. Do not migrate this enum with generic boolean defaults or a last-known-value shortcut.

Before this flag can leave legacy evaluation, require a separately approved invariant that private records stay filtered on reads regardless of provider availability and that invitation writes can close without disabling read protection. Synthetic tests must cover every stage, owner/member/invitee/outsider, guest/authenticated reads, direct detail requests, discovery/search, and stage downgrade. No proposed fallback or rollback may publish private records. If this invariant cannot be proved, leave the enum unmigrated and explicitly block its cutover.

Notification active/shadow also requires explicit precedence and mutual-effect tests: shadow comparison must not send a second notification. Verification-gate activation remains its previously required noticed/scheduled owner decision; provider migration alone cannot activate it.

## Privacy, observability, and no-cost constraint

The initial harness produces local aggregate parity results only: fixed key, candidate revision, match/mismatch/unavailable counts, and synthetic case labels. It emits no exposure events, HTTP spans, person updates, production identifiers, or live telemetry. A future adapter must prove automatic evaluation-event capture and fallback network behavior are disabled or explicitly approved; SDK getter calls alone are not evidence of zero network activity.

Future operator views should enumerate registered keys and separately show configured, deliberately disabled, missing, invalid, stale, and unavailable. Aggregate mismatch/fallback alerts may use fixed keys and bounded counters, not per-user logs or full exception text. No alerting provider, export, or production dashboard change is authorized here.

No new hosting, paid tier, billing change, or unbounded polling is acceptable. Zero additional spend is a gate, not a claim inferred from public free-tier marketing. Before provider integration, obtain authorized project-specific allowance/usage evidence and verify a hard no-charge behavior at exhaustion. Include existing mobile traffic, Worker cold starts, retries, definition refreshes, and automatic SDK events in the request budget. Current documentation prices definition fetches differently from individual evaluations; recompute from then-current terms rather than assuming cache refreshes are free. See [PostHog cost controls](https://posthog.com/docs/feature-flags/cutting-costs). If a reliable no-charge ceiling cannot be established, do not enable live integration.

## Staging, acceptance, and rollback

**Stage 0 — this design.** Source-based inventory and architecture review only. Unknowns remain explicit. Root and backend/mobile owners review; user approves the written design before a local implementation plan.

**Stage 1 — separately approved local synthetic harness.** Reuse actual legacy evaluators with in-memory KV/env fakes and a pure candidate adapter. Assert complete parity for known booleans/enums, partial/malformed input, missing data, outages, unsupported targeting, identity changes, snapshot expiry, and enum transitions. Network guard must fail every attempted outbound request. Candidate evaluation must not affect any route result or trigger cron, notifications, AI, or storage writes. Keep unknown extensions inert. Existing typed-boolean regressions remain green; no production-equivalence claim comes from synthetic results.

**Stage 2 — separately authorized effective-state inventory and transport evaluation.** Read only allowlisted configuration metadata after explicit access approval; do not enumerate people or pull personal records. Reconcile dashboard definitions, legacy effective values, environment stages, client identity semantics, usage allowance, and deployed release identifiers. Resolve missing/ambiguous state rather than populate guessed defaults. Validate chosen SDK/runtime/cache compatibility and deterministic provider parity with synthetic data before any live shadowing.

**Stage 3 — separately approved shadow.** Preserve legacy as the only decision authority. Define privacy-safe counters, request/cost budget, freshness bound, duration, and owner before enabling any comparison. Start synthetic-only in an isolated environment; live request mirroring is not an implicit next step. Require zero unexplained mismatches across a complete approved cohort and failure matrix, not merely a low average mismatch rate.

**Stage 4 — separately approved one-flag cutover.** Begin with an explicitly chosen low-risk flag whose effective value and targeting are unchanged. The actual flag is not selected from source defaults. Deploy selection as a reviewed code/release mapping rather than create a new hidden env/KV rollout flag. Preserve old client contracts. Do not migrate privacy, verification, notifications, or paid-work gates together. Block legacy admin PUT for migrated keys with an explicit response; never silently write an unused KV value or silently redirect a KV write into a provider mutation. The provider dashboard becomes the sole authorized configuration editor only after that operator workflow is reviewed.

**Rollback:** retain a checked prior deployment and pre-cutover nonsecret effective-state record; never copy unknown provider values into KV. Before a cutover, prove the prior runtime's values, schema compatibility, and data-safety behavior remain valid. On parity, privacy, freshness, cost, or availability failure, stop advancement and revert that reviewed provider-selection deployment only within an explicitly approved operational rollback. Do not blindly switch back to an out-of-date KV snapshot. Flags with irreversible effects or changed private-data semantics need a bespoke rollback; excursion rollback must preserve read filtering. No rollback here authorizes a live flag flip, full provider reset, or unrelated deployment.

**Stage 5 — separately approved retirement.** Remove migrated KV/env reads and obsolete admin write surfaces only after rollback retention, both-platform compatibility, and owner acceptance. Preserve configuration history without secrets. `on8` does not close until effective inventory, provider authority, failure behavior, and parity are verified; completing this design closes only the design Bead when root accepts it.

## Decisions required before implementation

The owner should review the recommended typed backend/PostHog-only target and approve, revise, or reject the synthetic-only next stage. No credential or live-state inventory is needed to review this proposal. Transport selection, cache-policy exception if any, live inventory access, targeting/identity rules, no-charge enforcement, freshness SLOs, privacy-stage safety changes, and production cutover remain separate gates—not approvals inferred from “prepare the design.”

## Review record

September 13, 2026: independent owner-source reviewer approved with no blocking findings after checking actual defaults, environment privacy stages, and notification mode semantics. Root review also found no blocking issues, specifically confirming the excursion-off caveat, preserved true compatibility defaults, source-versus-live distinction, and explicit no-cost gate. The 60-second value remains a synthetic test parameter only. These reviews approve the design artifact for presentation; they do not authorize implementation, live inventory, SDK/provider work, flag changes, or deployment.
