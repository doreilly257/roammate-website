# Offline Apple keyword byte validator

**Status:** Design for the user-approved offline validator direction; **written user review/approval of this design is required before implementation**. No store access, keyword editing or upload is included.

## Purpose and boundary

Add standalone `tools/store/verify_apple_keywords.py` to check explicit local `keywords.txt` files against Apple's **100-byte** limit and required-field presence. Root freshly checked the official [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/) documentation. This is a byte/single-line input guard, not a full keyword-policy validator: it does not assess relevance, localisation quality, prohibited terms, keyword availability or overall App Store acceptance.

Use Python standard library only. No network, authentication, SDK, package installation, recursive discovery, Fastlane wiring or integration into the existing claims guard. Do not rewrite keyword files or normalize their text.

## CLI and input contract

```text
python3 tools/store/verify_apple_keywords.py PATH/keywords.txt [PATH/keywords.txt ...]
```

Require at least one explicit path. For each input:

1. Require basename exactly `keywords.txt`. Reject a symlink input, missing path, directory or other non-regular file. Open read-only; use non-following file-open semantics and descriptor metadata checks where supported so a final-component swap cannot silently follow a symlink. Do not claim this is a general hostile-filesystem sandbox.
2. Deduplicate valid canonical/resolved paths while preserving first-input order. This does not deduplicate distinct hardlink paths. Parent-directory symlinks are permitted; rejecting the input's final component does not imply every ancestor is symlink-free.
3. Decode bytes as strict UTF-8. Reject a BOM (`U+FEFF` anywhere), NUL, CR or LF remaining after the terminal-line-ending rule below. Reject other ASCII control characters (`U+0001`–`U+001F`, `U+007F`) as invalid input; printable whitespace otherwise remains unchanged.
4. Remove **at most one** terminal LF, or one terminal CRLF pair. Do not strip any other whitespace, lone terminal CR, repeated line endings or interior newline. A second line ending remains and therefore makes the input invalid.
5. Reject empty remaining text as invalid input (exit 2), because keywords are required; do not issue a misleading zero-byte pass. Count UTF-8 bytes of nonempty remaining text without NFC/NFD normalization or a character-count shortcut. Printable whitespace remains unmodified; byte validity alone is not full keyword-policy acceptance.

Apply validation before classifying byte length. Invalid UTF-8 or forbidden content is invalid input, not merely over-limit. No field contents, prefixes or Unicode examples from actual files may appear in output or exceptions.

## Output and exit semantics

Emit one safe line per deduplicated valid input containing **path, byte count and limit 100 only**. JSON-escape paths so newline/control characters in a filename cannot inject extra output lines. Invalid inputs emit the supplied escaped path with `bytes: null` and `limit: 100`, without file contents or raw exception messages. For missing CLI arguments, emit only fixed usage text and exit 2.

- **0:** Every input is valid and at most 100 bytes.
- **1:** At least one valid field exceeds 100 bytes, with no invalid inputs.
- **2:** Any invalid input, even if another valid field exceeds 100 bytes.

Continue validating other explicitly supplied paths after a per-file failure so one invocation reports all requested files. Do not expose partially decoded contents. The process makes no changes to files, permissions, configuration or stores.

## Verification design

Create `tools/store/test_verify_apple_keywords.py` alongside the existing store tests, using standard-library `unittest`, temporary synthetic files and subprocess exit/output checks. No real credential or store access is needed.

Cover ASCII 99/100/101 bytes; Arabic/CJK/emoji byte boundaries; decomposed combining characters proving no normalization; one LF and one CRLF removal; repeated/interior line endings and lone CR rejection; retained printable spaces; rejection of an empty file and single-line-ending empty text. Cover missing/wrong-basename/directory/symlink inputs, invalid UTF-8, BOM, NUL, other ASCII controls, deduplication and mixed over-limit/invalid precedence.

Assert output contains only escaped paths/counts/limit and no synthetic keyword contents or raw errors. Hash fixture bytes before/after every run to prove nonmutation. Run tests under root's available verified deny-network boundary and include a guard that fails on attempted network operations; no live network probe or listener is necessary. Source review must confirm no networking/authentication imports or subprocess external tools in the validator itself.

## Acceptance

After written user review/approval of this design, root implements with red/green tests, then validates the four known over-byte fields read-only without editing them. Success means accurate safe local diagnostics, **not corrected keywords, published metadata, an editable App Store version or closure of broader store acceptance**. Any field rewrite or store operation remains separately scoped and approved.
