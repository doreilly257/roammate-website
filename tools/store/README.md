# Store metadata regression guard

Tracked local tools copied from `.tmp/store-pipeline/`; metadata is **not** copied
or regenerated. This package does not install an owner pipeline or upload anything.

## Local verification

From the website repository root (Python 3, standard library only):

```sh
python3 -m unittest discover -s tools/store -p 'test_*.py'
python3 tools/store/verify_store_metadata.py .tmp/store-pipeline/fastlane/metadata
python3 tools/store/verify_store_metadata.py .tmp/appstore-drafts
python3 tools/store/verify_store_metadata.py --warn-only .tmp/appstore-drafts
```

The `.tmp` inputs are existing local artifacts, not required tracked fixtures. For
an owner repository, use actual `fastlane/metadata` (iOS) or
`fastlane/metadata/android` (Play), independently. Multiple roots are supported,
but **every explicit root must contain supported prose**, even if another root is
valid. An empty or changelog-only Play directory exits 2; it cannot borrow iOS
coverage. Empty optional prose fields are legal.

Supported names: `description.txt`, `release_notes.txt`, `promotional_text.txt`,
`subtitle.txt`, `name.txt`, `keywords.txt`, `full_description.txt`,
`short_description.txt`, `title.txt`; also locale-shaped `*.description.txt`
drafts, including the existing `ko`, `ja`, `zh-Hans`, `pt-BR`, `es-ES`, `fr-CA`,
`ar-SA`, and `es-MX` drafts. URLs, arbitrary text filenames, screenshots, and
numeric Play changelogs are not linted. Traversal is sorted; overlapping roots and
file symlinks are deduplicated by resolved path. Directory symlinks are not followed.

Exit status: **0** clean or warnings only; **1** error-severity claims; **2** input
failure. Missing/non-directory/unreadable roots, unreadable or non-UTF-8 prose,
broken prose symlinks, invalid JSON/schema/regex, and zero-prose roots fail closed.
`--warn-only` demotes claim violations, never input failures. `--rules PATH` accepts
a JSON object with a nonempty `rules` array; each rule requires a unique nonempty
`id`, `why`, `allowed_when`, `owner`, severity `error` or `warn`, and a nonempty
array of nonempty valid regex strings.

## Claim history, not release certification

There are intentionally **five active rules**: `verification-is-mandatory`,
`ai-concierge`, `read-receipts`, `request-to-join`, and warning-only
`no-paywall-forward-risk`. Exactly **three retired rules** remain as historical
records: `sos-contact-delivery`, `collect-badges`, `actionable-groups`. They were
retired because their premises were false, not because coverage was forgotten.
Never reintroduce them merely because an adjacent Bead is open.

The preserved `claims.json` narratives (including “today”, flags and release
references) describe the August 31/September 1 audit history, **not verified
current production or release state**. Re-evaluate an actual claim against owner
evidence before changing a rule. A pass only means no listed pattern matched:
missing qualifiers, unknown claims and later regressions require human review.

## Owner handoff and live operations

Owner sessions may review/copy `tools/store/` to the same path in their own
repository, then merge `Fastfile.snippet` into `fastlane/Fastfile` and adjust paths
to actual platform metadata. The snippet resolves paths relative to the
Fastfile directory and uses separate iOS and Play pre-upload lint lanes. It is an
example, **not installed or executed here**. Upload lanes are real mutations and
require separate owner authorization, credential setup and release review.

The examples upload text metadata only: iOS skips screenshots, retains the HTML
preview confirmation, and explicitly does not submit for review; Play skips images,
screenshots and changelogs. Screenshot/image parity and any replacement workflow
require separate owner review and authorization; these examples do not resolve
that work. Options follow the official [deliver documentation](https://docs.fastlane.tools/actions/deliver/)
and [supply documentation](https://docs.fastlane.tools/actions/supply/).

The preserved ASC exporter is a small initial-export/drift helper, not a complete
ASC synchronization client (it retains first-version and fixed-limit selection):

```sh
# Owner-authorized live operations only; not part of local verification:
python3 tools/store/export_metadata.py --out fastlane/metadata --diff
python3 tools/store/export_metadata.py --out fastlane/metadata
```

Both commands contact ASC and authenticate using `ASC_KEY_ID`, `ASC_ISSUER_ID`,
`ASC_KEY_PATH`; live access requires PyJWT and cryptography. JWT is imported only
inside `asc()`. `--diff` performs no local writes but is **not offline**; it exits
1 for drift, 0 for agreement. Without `--diff`, metadata is written. Tests replace
ASC responses and prohibit writes/authentication/network; they need no credentials
or third-party dependencies. Do not run export, Fastlane, or upload lanes merely
to verify this package. No GitHub workflow is included or required.
