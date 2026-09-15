# Non-Fastlane blockers — bounded refresh

Date: 2026-09-15. Optional Fastlane work is deferred by the user. This report records supervisor-provided read-only receipts for **9k3k**; it is not a replacement tracker. No additional queries or probes were performed by the report author.

## Analytics and access

| Scope | Fresh receipt | Limit / remaining prerequisite |
| --- | --- | --- |
| PostHog project `292728` | Error-issue query, all statuses and test-inclusive, URL `roammate.com`, September 13 17:21 UTC–September 15 10:04 UTC: **0 results**, `hasMore: false`. | Empty results do not prove website instrumentation coverage or health. |
| Superlog, same window | Android, API and iOS services present; no website/admin service shown. | Website/admin coverage remains unproven; this is not a fixed instrumentation issue. |
| Available Obscura browser | Initial tab list contained only tab 1 at `superlog.sh/app`. A new GSC property request in tab 2 redirected to the public about page; Start now linked to Google ServiceLogin. | No logged-in Chrome attachment was available and no GSC export was obtained. This does **not** establish that the user’s separate Chrome instance is signed out. No cookies or credentials were accessed. |
| iOS owner Bead `uglq` | Closed September 14 at 03:18:08 UTC. | Active populated reports are historical evidence, not a new request or fresh analytics query. |
| Owner Beads `7x0l` / `zs4q` | Open; recorded update times September 13 at 06:59:52 / 09:09:44 UTC. | The user supplied `gs://pubsite_prod_5836786993431300721/stats/installs/`; the URI is now known, but read access remains unverified. No credential values are needed. |

## Storage regression — assessment, not consolidation

The process snapshot showed no Cargo/rustc process and 15 Obscura processes at 0% CPU. This is not exclusive-writer proof; no process was stopped. Free-space snapshots were **45 GiB on the internal SSD** and **24 GiB on USB**.

The Cargo archive-cache location previously consolidated to USB is now an **ordinary local directory rather than the verified USB symlink**. The paired locations are the corresponding `registry/cache/index.crates.io-1949cf8c6b5b557f` directories under `/Users/doreilly/.cargo` and `/Volumes/Overflow/moved/.cargo`. The user confirmed this was not deliberately restored and should be a USB symlink. The recreation cause remains unknown; no process or user is attributed as responsible, and no restoration has occurred.

The [copied assessment receipt](2026-09-15-non-fastlane-blocker-refresh.json) records the supervisor’s full per-file SHA256 comparison:

| Result | Value |
| --- | ---: |
| Local / USB archive entries | 609 / 532 |
| Shared names, all hash-equal | 531 |
| Same-name content conflicts | 0 |
| Local-only entries / logical bytes | 78 / 5,741,578 |
| USB-only entries | 1 |
| Local allocated bytes | 71,131,136 |
| Duplicate allocated bytes | 65,232,896 |

Each file’s stat information was stable before and after hashing. This is **not a locked, atomic snapshot or assurance against subsequent writers**. The 78 local-only archives and one USB-only archive must not be discarded based on duplicate totals.

New Bead **2d3w** tracks the writer/recreation cause and fresh verification. Intended layout is now confirmed as a USB symlink; restoration remains unperformed. No consolidation, copy, move, deletion, broad cleanup or THP scan was performed in this refresh. Earlier successful consolidation is historical evidence, not proof that the symlink remained intact.

## Disposition

Retain the analytics-coverage, GSC and unverified Play read-access prerequisites; the Play URI prerequisite is resolved. Investigate the Cargo layout regression only within the approved scope; do not reconsolidate from this receipt alone. Optional Fastlane remains deferred. No release, upload, production change or credential access occurred in this refresh.
