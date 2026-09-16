# Synthetic archive-evidence consistency contract

Date: 2026-09-16. **Design only.** Bead `imd3`; owner coordination boundary `p2z9`. No implementation, native build, real archive inspection, credential access, provider operation, upload or candidate wiring is authorized. Written approval of this design is required before planning/implementation. Owner acceptance has not been obtained.

## Purpose and alternatives

Define a bounded pure in-memory consistency check for normalized **synthetic** evidence. The [candidate gap audit](2026-09-16-candidate-adapter-gap-audit.md), owner guarded design/plan and U3 design at owner release `db5694e041099aaeee32d056f6f3820e06de1fe6` establish the gap: fake artifact hashes do not establish genuine archive, signing or dSYM acceptance.

| Approach | Assessment |
| --- | --- |
| Simple supplied pass/fail booleans | Reject: cannot express complete inventory, conflicting identity or architecture/UUID relationships; easy to mistake assertions for verification |
| Normalized synthetic evidence with separate expected fixture | **Recommended:** precise offline consistency/rejection tests with no collector or native dependency |
| Native extraction and real signing/archive validation | Needed for future production evidence, but outside current scope and authority |

The eventual implementation would use Ruby standard library only. Its public function accepts **two in-memory JSON strings**, an expected fixture and observed evidence, and returns a bounded JSON-compatible result object. No CLI, filesystem/process/network/provider access, Fastlane loading, path dereference, archive extraction, signing tools, environment discovery or clock access. Merely requiring the module must have no such side effects.

Do not require `release_candidate.rb` or `release_contract.rb`: their broader dependency surfaces are unnecessary here. Existing core duplicate-key defenses may inform review, but standalone duplicate-key rejection must work before parse collapse without importing those modules. This contract is not an adapter implementation and must never return `true`.

## Trust and misuse boundary

The expected fixture is a separately authored, code-reviewed synthetic test input selected by the harness, not copied/generated from the observations. “Trusted” means trusted for that test's expected relationships only—not an authority about a real archive. An attacker who controls both inputs can make mutually consistent fiction; the validator does not authenticate either input or collect evidence.

Every document and result has a dedicated schema and `mode: "synthetic"`. Success is **`synthetic_consistent`**, never `passed`, `candidate_ready`, an upload prerequisite, or a success boolean. The result has no real artifact path, source commit, production timestamp, attestation signature or existing prerequisite-schema fields. It must never be wired to `adapter.inspect`, coerced to boolean gate success, or accepted by existing production prerequisite readers. A schema/mode rejection regression must prove that synthetic documents cannot be interpreted as production evidence; owner integration requires explicit `p2z9` acceptance and a separately reviewed production trust model.

U3/`vbet` upload and reconciliation work is separate and unchanged. In particular, the owner's proposed observation-only `processed_valid` split is not implemented or duplicated here.

## Parsing, types and global bounds

Each input is a UTF-8 JSON string of at most **65,536 bytes**. Reject invalid UTF-8, BOM, trailing non-whitespace, duplicate object keys at any nesting, excessive nesting, nonfinite numeric extensions and non-JSON values. Do not silently overwrite duplicate keys, coerce values, stringify arbitrary objects or call input-defined methods. A later implementation must use a duplicate-aware JSON object construction path and parser nesting limit, not a post-parse duplicate check.

Top-level object depth is 1; allow at most **12 object/array levels**, **2,048 value nodes** per document, **128 UTF-8 bytes per string** including keys, and **32 entries per object**. Every inventory array has a parser/shape safety cap of eight elements; arrays over eight yield `INPUT_LIMIT`. Expected and observed semantic cardinalities below are checked only after element shapes are valid. All names, enums and synthetic identifiers are ASCII; no trimming, case folding, Unicode normalization or inferred defaults. Every listed field is mandatory; every unlisted field is rejected at every level. `null`, booleans and numeric scalars are disallowed: this version needs only objects, arrays and strings. These intentionally restrictive limits describe this synthetic format, not Apple requirements.

