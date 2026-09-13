# Admin local release packaging — 2026-09-13

Scope: `csh`, local packaging only. Related production gates remain in `1wi` and
`d3m`. Beads owns task status; no hosting change is claimed.

## Source and authorization

The user approved local release packaging following the reviewed
[cutover design](../specs/2026-09-13-admin-workers-cutover-design.md).
Root reviewed the [implementation plan](../plans/2026-09-13-admin-release-packaging.md)
before code changes, including a separate compile-only production proposal.

Worktree: `.worktrees/admin-workers-release-packaging`; local-only branch:
`evaluation/admin-workers-release-packaging-2026-09-13`, based on
`d7e41c9245aeba99fcaacaad78b8077e28155219`. `.worktrees` was verified ignored.
The exact reviewed admin patch `996404c..8a6bfd111a5ffddafd0da17d93898623dad018fe`
applied cleanly; `996404c..d7e41c9` contained no intervening admin changes.
Final local commit: **`87160f34e2ad93f70b0abb671be02887eff0852b`**; worktree clean.
Independent spec and code reviewers approved the implementation after the
isolation fixes below. Root additionally reran 22 focused tests and inspected
actual generated configs/synthetic pointer successfully (session `35194`, exit 0).
No evaluation branch was pushed or merged; main runtime remains unchanged.

## Package contents and isolation

The package retains the reviewed Astro 7.3.2 / adapter 14.3.1 / Wrangler 4.131.1
implementation, native `locals.adminEnv`, scoped-key-preserving `ADMIN_API`
transport, Access/form/privacy protections and synthetic default configuration.
The `npm run deploy` guard still throws before invoking an upload tool.

New non-default `wrangler.production-proposal.json` targets proposed
`roammate-admin-console` with `ADMIN_API` bound to existing
`roammate-api-production`. API URL and Access team domain came from tracked
pre-migration configuration, not secret environment values. It contains no
secret value, audience, bypass flag, route or custom-domain attachment. Root's
read-only Worker-list check found no current exact name match; that is preliminary
availability, not a reservation or resource creation.

`astro.production-proposal.mjs` selects this JSON explicitly, disables remote
bindings and compiles to separate `dist-production-proposal`. No npm script
automatically selects it. Default dev/build/smoke remain synthetic.

### Reproduced reviewer finding and fix

An alternate Astro config and outDir **did not alone isolate default resolution**:
the compiler rewrote `.wrangler/deploy/config.json` to the proposal. This was
observed before any proposal runtime command; a regression test failed on that
exact pointer. A sanitized default build restored the synthetic pointer first.

The reproducible compile entry is now `node dev/build-production-proposal.mjs`.
It snapshots prior pointer bytes/existence, runs the fixed compiler command with
an empty temporary HOME and allowlisted environment, then restores the pointer
in `finally` after success, nonzero exit, child termination or spawn error. It
removes only its owned temporary HOME. Default pointer was rechecked as
`../../dist/server/wrangler.json` after actual proposal compilation.

The wrapper refuses project-root `.env`, `.env.*`, `.dev.vars` and `.dev.vars.*`
without reading their contents. The sole exception is tracked `.dev.vars.example`.
Installed Wrangler 4.131.1 `wrangler-dist/cli.js:179391` selects a suffixed
`.dev.vars.<environment>` only when that environment is selected; adapter
`dist/utils/wrangler-config.js` uses `CLOUDFLARE_ENV`. Fixed wrapper arguments have
no `--env` and its environment excludes `CLOUDFLARE_ENV`, making the example inert.
Independent review confirmed this loader behavior. No `.env.*` exception exists.

Builds must run serially. Tests simulate child termination, not guaranteed cleanup
after forcibly killing the parent wrapper; following abnormal parent termination,
inspect/restore the pointer before any runtime command. The proposal was never
started in dev/preview/smoke. Generated proposal output is narrowly excluded from
TypeScript source checking and git tracking; source coverage is unchanged.

## Fresh evidence

