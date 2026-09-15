# THP and Cargo read-only audit — September 15, 2026

**Scope:** User-approved read-only audits. Root collected the filesystem/process receipts; this report's author read the previous assessment and recorded root-supplied results without independent scans. No moves, deletions, builds, process termination or network actions were performed by this report task.

## THP: active tree, partial metadata scan

Root observed Cargo PID **34121** working in `/Users/doreilly/Work/thp`, with multiple `rustc` processes. Local `target` remains a real SSD directory, not a USB symlink. The already consolidated Cargo archive-cache symlink remains intact; that prior success does not establish THP consolidation.

Each THP root was scanned with a **60-second metadata budget**:

| Root | Observed regular files | Observed logical bytes | Observed allocated bytes | Completeness |
| --- | ---: | ---: | ---: | --- |
| `/Users/doreilly/Work/thp/target` | 204,388 | 38,657,149,353 | 39,072,559,104 | Timed out; partial, live tree |
| `/Volumes/Overflow/moved/thp-target.incoming-20260912-232624` | 16,332 | 2,980,072,630 | 3,014,029,312 | Timed out; partial tree |

The scanner exited successfully as a collector, but **both tree scans timed out**. Its exit zero is not complete enumeration. Counts and byte totals describe observed entries, not exact whole-tree totals or guaranteed space reclaimable. Root retained the approximately 27 MB manifest at `/tmp/roammate-20260915-thp-manifest.json`; it is deliberately not copied into the repository.

## Comparison and direct absence checks

The two observed sets share **16,331 relative names**: **16,275 same-size pairs** and **56 size conflicts**. No content hashes were taken. Equal size is not byte identity; positive size conflicts establish differences without certifying a complete conflict inventory. Concurrent builds mean the trees are not a frozen comparison snapshot.

Root directly checked the ten largest observed-set differences: **nine actually existed on USB**. This demonstrates why a name missing from the partial USB manifest must not be called local-only. One directly checked path, `debug/deps/horizon-4124697f843c7b26`, was absent on USB at the check; its observed local size was **77,079,224 bytes**. That single absence is time-specific, not a full unique-file manifest or deletion recommendation.

USB free space was **29,872,836,608 bytes** at root's observation. Comparing that value with partial/live logical or allocated totals does not establish that a migration will fit or fail: overlap, differing files, filesystem allocation, temporary-copy requirements and concurrent growth are not fully measured. No whole-tree capacity claim is supported.

## Cargo expanded source cache

Root separately enumerated the **entire `registry/src` root** on each device, not only its `1949` namespace. Both enumerations completed, but they were **not an atomic snapshot**:

| Entire `registry/src` side | Regular files | Logical bytes | Allocated bytes |
| --- | ---: | ---: | ---: |
| Local SSD | 39,139 | 836,263,416 | 932,499,456 |
| USB | 28,938 | 336,896,139 | 409,432,064 |

There were **28,046 shared names, all same size**, with zero observed size conflicts; **11,093 local-observed-only names** represented **506,480,222 logical bytes**, and **892 USB-observed-only names** were recorded. These are complete-enumeration set differences at the respective observation times, not guaranteed persistent uniqueness under concurrent writers.

Root hashed **12 evenly spaced shared-file samples**: all matched SHA-256, with stable size/mtime across those reads. This is representative sample evidence, **not full shared-file hash verification**. Same-size remaining files may not be assumed byte-identical. The full manifest and sample receipts remain at `/tmp/roammate-20260915-cargo-manifest.json` and `/tmp/roammate-20260915-cargo-hash-samples.json`; large name manifests are not committed.

Local `registry/src` exposed only `index.crates.io-1949cf8c6b5b557f`; USB also has `index.crates.io-6f17d22bba15001f` and the regular file `.DS_Store`. Both are **included in the USB root enumeration and its observed-only counts**, not excluded from the aggregates. All shared relative names were under the `1949` namespace, so the extra namespace was not part of shared-file comparisons/hash samples. Preserve that USB-only content. No expanded source-cache migration was approved or performed.

Root derived this USB breakdown from the same complete manifest, without another scan:

| USB entry | Regular files | Logical bytes | Allocated bytes |
| --- | ---: | ---: | ---: |
| `index.crates.io-1949cf8c6b5b557f` | 28,161 | 330,703,664 | 401,326,080 |
| `index.crates.io-6f17d22bba15001f` | 776 | 6,186,327 | 8,097,792 |
| `.DS_Store` | 1 | 6,148 | 8,192 |

Within the paired `1949` namespace, **115 files** were USB-observed-only; the whole-root count of 892 additionally includes the 776 extra-namespace files and `.DS_Store`.

The later USB free-space snapshot was **30,627,524,608 bytes**; its difference from the earlier snapshot reflects a changing system, not space reclaimed by this read-only audit. A [compact aggregate receipt](2026-09-15-thp-cargo-readonly-audit.json) records the supplied metrics without full manifests.

## Safety and disposition

Keep the active THP build tree unchanged. A future consolidation would require a separately approved exact operation, a fresh writer/inactivity check, complete comparison for the chosen scope, conflict/unique-file preservation and validated working capacity. Do not replace the SSD tree with the USB incoming tree on these partial manifests.

The [earlier Cargo/THP assessment](2026-09-14-cargo-thp-consolidation-assessment.md) retains the completed **archive-namespace-only** consolidation and historical THP observations. This new audit does not undo that verified archive result or imply whole Cargo/THP duplication has been resolved.

**Recommended order:** prepare an exact, separately reviewed Cargo expanded-source consolidation procedure first: the selected local cache is under 1 GiB by this observation and its enumeration completed, unlike THP. Require inactivity, full chosen-file verification, preservation of both sides' unique content and recoverability before proposing execution. In parallel, coordinate with the THP owner about active builds and the authoritative target; do not stop them or continue costly whole-tree scans blindly. This recommendation is planning/coordination, not migration permission or proof of safe capacity.
