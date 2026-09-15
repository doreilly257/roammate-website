# Bounded keyword runtime containment — design

Date: 2026-09-15. Status: **design only; real runtime is not authorized or proven safe**.

## Authority and current boundary

This assessment extends the [offline lane design](2026-09-15-offline-metadata-lane-design.md) after the [synthetic fixture verification](../verification/2026-09-15-offline-keyword-fixture.md). It does not authorize implementation, installation, Fastlane/RubyGems loading, credentials, network traffic, owner edits, or a real owner-keyword run. No production/release Fastfile adaptation is proposed.

The synthetic owner fixture is landed at `9085a4391bdab403fa486710a5d9371a4114bfe0`. Its 172 assertions and the separate 29 Python regressions are useful evidence, not actual Fastlane acceptance. The owner checkout has unrelated dirty work; neither a clean checkout nor exclusive access is assumed.

**Recommendation: prove bounded containment controls first, without Fastlane or gems.** Keep the standalone guard as the current usable path. An existing deny-network profile is not a full isolation boundary, and an attempted deny-default profile aborting the interpreter is not a usable runtime boundary.

## Known evidence versus open gates

| Question | Known | Not established |
| --- | --- | --- |
| Existing local sandbox | Prior synthetic tests ran with `(allow default) (deny network*)`. Direct Homebrew Python and a child returned generic policy-query denials under a diagnostic candidate. Calibrated existing dummy-file reads and scratch/outside-scratch writes behaved as expected. | Complete credential isolation, inherited-handle closure, owner immutability and all-path scratch-only enforcement are not proved by these limited checks. |
| Deny-default local sandbox | Supervisor reports both system Ruby `--disable-gems` and direct Homebrew Python aborted with exit 134 and no output. Attempted allowances included process operations, sysctl reads, file metadata and system/runtime-library reads; Python's attempted set included system, `/usr`, Homebrew and dyld reads. | Cause, sufficient narrow startup rules, compatibility with the intended Ruby, and a functioning fully contained process. Do not infer a specific missing entitlement from the abort. |
| Synthetic wrapper | Explicit twelve-path manifest, pinned guard identity, strict result schema, synthetic output rejection and fixed interpreter selection were tested. | No real process runner exists; actual Fastlane output, discovery, reports and process-tree behavior remain untested. |
| Installed Fastlane source | Read-only inspection of `fastlane-2.232.2/bin/fastlane` requires Ruby **2.7.0 or higher** and uses an `env ruby` shebang. | The shebang does not pin the interpreter. Installed directory `gems/4.0.0` is not proof of executable identity, compatibility or a complete dependency closure. |
| Interpreter mismatch and shim | Supervisor identified system Ruby 2.6, below the Fastlane entry's minimum. Under the restrictive candidate, `/usr/bin/python3` invoked developer-tool SDK-location subprocesses and failed with status 72. | `/usr/bin/python3` is not a safe assumption for the future runner's final executable. No app build was requested/completed. Change the existing helper's pin only with future implementation approval; do not silently substitute it in this assessment. |
| Installed newer Ruby | `/opt/homebrew/opt/ruby` resolves through `../Cellar/ruby/4.0.6_1`. A gem-disabled version-only probe under the diagnostic candidate printed `4.0.6` and exited `0`; the attempted strict deny-default profile with the same prefix-read allowance still aborted with exit `134`. | Ruby 4.0.6 meets the entry's numeric minimum only. Fastlane compatibility, complete dependency closure and strict containment remain unproved; no gems were loaded. |
| Dependencies | `fastlane/lib/fastlane.rb` requires `fastlane_core`, actions, plugins, server modules and other framework code. `fastlane_core/lib/fastlane_core.rb` includes analytics/keychain-related modules and third-party `colored` and `commander`; CLI distributor can require `tty-spinner`. | These source imports do not prove side effects occurred or that all transitive dependencies/native libraries are known. No gem evaluation or dependency install was performed. |
| Runtime context | Synthetic `fastlane/Fastfile` explicitly says not to load through real Fastlane, and requires injected `@offline_keyword_context`. Helper defaults to `/usr/bin/python3` and an absent runner returns `runner_unavailable`. | Merely invoking the CLI cannot create an approved context. A separately reviewed context assembler and bounded runner are required. |

Measured local policy-query receipts belong in the accompanying containment assessment, not inferred runtime pass claims. Policy queries predict authorization decisions; they do not themselves exercise every syscall or credential access path.

