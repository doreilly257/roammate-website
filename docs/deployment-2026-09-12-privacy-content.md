# Privacy and content deployment — 12 September 2026

The user approved deploying this batch with hosting, Access policies, and feature flags unchanged. Both Cloudflare Pages deployments use source commit `1abf835`.

| Site | Production deployment | Created (UTC) | Recorded rollback predecessor |
| --- | --- | --- | --- |
| Admin | `1f669570-a4b5-4415-bddf-421248821b31` | 18:57:30 | `bffdda0c-f2b8-4e08-9544-e485ccae8184` |
| Public | `0f9e3a67-768d-4be3-8ba4-462a018f3892` | 18:58:03 | `12b6921e-6bff-4baf-b6e0-c25c09101f78` |

Recheck the appropriate known-good deployment before any rollback; a normal public deployment includes the nonce Function and is not a static-only rollback.

## Changes

- Admin authenticated downstream responses receive `no-store`; API requests reject redirects rather than forwarding credentials (Beads `roammate-website-0yd`, `roammate-website-j2h`).
- Public content describes optional verification without safety guarantees, uses compatible-traveller wording, and corrects Android availability in three comparison blogs (Beads `roammate-website-zbu`, `roammate-website-mng`).
- Unsupported video and untyped-album moderation decisions remain unavailable pending the backend media contract fix (`roammate-website-7ku`, handed off to `roammate-app-ios-g3sl`).

## Verification

- Fresh gates passed: 111 admin tests, 123 public tests, and 15 nonce tests, plus applicable type checks and builds. Public output contained 3,504 pages; the claims gate checked 659 entries.
- Full serialized before/after production configuration and all three relevant Access apps/policies were identical. No feature-flag writes were made.
- Five unauthenticated admin probes (custom-domain root, users and moderation, Pages alias, and new deployment hostname) returned the expected Access login redirects (`302`).
- Six public paths (home, travel-companion-apps, three comparison blogs, and terms) returned `200`, with the expected corrected content and old clauses absent where applicable. Responses had six distinct nonces, `no-store`, and neither `ETag` nor `Last-Modified`.
- Three requests for one CSS asset were cache `HIT`s with immutable caching and identical bytes.

## Acceptance limits

Authenticated production UI behavior and downstream `no-store` headers behind Access were not directly observed. Local Workerd checks across eight routes and offline JWT tests passed, but production authenticated acceptance remains blocked under `roammate-website-d3m`; the Access boundary was not bypassed.

Redirect credential tests used dummy credentials only. No production credential leak was observed; this is not a claim that a production leak occurred or that an exhaustive leak investigation was completed.

Earlier deployment reports remain unchanged as historical records.
