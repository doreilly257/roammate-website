# Admin Key Consumer and Provisioning Inventory — 2026-09-14

**Scope:** Bounded read-only inspection of checked-in source and nonsecret configuration metadata. No secret files, environment dumps, deployment-log contents, network calls, builds, credential probes or production changes were performed by the inventory author. Root separately supplied the provider-metadata observation below. Dirty owner work was preserved.

**Verdict:** A historical scoped-key provisioning narrative and a concrete provisioning script exist, but no trusted receipt binding that value to both current deployments was found in this inspected scope. Current key attestation remains **unknown**, not “master” and not “verified scoped.”

## Inspection boundary

- Website HEAD: `7a47c9c67828d6b69f71be5b80051f64f76360dd`.
- iOS/backend owner HEAD: `6e8b34b39f6149e56abcf368a93ae9cfa5c92efc`; source root `/Users/doreilly/Work/roammate-app-ios/api`.
- Filename-only tracked searches for `ADMIN_CONSOLE_KEY`, `ADMIN_API_KEY` and `X-Admin-Key` preceded targeted source reads. Website scope was `admin.roammate.com`; owner scope was `api/src`, `api/scripts`, and `scripts`. No matching tracked owner script files appeared in those script directories for those exact terms. This does not exclude other names, repositories, CI, external operators or untracked scripts.
- Targeted source reads use current working-tree files, except an initial `HEAD` read of `api/src/utils/admin-auth.ts`. That file had no tracked diff; `api/src/index.ts` was dirty. This is a local consumer inventory, not a claim that current owner source is deployed.
- `.dev.vars.example` appeared in filename discovery but no environment/secret file contents were opened. No secret-location path mentioned by historical guidance was followed or copied here.

## Concrete consumers and related references

| Component / source | Role observed | Credential dependency and limit |
| --- | --- | --- |
| `admin.roammate.com/src/lib/api.ts` | Production-intended server-side Pages client for `/v1/admin` GET/POST/PUT operations | Attaches Pages `env.ADMIN_API_KEY` as `X-Admin-Key`; does not identify the supplied value's backend scope |
| `admin.roammate.com/src/lib/tearsheets.ts` | Production-intended server-side detail renderer using the shared API client | Delegates through the same Pages binding, not a separately provisioned credential; source reads only, no detail queries executed |
| `admin.roammate.com/src/middleware.ts:189` | Configuration presence gate after Access handling | Requires `API_BASE_URL` and `ADMIN_API_KEY`; presence check is not secret equality or scoped authorization proof |
| `admin.roammate.com/src/env.d.ts` | Runtime binding type declaration | Declares the Pages key name; not a consumer, provisioning receipt or value assertion |
| `admin.roammate.com/wrangler.jsonc` | Checked-in public configuration | API base points to `https://api.roammate.com`; comments keep secret bindings outside source. No secret value or deployment-bound injection receipt |
| `admin.roammate.com/dev/setup-access.mjs:194–220` | Production-capable provisioning tooling, **not executed** | Takes `ROAMMATE_ADMIN_API_KEY` from its process environment and maps it to Pages production `ADMIN_API_KEY` as `secret_text`; can PATCH project environment configuration. Does not validate whether the input is scoped or master and does not attest a particular deployment's injection |
| `admin.roammate.com/dev/demo.mjs` | Local mock/demo launcher, **not executed** | Uses an explicit fake demo key and localhost mock API; not evidence of a production consumer or credential |
| `admin.roammate.com/dev/*test.mjs` matching files | Test references | `access-middleware`, `admin-metrics-render`, `api-client`, `flags-auth-guidance`, `runtime-compatibility`: fixtures/checks, not proof of live provisioning or deployed authorization |
| Backend `api/src/utils/admin-auth.ts` | Authorization helper | `isConsoleKey` accepts scoped or master; `isMasterKey` accepts only master. Distinct names do not prove distinct deployed values |
| Backend `api/src/routes/admin-console.ts` and `api/src/index.ts` flags handlers | Production-intended console/flags authorization | Call `isConsoleKey`; local code supports the scoped binding while retaining master compatibility |
| Backend `api/src/index.ts` other checks; `routes/gamification.ts`, `routes/moderation.ts`, `routes/search.ts`, `routes/websocket.ts` | Master-dependent checks | Directly reference backend `ADMIN_API_KEY`; these are outside a Pages-only scoped correction. No routes were invoked, including GET routes |
| Backend `api/src/services/notification-outbox.ts`; `routes/conversations.ts`, `routes/moderation.ts`, `routes/sos.ts`, `routes/users.ts` | Internal request/header producers | Attach backend `ADMIN_API_KEY` to internal requests; conversation helper explicitly builds WebSocket broadcast headers. This is concrete reason not to rotate master as an incidental console fix |
| Backend `api/src/websocket.ts` | Internal authorization and environment declaration | Checks supplied admin headers against backend `ADMIN_API_KEY`; confirms a receiver-side master dependency |
| Backend `api/src/middleware/cors.ts`, `routes/admin-insights.ts`, `api/src/__tests__/*` search hits | Header/route or test references | Filename hits alone are not additional secret provisioning evidence; no live consumer count inferred |

The inventory establishes source-level dependencies, not a complete deployment topology or active consumer count. In particular, it does not show that all scoped-key consumers are known well enough to rotate that key.

## Historical provisioning evidence and contradictions

`admin.roammate.com/README.md:69–93` contains a September 3 narrative saying the console used `ADMIN_CONSOLE_KEY`, that it was created without rotating the original master, and that a historical master-only migration probe rejected it. This is a useful lead, not a current deployment-bound receipt. The historical probe was **not repeated**; a route that could run migrations must not be used to infer credential scope here.

The same README's earlier “Use a narrower key” section (`:60–67`) refers to `ADMIN_READ_KEY`, master-only flags and retaining the master as an alternative. Current inspected authorization uses `ADMIN_CONSOLE_KEY` and `isConsoleKey` for flags. These conflicting historical instructions must not be treated as current operational authorization or evidence to fall back to master.

`admin.roammate.com/deployment-2026-09-12.md` records a historical rollout with binding names/types preserved and explicitly states that masked readbacks do not establish contents/backend scope. It does not attest the key value in current deployment `c185fa92` or the backend version.

The setup script proves how an operator-supplied environment value **could** be provisioned. No inspected record ties its particular execution/input provenance to both active deployments, proves the scoped value differs from master, or establishes recoverable rollback credentials. Do not execute or replay the script to fill that evidentiary gap.

## Root-supplied current provider metadata

Root reports Pages project `roammate-admin` with canonical deployment prefix `c185fa92`. Its current production environment has `ADMIN_API_KEY` of type `secret_text`; its current preview environment shows neither `ADMIN_API_KEY` nor `ADMIN_CONSOLE_KEY` binding.

This is **project configuration only**. It does not attest the production encrypted value, establish that existing immutable preview deployments lack a key, or demonstrate which key any previously created deployment uses. No absence claim is made about other Pages projects or consumers.

## Disposition

This bounded inventory is complete. Continue the user's approved cache measurement next; do not extend this into repeated credential queries or another plan. The existing [verification/remediation procedure](../plans/2026-09-14-admin-key-verification-remediation.md) remains the authority for a separately approved secure comparison or exact remediation proposal. The [deployment provenance report](2026-09-14-admin-deployment-provenance.md) separately records the unresolved backend source commit.

No credential prerequisite or dependent Bead is closed by this inventory. Further key work needs an authoritative existing deployment-bound provisioning receipt or separately approved secure action with consumer, artifact and recovery gates satisfied.
