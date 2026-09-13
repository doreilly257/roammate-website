# Local store pipeline implementation

Design: `../specs/2026-09-13-store-pipeline-hardening-design.md`.
Tracking remains in Beads vxi, managed by root; this is execution guidance only.

1. Copy the five existing scratch pipeline source files into `tools/store/`, not
   metadata. Add stdlib temp-directory and mock tests for status codes, validation,
   per-root coverage, draft filenames, deduplication, and exporter diff safety.
   Run `python3 -m unittest discover -s tools/store -p 'test_*.py'` and record red.
2. Implement strict rules and input handling; preserve rules and exporter behavior.
   Split platform lint lanes and document explicit owner handoff paths. Rerun the
   unittest command to green and check Ruby snippet syntax without running lanes.
3. Run the tracked linter read-only against `.tmp/store-pipeline/fastlane/metadata`
   and `.tmp/appstore-drafts`; report counts and caveats. Root reviews scope,
   integrates and closes local deliverable, without claiming release acceptance.
