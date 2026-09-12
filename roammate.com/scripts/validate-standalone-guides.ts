import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export type StandaloneGuide = {
  slug: string;
  type: string;
  generateDerivedPages?: boolean;
};

const families = ['budget', 'best-time-to-visit', 'statistics', 'companions'];

function excludedReferences(distDir: string, slugs: Set<string>): string[] {
  if (!existsSync(distDir)) return [];
  const errors: string[] = [];
  const scan = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) { scan(path); continue; }
      if (!/\.(html|json)$/.test(entry.name)) continue;
      const text = readFileSync(path, 'utf8');
      // Same-origin absolute or root-relative URLs, including JSON-LD and feeds.
      // The left boundary excludes matching a path on a different host.
      const refs = text.matchAll(/(?<![\w:/])(?:https:\/\/roammate\.com)?\/(budget|best-time-to-visit|statistics|companions|itinerary)\/([a-z0-9-]+)\//g);
      for (const [url, family, value] of refs) {
        const slug = family === 'itinerary' ? value.replace(/-\d+-day$/, '') : value;
        if (slugs.has(slug)) errors.push('standalone excluded derivative reference: ' + url + ' in ' + path);
      }
    }
  };
  scan(distDir);
  return [...new Set(errors)];
}

/** Verify the publishing contract against actual output, not just route predicates. */
export function validateStandaloneGuides(distDir: string, guides: StandaloneGuide[]): string[] {
  const standalone = guides.filter((g) => g.type === 'city' && g.generateDerivedPages === false);
  if (!standalone.length) return [];
  const errors = excludedReferences(distDir, new Set(standalone.map((g) => g.slug)));
  const read = (path: string) => existsSync(resolve(distDir, path))
    ? readFileSync(resolve(distDir, path), 'utf8') : '';
  const discovery = { 'sitemap.xml': read('sitemap.xml'), 'rss.xml': read('rss.xml') };
  const itineraryDir = resolve(distDir, 'itinerary');
  const itineraries = existsSync(itineraryDir) ? readdirSync(itineraryDir) : [];

  for (const { slug } of standalone) {
    const path = '/guides/' + slug + '/';
    const url = 'https://roammate.com' + path;
    const html = read('guides/' + slug + '/index.html');
    if (!html) errors.push('standalone missing guide: ' + path);
    else {
      const canonical = [...html.matchAll(/<link\b[^>]*>/g)]
        .some(([tag]) => /rel=["']canonical["']/.test(tag) && tag.includes('href="' + url + '"'));
      if (!canonical) errors.push('standalone missing self canonical: ' + path);
    }
    for (const [name, xml] of Object.entries(discovery)) {
      if (!xml.includes(url + '<')) errors.push('standalone missing from ' + name + ': ' + path);
      const urls = [...xml.matchAll(/https:\/\/roammate\.com\/([^<\s]+)/g)].map((m) => '/' + m[1]);
      const prefix = '/itinerary/' + slug + '-';
      const excluded = urls.filter((u) => families.some((f) => u === '/' + f + '/' + slug + '/')
        || (u.startsWith(prefix) && /^\d+-day\/$/.test(u.slice(prefix.length))));
      for (const u of excluded) errors.push('standalone excluded derivative in ' + name + ': ' + u);
    }
    const paths = families.map((family) => '/' + family + '/' + slug + '/');
    for (const name of itineraries) {
      if (name.startsWith(slug + '-') && /^\d+-day$/.test(name.slice(slug.length + 1))) {
        paths.push('/itinerary/' + name + '/');
      }
    }
    for (const derived of paths) {
      if (existsSync(resolve(distDir, '.' + derived, 'index.html'))) {
        errors.push('standalone excluded derivative built: ' + derived);
      }
    }
  }
  return errors;
}
