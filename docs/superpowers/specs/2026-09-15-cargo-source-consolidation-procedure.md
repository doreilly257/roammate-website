# Cargo expanded-source consolidation and THP coordination

**Status:** Proposed procedure under **planning-only approval**. No migration script, filesystem change, process stop or execution is authorized by this document. Beads remain the execution tracker.

**Goal:** Safely consolidate one Cargo expanded-source namespace onto USB, preserving both sides' content and a verified rollback path, then coordinate any separate THP assessment with its build owner.

## Evidence and exact proposed scope

The [September 15 read-only audit](../verification/2026-09-15-thp-cargo-readonly-audit.md) enumerated entire `registry/src` roots, non-atomically. The proposed change is narrower:

- Local source: `/Users/doreilly/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f`.
- USB destination: `/Volumes/Overflow/moved/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f`.
- Preserve **all** other namespaces, especially USB `index.crates.io-6f17d22bba15001f`, parent `.DS_Store`, Cargo binaries/Git/index/configuration/locks, the already-consolidated archive symlink and all THP targets.

The selected local namespace had 39,139 regular files; selected USB namespace 28,161. Their observed sets shared 28,046 same-size names, with 11,093 local-observed-only and **115 USB-observed-only** files. The whole-root USB-only count 892 must not be used for this narrower operation. Only 12 shared files were hash-sampled; those matches do not authorize deletion or prove a conflict-free union.

## Stage A — Design and approval gates

1. Reconfirm exact canonical paths, object types, ownership, filesystem/device identity and mounted USB identity. Reject unexpected symlinks in either proposed root, changed targets, missing volume or a different volume mounted at the same pathname. Treat symlinks inside the trees as a separate manifest type; do not follow them during traversal or silently rewrite links.
2. Establish an execution window with owners of **all** Cargo/THP users of these paths. The earlier Cargo PID 34121 and multiple `rustc` processes are dated activity evidence, not a current live handle. Recheck processes, working directories, open files and selected registry activity immediately before execution. Do not stop a process, kill a build or assume ownership from a stale PID without separate approval.
3. Specify and review the exact platform's Cargo coordination locks and exclusive operation lock before implementation. Cooperating processes must be quiescent and required locks held throughout comparison, copying and cutover. Advisory locks cannot stop arbitrary writers, and an empty `lsof` result is not universal inactivity proof. If ownership/quiescence cannot be established, stop; metadata stability is not a substitute for coordination.
4. Present the exact migration, backup retention/removal point, rollback actions and USB-mount consequences for **separate execution approval**. Approval for this procedure alone permits none of them. Do not generalize prior archive-cache migration approval to expanded source.

## Stage B — Complete chosen-scope verification

Once separately approved and quiescent, enumerate both **chosen namespaces completely** using a resumable, bounded collector. Persist a private manifest/checkpoint rather than restarting at the beginning after every timeout. Record relative name, type, size, metadata needed for preservation, and SHA-256 of every regular file. Include empty directories, link targets without following them and relevant file modes; reject unsupported special files or unsafe paths. Avoid reading unrelated configuration, credentials or personal records.

Verify each file remained stable across its read and verify the complete entry set again while the writer exclusion remains in force. A changed file, incomplete scan or missing subtree invalidates the comparison and returns to owner coordination. A stable sampled subset is insufficient.

Derive three explicit sets: identical shared entries, local-only entries and USB-only entries. Any same-path content/type/link/required-metadata conflict **aborts consolidation** for owner decision; do not select the newer timestamp, overwrite either side or rename conflicts automatically. Preserve unique entries on both sides. Manifest digests are code/cache-file evidence, not secret fingerprints; keep verbose names/contents out of normal tool output.

## Stage C — Capacity, staging and recovery design

