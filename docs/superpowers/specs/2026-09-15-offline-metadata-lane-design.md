# Offline keyword-only Fastlane verification — design

Date: 2026-09-15. Status: proposal for written review; **not implemented or runtime-verified**.

## Scope and authority

Design an optional `verify_ios_keywords_offline` lane that reuses the existing local keyword guard without authenticating, uploading, reading credentials, contacting a network, or writing to the app-owner checkout. Despite this document's metadata filename, the lane is **keyword-only**, not a full metadata/release approval gate.

Current permission covers design and read-only source inspection only. No Fastlane execution, installation, owner edits, metadata changes, publishing, or runtime integration is authorized. Implementation and real-Fastlane acceptance require later, separate approval. Existing release lanes remain unchanged.

Owner: `/Users/doreilly/Work/roammate-app-ios`, reviewed baseline `09bb133`. The existing `scripts/store/verify_apple_keywords.py` was promoted from website baseline `edd0d4a`; the supervisor reports its existing 29-test suite passing. That does not test this proposed wrapper.

## Alternatives and recommendation

| Approach | Benefit | Problem / decision |
| --- | --- | --- |
| Keep standalone guard only | Already works; least machinery and smallest side-effect surface | Retain as the current approved option; does not provide a Fastlane lane. |
| Add a lane to the release Fastfile | Familiar invocation | Reject for this scope: the existing file creates `.build-shims`, links an `rsync` shim, and mutates `PATH` before lane selection. Selecting a verification lane would not avoid evaluation-time side effects. Refactoring existing release behavior is unnecessary risk. |
| Separate, minimal Fastfile | Satisfies lane requirement without evaluating release configuration | Recommended if a lane is still wanted, with isolated launch and separately gated runtime acceptance. Adds a small launcher/test surface. |

Do not import, load, or require the owner's release Fastfile, Appfile, Pluginfile, custom actions, or release helpers. `push_ios_metadata` authenticates before verification and then calls delivery; it is not an offline entry point.

## Proposed boundaries and flow

Future source artifacts, if approved, would live under the owner's `scripts/store/offline-keywords/`: a minimal `fastlane/Fastfile`, a small Ruby-stdlib launcher/helper, and synthetic tests. These are proposed paths, not files created in this session.

1. The launcher uses an explicitly configured absolute owner root and fixed installed interpreter/guard paths; no cwd inference, dependency installation, shell expansion, lane overrides, or arbitrary extra arguments.
2. It checks the reviewed guard identity and the exact input manifest. Absent guard/interpreter, changed unreviewed guard, missing inputs, unexpected layout, or inability to enforce the runtime isolation contract fails closed before Fastlane starts.
3. For a later approved real-runtime run, stage only the reviewed minimal entry/helper into a fresh scratch workspace **outside** the owner checkout, with `fastlane/Fastfile`. Pin the child working directory to the scratch root. Do not copy metadata or secrets into that workspace: read the explicit owner paths through the guard.
4. Start the pinned installed Fastlane with the single lane name `verify_ios_keywords_offline`. The entry exposes only that lane and delegates one argument-vector subprocess call to the existing guard. Use no shell and no Fastlane `sh` command echo. The lane never selects another lane.
5. Read the guard's JSON-lines output, validate its schema and exact expected path coverage, and emit only allowlisted path/count/limit records plus fixed status text. Never forward arbitrary stdout, stderr, exception strings, lane-context values, or field contents. Malformed output, extra records/paths, missing records, subprocess failure, or an unexpected status is an invalid-input/runtime failure.
6. Guard result `0` means all inputs valid and within limit; `1` means at least one over limit with no invalid-input result; `2` means invalid/unreadable input and takes precedence. Preserve that classification in sanitized diagnostics; the lane fails on either nonzero result. Exact outer Fastlane process exit codes are not promised by synthetic tests and must be established by later runtime acceptance.

