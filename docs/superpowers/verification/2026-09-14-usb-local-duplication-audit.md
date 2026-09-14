# USB/local duplication audit — September 14, 2026

**Finding:** Some data is genuinely present on both devices, but the inspected trees are not established as interchangeable complete copies. No USB, Cargo or THP data was deleted, moved or replaced with symlinks. Root separately removed the verified inactive Wrangler cache described below under the user's clear-space instruction. GSC work remains paused by the user's storage priority.

Root identified `/Volumes/Overflow` as the USB volume (reported capacity 122.8 GB). This delegated inspection used only directory metadata and representative nonsecret dependency/build-file hashes. It did not open secret files, personal records, general browser profiles or production services.

## USB map and local counterparts — root-supplied receipts

Root's initial space snapshot: USB **86 GiB used / 28 GiB available**; SSD Data **190 GiB used / 5.1 GiB available**. The broad USB `du` scan timed out after 30 seconds without usable totals; no per-tree sizes are inferred from that failed scan.

| USB content | Local counterpart check | Classification |
| --- | --- | --- |
| `moved/.local`, `.android`, `.codex`, `.rustup`, `.gradle` | Each corresponding home dot-directory is a symlink resolving exactly to its USB `moved/` path | **Not a second SSD copy at those top-level paths**; both names refer to USB data |
| `moved/.cargo` | Home `.cargo` is a separate real SSD directory | **Confirmed partial duplication**, detailed below; unique content exists on each side |
| `moved/thp-target.incoming-20260912-232624` | Local `Work/thp/target` is a separate real SSD directory | **Confirmed duplicate samples / incomplete equivalence**, detailed below |
| `ollama` | Local `~/.ollama/models/blobs` has zero files/bytes; USB `ollama/blobs` has six files totaling 2,219,300,285 logical bytes (about 2.07 GiB) | No overlap at the inspected blob counterparts; configurations/history were not read |
| `DerivedData` | Local `~/Library/Developer/Xcode/DerivedData` is absent | No duplicate at that conventional local counterpart; not a search of all other paths |
| `Archives` | Local Xcode Archives immediate date-folder names do not overlap USB Archives date-folder names | No same-date-folder overlap; **not** a global archive-content equality/deduplication proof |
| `roammate-android-api26-sdk`, `roammate-legacy-api26.avd` | Local `~/Library/Android` absent; home `.android` points to USB | No conventional local Library counterpart found; full SDK/version/AVD content comparison not performed |
| `RefData/Property` | Folder name only inspected | **Not compared**; personal contents deliberately excluded, so no no-duplication claim |
| USB system metadata | Excluded | Not a cleanup/deduplication target in this audit |

Symlink findings are path-specific, not proof that no second copy exists anywhere else on the SSD. The independent Wrangler-cache cleanup below does not establish USB deduplication.

## Separate completed local cache cleanup — root receipt

At **19:20:52 UTC**, root removed `~/.npm/_npx/c4e09ea4da0c6ba2` under the user's clear-space instruction after identifying it as **Wrangler 4.131.1** and checking `lsof` plus process inventory for active use. The receipt reports **243,478,528 allocated bytes** (about 232 MiB); the subsequent filesystem observation showed **5.3 GiB available**. Free-space snapshots can also reflect other host activity and are not a byte-for-byte causal measurement of this removal.

This was a local tool-cache removal, not USB/Cargo/THP consolidation. Earlier classification of this cache as unknown was superseded by root's identification and inactivity checks; no conclusion about other unclassified caches follows. The report author performed no cleanup.

GSC remains paused for the storage task. The required Node REPL browser tool was unavailable in root's current tool context; that tooling limitation is **not evidence that the user's browser is signed out**.

## Independently inspected candidate pairs

| USB path | Local SSD path | Identity / conclusion |
| --- | --- | --- |
| `/Volumes/Overflow/moved/.cargo` | `/Users/doreilly/.cargo` | Both real directories, not symlinks; distinct filesystem devices and inodes. Partial overlapping caches with confirmed duplicate sample bytes, not identical trees |
| `/Volumes/Overflow/moved/thp-target.incoming-20260912-232624` | `/Users/doreilly/Work/thp/target` | Both real directories, not symlinks; matching build-cache samples but more local entries. An `incoming` name is not proof of a completed, verified transfer |

