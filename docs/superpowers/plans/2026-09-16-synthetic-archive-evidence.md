# Synthetic Archive-Evidence Implementation Plan

> **For agentic workers:** Use the applicable subagent-driven-development or executing-plans skill after separate implementation approval, with independent specification and quality reviews. Bead `gp60` tracks this planning work; use Beads, not Markdown task checkboxes, for execution status.

**Goal:** Implement the approved pure offline Ruby validator of two synthetic JSON strings, preserving all non-production boundaries.

**Approval chronology:** this plan was originally planning-only; the user later approved offline implementation. Following the blocked system-parser checkpoint, the user explicitly approved the [parser revision](2026-09-16-synthetic-archive-parser-revision.md) and original offline implementation resumption. This amendment records authorization, not test success.

**Architecture:** A standalone website module performs bounded duplicate-aware parsing, exact shape validation, expected-fixture consistency and observation comparisons. An independent manual test harness supplies separately authored expected/observed fixtures and literal rejection-code oracles; no owner code or real evidence is imported.

**Tech stack:** Existing Ruby and its installed JSON standard library; custom assertion runner, no Minitest, gems, installation or downloads. Future execution retains the existing verified deny-all-network sandbox.

## Authority and file map

Source: [approved design](../specs/2026-09-16-synthetic-archive-evidence-design.md). **User approval now covers the reviewed parser revision and original offline implementation scope only. No command was executed while authoring this amendment; actual execution and results must be recorded separately.** No native/provider/archive/credential reads, owner changes, Fastlane loading or production wiring.

Read-only path inspection found no existing `tools/release/synthetic_archive_evidence` directory. Proposed files, all in this website repository:

| File | Responsibility |
| --- | --- |
| `tools/release/synthetic_archive_evidence/validator.rb` | Public `SyntheticArchiveEvidence.validate(expected_json, observed_json)` and pure private parser/schema/semantic helpers |
| `tools/release/synthetic_archive_evidence/fixtures.rb` | Separately authored synthetic expected and observed JSON literals, independent literal result/code expectations, mutation inputs; test-only |
| `tools/release/synthetic_archive_evidence/test_validator.rb` | Manual assertions, selected case groups, purity sentinels and sanitized test summary; no default host/network activity |
| `tools/release/synthetic_archive_evidence/README.md` | Exact future verified invocation, limitations, schema provenance and non-production boundary |

Keep this small unit in these files unless review demonstrates a needed split. Do not require owner `release_candidate.rb`, `release_contract.rb`, Fastfile, existing gate helpers or application sources. Do not add a public validator CLI or integration entry point. The manual **test runner** is not a candidate adapter.

## 1. Establish containment before any future Ruby run

Before resumed execution, verify the newly approved fixed interpreter **`/opt/homebrew/Cellar/ruby/4.0.7/bin/ruby --disable-gems`**, JSON **2.18.0**, executable SHA-256 **`0abc5dafa91bf31774888e70580d9b7d2739006beecf37795d3a2c3d383b974f`**, and loaded JSON components within its Cellar `4.0.7/lib/ruby/4.0.0` tree. Prior tiny compatibility probes do **not** establish current startup success or full conformance. Do not select another interpreter if identity, containment or startup checks fail. System Ruby 2.6.10 / JSON 2.1.0 is the historical blocked runtime, not an authorized fallback.

The existing [offline comparison containment receipt](../verification/2026-09-15-offline-comparison-contract.md) records the exact inline network-only policy **`(version 1) (allow default) (deny network*)`** and current-PID `sandbox_check` results: sandboxed parent/child return 1 versus unsandboxed control 0, without traffic. Before a future Ruby test run, repeat only that reviewed current-PID preflight using its existing reviewed helper. If the helper is unavailable or controls cannot be verified, stop; do not improvise traffic probes or a new helper under this plan. Historical receipts alone are not current proof.

This policy provides **no filesystem or credential-store isolation**. Excluding credential APIs, owner inputs, filesystem access and process execution from the validator relies on narrow scope, audited local code and post-load sentinels—not a false claim that the operating system denies those accesses. No credentials, owner baselines or real archives may be read. If a separately imposed stricter containment requirement applies, retain it; this example does not authorize weakening it.

