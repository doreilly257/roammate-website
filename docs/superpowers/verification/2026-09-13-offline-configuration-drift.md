# Offline configuration-drift acceptance

September 13, 2026. Bead `6ra`; user-approved local extension from the sanitized `059` inventory.

## Changes and boundaries

Only two owner files were added:

- `api/src/__tests__/offline-configuration-drift.test.ts`
- `api/src/__tests__/fixtures/flag-configuration-inventory-2026-09-13.json`

The fixture is byte-identical to the reviewed [live configuration receipt](./2026-09-13-live-flag-inventory.json), captured at `2026-09-13T17:13:59.988Z`. Its exact hash is pinned by the self-contained owner test; no website file is read at test runtime. Existing candidate, legacy implementation, dirty typed-boolean fix, and concurrent Swift files were not modified. No new abstraction, production route, SDK, provider call, identity evaluation, credential access, live flag write, billing change, deployment, or owner commit/push occurred.

The [implementation plan](../plans/2026-09-13-offline-configuration-drift.md) and resulting source/spec/quality were independently reviewed and approved without blocking findings. Root also inspected the complete new test source without findings.

## Cases and limits

Twenty-five new cases cover:

- Exact receipt hash/timestamp; twelve unique known keys; four found and eight missing; no retained creator/editor/person-value metadata.
- Found definition activation states and 100% zero-property rollout groups, explicitly **configuration metadata, not identity evaluations**. Inactive AI remains distinct from its stored 100% group.
- Eight missing definitions remain `not_found` without an invented active false value or group.
- The four observed activation booleans form an incomplete candidate input that is rejected. Missing values are not filled using defaults to manufacture a complete PostHog snapshot.
- Actual `getFeatureFlags` with a synthetic missing-key KV fake produces local tonight-push false versus the recorded active provider definition: a **potential source/configuration difference**, not a confirmed served mismatch. Source-to-deployment mapping remains false in the fixture.
- Missing candidate evaluations preserve unavailable reasons and individual compatibility fallbacks, including true proximity/trip-memory; not a universal fail-closed claim.
- Four absent known env bindings remain absent in both current/version metadata. Actual local generic guards return 404/`feature_disabled` for absent chat settings. The actual mounted location route returns 400/`location_messages_disabled`, with synthetic metadata and a deny-on-access database fake proving no database access.
- Actual absent-env excursion predicates return off and disable discovery filtering, while the existing candidate reports unmigrated. These tests do not certify privacy safety or authorize a privacy-stage change.

The reused **fetch-only** guard has a positive synthetic denial/counting probe followed by zero attempted fetches during case operations. KV writes are forbidden and asserted absent; the mounted-route database fake also rejects access. This does not establish universal operating-system network isolation or certify arbitrary socket/SDK behavior. No SDK or provider transport is initialized in this harness.

## Verification receipts

RED: **25 failed** at the explicit missing sanitized-fixture assertion, session `57949`, chunk `be2294`. The only GREEN action was adding the reviewed receipt fixture; no production implementation was changed to make tests pass.

Focused GREEN: **25 passed**, session `78996`, chunk `cd7892`.

Final author acceptance: **231 unique tests passed across eight files** in 11.03 seconds — 25 new plus 206 retained — followed by both TypeScript configurations, targeted ESLint, and whitespace checks. Chained execution session `95878`, final chunk `0b8db8`, exited **0**.

```sh
npm run test -- \
  src/__tests__/offline-configuration-drift.test.ts \
  src/__tests__/offline-flag-parity.test.ts \
  src/__tests__/feature-flags-validation.test.ts \
  src/__tests__/feature-flags.test.ts \
  src/__tests__/feature-guard.test.ts \
  src/__tests__/excursion-privacy-flag.test.ts \
  src/__tests__/verification-gate.test.ts \
  src/__tests__/matchmaking-routes.test.ts --maxWorkers=1
npm run typecheck
npx eslint src/__tests__/offline-configuration-drift.test.ts \
  src/__tests__/offline-flag-parity.test.ts \
  src/__tests__/helpers/offline-flag-candidate.ts --max-warnings 0
git diff --check
```

**Separate root acceptance:** independent chain `75045`, final chunk `f4dc4b`, exited **0** with **231 tests across eight files** in 12.60 seconds, both TypeScript configurations, and targeted new-test ESLint passing. Root read the complete test source without findings and made no owner changes. This repeat is a separate receipt, not additional distinct cases.

No full backend suite, app build, live inventory refresh, provider targeting equivalence, or deployed acceptance is claimed.

## Exact owner file hashes

SHA-256 at author acceptance:

| File under owner `api/` | SHA-256 |
| --- | --- |
| `src/__tests__/offline-configuration-drift.test.ts` | `1a856488c6eb4fbfc6a71a9b507e56088a0a9dacb77abab01eaf68358b976b3f` |
| `src/__tests__/fixtures/flag-configuration-inventory-2026-09-13.json` | `346b18d8a003f3951ce1a7496be40ba3d14314a802e765df5f61578052efc008` |
| `src/__tests__/helpers/offline-flag-candidate.ts` (unchanged) | `b37813b5eb56e1b8557d6b9b5a38934774e58bb1318bb3bfd9aad664faee2bbd` |
| `src/__tests__/offline-flag-parity.test.ts` (unchanged) | `dc1b43559a0d72722a8ab1764ecf1520e8761d54ecda460f1253abdfa0ad0c93` |

The independent reviewer verified fixture byte equality against the website receipt. Root owns Bead disposition and website evidence commits; owner files remain local/uncommitted. Broader provider migration, served-state correspondence, no-cost transport, and privacy cutover gates remain separate and are not automatically unblocked by these offline cases.
