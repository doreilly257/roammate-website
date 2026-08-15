// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
        // Programmatic guide pages get a stable per-slug date (same scheme as
        // the RSS feed) so lastmod doesn't falsely refresh on every build;
        // curated pages get the build date, since deploys ship real edits.
        const url = new URL(item.url);
        const programmatic = /^\/(best-time-to-visit|budget|statistics|guides|routes)\//.test(url.pathname);
        if (programmatic) {
          let hash = 0;
          for (let i = 0; i < url.pathname.length; i++) hash = (hash * 31 + url.pathname.charCodeAt(i)) | 0;
          const EPOCH = Date.UTC(2024, 0, 1);
          item.lastmod = new Date(EPOCH - (Math.abs(hash) % 365) * 86_400_000).toISOString();
        } else {
          item.lastmod = new Date().toISOString();
        }
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
