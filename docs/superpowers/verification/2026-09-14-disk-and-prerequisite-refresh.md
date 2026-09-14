# Disk candidates and remaining prerequisites — September 14, 2026

**Scope:** User-approved read-only disk candidate inventory followed by remaining-Bead prerequisite refresh. No deletion is authorized by this inventory. This report is a dated evidence snapshot, not a parallel task tracker; Beads remain authoritative.

## Disk inventory — root-supplied receipts

Root completed the combined disk/provider receipt collection at **18:53:44 UTC**. Filesystem free-space observations were approximately **5.3 GiB internal / 28 GiB Overflow**. These are snapshots, not a cleanup result; nothing was deleted by this task.

| Candidate / area | Observed size | Disposition and limits |
| --- | ---: | --- |
| Two clean admin evaluation/package worktrees' nested `node_modules`; HEAD prefixes `8a6bfd` and `87160f34` | **440 MiB each** | Strongest potential cleanup candidates, subject to separate exact-path approval and fresh inactivity check. Preserve source, lockfiles and evidence. Deleting dependencies loses immediate offline reproduction and may require downloads to reinstall |
| Bounded `_npx` scan | Approximately 571.1 MiB; later individual `du` observations about 410 MiB | Not an exact reconciled total: concurrent cache activity/hardlink accounting differences remain possible. Do not sum or promise reclaimed bytes |
| Active `_npx` context `c35ab75beed40a3c` | About 59 MiB | Protect; active context identified by root |
| Identified Surge / Vitest / HTTP-server cache candidates | Approximately 33 / 34 / 4.8 MiB | Candidates only; require a fresh inactive-use check before any separate deletion approval |
| Unclassified `_npx` entry `c4e09ea4da0c6ba2` | About 232 MiB | No package manifest identified; retain as unclassified, not presumed disposable |
| Homebrew cache candidates | About 270.6 MiB | All modified within 24 hours; protect rather than treat as stale |
| Gradle scan | 276.2 MiB observed lower bound | Scan incomplete. Historical 3.5 GiB is not a fresh measurement or deletion estimate |

The initial broad `du` scan timed out after 30 seconds. Later bounded observations do not make the whole-disk inventory exhaustive. Any future cleanup must reidentify exact paths, current users/processes and reconstruction costs; this read-only approval does not authorize deleting dependencies, active caches, worktrees or evidence.

The two dependency candidates are precisely `.worktrees/admin-workers-evaluation/admin.roammate.com/node_modules` and `.worktrees/admin-workers-release-packaging/admin.roammate.com/node_modules`; the worktrees themselves are not deletion candidates in this proposal.

## Local prerequisite snapshot

At **18:49:40 UTC**, website HEAD was `b53dafe809cc7959cdde7974230cb881587280f2`, with clean `main...origin/main`. A compact full `bd list --all --limit 0 --json` filtered out closed/tombstone entries and found **36 nonclosed items: 25 blocked, 6 open, 4 deferred, 1 in progress**. `bd ready --json` returned `[]`. The in-progress item is this scoped inventory, `y4ur`; no claim that all remaining work is complete follows.

An earlier open-only read saw `y4ur` before root's claim; the later full snapshot above is authoritative for these counts. The broad notes output was truncated and was not treated as a complete prerequisite inventory; omitted items were read through targeted compact selections. The grouped table covers all 36 IDs exactly once.

