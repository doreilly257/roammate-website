// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Every page is server-rendered. This is an operator console reading live data
// behind Cloudflare Access -- there is nothing here to prerender, and a static
// page would have to hold the admin key in the browser to be useful.
export default defineConfig({
  site: 'https://admin.roammate.com',
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  devToolbar: { enabled: false },
  security: { checkOrigin: true },
});
