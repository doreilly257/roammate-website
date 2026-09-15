# Cargo archive restoration and Play access check

Date: 2026-09-15. Scope: user-approved A + B. This report records supervisor operations from the copied [Cargo receipt](2026-09-15-cargo-restoration-receipt.json) and [Play receipt](2026-09-15-play-access-receipt.json); the author performed no additional probes or restoration.

## A — Cargo restoration complete

Receipt time: **10:47:04 UTC**. Following fresh idle/open-file checks and acquisition of four advisory locks, the supervisor restored `/Users/doreilly/.cargo/registry/cache/index.crates.io-1949cf8c6b5b557f` as a symlink to `/Volumes/Overflow/moved/.cargo/registry/cache/index.crates.io-1949cf8c6b5b557f`.

| Verified operation result | Value |
| --- | ---: |
| Original local / USB archives | 609 / 532 |
| Shared archives with matching full SHA256 | 531 |
| Local-only archives copied / bytes | 78 / 5,741,578 |
| USB-only archive preserved | 1 |
| Final union | 610 archives |
| SSD allocated bytes removed | 71,131,136 |

The receipt records the resulting symlink, backup removal and final archive sizes/hashes. The user confirmed the intended USB layout; the cause of the earlier local-directory recreation remains unknown. Advisory locks and process/open-file checks are not universal exclusion of every possible writer. **The USB volume must remain mounted** for this cache path to work. These results do not describe a THP or Cargo source-cache migration. The supervisor independently rechecked the resolved symlink target and all **610 final archive SHA256 and size values** against the receipt after the operation: **PASS**. Bead **2d3w** records restoration; follow-up **xomv** tracks the still-unknown recreation cause.

## B — Play access remains authentication-blocked

Receipt time: **10:49:21 UTC**. The supplied prefix is `gs://pubsite_prod_5836786993431300721/stats/installs/`. The existing gcloud configuration showed **one user account and zero service accounts**; this does not establish service-account access.

An initial `--format=json` argument was locally invalid and was corrected to `--json`. The actual metadata-listing attempt then exited **1** because token refresh required interactive reauthentication. This was **not a 403 or permission-denied result** and does not prove the prefix is inaccessible to an authenticated identity. No report bodies were read; listing contents and service-account access remain unverified.

Bounded boolean checks found both known owner `play-store-key.json` locations absent and `GOOGLE_PLAY_KEY_FILE` unset. No broad credential search or credential-content read was performed. No reauthentication, account changes, installs, uploads or Fastlane execution occurred. The next access prerequisite is an appropriately authorized existing identity with working authentication, not an inferred need to change bucket permissions from this failure alone.

The user-facing approval question for `gcloud auth login` remains pending. No authentication action has been taken.
