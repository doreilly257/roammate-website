# Synthetic archive parser revision — proposal

Date: 2026-09-16. **Proposal only, pending independent review and explicit user approval.** Bead `anlb`, parent `pxrg`. The user approved tiny installed-parser checks and this proposed plan revision, **not switching the validator runtime or diagnostic contract**. The existing approved spec, implementation plan and WIP code remain unchanged.

## Goal and current boundary

Propose the smallest reviewed change that retains rejection of malformed/duplicate JSON while using an already installed parser that rejects the observed invalid escape. `pxrg` remains blocked at WIP **`55a5b51`**, not merged to main. This document is not a harness pass, a strict-JSON completeness proof, implementation approval or production evidence.

The report author performed no probes. The observations below were freshly supplied by the supervising agent under the existing **network-only** policy `(version 1) (allow default) (deny network*)`, clean environment, closed unrelated descriptors and a 15-second bound. The reviewed nonce helper again returned outside exit **1**, inside exit **0**, checking parent/child denial without traffic. This policy does not isolate filesystem or credential stores.

## Bounded installed-runtime evidence

| Synthetic probe | System Ruby 2.6.10 / JSON 2.1.0 | Installed Ruby 4.0.7 / JSON 2.18.0 |
| --- | --- | --- |
| Valid fixture | Accepted | Accepted |
| Invalid backslash-q escape | **Accepted: blocker** | Rejected |
| Raw control, trailing data, NaN | Rejected | Rejected |
| Duplicate, nested duplicate, escaped-equivalent duplicate, duplicate before later malformed input | Rejected through typed custom duplicate hook | Rejected as `JSON::ParserError` with `allow_duplicate_key: false` |
| Depth 13 with nesting limit 12 | Rejected | Rejected |

The alternative executable inspected was exactly:

`/opt/homebrew/Cellar/ruby/4.0.7/bin/ruby --disable-gems`

Executable SHA-256:

`0abc5dafa91bf31774888e70580d9b7d2739006beecf37795d3a2c3d383b974f`

Loaded JSON files, including version/common/ext/parser bundle components, were inside the same Cellar **4.0.7/lib/ruby/4.0.0** tree. No gems were loaded. Future acceptance must revalidate the exact executable and loaded JSON provenance; PATH aliases or version strings alone are insufficient.

The modern parser is **not a drop-in replacement** for the current design: it bypasses the tested custom `object_class` `Unique#[]=` override. With `allow_duplicate_key: true`, duplicate keys were accepted; with `false`, they were rejected as `JSON::ParserError`. The probes did not establish a supported typed discriminator between duplicate keys and other syntax errors. Do not classify duplicates by matching human-readable exception text, echo the exception, or assume the old hook still protects nested objects.

## Alternatives and recommendation

| Option | Trade-off |
| --- | --- |
| A — Explicitly revise diagnostic contract and pin installed modern parser | **Recommended:** retain duplicate/malformed-input rejection while intentionally coarsening duplicate diagnostics; bounded runtime/contract change requiring approval |
| B — Preserve distinct duplicate code by designing a custom lexer/parser | Larger correctness, security and maintenance surface; outside the current implementation plan; not recommended for this narrow task |
| C — Leave the implementation blocked | No contract change or new implementation risk; retains current unusable checkpoint and unresolved parser blocker |

No option authorizes installation, downloads, native tools, owner integration, archive/credential reads or provider access. Choosing A must be explicit; a favorable tiny probe does not itself approve the change.

## Exact proposed contract delta

Only **after user approval**, amend the approved spec and implementation plan together:

1. Replace the fixed system-Ruby runtime with the exact installed Cellar Ruby **4.0.7**, `--disable-gems`, JSON **2.18.0**, subject to fresh executable/loaded-library identity and containment verification. No fallback interpreter or automatic version selection.
2. Parse using explicit `allow_duplicate_key: false`, `create_additions: false`, `allow_nan: false`, and `max_nesting: 12`. Do not depend on custom Hash insertion interception, whose bypass is observed for this parser. Never enable duplicate keys to retain a custom-hook strategy.
3. Remove **`DUPLICATE_KEY`** from the input-result vocabulary and its test oracles. Duplicate keys remain prohibited and rejected **before a collapsed object can enter validation**, but produce **`INPUT_SYNTAX`**, the same fixed code as other parser syntax failures.
4. Catch the documented typed nesting failure before its parser-error superclass and map it to **`INPUT_LIMIT`**. Other `JSON::ParserError` outcomes, including duplicate keys, map to **`INPUT_SYNTAX`**. Do not inspect exception messages for classification; never return or log parser text, raw input or offending keys. Unexpected runtime failures remain blocked verification, not fabricated consistent results.
5. Preserve the existing stage order: input type/UTF-8/BOM, raw byte cap, parser failure, remaining structural caps, schema/mode, field shape, expected semantics and observed comparison. There is no promised duplicate-specific priority within parser faults after the revision; a typed depth failure is `INPUT_LIMIT`, otherwise parser syntax failure is `INPUT_SYNTAX`.

