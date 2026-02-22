// @ts-check
import { defineConfig } from 'astro/config';
import critters from 'astro-critters';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://roammate.com',
  devToolbar: { enabled: false },
  compressHTML: true,
  integrations: [sitemap(), critters({ pruneSource: true, preload: 'swap' })],
});
