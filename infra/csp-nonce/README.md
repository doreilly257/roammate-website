# Public-site CSP nonce middleware (8sw)

**Production active; sampled live HTTP and browser verification passed.** Public
Pages deployment `8a9276b8-5cd8-4908-b8ae-71567eb0bc37` (source `8925d4b`)
was created at 16:24:40 UTC on 2026-09-12. See the
[production verification report](production-2026-09-12.md) for evidence and limits. The
isolated preview at `https://csp-nonce-review.roammate.com` verified real
Cloudflare JSD nonce injection on 2026-09-12; see the historical
[evidence report](staging-2026-09-12.md). The user subsequently approved public-site
production deployment. The sampled production pages now show matching JSD/header
nonces with no observed CSP violations; this does not guarantee every future
request, browser, cost or indexing outcome.

Normal `deploy.sh` production and preview deployments now include this reviewed
middleware and routing configuration, assembled in a temporary scratch directory.
Astro `public/` and `dist/` remain static; do not copy Functions or `_routes.json`
into either source path. The separate admin project is unaffected. No bot, WAF,
cache, plan or failure-mode settings change is part of this rollout.

The historical [quota, cost and failure-behavior review](operations-2026-09-12.md)
records observed traffic, pricing assumptions and the public-site failure policy.
The user confirmed Workers Paid and subsequently approved deployment; earlier
staging-only approval statements in those dated reports describe that earlier
stage, not the current authorization.

## Design

The reviewed Pages Function wraps public GET/HEAD HTML responses, creating a fresh
256-bit nonce with Web Crypto and appending it only to `script-src` in the CSP
response header. External first-party bundles continue to use `'self'`. The
existing PostHog and Cloudflare Insights origins remain allowed. No
`script-src 'unsafe-inline'`, fixed nonce, build-time nonce, `strict-dynamic`,
or new script host is introduced. Existing inline-style permission is unchanged.

There is deliberately no HTML rewriting: noncing every script would also bless
untrusted injected markup. Cloudflare documents that its JSD injector reads the
**response-header** nonce and attaches it to its own injected scripts; meta CSP
nonces are unsupported. The same-origin challenge-platform scripts are already
allowed by `'self'`. See [Cloudflare JSD CSP guidance](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-you-have-a-content-security-policy-csp).

Pages does not apply `_headers` to Function-generated responses, so middleware
sets all five current security headers explicitly, preserves other origin
headers, and restores `noindex, nofollow` on this project's Pages preview hosts
and the explicitly allowlisted `csp-nonce-review.roammate.com` staging host.
The test compares runtime policy against the real static `_headers` to catch
drift. If headers change, update both policies before deployment.
An upstream enforced CSP is accepted only when absent or exactly equal to that
reviewed baseline. Any different/duplicate policy fails closed with an exception,
rather than silently deleting new restrictions. There is no exception bypass;
operators must resolve the mismatch before rollout.
See [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).

HTML responses, including 404s and HEAD, use `no-store` for browser, CDN and
Cloudflare CDN caches. Validators and incoming range/conditional headers are
removed to avoid reusing an old nonce-bearing representation. Bodies stream
unchanged; the middleware does not buffer HTML, log nonces, use a cache API, or
store request state globally. Do not introduce `no-transform` (it prevents JSD
injection). Review zone Cache Rules and response-header transforms before any
activation: an overriding HTML Edge TTL or duplicate CSP could defeat this design.

`_routes.json` bypasses Functions for existing static asset directories, discovery
files, icons, admin/API and Cloudflare-owned paths. Unknown extension-bearing
resources also bypass nonce handling inside the middleware, but can still incur
an invocation; add new static namespaces to the route exclusions. Unknown HTML
URLs still run middleware so asset-server 404s retain their protection. Redirects
and non-HTML responses do not receive nonces. Admin/API subdomains fail the host
allowlist even if this template is accidentally invoked there. New staging
custom domains require explicit host-allowlist review.

## Local verification (safe; no deployment)

From repository root:

```sh
node --test infra/csp-nonce/*.test.mjs
roammate.com/node_modules/.bin/tsc --allowJs --checkJs --noEmit --target ES2022 --module ESNext --lib ES2022,DOM --skipLibCheck infra/csp-nonce/functions/_middleware.js
```

