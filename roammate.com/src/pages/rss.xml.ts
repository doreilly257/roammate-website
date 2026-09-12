import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllBlogPosts } from '../lib/blog-data';
import { getAllGuides, getCityGuideSlugs, getBackpackerRoutes } from '../data/guides';

export async function GET(context: APIContext) {
  const [allBlogPosts, allGuides, cityGuideSlugs, backpackerRoutes] = await Promise.all([
    getAllBlogPosts(),
    getAllGuides(),
    getCityGuideSlugs(),
    getBackpackerRoutes(),
  ]);

  const blogItems = allBlogPosts
    .filter((post) => post.publishedAt && Number.isFinite(Date.parse(post.publishedAt)))
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
      link: `/guides/${guide.slug}/`,
    };
  });

  const routeItems = backpackerRoutes.map((route) => ({
    title: `${route.name} Backpacker Route`,
    description: route.tagline,
    link: `/guides/${route.slug}/`,
  }));

  // Guides/routes have no authored publication metadata: omit optional pubDate,
  // rather than inventing one. Dated posts lead; URL order keeps ties and undated
  // entries deterministic even if collection loading order changes.
  const items: { title: string; description: string; link: string; pubDate?: Date }[] =
    [...blogItems, ...guideItems, ...routeItems];
  items.sort((a, b) => {
    if (a.pubDate && b.pubDate) {
      const difference = b.pubDate.getTime() - a.pubDate.getTime();
      if (difference) return difference;
    } else if (a.pubDate || b.pubDate) {
      return a.pubDate ? -1 : 1;
    }
    return a.link < b.link ? -1 : a.link > b.link ? 1 : 0;
  });

  return rss({
    title: 'roammate Blog & Travel Guides',
    description:
      'Travel tips, city guides, backpacker routes, and advice for solo backpackers and travel companions.',
    site: context.site ?? 'https://roammate.com',
    items,
    customData: '<language>en-us</language>',
  });
}
