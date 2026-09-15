# Apple Keyword Validator Owner-Adoption Plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans` for any subsequently approved implementation. Execution tracking belongs to Bead **`roammate-website-kg71`**, not a parallel checklist.

**Goal:** Define a minimal owner-repository adoption path for the verified offline validator and separately reviewed keyword proposals, without changing metadata, lanes or stores now.

**Architecture:** Put the standalone validator beside existing owner `scripts/store` tooling; do not import the website's directory layout or Fastlane snippet. Treat tool adoption, four-file content adoption, lane integration and store publication as four independent approval boundaries.

**Tech stack:** Existing Python standard-library validator and tests; existing owner Fastlane is inspected only, not executed or modified.

**Status:** Planning only under the user's A+B proposal/adoption-plan approval. No owner file copy, keyword replacement, Fastlane execution, authentication or store mutation is authorized by this plan.

## Verified starting point and scope

Root's read-only owner snapshot is `/Users/doreilly/Work/roammate-app-ios` at `b599a339d5fceba04c7bd57908955fe9a99c9743`, with clean scoped paths. It contains `scripts/store/claims.json`, `scripts/store/export_metadata.py` and `scripts/store/verify_store_metadata.py`, but no `tools/store` directory or keyword-byte guard.

Root inspected `Fastfile:368–398`: `verify_metadata` calls `../scripts/store/verify_store_metadata.py`. The `push_ios_metadata` lane calls `setup_api_key`, then `verify_metadata`, then `deliver` with `force: true` and `run_precheck_before_submit: false`. Therefore invoking that lane is **not an offline validation step**. Do not run it, copy the website's Fastfile snippet, change these settings or silently wire in a new guard.

The proposed tool source is website commit **`edd0d4a`**, specifically:

- `tools/store/verify_apple_keywords.py`
- `tools/store/test_verify_apple_keywords.py`

Resolve and record the full immutable revision and file SHA-256 values before any future copy; do not substitute a newer working-tree file without review. The website's broader 47-test result includes its existing suite and must not be asserted for the owner repository.

## Approach comparison

Judgment scores weight progress 40%, safety 40%, effort/cost 20%; dimensions out of ten are prioritization estimates.

| ID | Approach | Progress / safety / effort-cost | Score | Recommendation |
| --- | --- | --- | ---: | --- |
| A | Separately approve standalone copy into existing `scripts/store` | 9 / 10 / 9 | **9.4** | First: useful offline validation with no lane/store side effects |
| B | Wire directly into Fastlane now | 8 / 5 / 5 | 6.2 | Defer: needs separate design, lane-order and side-effect review |
| C | Defer all owner adoption | 2 / 10 / 10 | 6.8 | Safe but leaves owner tooling gap |

Recommend **A first**; later content adoption and publication remain separate decisions, not consequences of choosing A.

## Phase 1 — Standalone local tool adoption, future approval required

1. Obtain explicit approval to add only `scripts/store/verify_apple_keywords.py` and `scripts/store/test_verify_apple_keywords.py` to the owner repository. Revalidate owner HEAD, scoped changes, existing files and concurrent owner work; do not overwrite an independently added guard.
2. Compare the pinned website sources and owner layout, then copy those two files into the existing directory. Preserve existing claims/export/prose tools and all Fastlane files unchanged. If test imports assume a different directory, propose the smallest reviewed adjustment rather than creating a second owner tool hierarchy.
3. Inventory existing owner tests before selecting commands. Run the **29 keyword tests** under verified deny-network controls and run the applicable existing owner suite separately. Record actual counts/results; do not claim the website's 47-test total transfers automatically.
4. Run the standalone guard against all 12 **explicit** owner keyword file paths with before/after hashes. At the current source snapshot, expect exit **1** for the four known over-byte fields, not zero. If results differ, investigate drift rather than edit files to match the expectation. Retain only paths, byte counts and limit, no keyword contents in logs.
5. Independently review the two-file diff, test evidence, exact pinned-source identity and unchanged owner metadata/lanes. Owner-approved commit/landing is separate from this planning task; no store operations occur in this phase.

## Phase 2 — Four exact proposal files, separate content approval

Candidate files live in the website proposal directory:

`tools/store/proposals/2026-09-15-keyword-shortening/{ar-SA,ja,ko,zh-Hans}/keywords.txt`

1. Finish read-only proposal byte validation and document exact draft/source hashes and proposed counts in the proposal evidence before asking for adoption. Proposal existence or a byte-valid result is not linguistic approval.
2. Review each full draft for native-language correctness, meaning, relevance and preservation of the intended positioning. Native-language review must be explicit; do not infer it from a machine-generated draft or reduced byte count. No Unicode normalization, hidden whitespace rewrite or unrelated locale changes.
3. Obtain approval for the **four exact draft contents**, not a blanket permission to optimize keywords. Immediately before adoption, compare each owner source hash to the proposal's recorded original source hash and each draft hash to the approved draft hash. Any drift stops that file's adoption for review.
4. Only under that future approval, copy the four approved files to matching `fastlane/metadata/<locale>/keywords.txt` destinations. Preserve all eight other keyword files, descriptions, release notes, screenshots and app/store configuration.
5. Run the guard against all 12 explicit files; all passing is the **expected future outcome**, not a result claimed now. Verify exact four-file diff and unchanged hashes for other metadata. A successful local content adoption still does not upload or submit anything.

## Phase 3 — Optional lane integration, separate design and approval

If later requested, design where the byte guard belongs relative to existing prose checks, credential setup and `deliver`, including fail-closed exit propagation and a genuinely offline verification path. Review tests that prove no authentication/upload side effects from local checks. Do not execute or alter the existing lane while investigating. Integration into Fastlane or the claims guard is not included in Phases 1–2.

## Phase 4 — Store target and publication, separately authorized

Revalidate App Store Connect target **2026.3.8** through authorized read-only access, obtaining current editability/resource identity and current metadata. The earlier no-editable-version observation is historical, not proof of today's state. Check owner release/asset acceptance and preserve source-to-target mapping.

Only then seek explicit approval for a narrowly specified upload and its exact metadata scope. Upload, submission/review and release are distinct operations; none is implied by target identity, a successful validator, local adoption or this plan. Do not run `push_ios_metadata` as a shortcut to discover access.

## Acceptance boundary

This plan is complete when root has reviewed the exact source/destination mapping, approval gates and proposal evidence. It does not claim owner tooling installed, keywords corrected, all 12 fields passing, editable target verified or metadata published. Broader store/claim Beads retain their original requirements.
