# Synthetic offline keyword fixture — verification

Date: 2026-09-15. Status: synthetic implementation reviewed, landed and verified on owner main; actual Fastlane runtime remains excluded.

## Scope and provenance

This records supervisor-provided receipts for Bead **3mcy**, implementing only the synthetic gate in the [reviewed design](../specs/2026-09-15-offline-metadata-lane-design.md) and [implementation plan](../plans/2026-09-15-offline-keyword-fixture.md). Owner baseline: `09bb133`; sparse worktree `/Users/doreilly/Work/roammate-app-ios/.worktrees/offline-keyword-fixture`, branch `feat/offline-keyword-fixture`.

Exactly four new owner files are in scope under `scripts/store/offline-keywords/`: `keyword_verification.rb`, `test_keyword_verification.rb`, `fastlane/Fastfile`, and `README.md`. No release Fastfile, metadata or existing validator changes are included.

## Verification receipts

| Check | Recorded result |
| --- | --- |
| Ruby synthetic suite | **172 assertions PASS**, using system Ruby with gems disabled under the deny-network sandbox. |
| Existing Python guard regressions | **29 tests PASS**, 7.172 seconds, under the deny-network sandbox. This is the owner suite, not the website’s 47 tests. |
| Owner preservation | SHA256 of the same **142 original files** unchanged against `/tmp/offline-keyword-fixture-before.json`. |
| Runtime boundary | No Fastlane or RubyGems loaded; no actual process runner implemented. Synthetic tests instrument forbidden process, network, credential and write operations. |

Reproducible commands after landing (run the relative Python command from `/Users/doreilly/Work/roammate-app-ios`; initial verification used the historical worktree above):

```sh
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)' /usr/bin/ruby --disable-gems /Users/doreilly/Work/roammate-app-ios/scripts/store/offline-keywords/test_keyword_verification.rb
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)' python3 -B -m unittest discover -s scripts/store -p 'test_verify_apple_keywords.py'
```

The Ruby helper validates the explicit twelve-path manifest, pinned guard identity, synthetic runner arguments, strict JSON-lines schema and status consistency. The guard SHA256 remains `b38c8c0aa7d5c6d3491752b1d4adef5886097c52bd14433a43fb577c3f06f476`. Interpreter selection is fixed rather than supplied by arbitrary lane arguments. These checks do not turn the fake runner into a real execution path.

## Red/green and privacy corrections

Initial RED was `missing_helper`. Subsequent failing cases included `scratch_outside_owner`, exception-cause leakage, and `missing_context_no_caller_cause`. The final frozen suite reports 172 passing assertions. Entry fixed-error raises use `cause: nil` so private caller causes cannot leak through exception chains or `full_message`; safe outer messages alone would not have covered that channel.

Synthetic privacy tests include injected raw output and error markers. Safe diagnostics are reconstructed from validated expected records and fixed messages rather than forwarding arbitrary guard or simulated outer-process output. These are fake-output tests, not proof about actual Fastlane output or scratch reports.

## Acceptance boundary

This verifies the local synthetic helper/entry and preservation checks only. Actual Fastlane startup, plugins, credential isolation, real outer-process exit behavior, stable read-only owner input handling and scratch-only runtime writes were **not tested or enabled**. There is no Ruby runner that launches the guard, and no CLI route to launch Fastlane. The standalone Python regressions remain separate existing-tool execution.

No app build/launch, metadata rewrite, authentication, upload, store submission or release is established by these results. Native-language approval of keyword proposals and editable-store-version verification remain separate prerequisites. These broader prerequisites are not satisfied by this landing.

## Independent review and landing

Both spec and quality reviews **APPROVED**; quality review independently reproduced 172 passing synthetic assertions. Owner commit `9085a4391bdab403fa486710a5d9371a4114bfe0` was pushed to `main`, and the primary checkout fast-forwarded to the same origin commit. The commit contains only the four scoped fixture files.

Merged-main revalidation under the deny-network sandbox passed **172 synthetic assertions** and **29 Python tests in 6.196 seconds**. The 142 original owner-file hashes remained unchanged, as did hashes of the 11 pre-existing modified tracked files. The owner checkout therefore still contains unrelated dirty work; no clean-checkout claim is made. The historical sparse worktree is no longer required for the commands above. No real Fastlane runtime, gem loading or actual process runner was added or enabled.
