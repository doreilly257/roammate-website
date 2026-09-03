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
   Pages Function. `ADMIN_API_KEY` also authorises `POST /v1/admin/migrate`, so
   a page that shipped it to the client would be handing out database
   migrations. This is the reason the console is server-rendered at all.

Form POSTs are protected by Astro's `security.checkOrigin` (verified: a POST
without a matching `Origin` returns 403).

### Use a narrower key

The API now reads `ADMIN_READ_KEY` and falls back to `ADMIN_API_KEY`. Provision
the narrower key on the Worker and give the console only that one.

**Caveat:** `/v1/admin/flags` (GET and PUT) predates this and still checks
`ADMIN_API_KEY` only. With just the read key configured, the flags page will show
a 401 and say so. Either keep using the master key, or update those two handlers.

## Deployment state (2026-09-03)

| Step | State |
|---|---|
| Pages project `roammate-admin` | done |
| Deployed | done |
| DNS `admin.roammate.com` | done |
| Cloudflare Access | **done** — all three hostnames redirect to login |
| `ADMIN_API_KEY` secret | **not set** — deliberate, see below |
| API deployed | **not done** — branch `admin-console-api` is unmerged |

Access covers `admin.roammate.com`, `roammate-admin.pages.dev` **and**
`*.roammate-admin.pages.dev`. The wildcard is not belt-and-braces: every Pages
deployment gets its own subdomain (`362b03b7.roammate-admin.pages.dev`), and a
policy naming only the bare hostname leaves each one publicly reachable.
Verified: all three return 302 to the Access login with no data in the body.

    team domain  quiet-hall-00a9.cloudflareaccess.com
    login        One-time PIN, pinned via allowed_idps
    allowed      dan@roammate.com

`ACCESS_AUD` is the **primary host's** AUD only. The two pages.dev applications
exist to block at the edge, not to grant: a token minted for one of them carries
a different `aud`, and the middleware rejects it. The console is reached at
admin.roammate.com or not at all.

### What is left

1. **Merge and deploy `admin-console-api`** (roammate-app-ios). Until then
   `/v1/admin/*` does not exist and every page shows a fetch error.
2. **Set `ADMIN_API_KEY`**: `ROAMMATE_ADMIN_API_KEY=<key> node dev/setup-access.mjs`,
   then redeploy. Held back on purpose — a console holding a live admin key is
   worth less risk than a console that 503s.

### Re-running the setup

    node dev/setup-access.mjs --dry-run   # plan only, changes nothing
    node dev/setup-access.mjs             # idempotent; skips what exists

It will not create a Zero Trust organisation. One already exists and its team
domain is effectively permanent, since other applications authenticate against
it.

## Deploying

### 1. Create the Pages project

```bash
cd admin.roammate.com
npm install
npm run build
npx wrangler pages project create roammate-admin --production-branch main   # already done
npm run deploy
```

### 2. Set secrets

```bash
npx wrangler pages secret put API_BASE_URL       --project-name roammate-admin
npx wrangler pages secret put ADMIN_API_KEY      --project-name roammate-admin
npx wrangler pages secret put ACCESS_TEAM_DOMAIN --project-name roammate-admin
npx wrangler pages secret put ACCESS_AUD         --project-name roammate-admin
```

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
