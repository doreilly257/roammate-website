# Feature-flag reconciliation — 2026-09-13

## Scope and conclusion

Read-only source/history investigation at approximately 11:08 UTC in `/Users/doreilly/Work/roammate-app-ios`, HEAD `ba61e0877f151a0ed94bef42b6fb32fcd54528f9`, followed by a separately authorized narrow local validation fix described below. No production/provider requests, secrets, flag enablement, migration, deployment, owner Git commit/push or Xcode build are part of this slice. Source and offline fixtures do not establish effective production flag values or released client behavior.

**The standing policy is PostHog-only; the actual server implementation still evaluates KV and environment values.** At the inspected HEAD, `api/src/services/feature-flags.ts:1–7` described PostHog dashboard → manual/webhook sync → KV, but executable `getFeatureFlags`/`setFeatureFlags` only read/write `DATA_STORE` key `feature_flags`. Searches of `api/src` and `api/scripts` found no implemented PostHog sync/evaluation adapter. An external/manual sync is not disproved, but was not verified. Calling the local implementation a demonstrated PostHog-backed cache overstates the evidence. The local follow-up corrected this misleading header comment to state actual direct-KV behavior and the still-standing PostHog-only policy. Source line references below describe the inspected revision and may shift with that local fix.

## History reconciled

- Owner `i6kt`, titled “Migrate all feature flags to PostHog,” closed on August 29 because the obsolete profile-setup gate stopped blocking onboarding. Its **close reason explicitly defers remaining KV migration**, recommending reopening/refiling when needed. Closure is not migration acceptance.
- Owner `pflk` says “i6kt migration is CLOSED: do not reimplement or assume KV still owns flags.” Its subsequent notes already identify the contradiction. The accurate handoff is: do not duplicate the removed onboarding-gate fix; evaluate the still-existing KV/env migration separately.
- `CLAUDE.md:241–254` states every flag belongs in PostHog and forbids new KV/env flags, but still names closed `i6kt` as migration tracking. That tracking reference is stale, not proof policy was rescinded.
- Recent service history includes `afd39bc` (verification cutover switch), `8b8893d` (matchmaking default closed), and `9b89939` (canonical notification envelope flags). These are actual KV consumers, not a speculative rollback of a completed migration.

## Executable inventory

All paths below are relative to the iOS owner repository. Defaults are **source defaults**, not production configuration.

| Server flag | Default | Actual consumer |
|---|---:|---|
| `proximity_enabled` | true | `api/src/routes/proximity.ts:20`, shared KV route middleware |
| `ai_concierge_enabled` | false | `api/src/routes/suggestions.ts:11`, shared KV route middleware |
| `trip_memory_enabled` | true | `api/src/routes/trips.ts:16,64`, private/public route gates |
| `tonight_push_enabled` | false | `api/src/services/tonight-push.ts:109`, scheduled service check |
| `notifications_canonical_shadow` | false | `api/src/services/notification-events.ts:844–846` |
| `notifications_canonical_active` | false | Same consumer; active takes precedence over shadow |
| `matchmaking_enabled` | false | `api/src/routes/matchmaking.ts:120`, bespoke route gate |
| `verification_gate_enabled` | false | `api/src/middleware/verificationGate.ts:118`, mutating-request enforcement |

`api/src/services/feature-flags.ts:52–91` merges stored values over defaults; empty, malformed JSON or throwing KV reads use defaults. `api/src/index.ts:627–651` exposes GET/PUT `/v1/admin/flags`, accepting the existing console/master key via `isConsoleKey`; PUT is a real global KV write, not a read-only endpoint. No such request was sent remotely.

Other mechanisms remain:

- `api/src/services/excursion-privacy-flag.ts:12–29`: env `EXCURSION_PRIVACY_ENABLED` accepts `off/read/write/full`, unknown defaults off; discovery filters start at read, access routes at write.
- `api/src/middleware/featureGuard.ts:5–18`: `ENABLE_CHAT_TRANSLATION`, `ENABLE_CHAT_WHATSAPP_HANDOFF`, `ENABLE_CHAT_LOCATION_MESSAGES`; value must stringify to `true`. Translation and WhatsApp mounts are visible in `api/src/index.ts:713–724`. Declaring a key is not proof every corresponding mount exists.
- `PROFILE_SETUP_ENABLED` appears in historical comments, not an active profile-setup gate. `api/src/routes/profileSetup.ts` and `/me` mandatory-data logic are not governed by that obsolete switch.

## Client paths and disabled responses

`roammate/Services/FeatureFlagService.swift` reads PostHog directly, independently of server KV. Its eight enum keys are proximity, AI concierge, trip memory, tonight push, matchmaking, and the three chat keys. **All eight actual fallback values are false**, despite stale comments claiming beta defaults true. `AnalyticsService.swift:331–348` separately exposes PostHog getters and reload behavior. Neither proves server/client values match.

Discover is reachable in source: `roammate/App/MainTabView.swift:234` mounts `ExploreView`; `Features/Explore/ExploreView.swift:34` mounts `DiscoverSectionView`. Within that section, AI suggestions are conditional on `aiConciergeEnabled` (`DiscoverSectionView.swift:20`, `SuggestionViewModel.swift:42`). Bucket-list discovery, reviews and groups have separate loading paths (`DiscoverSectionView.swift:224–242`). “Discover is absent because AI is off” is therefore too broad; UI placement quality and shipped reachability remain distinct questions.