**Unchanged:** 65,536-byte inputs, 12 levels, 2,048 value nodes, 128-byte strings, 32 object members, eight inventory entries; schema/type/expected/observed contracts; inventory and UUID checks; policy evidence; deterministic semantic codes; secret-safe output; purity boundary; synthetic-only result envelope and all production exclusions. This proposal changes rejection **diagnostic granularity**, not permission to accept duplicate input or real evidence.

The proposed change must not be silently applied to the original spec/plan or checkpoint tests while approval remains pending.

## Bounded implementation sequence after future approval

1. Revise the exact spec and plan together, identifying this diagnostic delta and new pinned runtime. Obtain independent review of those changes before code work. Retain the isolated worktree and blocked WIP history; do not merge the unfinished validator into main.
2. Revalidate the existing reviewed parent/child network policy controls, the pinned Ruby executable and loaded JSON component provenance, with minimal `env -i`, owned HOME/TMP, disabled gems, no injection variables, closed descriptors and bounded output/time. If controls, identity or startup fail, stop without weaker policy, download or alternate runtime.
3. Write failing tests against the revised approved oracles **before changing the parser**. Record meaningful assertion/contract red results separately from runtime startup failures. Invalid backslash-q must now reject; duplicate fixtures must reject with the explicitly revised syntax code. Preserve malformed raw JSON fixtures rather than constructing duplicates through a Ruby hash.
4. Change only parser/runtime integration initially; do not delete failing semantic tests to obtain green. Run the focused parser tests under the verified boundary, then the full existing suite to expose still-unimplemented schema/semantic/purity work. A parser-group pass is not completion of the harness or approval of its `synthetic_consistent` output.
5. Continue broader implementation only within the separately approved original scope and after the parser revision is verified; retain independent review and full regression requirements. No owner/core imports, Fastlane, real archives, native tools, credentials, provider operations or production gate wiring.

## Required acceptance matrix for the revision

| Group | Required assertion |
| --- | --- |
| Strict syntax regression | Invalid backslash-q, raw control, trailing data and NaN reject as `INPUT_SYNTAX`; well-formed fixture reaches later validation |
| Duplicate rejection | Top-level, nested, escaped-equivalent, repeated and duplicate-before-malformed raw JSON all reject as `INPUT_SYNTAX`; no last-write-wins validation |
| Nesting | Depth 12 parser control proceeds; depth 13 gives `INPUT_LIMIT`; typed exception handling is tested before generic parser errors |
| Stage order/caps | Encoding and raw-byte failures retain precedence; post-parse node/string/object/array bounds and all original shape/semantic stages retain their oracles |
| Configuration sensitivity | Fixed duplicate-rejection option is present; a test-only mutant that permits duplicates makes the duplicate regression fail, not a production fallback |
| Diagnostic privacy | Synthetic markers in malformed input never appear in result or captured output; no message regex or raw exception printing |
| Runtime/provenance | Exact executable, JSON version and allowlisted loaded-file identities verified anew; no gems, owner dependencies or unexpected side effects |
| Full-contract preservation | Run all original nonparser tests without weakening expected semantics; failures remain explicit unfinished work, not parser acceptance evidence |

Tiny probes cover these selected parser behaviors only. They are not a full JSON conformance campaign, a resource-exhaustion proof, a purity audit or a finished validator test run. Final evidence must state actual executed cases and remaining gaps.

## Handoff

Request explicit approval for **A's runtime and diagnostic revision** before editing the original contract or implementation. Owner `p2z9` acceptance remains a later integration gate; no owner acceptance/contact is implied. Until approval and subsequent verified implementation, keep the README's **INCOMPLETE / BLOCKED — DO NOT USE** warning and `pxrg` blocked.
