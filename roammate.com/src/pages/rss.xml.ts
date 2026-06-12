import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllBlogPosts } from '../lib/blog-data';
import { getAllGuides, getCityGuideSlugs, getBackpackerRoutes } from '../data/guides';

// Deterministic pubDate from a slug hash, so guide feed dates are stable across
// builds (guides have no authored publish date). Maps a hash onto a fixed
// window ending at the project epoch.
const EPOCH = Date.UTC(2024, 0, 1);
const WINDOW_DAYS = 365 * 2;

function dateFromSlug(slug: string): Date {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  const dayOffset = Math.abs(hash) % WINDOW_DAYS;
  return new Date(EPOCH - dayOffset * 86_400_000);
}

export async function GET(context: APIContext) {
  const [allBlogPosts, allGuides, cityGuideSlugs, backpackerRoutes] = await Promise.all([
    getAllBlogPosts(),
    getAllGuides(),
    getCityGuideSlugs(),
    getBackpackerRoutes(),
  ]);

  const blogItems = allBlogPosts
    .filter((post) => post.publishedAt)
    .map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: new Date(post.publishedAt!),
      link: `/blog/${post.slug}/`,
    }));

  const guideItems = allGuides.map((guide) => {
    const isCity = cityGuideSlugs.has(guide.slug);
    return {
      title: `${guide.name} ${isCity ? 'City' : 'Travel'} Guide`,
      description: `Solo travel guide for ${guide.name}, ${guide.country}.`,
      pubDate: dateFromSlug(guide.slug),
      link: `/guides/${guide.slug}/`,
    };
  });

  const routeItems = backpackerRoutes.map((route) => ({
    title: `${route.name} Backpacker Route`,
    description: route.tagline,
    pubDate: dateFromSlug(route.slug),
    link: `/guides/${route.slug}/`,
  }));

  const items = [...blogItems, ...guideItems, ...routeItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime(),
  );

  return rss({
    title: 'roammate Blog & Travel Guides',
    description:
      'Travel tips, city guides, backpacker routes, and advice for solo backpackers and travel companions.',
    site: context.site ?? 'https://roammate.com',
    items,
    customData: '<language>en-us</language>',
  });
}
