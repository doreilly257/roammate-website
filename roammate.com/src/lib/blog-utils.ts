import type { BlogPost } from '../data/blog';
import type { GuideEntry } from '../data/guides';

export function resolveRelatedContent(
  post: BlogPost,
  allBlogPosts: BlogPost[],
  allGuides: GuideEntry[],
) {
  const allRelatedGuides = (post.relatedGuideSlugs ?? [])
    .map((guideSlug) => allGuides.find((guide) => guide.slug === guideSlug))
    .filter(Boolean);
  const guideLimit = allRelatedGuides.length >= 6 ? 6 : 3;
  const relatedGuides = allRelatedGuides.slice(0, guideLimit);

  const relatedPosts = (post.relatedPostSlugs ?? [])
    .map((relatedSlug) => allBlogPosts.find((entry) => entry.slug === relatedSlug))
    .filter(Boolean)
    .slice(0, 3)
    .map((entry) => ({
      slug: entry!.slug,
      title: entry!.title,
      description: entry!.description,
      heroImage: entry!.heroImage,
      category: entry!.category,
    }));

  return { relatedGuides, relatedPosts };
}
