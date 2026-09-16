# Synthetic archive-evidence owner handoff — 2026-09-16

## Status and authority

**Handoff prepared only: no owner contact or acceptance is claimed.** The user approved this document without wiring, followed by a separate blocked-prerequisite refresh. No owner writes, file copies, imports, tests or integration were performed for this handoff. Owner `p2z9` acceptance and separate user approval of exact owner writes remain prerequisites to standalone adoption.

Website handoff baseline: **`c336061`**. The local [README](../../../tools/release/synthetic_archive_evidence/README.md), [contract](../specs/2026-09-16-synthetic-archive-evidence-design.md) and [verification report](../verification/2026-09-16-synthetic-archive-evidence.md) define the verified scope. The verification report's historical landing-pending wording is a snapshot, not a claim that its old checkpoint is the current handoff source.

## Proposed standalone package

Pin these **four files to website commit `c336061`** rather than copying whichever working-tree version happens to be current:

1. `tools/release/synthetic_archive_evidence/validator.rb`
2. `tools/release/synthetic_archive_evidence/fixtures.rb`
3. `tools/release/synthetic_archive_evidence/test_validator.rb`
4. `tools/release/synthetic_archive_evidence/README.md`

The verifier API is `SyntheticArchiveEvidence.validate(expected_json, observed_json)`: two ordinary in-memory synthetic JSON strings, with separately authored expected fixtures. It returns only a dedicated synthetic result envelope and fixed reasons. Controlling both inputs can produce mutually consistent fiction; synthetic digest/UUID labels authenticate no actual bytes.

The reported validator SHA-256 at verified source is `e9f9b369a268d79f499f2c20c6fd393cbba60c29686e3a825514b0866595eaef`. Before any future approved adoption, derive and verify all four file identities from the pinned commit; no copying or new owner-side hashes were performed in preparing this document. A mismatch stops adoption. The destination and any documentation-link treatment require explicit review; do not silently rewrite the package or copy unrelated files.

## Existing verification, not new execution

The implementation agent, supervising agent and independent quality reviewer each reported the final **1,548-case** suite passing; the latter two ran through the approved bounded network-denied supervisor. Specification review passed; quality review passed without blocking findings. Four disposable mutants independently broke targeted inventory, identity, UUID and policy tests, and the original validator identity was preserved. These receipts establish the synthetic contract only; tests were **not rerun for this handoff**.

Pinned runtime is **`/opt/homebrew/Cellar/ruby/4.0.7/bin/ruby --disable-gems`**, JSON **2.18.0**, executable SHA-256:

`0abc5dafa91bf31774888e70580d9b7d2739006beecf37795d3a2c3d383b974f`

The verified JSON parser bundle SHA-256 is `08896f89bf181995d87dfba2084031899bdeda8f5aeb6cce194a111f82c62c12`; loaded JSON components were within that Cellar runtime tree, without RubyGems or Fastlane. Historical system Ruby 2.6.10 / JSON 2.1.0 accepted invalid escapes and is not a compatible fallback.

## Future adoption acceptance — requires separate approvals

If the owner explicitly accepts standalone ownership and the user separately approves exact owner writes, adoption must satisfy all of the following without production integration:

- Review the exact destination and four pinned files, preserve owner dirt, and verify source identities against `c336061`. Do not overwrite an existing owner component or alter its release workflow.
- Establish the same already-installed pinned runtime/JSON identities; absence or mismatch blocks. No download, installation, automatic interpreter selection or unsupported fallback.
- Before execution, freshly verify the reviewed no-traffic parent/child policy controls using the existing reviewed helper and check loaded-library provenance. Use fresh owned HOME/TMP, `env -i` with only approved runtime variables, closed stdin/descriptors, fixed arguments, an owned process group, bounded output and at most 30 seconds; propagate child status and clean only owned resources. Historical control receipts are not current proof.
- Retain `(version 1) (allow default) (deny network*)`. It denies network **only**; filesystem and credential-store isolation are not provided. Scope, audited imports and restored post-load sentinels exclude those operations. Any stricter independently required boundary remains in force; failed startup or controls do not authorize weakening it.
- Run the complete manual synthetic suite under those verified controls only after execution is in scope. For unchanged pinned files, require all 1,548 cases to pass with no skip or weakened oracle; classify startup/control failure separately from test failure. Preserve no-echo diagnostics and no Fastlane/core/provider/owner-artifact imports.
- Record exact source/destination identities, containment evidence, actual results and review disposition. A successful standalone adoption receipt must explicitly state **no candidate-lane wiring, no production gate acceptance**.

No command is supplied here that bypasses these prerequisites. This proposal does not grant permission to inspect an actual archive, signing material, dSYM, credential or provider response merely to “try” the validator.

## Permanent non-production boundary

Do not use the result as `adapter.inspect`, an upload prerequisite, production archive evidence or a real signing/privacy/credential verdict. `synthetic_consistent` is not `candidate_ready` or `passed`. Ruby Hashes are truthy: absence of integration and review—not result shape—prevent accidental boolean acceptance.

Production adoption would require a separate collector/extractor and trust design with authoritative policy, actual artifact/source/configuration provenance, race-safe collection, semantic archive/signing/symbol validation, protected diagnostics, a production schema that rejects synthetic results and separately authorized execution. This package supplies none of those authorities.

## Owner coordination and avoiding duplicate work

The [dated candidate gap audit](../specs/2026-09-16-candidate-adapter-gap-audit.md) describes owner release `db5694e`. The owner has since advanced to **`42e0b83`**, titled “fix(release): keep candidate reconciliation read-only.” The supervising agent's targeted read confirms resume now calls `process!(deliver_symbols: action == 'symbols')`, returning at `processed_valid` when delivery is false; the explicit symbols action admits `processed_valid` and `symbols_pending`. The owner U6 receipt reports **61 tests / 497 assertions green plus reviews**, not rerun by the supervising agent in this handoff. Concrete `cleanup_verified` and `processing` adapters must remain observational; the core correction alone does not verify those future adapters. Do **not** repeat the old audit's reconciliation-side-effect finding as an unqualified current-state claim or duplicate the committed fix.

The owner working tree remains **dirty**, including candidate/contract/tests and untracked upload-process/transport work and a U10 receipt. The U10 draft reports **15 tests / 134 assertions** for a supervisor and an **empty production trusted registry**. These are owner-reported draft findings, not an accepted, committed, integrated production transport. This handoff neither freezes that working tree nor adopts its uncommitted changes.

U3/`vbet` transport and reconciliation remain owner work. This handoff neither duplicates that work nor accepts it. The proposed next owner interaction is bounded review of standalone utility ownership under `p2z9`; it is not a request to wire the synthetic checker into production. No owner issue or acceptance is created by this document.
