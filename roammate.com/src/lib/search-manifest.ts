export type SearchArticle = {
  path: string;
  title: string;
  description: string;
  type: 'Guide' | 'Route' | 'Blog';
  countries: string[];
};

type Publication = { draft?: boolean; private?: boolean; gated?: boolean };
type Guide = Publication & { slug: string; type: string; title: string; description: string; heroCountry?: string; countries?: { name: string }[] };
type Blog = Publication & { slug: string; title: string; description: string; cities?: string[] };
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const labels = (values: string[]) => [...new Set(values.map(normalize).filter(Boolean))].sort();
const isPublic = (entry: Publication) => !entry.draft && !entry.private && !entry.gated;

export function validateArticles(value: unknown): SearchArticle[] {
  if (!Array.isArray(value)) throw new Error('Search articles must be an array');
  const seen = new Set<string>();
  for (const article of value) {
    if (!article || !/^\/(guides|blog)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(article.path)
      || !['Guide', 'Route', 'Blog'].includes(article.type)
      || (article.type === 'Blog') !== article.path.startsWith('/blog/')
      || typeof article.title !== 'string' || !normalize(article.title)
      || typeof article.description !== 'string' || !normalize(article.description)
      || !Array.isArray(article.countries) || article.countries.some((c: unknown) => typeof c !== 'string' || !normalize(c))
      || !isPublic(article)) throw new Error('Invalid public search article');
    if (seen.has(article.path)) throw new Error(`Duplicate search path: ${article.path}`);
    seen.add(article.path);
  }
  return value as SearchArticle[];
}

export function buildManifest(guides: Guide[], blogs: Blog[]): SearchArticle[] {
  const publicGuides = guides.filter(isPublic);
  const guideCountries = new Map(publicGuides.filter(g => g.type === 'city').map(g => [g.slug, g.heroCountry ?? '']));
  const articles: SearchArticle[] = publicGuides.map(guide => {
    if (!['city', 'backpacker'].includes(guide.type)) throw new Error(`Unsupported guide type: ${guide.type}`);
    return {
      path: `/guides/${guide.slug}/`, title: normalize(guide.title), description: normalize(guide.description),
      type: guide.type === 'city' ? 'Guide' : 'Route',
      countries: labels(guide.type === 'city' ? [guide.heroCountry ?? ''] : (guide.countries ?? []).map(c => c.name)),
    };
  });
  articles.push(...blogs.filter(isPublic).map(post => ({
    path: `/blog/${post.slug}/`, title: normalize(post.title), description: normalize(post.description), type: 'Blog' as const,
    countries: labels((post.cities ?? []).map(city => guideCountries.get(city) ?? '')),
  })));
  return validateArticles(articles).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

// Reviewed standalone routes all use BlogPostLayout and existing blog collection records.
export const COMPARISON_SLUGS = [
  'roammate-vs-backpackr', 'roammate-vs-bumble-bff', 'roammate-vs-couchsurfing',
  'roammate-vs-facebook-travel-groups', 'roammate-vs-gaffl', 'roammate-vs-hostelworld',
  'roammate-vs-meetup', 'roammate-vs-tourlina', 'roammate-vs-travello',
] as const;