Use fresh owned HOME/TMP and an `env -i` allowlist containing only those paths and `PATH=/usr/bin:/bin:/usr/sbin:/sbin`; no `RUBYOPT`, `RUBYLIB`, `GEM*` or `BUNDLE*`. Use fixed argument-vector launch, closed unrelated descriptors and bounded output. Establish inherited deny-all-network **before starting Ruby**, including test/syntax invocations. Record approved executable/local-fixture identities without credential or owner reads. Sandbox-denied access or Ruby startup abort blocks verification; no uncontained fallback, modified policy or installation.

The future launch pattern uses run-specific absolute scratch/test paths; planning executes none of it. Launch via an argument-vector supervisor with `close_fds`, time/output bounds and owned-child cleanup:

```text
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)'
  /usr/bin/env -i HOME=<owned-home> TMPDIR=<owned-tmp> PATH=/usr/bin:/bin:/usr/sbin:/sbin
  /opt/homebrew/Cellar/ruby/4.0.7/bin/ruby --disable-gems <absolute-test_validator.rb> --group <fixed-group>
```

Quotes above display one literal policy argument; no shell expansion or arbitrary caller flags belong in the supervisor. Missing prerequisites or unsupported runtime behavior block execution. This plan authorizes neither new containment infrastructure nor owner reads.

## 2. Red/green scaffold and independent fixtures

1. Write the manual runner and two **separately authored** minimal consistent JSON literals. Expected data is never copied from observations or generated by validator code. Use synthetic IDs, synthetic hash labels and explicit app/widget/dSYM architecture pairs from the approved schema; no real artifact identifiers. Hand-write the expected result envelope and code ordering independently of implementation constants.
2. Add an assertion that the not-yet-defined public module returns exactly `{schema: synthetic-archive-result/v1, mode: synthetic, outcome: synthetic_consistent, reasons: []}` for the complete fixture, using string JSON-style keys. Run the contained command above with `--group happy`; require a genuine missing-module/implementation red result, not an unrelated containment or runner failure. A containment failure ends this step without claiming TDD red.
3. Implement only the minimal public shape and then proper validation sufficient for the first case. Rerun `--group happy`; expect the exact result assertion to pass. Never implement a truthy placeholder as a production inspect gate.
4. Before every subsequent behavior, add its failing literal-oracle assertion, run its fixed group under the same containment, implement the minimum behavior, and rerun. Keep arbitrary assertion counts out of the plan; final counts must come from actual execution.

The runner accepts only fixed documented groups (`happy`, `parse`, `shape`, `expected`, `binding`, `inventory`, `symbols`, `policy`, `determinism`, `purity`, `mutations`, `all`); reject other arguments before test work. Print only fixed case IDs and bounded aggregate assertion/pass/fail counts. On failure do not dump `inspect`, input strings, raw exceptions or backtraces. A failed assertion gives nonzero exit; zero cases or unknown groups must not succeed.

## 3. Duplicate-safe parser and limit checks

1. Implement parser tests **before** schema logic, including raw JSON strings with duplicate keys at top level and nested objects. Do not construct those malformed inputs as Ruby hashes, which would already collapse duplicates. Include escaped-equivalent duplicate names using this complete **raw JSON** with exactly one backslash before `u`: `{"mode":"synthetic","m\u006fde":"synthetic"}`. Both keys decode to `mode` and must reject as `INPUT_SYNTAX`. A Ruby double-quoted source literal needs `\\` to produce that one raw backslash; source escaping is not an instruction to put two backslashes in the JSON. Also cover trailing tokens, malformed escaping, BOM, invalid UTF-8, NaN/Infinity syntax, and nested duplicate versus later syntax faults.
2. Use the pinned JSON 2.18.0 parser with explicit `allow_duplicate_key: false`, `create_additions: false`, `allow_nan: false`, and `max_nesting: 12`. The modern parser bypasses the tested `object_class` Hash `[]=` hook; remove dependence on that strategy. Do not patch global Hash/JSON behavior, enable additions, permit duplicates, or perform a post-parse duplicate check after collapse.
3. Under fresh verified containment, run fixed synthetic parser controls for top-level/nested/escaped-equivalent duplicates, duplicate-before-malformed input, invalid backslash-q, raw control, trailing data, NaN and depth 12/13. Duplicate and other `JSON::ParserError` failures map to `INPUT_SYNTAX`; catch typed `JSON::NestingError` first and map to `INPUT_LIMIT`. No distinct duplicate diagnostic remains. Do not use message regex, expose exceptions, add a lexer or fall back to another parser/runtime. If strict rejection or runtime identity differs from the approved controls, stop with evidence rather than weakening them.
4. Accept only ordinary String inputs; do not coerce arbitrary objects, call `to_str`/`to_json`, or dispatch input-defined methods. Preserve bytes on an owned plain-string copy when checking UTF-8, with no normalization. Return `FIELD_SHAPE` for non-string inputs, `INPUT_ENCODING` for invalid UTF-8/BOM, then `INPUT_LIMIT` for more than 65,536 bytes. Pin behavior for subclass/non-UTF-8 Ruby encoding wrappers in tests without invoking their custom methods; reject ambiguous nonordinary input rather than broadening the JSON-string contract.
5. Parse with duplicate/depth defense. Map the first encountered parser failure to `INPUT_SYNTAX` or `INPUT_LIMIT`; never include the parser exception message. After parse, traverse with bounded iteration: root container depth 1, at most 12 container levels, 2,048 values (root/containers/scalars count; object keys count toward string-size checks, not value nodes), 128 UTF-8 bytes per string including keys, 32 object members and eight array entries. Limits precede schema validation. This node-count convention must be reviewed against the design before code acceptance; do not let test helper and implementation silently use different definitions.
6. Run contained `--group parse`; require direct assertions for exact boundary and one-over rejection at each limit. Because several limit boundaries are not achievable in a valid schema, test them with bounded parser/limit fixtures and assert that at-limit input proceeds to the expected later shape/schema rejection rather than falsely requiring overall success. For raw-byte boundary, legal trailing whitespace can pad an otherwise valid document without changing its value.

