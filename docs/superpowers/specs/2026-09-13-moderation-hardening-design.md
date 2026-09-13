# Moderation hardening and local-only original-media review

Date: 2026-09-13

Status: Written design explicitly user-approved for local-only implementation, implemented in `652e642` and independently re-reviewed. Verification: 57 focused tests and the 219-test admin suite before metrics integration passed. No deployment authorized or claimed; production original-media review remains disabled.

Scope: `roammate-website-7ku` (media), `roammate-website-xqs` (forms), and `roammate-website-i6q` (read failures). Beads remain the task/status authority.

## Goal and boundaries

Make moderation decisions explicit, show read failures truthfully, and develop original-image/video review locally without prematurely enabling unsupported production media.

No backend edits/deployment, production moderation actions, hosting/Access changes, secrets, feature-flag changes, legal-copy changes, or live mutations are authorized by this design. A later release requires its own applicable authorization and verification. Public-site routes, robots, RSS and sitemap are unaffected.

## Existing behavior and evidence

- `admin.roammate.com/src/pages/moderation.astro` fetches three summaries and only the selected report's target. Selection must belong to the returned queue; arbitrary report parameters cannot fetch private content.
- POST refetches the selected target, requires an open report and acknowledgement, and redirects with 303 after success. However, missing `action` defaults to dismissal, `formData()` errors are uncaught, and `String(form.get(...))` neither rejects duplicate values nor file parts.
- Failed queue reads become an empty array and also display “Nothing needs attention.” Failed log reads become an empty history with “No moderation actions have been taken.” These are false empty-state claims.
- Production currently rejects video messages and requires album `type === 'image'`. The sibling backend contract instead documents persisted `photo`/`video` values; it does not attest MIME type or prove deployment.
- Sources: existing `dev/action-forms.test.mjs`, `dev/moderation-on-demand.test.mjs`, strict handlers in `src/pages/users/[id].astro`, `excursions/[id].astro`, and `flags.astro`; sibling `../roammate-app-ios/docs/admin-report-media-contract.md`.

## Alternatives and recommendation

1. **Recommended: focused SSR hardening plus local-only native-media prototype.** Reuse native forms and image/video elements; add only the small browser controller needed to expose media readiness and failures. Minimal dependencies and a clear release boundary.
2. **Immediate production native-media enablement.** Simpler rollout but unsafe without verified deployed metadata, original playback and browser acceptance; rejected.
3. **Custom player or media proxy.** More control but introduces credential, arbitrary-fetch and maintenance risks without a demonstrated requirement; deferred.

## Architecture and data flow

Keep queue/log/overview loading and selected-target authorization in the Astro page. Separate only focused, independently testable concerns if needed: strict form parsing, target-to-review-description normalization, and browser media-readiness state. Do not rewrite the admin API client or unrelated pages.

1. Read summary results independently. Only a successful queue result supplies selectable reports.
2. Fetch at most one authorized target. Verify returned target type matches the selected report; missing, deleted, mismatched or malformed targets remain unavailable.
3. Normalize text and all applicable original attachments into a review description with an explicit supported/limited state. Render escaped content rather than raw HTML.
4. For media, keep decision controls disabled until every required original is usable and the operator explicitly acknowledges full review. Loading proves availability, not human review.
5. On POST, strictly parse first; then independently enforce selected/open report, target availability/type, environment gate, acknowledged review and allowed action before one API mutation. Success uses the existing canonical moderation 303 redirect. Failure remains visible without automatic retry.

## Local-only media boundary

The original-media capability must be **off by default and impossible to enable in a production build via a query, form, cookie or browser state**. Use an explicit local development/test capability combined with a build-time development check; no deployed runtime flag or configuration change is included. Tests exercise both branches. Production retains the existing unsupported video/album gate until an approved follow-up verifies the deployed backend contract and end-to-end review UX.

The local branch recognizes album `photo` and `video` only; missing/unknown/legacy types remain limited. `url` is the original and `thumbnail_url` is at most a labeled preview. Never infer type from suffixes or thumbnail presence. For messages, inspect both `image_url` and `video_url`; one attachment cannot stand in for another. Deleted messages or null targets cannot become reviewable content.

