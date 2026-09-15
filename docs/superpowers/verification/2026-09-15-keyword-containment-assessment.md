# Keyword runtime containment — bounded assessment

Date: 2026-09-15. Bead: **eoul**. Status: diagnostic evidence only; **no complete containment or Fastlane runtime proof**.

This report records supervisor-provided local receipts. No additional probes, tests or owner writes were performed to author it. The [calibration receipt](2026-09-15-keyword-containment-assessment.json) preserves the supplied counts and booleans. Independent review approved this work as a design/assessment only, not runtime acceptance. See the separate [runtime containment design](../specs/2026-09-15-keyword-runtime-containment-design.md).

## Trials and interpretation

| Observation | What it establishes / does not establish |
| --- | --- |
| `/usr/bin/sandbox-exec` exists; system Ruby is 2.6.10 with `--disable-gems`. | Local mechanisms are available, not a working runtime policy. |
| Strict deny-default trial allowing process operations, sysctl reads and system reads: Ruby exited **134**. An expanded trial including file metadata also produced **134** for direct Homebrew Python 3.14.7. | Failure cause remains unknown. Neither trial provides a complete dependency allowlist or runtime proof. |
| Candidate allow-default policy denying network operations, Mach lookup, file writes, and file-data reads under Users, Volumes and Library Keychains allowed direct Python to run. | Generic queries returned `1` for network outbound/inbound/bind, Mach and file-write operations in parent and child. This is a diagnostic candidate, not an approved credential-safe runtime boundary. No Fastlane ran. |
| `/usr/bin/python3` shim trial invoked `xcrun`/`xcodebuild` SDK-location subprocesses and exited **72** because of permissions. | No app build was requested or completed and no installation occurred. It would be inaccurate to claim no `xcodebuild` process ran. |
| `/opt/homebrew/Cellar/python@3.14/3.14.7/bin/python3` bypassed that shim. | This identifies the direct interpreter used in calibration; it does not validate the Ruby 4/gem runtime. |
| Ruby Fiddle path queries returned **-1**. | Invalid query results, not denial evidence. |

## Compatible-version follow-up

A subsequent supervisor probe resolved `/opt/homebrew/opt/ruby` to `../Cellar/ruby/4.0.6_1`. With gems disabled, the candidate allow-default policy denying network, Mach lookup, writes and home/volume/keychain data reads printed **4.0.6** and exited **0**. A strict deny-default policy allowing process operations, sysctl reads, file metadata and reads under `/usr`, `/System`, Homebrew and dyld locations still aborted with **134**; its cause remains unknown.

Ruby 4.0.6 meets Fastlane’s stated minimum Ruby version of 2.7, **only**. This does not establish actual gem compatibility, dependency closure or safe runtime behavior. No gem or Fastlane execution occurred.

## Path-query calibration

The supervisor corrected Python ctypes use to three fixed argument types with the variadic path argument, then calibrated against two **existing synthetic temporary files**. The blocked file’s read query returned `1`; the allowed file’s read query returned `0`. An actual blocked synthetic read and an outside-scratch write both raised `PermissionError`; the scratch sentinel write succeeded and the outside file remained unchanged.

Crucially, the write query for a **not-yet-created allowed scratch path returned `1` even though the actual write succeeded**. The receipt therefore retains `allowed_write_query: 1` alongside `scratch_write: true`; do not reinterpret that query alone as enforcement. Existing-file calibration and observed operations are distinct evidence.

No credential file was accessed. Library Keychains was used only as a path name for policy/introspection, not read for contents. The synthetic temporary directory was cleaned up. The receipt contains only numerical query results and booleans, not credentials or raw file contents.

## Remaining boundary and recommendation

Credential-access closure, the actual Ruby 4 and gem dependency allowlist, inherited file-descriptor handling, complete Mach coverage and a trustworthy operation observer remain unresolved. Observation completeness is a separate unproven property from operation denial; no host personal-log scanning was performed. Successful direct-Python calibration does not establish those properties, nor does it establish real Fastlane startup/shutdown safety or owner read-only enforcement across the full runtime.

**Recommended next step (B0):** a bounded read-only runtime/dependency inventory and narrow plan, before any separately approved synthetic containment proof. Keep this inventory free of Fastlane launches and host personal-log scanning. Do not weaken the candidate into a claimed production-ready policy or enable real runtime on this evidence. No Fastlane, credential access, metadata changes, owner writes, uploads or releases are authorized by this report.
