import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const canonicalSitemap = path.join(distDir, 'sitemap.xml');
const sitemapIndex = path.join(distDir, 'sitemap-index.xml');

if (!fs.existsSync(distDir)) {
  process.exit(0);
}

const shards = fs
  .readdirSync(distDir)
  .filter((f) => /^sitemap-\d+\.xml$/.test(f))
  .map((f) => path.join(distDir, f));

if (shards.length === 0) {
  console.error('normalize-sitemap: no sitemap-N.xml shards found in dist/');
  process.exit(1);
}

if (shards.length === 1) {
  fs.copyFileSync(shards[0], canonicalSitemap);
} else {
  const urls = shards
    .map((shard) => fs.readFileSync(shard, 'utf-8'))
    .flatMap((xml) => xml.match(/<url>[\s\S]*?<\/url>/g) ?? []);
  const merged =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') +
    '\n</urlset>\n';
  fs.writeFileSync(canonicalSitemap, merged);
}

for (const shard of shards) {
  fs.rmSync(shard, { force: true });
}
fs.rmSync(sitemapIndex, { force: true });
