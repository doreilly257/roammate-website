# Offline flag parity implementation plan

Bead `bxa`; approved scope is Stage 1 of the reviewed feature-flag migration design. Root owns Beads, review and website commits. No owner commit/push.

## Scope and approach

Add only owner `api/src/__tests__/helpers/offline-flag-candidate.ts` and `api/src/__tests__/offline-flag-parity.test.ts`. Preserve the existing dirty typed-boolean fix. Import actual legacy KV evaluator, excursion stage predicates, and chat middleware into synthetic tests; do not modify their implementation or any production route/configuration/dependency.

The candidate supports the eleven known global boolean gates with explicit typed compatibility defaults. Accept complete synthetic versioned snapshots only; malformed/partial refreshes cannot overwrite a good snapshot. Fake provider availability is injected, never fetched. A deterministic injected clock expires snapshots at 60 seconds (synthetic parameter only). Unsupported targeting/missing context is unavailable, not provider bucketing. Excursion enum is explicitly unmigrated: test actual legacy stage semantics without supplying a candidate privacy fallback.

Snapshot receipt time is assigned only from the injected finite nonnegative clock, never trusted from provider payload. Age exactly 60 seconds expires; negative age (clock reversal), nonfinite current time, and invalid receipt time are unavailable/invalid. Failed refresh returns invalid (or unavailable for absent provider input), while a still-fresh previously validated snapshot evaluates with reason evaluated and its original revision; failure never extends age. Expired/missing evaluation returns compatibility fallback with unavailable and null revision.

Chat parity covers the actual generic guard only. The mounted location-message route is different: strict string `true` and `400/location_messages_disabled`. Preserve this distinction in an explicit source/fixture acceptance case; do not claim whole-route equivalence from generic-guard tests. Boolean candidate payloads reject string coercion. Add all four notification active/shadow precedence pairs against the actual mode resolver with synthetic KV and assert no sends or writes. Privacy route authorization remains unmigrated, not certified by enum predicate tests.

## Test-first sequence

Write the contract tests and establish RED for the missing candidate through an explicit existence assertion before import. Cover boolean/default parity, partial/malformed legacy records, candidate validation, refresh/outage/expiry, unsupported targeting, identity changes, unknown extension inertness, chat mappings, and all excursion enum stages. Prove the fetch guard rejects a positive synthetic probe; reset the observer and assert zero attempts across candidate/legacy operations. Assert no storage writes or externally wired imports.

Implement the minimum fixture helper, run GREEN, then add any uncovered edge cases test-first. Run the new suite plus existing flag/default/validation/privacy/gate suites, owner typecheck, targeted lint, whitespace, and scope checks. No app build, real provider/SDK, actual user data, network request, live flag, billing or deployment.

## Acceptance and review

Record actual test counts and limitations; local parity is not PostHog SDK/hash parity, live-state acceptance, or privacy-migration approval. Root arranges independent code/spec review before closure. Main report/plan may be committed by root; owner files remain local and uncommitted under the authorized scope.
