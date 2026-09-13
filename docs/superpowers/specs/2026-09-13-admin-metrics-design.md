# Admin content and webhook metrics

Date: 2026-09-13  
Status: Written design independently reviewed and explicitly user-approved for local-only implementation. Implementation independently reviewed and approved against local source-contract fixtures. No backend or admin deployment authorized or claimed; release-aligned verification remains separate.

## Goal and boundaries

Make the operator overview distinguish stored content from empty album scaffolding, and expose privacy-safe verification webhook receipt/processing evidence on Data quality. Integrate the additive API contract from owner bead `roammate-app-ios-8z2u`, source commit `a7fe505`, into website bead `roammate-website-vxf` without interpreting missing deployment fields or failed probes as zero activity or a healthy pipeline.

This is a website/admin-console design only. No backend edits, production probes, backend/Pages deployment, human KYC, provider calls, feature-flag changes, credentials, identity payloads, or moderation changes are authorized. September 4 album/media counts in the issue are historical diagnostic evidence, not current production metrics. The API source handoff is not deployment evidence.

## Evidence and current behavior

- `admin.roammate.com/src/lib/api.ts`: `Overview.content` currently includes `albums`, `media`, `messages7d`, but not `albumsWithMedia`.
- `admin.roammate.com/src/pages/index.astro`: Content displays an unqualified “Albums” card beside media items. A successful overview is rendered; failed responses already have an error surface.
- `admin.roammate.com/src/pages/quality.astro`: fetches overview and five quality endpoints concurrently. Overview failure is currently omitted from its shared errors array. Row-count chart filters out zero rows; profiles render every reported column aggregate. Generic freshness marks null as “never” and recent timestamps green, which is unsuitable for the new webhook evidence.
- Existing error surfaces are not privacy-sanitized: the API client forwards parsed upstream error strings or raw response excerpts, and overview/Data quality render them. HTML escaping does not redact sensitive diagnostic content.
- Read-only owner evidence: `roammate-app-ios/api/README.md`, “Admin health aggregates”; `api/src/routes/admin-quality.ts`; commit `a7fe505` adds `api/src/routes/admin-console.ts` overview metric and source tests. Existing server-to-server `X-Admin-Key` checks remain required; no browser API/key access is introduced.

## Approaches considered

1. **Recommended: additive overview metrics and explicit webhook evidence on Data quality.** Reuse current pages and server API client; introduce a small shared presentation helper for missing/invalid/ambiguous values. This fixes the operator interpretation without new services or dashboard architecture.
2. **Pass through new API arrays with generic rendering.** Smallest change, but hides missing additions, converts null freshness to “never,” and risks green health implications or zero-filled probe fallbacks. Rejected.
3. **New health dashboard or richer backend probe-status contract.** Could distinguish idle from unavailable and support justified alert thresholds, but crosses current ownership/approval scope. Defer; clearly disclose limitations of the delivered contract instead.

## Exact contract and presentation semantics

| Source | Field | Meaning |
|---|---|---|
| `/overview` | `content.albumsWithMedia` | Existing albums with at least one stored `album_media` row, counted once per album. |
| `/overview` | `content.albums` | All existing albums, including empty scaffolds. |
| `/overview` | `content.media` | Stored media-row count; unchanged. |
| `/quality/tables` | `verification_webhook_events.rows` | Retained webhook ledger rows, not lifetime HTTP deliveries. |
| `/quality/columns` | Webhook profile | Aggregate filled/blank counts for `state`, `received_at`, `processed_at`, `attempt_count`; distinct-state count only, never actual values. |
| `/quality/freshness` | `verification_webhook_received.latest` | Newest recorded receipt clock, UTC ISO string or null. |
| `/quality/freshness` | `verification_webhook_processed.latest` | Newest recorded processing clock, UTC ISO string or null; includes ignored events. |

Owner-documented failure semantics are intentionally part of this design: table probe failure omits a table; profile row-count failure returns `rows: -1`; column aggregate failure retains zero-filled fallback; freshness returns null for empty, invalid or unavailable data. The UI cannot recover distinctions the API does not expose.

Only finite, nonnegative safe integers are accepted as counts. Missing, null, negative, fractional, nonnumeric or out-of-range metrics render **Unavailable**, never coerced to zero. A present valid zero from overview or an emitted table-count entry is a real reported zero. Missing table entries are unavailable, not absent tables or proof of undeployed code. Malformed or duplicate expected entries are unavailable rather than silently selecting one.

Missing feature fields use “Unavailable — not returned by this API response”; do not assert backend deployment is the cause. Network/HTTP failure uses fixed, locally authored privacy-safe messages plus unavailable metric state. On overview and Data quality, replace displayed upstream/network error detail with a fixed message such as “Could not load overview data” or “Could not load webhook freshness data,” selected from the known request context, not the response body. A validated numeric HTTP status may accompany the message; network failure uses fixed unavailable wording. Do not render or newly log raw error strings, upstream bodies, credentials or sensitive diagnostic details. This is a scoped presentation correction on these two pages, not an API-client redesign or changes to other admin pages.

## Overview and quality album section

On the overview, show **Albums with media** as the primary album-content metric and **Total albums** as a separate metric, retaining **Media items** and existing message metrics. Helper text: “Albums containing stored media rows”; “Includes empty album scaffolds.” Do not describe either as organic engagement, visible media, playable blobs or successful uploads. No demo/review/media-type exclusions exist in the contract.