| Gate | Result |
| --- | --- |
| Fresh current-main baseline | `npm ci --no-fund`; 247 tests passed. |
| Final default `npm test` | 277 passed, 0 failed/cancelled/skipped, approximately 22.5 seconds. |
| Final Astro check | 54 files; 0 errors, 0 warnings, 2 existing hints. |
| Default Astro build | Passed; synthetic output retained separately. |
| Explicit proposal compile via wrapper | Passed with remote bindings disabled and sanitized environment. |
| Post-compile packaging/wrapper tests | 22 passed; synthetic pointer restored. |
| Existing built-Worker smoke | Passed: missing-config fail-closed, missing/malformed token refusals, synthetic reads, cross-origin POST refusal. |
| Fresh `npm audit --json` | 0 findings, all severities. |

The final check and 22 focused tests were rerun after a test-only assertion
removed a newly introduced unused-argument hint. No runtime source changed after
the passing full suite/build/smoke. Root independently reran `npm test` on final
commit `87160f3`: **277 passed, 0 failed/cancelled/skipped**, 20.535 seconds
(session `53470`, chunk `f02a3b`, exit 0); the two-Worker case passed in 15.828
seconds. Root also independently verified all four artifact hashes below and
the clean local worktree.

The full suite includes actual two synthetic Workers, positive-controlled
outbound denial, credential-bearing redirect refusal and real header/body
deadlines. These are local fixtures, not live API or credential-scope acceptance.

One earlier 276-test run timed out the unchanged HTTP/WebSocket runtime test at
20 seconds (275 passed, one cancelled). No timeout was increased and no concurrency
setting or product code was changed to mask it. Focused runtime/wrapper/packaging
rerun passed 23 tests; subsequent default full runs passed 276 and then 277.
The timeout cause was not established; it is retained as a transient observation,
not asserted to be proven resource contention or permanently fixed.

Test-first evidence includes expected missing-proposal failures, pointer-contamination
failure, eight wrapper restoration failures before its implementation, six
dotenv rejection failures before the guard, and the inert-template exception
failure before the narrowly reviewed correction.

## Generated artifact inspection

Both actual generated configs retained disabled `workers_dev`/`preview_urls`,
Node compatibility, Worker-first assets and no KV/R2/D1/DO/queue/Images resources.
The default generated config retained loopback API and no service bindings; the
proposal retained exactly the existing API service binding and expected two
non-secret vars. Each build's six client assets contained no `demo-key`,
`synthetic-key` or `ADMIN_API_KEY` string in a separate byte scan.

| File in worktree admin directory | SHA-256 |
| --- | --- |
| `package-lock.json` | `023a5c91ec134c652010b241955bec7c89e5ee6f85db98275810af8cd5cfa4c5` |
| `wrangler.production-proposal.json` | `0a401a667dc05f7b2fee8e21894318cdbec3e621a70c249a71c164f0d2939e72` |
| `dist-production-proposal/server/wrangler.json` | `a48350ef956994a6ec620a96d6178850763227afc42470599990b81d0e341293` |
| `dist-production-proposal/server/entry.mjs` | `18950a8e63de13e8bded1f54907afff60c14270ce1180f559ddd6f7337cf42d9` |

Generated config contains absolute local source paths, so its hash is a local
artifact identity, not a promise of path-independent byte reproducibility.
Logs are retained locally under `/tmp/admin-release-*`, notably
`baseline-tests.log`, `final-tests.log`, `full-timeout.log`, `runtime-rerun.log`,
`check.log`, `build.log`, `proposal-wrapper-build.log`, `postbuild-isolation.log`,
`smoke.log` and `audit.json` with that prefix. These are temporary files.

## Remaining boundary

No Worker upload, live binding, DNS, Access, secret, backend, store, paid resource,
cache or production operation occurred. This package neither attests the serving
backend scoped-key contract nor proves current Pages authenticated rollback
acceptance, account allowance or name availability at a future upload time.
Those later cutover gates remain required; local packaging is not production
dependency remediation or deployment acceptance.
