# Cloudflare reconnect path and search HTML

Date: 2026-09-15. Bead: **trzi**. This report records supervisor-provided read-only local configuration/help, official documentation and public HTML observations. No new probes were performed by its author.

## Reconnect control identified, not executed

Selected nonsecret configuration metadata identifies MCP server `cloudflare` at the HTTP endpoint `mcp.cloudflare.com`, with no environment-variable names listed. Local `codex mcp` / login help confirms the following command is available:

```sh
codex mcp login cloudflare
```

This is an identified reconnect/authentication entry point, **not a command executed in this audit**. OpenAI documents MCP login and `/mcp` inspection for the CLI. [OpenAI MCP guide](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)

Cloudflare documents optional OAuth consent permissions, the **Edit Permissions** control and reauthorization when optional scopes were previously declined. [Cloudflare optional OAuth permissions](https://developers.cloudflare.com/changelog/post/2026-08-22-wrangler-mcp-optional-oauth-scopes/)

For the already approved cache-zone operations, inspect consent for **Zone Cache Rules Edit** and **Cache Purge**, where offered, scoped to `roammate.com`. These are capability/permission labels to look for, not verified literal OAuth scope strings or a complete verified consent-screen inventory. Do not automatically grant broad account access. If the flow requires broader permissions than this scope, pause for a specific approval rather than accepting them.

Plugin/tool permission controls are distinct from OAuth consent scope controls; no plugin-permission call was made. No login, logout, browser authentication or configuration change occurred. This identifies a route to reconnect, not proof that cache-rule editing or purging is now authorized.

## Search HTML observations

Initial public requests using the default Python user agent returned **403 with 17-byte bodies** for both search paths, providing no HTML evidence. Later requests with the previously used custom user agent produced the observations below. The [copied HTML receipt](2026-09-15-cloudflare-reconnect-search-html.json) captures only the slash-page inspection; the non-slash 404 and title were separately observed by the supervisor and are not in that JSON:

| Path | Later observed response |
| --- | --- |
| `/search` | **404**, branded Page Not Found content. |
| `/search/` | **200**, title “Search guides & stories”, H1 “Where to next”, search input present and slash-form canonical URL. |

The requests were not a controlled user-agent experiment. Do not attribute the earlier 403s to a WAF or user-agent causality from these observations.

The custom-user-agent receipt includes the client asset `/_astro/SiteSearch.astro_astro_type_script_index_0_lang.OOJ4i1Wc.js` and other asset references. Absence of an inline Pagefind string does **not** imply the client module is missing: the module may load search dependencies at runtime. No referenced JavaScript was fetched or executed, so input presence and module references do not establish functional search or integrity of the runtime asset graph.

## Boundary

No cache write, purge, deployment or private-record access occurred. The slash/non-slash response difference is observed; neither its cause nor a remedy is proved here. Reconnection and subsequent narrowly approved write verification remain separate from this read-only assessment.
