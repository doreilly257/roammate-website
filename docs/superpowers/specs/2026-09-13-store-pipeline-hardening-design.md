# Local store pipeline hardening

Authorized local implementation of vxi; root owns Beads and integration. No
metadata regeneration, owner-tree writes, credentials, uploads, or deployments.

Package the five existing pipeline files in `tools/store/`. Preserve exactly five
active rules and three historical false-premise retirements. Claims history is not
evidence of current release state; this is a regression guard, not an audit.

The linter validates rule structure and regexes before scanning. Input errors
(missing/non-directory/unreadable roots, unreadable or invalid UTF-8 prose,
invalid rules, or each explicitly supplied root containing zero supported prose
files) return 2, including with `--warn-only`. Claim errors return 1; warnings
return 0. Empty optional prose is valid. Changelogs alone are not prose coverage.
Recognize conventional metadata filenames and locale-prefixed description drafts
with a strict locale-shaped filename. Sort traversal and deduplicate resolved file
paths while counting coverage independently for every explicit root. Do not follow
directory symlinks; do read recognized file symlinks, rejecting broken targets.

Keep the ASC exporter behavior and lazy JWT import, with mocked offline diff tests
that forbid writes, authentication and network. Use separate iOS and Play lint
lanes so an empty Play listing cannot borrow iOS coverage. Document handoff paths
without installing lanes in owner repositories or executing any lane.

Acceptance: stdlib unittest red/green matrix, then read-only lint of the existing
scratch metadata and eight description drafts. No dependencies or website changes.