Tests cover unique nonce format, exact security-header parity, preservation of
body/headers/status, cache and conditional handling, preview noindex, HEAD/404,
static/admin/API bypasses, routing exclusions and scratch-only deployment assembly.
They cannot emulate Cloudflare's downstream injection or actual edge caching.

## Normal production and preview deployment

From repository root, use `bash deploy.sh` for production or
`bash deploy.sh --preview` for the normal Pages preview branch. Both paths pin
Wrangler **4.131.1** and run authentication, nonce tests/type-check, public content
validation, unit tests, Astro type-check, build/link validation and claims checks
before uploading. The script requires the existing public PostHog key guard.

After those gates, the script creates a fresh temporary directory, copies Astro
`dist/` there, places reviewed `functions/` at the scratch working-directory root
and `_routes.json` inside scratch `dist/`, and deploys from that directory.
The temporary assembly is removed on exit. A normal deployment therefore retains
the nonce fix; **it is no longer a static-only rollback path**.

Do not copy `functions/` into repository root or `roammate.com/`, or put
`_routes.json` in Astro `public/` or generated `dist/`. Tests preserve that source
isolation while checking the deploy script includes the reviewed scratch assets.
The earlier isolated `csp-nonce-review` branch/custom-domain procedure and its
staging-only noindex copy remain documented in the dated staging report. Repeating
that special staging experiment requires reviewing its explicit host allowance;
the ordinary `--preview` command deploys the normal `preview` branch instead.
See [Pages routing](https://developers.cloudflare.com/pages/functions/routing/)
and [Function next API](https://developers.cloudflare.com/pages/functions/api-reference/).

Preview checks must confirm repeated GETs have distinct header nonces; HEAD,
conditional GET and 404 responses have correct status and security headers; HTML
is not an edge HIT; static assets retain immutable caching and avoid invocations;
preview remains noindexed; redirects and admin/API behavior remain unchanged.
Browser checks must also confirm navigation, PostHog and Cloudflare Insights.

**A `pages.dev` preview alone cannot prove zone JSD compatibility.** For any material middleware change, repeat testing through an explicitly approved proxied hostname in the
same zone with equivalent JSD settings (and extend the host allowlist for that
hostname). Confirm an injected script's `.nonce` property matches its document's
CSP nonce, challenge-platform requests succeed, and no JSD CSP violation remains.
Test multiple navigations/fresh browser contexts: injection need not occur on
every response. Do not change bot settings or WAF enforcement for this experiment.

## Cost, activation and rollback

On activation, HTML moves from static serving to a Function invocation per matching request;
`no-store` also removes HTML browser/CDN reuse and may affect repeat-view latency.
Static exclusions preserve current asset caching and avoid Function billing for
those paths. Review traffic, Workers/Pages quotas, failure mode on quota exhaustion,
and projected cost before enabling production; staging neither purchased a plan
nor changed limits. The user confirmed **Workers Paid**; no plan upgrade is
needed. The Free 100,000/day allowance is only a hypothetical comparison, not
this account's active limit. Static requests that do not invoke Functions are
free. Account subscription reads were unavailable (MCP authentication error;
authorized direct API returned 403), so plan confirmation comes from the user,
not the API; actual invoices and aggregate billed CPU remain unknown, with no
zero-cost guarantee. Both production and preview have `fail_open: true`; retain
that existing setting for the public nonce-only Function as recommended in the
operations review. Free quota exhaustion is not a current Paid runtime concern.
Production deployment is now approved; record the rechecked rollback target and
post-deployment verification. No settings change is authorized.
See [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/).

Production activation is approved and the normal deployment workflow now includes
this middleware. Do not close `8sw` merely because staging passes: record the
production deployment ID and successful live checks first. The static production
deployment observed during staging was `a70bd978-9b79-48e1-98ea-f0e95f62ab50`;
this is historical evidence, **not an automatically valid rollback target**.
Recheck and record the actual last known-good Pages deployment immediately before
rollout. If rollout fails, use Cloudflare Pages rollback to that rechecked
known-good deployment, not a normal `deploy.sh` invocation (which includes the
Function). Verify the restored deployment's routing and security headers; if the
selected known-good deployment is static, confirm the Function is absent. The
original JSD CSP violation may return after a static rollback, but script policy
must not be weakened as a fallback.