`featureFlag.ts` and `featureGuard.ts` return HTTP404 with shared `{error:"feature_disabled",code:"feature_disabled",feature}`. iOS `APIClient+Response.swift:48–55,88–95` distinguishes that code; `APIClient+Logging.swift:54` excludes this expected condition from API error logging. This is no longer universally a bare404 bug. **Exception:** matchmaking deliberately returns `{error:"not_found"}` and its route tests explicitly require that darkness behavior. No automatic “standardization” was applied to override it.

## Fresh offline evidence and concrete defect

Existing tests ran using the Node Vitest config and its global fetch guard, with synthetic KV/environment fixtures:

```sh
npm run test -- src/__tests__/feature-flags.test.ts src/__tests__/feature-guard.test.ts --maxWorkers=1
npm run test -- src/__tests__/excursion-privacy-flag.test.ts src/__tests__/verification-gate.test.ts --maxWorkers=1
```

Results: **14 + 22 = 36 tests passed**. These establish local defaults, enabled/disabled contracts, staged privacy and verification-gate behavior, not remote PostHog reachability or an implemented migration.

A separate offline Node import of the actual service reproduced a runtime type defect: stored `ai_concierge_enabled:"false"` and `verification_gate_enabled:"false"` yielded string values whose boolean coercion is **true**; an unknown extension field was preserved. A throwing synthetic KV read correctly returned false for those two defaults. Root authorized a narrow validation fix, tracked as website `wyp` under `on8`, not a source-of-truth migration.

The local fix changes only `api/src/services/feature-flags.ts` and the flag import/PUT handler in `api/src/index.ts`. It validates object shape and known boolean fields before any setter KV access, and sanitizes malformed known stored values to their existing individual defaults. This is **not universally fail-closed**: proximity and trip-memory defaults remain true. Valid partial updates, empty patches and the existing unknown-field merge contract remain supported. No default, flag name, intentional matchmaking404 semantics or effective remote value was changed.

`api/src/__tests__/feature-flags-validation.test.ts` exercises the actual service and actual exported Worker router. With the synthetic execution context and explicitly mocked HTTP telemetry emitter in place, the pre-fix regression run had **10 failing / 5 passing** cases: string-false evaluation, rejected-before-KV setter expectations and invalid-body400 versus actual200. Initial fixture-only failures (missing execution context and fetch-guard-blocked telemetry) were corrected before counting that RED result; no real network requests escaped the global guard. Forty additional cases cover five malformed values across all eight known flags and their distinct defaults.

Auth ordering was checked rather than changed: existing global `jsonBodyGuard` rejects syntactically malformed JSON/null before the route; the new known-field validation is after the existing `isConsoleKey` check. A syntactically valid but invalid flag body with a wrong key returns401, with no flag write. Reordering global middleware is outside this fix.

Final local verification:

- Six selected suites (`feature-flags-validation`, `feature-flags`, `feature-guard`, `excursion-privacy-flag`, `verification-gate`, `matchmaking-routes`) passed **53 tests** before adding the 40-case expanded matrix.
- The final expanded `feature-flags-validation.test.ts` alone then passed **55 tests**. These counts are separate runs, not 108 distinct cases. This covers the changed service and actual admin route; the earlier five unchanged suites cover another 38 tests.
- `npm run typecheck` passed both `tsc --noEmit` and the Workers tsconfig check.
- Focused ESLint on `src/services/feature-flags.ts` and `src/__tests__/feature-flags-validation.test.ts` exited0; owner and website diff checks passed.
- Root/source reviewer reported no blocking findings; the test title was narrowed to “authenticates before known-field type validation” to avoid falsely claiming global body validation happens after auth.

Root independently reran all six suites after the expanded matrix: **93 unique tests passed across six files**, followed by diff checking; the command chain exited0 (execution session `58366`, terminal chunk `613b82`). This final combined result supersedes the split-run counts for acceptance:

```sh
npm run test -- src/__tests__/feature-flags-validation.test.ts src/__tests__/feature-flags.test.ts src/__tests__/feature-guard.test.ts src/__tests__/excursion-privacy-flag.test.ts src/__tests__/verification-gate.test.ts src/__tests__/matchmaking-routes.test.ts --maxWorkers=1
git diff --check
```

Owner `pflk` received reciprocal reconciliation and local-fix evidence without closing its broader policy/effective-state scope.

No full backend suite or deployed acceptance is claimed. Concurrent unrelated funds changes were preserved and are not attributed to these results. Root owns final review and website `wyp` tracking; broader `on8`/`pflk` policy/effective-state work remains separate.

## Acceptance boundary

The reconciliation removes the false “all flags migrated” premise and identifies an executable input-validation defect. A true PostHog migration still needs an explicit owner design for targeting, offline/unreachable behavior, server enforcement and staged privacy semantics, plus separate operational approval. Production inventory and client/server parity need authorized effective-state evidence, not historical comments or local defaults. Website tracking remains root-owned; this document is evidence, not a replacement issue tracker.
