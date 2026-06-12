// @ts-check
import { defineConfig } from 'astro/config';
import critters from 'astro-critters';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://roammate.com',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  compressHTML: true,
  prefetch: true,
  integrations: [sitemap(), critters({ pruneSource: true, preload: 'swap' })],
});
