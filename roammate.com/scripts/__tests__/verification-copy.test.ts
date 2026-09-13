import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('optional verification marketing copy', () => {
  it.each(['backpackr', 'bumble-bff', 'facebook-travel-groups', 'gaffl', 'hostelworld', 'meetup', 'tourlina', 'travello'])('qualifies the %s comparison table verification claim', (competitor) => {
    const comparison = source(`src/pages/blog/roammate-vs-${competitor}.astro`);
    expect(comparison).not.toContain('Yes (all users)');
    expect(comparison).toContain('Optional identity verification');
  });

  it('does not guarantee a companion has verified identity and travel history', () => {
    const post = source('src/content/blog/why-roammate-perfect-companion.json');
    expect(post).not.toContain('has verified their identity and travel history');
    expect(post).toContain('Identity verification is optional');
    expect(post).toContain('not a guarantee of safety or trustworthiness');
  });

  it('does not imply discovery surfaces only verified travellers', () => {
    const comparison = source('src/content/blog/roammate-vs-travello.json');
    expect(comparison.includes('surfaces verified travellers')).toBe(false);
    expect(comparison.includes('uses travel style, daily budget and destination overlap to suggest potential companions')).toBe(true);
  });

  it('does not advertise verification as a matching requirement', () => {
    const comparison = source('src/pages/travel-companion-apps.astro');
    expect(comparison).not.toContain('roammate gates matching behind identity verification');
    expect(comparison).toContain('roammate offers optional government-ID and liveness checks');
    expect(comparison).toContain('Verification does not guarantee safety or trustworthiness');
  });

  it('describes safety tools without promising a safe and trustworthy community', () => {
    const features = source('src/components/Features.astro');
    expect(features).not.toContain('keep the community safe and trustworthy');
    expect(features).toContain('Optional identity verification');
    expect(features).toContain('do not guarantee safety or trustworthiness');
  });
});
