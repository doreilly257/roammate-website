# Dependency upgrade notes

## September 2026 baseline

Use Node.js **`^22.20.0 || ^24.12.0 || >=26.0.0`** and npm **9.6.5 or newer**
for both projects. Validation used Node.js **26.8.2**. The lower bounds come from
the dependency engine intersection and were not runtime-tested in this session.
The manifests allow compatible updates with caret ranges; commit each project's
`package-lock.json` and use `npm ci` for reproducible installs.

| Dependency | Public site | Admin |
| --- | --- | --- |
| `astro` | 7.3.2 | 5.18.2 |
| `@astrojs/cloudflare` | Not used | 12.6.13 |
| `@astrojs/rss` | 4.0.19 | Not used |
| `@astrojs/sitemap` | 3.7.4 | Not used |
| `@astrojs/check` | 0.9.10 | 0.9.10 |
| `typescript` | 6.0.3 | 6.0.3 |
| `tsx` | 4.23.13 | Not used |
| `vitest` | 5.0.0 | Not used |
| `wrangler` (direct dependency) | Not used | 4.131.0 |

The public site uses the latest releases checked during this upgrade, except
TypeScript: 6.0.3 is the newest supported by `@astrojs/check`'s `^5 || ^6` peer
range. Installing TypeScript 7 was rejected by npm; do not bypass that check with
`--force` or `--legacy-peer-deps`.

## Keep admin on Cloudflare Pages

The admin deliberately retains Astro 5.18.2 and Cloudflare adapter 12.6.13, the
latest Pages-compatible pair checked during this upgrade. Adapter 13 removed
Pages support. Moving admin to the latest Astro therefore requires a separately
approved hosting migration, not a routine package update. See the
[official Cloudflare adapter migration notes](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#removed-cloudflare-pages-support).

**No Workers migration or deployment was performed.** Admin preview and deploy
commands remain `wrangler pages` commands; the public site remains a static build.

## Audit limitations

The upgrade audit reported **0 vulnerabilities for the public site** and **8 for
admin**. Admin's legacy adapter pins its own Wrangler 4.59.2, separate from the
updated direct Wrangler dependency; that dependency tree and retained Astro 5
packages account for the remaining findings. Audit counts identify affected
dependencies, not demonstrated exploitability in this application, and may change
as advisories are published.

Do not force transitive overrides or run `npm audit fix --force` to erase the
count. Reassess the findings and hosting migration in follow-up work, with
Pages/runtime compatibility testing before changing the adapter major.

## Local verification

Run from the repository root; these commands do not deploy:

```sh
cd roammate.com
npm ci
npm run build
npm test
npm exec astro check
npm audit

cd ../admin.roammate.com
npm ci
npm run check
npm run build
npm audit
```

The public build includes last-modified generation, sitemap normalisation and
built-output validation against the actual `dist` artefacts. The built-links unit
tests use temporary fixtures instead. Admin has no `test` script; separately smoke-test its local
Pages preview with `npm run preview`. These are reproduction commands, not a
claim that all quality gates have passed.
