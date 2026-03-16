import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveRelatedContent } from '../blog-utils';
import { allGuides } from '../../data/guides';
import type { BlogPost } from '../../data/blog';
import type { GuideEntry } from '../../data/guides';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadBlogPostsFromJson(): BlogPost[] {
  const contentDir = resolve(__dirname, '../../content/blog');
  const files = readdirSync(contentDir).filter((f) => f.endsWith('.json'));
  return files.map((file) => {
    const slug = file.replace(/\.json$/, '');
    const data = JSON.parse(readFileSync(resolve(contentDir, file), 'utf-8'));
    return { slug, ...data } as BlogPost;
  });
}

const blogPosts = loadBlogPostsFromJson();

describe('resolveRelatedContent', () => {
  it('returns correct related posts and guides for valid slugs', () => {
    const post = blogPosts.find((p) => p.relatedGuideSlugs?.length && p.relatedPostSlugs?.length);
    if (!post) throw new Error('No blog post with both relatedGuideSlugs and relatedPostSlugs found');

    const { relatedGuides, relatedPosts } = resolveRelatedContent(post, blogPosts, allGuides);

    expect(relatedGuides.length).toBeGreaterThan(0);
    for (const guide of relatedGuides) {
      expect(post.relatedGuideSlugs).toContain(guide!.slug);
    }

    expect(relatedPosts.length).toBeGreaterThan(0);
    for (const rp of relatedPosts) {
      expect(post.relatedPostSlugs).toContain(rp.slug);
      expect(rp).toHaveProperty('title');
      expect(rp).toHaveProperty('description');
      expect(rp).toHaveProperty('heroImage');
      expect(rp).toHaveProperty('category');
    }

    // relatedPosts capped at 3
    expect(relatedPosts.length).toBeLessThanOrEqual(3);
  });

  it('filters out non-existent slugs without crashing', () => {
    const post: BlogPost = {
      slug: 'test',
      title: 'Test',
      description: 'Test',
      category: 'Test',
      readMinutes: 1,
      heroImage: '/test.webp',
      intro: 'Test',
      sections: [],
      relatedPosts: [],
      relatedGuideSlugs: ['nonexistent-guide-abc'],
      relatedPostSlugs: ['nonexistent-post-xyz'],
    };

    const { relatedGuides, relatedPosts } = resolveRelatedContent(post, blogPosts, allGuides);

    expect(relatedGuides).toEqual([]);
    expect(relatedPosts).toEqual([]);
  });

  it('returns empty arrays when slug arrays are empty', () => {
    const post: BlogPost = {
      slug: 'test',
      title: 'Test',
      description: 'Test',
      category: 'Test',
      readMinutes: 1,
      heroImage: '/test.webp',
      intro: 'Test',
      sections: [],
      relatedPosts: [],
      relatedGuideSlugs: [],
      relatedPostSlugs: [],
    };

    const { relatedGuides, relatedPosts } = resolveRelatedContent(post, blogPosts, allGuides);

    expect(relatedGuides).toEqual([]);
    expect(relatedPosts).toEqual([]);
  });

  it('returns empty arrays when slug properties are undefined', () => {
    const post: BlogPost = {
      slug: 'test',
      title: 'Test',
      description: 'Test',
      category: 'Test',
      readMinutes: 1,
      heroImage: '/test.webp',
      intro: 'Test',
      sections: [],
      relatedPosts: [],
      // relatedGuideSlugs and relatedPostSlugs intentionally omitted
    };

    const { relatedGuides, relatedPosts } = resolveRelatedContent(post, blogPosts, allGuides);

    expect(relatedGuides).toEqual([]);
    expect(relatedPosts).toEqual([]);
  });
});
