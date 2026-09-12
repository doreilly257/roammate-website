# Admin production deployment — 12 September 2026

This dated record describes the approved limited rollout, not completion of all admin work.

## Deployment and scope

- User approved deploying the tested admin fixes to the existing Cloudflare Pages project `roammate-admin`, with video and untyped-album moderation decisions explicitly unavailable pending the backend media-contract fix.
- Deployment: `bffdda0c-f2b8-4e08-9544-e485ccae8184`, created `2026-09-12T18:39:43Z`, from source commit `61930f4`, production branch `main`.
- Deployment URL: `https://bffdda0c.roammate-admin.pages.dev`.
- Rollback predecessor: `bd33bcb1-da6a-4c3c-b292-76840e0ebcb9`; recheck its suitability before any rollback.
- Hosting remains Pages-compatible. No Access policies were changed. This deployment did not publish the separate public-site terms correction.

## Verification evidence

- Fresh local gates passed: 99 admin tests, Astro check with 0 errors / 0 warnings / 2 existing hints, and production build. Pages upload completed successfully.
- Before/after fingerprints of the relevant Access application and policy snapshots were identical for `admin.roammate.com`, `roammate-admin.pages.dev`, and `*.roammate-admin.pages.dev`. This is a configuration drift check, not authenticated UI acceptance.
- Production binding names and types remained intact: `ACCESS_AUD` and `ADMIN_API_KEY` as secrets; `ACCESS_TEAM_DOMAIN` and `API_BASE_URL` as plain-text variables. `DEV_BYPASS_ACCESS` was absent. Masked secret readbacks do not establish their contents or backend scope.
- Unauthenticated live requests to `https://admin.roammate.com/` and `/moderation` returned HTTP 302 to Cloudflare Access.
- The Pages alias initially returned HTTP 403 to a Python user agent, then HTTP 302 with a browser-like user agent; the deployment hostname also returned HTTP 302 to the expected Access team. Pages-hostname probes exposed no console markup.

## Remaining limitations

- Video and untyped-album decisions remain unavailable until `roammate-website-7ku` / handed-off `roammate-app-ios-g3sl` resolves the backend media contract. Operators must not bypass the required full-content review.
- Authenticated production UI was **not tested**. Operator acceptance and scoped backend-key verification remain tracked under `roammate-website-d3m`; the successful deployment and unauthenticated checks do not close that umbrella task.
- Earlier deployment notes are historical evidence for their own timestamps; this record supersedes no unrelated public-site verification.
