import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const indexedSitemap = path.join(distDir, 'sitemap-0.xml');
const canonicalSitemap = path.join(distDir, 'sitemap.xml');
const sitemapIndex = path.join(distDir, 'sitemap-index.xml');

if (!fs.existsSync(distDir)) {
  process.exit(0);
}

if (fs.existsSync(indexedSitemap)) {
  fs.copyFileSync(indexedSitemap, canonicalSitemap);
  fs.rmSync(indexedSitemap, { force: true });
}

if (fs.existsSync(sitemapIndex)) {
  fs.rmSync(sitemapIndex, { force: true });
}
