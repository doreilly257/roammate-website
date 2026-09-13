# Admin local release packaging implementation plan

> Agent workflow: use subagent-driven development with root plan/spec/code review.
> Bead `csh` is the sole task/status tracker; this document describes execution,
> not a separate checklist. Root approved this plan and isolated-build amendment.

**Goal:** Produce a reproducible local admin Workers release package based on
current main without changing hosting or main runtime.

**Architecture:** Port only the reviewed admin diff `996404c..8a6bfd1` onto
`d7e41c9245aeba99fcaacaad78b8077e28155219` in ignored worktree
`.worktrees/admin-workers-release-packaging`, branch
`evaluation/admin-workers-release-packaging-2026-09-13`. Preserve all intervening
main changes. Keep the existing synthetic local configuration as the default;
add a separate non-active production proposal configuration so local smoke never
accidentally targets the real API or remote binding.

**Tech stack:** Evaluated Astro 7.3.2, Cloudflare adapter 14.3.1, Wrangler 4.131.1,
existing node:test and local Miniflare/workerd. No new dependency design.

## 1. Isolation and fresh baseline

Verify `.worktrees` is ignored and create the named branch at the exact base.
Inspect `git diff 996404c..d7e41c9 -- admin.roammate.com` before porting. In the
fresh admin directory run `npm ci --no-fund` and `npm test`, retaining exit code,
counts and logs. Baseline failure is surfaced to root before implementation.
No owner worktree or main source is edited.

## 2. Port the reviewed implementation, not the old tree

Use `git diff --binary 996404c..8a6bfd1 -- admin.roammate.com` as the precise
patch, run `git apply --check`, then apply after root approval. If intervening
changes conflict, stop and reconcile individual hunks under review rather than
checking out entire historical directories. The patch covers framework/lockfile,
native `locals.adminEnv` bridge and twelve page consumers, binding transport,
existing tests, synthetic smoke/demo, generated types and disabled deploy script.
Run `npm ci --no-fund` for the reviewed lockfile; do not upgrade further.

## 3. Test-first local production proposal

Create `admin.roammate.com/dev/release-packaging.test.mjs` using existing
node:test conventions. First assert a separate parseable
`admin.roammate.com/wrangler.production-proposal.json` exists and has the exact
proposed Worker name `roammate-admin-console`, existing-service binding
`ADMIN_API` → `roammate-api-production`, primary API URL, disabled default/preview
hosts, no routes/custom domains/secrets/bypass, Worker-first assets and no new
resource bindings. Verify default `wrangler.jsonc` remains synthetic and deploy
script remains a fail-closed guard. Run the focused test to capture expected RED
before creating the configuration. Also assert a non-default
`astro.production-proposal.mjs` explicitly sets `remoteBindings: false`, selects
only the proposal JSON and uses distinct `outDir: ./dist-production-proposal`;
default config must not select it.

Create the proposal JSON by reusing the reviewed local configuration shape:
`main: @astrojs/cloudflare/entrypoints/server`, compatibility date `2026-09-02`,
`nodejs_compat`, assets `dist-production-proposal`/`ASSETS`/`run_worker_first: true`,
`workers_dev: false`, `preview_urls: false`, vars
`API_BASE_URL: https://api.roammate.com` and the existing Access team domain,
plus `services: [{binding: ADMIN_API, service: roammate-api-production}]`.
No secret values, secret placeholders, audience override, domain attachment,
remote-test command or new resource. The proposal is deliberately not selected
by default Astro/dev/build commands. Add `astro.production-proposal.mjs` importing
the base config and overriding only adapter (`imageService: passthrough`,
`configPath: ./wrangler.production-proposal.json`, `remoteBindings: false`) and
`outDir: ./dist-production-proposal`. Add a concise local README explaining this
explicit compile-only entry is not an upload instruction; keep `session: false` and
image passthrough in the Astro configuration. Run the focused test GREEN.

## 4. Fresh acceptance and local handoff

Run `npm test` (includes the existing two synthetic Workers with positive-control
outbound deny observer), `npm run check`, `npm run build`,
`node dev/workers-evaluation-smoke.mjs` and `npm audit --json`. The built smoke
must continue using loopback/synthetic bindings only. Independently scan built
client assets for synthetic-key/secret-name leakage and inspect generated local
configuration for no live target, accidental resource or bypass. Verify proposal
JSON and default synthetic JSON remain separate. Run the explicit proposal build
only with empty isolated HOME, sanitized environment without existing secrets,
metrics disabled, and remote bindings disabled:
`node dev/build-production-proposal.mjs`.
The compile wrapper snapshots `.wrangler/deploy/config.json` and restores exact
prior bytes (or prior absence) in `finally` on success, failure or spawn error;
test these paths RED/GREEN in `dev/production-proposal-build.test.mjs`. This
addresses the reproduced adapter side effect of rewriting the default pointer
even when an alternate outDir/config is selected. Never invoke the alternate
Astro build directly. Assert the final pointer is synthetic or absent.
The wrapper must reject project-root `.env`/`.env.*`/`.dev.vars`/`.dev.vars.*`
before reading their contents or spawning the compiler; test rejection before
implementation. Builds run serially. Document that forced parent termination
requires inspecting/restoring the pointer, not a claim of guaranteed cleanup.
The one permitted inert template is tracked `.dev.vars.example`, proven safe by
installed loader selection (`.dev.vars.<env>` only when env selected) and fixed
CLI/allowlisted environment without `--env` or `CLOUDFLARE_ENV`. Test that exception.
Exclude only the new generated output from `tsconfig.json` to keep later checks
from analyzing generated server bundles; preserve existing source coverage.
Inspect its separate generated `dist-production-proposal/server/wrangler.json`
for exact proposed service/vars, no domains/secrets/bypass/resources and disabled
hosts. Never dev/preview/smoke that configuration or invoke upload.

Record actual counts, limits and file hashes, plus `git diff --check` and scope
review. Root arranges independent spec and code review. Preserve a local branch
commit only after findings are resolved; never push, merge or deploy it. Root
owns the main verification report and Bead disposition.

## Explicit boundaries

No live binding, Worker creation/upload, DNS, Access, secret, API record, store,
paid resource, cache or production change is authorized. Proposed Worker name
availability, serving backend scoped-key contract, secure provisioning, account
allowance and current Pages authenticated rollback acceptance remain later gates
in the existing cutover design. This local package does not close `1wi` production
exposure or `d3m` live acceptance.
