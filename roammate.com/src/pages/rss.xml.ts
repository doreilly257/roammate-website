import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { allBlogPosts } from '../data/blog';

export async function GET(context: APIContext) {
  const posts = allBlogPosts
    .filter((post) => post.publishedAt)
    .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());

  return rss({
    title: 'roammate Blog',
    description: 'Travel tips, guides, and advice for solo backpackers and travel companions.',
    site: context.site ?? 'https://roammate.com',
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: new Date(post.publishedAt!),
      link: `/blog/${post.slug}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
