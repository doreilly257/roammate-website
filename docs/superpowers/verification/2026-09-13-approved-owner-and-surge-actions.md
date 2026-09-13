# Approved owner and Surge actions — 2026-09-13

This record distinguishes independently checked local metadata/tests from operational evidence supplied by the supervising root agent. It does not amend earlier historical verification records.

## Approved local iOS metadata corrections

The user explicitly approved applying the two reviewed English description replacements locally, without upload or submission. Before writing, all four owner source files matched the SHA-256 values in `tools/store/proposals/2026-09-13-english-safety/README.md`:

- en-US: `5e53040ab66c2a6b550f729d682c073bf22cd7849c37c5edbe1d428a76a5b474`
- en-GB/en-AU/en-CA: `9110c61e122c1c76154c36057e2514ca9c8ea3d2c5c00ba72534f1319f492805`

The exact reviewed proposal bytes were copied into `/Users/doreilly/Work/roammate-app-ios/fastlane/metadata/{en-US,en-GB,en-AU,en-CA}/description.txt`.

| Previous sentence | Applied local replacement |
|---|---|
| Excursions are lightweight, low-commitment activities you can join in a tap. | Excursions are lightweight, low-commitment activities you can join through the app. |
| Travel with confidence knowing help is a tap away. | SOS can alert your configured emergency contacts; it is not a substitute for local emergency services. |

Independent byte comparison against owner HEAD confirmed exactly those two replacements per file and exact equality with the reviewed proposals. All other bytes, including locale spelling and final newlines, were preserved. Character counts including the final newline are 1,814 for en-US and 1,822 each for en-GB/en-AU/en-CA, below 4,000.

Verification performed:

```sh
python3 /Users/doreilly/Work/roammate-website/tools/store/verify_store_metadata.py fastlane/metadata
git diff --check
```

The guard passed with **72 prose files and five rules**; diff checking passed. Owner metadata diff was four files, eight insertions and eight deletions. Other existing owner edits were preserved. Owner Bead `roammate-app-ios-3qop` records local adoption while retaining broader release-owner acceptance.

**No owner commit, push, store upload or submission was performed by this action. Publication remains pending separate authorization and execution.** Public listings must not be described as containing these new English corrections based on local adoption alone. Earlier public parity evidence describes the pre-correction wording at the time checked.

## Scoped admin key: local verification only

The user's direction to use the scoped key refers to `ADMIN_CONSOLE_KEY`, not evidence of the key currently configured in production. No actual secret was revealed or changed during this local verification.

From the iOS owner's `api/` directory:

```sh
npm run test:workers -- workers-tests/admin-report-target.test.ts --maxWorkers=1
```

Result: **one test file, six tests passed** using native local Workers/D1 fixtures. The fixture supplies a synthetic `ADMIN_CONSOLE_KEY` and an empty `ADMIN_API_KEY`; cases cover report-target behavior and rejection of missing/wrong credentials before database access.

This demonstrates the tested local scoped-key path. It does **not** identify the deployed Pages secret, establish production key scope, perform an authenticated production smoke test, or prove all admin routes.

## Approved Surge apex teardown — root-supplied execution evidence

The following operational results were supplied by the supervising root agent; this document's author did not independently execute the teardown.

1. The user gave explicit informed approval for removing the legacy Surge **apex `roammate.com`** project.
2. Authenticated Surge **0.27.3** `whoami`/project-list checks showed the apex project before removal.
3. Cloudflare API checks confirmed the apex remained a proxied Pages CNAME. Canonical production deployment was **`d1d8272a`**, source **`a95b835`**.
4. `curl` GET checks for `/`, `/about/`, `/faq/` and `/guides/bangkok/` returned **200**, nonce evidence, `no-store` and production-host canonical links on production and the retained alias. Default urllib requests returned **403**, while the curl GET requests succeeded; these observations must not be collapsed into universal client success.
5. `surge teardown roammate.com` returned **SUCCESS**. The subsequent Surge project list no longer contained the apex project; the other **five** projects remained. The `www` and preview projects were untouched.
6. Post-action Cloudflare API checks showed the same production deployment and DNS configuration. The new latest deployment **`02832491`**, source **`996404c`**, was **preview only**, not a production replacement.

The evidence establishes the approved Surge apex removal and the stated bounded Pages continuity checks. It does not claim removal of all Surge projects, changes to `www` or preview, exhaustive route verification, or universal network-client success.

## Remaining scope

- Publishing the locally corrected owner English metadata requires separate authorized execution.
- Deployed admin scoped-key configuration and authenticated operational acceptance are not proved by local tests.
- Auth unknown-user event semantics and the bounded telemetry-export design still await answers to the questions raised through the supervising agent; neither behavior was changed by this work.
- No production release, backend deployment, store submission, production flag change or personal-record mutation is inferred from these local approvals.
