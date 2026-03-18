import type { BlogPost } from '../data/blog';
import type { GuideEntry } from '../data/guides';

/**
 * Given a blog post, find related guides by matching geography keywords
 * in the post title/description against guide city/country/region.
 * Uses explicit relatedGuideSlugs first, falls back to keyword matching.
 */
export function findRelatedGuidesForPost(
  post: BlogPost,
  allGuides: GuideEntry[],
  limit = 3,
): GuideEntry[] {
  // Use explicit slugs first
  if (post.relatedGuideSlugs?.length) {
    const guideMap = new Map(allGuides.map((g) => [g.slug, g]));
    const explicit = post.relatedGuideSlugs
      .map((s) => guideMap.get(s))
      .filter(Boolean) as GuideEntry[];
    if (explicit.length >= limit) return explicit.slice(0, limit);
    // Pad with keyword matches if explicit list is short
    const explicitSlugs = new Set(explicit.map((g) => g.slug));
    const extra = matchGuidesByKeywords(post, allGuides, limit - explicit.length, explicitSlugs);
    return [...explicit, ...extra];
  }
  return matchGuidesByKeywords(post, allGuides, limit);
}

function matchGuidesByKeywords(
  post: BlogPost,
  guides: GuideEntry[],
  limit: number,
  exclude = new Set<string>(),
): GuideEntry[] {
  const text = `${post.title} ${post.description}`.toLowerCase();
  const scored = guides
    .filter((g) => !exclude.has(g.slug))
    .map((g) => {
      let score = 0;
      if (text.includes(g.name.toLowerCase())) score += 3;
      if (text.includes(g.country.toLowerCase())) score += 2;
      if (text.includes(g.region.toLowerCase())) score += 1;
      return { guide: g, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.guide);
}

/**
 * Given a guide, find related blog posts by matching the guide's
 * city/country/region against blog post titles/descriptions.
 * Uses explicit relatedGuideSlugs on the blog side, falls back to keyword matching.
 */
export function findRelatedPostsForGuide(
  guideSlug: string,
  guideCity: string,
  guideCountry: string,
  guideRegion: string,
  allPosts: BlogPost[],
  limit = 3,
): { slug: string; title: string; description: string; heroImage: string; category: string }[] {
  // First: posts that explicitly list this guide
  const explicit = allPosts.filter(
    (p) => p.relatedGuideSlugs?.includes(guideSlug),
  );

  if (explicit.length >= limit) {
    return explicit.slice(0, limit).map(toPostCard);
  }

  const explicitSlugs = new Set(explicit.map((p) => p.slug));
  const remaining = limit - explicit.length;

  // Keyword match on city, country, region
  const cityLower = guideCity.toLowerCase();
  const countryLower = guideCountry.toLowerCase();
  const regionLower = guideRegion.toLowerCase();

  const scored = allPosts
    .filter((p) => !explicitSlugs.has(p.slug))
    .map((p) => {
      const text = `${p.title} ${p.description}`.toLowerCase();
      let score = 0;
      if (text.includes(cityLower)) score += 3;
      if (text.includes(countryLower)) score += 2;
      if (text.includes(regionLower)) score += 1;
      return { post: p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const extra = scored.slice(0, remaining).map((s) => s.post);
  return [...explicit, ...extra].slice(0, limit).map(toPostCard);
}

function toPostCard(p: BlogPost) {
  return {
    slug: p.slug,
    title: p.title,
    description: p.description,
    heroImage: p.heroImage,
    category: p.category,
  };
}