The launcher must also capture and filter the **outer Fastlane process's entire stdout and stderr**, including startup, lane failure and shutdown output—not just the guard subprocess. Fastlane can print exception text and lane context independently of the guard. Never stream those raw channels to the terminal, tool transcript, debug log or retained artifact; reconstruct public output solely from strictly validated expected records and fixed status messages. Unexpected output must not be echoed in a parser error. Scratch reports/logs must likewise contain no field contents or secret markers: avoid injecting raw subprocess data into exceptions/action context, and treat any raw-content artifact as a runtime acceptance failure rather than publishing or retaining it.

The wrapper does not duplicate byte-count logic. The guard already validates UTF-8, nonempty single-line content, forbidden controls/BOM, one optional terminal LF/CRLF, and a 100-byte UTF-8 limit. It rejects final-component symlinks/nonregular files and uses safe-open checks. Its documentation explicitly allows parent-directory symlinks and does not claim a hostile-filesystem sandbox; the wrapper must reject resolved inputs outside the approved owner metadata tree, and real acceptance must use a stable read-only input view rather than claiming preflight alone closes races.

## Exact input contract

Pass all twelve paths explicitly, prefixed by the approved absolute owner root:

```text
fastlane/metadata/ar-SA/keywords.txt
fastlane/metadata/en-AU/keywords.txt
fastlane/metadata/en-CA/keywords.txt
fastlane/metadata/en-GB/keywords.txt
fastlane/metadata/en-US/keywords.txt
fastlane/metadata/es-ES/keywords.txt
fastlane/metadata/es-MX/keywords.txt
fastlane/metadata/fr-CA/keywords.txt
fastlane/metadata/ja/keywords.txt
fastlane/metadata/ko/keywords.txt
fastlane/metadata/pt-BR/keywords.txt
fastlane/metadata/zh-Hans/keywords.txt
```

Require twelve distinct valid expected records and twelve distinct resolved inputs. No glob, implicit discovery, skipped missing locale, or successful zero-input case. Manifest changes require review; unrelated locales are not silently added or treated as covered.

## Installed-source evidence: discovery is not runtime proof

Read-only inspection of installed Fastlane **2.232.2** under `/opt/homebrew/lib/ruby/gems/4.0.0/gems/fastlane-2.232.2/` found:

| Source relative to gem root | Relevant behavior |
| --- | --- |
| `fastlane_core/lib/fastlane_core/fastlane_folder.rb`, `path` / `fastfile_path` | Discovers `./fastlane/`, then `./.fastlane/`, or the current directory named `fastlane`/`.fastlane`; prefers `Fastfile.swift` over `Fastfile`. |
| `fastlane/lib/fastlane/command_line_handler.rb`, `handle` | Calls `LaneManager.cruise_lane(platform, lane, parameters)` without a custom file argument. |
| `fastlane/lib/fastlane/lane_manager.rb`, `cruise_lane` | Has a fourth custom-file argument documented for fastlane.ci; this is not evidence for a public CLI `--fastfile` option. Also generates docs unless `FASTLANE_SKIP_DOCS` is truthy. |
| `fastlane/lib/fastlane/commands_generator.rb`, `start` | Loads actions/plugins and starts plugin update checking before lane execution. |
| `fastlane/lib/fastlane/helper/dotenv_helper.rb` | Searches discovered Fastlane folder and its parent for dotenv files. |
| `fastlane/lib/fastlane/plugins/plugin_update_manager.rb`; `fastlane_core/lib/fastlane_core/update_checker/update_checker.rb` | Update checking honors `FASTLANE_SKIP_UPDATE_CHECK`. |
| `fastlane/lib/fastlane/lane_manager_base.rb`; `fastlane/lib/fastlane/junit_generator.rb` | Finish path generates JUnit output; destination is `FL_REPORT_PATH` or discovered Fastlane folder/cwd. |

Therefore use ordinary directory discovery in a sanitized scratch workspace, **not an invented custom-file CLI flag**. Reject unexpected `Fastfile.swift`, alternate entry folders, dotenv files, Appfile, Pluginfile, custom actions, or imported config in that workspace. Launching from the release checkout is not supported.

## Runtime containment contract — deferred

