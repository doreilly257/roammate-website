# Pagefind cache-policy recovery — 2026-09-13

Status: **Authorization received; execution blocked by Cloudflare credential permissions.**
Related issues: `pv7`, `xsf`; Beads remain the status authority.

## Scope and preserved history

The user explicitly approved the Pagefind-only respect-origin browser-TTL
exception, affected JavaScript URL purges and redeployment, plus separate exact
`/search` and `/search/` HTML purges. Root performs authorized configuration and
deployment actions; this report author performs read-only verification only.
No broader cache-policy change, API mutation, admin migration, mobile change or
paid resource is covered by that approval.

The [earlier rollout incident](2026-09-13-production-search-rollout.md) remains
unchanged: deployment `2eb40bea` failed effective runtime cache acceptance and
control-plane rollback returned to `d1d8272a`, with mixed HTTP responses observed.
This recovery report does not retroactively turn that attempt into success.

## Independent rollback recheck

Fresh read-only `curl` GETs to
`https://d1d8272a.roammate-cs7.pages.dev` checked `/`, `/about/`, `/faq/` and
`/guides/bangkok/`: all returned 200, exact `https://roammate.com` canonicals,
`Cache-Control: no-store` and nonce-bearing CSP. These checks re-establish the
candidate's representative HTTP/security behavior; they are not a claim of
uniform current custom-domain restoration or complete browser acceptance.

## Exact approved recovery scope

The proposed operation appends one enabled rule, without replacing the ruleset
or altering the existing rule:

```json
{
  "action": "set_cache_settings",
  "action_parameters": { "browser_ttl": { "mode": "respect_origin" } },
  "enabled": true,
  "expression": "(http.host eq \"roammate.com\" and starts_with(http.request.uri.path, \"/pagefind/\"))",
  "ref": "pagefind_respect_origin",
  "description": "Respect origin browser cache headers for Pagefind release assets only"
}
```

The exact approved purge allowlist is:

```text
https://roammate.com/search
https://roammate.com/search/
https://roammate.com/pagefind/pagefind.js
https://roammate.com/pagefind/pagefind-modular-ui.js
https://roammate.com/pagefind/pagefind-highlight.js
https://roammate.com/pagefind/pagefind-worker.js
https://roammate.com/pagefind/pagefind-ui.js
https://roammate.com/pagefind/pagefind-component-ui.js
```

Root verified the six JavaScript filenames against the actual local build.
This is not an all-cache purge, zone-wide browser-TTL change or wildcard purge.
The separately approved HTML cleanup and Pagefind recovery scopes remain distinct.

## Actual attempted operations and credential boundary

Root reported the following results; no successful mutation is inferred:

- MCP single-rule append POST failed with authentication code **10000**.
- MCP purge POST for **only the two HTML URLs** failed with authentication
  code **10000**. The six JavaScript URL purges were **not attempted** afterward;
  this was not one failed eight-URL purge request.
- A direct ruleset GET with the existing Wrangler OAuth credential returned
  HTTP **403**, code **10000**, before any direct write was attempted.
- Available Wrangler scopes included zone read and Pages write, not the required
  cache permissions. No Cloudflare token was present in the checked environment.
  Earlier successful rule setup used a user credential that was not persisted;
  no historical credential was recovered or exposed.

The baseline MCP read showed ruleset version 1 with its one existing rule.
Root's final read confirmed it remained version 1 with only existing rule
`735fae` (version 1), global browser TTL remained `2678400`, and canonical
production remained `d1d8272a`. The before/after ruleset evidence is unchanged.
**No cache rule, cache setting or purge was changed, and no recovery redeployment
was performed.** Root requested a reconnected Cloudflare integration or securely
provided environment credential with Cache Rules Edit and Cache Purge scoped to
`roammate.com`; no secret should be pasted into chat. User approval of the
operations is already present—the blocker is usable credential capability.

## Acceptance remains unexecuted

No new deployment identity, 128-asset verification or browser acceptance is
claimed for recovery. After the credential prerequisite is satisfied, execution
must stay within the approved payload/URL list and then recheck effective
custom-domain cache headers, release hashes and browser behavior. Previous
incident hash checks do not substitute for verification of a future recovery.
