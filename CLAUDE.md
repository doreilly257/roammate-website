# roammate Website

## Ground Rules

- **No GitHub CI on this repo.** `.github/workflows/ci.yml` was removed 2026-08-29 by
  explicit instruction. Do not re-add a workflow, re-trigger one, or suggest it.
- **Verification is local, and now enforced.** `npm run build` runs `validateBuiltLinks()`
  but does **not** type-check. That gap let `routeOverview[i+1].colour` reach `main` in
  547513d, rendering `undefined` into every route-map gradient for ten days while the
  build passed. There is now a pre-push hook:

      git config core.hooksPath .githooks      # once per clone

  It runs `npx astro check` when `.astro`/`.ts` files changed, and
  `node scripts/check-claims.mjs` when copy changed. Bypass with `git push --no-verify`
  and say so in the PR — both checks exist because something shipped.
- **Copy claims are linted.** `scripts/check-claims.mjs` fails if the site reintroduces a
  claim whose gate is closed: mandatory identity verification (the mandate is inert),
  request-to-join (route gated off), the AI Concierge (endpoint 404s), or SMS alerts (SMS
  was removed 2026-08-25). A rule needs evidence the CLAIM is false — a flag that is off,
  an endpoint that 404s, a route that is gated. An open ticket near a claim is a reason to
  look, never a reason to add a rule: ticket titles describe work remaining, claims
  describe capability, and they share nouns. Retire a rule by SHIPPING the feature and
  deleting the rule, never by softening the sentence until it stops matching.
  A clean run means no LISTED claim matched a KNOWN-FALSE pattern. It does not mean the
  copy is honest.
- **This session is website-only.** Backend and mobile work goes to the
  `roammate-app-ios` / `roammate-app-android` sessions via SendMessage. The backend lives
  in `roammate-app-ios/api`. When told to hand something off, stop investigating it
  immediately and report the handoff — do not keep digging.
- Those sessions cannot write to beads in this workspace, so relay their findings onto
  the relevant bead here on their behalf.

## Verification Before Commit

- **Never report something as done, fixed or green that you did not watch pass.** Say
  which checks actually ran and name the ones still unverified. On 2026-09-19 a commit
  message naming a bead was reported up as "fixed, committed and pushed"; the commit did
  not compile. A commit message is not evidence.
- **Anything that reports health must be shown capable of failing before its green is
  trusted.** Mutation-test the gate, run the control with bad input, see the red first —
  and confirm it still passes on correct code, because always-red is the same fault
  wearing the other mask. Five defects in three days were all one shape: something
  reporting a state that was not true. `scripts/check-claims.mjs` says this in its own
  header: a clean run means no LISTED claim matched a KNOWN-FALSE pattern, nothing more.
- A bug closes when it is fixed **and** a test covering it has run green — Daniel,
  2026-09-19.
- **A claim in a comment, README or CLAUDE.md is an assertion nobody checked.** It
  has the authority of being in the repo and none of the verification. `auth.ts`
  accepted `com.roammate.services` as an Apple audience under "Keep backward
  compatibility across historical Apple client IDs"; that Services ID has never
  existed. The comment landed 2026-02-10, propagated into the iOS CLAUDE.md as a
  required audience, and was repeated as fact for seven months. Before repeating
  a claim about **external state** — registered identifiers, console config,
  deployed flags, third-party setup — go and look. When writing one, state what
  the code REQUIRES, or date it and name who verified it.

## Destructive Command Guardrails

- `bd update --notes` **OVERWRITES**. Use `--append-notes`. This destroyed a bead's
  history once and it had to be reconstructed from context and labelled as reconstructed.
- Capture prior state before mutating anything you cannot trivially undo — production
  rows, bead schema, store metadata. A 3-row delete from production D1 on 2026-09-19 was
  backed up first, which is why the surprising `changes: 3` could be checked rather than
  panicked about.
- Never delete, clean or modify files in a repo another session is working in, even
  regenerable build output. Message the owning session. Directory mtime and a single
  `pgrep` cannot prove a build tree is idle.

## Local Environment

- `lean-ctx` rejects paths outside the active project root. Use native `Read` for files
  in the mobile repos or elsewhere outside this one, rather than retrying `ctx_*` calls.
- One heavy job at a time on this 8 GB Mac: `~/.claude/heavy-lock.sh take|release|status`
  before any site build, deploy or `git push` (the pre-push hook runs `astro check`).
  Release it in the same step the job finishes, not at the start of the next one.

## Project Structure

- `roammate.com/` — Astro site for roammate.com
- `www.old/` — Legacy static HTML site (archived, not deployed)
- `deploy.sh` — Builds and deploys to Cloudflare Pages at roammate.com

## Deployment

- Hosted on **Cloudflare Pages**, project `roammate` (`roammate-cs7.pages.dev`)
- CNAME: `roammate.com` → `roammate-cs7.pages.dev` (proxied)
- `www` → apex 301 is a zone-level Redirect Rule, independent of the host
- Deploy command: `bash deploy.sh` (production) or `bash deploy.sh --preview`
  - Requires `npx wrangler login` once, or `CLOUDFLARE_API_TOKEN`
  - Aborts if `roammate.com/.env` lacks a real `PUBLIC_POSTHOG_KEY` — a build
    without it silently ships with analytics disabled
  - Uploads are incremental; only changed files go over the wire

### Response headers

`roammate.com/public/_headers` is Pages-only config (never served as a file):
security headers site-wide, `immutable` year-long caching for `/_astro/*`,
`/images/*`, `/fonts/*`, and `X-Robots-Tag: noindex` scoped to `*.pages.dev`
so preview deployments stay out of the index. Host-scoped rules only match
that host — verified, the `noindex` does not reach `roammate.com`.

Pages serves `/404.html` automatically with a 404 status, 308-redirects
`/path` → `/path/` (matching `trailingSlash: 'always'`), and skips dotfiles
on upload except `.well-known/`.

## SEO Files

**IMPORTANT**: `robots.txt`, `sitemap.xml`, and `llms.txt` in `roammate.com/public/` must be updated:
- Before any deployment that adds, removes, or restructures pages
- When adding new pages to `roammate.com/src/pages/`
- When changing URL paths or page slugs

All pages must include a canonical link tag (handled automatically by `BaseLayout.astro`).

## RSS Feed

- RSS feed is generated at build time via `@astrojs/rss` at `src/pages/rss.xml.ts`
- Available at `https://roammate.com/rss.xml`
- Includes all city guides, place guides, backpacker routes, and static pages
- Dates are deterministically generated from slug hashes (consistent across builds)
- **Must be kept in sync**: When adding new guides or routes, update the RSS endpoint if the data source changes (currently auto-reads from `guides.ts`)
- The `robots.txt` should reference the RSS feed URL

## Agent Workflow

**Always spawn subagents** (via the Task tool) for creating, updating, or modifying guide pages and other content. The main conversation thread should remain available as a supervisor — delegating work to subagents and coordinating results. Never block the main thread with long-running file creation tasks.
