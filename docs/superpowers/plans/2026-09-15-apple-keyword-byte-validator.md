# Apple Keyword Byte Validator Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans`. Track execution in Bead **`roammate-website-muz7`** only; these numbered steps are a procedure, not a second task tracker.

**Goal:** Implement the user-approved standalone offline keyword input/100-byte guard without rewriting metadata or integrating store operations.

**Architecture:** A Python standard-library read-only reader validates explicit regular files, preserves text exactly except one allowed terminal line ending, and emits safe JSON lines. Synthetic unit/CLI tests enforce input, privacy and exit precedence; existing store tooling stays unchanged.

**Tech stack:** Python 3 standard library, `unittest`, root's verified deny-network boundary. Worktree: `.worktrees/apple-keyword-bytes`.

**Contract:** [Reviewed design](../specs/2026-09-15-apple-keyword-byte-validator-design.md), now approved for implementation by the user. No keyword edits, Fastlane wiring, authentication, network, dependency install, upload or release.

## Files

- Create `tools/store/verify_apple_keywords.py` — standalone validator and CLI.
- Create `tools/store/test_verify_apple_keywords.py` — tests alongside existing discovery layout.
- Update `tools/store/README.md` — independent usage, input limits and exit semantics.
- Record scoped results under `docs/superpowers/verification/` after verification; no keyword contents.

## Unit 1 — Tests first

1. Preserve root's existing **18-test baseline** as a dated receipt, not a substitute for a new run. Write new `unittest` tests against the missing validator before implementation.
2. Cover ASCII 99/100/101-byte boundaries; Arabic/CJK/emoji; combining sequences unchanged; retained printable spaces; one LF/CRLF removed; repeated/interior endings/lone CR rejected; empty rejected. Include invalid UTF-8, BOM anywhere, NUL and other ASCII controls.
3. Cover explicit path count, missing/wrong basename/directory/symlink/special-file rejection, parent-symlink allowance, resolved-path deduplication, mixed invalid/over-limit precedence and continued processing. Assert only escaped path/bytes/limit output, no contents or exception text. Hash synthetic inputs before/after.
4. Root runs the focused suite inside its verified network-denied boundary:

```sh
python3 -m unittest discover -s tools/store -p 'test_verify_apple_keywords.py'
```

Record intended RED (missing implementation or contract assertion). Do not mistake a test syntax error for behavior evidence.

## Unit 2 — Minimal standard-library implementation

1. Add a safe reader: validate basename `keywords.txt`, reject final-component symlinks/nonregular files, open read-only with no-follow semantics, and validate descriptor type. Handle final-component race without blocking on a substituted FIFO; close descriptors on every path. Parent symlinks remain allowed as designed, not an all-ancestor security guarantee.
2. Decode strict UTF-8; remove exactly one final CRLF or LF, then reject empty text, BOM/NUL, remaining CR/LF and ASCII controls. No `.strip()`, normalization or keyword rewriting. Count `len(text.encode('utf-8'))`.
3. Deduplicate valid resolved paths in first-input order; do not silently accept a supplied symlink merely because its resolved target was already seen. Separate hardlink paths need not deduplicate.
4. Emit one JSON object per result with only `path`, `bytes`, `limit: 100`; invalid inputs use null bytes. Escape paths via JSON encoding. No raw exceptions/keyword contents. Missing arguments get fixed usage only. Aggregate exit codes: invalid → 2; otherwise any >100 bytes → 1; otherwise 0. Continue after per-file invalid input.
5. Root runs focused tests to GREEN, adds any missing regression uncovered by review before fixing it, and verifies no networking/authentication imports or external-tool execution in the validator.

## Unit 3 — Integration-free verification and landing

1. Update README with standalone explicit-file usage and no automatic discovery/Fastlane/claims-guard integration. Distinguish empty-keyword invalidity from the older prose guard's optional-field policy.
2. Root reruns all store tests under verified deny-network controls:

```sh
python3 -m unittest discover -s tools/store -p 'test_*.py'
```

Require the existing 18 tests plus all new tests to pass; report the actual observed count. Synthetic network guards must reject attempted socket/HTTP use without a live request or listener.
3. Root explicitly supplies the **12 existing owner keyword paths** to the validator read-only, with before/after byte hashes. Do not recursively discover files inside the validator. Confirm actual byte counts and four over-limit outcomes against the input files; do not assume the historical count if evidence differs. Retain paths/counts only, no keyword contents.
4. Independently review source, tests, CLI results and owner-input preservation. Run `git diff --check`; confirm no owner metadata edits, dependency changes or upload wiring. Record limits: byte/single-line guard is not full Apple keyword-policy acceptance.
5. Root records scoped verification, updates `muz7`, commits only approved files, merges the isolated branch safely and pushes according to project workflow. Do not close broader store/publication Beads on a successful local validator.

**Stop conditions:** Missing isolation, unhandled path race, leaked contents, changed input bytes or failing retained tests must be resolved before completion. Never compensate by rewriting keywords, enabling live store tooling or weakening invalid-input precedence.
