# Public-site CSP nonce staging (8sw)

**Staging verified; NOT production-active.** The approved isolated preview at
`https://csp-nonce-review.roammate.com` verified real Cloudflare JSD nonce injection
on 2026-09-12; see the [evidence report](staging-2026-09-12.md) for scope and limits.
This directory remains outside normal Pages Functions and Astro `public/`
deployment paths. `deploy.sh`, production static `_headers`, Astro configuration
and the separate admin project are unchanged. Normal deployments do not include
this middleware. Only staging DNS/custom-domain resources were added; no bot,
WAF or cache rules were changed. **The production CSP issue is not fixed**, and
bead `8sw` remains open pending production review and approval.

The [quota, cost and failure-behavior review](operations-2026-09-12.md) records
observed traffic, pricing assumptions and the recommended public-site failure
policy. It does not authorize production deployment or settings/plan changes.

## Design

An opt-in Pages Function wraps public GET/HEAD HTML responses, creating a fresh
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
drift. If headers change, update both policies before activation.
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
node --test infra/csp-nonce/nonce.test.mjs
roammate.com/node_modules/.bin/tsc --allowJs --checkJs --noEmit --target ES2022 --module ESNext --lib ES2022,DOM --skipLibCheck infra/csp-nonce/functions/_middleware.js
```

Tests cover unique nonce format, exact security-header parity, preservation of
body/headers/status, cache and conditional handling, preview noindex, HEAD/404,
static/admin/API bypasses, routing exclusions and absence from live deploy paths.
They cannot emulate Cloudflare's downstream injection or actual edge caching.

## Explicit staging path — isolated staging approval only

Do **not** copy `functions/` into the repository root or `roammate.com/`, and do
not put `_routes.json` in live `public/`. The approved experiment used this
scratch-only path; it does not authorize production rollout. For a repeat, first
run the ordinary site validation, tests, type check and build. Use a fresh scratch
directory so staging cannot contaminate a subsequent normal deployment:

```sh
# Preparation only; these commands do not deploy.
REPO="$PWD"
STAGE="$(mktemp -d /tmp/roammate-csp-nonce.XXXXXX)"
cp -R "$REPO/roammate.com/dist" "$STAGE/dist"
cp -R "$REPO/infra/csp-nonce/functions" "$STAGE/functions"
cp "$REPO/infra/csp-nonce/_routes.json" "$STAGE/dist/_routes.json"
cd "$STAGE"
# For local platform smoke testing, using a reviewed/pinned Wrangler version:
# npx wrangler pages dev dist --compatibility-date=2026-09-12
```

After explicit deployment approval, run Wrangler from **that scratch directory**
with output `dist`, project `roammate`, and a new **non-production** branch such as
`csp-nonce-review`; never `main`. `functions/` must be at Wrangler's working-directory
root, while `_routes.json` belongs in the output root. Verify the CLI builds the
Function and retains the supplied exclusions before accepting the upload. No
Wrangler deploy command is automated by this template. The approved manual
staging upload and staging-only noindex header copy are recorded in the report.
See [Pages routing](https://developers.cloudflare.com/pages/functions/routing/)
and [Function next API](https://developers.cloudflare.com/pages/functions/api-reference/).

Preview checks must confirm repeated GETs have distinct header nonces; HEAD,
conditional GET and 404 responses have correct status and security headers; HTML
is not an edge HIT; static assets retain immutable caching and avoid invocations;
preview remains noindexed; redirects and admin/API behavior remain unchanged.
Browser checks must also confirm navigation, PostHog and Cloudflare Insights.

**A `pages.dev` preview alone cannot prove zone JSD compatibility.** Before
production approval, test through an explicitly approved proxied hostname in the
same zone with equivalent JSD settings (and extend the host allowlist for that
hostname). Confirm an injected script's `.nonce` property matches its document's
CSP nonce, challenge-platform requests succeed, and no JSD CSP violation remains.
Test multiple navigations/fresh browser contexts: injection need not occur on
every response. Do not change bot settings or WAF enforcement for this experiment.

## Cost, activation and rollback

HTML will move from static serving to a Function invocation per matching request;
`no-store` also removes HTML browser/CDN reuse and may affect repeat-view latency.
Static exclusions preserve current asset caching and avoid Function billing for
those paths. Review traffic, Workers/Pages quotas, failure mode on quota exhaustion,
and projected cost before enabling production; staging neither purchased a plan
nor changed limits. Pages Free Functions share the Workers Free allowance of
100,000 requests/day; static requests that do not invoke Functions are free.
Account subscription reads were unavailable (MCP authentication error; authorized
direct API returned 403), so the account plan, headroom and Free eligibility
remain unverified. Both production and preview currently have `fail_open: true`;
decide quota-exhaustion policy
explicitly before rollout, and do not change it without approval.
See [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/).

Production activation needs separate approval and an explicit deployment workflow
change after staging evidence is recorded on bead `8sw`. Do not close `8sw` merely
because staging passes. The unchanged production deployment observed during
staging was `a70bd978-9b79-48e1-98ea-f0e95f62ab50`; recheck the last known-good static deployment ID
before rollout. If approved rollout fails, restore that static Pages deployment;
the current unchanged normal deploy path also produces a static-only build.
Verify removal of the Function and restoration of existing static headers after
rollback. The original JSD CSP violation may return, but script policy must not
be weakened as a fallback.
