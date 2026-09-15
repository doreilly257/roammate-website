# Owner keyword validator adoption — September 15, 2026

**Scope:** User-approved Phase 1: copy exactly the standalone validator and its tests into the iOS owner's existing `scripts/store` directory. Owner landing is complete; keyword editing, Fastlane wiring and store operations remain excluded. This report does not claim its own website commit/push.

Root supplied the verification evidence and [compact receipt](2026-09-15-owner-keyword-adoption.json). The report author copied that receipt and wrote this report without running owner code, changing owner files or committing.

## Exact source and isolated destination

- Website source revision: `edd0d4a9f3054d32d8d9c419d788d1fd09fad0a8`.
- Owner sparse worktree: `/Users/doreilly/Work/roammate-app-ios/.worktrees/keyword-owner-adoption`, base `b599a339d5fceba04c7bd57908955fe9a99c9743`. This isolates the two-file addition while preserving dirty owner main and limiting disk use.

| Destination | SHA-256, byte-identical to pinned website source |
| --- | --- |
| `scripts/store/verify_apple_keywords.py` | `b38c8c0aa7d5c6d3491752b1d4adef5886097c52bd14433a43fb577c3f06f476` |
| `scripts/store/test_verify_apple_keywords.py` | `fd00589751d018f139fada40da3356a37f50401212de066891afcaf48b6649f5` |

Independent specification review approved exact two-file scope and byte identity. Independent quality review also **approved**, with its own **29-test passing run**.

## Tests and preservation

- Implementer RED: **29 tests / 91 missing-validator failures**, followed by **29 tests passing**. Subtest failures are not 91 distinct test methods.
- Root independently ran **29 tests**, passing in **27.012 seconds** under a verified deny-network sandbox. The owner has no existing store tests in the inspected scope; this is **29**, not the website's 47-test suite.
- Root compared **140 existing files**—owner metadata, the three existing store tools and Fastfile—before/after by SHA-256; all remained unchanged.
- Root invoked the existing prose scanner through its imported offline interface: **72 files, five rules, zero errors, zero warnings**. No Fastlane lane or exporter was executed. This proves the existing listed-pattern scan result, not complete feature truth or release certification.
- No app build/launch, metadata edit, upload, authentication or live request was part of this adoption.

## Owner landing and merged verification

Owner commit **`09bb1331a1dc094aa7f3ac3d0b3e08b0d420e78d`** contains only the two listed files and was pushed to owner `main`. Primary owner main fast-forwarded to the same revision as origin. **Eleven pre-existing modified tracked files retained their hashes**; owner main remains dirty with unrelated work, so this is not a clean-worktree claim.

Root reran the **29 tests on merged main**, passing in **7.945 seconds** under the sandbox. The scoped checks were these tests and the existing offline prose baseline; no general backend/iOS hooks, app builds or unrelated release/build tests were run through the sparse worktree. Such checks were not used as evidence for this standalone Python adoption.

## Read-only keyword result

All **12** explicitly selected owner keyword files were checked. Exit **1** is expected because the four existing byte overages remain:

| Locale | UTF-8 bytes | Limit |
| --- | ---: | ---: |
| ar-SA | 152 | 100 |
| ja | 152 | 100 |
| ko | 150 | 100 |
| zh-Hans | 142 | 100 |

No keyword contents are reproduced. An installed guard detecting these unchanged violations is successful Phase 1 behavior; it is not a claim the four files were corrected or all 12 passed.

## Acceptance boundary

The [phased adoption plan](../plans/2026-09-15-apple-keyword-owner-adoption.md) keeps exact four-draft content adoption, optional lane integration and current App Store target/publication as separate approval stages. Phase 1 now has both reviews, pushed owner landing and merged-main verification. Broader store/claims acceptance remains open regardless of the standalone test result.