Reusable scalar types:

- **Tag:** `synthetic:[a-z0-9][a-z0-9_-]{0,31}`.
- **Digest:** `synthetic-sha256:` followed by exactly 64 lowercase hexadecimal characters. A label for fixture binding, **not a computed hash of a file or a credential**.
- **UUID:** `synthetic-uuid:` followed by a lowercase `8-4-4-4-12` hexadecimal UUID shape. No claim of actual Mach-O identity.
- **Version:** `synthetic-version:` followed by 1–3 decimal components, each 1–6 digits, separated by dots; no claim of Apple version validity.
- **Build:** `synthetic-build:` followed by 1–12 decimal digits; no claim of Apple build-number validity.
- **Architecture:** `synthetic-arm64` or `synthetic-x86_64`. The expected semantic inventory permits at most two distinct entries; this is separate from the eight-element array safety cap. These labels do not infer a real distribution architecture policy.

No raw credential bytes, plist/log payloads, path fields, URLs or arbitrary free-text evidence are admitted. Schema constraints and no-echo diagnostics reduce exposure; they cannot prove a malicious caller did not encode a secret inside a permitted string. Callers must supply synthetic data only, and the implementation must not log inputs.

## Exact expected-fixture schema

Top-level fields: `schema`, `mode`, `binding`, `policy`, `artifacts`, `bundles`.

| Field | Exact shape |
| --- | --- |
| `schema` | Literal `synthetic-archive-expected/v1` |
| `mode` | Literal `synthetic` |
| `binding` | Object: `source`, `run`, `toolchain` (Tag each); `version` (Version); `build` (Build); `configuration` (Digest); `environment` (Tag) |
| `policy` | Object: `id` (Tag), `revision` (Tag), `digest` (Digest). This identifies the explicit reviewed fixture policy, not a policy inferred from an archive |
| `artifacts` | Array of 0–8 objects, each with `kind` and `digest`; kind is one of `archive`, `ipa`, `dsym_set`; Digest values. Expected semantic inventory must contain exactly those three kinds once each |
| `bundles` | Array of 0–8 BundleExpect objects. Expected semantic inventory must contain exactly two, roles `app` and `widget` once each |

**BundleExpect** exact fields:

- `role`: `app` or `widget`; `id`: Tag, unique across bundles.
- `version`: Version; `build`: Build; `configuration`: Digest; `environment`: Tag. Each must equal the corresponding top-level binding, including within the expected fixture itself.
- `binary_digest`: Digest; `dsym_digest`: Digest.
- `architectures`: array of 0–8 **ArchitecturePair** objects, each exactly `{architecture, uuid}` using Architecture/UUID types. Expected semantic inventory requires 1–2 entries with unique architecture names and UUIDs; UUIDs also unique across both bundles.
- `policy_evidence`: object with exactly the following four named category objects. Each has exactly `profile`, `digest`, `finding` fields: profile is a Tag, digest a Digest, and finding is the category's required expected literal below.

| Category | Required expected `finding` |
| --- | --- |
| `distribution_signing` | `synthetic_distribution` |
| `entitlements` | `synthetic_expected` |
| `privacy` | `synthetic_expected` |
| `forbidden_credentials` | `synthetic_absent` |

The expected profile/digest values are explicitly chosen in the fixture and matched exactly; they do not encode guessed real signing, entitlement, credential-scanner or privacy requirements. Profile identity alone does not establish a real policy's completeness. After all element shapes pass, expected fixtures with conflicting top-level/bundle identity, missing/extra/duplicate inventory entries or architecture/UUIDs yield `EXPECTED_CONFLICT`, not a basis to accept observations. Expected finding literals outside their declared type are `FIELD_SHAPE`. Never collapse duplicate inventory keys into a map before checking uniqueness.

## Exact observed-evidence schema

Top-level fields: `schema`, `mode`, `binding`, `policy`, `artifacts`, `bundles`, `dsyms`.

