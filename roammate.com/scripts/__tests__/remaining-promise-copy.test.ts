import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const cases: [string, RegExp][] = [
  ['src/components/Features.astro', /every connection is genuinely compatible/],
  ['src/pages/about.astro', /every connection is genuinely compatible/],
  ['src/pages/press.astro', /every connection is genuinely compatible/],
  ['public/llms-full.txt', /only see profiles that pass all three|all three dimensions to filter|matching ensures you won't pair|actually determine compatibility|result is a curated set of travellers who are genuinely compatible/],
  ['public/llms.txt', /so you find someone genuinely compatible/],
  ['src/pages/how-it-works.astro', /every suggestion is genuinely compatible|in two taps/],
  ['src/pages/safety.astro', /in two taps|before surfacing profiles|Compatible matching reduces risk/],
  ['src/pages/travel-buddy-app.astro', /roammate connects you before you even arrive|Matched to people who move the way you do|#1 source of travel friction|surfaces companions in your bracket|travel history mean you know/],
  ['src/pages/faq.astro', /in two taps|two-tap blocking/],
  ['src/pages/find-travel-companion.astro', /pre-screened for compatibility|compatible styles, before starting any conversation|filters by all of it|shared itinerary mean you know|matched companion saves \$150–300|Cut costs in half/],
  ['src/pages/what-is-a-travel-companion/index.astro', /most compatible pairings|compatibility before they ever|filters for compatibility before/],
  ['src/pages/statistics/index.astro', /filtering for compatibility before you start/],
  ['src/pages/meet-travelers.astro', /Real compatibility before you even say hello|far easier than a cold hostel introduction|No awkward small talk with incompatible strangers/],
  ['src/pages/travel-companion-apps.astro', /filters on travel style, daily budget and destination before|screens for compatibility before|filtering happen up front|compatibility screening happens before|destination before you ever start a conversation/],
  ['src/pages/what-is-adventure-travel/index.astro', /filters out incompatible matches before/],
  ['src/pages/what-is-budget-travel/index.astro', /strongest predictors|become frictionless/],
  ['src/pages/how-much-does-it-cost-to-backpack-southeast-asia/index.astro', /strongest predictors|are frictionless/],
  ['src/pages/blog/roammate-vs-gaffl.astro', /<td>Before conversations<\/td>|trip already fits yours/],
  ['src/content/blog/roammate-vs-backpackr.json', /surfaces only the travellers|does the filtering work for you|shows you travellers already planning trips who match/],
  ['src/content/blog/roammate-vs-bumble-bff.json', /compatibility dimensions before any conversation|The match happens before you book/],
  ['src/content/blog/roammate-vs-couchsurfing.json', /before surfacing any profiles|already pass a compatibility filter/],
  ['src/content/blog/roammate-vs-tourlina.json', /before surfacing profiles|interests actually align|larger pool of potential companions/],
  ['src/content/blog/roammate-vs-gaffl.json', /destination before any conversation|screening for you, before|tends to be faster|approach removes more friction/],
  ['src/content/blog/finding-travel-companions.json', /most purpose-built|filters out the mismatches|single biggest predictor/],
  ['src/content/blog/why-roammate-perfect-companion.json', /before you ever start a conversation|The roammate match surfaces the surfer|A matched traveller who has been in Medellin for two weeks knows/],
  ['src/content/blog/best-apps-meeting-travellers-middle-east.json', /looking at travellers already heading to the same place on a comparable budget/],
  ['src/content/blog/best-apps-splitting-travel-costs.json', /person you end up sharing costs with is on a comparable budget/],
  ['src/content/blog/best-solo-travel-apps-over-40.json', /Matching on bracket first means the conversation has already happened/],
  ['src/content/blog/free-couchsurfing-alternatives-2026.json', /people you see are already going where you are going|block and report are on every profile|strongest where backpackers already cluster/],
  ['src/content/blog/best-safety-apps-solo-travel-2026.json', /block and report are available on every profile and conversation|person you end up spending a day with is someone whose plans actually fit yours/],
  ['src/content/blog/best-travel-companion-apps-2026.json', /pool is thinner outside its strongest destinations|outperform general social platforms/],
  ['src/content/blog/roammate-vs-facebook-travel-groups.json', /roammate solves all three problems|matching algorithm means you don't need massive volume/],
  ['src/content/blog/couchsurfing-vs-hostelworld-vs-roammate.json', /profiles you see are people heading somewhere you are heading|Matching happens before anything is booked/],
];

it.each(cases)('qualifies unsupported matching, outcome or tap promises in %s', (path, unsupported) => {
  const copy = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  expect(copy).not.toMatch(unsupported);
  expect(copy).toMatch(/roammate/i);
});

it('keeps find-companion matching advice aligned in structured and visible FAQs', () => {
  const copy = readFileSync(new URL('../../src/pages/find-travel-companion.astro', import.meta.url), 'utf8');
  expect(copy.split('roammate uses travel style, daily budget and destination overlap to suggest potential companions. Discuss your plans to assess compatibility.')).toHaveLength(3);
});