Validate media URLs structurally: HTTPS, exact hostname `media.roammate.com`, no credentials and no nonstandard port. Reject malformed/disallowed URLs rather than proxying them. Keep `X-Admin-Key` exclusively server-side. Retain `Cache-Control: private, no-store`, page `Referrer-Policy: same-origin` for native-form CSRF compatibility, and media-level referrer suppression where supported. Do not add third-party players, analytics or private-content logging.

Use original `<img>` with accessible description and `<video controls preload="metadata">` with normal audio controls, no autoplay and no forced mute. Image load must be successful with nonzero dimensions. Video must expose usable original playback; error, unsupported playback or inaccessible audio leaves a visible limitation. Metadata arrival or a poster alone must not unlock review. The operator is responsible for watching/listening to the full content and confirming; JavaScript cannot attest human review or be treated as a server-side security boundary.

The controller resets acknowledgement on media failure, target changes or review-state invalidation. No-JavaScript local media review remains disabled with an explanatory limitation; supported text-only native forms continue to work. Server checks distrust browser readiness claims and continue to enforce authorization, target support and strict acknowledgement. Strong cryptographic proof of viewing is not claimed or added.

## Strict form contract

- Catch malformed `formData()`; return HTTP 400 and a visible error without a mutation.
- Require exactly one string `reportId`, `action`, and `reviewed`; require `reviewed === 'yes'`. IDs must match the selected report exactly.
- Allow only `dismiss` or `remove_content_and_eject_user`; the latter still requires a target user. Never default an absent action.
- Allow zero or one string `notes`, truncating a valid string to the existing 500-character limit. Reject duplicates or file/blob values for every recognized field.
- Preserve actor identity from trusted server locals, not submitted fields. Preserve API failure/unknown-outcome guidance; do not redirect or retry after an unsuccessful mutation.

## Truthful read states

Queue, log and overview are independent results. Queue failure shows an unavailable subtitle and retry/error notice, not zero reports or “Nothing needs attention.” Successful empty queues retain an empty state appropriate to the selected status. Log failure shows unavailable history, never “No moderation actions have been taken.” A failed overview keeps the badge unknown rather than zero. Partial successes remain useful without disguising failed panels.

## Acceptance and verification criteria

- Extend actual-frontmatter tests using real `Request`/`FormData`, not Map-only mocks: missing/duplicate/file-valued fields, malformed multipart, unsupported action, mismatched IDs, absent acknowledgement and resolved targets all produce zero mutations; parsing failures return 400.
- Valid dismissal and eject/remove preserve actor, notes truncation and single-mutation behavior; success redirects 303 and subsequent GET does not mutate. Failed/ambiguous responses stay visible with no retry.
- Keep three summary calls for a 200-report queue, one target request for a selected report and zero arbitrary target fetches.
- Assert rendered failed queue/log panels do not contain successful empty-state claims; test independent failures and successful empty/nonempty results.
- Exercise local photo/video/message multi-attachment fixtures, unknown/missing type, null/deleted target, type mismatch, hostile URL variants, broken image, unsupported video, playback error and unavailable audio. No thumbnail or poster unlocks review.
- Browser-test native keyboard operation, visible loading/error/limitation states, disabled initial controls, acknowledgement reset, original playback/audio and no-JavaScript fallback using local fixtures only. Do not test mutations against production.
- Assert production-build capability stays disabled despite client input and album `photo`/`video` metadata. Retain explicit production unsupported-media regressions.
- Before any completion claim, run the admin test suite, Astro check and build. A passing local prototype does not establish backend deployment, production activation or comprehensive authenticated acceptance.

## Review and handoff

This document is a preserved draft, not a completed review loop or release approval. Resume with independent spec review and user written-spec approval, then the writing-plans workflow. Production enablement remains separate evidence-backed work in Beads; do not close media delivery solely because this draft or local prototype exists.
