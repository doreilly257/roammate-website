import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = (name: string) => readFileSync(new URL(`../../pages/${name}.astro`, import.meta.url), 'utf8');
const faq = page('faq');

function answerFor(question: string): string {
  const block = faq.split(`q: '${question}',`)[1]?.split('\n  },')[0];
  expect(block, `Missing FAQ: ${question}`).toBeDefined();
  return block!;
}

describe('FAQ content consistency', () => {
  it('does not invite underage users contrary to published eligibility', () => {
    expect(page('terms')).toContain('at least 18 years old');
    // Asserts the statement, not one phrasing of it: the wording changed on
    // 2026-09-23 when the 18+ gate began collecting a date of birth. Both
    // halves must hold, so deleting the eligibility sentence still fails here.
    expect(page('privacy')).toMatch(/only for people aged 18 and over/i);
    expect(page('privacy')).toMatch(/under 18/i);
    const answer = answerFor('What types of travellers use roammate?');
    expect(answer).not.toMatch(/all ages/i);
    expect(answer).toMatch(/18/);
    expect(answer).toContain('href="/terms/"');
  });

  it('links account deletion to the published retention exceptions', () => {
    expect(page('deletedata')).toContain('Retained for legal compliance');
    const answer = answerFor('How do I delete my account?');
    expect(answer).toContain('href="/deletedata/"');
    expect(answer).toMatch(/retain|retention/i);
    expect(answer).not.toContain('Deletion is permanent and removes your data');
  });
});
