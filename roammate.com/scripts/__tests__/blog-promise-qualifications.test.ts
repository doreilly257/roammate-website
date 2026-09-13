import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const post = (slug: string) => JSON.parse(readFileSync(new URL(`../../src/content/blog/${slug}.json`, import.meta.url), 'utf8'));

it('does not promise blocking erases already shared information or universal location privacy', () => {
  const copy = post('is-roammate-safe').sections[1].content;
  expect(copy).not.toContain('without them retaining any of your information');
  expect(copy).not.toContain('your GPS coordinates, accommodation address, and daily movements stay private');
  expect(copy).not.toContain('does not share your exact location');
  expect(copy).toContain('cannot erase information you have already shared');
  expect(copy).toContain('Review location permissions');
});

it('gives location-sharing precautions without claiming nobody can see a live position', () => {
  const copy = post('best-safety-apps-solo-travel-2026').sections[5].content;
  expect(copy).not.toContain('Nobody sees your live position on a map');
  expect(copy).toContain('Review location permissions and sharing settings');
});

it('describes the over-40 article focus without asserting demographic filters are absent', () => {
  const copy = post('best-solo-travel-apps-over-40').sections[2].content;
  expect(copy).not.toContain('no age filter, no gender filter');
  expect(copy).not.toContain('It sorts on none of the demographic dimensions');
  expect(copy).toContain('This article focuses on budget, travel style and destination overlap');
});

it('describes companion matching without denying other roammate capabilities', () => {
  const copy = post('roammate-vs-travello').sections[0].content;
  expect(copy).not.toContain('roammate does one thing');
  expect(copy).not.toContain("There's no social feed, no activity booking, no inspiration content");
  expect(copy).toContain('roammate helps travellers find compatible companions for upcoming trips');
});

it('distinguishes identity badges and reviews from fitness vetting without denying references or liability', () => {
  const copy = post('best-apps-to-find-a-hiking-or-trekking-partner').sections[0].content;
  expect(copy).not.toContain('There is no fitness check, no reference system, no insurance and no liability');
  expect(copy).toContain('Identity badges and traveller reviews are not a trekking-fitness assessment');
  expect(copy).toContain('qualified guidance or suitable travel insurance');
});