The supervisor's working query probe used direct `/opt/homebrew/Cellar/python@3.14/3.14.7/bin/python3 -B -S` and a variadic `sandbox_check` binding with three fixed arguments. The diagnostic candidate used `(allow default)`, denied `network*`, `mach-lookup` and `file-write*`, allowed writes to one scratch directory, and denied `file-read-data` for an explicit dummy fixture and under `/Users`, `/Volumes`, and `/Library/Keychains`. It is **not a proposed final runtime policy**: other paths remain readable, so it does not establish the required default-deny read allowlist or complete credential isolation.

Supervisor-provided calibration evidence is preserved in the [containment assessment receipt](../verification/2026-09-15-keyword-containment-assessment.json), including the historical `/tmp/keyword-containment-calibration.json` evidence. Two existing synthetic files outside the owner checkout provided denied/allowed controls. The explicit denied read raised `PermissionError`; an outside-scratch write raised `PermissionError`; a scratch sentinel write succeeded; the allowed source remained unchanged. With path filter `1`, existing denied/allowed file queries returned `1`/`0`. Critically, querying the nonexistent scratch sentinel before creation returned `1` even though its actual write was allowed: **a `1` result on a nonexistent path is not reliable denial proof**. Earlier nonexistent dummy `/Users` and `/Volumes` queries therefore do not establish those paths' effective protection.

Generic outbound/inbound/bind, Mach lookup and file-write queries returned `1` in a child that exited `0`, providing limited child-policy evidence, not a complete descendant-escape test. The synthetic probe used a minimal environment with controlled PATH and scratch HOME/TMPDIR plus closed inherited descriptors; this is not proof of complete future Fastlane environment/FD isolation. No owner writes, real credential reads, authentication, or Fastlane execution occurred. Earlier Ruby Fiddle probes returning `-1` are invalid results, not denials; a variadic-ABI issue is an inference, not a proven cause. A working Python query probe is not proof that Fastlane's required Ruby can start within the desired final policy.

## Alternatives

| Option | Trade-off | Decision |
| --- | --- | --- |
| Existing macOS sandbox, tightened and independently tested | Available locally; potentially smallest change. Requires narrow OS/runtime allowances and proof of effective denial. Current deny-default interpreter abort blocks acceptance. | Preferred **control-proof investigation**, not approval to launch Fastlane. Never widen to allow-default just to make startup work. |
| Dedicated disposable VM with no network and no host integration | Can separate host credentials and expose an immutable fixture volume with bounded writable storage. Adds provisioning, image/runtime provenance, host-share and resource-control review. | Fallback design only. Availability is unverified; no install/provisioning approval. No host HOME, credential share, clipboard/agent forwarding or inherited host sockets. |
| Remain standalone | Smallest surface and existing verification evidence; no new runtime dependency. | Current usable choice if narrow local controls remain unavailable or are not worth the complexity. Does not establish a Fastlane lane. |

## Proposed containment contract

The following are requirements for a future implementation, **not controls implemented by this document**.

### Trusted supervisor and immutable execution inputs

A trusted supervisor outside the child boundary constructs one fixed execution plan. It resolves and pins absolute paths, versions and content identities for Ruby, the reviewed Fastlane entry, allowed gem/native dependencies, Python, guard, context assembler and isolated lane. It never uses shell interpolation, PATH discovery, arbitrary lane arguments, `bundle install`, RubyGems resolution/downloads, `eval` from caller data or the installed `env ruby` shebang as the launcher.

Allow only reviewed dependency files and necessary OS libraries/configuration as read-only. A broad Homebrew tree, owner tree or real HOME read allowance is not acceptable merely because the runtime lives there. Symlinks must resolve into the reviewed set. Freeze that set against concurrent replacement for the run, or reject the run; preflight hashes alone do not close a race.

Start with a clean environment constructed from an explicit allowlist, never a copy-and-delete strategy. Use disposable empty HOME, temp and cache paths, fixed scratch cwd, fixed UTF-8 locale and noninteractive settings. Do not propagate credentials, proxy configuration, `SSH_AUTH_SOCK`, Ruby/Bundler injection variables, `RUBYOPT`, `RUBYLIB`, `BUNDLE_*`, `GEM_*`, `DYLD_*`, Python injection settings, or arbitrary `FASTLANE_*`. Any needed gem search path is supervisor-generated and restricted to the pinned closure, not inherited. Source-confirmed `FASTLANE_SKIP_UPDATE_CHECK`, `FASTLANE_SKIP_DOCS`, `FASTLANE_DISABLE_ANIMATION` and scratch `FL_REPORT_PATH` reduce incidental behavior but are not security controls. Review analytics suppression separately; network remains denied even when suppression is configured.

Close all inherited file descriptors except an explicit bounded IPC set. Stdin is an inert EOF source, stdout/stderr are private supervisor-owned pipes, and no terminal, socket, credential handle, agent connection or ambient working-directory descriptor passes through. Resource/process setup must occur before untrusted runtime loading. The supervisor and its configuration are trusted; a hostile same-user host process rewriting trusted files or reading supervisor memory is outside this proposed local boundary, and a mutable/untrusted host requires the VM option or no run.

