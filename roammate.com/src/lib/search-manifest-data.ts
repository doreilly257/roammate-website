import { getCollection } from 'astro:content';
import { buildManifest, COMPARISON_SLUGS } from './search-manifest';

// The current collection schemas strip unknown fields. Preserve publication vetoes
// from authored JSON without introducing or claiming a new CMS publication schema.
const raw = import.meta.glob<{ draft?: boolean; private?: boolean; gated?: boolean }>('../content/{guides,blog}/*.json', { eager: true, import: 'default' });
let cached: ReturnType<typeof loadManifest> | undefined;
async function loadManifest() {
  const [guides, blogs] = await Promise.all([getCollection('guides'), getCollection('blog')]);
  for (const slug of COMPARISON_SLUGS) {
    if (!blogs.some(post => post.id === slug)) throw new Error(`Missing reviewed comparison: ${slug}`);
  }
  return buildManifest(
    guides.map(entry => ({ ...entry.data, ...publication('guides', entry.id) })),
    blogs.map(entry => ({ ...entry.data, slug: entry.id, ...publication('blog', entry.id) })),
  );
}
function publication(collection: string, id: string) {
  const entry = raw[`../content/${collection}/${id}.json`];
  if (!entry) throw new Error(`Missing authored search metadata: ${collection}/${id}`);
  return { draft: entry.draft, private: entry.private, gated: entry.gated };
}
export function getSearchArticles() { return cached ??= loadManifest(); }
export async function getSearchArticle(path: string) {
  return (await getSearchArticles()).find(article => article.path === path);
}
