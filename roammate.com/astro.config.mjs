// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

// slug -> ISO date of the last commit touching that guide's content file.
// Written by scripts/build-lastmod.mjs, which runs before `astro build`.
let guideLastmod = {};
try {
  guideLastmod = JSON.parse(fs.readFileSync('./src/data/guide-lastmod.json', 'utf8'));
} catch {
  // Fresh clone before the script has run; fall back to the build date below.
}

export default defineConfig({
  site: 'https://roammate.com',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  compressHTML: true,
  prefetch: true,
  integrations: [
    sitemap({
      serialize(item) {
        // lastmod lets Google prioritize crawl scheduling across the ~3k URLs.
        // Pages derived from a guide take that guide's real last-edit date from
        // git: stable across rebuilds (the point of the old hash scheme) but
        // also TRUE, which the hash was not -- it stamped ~1,800 URLs with
        // dates in 2023, before the site existed, telling Google they had been
        // stale for years. Curated pages keep the build date, since a deploy of
        // a hand-written page does ship real edits.
        const url = new URL(item.url);
        const m = url.pathname.match(
          /^\/(?:guides|budget|statistics|best-time-to-visit|companions)\/([^/]+)\/$/
        );
        const itin = url.pathname.match(/^\/itinerary\/(.+?)-\d+-day\/$/);
        const slug = m?.[1] ?? itin?.[1];
        item.lastmod = (slug && guideLastmod[slug]) || new Date().toISOString();
        return item;
      },
    }),
  ],
  // Force all scripts to external files so the CSP script-src can drop
  // 'unsafe-inline' — every script is then covered by 'self'. (See BaseLayout CSP.)
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
