# Admin metrics implementation

Authority: user approved the reviewed 2026-09-13 admin metrics design for local implementation; no deployment or backend changes. Root owns Beads, integration and commits. This plan is an execution procedure, not a separate issue tracker.

1. Add Node regression fixtures for count validation, missing/duplicate webhook entries, ambiguous aggregate zeros, strict UTC timestamps and privacy-safe request errors; observe RED before implementing `admin-metrics.ts`.
2. Implement a shared presentation model and additive optional `albumsWithMedia` API typing. Keep raw error details and unexpected webhook fields out of the model.
3. Add rendering assertions before changing overview/Data quality; integrate shared album labels, always-present neutral webhook evidence and fixed request-context failures, preserving unaffected sections.
4. Run admin Node tests, Astro check and local build. Root independently reviews rendered fixtures and narrow-screen behavior, then commits/pushes. Source-contract fixture success is not backend rollout or admin release evidence.

Owned files: `admin.roammate.com/src/lib/admin-metrics.ts`, additive `api.ts` field, `src/pages/{index,quality}.astro`, new `dev/admin-metrics*.test.mjs`. Moderation files remain with their separate implementer.
