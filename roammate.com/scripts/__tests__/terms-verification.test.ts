import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('approved identity-verification terms', () => {
  it('distinguishes optional ID and liveness checks from background checks without promising safety', () => {
    const terms = readFileSync(new URL('../../src/pages/terms.astro', import.meta.url), 'utf8');

    expect(terms).toContain('<li>roammate offers optional government ID and liveness checks, but does not conduct background checks. Completing these checks does not guarantee a user’s safety or trustworthiness.</li>');
    expect(terms).not.toContain('roammate does not verify the identity or background of users');
  });
});