USB device ID was `16777244`; local SSD device ID was `16777231`. Cargo root inodes were USB `735571` / local `22418065`; THP target roots USB `1174404` / local `242276620`. These confirm separate filesystem objects, not two names resolving to the same directory.

### Cargo overlap and differences

- `~/.cargo` allocated-size observation: **1,044,088 KiB** (about 1,019.6 MiB). The USB Cargo `du -sk` exceeded its 12-second bound, so no USB total is claimed.
- Immediate content differs: USB has a `git` directory and additional installed tools, while local has other tools/shell-environment files. Contents of environment/credential files were not opened.
- Within `registry/cache/index.crates.io-1949cf8c6b5b557f`, filename/size enumeration found **497 USB `.crate` files / 531 local**, with **496 shared names**, all 496 sharing size, **one USB-only / 35 local-only**. Shared local logical bytes total **59,765,202**. This is a name/size overlap, not fully hash-verified duplication or a reclaimable-space estimate.
- Five representative same-path archives were SHA-256 compared; all five were byte-identical across devices. Remaining archives and expanded source/bin/git trees were not fully hashed.

| Shared archive | Bytes | Matching SHA-256 on both devices |
| --- | ---: | --- |
| `addr-0.15.6.crate` | 92,595 | `a93b8a41dbe230ad5087cc721f8d41611de654542180586b315d9f4cf6b72bef` |
| `adler2-2.0.1.crate` | 13,366 | `320119579fcad9c21884f5c4861d16174d0e06250625266f50fe6898340abefa` |
| `ahash-0.7.8.crate` | 38,550 | `891477e0c6a8957309ee5c45a6368af3ae14bb510732d2684ffa19af310920f9` |
| `ahash-0.8.12.crate` | 43,413 | `5a15f179cd60c4584b8a8c596927aadc462e27f2ca70c04e0071964a73ba7a75` |
| `aho-corasick-1.1.5.crate` | 184,315 | `c982642fa9e8606056828ee9a8505737230110bb1099153c79efe865c59d12ba` |

### THP build-cache overlap and differences

- Both `du -sk` scans exceeded their individual 12-second bound; no complete tree sizes are claimed.
- `debug/.fingerprint` immediate-entry enumeration found **3,163 USB / 3,286 local**, with **3,163 shared names and 123 local-only**. The local debug root also includes build artifacts absent from the USB root's immediate inventory.
- Five representative shared fingerprint JSON files were byte-identical by SHA-256. Fingerprints are build metadata; their equality does **not** prove corresponding binaries, source dependencies or entire target trees are identical. No JSON contents or embedded paths were printed.

| Shared relative build-metadata path | Matching SHA-256 on both devices |
| --- | --- |
| `debug/.fingerprint/addr-76f32868a2bea1e2/lib-addr.json` | `4044481f6fb2c005f4ee3d0e4df77c03bb1c841821236a87a8ff1fa9adead423` |
| `debug/.fingerprint/addr-a648adb85971c146/lib-addr.json` | `f8fc7764903c5b1a605d25865dcde9dd2f96ef8850569ccc576157170f7e571b` |
| `debug/.fingerprint/adler2-0659acc1c3e08e98/lib-adler2.json` | `90d5c3d5bb768b74e9708ab7820e2a2ef7b4dc73e9fd7a4d7cb4c02d2323d6aa` |
| `debug/.fingerprint/adler2-14ae8a519f0d809d/lib-adler2.json` | `6c4d21ceb1776addc705e159de2b9ac26b11f200dbfc3e8625a8968e0416afb9` |
| `debug/.fingerprint/adler2-64d66e126395e1ab/lib-adler2.json` | `e3806f4121b544747a964e707f2005805e2c473c95e4029254a313f5334ba477` |

## Bounds and safe disposition

The inspection enumerated immediate candidate roots, one Cargo archive namespace and one THP fingerprint namespace; representative hashing selected five shared regular, non-symlink files under 1 MB per pair. It did not recursively hash either whole tree or inspect project records. Directory/size observations may change under concurrent builds or cache use.

Do not delete either whole Cargo or THP tree on this evidence. Any deduplication requires a separately approved exact scope, current writer/activity check, complete comparison of the chosen files, sufficient USB working capacity and preservation of local-only/USB-only data. Converting a tool/cache path to a USB symlink also creates a mount-availability dependency and is not authorized by this read-only audit. The audit confirms duplicate samples exist; it does not claim the user's desired no-duplication state has been achieved.
