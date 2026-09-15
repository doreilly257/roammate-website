# Offline Keyword Fixture Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans`. Track execution exclusively in Bead **3mcy**; the numbered procedures below are not a second task tracker.

**Goal:** Implement and test only the approved synthetic keyword-verification helper and isolated lane entry, without executing Fastlane or a real guard subprocess from Ruby.

**Architecture:** A Ruby-stdlib helper validates fixed input paths, the pinned guard identity and fake process results. An injected synthetic context and tiny deny-by-default DSL exercise one lane. The default runner refuses execution; actual launching and containment remain unimplemented, separately approved work.

**Tech Stack:** `/usr/bin/ruby --disable-gems` (2.6.10), Ruby stdlib JSON/Digest/tempfile support, a small self-contained assertion harness, existing Python unittest regressions, verified macOS deny-network sandbox.

**Design:** [Reviewed offline metadata-lane design](../specs/2026-09-15-offline-metadata-lane-design.md). This plan implements its first synthetic gate only; its historical design-only wording does not authorize real-runtime work.

## Workspace and exact files

Use `/Users/doreilly/Work/roammate-app-ios/.worktrees/offline-keyword-fixture`, branch `feat/offline-keyword-fixture`, base `09bb133`. Preserve the primary checkout and unrelated dirty work.

| Create in owner worktree | Responsibility |
| --- | --- |
| `scripts/store/offline-keywords/keyword_verification.rb` | Fixed manifest and identity checks, injected fake runner, strict result validation and safe output projection; no actual process runner. |
| `scripts/store/offline-keywords/test_keyword_verification.rb` | Standalone assertions, synthetic filesystem/results/DSL, privacy and no-side-effect tests. No gem dependency. |
| `scripts/store/offline-keywords/fastlane/Fastfile` | Exactly one `verify_ios_keywords_offline` lane; requires injected synthetic context and otherwise fails closed. |
| `scripts/store/offline-keywords/README.md` | Synthetic test invocation, contract, and explicit real-runtime prohibition. |

Do not edit the release `fastlane/Fastfile`, metadata, existing guard/tests, claims tools or dependency files. Do not implement `Open3`, `spawn`, `system`, Fastlane loading, a real launcher or CLI route into Fastlane. Do not install dependencies.

## 1. Establish baseline and write failing contract tests

1. Verify branch/base and record SHA256 for the same 142 preserved owner files (the supervisor’s current baseline, including the adopted guard and tests). Keep the exact baseline path set for the final comparison; do not derive a smaller set later.
2. Confirm the OS deny-network policy applies to the runner and its child using the supervisor-reviewed policy checks. Lack of proof stops execution; environment flags alone are insufficient. No live network probes are required.
3. Create the Ruby test file first, using stdlib and fixed-code assertions rather than assuming `minitest` exists. Use temporary synthetic roots and synthetic guard bytes; identity verification remains real SHA256. Test fixtures may inject a test identity into the synthetic context, but the default production identity constant must stay pinned and independently asserted.
4. Add initial manifest, missing-helper and unavailable-runner cases. Run the Ruby command below and record the expected RED missing-implementation failure before creating helper/entry. Suppress raw failure values; only fixed test labels/codes are diagnostic output.

From the owner worktree, use this command for RED and every subsequent GREEN run:

```sh
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)' /usr/bin/ruby --disable-gems scripts/store/offline-keywords/test_keyword_verification.rb
```

## 2. Implement pure contracts with TDD

1. Encode the exact twelve ordered locales from the design: `ar-SA`, `en-AU`, `en-CA`, `en-GB`, `en-US`, `es-ES`, `es-MX`, `fr-CA`, `ja`, `ko`, `pt-BR`, `zh-Hans`. Each maps only to `fastlane/metadata/<locale>/keywords.txt` beneath an explicit absolute owner root; no glob/cwd discovery or caller-provided extra arguments.
2. Pin guard SHA256 to `b38c8c0aa7d5c6d3491752b1d4adef5886097c52bd14433a43fb577c3f06f476`. Before the fake call, check fixed guard/interpreter paths, guard identity, twelve distinct resolved regular inputs within the approved metadata tree, final symlink rejection and readability. Fail closed for empty/missing/duplicate/escaped/changed inputs and unexpected discovery configuration. Exercise failures with synthetic fixture mutations, not owner mutations. Do not claim preflight prevents filesystem races.
3. Define an injected fake-runner contract receiving only the expected argument vector (interpreter, guard, twelve paths) and returning captured stdout/stderr plus exit/signal status. The absent/default runner must refuse before executing anything. Test argument order, spaces in paths, no shell expansion and no additional call.
4. Parse JSON-lines without echoing raw text. Require exactly twelve distinct expected paths, exact `path`/`bytes`/`limit` fields, limit 100, bytes null or a nonnegative integer (not boolean), and no unknown fields/records. Status 0 requires every count present and at most 100; status 1 requires no null and at least one count over 100; status 2 requires an invalid/null record. Reject inconsistent statuses, malformed/extra/missing records, signals and unknown exits. Return only validated path/count/limit records and fixed status codes; errors expose no exception strings or field contents.
5. Add RED cases before each behavior and rerun GREEN. Include fake records representing 100/101-byte, multibyte, newline and invalid-UTF8 outcomes; leave actual byte semantics to the unchanged Python guard and its regressions.

## 3. Implement and test only the synthetic entry and output boundary

1. Write a tiny fake DSL permitting only the expected `desc` and one lane registration, capturing its block and rejecting all other calls. Test entry evaluation and invocation separately. No Fastlane gem or release configuration is loaded.
2. Make the entry require explicitly injected synthetic context; missing context fails closed before operational work. Invocation delegates once to the helper. Nonzero guard classifications fail the synthetic lane safely; do not promise actual Fastlane outer exit codes.
3. Inject synthetic secret/keyword markers into guard and simulated outer startup/failure/context/shutdown stdout/stderr. Include forged JSON, terminal controls and unexpected lines. Validate/reconstruct output rather than forwarding raw buffers; check all public diagnostics and synthetic scratch artifacts contain no markers. Unknown output produces fixed failure codes, never parser exception payloads. No raw output persistence or streaming.
4. Instrument forbidden operations and owner writes during entry evaluation/invocation; assert none occur. Test that the default runner and direct entry use remain unavailable. Synthetic success must not establish an executable real-runtime path.
5. Document the standalone Ruby test command in the new README, fixed inputs/results, and that actual Fastlane runtime, credential isolation, stable read-only real inputs and real outer-process behavior still need separate design/approval/verification. Do not publish a command to run this entry with Fastlane.

## 4. Regressions, preservation and review

1. Run the complete Ruby suite under the verified deny-network policy; retain sanitized summary and exit status, not fixture contents. Expected GREEN with every contract and privacy case exercised; no arbitrary promised test count.
2. Run the unchanged owner Python regressions under the same policy:

```sh
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)' python3 -B -m unittest discover -s scripts/store -p 'test_verify_apple_keywords.py'
```

Expected **29 tests passing**, not the website suite’s 47. These tests execute the existing standalone Python guard locally, not through the Ruby runner or a Fastlane lane.
3. Rehash the identical 142-file baseline set and require no changes. Review the owner diff: only the four new fixture files belong to this change. No metadata editing, release configuration changes, dependency installs, app builds/launches, credential reads, uploads or network requests.
4. Obtain independent spec and quality review against the actual files and evidence. Resolve findings and rerun affected tests before the supervisor records completion in 3mcy and performs scoped landing. Do not claim actual Fastlane runtime acceptance or close broader store/release blockers.
