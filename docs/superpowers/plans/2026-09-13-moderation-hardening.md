# Moderation Hardening Implementation Plan

> For agentic workers: use subagent-driven-development or executing-plans with TDD. Beads, not this document, tracks completion. Root owns review, commits and issue state.

**Goal:** Implement the approved strict moderation forms, truthful read states and local-only original-media prototype.

**Architecture:** Preserve SSR/on-demand authorization and production media restrictions. Add a focused media normalization helper and browser controller behind a compile-time development plus explicit local opt-in gate; no production runtime feature flag.

**Tech Stack:** Astro, TypeScript, native browser media/forms, Node test runner; no dependencies.

## Strict forms and read states

Files: `admin.roammate.com/src/pages/moderation.astro`, `dev/moderation-on-demand.test.mjs` and new `dev/moderation-hardening.test.mjs`.

Write real Request/FormData frontmatter tests for missing, duplicate, file and malformed values. Run `node --test dev/moderation-hardening.test.mjs` and confirm failures before modifying handler. Catch parse errors; require one literal action/ID/acknowledgement and optional single string notes. Preserve actor, 500-character truncation, one mutation and 303 success. Test queue/log failures separately; render successful empty state only after successful reads. Re-run targeted tests.

## Local media normalization and readiness

Files: new `src/lib/moderation-media.ts`, `src/lib/moderation-media-controller.ts` and `dev/moderation-media.test.mjs`; integrate in `src/pages/moderation.astro`.

Write failing tests for default/production-disabled gate, local photo/video and message attachments, URL allowlisting, null/deleted/malformed targets, legacy types and readiness transitions. Run targeted tests red. Implement the smallest typed helpers; use `import.meta.env.DEV && import.meta.env.LOCAL_MODERATION_MEDIA === 'true'` at the page boundary. Production uses existing renderer and cannot activate via request data. Local native media requires usable originals and explicit human acknowledgement; browser state is not server authorization. Test error/emptied reset and no-JavaScript disabled controls. Keep current image-only production behavior and rejected-video/album regressions.

## Verification and handoff

Run `npm test`, `npm run check`, `npm run build` from `admin.roammate.com`, inspect production output for disabled local capability. Use only local fixtures for browser media/read-state verification; record browser coverage gaps honestly if browser execution is unavailable. Root performs independent spec/quality review before integration. No backend, flags, hosting, credentials or deployment changes; no production mutations. User approval was relayed by root on September 13; original draft history remains intact.