- `schema`: literal `synthetic-archive-observed/v1`; `mode`: literal `synthetic`.
- `binding`, `policy`, `artifacts`: exactly the shapes above, and equal to the independently supplied expected values after comparing keyed artifact inventories (array order irrelevant).
- `bundles`: array of 0–8 **BundleObserved** objects, with exact fields `role`, `id`, `version`, `build`, `configuration`, `environment`, `binary_digest`, `architectures`, `policy_evidence`. Shapes mirror BundleExpect except `dsym_digest` is absent here. Their element shapes must be valid before semantic inventory comparisons. Semantically require exactly the expected two bundles and 1–2 architecture pairs per bundle, with all identities and pairs matching and no extras, duplicates or omissions.
- `dsyms`: array of 0–8 objects, each with `bundle_id` (Tag), `digest` (Digest), and `architectures` (array of 0–8 ArchitecturePair objects; semantically exactly the expected 1–2 pairs). Bundle IDs must form exactly the observed/expected bundle-ID inventory. Each digest must equal that bundle's expected `dsym_digest`; its complete architecture/UUID set must equal both the expected pairs and corresponding observed binary pairs.

Observed `policy_evidence` category/profile/digest shape is identical to expectations. Each finding may be the category's accepted synthetic literal, `synthetic_mismatch`, or `synthetic_unknown`; `forbidden_credentials` additionally admits `synthetic_present`. Only exact accepted category findings and exact expected profile/digest matches can be consistent. Unknown is always rejection, never missing-data tolerance. These supplied findings model check outcomes; the validator itself does not scan credentials, verify signatures, decode entitlements or inspect privacy manifests.

Artifact digests bind all references to one supplied synthetic artifact set. Per-bundle identity and binary/dSYM pairing bind internal relationships. No relationship between these labels and actual bytes is established. An unexpected third extension, dSYM, architecture or artifact is rejected rather than silently ignored.

## Deterministic validation and output

Validate expected syntax/limits/shape/internal consistency first, then observed syntax/limits/shape. On input failure return exactly:

`{schema: "synthetic-archive-result/v1", mode: "synthetic", outcome: "synthetic_rejected", reasons: [CODE]}`.

Input validation follows explicit stages: (1) check input string/UTF-8/BOM (`FIELD_SHAPE` for non-string input, otherwise `INPUT_ENCODING`); (2) check raw byte cap (`INPUT_LIMIT`); (3) parse with duplicate-key and nesting defenses, returning the first encountered parser-classified `INPUT_SYNTAX`, `DUPLICATE_KEY`, or `INPUT_LIMIT` failure; (4) check remaining node/string/object/array safety caps (`INPUT_LIMIT`); (5) check schema/mode (`SCHEMA_MODE`); (6) check required fields, allowlisted keys, container and element scalar types (`FIELD_SHAPE`); (7) for the expected fixture only, check semantic cardinality/uniqueness and internal bindings (`EXPECTED_CONFLICT`). There is no absolute priority among simultaneous parser faults beyond first encountered failure; fixtures must pin that rule. Observed inventory cardinality/uniqueness is semantic, not a stage-6 shape failure. No raw parser exception, offending key or input excerpt is emitted.

Once both shapes are valid, collect unique consistency codes in this fixed order:

`BINDING_MISMATCH`, `POLICY_MISMATCH`, `ARTIFACT_MISMATCH`, `BUNDLE_INVENTORY`, `BUNDLE_IDENTITY`, `BINARY_MISMATCH`, `ARCHITECTURE_MISMATCH`, `DSYM_INVENTORY`, `DSYM_MISMATCH`, `POLICY_EVIDENCE_MISMATCH`, `EVIDENCE_UNKNOWN`, `FORBIDDEN_CREDENTIAL_FINDING`.

