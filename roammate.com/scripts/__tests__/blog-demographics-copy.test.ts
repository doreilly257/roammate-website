import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('scopes the over-40 article to its evidence instead of promising no age collection', () => {
  const post = JSON.parse(readFileSync(new URL('../../src/content/blog/best-solo-travel-apps-over-40.json', import.meta.url), 'utf8'));
  const copy = JSON.stringify(post);
  expect(copy).not.toContain('We hold no age data');
  expect(copy).not.toContain('We do not collect age');
  expect(post.intro).toContain('This post does not present an age breakdown of roammate users');
  expect(post.sections[0].content).toContain('nothing in this post is an inference about who uses the app');
});
