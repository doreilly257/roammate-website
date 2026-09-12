# State-correctness deployment — 12 September 2026

The user authorized automatic deployment of tested website/admin bug fixes during this review, provided hosting, Access policies, feature flags, legal wording, and backend/app projects remain unchanged. Both deployments use source commit `a95b835`.

| Site | Production deployment | Created (UTC) | Recorded rollback predecessor |
| --- | --- | --- | --- |
| Admin | `ef10ab34-6fff-4a37-ad82-29be044ea1d8` | 19:12:22 | `1f669570-a4b5-4415-bddf-421248821b31` |
| Public | `d1d8272a-bf47-4340-bb41-166cc6740d99` | 19:14:49 | `0f9e3a67-768d-4be3-8ba4-462a018f3892` |

Recheck the appropriate known-good deployment before any rollback. Normal public deployments include the nonce Function; they are not static-only rollbacks.

## Changes

- Admin quality and activity views distinguish failed reads from clean or empty results (`roammate-website-332`).
- Admin detail selection ignores stale responses, including responses arriving after the panel closes (`roammate-website-gu0`).
- Newsletter success remains successful when optional analytics throws (`roammate-website-vwb`).

## Verification

- Gates passed: 122 admin tests, 127 public tests, 15 nonce tests, applicable type checks and builds, 3,504 public pages, and 659 claims entries checked.
- The first public attempt stopped before upload because two offline fixtures exceeded their existing 10-second timeouts. Unchanged isolated tests passed 4/4, followed by a passing full serial retry. No gate or timeout was changed. Root cause is not proven; observed load of 11.8 alone does not establish causation. Investigation remains tracked in `roammate-website-lwk`.
- Full before/after production configuration and all three relevant Access apps/policies were identical. No feature-flag writes were made.
- Five unauthenticated admin probes returned the expected Access login redirects (`302`).
- Public Travello comparison, Bangkok guide, and terms returned `200`, distinct nonces, `no-store`, and no `ETag`. The comparison and guide referenced the new hashed NewsletterSignup JavaScript asset.
- An initial Python-user-agent asset request returned `403`. Three subsequent requests with a browser user agent and referer returned `200`, with cache statuses `MISS`, `MISS`, `HIT`, immutable caching, and bytes exactly matching the local built asset. This is a scoped observation, not a site-wide cache-ratio claim.

## Acceptance limits and remaining work

No production newsletter POST or real-time analytics test event was sent. Authenticated production admin UI behavior was not directly verified; prior local Workerd failure-state tests on two routes and real-controller VM race tests passed. Authenticated acceptance remains blocked under `roammate-website-d3m`; Access was not bypassed.

Video and untyped-album moderation decisions remain unavailable pending the backend media-contract fix. A read-only recheck found the handed-off `roammate-app-ios-g3sl` task still open; the handoff and backend project were unchanged. The proposed admin-form approach still awaits approval and is not included in this batch.

Earlier deployment reports remain unchanged as historical records.
