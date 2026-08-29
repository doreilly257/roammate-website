import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * Machine-readable index of every destination roammate covers.
 *
 * The site's 442 destinations were only reachable as HTML, which makes the dataset
 * unusable to anything that is not a browser. This exposes the same data as JSON so
 * agents, assistants and integrations can consume it directly — no scraping, and no
 * installation step on the consumer's side.
 *
 * Deliberately no build timestamp: a field that changes every build would make the
 * feed churn even when the data has not moved.
 */

const ORIGIN = 'https://roammate.com';

export const GET: APIRoute = async () => {
  const guides = await getCollection('guides');
  const cities = guides.filter((g) => g.data.type === 'city');

  const destinations = cities
    .map((g) => {
      const d = g.data as any;
      const days = Object.keys(d.itineraries ?? {}).map(Number).sort((a, b) => a - b);
      return {
        slug: d.slug,
        name: d.heroCity,
        country: d.heroCountry,
        region: d.heroRegion,
        summary: d.heroSubtitle,
        itinerary_lengths_days: days,
        urls: {
          guide: `${ORIGIN}/guides/${d.slug}/`,
          itineraries: days.map((n) => `${ORIGIN}/itinerary/${d.slug}-${n}-day/`),
          budget: `${ORIGIN}/budget/${d.slug}/`,
          best_time: `${ORIGIN}/best-time-to-visit/${d.slug}/`,
          companions: `${ORIGIN}/companions/${d.slug}/`,
          detail: `${ORIGIN}/data/destinations/${d.slug}.json`,
        },
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return new Response(
    JSON.stringify(
      {
        name: 'roammate destinations',
        description:
          'Every destination roammate publishes a guide for, with day-by-day itineraries, budgets and best-time-to-visit data. Free to use with attribution to roammate.com.',
        source: ORIGIN,
        license: 'CC-BY-4.0',
        count: destinations.length,
        detail_endpoint: `${ORIGIN}/data/destinations/{slug}.json`,
        destinations,
      },
      null,
      2
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
};