### Deny capabilities, not just environment hints

- Deny all child and descendant networking, including IPv4/IPv6, loopback, outbound/inbound sockets, DNS and local socket paths. Do not issue external test traffic during this design assessment.
- Deny host credential-file reads, directory enumeration and writes, including Keychains, SSH/cloud/app-store credential material and real HOME configuration. Use deny-default plus narrow read allowances rather than enumerating every possible credential filename.
- Deny credential/security Mach-service lookups and other unreviewed IPC/service access. Any narrowly required OS service needs a documented noncredential purpose and independent verification; no blanket `mach-lookup` allowance. File denial alone does not isolate Keychain services.
- Keep the entire owner checkout nonwritable, including metadata, `.git`, release files and parent paths. Runtime reads may cover only approved guard/helper sources and the twelve-input view, never release configuration or unrelated owner files.
- Permit writes only within explicitly bounded disposable scratch storage. Deny writes through aliases, symlinks, hardlinks and inherited descriptors; forbid scratch links into owner/credential paths. A broad `/tmp` allowance is not scratch-only containment.
- Descendants inherit restrictions, cannot escape supervision or acquire broader capabilities, and cannot execute arbitrary programs. Allow only the pinned Ruby/Python execution path and any individually reviewed indispensable runtime helper; unexpected process creation is failure, not a reason to broaden policy.

Credential controls must be verified with policy authorization queries and synthetic decoy fixtures/service checks that do not read real credentials, authenticate, or prompt the user. Generic network denial is never credential evidence. If genuine service-denial behavior cannot be tested safely within a newly approved scope, keep that gate open.

Enforcement is not detection. Before accepting the requirement that every unexpected denied attempt causes failure, prove a reliable observer covers the relevant operation classes across the entire supervised process tree, including swallowed runtime errors and shutdown. Calibrate observation with deliberate synthetic attempts and prove missing/dropped observer events cannot produce success. Only privacy-safe fixed operation classes/counts may leave that observer; no host personal-log scan, raw host log collection or credential-path disclosure is permitted. If complete observation cannot be established within this boundary, that acceptance gate remains open even when enforcement itself works; do not claim that an absence of observed attempts proves none occurred.

### Input view and staged entry

First runtime acceptance uses **synthetic fixture inputs only**, outside the owner checkout. Preserve the same twelve-locale manifest and guard identity contract; fixture-root selection must be trusted supervisor state, not user-provided arbitrary lane arguments.

For any separately approved owner run, establish a stable read-only view of exactly the twelve keyword files and reviewed guard/helper. A child read-only rule does not stop other host processes changing the live checkout. Use a reviewed immutable snapshot/read-only view or an equivalent proven freeze mechanism; do not silently copy owner keyword contents into ordinary scratch. Map diagnostic paths back to the twelve approved owner-relative paths. Record before/after identities without printing field contents and refuse an unstable view.

Stage a reviewed isolated runtime entry and its context assembler outside the owner checkout. The current synthetic-only Fastfile stays synthetic-only until a separately approved, owner-reviewed adaptation exists. The assembler creates the existing helper's context with pinned roots, identity and real bounded runner, then installs it in the correct Fastlane evaluation object before lane invocation. That integration point must be source-reviewed and tested; no magic CLI argument or invented `--fastfile` flag is assumed. Do not widen or import the release Fastfile.

Reject unexpected `Fastfile.swift`, `.fastlane`, dotenv files, Appfile, Pluginfile, Gemfile configuration, custom actions or extra discovery inputs in scratch and relevant discovery ancestors. Scratch ancestors must not expose user/project configuration. Standard Fastlane discovery is acceptable only when the complete lookup surface is controlled.

### Bounded execution and private output

Proposed initial ceilings for later review: one run at a time; 30 seconds wall time; 10 seconds CPU per process with aggregate descendant accounting; eight total processes; 64 open descriptors per process; 512 MiB aggregate resident memory; 64 MiB writable scratch; 256 KiB aggregate raw stdout/stderr across outer runtime and guard; 16 KiB maximum protocol record. These are conservative design targets, not measured working limits. The selected mechanism must enforce or replace them with explicitly reviewed enforceable equivalents before execution; unsupported aggregate limits remain a blocker.

The supervisor concurrently drains bounded pipes to prevent deadlock, never streams raw output, and kills/reaps the entire descendant group on timeout, cap breach, protocol failure or supervisor cancellation. Do not allow a detached child to continue after the parent exits. Disable core dumps and account for crash/report locations; a runtime that can write raw crash artifacts outside scratch fails the contract. Cleanup must run on success and failure, with bounded failure handling; do not archive scratch or raw logs for debugging.

