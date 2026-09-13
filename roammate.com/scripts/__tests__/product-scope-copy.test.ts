import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');

it.each(['faq', 'safety'])('qualifies %s block timing while preserving the verified no-notification action', (page) => {
  const copy = source(`pages/${page}.astro`);
  expect(copy).not.toMatch(/Blocking (?:is immediate|takes effect immediately)/);
  expect(copy).not.toMatch(/the other person (?:isn't notified|is not told)/);
  const qualified = 'Blocking helps you control who can contact you. The block action does not send a notification to the blocked person.';
  expect(copy.split(qualified)).toHaveLength(3);
});

it('qualifies trip-plan audience privacy without asserting the opposite', () => {
  const copy = source('pages/how-it-works.astro');
  expect(copy).not.toContain('Trip plans are only shared with matched users, never publicly');
  expect(copy).toContain('Review sharing settings and the intended audience');
});

it('advises deliberate sharing rather than universal profile-only visibility', () => {
  const copy = source('content/blog/roammate-vs-facebook-travel-groups.json');
  expect(copy).not.toContain('On roammate, they see only your travel profile');
  expect(copy).toContain('Review what you share in your profile and conversations');
});

it('describes companion purpose without denying a home-city calendar', () => {
  const copy = source('pages/travel-companion-apps.astro');
  expect(copy).not.toContain('it has no events calendar');
  expect(copy).toContain('check dedicated accommodation or local-event providers');
  expect(copy).toContain("it does not have Facebook's raw volume");
});

it('advises separate accommodation arrangements without denying every booking feature', () => {
  const copy = source('content/blog/couchsurfing-vs-hostelworld-vs-roammate.json');
  expect(copy).not.toContain('There is no hosting, no booking and no beds');
  expect(copy).not.toContain('It will never find you somewhere to sleep');
  expect(copy).toContain('Arrange your accommodation separately');
});

it('marks unverified roammate activity booking unassessed without changing the competitor cell', () => {
  const copy = source('pages/blog/roammate-vs-travello.astro');
  expect(copy).toMatch(/<td>Activity booking<\/td>\s*<td>Not assessed here<\/td>\s*<td>Yes<\/td>/);
});