- Compute capacity from the fully verified chosen union and actual filesystem allocation behavior, including new local-only copies, temporary staging, metadata and **explicit safety headroom agreed before execution**. Measure current USB free space again. The previous 30.6-billion-byte snapshot is neither a reservation nor proof of fit. Stop if required working space plus headroom is unavailable.
- Prefer constructing a **separate USB staging namespace** containing the verified union, without changing the existing destination during preparation. Use a reviewed copy method preserving the manifest's required semantics; any hardlink/reflink optimization needs explicit review and must not make validation or rollback vulnerable to shared writes. Do not assume cross-device rename is available.
- Rehash the entire staged union and verify its exact entries/types/modes against the merged manifest. Test filesystem flush/error handling before destructive steps. Flush copied files and supported directory metadata using reviewed `fsync` behavior; unsupported/error results stop the operation rather than claiming durability. Do not promise resilience to every power-loss scenario from a sequence of filesystem calls.
- Reserve sibling backup paths on each respective filesystem. Record a recovery journal with phase and exact nonsecret paths outside the namespaces being switched. Establish root ownership/permissions and collision checks; never overwrite an existing backup/staging directory.
- A multi-filesystem cutover is **not globally atomic**. The reviewed implementation must use only same-filesystem atomic renames for each transition and document every intermediate state, including crash recovery. Keep writers quiescent throughout. A future script must not assume two renames plus a symlink constitute one transaction.

## Stage D — Proposed cutover and verification sequence

This is a future implementation sequence, not a command to execute now:

1. Revalidate locks, writer exclusion, complete manifests, USB mount identity, staging verification, capacity and recovery journal. Abort on drift before any switch.
2. Rename the old USB namespace to its reserved USB backup; rename verified staging into the final USB namespace, flushing the containing directory and recording the phase. If activation fails, restore the USB backup before proceeding.
3. Rename the local namespace to its reserved **same-SSD** backup. Create a temporary sibling symlink to the exact verified final USB namespace, validate its target, then atomically rename it into the original local namespace name. Flush the parent directory and record the phase. The local name may be briefly absent between steps; quiescence is mandatory.
4. Verify local link type/target/realpath/device, mounted USB identity, all union hashes/entry types and preservation of USB-only/local-only data. Verify other Cargo namespaces, archive symlink and THP targets remain untouched. Use filesystem checks only; a test build or dependency download is not implicitly approved.
5. If any step or postcheck fails, do not resume users. Follow the reviewed journal-aware recovery: restore the local backup at its original name and the old USB namespace, preserve the staged/new union separately, then verify the restored manifests. Never delete the only copy of an entry to make rollback appear clean. A changed or ambiguous state requires owner review, not blind reversal.
6. Only after independent successful verification may a separately approved backup-retirement step remove redundant backups. Until then, backups consume space and **no SSD space reclaimed** claim is justified. Before removal, reconfirm no newly unique data appeared; preserve any unexpected content. Record exact removed allocation separately from fluctuating `df` observations.
7. Release locks/resume agreed users only when the chosen success or rollback state has been verified. Record sanitized before/after manifests, phase receipts and limits. Do not automatically close unrelated duplication work.

The resulting local source namespace depends on `/Volumes/Overflow` remaining mounted and available. Document recovery/reinstallation expectations before approval; do not promise Cargo will work offline without that volume or silently restore a second SSD copy.

## Stage E — THP owner coordination, not target migration

After preparing the Cargo procedure, coordinate with the THP owner rather than changing the active build tree:

- Identify the exact current build/process session, worktree, target configuration and required artifacts, using current handles rather than the historical PID 34121. Ask the owner which output is authoritative and what must remain available, including unique/conflicting SSD files.
- Agree an idle inspection window without stopping builds unless expressly approved. Keep `/Users/doreilly/Work/thp/target` and the USB incoming tree unchanged. Do not infer completion from the name `incoming` or from equal release-file sizes.
- Reuse bounded manifest checkpoints under a declared snapshot/coordination policy. Resume by subtree/cursor, record complete versus partial coverage, and revalidate changed subtrees at the end. If writers continue, label live observations and defer exact equivalence; do not endlessly repeat whole-tree scans or classify partial-set differences as unique files.
- Establish full chosen-scope size/conflict and capacity evidence before proposing any THP consolidation. The earlier partial scan's 56 size conflicts and directly absent example are positive findings, not a complete manifest. Nine of ten apparent missing entries actually existed on USB.
- Any THP move, deletion, symlink, build interruption or chosen-artifact policy needs its own reviewed plan and approval. This stage delivers coordination requirements only, not ownership authority or execution.

## Acceptance boundary

This procedure is ready for review when the chosen namespace, conflict policy, writer controls, staging/headroom, multi-step recovery and backup-retirement gates are explicit. No content-hash sample, available-space snapshot or prior archive success is sufficient to authorize execution. The existing readonly audit remains evidence, not a completed source-cache or THP migration.