Separate private guard protocol from outer Fastlane stdout/stderr. The bounded runner collects actual guard status and JSON-lines records; only schema-validated expected paths/counts/limits and fixed status classifications reach public diagnostics. Outer output cannot forge guard success: arbitrary parseable JSON appearing in a Fastlane log is not an authenticated result. Channel separation/ownership and exactly-one guard invocation must be tested. Fastlane startup, lane context, exception causes, shutdown output and scratch reports remain covered by privacy tests.

All raw channels stay transient and bounded in private memory and are discarded. No raw terminal/tool transcript, tee file, debug log, retained report or exception string is allowed. Build diagnostics from validated records, not from partially sanitized logs. Unknown output must not be reproduced in parser errors. Unexpected access attempts or output artifacts fail acceptance even when the sandbox blocks them successfully. Record only fixed operation classes, statuses and counts needed to diagnose the failed gate.

## Acceptance sequence and stop conditions

| Gate | Required evidence | Permission boundary |
| --- | --- | --- |
| A — design review | Review the exact threat model, proposed caps, dependency closure method, macOS/VM choice and unresolved control gaps. | Present document only; no runtime implementation implied. |
| B0 — read-only inventory and narrow policy plan | Resolve and inventory pinned runtime/dependency identities using read-only inspection; document the narrow startup-policy hypothesis, safe observer design and each planned synthetic control probe. Address the exit-134 evidence without assuming its cause or broadening to allow-default. | Next proposed design step only: no runtime launch, gems, dependency installation or implementation. |
| B1 — bounded control proof | After separate approval, make the pinned gem-disabled interpreter start under a narrow deny-default profile; synthetic probes establish file/Mach/network denials, scratch-only writes, immutable fixture view, descriptor/env isolation, child containment, timeout/resource caps, observer completeness and safe cleanup. Numeric Ruby-version eligibility alone is insufficient. | Separately approved synthetic control probes only; no Fastlane, RubyGems, owner keywords or credentials. |
| C — implementation review and synthetic tests | Approve and implement the context assembler/runner separately; reproduce existing tests and add launch-plan pinning, IPC forgery, output floods/deadlocks, signals, descendant escapes, resource-cap failures, discovery pollution and privacy-marker tests. | No real Fastlane until this gate and explicit runtime approval. Owner edits require owner-session approval. |
| D — real runtime, synthetic inputs | Separately approve the pinned actual runtime in proven containment; valid/over-limit/invalid UTF-8/100–101-byte/missing-file fixtures establish actual lane/outer exits, discovery identity, sanitized output, scratch privacy, denied capabilities and full cleanup. Compare expected guard classifications with actual process behavior; do not assume exact Fastlane exit codes. | Synthetic inputs only. No release entry, real metadata, auth or network. |
| E — actual owner inputs | Separate explicit approval after D; twelve stable read-only inputs, bounded approved runtime, before/after owner identity checks plus filesystem audit and no unrelated dirty-work interference. | Read-only keyword validation only; no credential or owner-write authority. |

Any unproven mandatory capability denial, mutable trusted input, missing dependency, new service requirement, output leakage, observed unexpected attempted access, incomplete observer coverage, unbounded child, resource limit gap or inability to clean up stops the sequence. Passing A/B0 does not authorize B1; passing B1/C does not authorize D, and passing D does not authorize E. Passing E does not establish release readiness, translation approval, editable App Store version, upload or submission readiness.

## Minimal next step

Review this proposal and, only if desired, proceed with **Gate B0's read-only pinned-runtime/dependency inventory and narrow policy plan**. Gate B1's synthetic containment-control proof needs separate approval after that plan is reviewed. Do not ask for a real Fastlane run while the narrow local profile still aborts or credential/owner-write controls remain unproven. If a narrow working profile cannot be demonstrated, keep the standalone guard; VM provisioning would require a separate decision and approval.

## Source references

- Existing [offline design](2026-09-15-offline-metadata-lane-design.md) and [fixture receipts](../verification/2026-09-15-offline-keyword-fixture.md).
- Read-only owner sources: `scripts/store/offline-keywords/keyword_verification.rb` and `scripts/store/offline-keywords/fastlane/Fastfile`.
- Installed source only, under `/opt/homebrew/lib/ruby/gems/4.0.0/gems/fastlane-2.232.2/`: `bin/fastlane`, `fastlane/lib/fastlane.rb`, `fastlane/lib/fastlane/cli_tools_distributor.rb`, `fastlane_core/lib/fastlane_core.rb`. No `fastlane.gemspec` exists at that gem-root path; no complete dependency inventory is claimed.
