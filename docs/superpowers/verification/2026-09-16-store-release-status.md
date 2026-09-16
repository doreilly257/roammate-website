# 2026.3.8 store submission and release verification

## Scope and provenance

The user approved authenticated read-only store status checks, followed by work on remaining release gates. No upload, submission, release, store metadata mutation, build attachment, or app launch was authorized by this check. This report records the supervising agent's sanitized API receipts and owner-repository findings; its author performed no additional store probes.

- Store state checked at **2026-09-16T07:46:48.268Z**: [sanitized status receipt](2026-09-16-store-release-status.json).
- Apple attachment/localization gaps checked at **2026-09-16T07:50:30.067Z**: [sanitized gap receipt](2026-09-16-apple-submission-gaps.json).
- Google Play's temporary read edit was **aborted**, not committed. No track or release changes were made.
- Receipts retain nonsecret release identifiers and status metadata, not credentials or raw user records.

## Verified live status

| Platform | 2026.3.8 | Current released version in the observed store state |
| --- | --- | --- |
| Apple | `PREPARE_FOR_SUBMISSION`, release type `MANUAL`; not submitted or released | 2026.3.7, `READY_FOR_SALE` / `READY_FOR_DISTRIBUTION` |
| Google Play | No 2026.3.8 release on the returned tracks; version code 14 absent from the returned bundle inventory | Production 2026.3.7, version code **13**, `completed` |

Apple version ID is `f7bd2ce2-c5de-4727-ac43-b51b06ae9cce`. Uploaded build **20260911114030** (marketing version 2026.3.8, build ID `5af3da43-3f13-4d8d-b377-57b059bbc00c`) is `VALID` and not expired. Its upload timestamp is **2026-09-11T00:50:29-07:00**. However, the 2026.3.8 version's **attached build is null**. Successful build processing is not submission, release acceptance, or proof that this older build contains newer local fixes; do not attach it merely because it is available.

All returned Apple review submissions are historical `COMPLETE` records; the latest submitted date is August 31. The receipt reports no further versions or review-submission pages.

Play beta, alpha, and internal tracks each show 2026.3.7 code 12 completed. The bundle inventory contains codes 2, 3, 4, 8, 9, 10, 11, 12, and 13. Production code 13 is now completed, superseding the historical September 14 observation of a 1% rollout. Store inventory establishes published/uploaded state, not acceptance of a separate local candidate.

## Apple submission gaps

The 12 returned localizations all have empty `whatsNew` / release notes. Four English descriptions differ from the current owner-repository text: **en-US, en-AU, en-CA, en-GB**. The approved local English corrections therefore cannot be treated as published store metadata. No description was changed by this check.

Four live keyword values exceed the project's standalone **100 UTF-8-byte policy**:

| Locale | UTF-8 bytes |
| --- | ---: |
| ar-SA | 152 |
| ja | 152 |
| ko | 150 |
| zh-Hans | 142 |

These are local validator-policy overages, **not observed App Store rejections**. Exact-content/fluent-language approval for the four shortening drafts remains absent; adoption remains blocked. No keyword text was changed or uploaded. The other eight localizations are nonempty and at or below the project's byte threshold; that alone is not complete metadata or submission acceptance.

## iOS source and candidate provenance

The iOS main checkout at **9085a43** is not the release candidate. The actual candidate worktree is `roammate-app-ios/.worktrees/release`, at HEAD **140ef9c33947cf8c186242810dcda6a486ee82f4**. Its working tree is dirty with owner changes to `ProfileConstantsTests`, `ChatUITests`, `ExcursionsUITests`, `FullAppFlowUITests`, `ProfileUITests`, `ScreenshotTests`, and backend deployment helpers. These changes were preserved, not reverted, duplicated, or treated as part of an attested clean commit.

Fresh candidate scanning passed with **131 files / 1,390 methods, zero no-assertion findings, one skip-guarded finding, and 31 conditional findings (exit 0)**. Its coordinated 2026.3.8 version check also passed. Main-checkout scanner failures below therefore must **not** be presented as candidate blockers or justification for duplicate repairs. The candidate still needs a clean, attested source/artifact relationship and applicable runtime acceptance of its current changes.

Owner Bead `66y5` comments dated September 15 report **1,148 native tests passed, zero failures, one skip** (live itinerary authentication), before newer changes. They also record separately approved and completed `STORE1` draft creation on September 15. These are historical owner reports, not fresh native tests in this pass, and draft creation is not submission or release.

## Android candidate acceptance remains separate

The supervising agent's latest owner audit identifies Android owner HEAD **7e1041c7**, whose wire-only profile/itinerary fixes passed **390 tests** but still require UI/runtime acceptance. The earlier 84869093 candidate remains unaccepted; neither local test success nor the absence of code 14 in Play makes that artifact suitable for submission. No new Android build, runtime test, upload, or acceptance claim was made here. Current dirty, active owner work was preserved.

## Release boundaries

Apple build provenance/suitability, attachment, release notes, reviewed metadata, and final acceptance remain unresolved. Android owner acceptance and candidate reconciliation remain unresolved. The website deployment is unrelated to these app-store releases. Existing Beads remain the issue-tracking authority; this is an evidence snapshot, not a substitute release checklist or authorization to submit.

## B: fresh offline release-gate verification

The supervising agent then ran bounded offline checks, without a native build, emulator boot, real Fastlane execution, or app launch:

| Check | Observed result |
| --- | --- |
| iOS main checkout `scripts/test-release-version.py` | 22 tests passed |
| iOS main checkout `scripts/test-release-gate-preflight.py`, using fake native executables | 12 tests passed |
| Android unittest discovery of `scripts/tests/test_release_*contract.py` | 12 tests passed |
| iOS main checkout `check-release-version.py --coordinated --android-root /Users/doreilly/Work/roammate-app-android --expected-version 2026.3.8` | Passed |
| Actual iOS main checkout `find-nondiscriminating-tests.py` | Exit 1: scanned 125 files / 1,350 methods; reported 15 no-assertion, 2 skip-guarded, and 34 conditional findings; **not candidate evidence** |
| Actual iOS release candidate `find-nondiscriminating-tests.py` | Exit 0: scanned 131 files / 1,390 methods; zero no-assertion, one skip-guarded, 31 conditional findings |
| iOS release candidate coordinated version check | Passed for 2026.3.8 |
| Local keyword guard | Exit 1: same four byte-policy overages |

The passing synthetic/offline checks total **46 tests**. They do not establish native runtime acceptance. The candidate's passing scanner supersedes using main's failure as a candidate assessment, but does not attest the dirty candidate or replace runtime checks. Two Java processes were present; active and dirty owner work was preserved rather than starting competing builds. This B pass refreshed precise prerequisites; it did **not** resolve all release gates.

## Verification of this report

Both JSON targets were copied byte-for-byte from the supervising agent's sanitized temporary receipts, parsed successfully, and scanned for credential-field and credential-marker patterns. No credentials were found by that scan. No runtime code changed; no store mutation, credential access, or additional network probe was performed by the report author.
