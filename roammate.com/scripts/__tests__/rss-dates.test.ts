import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const data = vi.hoisted(() => ({
  blogs: [] as Array<{ slug: string; title: string; description: string; publishedAt?: string }>,
  guides: [] as Array<{ slug: string; name: string; country: string }>,
  routes: [] as Array<{ slug: string; name: string; tagline: string }>,
}));
vi.mock('../../src/lib/blog-data', () => ({ getAllBlogPosts: async () => data.blogs }));
vi.mock('../../src/data/guides', () => ({
  getAllGuides: async () => data.guides,
  getCityGuideSlugs: async () => new Set(['kratie']),
  getBackpackerRoutes: async () => data.routes,
}));
import { GET } from '../../src/pages/rss.xml';

const context = { site: new URL('https://roammate.com') } as APIContext;
async function feed() {
  const response = await GET(context);
  const xml = await response.text();
  expect(response.headers.get('content-type')).toContain('xml');
  expect(XMLValidator.validate(xml)).toBe(true);
  return { xml, items: new XMLParser().parse(xml).rss.channel.item as Array<{ link: string; title: string; pubDate?: string }> };
}

beforeEach(() => {
  data.blogs = [
    { slug: 'older', title: 'Older & verified', description: 'Advice < tested', publishedAt: '2025-01-03' },
    { slug: 'z-new', title: 'New Z', description: 'Advice', publishedAt: '2026-09-12' },
    { slug: 'a-new', title: 'New A', description: 'Advice', publishedAt: '2026-09-12' },
  ];
  data.guides = [
    { slug: 'z-place', name: 'Place', country: 'Country' },
    { slug: 'kratie', name: 'Kratie', country: 'Cambodia' },
  ];
  data.routes = [{ slug: 'a-route', name: 'Route', tagline: 'Explore & discover' }];
});

describe('source-backed RSS dates', () => {
  it('omits unknown guide and route publication dates instead of inventing dates from slugs', async () => {
    const { items } = await feed();
    const guides = items.filter(item => item.link.includes('/guides/'));
    expect(guides).toHaveLength(3);
    expect(guides.every(item => item.pubDate === undefined)).toBe(true);
    expect(guides.find(item => item.link.endsWith('/kratie/'))?.title).toBe('Kratie City Guide');
  });

  it('preserves authored blog dates and sorts date ties and undated entries by URL', async () => {
    const { items, xml } = await feed();
    expect(items.map(item => new URL(item.link).pathname)).toEqual([
      '/blog/a-new/', '/blog/z-new/', '/blog/older/',
      '/guides/a-route/', '/guides/kratie/', '/guides/z-place/',
    ]);
    expect(items[0].pubDate).toBe(new Date('2026-09-12').toUTCString());
    expect(items[2].title).toBe('Older & verified');
    data.blogs.reverse();
    data.guides.reverse();
    expect((await feed()).xml).toBe(xml);
  });

  it('does not publish missing or invalid blog dates as invented or invalid dates', async () => {
    data.blogs.push(
      { slug: 'draft', title: 'Draft', description: 'Unknown publication' },
      { slug: 'invalid', title: 'Invalid', description: 'Invalid publication', publishedAt: 'not-a-date' },
    );
    const { items } = await feed();
    expect(items).toHaveLength(6);
    expect(items.some(item => /\/(draft|invalid)\//.test(item.link))).toBe(false);
  });
});
