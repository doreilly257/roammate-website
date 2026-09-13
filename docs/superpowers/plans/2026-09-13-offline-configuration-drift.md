# Offline configuration-drift cases

Bead `6ra`; user approved local synthetic cases from the sanitized `059` inventory. Root owns tracking and website commits; no owner commit/push.

## Bounded implementation

Add owner `api/src/__tests__/offline-configuration-drift.test.ts` and `api/src/__tests__/fixtures/flag-configuration-inventory-2026-09-13.json` only. Reuse the actual legacy `getFeatureFlags`, excursion predicates, and existing `SyntheticFlagCandidate` without modifying them or production code. The fixture is a byte-exact copy of the already allowlisted website inventory receipt; the test pins its exact SHA-256 and capture timestamp for provenance. It contains no identities, secrets, creator/editor metadata, or newly queried data. This reuses the reviewed projection rather than creating a second metadata schema.

## Test-first coverage

Write tests first and obtain an explicit missing-fixture RED assertion before adding the projection. Assert twelve exact keys, four found/eight missing, inactive AI despite its stored 100% group, active 100% tonight-push versus **conditional local** missing-KV false default, and the distinction between missing provider state and disabled. Feed the incomplete observed provider values to the existing candidate only to prove rejection; do not fabricate a complete provider snapshot by filling missing flags with false/defaults.

Use in-memory read-only KV to model the observed missing record and compare real local defaults; do not call these served production values. Existing candidate with no snapshot returns unavailable plus per-flag fallback, which can be true. Assert all four known env names absent in the fixture; actual excursion predicates map absent env to off but candidate remains unmigrated, without a privacy-safe fallback claim. No identity-specific provider evaluation or bucketing is introduced.

Exercise the three actual generic chat guards with absent env bindings and the actual mounted location-message route with incomplete synthetic metadata and a deny-on-access database fake. Preserve their distinct disabled statuses/bodies; do not infer full route behavior from metadata alone.

Reuse the existing fetch-deny guard with a positive synthetic probe followed by zero attempted requests, and assert no KV writes. Validate fixture schema/privacy allowlists and receipt hash/provenance; tests must be self-contained within the owner repository, not read website paths at runtime.

## Verification and handoff

Run new cases plus the seven previously accepted suites (206 retained tests), both owner TypeScript configurations, targeted lint, whitespace, and exact file hashes. Independent reviewer checks config-versus-evaluation semantics and no inferred missing-to-disabled conversion before root acceptance. Record actual RED/GREEN counts and limitations in website verification evidence. No SDK/provider calls, live writes, deployment, billing, credentials, owner release, or production change is authorized.
