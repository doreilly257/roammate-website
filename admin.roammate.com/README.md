# roammate admin console

Operator dashboard at `admin.roammate.com`. Server-rendered Astro on Cloudflare
Pages, reading the roammate Worker API. Separate Pages project from
roammate.com on purpose: the marketing site is 3,498 static pages with a strict
CSP, and a broken admin build must never be able to block a roammate.com deploy.

## What it does

| Page | Purpose |
|---|---|
| `/` | Counts for users, excursions, content and queues, with 30-day sparklines |
| `/activity` | Unified log: signups, excursions, joins, uploads, reports, SOS, verifications, moderation. Filterable, cursor-paged |
| `/users` | Search and filter accounts; detail page shows everything a user has done |
| `/excursions` | Search and filter excursions; detail shows participants, reports, albums |
| `/media` | Photos and video published into shared albums |
| `/moderation` | Report queue **showing the reported content itself**, with dismiss / eject. Plus the moderation audit trail |
| `/flags` | Read and toggle production feature flags |

## Look at it right now

```bash
npm install     # first time only
npm run demo
```

Then open **http://localhost:4331**. That builds the console, starts a mock API
with realistic data, and serves the built output under workerd — the same
runtime as production. No credentials, no Cloudflare account, no risk of a stray
eject landing on a real account.

The mock data is shaped to exercise the edge cases rather than to look tidy: an
ejected user, a soft-deleted excursion, an overdue report, and reports of all
four target types.

`npm run demo` sets `DEV_BYPASS_ACCESS=1`, which skips Access verification.
That is safe only because wrangler binds to localhost. Never set it in
production; the middleware fails closed without it.

## Security model

Three layers, and the reasoning matters more than the code:

1. **Cloudflare Access** in front of the hostname (email OTP or Google SSO).
2. **JWT verification on every request** (`src/middleware.ts`). Access protects
   the *hostname*, but a Pages project is also reachable at its `.pages.dev`
   address, which the Access policy does not cover. Without verification,
   anyone who guesses that name gets an admin console that can eject users. The
   middleware checks the signature against the team JWKS, pins `alg` to RS256,
   and requires `iss` and `aud` to match. It **fails closed**: unconfigured
   means denied, never allowed.
3. **The admin key never reaches a browser.** Every API call happens in the
   Pages Function. Its `ADMIN_API_KEY` binding must contain the backend's
   scoped `ADMIN_CONSOLE_KEY` value, **not** the backend master `ADMIN_API_KEY`.
   The shared binding name does not mean the values should be the same across
   services. Neither credential belongs in browser code or rendered output.

Form POSTs are protected by Astro's `security.checkOrigin` (verified: a POST
without a matching `Origin` returns 403).

### Use the scoped console key

The required mapping is **Pages `ADMIN_API_KEY` = backend `ADMIN_CONSOLE_KEY`**,
with the scoped value distinct from the backend master `ADMIN_API_KEY`.
The inspected backend console routes and `/v1/admin/flags` GET/PUT handlers use
`isConsoleKey`, which accepts the scoped key while retaining master compatibility.
That compatibility is not permission to give the console the master key. A 401
requires checking deployment compatibility and binding provenance, never a
master-key fallback.

**Current evidence (September 14):** binding presence and deployed authorization
support are verified, but the encrypted Pages value's scope remains unknown.
See the [bounded consumer inventory](../docs/superpowers/verification/2026-09-14-admin-key-consumer-inventory.md)
and [verification/remediation procedure](../docs/superpowers/plans/2026-09-14-admin-key-verification-remediation.md).
Do not infer current key equality from this README or a successful request on a
route accepting both keys. Secret access, provisioning, rotation and deployment
require their separately reviewed approval and recovery gates.

## Historical deployment record — September 3, 2026

The September 3 record reported a working production console behind Access.
This is historical context, **not current deployment or credential attestation**.

    hostname     admin.roammate.com
    auth         Cloudflare Access, one-time PIN, dan@doreilly.com only
    team domain  quiet-hall-00a9.cloudflareaccess.com
    API          https://api.roammate.com  (/v1/admin/*, merged 7fadda2)
    console key  reported as ADMIN_CONSOLE_KEY (historical, not re-attested)

The record described Access covering three hostnames: the custom domain, roammate-admin.pages.dev, and
*.roammate-admin.pages.dev. The wildcard is load-bearing — each Pages deployment
gets its own subdomain, and a policy naming only the custom domain leaves every
one of them publicly reachable.

### Historical scoped-key provisioning

The September 3 narrative reports creating a scoped key while leaving the
existing master untouched, and reports rejection of a historical migration-route
probe. **Do not repeat that probe:** the route can mutate the database. The
narrative does not prove current secret values, recoverability or deployment
bindings. The scoped key now exists; do not treat this old creation account as
authorization to overwrite it or assume its consumer/rollback requirements.

