import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { allGuides, cityGuideSlugs } from '../data/guides';
import { allBlogPosts } from '../data/blog';
import { getFeedItems } from '../lib/feed';

export async function GET(context: APIContext) {
  const items = getFeedItems(allGuides, cityGuideSlugs, allBlogPosts);

  return rss({
    title: 'roammate — Travel Guides, Blog & Backpacker Routes',
    description: 'City guides, place guides, blog posts, and multi-month backpacker routes for independent travellers. Budget tips, itineraries, and local advice.',
    site: context.site!,
    items,
    customData: '<language>en</language>',
  });
}
