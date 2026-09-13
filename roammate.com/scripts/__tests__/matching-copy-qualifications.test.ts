import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');
const blog = (slug: string) => JSON.parse(source(`content/blog/${slug}.json`));

it('keeps How It Works structured and visible matching answers aligned without hard-filter guarantees', () => {
  const copy = source('pages/how-it-works.astro');
  expect(copy).not.toContain('only see profiles that pass all three');
  const answer = 'Review profiles and discuss your plans to decide whether a potential companion is a good fit.';
  expect(copy.split(answer)).toHaveLength(3);
  expect(copy).toContain('matches travellers based on three factors: travel style');
});

it('describes FAQ matching inputs without guaranteeing every surfaced profile passes all three', () => {
  const copy = source('pages/faq.astro');
  expect(copy).not.toContain('only surfaces people who pass all three');
  expect(copy).not.toContain('Filtering on all three before anyone appears');
  expect(copy).toContain('roammate uses travel style, daily budget and destination overlap to help you find potential companions');
  expect(copy).toContain('Discuss your plans before deciding to travel together');
});

it.each(['roammate-vs-gaffl', 'roammate-vs-meetup', 'roammate-vs-travello', 'best-travel-companion-apps-2026'])('qualifies the %s all-three guarantee', (slug) => {
  const copy = blog(slug).sections[0].content;
  expect(copy).not.toMatch(/(?:overlap on all three|match on all three dimensions|already passed a compatibility filter)/i);
  expect(copy).toContain('travel style');
  expect(copy).toContain('budget');
  expect(copy).toContain('destination');
});

it('describes in-app report/block in both comparison summary and visible article without tap guarantees', () => {
  const copy = source('pages/travel-companion-apps.astro');
  expect(copy).not.toMatch(/one[- ]tap (?:report\/block|away)/);
  expect(copy).not.toContain('every profile and conversation');
  expect(copy).toContain('in-app report/block tools');
  expect(copy).toContain('report and block tools are available in the app');
});

it('describes safety controls without exact taps or every-screen availability', () => {
  const copy = blog('is-roammate-safe').sections[1].content;
  expect(copy).not.toContain('one tap away on every conversation and profile screen');
  expect(copy).toContain('Report and block tools are available in the app');
});

it.each(['roammate-vs-tourlina', 'roammate-vs-meetup', 'best-travel-companion-apps-2026'])('avoids unsupported superiority in %s', (slug) => {
  const copy = JSON.stringify(blog(slug));
  expect(copy).not.toMatch(/deepest compatibility matching|faster and more reliable|less time scrolling and more time connecting/);
});
