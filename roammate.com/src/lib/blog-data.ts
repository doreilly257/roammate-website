import { getCollection } from 'astro:content';
import type { BlogPost } from '../data/blog';

let _cache: BlogPost[] | null = null;

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  if (_cache) return _cache;
  const entries = await getCollection('blog');
  _cache = entries.map((entry) => ({
    slug: entry.id,
    ...entry.data,
  })) as BlogPost[];
  return _cache;
}
