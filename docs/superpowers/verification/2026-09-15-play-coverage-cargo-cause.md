# Play report coverage and Cargo recreation-cause search

Date: 2026-09-15. Scope: user-approved A + B, read-only. This report records supervisor receipts; its author performed no new probes. No raw report rows were retained.

## A — Bounded Play coverage

At **11:15:05 UTC**, the supervisor recorded 49 listing objects and read seven generation-pinned overview report bodies transiently in memory for headers and date coverage only. The [exact coverage receipt](2026-09-15-play-coverage.json) retains object generations, update times, schema and date summaries—not install values or raw rows.

All seven reports were UTF-16 and shared twelve columns: Date, Package name, Daily Device Installs, Daily Device Uninstalls, Daily Device Upgrades, Total User Installs, Daily User Installs, Daily User Uninstalls, Active Device Installs, Install events, Update events, and Uninstall events.

| Report month | Observed date minimum–maximum | Date-row count |
| --- | --- | ---: |
| March 2026 | March 1–31 | 24 |
| April 2026 | April 1–30 | 30 |
| May 2026 | May 1–31 | 31 |
| June 2026 | June 1–30 | 30 |
| July 2026 | July 1–31 | 31 |
| August 2026 | August 1–21 | 21 |
| September 2026 | September 1–8 | 8 |

March’s full-month endpoints with only 24 rows do **not** establish complete daily coverage. The counts and bounds for other months likewise are not a separate duplicate/missing-date audit. September’s object was updated September 13 at 09:07:42 UTC, but its observed data ends September 8: object freshness is not data-through freshness. August likewise stops at August 21.

No install, uninstall, upgrade or active-user metric values were computed. These observations do not establish a matching campaign baseline, full reporting completeness or service-account access; service-account access remains unverified. Seven overview bodies are a bounded subset of the 49 listed objects, not a claim to have inspected every available report.

## B — Cargo cause remains unknown

The restored archive-cache symlink still resolved correctly when checked. Both `~/.cargo/config` and `~/.cargo/config.toml` were absent. A bounded search inspected **77 tracked files**, each at most 200 KB, under the THP and website repositories: `.sh`, `.py`, `.toml`, `.yml`, `.yaml`, `Makefile` and `Justfile` candidates. Search terms covered `registry/cache`, `.package-cache`, Cargo clean/cache operations, `CARGO_HOME` and rsync/Cargo references. There were **zero matches** within those bounds.

Previously reviewed known temporary consolidation/restoration procedures preserve the symlink, but neither those procedures nor the negative bounded search identifies the historical writer. No session-history or credential scanning was performed, and no cache changes were made. The search excludes untracked files, other extensions, larger files, other repositories and historical runtime activity; absence of matches is not evidence that no writer exists.

Keep **xomv** blocked pending better attribution evidence. The successful restoration does not establish the cause or prevent recurrence, and this assessment does not justify broad cleanup, process termination or speculative configuration changes.
