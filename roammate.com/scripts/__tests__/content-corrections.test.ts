import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(new URL('../../src/' + path, import.meta.url), 'utf8');

describe('verified content corrections', () => {
  it('does not advertise extinct Don Khon dolphin excursions in any guide field', () => {
    const raw = read('content/guides/four-thousand-islands.json');
    expect(raw).not.toMatch(/dolphin (?:trip|spotting)|dolphin-watching trip|rare dolphins|fewer than 100|supporting endangered dolphins/i);
    const guide = JSON.parse(raw);
    expect(guide.description).not.toMatch(/dolphin/i);
    expect(guide.heroSubtitle).not.toMatch(/dolphin/i);
    for (const days of ['3', '7']) {
      expect(JSON.stringify(guide.itineraries[days])).toContain('February 2022');
    }
  });
  it('does not guarantee river activity safety or promote drinking while tubing', () => {
    const raw = read('content/guides/four-thousand-islands.json');
    expect(raw).not.toMatch(/swim safely|safe swimming spots|Tubing is safe|Swimming is only safe|guesthouse strip are safe|cold beer in hand|current is gentle|water is calm and the kayaking is easy/i);
    expect(raw).toContain('hidden obstacles');
    expect(raw).toContain('https://www.gov.uk/foreign-travel-advice/laos/safety-and-security');
  });
  it('does not claim unverified first-hand authorship or universal human review', () => {
    const editorial = read('pages/editorial/index.astro');
    expect(editorial).not.toMatch(/experienced independent travellers|fifty countries|six continents|most recent on-the-ground experience|reviewed by at least one other|author has direct personal experience/i);
    expect(editorial).toContain('AI-assisted');
    expect(editorial).toContain('support@roammate.com');
  });
});