Data quality receives the same compact album summary using its existing overview response. Surface overview failure there as well, without blanking other successful quality sections. Both pages reuse the same normalization and labels rather than independently defaulting fields. Preserve a valid total/media count if the new field is absent. If a response claims albums-with-media exceeds total albums, mark the pair inconsistent/unavailable and show a neutral data-quality warning; do not calculate a negative empty count.

Do not derive empty-album counts or percentages in v1: the separate metrics and explanation suffice, and avoid unnecessary coupling to other integrity checks. Existing empty-album integrity semantics remain “expected scaffolding,” not a new incident.

## Webhook evidence section

Add an explicit **Verification webhook evidence** section to Data quality, always present even when an older API omits all additions. Display retained row count, newest recorded receipt and newest recorded processing with persistent labels. Keep unrelated row charts/freshness behavior unchanged; route the two webhook source IDs through this dedicated neutral presentation so they are not duplicated as generic green/red freshness rows.

Display valid timestamps as absolute UTC plus relative age in text. Null or invalid timestamps read **Unavailable — no reliable recorded timestamp** with an explanation that empty data and failed probes are indistinguishable. Missing source IDs read **Unavailable — not returned by this API response**. Future timestamps retain their absolute value with a clock/anomaly caution rather than claiming recent health; malformed dates never reach the generic formatter. Use a fixed injectable observation time in tests.

No green “healthy,” red “broken,” assumed heartbeat threshold, KYC-success label or delivery-success percentage is inferred from these values. Prominent explanatory text states: “These are retained ledger records, not lifetime webhook deliveries. Processing includes ignored events and does not prove successful identity verification. Recent timestamps do not establish pipeline health; older timestamps may mean inactivity.” Do not join receipt/processing maxima into latency: they may represent different events.

The existing generic profile must not also render the webhook profile with misleading zero meters. Render its safe aggregate columns within this dedicated section, using an exact allowlist (`state`, `received_at`, `processed_at`, `attempt_count`). Show only counts, never state/provider values or new distribution/drilldown buttons. Suppress unexpected columns and distinct counts outside `state`.

For profile aggregates, positive valid values may display as **Reported aggregate**, not healthy/completeness proof. A zero aggregate is ambiguous because of the documented probe fallback: show **Unavailable / zero not distinguishable from probe failure**, not numeric zero or a zero-percent meter. A `rows: -1`, missing/invalid profile or malformed aggregate makes the affected profile/value unavailable. Suppress completeness percentages and success-color meters for this webhook profile entirely. The table endpoint's independently emitted row-count zero remains displayable as retained rows; do not use it to manufacture trustworthy column probe outcomes. These conservative rules can be relaxed only after an explicitly returned probe-status contract is separately agreed.

## Components, data flow and privacy

Keep the existing server-rendered Astro flow: browser → authenticated admin page → existing server API client → owner API. No new client polling, logging, analytics, exported datasets or third-party requests. Existing Access/AdminLayout behavior and environment/key handling remain untouched.

Likely implementation boundary is `admin.roammate.com/src/lib/admin-metrics.ts` for narrow typed normalization/display-state helpers, additive optional `albumsWithMedia` in `src/lib/api.ts`, and bounded changes to `src/pages/index.astro` and `src/pages/quality.astro`. Optional transport typing reflects older deployed responses; runtime checks still apply. Use existing cards/tables and neutral typography, not a redesign. Availability and limitations must be visible text, not color-only or hover-only information.

Read fixtures and assertions belong under existing `admin.roammate.com/dev/*.test.mjs` conventions, extending the mock server only after written approval and implementation planning. Other agents own moderation work; do not edit those files as part of this feature.

## Acceptance and release limits

Tests must cover current additive response; old response missing additions; valid real zero counts; null/negative/NaN/fractional/malformed values; albums-with-media exceeding total; whole overview failure; independent quality endpoint failures; missing/duplicate table/profile/source entries; profile `rows: -1`; zero-filled aggregate fallback; unexpected sensitive profile fields; null/invalid/future timestamps; and partial rendering of unaffected sections. Include failure fixtures containing sensitive sentinel values in parsed upstream JSON error strings, non-JSON HTTP response bodies, and thrown network-error messages; assert neither page renders these values and that only fixed request-context messages and validated statuses appear. Assert no zero, “never,” “healthy,” KYC-success, or completeness-meter fallback is manufactured from unavailable/ambiguous webhook data.

Use local admin fixtures for overview/Data quality rendering and narrow-screen/readability checks. Verify no provider statuses, IDs, document data, event payloads, leases or digests enter rendered HTML, logs or browser requests. Run existing admin tests, Astro check and build during implementation; exact commands come from `admin.roammate.com/package.json`. No GitHub CI or paid infrastructure is added.

Implementation acceptance can be established locally against source-contract fixtures, including an old deployed-API fixture. Release-aligned acceptance additionally needs separately authorized owner backend rollout evidence and admin release verification. Keep `vxf` open for any required live acceptance not achieved; do not infer deployment from commit `a7fe505` or close the issue merely because a design or local UI passes. Root owns Beads status and commit/push workflow.

## Review gate

Independent design review and user review of this written document precede implementation planning. No code changes or deploys are authorized by this document itself.
