# Android frozen-candidate reconciliation sidecar

Date: 2026-09-15. **Metadata sidecar only — not a replacement receipt.** Based exclusively on the [retained acceptance audit](2026-09-15-frozen-android-acceptance-audit.md), whose owner-document reference was HEAD `2ebb989f`. No new owner read, current-status verification, test, probe or artifact modification was performed for this sidecar.

Recorded disposition remains **`UNACCEPTED_CANDIDATE_DO_NOT_UPLOAD`**. The original frozen receipt is unchanged.

## Identity retained from the audit

| Field | Recorded identity |
| --- | --- |
| Version / code | `2026.3.8` / `14` |
| Frozen artifact source | `235271660b81715ab9995df98ea7cf1605e44c51` |
| AAB SHA256 | `e06ad03fba8ad91b2b2accd33ec33c44bc4b88a5da58db6b1d40521cb8af0c62` |
| Mapping SHA256 | `8a8f85a6f66a0bde5b26976f7fa048d08863b5438620fc75b866acb8167c395d` |
| Owner-reported generated `candidate.apks` SHA256 | `80c29015b9a61b79085ce76902d7da7fea42c76afc010497f835923abd55ae0a` |

These are retained recorded hashes, not fresh binary rehashes. Later test/document HEAD `2ebb989f` is not the frozen artifact’s source commit.

## Reconciliation without acceptance promotion

| Original / outstanding gate | Later evidence in retained audit | Sidecar interpretation |
| --- | --- | --- |
| Q1 pending in frozen receipt | Owner reports zero swallowed cases, zero behavioral tests without assertions, two remaining informational items; 600 tests PASS plus lint. | Later owner-reported progress explains why the receipt’s pending entry is stale relative to documentation. It does not establish exact frozen-runtime acceptance or independently reproduce tests. |
| J1 pending in frozen receipt | Owner reports 76 debug tests PASS. | Debug/new test APK coverage is not minified candidate startup/auth acceptance. Do not mechanically replace pending with accepted. |
| Exact generated APK alignment | Owner reports 522 generated APKs. Retained zipalign JSON has 12 entries, each exit 0 with empty diagnostics. | JSON has no artifact hash; its association with `candidate.apks` depends on owner attribution, not standalone cryptographic binding. Twelve results do not independently verify all 522 APKs. |
| ELF alignment / protection signals | Retained ELF JSON’s AAB and embedded mapping hashes match the receipt; all loads across 12 libraries report 16 KB alignment, while eight libraries have RELRO false. | Static alignment metadata does not prove runtime behavior. Eight RELRO signals still need explicit disposition. |
| K1 / exact minified runtime | As of the retained audit, owner described the isolated ARM64 `ps16k` image/AVD as prepared and unbooted; the observed debug environment used 4096-byte pages. | This is historical status, not a new claim about the current emulator. Actual 16 KB and exact minified startup/auth acceptance remain unverified by retained evidence. |
| iOS matrix / factual Play publication review | Still pending in retained receipt/audit. | Cross-platform matrix, exact tested-artifact identity and publication permissions are not satisfied by this sidecar. |

## Handoff boundary

Use this sidecar for owner acknowledgement and targeted evidence reconciliation, not to rewrite the frozen receipt, change its disposition, start duplicate builds or infer permission to boot, test or upload. A later owner acceptance receipt should explicitly identify the tested artifact, distinguish debug from release evidence, resolve remaining signals and retain any outstanding gates.

No current-state claim, release approval or recurrence-prevention claim is made. **`UNACCEPTED_CANDIDATE_DO_NOT_UPLOAD` remains unchanged.**
