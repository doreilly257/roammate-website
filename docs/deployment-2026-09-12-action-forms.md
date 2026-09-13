# Admin action-form and API redirect fixes

Date: 2026-09-12. Beads: `roammate-website-cta`, `roammate-website-c80`.

## Deployment

Admin Pages production deployment `b31868a4-36e7-4651-b669-417ce2cb6950` succeeded from source commit `e7974b2` (upload exit 0; archive `f8ca60714c207ef7`). Cloudflare MCP canonical deployment readback confirmed it. This release uses the user's standing approval for tested website/admin fixes without changes to hosting, Access policies, actual feature-flag settings, legal wording, or backend/app projects.

Flags, users, and excursions now reject malformed action forms before mutation and redirect successful mutations with HTTP 303 to a fresh GET. Errors remain visible; requests are not automatically retried. Actual Workerd testing also discovered that `redirect: 'error'` was unsupported and blocked API requests. The API client now uses manual redirects with explicit rejection of 3xx responses, preventing credential-bearing requests from following redirects.

## Verification

All 181 admin tests passed; Astro check and build passed with 0 errors, 0 warnings, and 2 existing hints. Coverage includes 46 real-Request frontmatter tests, 15 RED → GREEN redirect cases, and an actual Miniflare test using the real API client against a loopback server that confirms the redirect target is never visited. Independent review found no blocking issues.

Local Workerd verification exercised all three action forms: successful POST 303 → GET 200, malformed input 400, cross-origin POST 403, and sensitive responses using `no-store`. Mutations used local test infrastructure only; no production mutations were performed.

Before/after serialized production configuration and all three Access applications/policies were identical. Five live unauthenticated checks covering custom-host root, flags and users routes, the Pages alias, and the new deployment hostname returned HTTP 302 to the existing `quiet-hall-00a9` Access login. The public site's deployment remained `d1d8272a`, unchanged by this admin release.

## Limits and rollback caution

Authenticated production operator acceptance remains unverified under `roammate-website-d3m`. Video and untyped-album moderation limitations remain pending the backend media-contract fix. Unauthenticated Access checks are not evidence of authenticated UI acceptance.

The preceding deployment `ef10ab34` contains the discovered API redirect-mode defect and must not be described or selected as a known-good rollback without reassessment. Any rollback target needs independent compatibility and behavior verification.

## Follow-up — 2026-09-13

In response to the explicit request to sign in at `admin.roammate.com` and confirm that the dashboard loads without API errors, the user replied: “continue, no errors”. This records user-reported signed-in dashboard read acceptance for `roammate-website-d3m`; it is not independent browser verification, an all-route acceptance check, production mutation testing, or verification of credential/key scope. The September 12 evidence above remains a historical record of what was verified at deployment time.

The read-only backend handoff review now reports `roammate-app-ios-g3sl` closed on September 12 at 21:32, with source commit `6ff09ae`. The backend owner reports photo/video metadata plus `album_id`, six native D1 tests, and passing full gates. That handoff does not authorize or confirm a backend deployment. `roammate-website-7ku` still requires original-media full-review integration; video and untyped-album moderation limitations must remain visible until the relevant integration and deployed behavior are verified.