No credential/file hash is computed by the validator: synthetic digest labels are compared as strings only.

## 4. Shapes, expected consistency and semantic inventories

1. Add table-driven but independently expected `shape` cases for every allowed object field and scalar type, unknown/missing fields at every nesting, forbidden null/boolean/number values, wrong enums and wrong synthetic prefixes. Schema/mode failure precedes field-shape failure after safety limits. Encode the approved exact key sets, category literals and anchored ASCII patterns without defaults, trimming or case folding.
2. Add `expected` cases proving the complete expected document is validated **before** observations: invalid expected shape returns its code even if observations are also invalid. Valid-shaped expected wrong cardinality, duplicate role/ID/architecture/UUID, or binding conflict gives `EXPECTED_CONFLICT`. Invalid required expected finding literal remains `FIELD_SHAPE` as specified.
3. Implement two-phase inventory handling: inspect counts and collect duplicate keys before constructing any keyed lookup. For ambiguous keys, retain an invalid-key set; do not overwrite or select a duplicate. Compare only unique pairs. Missing/duplicate counterpart emits its inventory code and suppresses dependent comparisons for that counterpart; independent comparisons still run.
4. Expected artifacts are exactly archive/ipa/dsym_set, bundles exactly app/widget, architectures 1–2 with unique names and globally unique binary UUIDs. Observed arrays allow 0–8 at the shape layer; missing/extra/duplicate semantic inventory uses `ARTIFACT_MISMATCH`, `BUNDLE_INVENTORY`, `ARCHITECTURE_MISMATCH`, `DSYM_INVENTORY` or `DSYM_MISMATCH`, never blanket `FIELD_SHAPE`. Nine entries yield `INPUT_LIMIT` before semantics.
5. Run contained `--group shape`, `--group expected`, then `--group inventory`; each group must first have recorded meaningful red cases and then exact-code green assertions. Include missing bundle plus an independent policy mismatch, and duplicate dSYM plus an independent binary mismatch, proving suppression does not erase unrelated failures.

## 5. Bindings, symbol relationships and explicit policy evidence

1. In `binding`, mutate independently every source/run/toolchain/version/build/configuration/environment field, policy ID/revision/digest, artifact digest, bundle identity and binary digest. Assert the exact fixed reason set/order, not merely non-success.
2. In `symbols`, mutate architecture names/UUIDs, duplicate UUIDs within/across bundles, swap correct UUIDs onto the wrong bundle, omit/add a pair and change a dSYM digest. Require dSYM inventory to match bundle IDs and each complete symbol-pair set to match both expected and uniquely corresponding observed binary pairs. Missing/ambiguous binary counterparts must not be dereferenced or spuriously verified.
3. In `policy`, independently mutate each category profile/digest/finding. Match explicit synthetic policy labels only—do not add real entitlement/signing/privacy rules. Unknown findings reject with the required generic and specific codes; forbidden-present adds its explicit reason. No scanner or real credential input exists.
4. Add a coherent fabricated fixture pair that returns only `synthetic_consistent`, documenting that mutually consistent fiction is accepted as fiction, not authenticated evidence. Do not derive a supposedly trusted fixture from untrusted observations in normal tests.
5. Run contained `--group binding`, `--group symbols` and `--group policy` after each red/green slice.

