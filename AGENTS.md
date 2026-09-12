# roammate Website

## Project Structure

- `roammate.com/` — Astro site for roammate.com
- `www.old/` — Legacy static HTML site (archived, not deployed)
- `deploy.sh` — Validates, tests, builds, and deploys to Cloudflare Pages

## Deployment

- Hosted on **Cloudflare Pages**, project `roammate` (`roammate-cs7.pages.dev`)
- CNAME: `roammate.com` → `roammate-cs7.pages.dev` (proxied)
- Production deploy: `bash deploy.sh` (Pages branch `main`)
- Preview deploy: `bash deploy.sh --preview` (Pages branch `preview`; does not update roammate.com)
- Public-site nonce rollout is approved and prepared; live verification is still required before claiming activation. Normal production and preview deployments include reviewed `infra/csp-nonce` Functions/routes via scratch assembly, while Astro `public/` and `dist/` remain static.
- `deploy.sh` pins Wrangler 4.131.1 and runs authentication, nonce tests/type-check, public validation/tests, Astro type-check, build/link validation and claims gates before upload.
- Rollback uses a rechecked known-good Cloudflare Pages deployment. A normal `deploy.sh` invocation now includes the nonce Function and is not a static-only rollback. See `infra/csp-nonce/README.md` for verification and rollback requirements.

## SEO Files

**IMPORTANT**: Review and update `robots.txt` and `llms.txt` in `roammate.com/public/` as needed:
- Before any deployment that adds, removes, or restructures pages
- When adding new pages to `roammate.com/src/pages/`
- When changing URL paths or page slugs

The sitemap is generated, not manually maintained in `public/`: `npm run build` runs
`scripts/build-lastmod.mjs`, Astro's sitemap integration, then
`scripts/normalize-sitemap.mjs` to merge sitemap shards into `dist/sitemap.xml`
and remove the shards/index. Verify the generated sitemap includes page changes
before deployment; keep the sitemap and RSS references in `robots.txt` correct.

All pages must include a canonical link tag (handled automatically by `BaseLayout.astro`).

## RSS Feed

- RSS feed is generated at build time via `@astrojs/rss` at `src/pages/rss.xml.ts`
- Available at `https://roammate.com/rss.xml`
- Includes blog posts with a valid `publishedAt`, all city/place guides, and backpacker routes; static pages are not included
- Blog dates use authored `publishedAt`; guide and route `pubDate` is omitted until source-backed publication metadata exists. Never invent publication dates from slug hashes or build time.
- Items sort by publication date newest first, then undated entries; URL ordering breaks date ties and keeps undated items deterministic across builds.
- **Must be kept in sync**: The endpoint reads blog metadata from `src/lib/blog-data.ts` and guides/routes from `src/data/guides.ts`; update it if those data sources change
- The `robots.txt` should reference the RSS feed URL

## Agent Workflow

**Always spawn subagents** (via the Task tool) for creating, updating, or modifying guide pages and other content. The main conversation thread should remain available as a supervisor — delegating work to subagents and coordinating results. Never block the main thread with long-running file creation tasks.

<!-- BEGIN BEADS INTEGRATION v:1 profile:full hash:d4f96305 -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->
