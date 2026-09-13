# Offline feature-flag parity: Stage 1 acceptance

Date: September 13, 2026. Bead `bxa`; approved design `bu9`, broader migration `on8` remains separate.

## Scope and actual changes

The user approved only the first offline harness stage of the [reviewed design](../specs/2026-09-13-feature-flag-migration-design.md). The [implementation plan](../plans/2026-09-13-offline-flag-parity.md) was independently reviewed before helper implementation.

Exactly two new files were added in owner `/Users/doreilly/Work/roammate-app-ios`:

- `api/src/__tests__/helpers/offline-flag-candidate.ts` — pure synthetic global-boolean candidate with a deterministic injected clock and in-memory snapshot.
- `api/src/__tests__/offline-flag-parity.test.ts` — synthetic candidate/actual-legacy parity and boundary tests.

No production evaluator, route, provider integration, SDK, dependency, configuration, deployment, billing, flag value, or owner Git commit/push was changed by this work. Existing dirty owner files, including the earlier typed-boolean fix and concurrent Swift work, were preserved. The helper lives only in the test subtree and is not wired into application startup or a production route.

## Exercised contracts

The synthetic candidate accepts complete versioned fixture snapshots for eleven global boolean gates: the eight known KV keys and three canonical chat keys. Compatibility defaults preserve true proximity/trip-memory and false verification/high-cost gates. Values are copied after validation; malformed or partial refreshes cannot overwrite the previous valid snapshot, and unknown extensions never become executable flags.

Receipt time comes from the injected clock, never a provider-supplied timestamp. **60 seconds is a synthetic test parameter only.** Age exactly 60 expires; observed expired/reversed snapshots are cleared. Nonfinite/negative receipt times and provider-supplied future receipt times are rejected. A failed refresh reports invalid or unavailable while a still-valid older snapshot remains evaluated at its original age/revision; failure never extends its lifetime. Missing/expired evaluation exposes an unavailable reason with the compatibility default, not a false claim of an operator-selected value.

Identity context is restricted to exact own enumerable keys for synthetic user or service contexts. There is no user cache, targeting implementation, percentage bucketing, identity hash, or claim of PostHog SDK parity. Unsupported targeting is rejected rather than accepted as a successfully evaluated targeting rule. Malformed context returns reason unavailable with the per-flag compatibility value, which remains true for proximity and trip-memory; this is not universally fail-closed. Backend authorization and enforcement are outside this fixture.

Tests use actual legacy implementations with local fakes:

- `getFeatureFlags`: all eight keys with true/false, malformed/partial/absent/throwing KV cases, and no `put` calls.
- `requireFeature`: three generic chat guards across five string/missing inputs; disabled responses remain 404 with `feature_disabled`.
- Actual mounted conversation route: boolean true, string true, string false, and missing location flag. Boolean true does **not** enable this route: it uses strict string comparison and returns `400/location_messages_disabled`. String true with intentionally incomplete synthetic location metadata reaches `400/invalid_location_share`. The injected database prepare function is forbidden and is never called. This proves the gate distinction without sending or storing a message, not full successful location-message behavior.
- `getNotificationCanonicalMode`: all four active/shadow pairs, preserving active-over-shadow precedence with only synthetic KV reads; no sends or storage writes.
- Actual excursion enum and predicates: unset, invalid, off, read, write, full. Candidate always returns unmigrated for the privacy enum. These predicate tests explicitly do **not** certify full privacy authorization or make off universally privacy-safe; off disables discovery filtering in current source.

The existing fetch deny guard is reused. A positive synthetic probe first proves the observer blocks and counts an attempted fetch, then resets its count. Candidate and legacy operations must finish with zero subsequent attempted fetches. The helper source-boundary assertion excludes imports, transport calls, timers, environment access, console output, clock reads outside injection, SDK references, and KV writes. This is an offline harness guarantee, not a certification of every production transport or arbitrary future code.

## Test-first and review evidence

1. Initial contract run: **56 expected failures** at the explicit missing-helper assertion; no candidate implementation existed yet.
2. Minimal helper plus clarified mounted-route/notification coverage: **64 passed**.
3. Expanded typing/time matrix exposed expired enablement resurrecting after moving the synthetic clock back: **1 failed / 108 passed**. Clearing an observed expired/reversed snapshot fixed that behavior.
4. Independent review identified inherited `kind` plus an unexpected own key passing a key-count check. Four additional context cases reproduced it: **2 failed / 111 passed**. Exact own key-set validation fixed it; missing/inherited discriminator and extra-key contexts are rejected.
5. Final combined acceptance: **206 unique tests passed across seven files** — 113 new harness cases plus the same 93 existing flag/guard/privacy/verification/matchmaking cases retained from earlier local acceptance.

An initial typecheck caught Node-versus-Worker URL typing and an overly narrow test literal type; those test-only issues were corrected before final acceptance. An exploratory combined command named a nonexistent `feature-disabled-contract.test.ts`; its five-file/195-test result was not used as final coverage. The final command below explicitly includes the correct seven existing files.

```sh
npm run test -- \
  src/__tests__/offline-flag-parity.test.ts \
  src/__tests__/feature-flags-validation.test.ts \
  src/__tests__/feature-flags.test.ts \
  src/__tests__/feature-guard.test.ts \
  src/__tests__/excursion-privacy-flag.test.ts \
  src/__tests__/verification-gate.test.ts \
  src/__tests__/matchmaking-routes.test.ts --maxWorkers=1
npm run typecheck
npx eslint src/__tests__/offline-flag-parity.test.ts \
  src/__tests__/helpers/offline-flag-candidate.ts --max-warnings 0
git diff --check
```

The chained commands exited **0**: owner execution session `95570`, final chunk `a8af83`. Both `tsc --noEmit` and `tsc --noEmit -p tsconfig.workers.json` passed; targeted ESLint and whitespace checks passed. No full backend suite or app build is claimed.

Independent source/spec/quality reviewer approved after the context fix with no remaining blocking findings.

**Separate root verification:** root independently reran the same seven suites and obtained **206 passed**, seven files, in 10.03 seconds, followed by both TypeScript configurations and targeted ESLint. That independent chain exited **0**, session `96446`, final chunk `98311f`. This is a second acceptance run, not another 206 distinct tests. No further owner source changes followed it. Root also reviewed and corrected the report's unavailable-fallback wording so it does not imply universally fail-closed behavior.

## Remaining boundaries

This completes only the local synthetic harness proposal's implemented contracts. It does not establish current production flag inventory, live provider targeting/parity, no-cost provider transport, private-data safety under migration, cross-platform release parity, or rollout approval. No credentials, real identities, records, provider requests, SDK initialization, or deployed flag changes were used. `on8` and later provider/transport/privacy/cutover gates remain open according to their own acceptance requirements. Root owns Bead disposition and the website evidence commit; owner files remain local and uncommitted.
