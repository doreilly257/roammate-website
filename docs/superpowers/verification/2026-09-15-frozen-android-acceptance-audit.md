# Frozen Android candidate — acceptance evidence audit

Date: 2026-09-15. Bead: **x05d**. Scope: user-approved read-only metadata/document gap audit. This report uses supervisor-provided receipts; no additional probes were performed by its author. No build, runtime launch, upload or private-record access occurred in this audit.

## Frozen identity and evidence levels

The supervisor read `receipt.json` under `~/.local/share/codex/release-artifacts/roammate-app-android/2026.3.8-vc14-23527166`. It still records **`UNACCEPTED_CANDIDATE_DO_NOT_UPLOAD`**:

| Field | Recorded value |
| --- | --- |
| Artifact source | `235271660b81715ab9995df98ea7cf1605e44c51` |
| Version / code | `2026.3.8` / `14` |
| AAB SHA256 | `e06ad03fba8ad91b2b2accd33ec33c44bc4b88a5da58db6b1d40521cb8af0c62` |
| Mapping SHA256 | `8a8f85a6f66a0bde5b26976f7fa048d08863b5438620fc75b866acb8167c395d` |

These are recorded artifact hashes, **not fresh binary hashes computed by the supervisor**. The audit did not read or rehash binaries. Android’s newer HEAD `2ebb989f` (20:34 +04:00) is test-only work across eight files plus documentation; it does not change the frozen artifact’s source identity.

## Gate matrix

| Gate | Evidence now available | Remaining qualification |
| --- | --- | --- |
| Q1 static/test coverage | Owner follow-up reports zero swallowed cases and zero behavioral tests without assertions; two informational items remain. Owner reports 600 tests PASS plus lint. | Owner-reported later progress, not supervisor test execution or exact frozen-runtime acceptance. Frozen receipt’s Q1 pending entry is stale relative to that document. |
| J1 debug journeys | Owner reports 76 debug tests PASS. | New test APK is not minified candidate acceptance. Frozen receipt’s J1 pending entry needs reconciliation, not automatic release approval. |
| AAB ELF metadata | Supervisor read `/tmp/release-23527166-aab-elf-alignment.json`: its AAB hash matches the receipt and its embedded mapping hash matches; all load segments across 12 libraries report 16 KB alignment. | Eight libraries report RELRO false. Those signals need explicit disposition; static alignment is not runtime crash-freedom evidence. No binary was independently inspected. |
| Generated APK alignment | Owner reports frozen AAB generated `candidate.apks` containing 522 APKs, SHA256 `80c29015b9a61b79085ce76902d7da7fea42c76afc010497f835923abd55ae0a`. Supervisor read zipalign JSON with 12 entries, each exit 0 and empty diagnostics. | Zipalign JSON contains **no artifact hash**. Its link to that generated candidate is owner-reported, not a standalone cryptographic binding. Do not extrapolate 12 entries to independent verification of all 522 APKs. |
| K1 16 KB runtime | Owner reports an isolated ARM64 `ps16k` image/AVD prepared but unbooted. Current debug runtime used 4096-byte pages. | Actual 16 KB runtime and exact minified startup/auth verification remain unverified. Prepared infrastructure and 4 KB debug results do not satisfy this gate. |
| Cross-platform / publication | Frozen receipt lists the iOS matrix and factual Play publication review as pending. | Those gates, exact tested-artifact identity and publication permissions remain unresolved. No store authorization follows from this audit. |

The original receipt also lists exact minified-APK alignment as pending. Later alignment metadata is relevant evidence but requires identity reconciliation and owner acknowledgement; it must not silently overwrite the frozen receipt or convert the candidate to accepted.

## Disposition and recommendation

The owner is active. Do not duplicate builds, boot an emulator or infer new runtime approval. Recommend a local metadata reconciliation with owner acknowledgement: distinguish later Q1/J1 results from the original pending list, bind alignment evidence to the exact generated artifact, record disposition of the eight RELRO signals, and retain explicit 16 KB/minified-runtime, iOS-matrix and publication gates.

This audit does not rewrite the frozen receipt or mark the release accepted. It reads metadata and filtered owner documentation only: no supervisor raw-log reading, test execution, binary reading, secret reading or upload occurred. **`UNACCEPTED_CANDIDATE_DO_NOT_UPLOAD` remains the recorded disposition.**
