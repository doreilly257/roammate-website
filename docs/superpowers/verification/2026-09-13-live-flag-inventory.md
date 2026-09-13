# Read-only live flag configuration inventory

Date: September 13, 2026. Bead `059`; related `on8` migration and completed local harness `bxa` remain distinct.

## Scope and provenance

The user approved read-only flag inventory. Root queried the deployed backend configuration, the exact legacy `feature_flags` KV key, and twelve exact known PostHog keys. This document summarizes root's sanitized receipt captured at **2026-09-13T17:13:59.988Z**; its author performed no further provider calls or owner edits.

The [sanitized JSON receipt](./2026-09-13-live-flag-inventory.json) contains only allowlisted configuration/release identifiers, flag shapes, and absence results. An initial provider definition response incidentally included creator/editor metadata; those fields were discarded and excluded from subsequent retained/output receipts. Definition endpoints may include that metadata in their responses; no claim is made that later endpoint responses lacked it. There were no person/cohort-membership queries, identity-specific evaluations, production admin requests, or credential reads.

## Observed configuration

Backend Worker `roammate-api-production`:

- Deployment `4be27a68-bfe0-44ba-a618-f3ff9ecc931f` assigns **100%** to version `b100e60a-4552-4c90-9e13-1256a28c09ff`, version number **231**, created September 10 at 13:18:46.134533 UTC.
- Current settings and that deployed version identify `DATA_STORE` namespace `0b3d98281f744c47abd411121d10822d`.
- The four inspected environment binding names are absent in both current settings and the inspected version: `ENABLE_CHAT_TRANSLATION`, `ENABLE_CHAT_WHATSAPP_HANDOFF`, `ENABLE_CHAT_LOCATION_MESSAGES`, and `EXCURSION_PRIVACY_ENABLED`.
- An exact GET of key `feature_flags` in that namespace returned **Cloudflare 10009, key not found**. This is a missing-key observation, not an authentication failure, an empty object, or a record explicitly disabling every flag.

PostHog project **292728**, exact-key lookups:

| Known key | Observed definition state |
| --- | --- |
| `proximity_enabled` | Found, active; one 100% rollout group, zero property predicates |
| `ai_concierge_enabled` | Found, inactive; stored group remains 100% with zero property predicates |
| `trip_memory_enabled` | Found, active; one 100% rollout group, zero property predicates |
| `tonight_push_enabled` | Found, active; one 100% rollout group, zero property predicates |
| `notifications_canonical_shadow` | Not found |
| `notifications_canonical_active` | Not found |
| `matchmaking_enabled` | Not found |
| `verification_gate_enabled` | Not found |
| `chat_translation` | Not found |
| `chat_whatsapp_handoff` | Not found |
| `chat_location_messages` | Not found |
| `EXCURSION_PRIVACY_ENABLED` | Not found under this exact known key |

All four found definitions report not deleted/not archived, evaluation runtime all, and bucketing identifier `distinct_id`. Their definition metadata is **not a user evaluation**. An inactive flag is configured disabled; a not-found key is missing configuration, not a verified disabled definition. This twelve-key check is not a complete inventory of every PostHog flag or possible alternate key.

## Source implications and remaining uncertainty

Root's local source snapshot was `5dcab9b1aaf2673f554e393c8e03936782f74bf9`, with the existing local typed-boolean fix present. It was **not mapped to the deployed Worker version**, and no served admin-flags response or deployed evaluator was inspected.

The [source reconciliation](./2026-09-13-feature-flag-reconciliation.md) and [offline parity acceptance](./2026-09-13-offline-flag-parity.md) establish what that local implementation would do: missing KV uses its individual defaults, including proximity/trip-memory true and tonight-push false. Therefore **tonight-push's source default false versus its active 100% PostHog definition is a potential mismatch**, not confirmed disagreement between served backend and client evaluations. Do not convert this into a claim that scheduled push is currently enabled or disabled in production.

Likewise, absent chat environment names imply false only under the inspected local gate implementations. Missing excursion privacy configuration implies local stage off, but **off is not universally privacy-safe**: it disables discovery filtering in the current source. This inventory does not authorize enabling, migrating, or downgrading that stage.

Missing configuration, explicitly inactive configuration, and unavailable evaluation are separate states. Effective served behavior, identity parity, source-to-release correspondence, provider usage/allowance, and billing/no-charge limits remain **unverified**, not healthy or zero. No allowance or billing data was queried.

## Recommended next step and boundary

Recommend a separately approved **local synthetic drift-case extension** using this sanitized configuration receipt: represent the missing KV record, absent known env bindings, inactive AI definition, active tonight-push definition, and missing provider keys without converting absence to disabled. Assert expected potential drift and unavailable evaluation states against the existing offline harness; do not initialize an SDK or evaluate a real identity. Keep source-default implications labeled conditional until a separately authorized deployed-source mapping or scoped effective-state check establishes them.

No live writes, flag activation, provider migration, environment edits, SDK installation, secret changes, deployment, or billing changes occurred. This read-only inventory adds configuration evidence; it does not close the broader migration or authorize automatic reconciliation.

## Receipt review

Root independently checked the receipt's twelve-key/four-found/eight-missing counts, all four activation states and 100% groups without property predicates, and exclusion of creator/editor/email metadata. Root also confirmed the deployed version detail—not just current settings—contains the same DATA_STORE binding and lacks the four known environment bindings. A separate read-only reviewer approved the Markdown/JSON with no blocking findings, including source-versus-served limits and missing-state semantics. JSON shape/privacy-field checks, relative links, and whitespace checks passed. These reviews made no additional provider requests.
