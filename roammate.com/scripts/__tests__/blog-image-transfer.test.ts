import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../src/pages/blog/index.astro', import.meta.url), 'utf8');

describe('blog hero image transfer', () => {
  it('does not replace the preloaded server hero with a second image after parsing', () => {
    const background = "url('/featured.webp')";
    const hero = {
      dataset: { heroImages: JSON.stringify(['/featured.webp', '/other.webp']) },
      style: { backgroundImage: background },
    };
    const heroScripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .map((match) => match[1])
      .filter((script) => script.includes('blogHeroBackground'));
    for (const script of heroScripts) {
      runInNewContext(script, {
        document: { getElementById: () => hero },
        Math: { random: () => 0.75, floor: Math.floor },
      });
    }
    expect(hero.style.backgroundImage).toBe(background);
  });

  it('uses one server-selected URL for preload and visible hero including the empty-blog fallback', () => {
    expect(source).toContain("const blogHeroImage = featuredPost?.heroImage || '/images/guides/tokyo-hero.webp'");
    expect(source).toContain('href={blogHeroImage}');
    expect(source).toContain("url('${blogHeroImage}')");
  });
});
