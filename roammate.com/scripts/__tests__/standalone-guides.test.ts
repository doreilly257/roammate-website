import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { validateStandaloneGuides } from '../validate-standalone-guides';

let dist: string;
const guide = { slug: 'nong-khiaw', type: 'city', generateDerivedPages: false, itineraries: { '3': [] } };
const url = 'https://roammate.com/guides/nong-khiaw/';
function file(path: string, content = '') {
  const full = resolve(dist, path);
  mkdirSync(resolve(full, '..'), { recursive: true });
  writeFileSync(full, content);
}
beforeEach(() => {
  dist = mkdtempSync(resolve(tmpdir(), 'standalone-guides-'));
  file('guides/nong-khiaw/index.html', `<link rel="canonical" href="${url}">`);
  file('sitemap.xml', `<urlset><url><loc>${url}</loc></url></urlset>`);
  file('rss.xml', `<rss><channel><item><link>${url}</link></item></channel></rss>`);
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

describe('standalone guide publishing', () => {
  it('accepts an indexable guide in sitemap and RSS with no derivatives', () => {
    expect(validateStandaloneGuides(dist, [guide])).toEqual([]);
  });
  it('does not change legacy guide requirements', () => {
    expect(validateStandaloneGuides(dist, [{ slug: 'legacy', type: 'city' }])).toEqual([]);
  });
  it('requires the guide HTML and self canonical', () => {
    rmSync(resolve(dist, 'guides/nong-khiaw/index.html'));
    expect(validateStandaloneGuides(dist, [guide]).join(' ')).toContain('missing guide');
    file('guides/nong-khiaw/index.html', '<link rel="canonical" href="https://roammate.com/">');
    expect(validateStandaloneGuides(dist, [guide]).join(' ')).toContain('canonical');
  });
  it('requires sitemap and RSS discovery', () => {
    file('sitemap.xml', '<urlset/>');
    file('rss.xml', '<rss/>');
    const errors = validateStandaloneGuides(dist, [guide]).join(' ');
    expect(errors).toContain('sitemap.xml');
    expect(errors).toContain('rss.xml');
  });
  it.each(['budget', 'best-time-to-visit', 'statistics', 'companions'])('rejects a %s derivative', (family) => {
    file(`${family}/nong-khiaw/index.html`);
    expect(validateStandaloneGuides(dist, [guide]).join(' ')).toContain(`/${family}/nong-khiaw/`);
  });
  it('rejects even an itinerary variant not present in source data', () => {
    file('itinerary/nong-khiaw-7-day/index.html');
    expect(validateStandaloneGuides(dist, [guide]).join(' ')).toContain('/itinerary/nong-khiaw-7-day/');
  });
  it.each([
    ['index.html', '<a href="https://roammate.com/budget/nong-khiaw/">Budget</a>'],
    ['data/destinations/nong-khiaw.json', '{"url":"/itinerary/nong-khiaw-3-day/"}'],
    ['guides/example/index.html', '<script type="application/ld+json">{"url":"https://roammate.com/companions/nong-khiaw/"}</script>'],
  ])('rejects forbidden URLs in built %s', (path, content) => {
    file(path, content);
    expect(validateStandaloneGuides(dist, [guide]).join(' ')).toContain('excluded derivative reference');
  });
  it('ignores derivative-like paths on external domains', () => {
    file('index.html', '<a href="https://example.com/budget/nong-khiaw/">External</a>');
    expect(validateStandaloneGuides(dist, [guide])).toEqual([]);
  });
  it('rejects derivative discovery URLs even without a built page', () => {
    file('sitemap.xml', `<urlset><url><loc>${url}</loc></url><url><loc>https://roammate.com/budget/nong-khiaw/</loc></url></urlset>`);
    expect(validateStandaloneGuides(dist, [guide]).join(' ')).toContain('excluded derivative');
  });
});
