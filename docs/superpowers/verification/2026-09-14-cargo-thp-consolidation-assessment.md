# Cargo consolidation gate and THP assessment — September 14, 2026

**Status:** Cargo archive-cache consolidation is **blocked by activity**; the subsequent THP assessment is read-only and found substantive differences. No Cargo/THP files were deleted, moved, overwritten or symlinked by this task.

The user approved Cargo archive consolidation only after inactivity and full-hash verification, followed by read-only THP assessment. Root observed active Cargo PID **80707**, whose working directory was `/Users/doreilly/Work/thp/.claude/worktrees/wdi-pagination-integration-20260914`; same-user open-file checks identified PIDs **80707 and 91783** using local `~/.cargo`. Root did not stop them or change Cargo while active. This blocks the approved operation's prerequisite, not merely its scheduling. No completed consolidation is claimed.

## Cargo archive comparison — root's full-hash receipt

At **19:55:24 UTC**, root completed read-only SHA-256 comparison of all archives in the selected local/USB Cargo archive-cache namespace, retaining its receipt at `/tmp/roammate-cargo-archive-compare.json`:

| Observation | Result |
| --- | ---: |
| Local archives / USB archives | 531 / 497 |
| Shared archive names | 496 |
| Shared archives with matching SHA-256 | **496** |
| Same-name content conflicts | **0** |
| Local-only archives | 35, totaling **4,407,241 logical bytes** |
| USB-only archives | 1 |
| Local archive namespace allocated bytes | **65,232,896** (about 62.2 MiB) |

All compared entry names, inodes, sizes and modification times remained stable during the read. That stability is **not a writer lock** and does not guarantee safety for a later mutation. Root's fresh activity recheck around **19:56 UTC** still found Cargo PID 80707 active in the same worktree.

The full hash result applies to this archive namespace, not all Cargo binaries, expanded source, Git caches or THP targets. It proves matching contents for the 496 shared archives and identifies unique archives to preserve; it does not itself satisfy the inactivity gate. No archive copy, deletion or symlink change was performed. Consolidation Bead `wr9e` remains blocked; its acceptance is not closed by this comparison.

## THP roots and bounds

Compared metadata under:

- USB: `/Volumes/Overflow/moved/thp-target.incoming-20260912-232624`, device `16777244`, inode `1174404`.
- SSD: `/Users/doreilly/Work/thp/target`, device `16777231`, inode `242276620`.

Both remain real directories, not symlinks. The author inspected immediate `debug/deps` and `release/deps` regular-file names, sizes, allocation metadata, selected direct existence checks and named Cargo-lock open-file indicators. Each dependency-directory enumeration was bounded to 12 seconds. No recursive full-tree hash, builds, source/personal-record contents or network requests were used.

## Dependency metadata comparison

| Scope | USB observation | SSD observation | Interpretation |
| --- | ---: | ---: | --- |
| `debug/deps` | 7,134 files observed; 1,089,920,111 logical bytes / 1,104,379,904 allocated bytes | 8,097 files observed; 1,226,824,344 logical bytes / 1,243,242,496 allocated bytes | **Both enumerations timed out**. Counts/bytes describe scanned subsets, not full directory totals |
| `release/deps` | 997 files; 990,252,831 logical bytes / 992,387,072 allocated bytes | 997 files; same logical/allocated totals | Immediate regular-file enumeration completed; all names/sizes agree, but contents were **not hashed** |

The partial debug scan sets shared 7,134 names and found **15 shared-name size conflicts**. Their 963-name scan-set difference does not prove 963 files are absent from the USB: either enumeration could have stopped before encountering a counterpart. No reclamation estimate is based on this partial difference.

One conflict was directly rechecked at the same relative path:

`debug/deps/golden-0db56807e1d8195d.golden.e3d90d5b6d29ed26-cgu.1.rcgu.o`

USB size **210,592 bytes** versus SSD **210,736 bytes**. This is positive evidence of divergent content size, sufficient to reject treating the whole trees as interchangeable; no hash or contents were needed for that conclusion.

## Directly verified local-only examples

The following local files exist and their exact USB counterparts do not at inspection time:

| Relative path | SSD logical bytes |
| --- | ---: |
| `debug/libhorizon_backtest_accounting.rlib` | 4,006,552 |
| `debug/libhorizon_backtest_accounting.d` | 459 |
| `debug/wdi-lock-interop` | 501,984 |
| `debug/libhorizon_run_files.d` | 297 |

These four files total **4,509,292 logical bytes**. Direct existence checks are stronger than absence from a truncated scan. They are examples, not an exhaustive local-only manifest; similarly, the 15 observed conflicts are positive findings, not a full conflict manifest. No file is deemed disposable merely because it is a build artifact or newer than the USB copy.

## Activity and capacity

Twelve targeted `lsof -t` checks—`.cargo-artifact-lock`, `.cargo-build-lock` and `.cargo-lock` under each root's debug/release directory—returned no open PIDs (exit 1). Root's broader same-user checks around **19:54 UTC** also observed no open files in USB Cargo or either base THP target while detecting the active local Cargo users above. **Neither observation proves durable or system-wide inactivity:** a service may execute an existing binary, inaccessible processes may be missed, or activity may begin after the check. The named-lock results do not override root's active Cargo observation.

The contemporaneous `df -h` snapshot showed approximately **5.0 GiB available on SSD Data** and **28 GiB on USB**. No complete target-tree size or safe copy working-space requirement was established; available capacity is not proof a full migration would fit. Allocation totals are filesystem accounting observations, not guaranteed recoverable space.

## Disposition

- Keep Cargo archive consolidation paused until a fresh activity check proves the approved operation safe; do not stop the user's process or weaken its full-hash prerequisite.
- THP assessment is complete within the stated bounds: the SSD target contains confirmed unique files and same-path differences. Do not replace it with the USB incoming tree or delete either tree as a duplicate.
- Any later THP consolidation needs separate exact scope, authoritative desired copy, current-writer checks, complete chosen-file comparison, preserved unique/conflicting files and sufficient working capacity. This read-only assessment authorizes none of those mutations.

See the [preceding USB/local audit](2026-09-14-usb-local-duplication-audit.md) for symlink distinctions and representative duplicate samples. Matching samples and matching release-file sizes do not establish whole-tree identity or achieve the user's no-duplication objective.