### Non-secret vars belong in wrangler.jsonc, NOT the dashboard

`wrangler pages deploy` syncs plain-text vars FROM wrangler.jsonc and DELETES any
it does not find there. Setting API_BASE_URL and ACCESS_TEAM_DOMAIN by API worked,
reported success, showed correctly on a read-back — and was then silently wiped by
the very next deploy, taking the console down with a 503 while every API response
still claimed the variables were set. The two that survived were secrets;
secret_text is unaffected, which is what made the pattern legible.

So: plain vars live in `wrangler.jsonc` under `vars` (committed, they are not
secret). Secrets — ADMIN_API_KEY, ACCESS_AUD — are set by API and stay out of
source control. Verified by deploying twice in a row and confirming all four
variables survived.

Separately, Cloudflare's Pages PATCH REPLACES env_vars rather than merging, so
any API write must send the complete set. dev/setup-access.mjs does.

### What must never regress

An unauthenticated request to any of the three hostnames must 302 to the Access
login, and no response may contain the admin key or console markup. Re-check with:

    curl -s -o /dev/null -w '%{http_code}\n' https://admin.roammate.com/     # 302
    curl -s -o /dev/null -w '%{http_code}\n' https://roammate-admin.pages.dev/  # 302

## Deploying

These commands are reference examples, **not authorization to change production**.
Revalidate the exact artifact, target environment, Access protection, bindings and
rollback/recovery before any separately approved change. A project secret update
does not attest an existing immutable deployment's binding; the reviewed new
deployment must consume the intended configuration.

### 1. Create the Pages project

```bash
cd admin.roammate.com
npm install
npm run build
npx wrangler pages project create roammate-admin --production-branch main   # already done
npm run deploy
```

### 2. Keep plain variables and secrets separate

Keep `API_BASE_URL` and `ACCESS_TEAM_DOMAIN` in `wrangler.jsonc` under `vars`;
do not provision them as secrets. Only the actual secret bindings appear below:

```bash
npx wrangler pages secret put ADMIN_API_KEY      --project-name roammate-admin
npx wrangler pages secret put ACCESS_AUD         --project-name roammate-admin
```

For Pages `ADMIN_API_KEY`, only use the approved, provenance-verified backend
scoped `ADMIN_CONSOLE_KEY` value, never the master. Do not paste values into
documentation, chat or shell arguments; follow the secure procedure above.

`ACCESS_TEAM_DOMAIN` is like `roammate.cloudflareaccess.com`. `ACCESS_AUD` is the
Application Audience tag from the Access application in step 4.

Do **not** set `DEV_BYPASS_ACCESS` in production. It disables all authentication.

### 3. Custom domain

Add `admin.roammate.com` to the Pages project (Custom domains), which creates the
CNAME. This is a different hostname from roammate.com and does not touch it.

### 4. Cloudflare Access application

Zero Trust → Access → Applications → Add → Self-hosted:

- Application domain: `admin.roammate.com`
- Session duration: 24h is reasonable
- Policy: Allow, with `Emails` = the operator addresses
- **Also add a second application for `roammate-admin.pages.dev`** with the same
  policy. The middleware already blocks unverified requests there, but defence
  in depth costs nothing.
- Copy the **Application Audience (AUD) tag** into `ACCESS_AUD`, then redeploy.

### 5. Verify

Open `admin.roammate.com` in a private window. You should be asked to sign in by
Cloudflare, and only then see the console. Confirm `roammate-admin.pages.dev`
does **not** serve the console to an unauthenticated request.

## Local development

```bash
cp .dev.vars.example .dev.vars   # then fill in
npm run build && npx wrangler pages dev ./dist --port 4331
```

`npm run dev` (astro dev) currently fails: the Cloudflare adapter tries to open a
remote preview session against the account and cannot get a token. Building and
running under `wrangler pages dev` works and is closer to production anyway.

### wrangler.jsonc is load-bearing

Without it, wrangler walks **up** the directory tree, finds `~/wrangler.toml`
(an unrelated `chatcv` project) and attaches that project's D1, R2 and KV
bindings to this Worker. That actually happened during development. Keep the
file.

## API

Endpoints live in `roammate-app-ios/api/src/routes/admin-console.ts`, mounted at
`/v1/admin` **above** `authMiddleware` so they authenticate by admin key rather
than by user session. They must stay there: below the gate, an operator would
also need a user JWT, which is exactly what makes `moderation.ts`'s own
`/admin/reports` unusable server-to-server.

**Private message content is deliberately not browsable.** The console shows
message counts and volume, and reveals the text of a single message only when it
is the target of a report. A "read all DMs" view is not something an operator
console should put one click away.