An isolated lane is not itself a sandbox. Before any real Fastlane run is approved, identify and independently review an available local containment mechanism that denies all network access and credential-store access, makes the owner checkout read-only, and permits writes only to disposable scratch paths. If those controls cannot be enforced, stop; do not downgrade to environment-only protection or install tooling.

Use a minimal allowlisted child environment, an empty disposable HOME/TMP area, no inherited credentials or Ruby/Bundler injection variables, no owner dotenv/plugin configuration, and pinned installed dependencies. Set source-confirmed update/doc suppression (`FASTLANE_SKIP_UPDATE_CHECK`, `FASTLANE_SKIP_DOCS`) and route `FL_REPORT_PATH` to scratch. Audit remaining startup behavior, telemetry and credential access before defining the final launch command. Environment switches reduce side effects but are not proof of no network or no credential access. Scratch reports/caches are permitted only in the later approved runtime scope; **zero owner writes** is mandatory.

## Acceptance gates

### First implementation gate: stdlib and synthetic fixtures only

After separate implementation approval, build Ruby-stdlib tests around the helper and a tiny synthetic DSL harness that records `desc`/`lane` definitions and invokes the captured lane block. Do not require the Fastlane gem or evaluate any real release configuration. Use temporary fixture roots, fake subprocess results, and explicitly denied unexpected DSL calls.

Required cases:

- Exactly one keyword-only lane is registered; evaluation performs no process spawn, owner write, credential read, network operation, or release import. Invocation makes only the expected argument-vector guard call.
- Twelve-path manifest remains explicit and stable regardless of cwd; missing/duplicate/escaped/symlinked/unreadable inputs, empty input set, unexpected discovery files and changed guard identity fail closed.
- Guard statuses `0`, `1`, `2`, signal termination, missing interpreter, malformed JSON, missing/extra records and unexpected status all map correctly. Include existing guard fixtures for Unicode byte boundaries, 100/101 bytes, newline handling and invalid UTF-8 without replacing its tests.
- Synthetic keyword/secret markers never appear in public logs, errors or generated diagnostics, even when guard or **outer Fastlane** stdout/stderr, startup messages, exception text, lane context, or shutdown output contain them. Test the launcher's outer-output filter with fake process output containing malicious log lines, forged/extra JSON records, embedded terminal controls and secret markers; verify nothing raw is streamed or persisted. Only validated expected paths, byte counts, limit and fixed status text may be emitted; inspect synthetic scratch reports/logs for the same privacy invariant.
- The release Fastfile and existing lane source remain byte-identical; fixture file hashes and write instrumentation verify read-only behavior. These tests prove wrapper structure, **not** full Fastlane startup isolation.

### Separate real-runtime acceptance gate

Only with explicit approval and reviewed containment: exercise the pinned actual CLI in scratch against synthetic valid/over-limit/invalid fixtures first; verify discovered entry identity, lane failure behavior, denied network/credential attempts, absence of release-configuration evaluation, and all writes confined to scratch. Verify the launcher captures and sanitizes outer Fastlane stdout/stderr across startup, failure and shutdown without raw streaming or retained raw logs; inspect scratch reports and public diagnostics for injected synthetic field/secret markers. Any leakage or denied unexpected access attempt is an acceptance failure to investigate, not silently ignored success. Only then consider an explicitly approved read-only run against the twelve real owner inputs with before/after hashes and filesystem audit. No upload or auth lane is part of either gate, and no runtime command has been run during this design work.

## What passing would not establish

This lane does not approve descriptions/subtitles/promotional prose, translations, Apple policy compliance, listing claims, screenshots, App Store Connect state, credentials, submission, deployment, or release readiness. The supervisor's separate prose-guard baseline (72 files, five rules, zero errors/warnings) remains separate evidence; that guard can print raw match snippets and must not be added to this privacy-limited wrapper without its own redaction design and review.

## Review handoff

Review this written proposal before implementation planning. The current usable verification path remains the existing standalone guard; no Fastlane command has been executed or declared offline-safe by this design work.