| Group / Bead suffixes | Actual remaining prerequisite | Evidence status in this refresh |
| --- | --- | --- |
| Growth readiness: `3sf`, `e4a`, `lnn`, `5nh`, `bq3`, `ugd`, `cd7`, `yrh` | Released hardening/journey acceptance and standing growth clearance; gated safety content additionally needs shipped mandatory verification; attribution/social-proof/localisation need their respective valid data/contracts | Fresh tracker state, existing recorded requirements. Prior referral/click aggregates and owner referral source are not fresh clean attribution or growth permission |
| GSC/indexing experiments: `fov`, `3on`, `2u3`, `849`, `cot` | Authenticated GSC/export access and cohort-aware outcomes; indexing pilot additionally requires backlink/experiment review and exact redirect approval | Read-only GSC approval is already granted; old “skip” notes are superseded. This local inspection does not reverify browser sign-in. Overdue dates do not establish data availability or authorize changing experiment arms |
| Pagefind and claims: `pv7`, `xsf`, `do5` | Authorized cache-rule/purge access, coupled production HTML/index recovery verification, and English store publication for remaining claims | Prior failed write authorization is a recorded blocker, not freshly retried here. Existing production approval is not a newly connected credential |
| Admin/backend: `d3m`, `7ku`, `1wi` | Deployment-bound scoped-key attestation, relevant backend contract release/acceptance, authenticated admin acceptance; migration additionally needs reviewed live cutover/rollback/allowance gates | Existing local code and evaluated packaging are not deployed contracts. No secret values, records or live probes accessed by report author |
| Stores/reporting: `g1v`, `bq2`, `j2y`, `t7f` | Revalidate editable App Store target `2026.3.8`, exact metadata/asset and publication authority, owner tooling/asset handoff; Play Statistics bucket/read access and remaining report segmentation | User supplied version identity, not upload/submission approval. Existing metadata files/reports are not “missing”; current private store state was not queried in this local pass |
| Telemetry/auth/test safety: `sie`, `1g0`, `e3n`, `46f` | Released source/build-aligned event delivery and clean cohorts; isolated app-attributed runtime safety evidence where required | Local iOS integration and source parity remain delivered; owner source advances below do not prove released/runtime acceptance |
| Flags/Discover: `on8`, `dkc` | Served-source/effective configuration and placement acceptance, appropriate live migration/enablement and cost boundaries | Existing offline drift/parity evidence does not prove live parity; no-cost/no-AI-enable constraints remain |
| Retention/onboarding: `1yv`, `t4n`, `obt` | Released endpoint/source and properly excluded, historical or release-aligned aggregate cohort/status evidence | Delivered organic SQL and onboarding repairs remove old implementation premises, not historical causality or released retention gaps |
| Browser exceptions: `uqt` | Actionable redacted stack/reproduction/release evidence with sufficient coverage | Prior zero-query results or missing service coverage are not resolution; no new remote exception query performed here |
| Nonce acceptance and invalid run: `9lk`, `ndzz` | Valid alternative acceptance decision or matched historical latency evidence; separately, reproducible/fixed-stage evidence identifying original invalid benchmark cause | Completed local benchmark does not close production comparison. Original generic invalid-run output cannot retrospectively identify cause; no blind repeats |
| Current bounded inventory: `y4ur` | Record read-only candidate/prerequisite evidence and root review | In progress at snapshot; root decides closure of this scope only |

## Fresh owner repository observations

- Android HEAD was `ce5fcce1` (September 14 **18:39:23 UTC**), a keyboard/photo-fixture test correction. Nearby commits include AndroidX EXIF normalization, compiler-warning cleanup and session-bound social unlink dispatch.
- iOS HEAD was `0764059` (September 14 **18:40:00 UTC**), binding API requests/replay to the originating session; nearby commits address refresh ownership and date validation.
- These are newly observed source commits, not root-run tests, active process handles or proof of upload, release, runtime behavior or taxonomy acceptance. Owner work was read only and not overwritten or rebuilt.
- Android's tracked `docs/audits/2026-09-14-coordinated-store-release-readiness.md` was last changed by `8641d4a4` at **13:25:43 UTC**. It records candidate code 14 / version `2026.3.8` as not uploaded and a Play read at **12:38:15 UTC** showing code 13 in progress / code 12 completed. Those store observations remain attributed historical owner evidence, **not a fresh live Play query** in this refresh. Its iOS baseline is also historical, not today's newly observed iOS HEAD.

No new locally executable closure prerequisite was proved by this source-only owner refresh. It is useful progress evidence, but not authority to duplicate the owner's builds or transfer release approval into this thread.

## Fresh provider prerequisite checks — root-supplied receipts

Root verified the route **`api.roammate.com/*` → `roammate-api-production`**, then inspected that routed Worker. Its latest recorded deployment remains `4be27a68-bfe0-44ba-a618-f3ff9ecc931f`, created `2026-09-10T13:18:48.739375Z`, serving version `b100e60a-4552-4c90-9e13-1256a28c09ff` at 100%. This does not establish delivery of the later moderation/admin contracts.

An initial query selected the non-routed legacy Worker `roammate-api` and returned an August 18 release. That result was **discarded as evidence about the routed backend**; the route-mapped result above is the retained observation.

Admin Pages remains deployment prefix `c185fa92`, source `6f4cf940`; public Pages remains `d1d8272a`, source `a95b835c`. These are fresh control-plane observations, not secret-value attestation, authenticated UI acceptance or per-edge response verification. Successful GET access does not prove Cache Rules Edit/Cache Purge authorization. No provider writes, secret retrieval or credential probes were performed.

## Disposition

The bounded inventory/prerequisite refresh is delivered for root review. **Recommend considering the two 440 MiB dependency directories first only if the user separately accepts losing offline reproducibility and a fresh inactivity check passes.** Keep unclassified/recent/active caches protected. No deletion or exact reclaimed-space promise follows.

The fresh route/deployment check preserves the backend release blocker; owner source advances do not lift it. Other prerequisites not directly checked against a provider remain explicitly tracker-derived, not newly verified. Root may close `y4ur` for this completed scope while leaving the other 35 nonclosed items governed by their actual acceptance requirements.

## Boundaries

The report author used local read-only Beads/source/document inspection only: no network, deletion, secret files, personal-record access, builds, Bead mutation or commit. Root owns separate disk/provider receipts, approval questions, review and final status changes. Stale notes are deliberately distinguished from fresh verification.
