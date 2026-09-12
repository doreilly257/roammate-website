# Admin action-form safety

Date: 2026-09-12. Tracking: `roammate-website-cta`.

## Approved scope

The user approved rejecting missing or invalid flag values and applying the existing moderation success-only POST → redirect → GET pattern to flags, users, and excursions. Errors remain visible and requests are never automatically retried. Tested website/admin bug fixes may deploy during this review only while hosting, Access policies, actual feature-flag settings, legal wording, and backend/app projects remain unchanged. Verification must not perform production mutations.

## Request handling

Keep the change local to the existing page handlers: no new helper/module, API type refactor, backend idempotency mechanism, or UI feature. Parse form data inside a try/catch. Required action, flag, and next fields, where applicable, must each have exactly one string value (`getAll`); reject missing, duplicate, or non-string values. Flags accept only the existing eight typed `FeatureFlags` keys and literal `true` or `false` values. Only existing supported actions are accepted. Optional notes accept at most one string value and retain the existing 500-character truncation.

Reject malformed payloads and unknown actions with HTTP 400 and a visible error before any mutation. A valid POST invokes its existing mutation once. Only a successful mutation returns HTTP 303 to the same canonical page, encoding detail IDs in the path; do not put raw notes, errors, or flash messages in the URL. The resulting GET reads current state and never mutates it. This prevents refresh from resubmitting a successful POST, but does not promise backend idempotency or eliminate every possible duplicate submission.

A failed mutation renders the normal page with its error rather than redirecting or retrying. Preserve that error even if the subsequent detail read returns 404 by guarding the existing missing-detail redirect with `!flash`. Existing authentication, origin checks, moderation limitations, and read-error handling remain in place.

## Implementation and verification

First add failing regression tests that execute actual Astro frontmatter using real Request/FormData objects and a stub API. Cover GET without mutation, valid supported POST actions, flag allowlist and literal boolean handling, missing/duplicate/non-string fields, malformed forms, unknown actions, mutation failure, and preservation of mutation errors when the following detail read is missing. Then make the smallest page-local change and confirm successful POST responses are 303, followed by a fresh GET with no repeated mutation. Verify redirect destinations contain no raw submitted data.

Run focused regressions and the admin test, type-check, and build gates. Exercise POST behavior through local Workerd against the local mock API only; production verification is read-only. Root coordinates the existing approved deployment workflow, verifies the Access boundary/configuration remains unchanged, and records evidence in Beads. This document records the approved correction, not a separate task tracker or a new approval gate.