Semantic counts, duplicate identities and missing/unexpected entries produce `ARTIFACT_MISMATCH` for artifacts, `BUNDLE_INVENTORY` for bundles, `ARCHITECTURE_MISMATCH` for binary architectures, `DSYM_INVENTORY` for dSYM bundle entries, and `DSYM_MISMATCH` for dSYM architectures. A shape-valid missing/extra array entry is not `FIELD_SHAPE`; arrays over eight are still `INPUT_LIMIT`. Reject duplicate inventory identities before constructing any keyed map; never choose or overwrite one duplicate. If a counterpart is missing or duplicated, emit its inventory code and suppress dependent pair comparisons for that ambiguous/missing counterpart rather than dereferencing or inventing values. Continue all independent valid comparisons and return their applicable codes in fixed order. Mismatched architecture UUIDs count as architecture mismatch for binaries and dSYM mismatch for symbol evidence. Policy profile/digest/nonaccepted findings produce policy-evidence mismatch; unknown and forbidden-present also add their respective specific code. Never echo input strings, IDs, paths, hashes, counts from untrusted input, parser excerpts or exceptions. Return all applicable codes once in fixed order, at most 12.

If no code applies, return exactly the same result envelope with `outcome: "synthetic_consistent"` and `reasons: []`. Do not return an input payload or a production-compatible receipt. Determinism means identical values and reason ordering for equal inputs, including array-order permutations; no wall-clock fields, random IDs or environment-dependent defaults.

## Synthetic acceptance matrix for a later implementation

| Case family | Required evidence |
| --- | --- |
| Complete consistent fixture | Exact synthetic-only success envelope; app/widget and all dSYMs present |
| Order permutations | Same result for artifact, bundle, architecture and dSYM order permutations |
| Parser/type boundaries | Invalid UTF-8/BOM, duplicate nested keys, trailing garbage, depth/node/byte/string bounds, null/boolean/numeric/unknown fields rejected; exact boundary cases accepted |
| Expected-fixture conflicts | Expected-only version/build/config/environment conflicts, duplicate inventory/UUID or invalid required policy finding rejected before observations |
| Binding mutations | Each source/run/toolchain/version/build/config/environment, policy ID/revision/digest and artifact digest mutated independently gives rejection |
| Inventory/identity mutations | Missing/extra/duplicate app/widget/dSYM/architecture, wrong role/ID/version/build/config/environment/binary digest rejected |
| Symbol pairing | Wrong architecture UUID, correct UUID on wrong bundle, duplicate UUID, missing pair, extra symbol architecture or wrong dSYM digest rejected |
| Policy mutations | Each category's profile/digest/finding mismatch, unknown finding and forbidden-present rejected, without guessing a real signing/privacy policy |
| Forged consistency | A coherent fabricated document may be synthetic-consistent only; test explicitly demonstrates that this does not authenticate artifacts |
| Diagnostic secrecy | Synthetic secret markers in rejected data or parser errors never appear in outputs; no raw exception forwarding |
| Purity/misuse | Injected sentinels forbid filesystem/process/network/environment/clock/provider operations; no Fastlane loaded, no adapter call, and synthetic schema rejected by a separate fake production prerequisite boundary |
| Gate sensitivity | Removing an inventory, identity, UUID or policy check makes its targeted regression fail |

Pure fixtures use no real archive, credentials or owner checkout state. A passing matrix would prove consistency logic only, not a production validator or trusted extractor.

## Deferred production prerequisites and handoff

Before any owner integration, obtain `p2z9` owner's explicit acceptance of boundaries and ownership. Coordination is a **pending handoff**, not a claim that the owner was contacted or accepted this design. No owner issue or acceptance is created by this document. Production collection would separately require reviewed, pinned actual archive/IPA/dSYM extractors and toolchains; stable exact artifact/source/configuration binding; race-resistant file handling; real app/extension inventory and policy definitions; authorized signing/provisioning/entitlement/privacy/credential inspection; trustworthy collector provenance and completeness; bounded protected diagnostics; and a production schema/adapter contract that rejects synthetic results.

Those are future design/implementation and execution gates, not tasks authorized here. Existing native, provider, Android, privacy and store-release prerequisites remain. Review this written proposal—especially its deliberately small app/widget inventory, synthetic policy profile model and non-production result boundary—before approving an implementation plan.
