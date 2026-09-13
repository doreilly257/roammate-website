# Admin Astro 7 / Workers local evaluation

Date: 2026-09-13. Owner issue: `roammate-website-1wi`.

**Evaluation only, not an approved hosting migration.** Worktree
`.worktrees/admin-workers-evaluation` starts at website `996404c`. Its reproducible
evaluation source is preserved in local-only branch
`evaluation/admin-workers-2026-09-13`, commit
`26449774e009aa1918d39aaba2ae3231421e4926`. The branch was not pushed or merged. Main package,
source and Cloudflare configuration remain unchanged. No deployment, domain,
Access, secret, account resource or production API operation was performed.

## Supported dependency result

Registry checks (`npm view`) returned Astro **7.3.2**, `@astrojs/cloudflare`
**14.3.1**, Wrangler **4.131.1**. Adapter peers require Astro `^7.2.0` and
Wrangler `^4.125.0`; evaluated exact versions satisfy them. Evaluation removed
the old `undici`/`ws` overrides rather than carrying obsolete transitive pins.

| Evidence | Existing main | Isolated evaluation |
| --- | --- | --- |
| Framework / adapter | Astro 5.18.2 / adapter 12.6.13 | Astro 7.3.2 / adapter 14.3.1 |
| `npm audit --json` | 6 findings: 1 critical, 4 high, 1 low | 0 findings, all severities |
| Complete existing admin suite | 247 passing | 247 passing; no skipped tests |
| Astro check | Not rerun for baseline | 0 errors, 0 warnings, 2 existing hints |
| Astro build | Not rerun for baseline | Passed; Worker entry and client assets produced |

Fresh baseline audit is **six**, not the issue's historical eight: prior compatible
overrides already removed two findings. A zero audit is an advisory-database
result, not a proof that the application has no security defects. Node used:
**26.8.2**; install resolved 295 audited packages without new overrides.

## Minimum demonstrated migration

The [official adapter migration documentation](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#upgrading-to-v13-and-astro-6)
removes Pages support and the old adapter runtime environment API. Its supported
entry is `@astrojs/cloudflare/entrypoints/server`; native bindings come from
`cloudflare:workers`. The [Astro 7 guide](https://docs.astro.build/en/guides/upgrade-to/v7/)
also identifies Vite 8 as an upgrade boundary.

- Preserve SSR, origin checking, image passthrough, middleware Access verification,
  server-only API client, strict forms and production-disabled original-media review.
- Import native Worker `env` in middleware and assign **`locals.adminEnv`**;
  replace the twelve pages' old environment access and corresponding offline
  fixtures. `AdminRuntimeBridge` is application-owned, not the removed adapter type.
- Generate runtime types with `wrangler types`; manually declare secret **types**,
  never secret values. The generated file is reproducible from the synthetic
  evaluation configuration, not an export of production bindings.
- Explicit `session: false` avoids automatic unused SESSION KV configuration;
  image passthrough avoids an Images binding. Generated configuration confirmed
  no KV, R2, D1 or Images resources.
- Evaluation Wrangler name is `roammate-admin-local-evaluation`; API URL is
  loopback and Access domain is synthetic. `workers_dev` and `preview_urls` are
  false; no routes or custom domains are configured. Assets run Worker-first.
- Preview uses Astro's supported local preview. The mock demo uses local Wrangler
  with loopback binding, synthetic variables and the new built entry location.
  The evaluation `npm run deploy` deliberately throws instead of uploading.

Two actual compatibility failures were found, not guessed:

1. **`locals.runtime` is read-only in Astro 7.** A same-name compatibility bridge
   passed source tests/build yet the actual Worker returned 500. `astro preview`
   exposed the TypeError; moving to `locals.adminEnv` resolved it. The initial
   `Runtime` type name also collided with adapter-generated globals.
2. **Current Wrangler ships Miniflare `5.20260911.0-alpha`.** The former constructor
   shape failed both runtime tests. Its exported `convertV4MiniflareOptions`
   preserves existing HTTP, WebSocket echo and API credential-redirect assertions.
   Tests use the actual resolved runtime, not an old independently pinned simulator.

## Actual built-Worker acceptance

`node dev/workers-evaluation-smoke.mjs` runs only loopback listeners and synthetic
bindings, with an isolated HOME and remote bindings disabled. All child processes
are stopped afterward. It checks:

- Five routes fail closed with missing Access configuration: 503, no-store,
  noindex, no synthetic key disclosure.
- Configured missing token: 401; malformed token: 403, without a JWKS lookup.
- Synthetic local operator GETs for overview, quality, moderation, users,
  excursions, media, activity, insights and flags: 200, no-store, no key in HTML.
  Overview/quality metric headings and a known fixture user verify real rendering,
  rather than treating any HTTP-200 error page as success.
- Cross-origin synthetic POST to flags: 403. No valid mutation is submitted.

A **separate root-side built-client scan**, not the smoke script, checked all six
generated client assets and found neither the synthetic key nor `ADMIN_API_KEY`.
The independent technical reviewer approved the evaluation and reran **53
Access/runtime tests successfully**; these are a focused subset, not an addition
to the complete 247-test total.

The complete 247-test suite additionally retains signed-JWT issuer/audience/expiry,
forgery, failure/no-store, strict form, limited moderation, accessible rendering,
WebSocket and credential-bearing redirect coverage. No real operator login,
production keyscope, live media playback, production mutation or domain routing
was exercised. No browser visual acceptance is claimed for this evaluation.

Reproduce within the evaluation's `admin.roammate.com` directory:

```sh
npm install --no-fund
npm run types
npm test
npm run check
npm run build
node dev/workers-evaluation-smoke.mjs
npm audit --json
```

Logs retained at `/tmp/admin-workers-{baseline-tests,baseline-audit,final-tests,
final-check,build4,final-smoke,final-audit}.*`; worktree source and lockfile retain
the exact evaluation. Generated runtime types are committed with trailing
whitespace normalized; regenerating them may restore upstream whitespace. Initial failing logs distinguish investigated failures from
the final results.

## Decision and release boundary

**Technically viable locally; not merged or activated.** This is sufficient
evidence for root review of the migration approach, not to close the current
production dependency exposure. Moving from Pages to Workers changes the approved
hosting architecture and needs explicit authorization plus a separately reviewed
deployment/rollback plan.

That review must retain the existing Pages deployment as rollback, protect every
reachable new hostname with the intended Access boundary, establish Worker secret
bindings without exposing or copying the master key to a browser, confirm scoped
backend credentials, and verify authenticated production read/mutation boundaries.
No DEV_BYPASS_ACCESS value belongs in deployed configuration. The evaluation's
loopback vars, disabled deploy command and generated local config are **not** a
production-ready cutover configuration. No cost or resource creation is authorized
by this document; unused sessions and Images remain disabled.