## 6. Deterministic diagnostics, purity and misuse boundary

1. Store the twelve semantic reason codes in approved order; collect uniqueness and output them in that order, never input traversal order. Test permutations of every order-insensitive inventory and combined independent errors. Identical inputs return equal result objects with no timestamps, randomness or environmental defaults.
2. Add synthetic secret markers in malformed keys/strings, parser exceptions and invalid shapes. Assert that result serialization and captured runner stdout/stderr contain only allowed fields/codes, not markers or input-derived excerpts. Tests compare marker absence without printing the markers on failure.
3. The test supervisor loads only the pinned local module, fixed fixture/test files and allowlisted installed JSON/runtime dependencies under the outer sandbox. Audit source/imports for side effects and ensure `$LOADED_FEATURES` contains no Fastlane/owner modules. Install process/filesystem/network/environment/clock sentinels **after those necessary loads**, before invoking the validator. Exercise each sentinel with a fake/no-side-effect call to prove it fails visibly, then ensure every validator case completes without touching it. Loading occurs under the outer sandbox; post-load sentinels alone cannot prove import purity.
4. Sentinels cover process creation/shell/backticks, file/directory open/read/write/glob, network APIs, environment lookup and clock reads. Restore patches in `ensure`; runner bookkeeping may access preloaded constants/output handles outside the validator call boundary. Never create an actual network positive control or personal file read to test a spy. Spies are coverage evidence, **not a substitute for deny-all-network containment** or proof against arbitrary native code.
5. A separately written fake production prerequisite reader rejects the synthetic schema/mode/result envelope; no actual owner prerequisite reader is imported. Assert the public function never returns `true`, `passed`, `candidate_ready`, real paths, signatures or production evidence fields. Explicitly document Ruby Hash truthiness: no API shape can stop a caller from incorrectly coercing it to boolean; review and absence of wiring enforce that integration boundary, not a claimed language guarantee.
6. Run contained `--group determinism` and `--group purity`; retain only sanitized summaries. Any forbidden access attempt is failure even if the outer sandbox denied it.

## 7. Mutation sensitivity and complete acceptance review

Run targeted negative fixtures that would become incorrectly consistent if an inventory, identity, UUID or policy comparison were removed. During review, make each narrow test-only mutant in a disposable owned copy, prove its targeted assertion fails, then discard it; never leave a bypass in the production module. No process launch belongs inside the validator or its fixtures. Any separate mutation-runner execution remains under the same supervisor boundary.

The final contained `--group all` run must cover every design family: complete fixture, order permutations, parser/type bounds, expected conflicts, binding mutations, inventory/identity mutations, symbol pairing, policy mutations, forged consistency, diagnostic secrecy, purity/misuse and gate sensitivity. Report actual counts and outcomes, including skipped/unexecuted work; do not infer a pass from unavailable containment or Ruby startup failure.

Independent review must assess design compliance before quality: duplicate detection on the installed JSON runtime, stage ordering, all field/cap boundaries, suppression of ambiguous comparisons, deterministic code sets, no input echoes, no file/process/provider dependencies and no synthetic result integrated into production. Fix important findings and rerun affected groups plus `all`. Repository whitespace review is read-only; no CI, deployment or native build is introduced.

## 8. Evidence and handoff

Record exact website commit/source hashes, approved containment identity, pinned Ruby/JSON versions, meaningful red/green outcomes, actual assertion totals and reviews in a concise sanitized verification report. Distinguish pure consistency verification from extraction/authenticity and include any runtime limitation. Parent performs owned-file commit/push and Bead updates after the authorized implementation is verified; this planning task authorizes no implementation commit; the parent may commit the reviewed plan document.

Owner `p2z9` acceptance remains required before any integration. No owner contact or acceptance is implied; U3/`vbet` transport and reconcile changes remain untouched. Real collector provenance, authoritative policy, native artifact validation, production schema/adapter design and execution approvals remain future work. Neither planning nor a later synthetic pass establishes candidate or release readiness.
