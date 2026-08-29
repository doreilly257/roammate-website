/**
 * Rich itinerary structured data for the GEO holdout test group (see geoTestSet.ts).
 *
 * Everything here is DERIVED from the page's own itinerary data. Nothing is invented:
 * no durations, prices, ratings or opening hours are asserted that the page does not
 * already state in prose. If a field cannot be grounded in the data, it is omitted.
 */

interface Period { time: string; title: string; text: string; tip?: string }
interface Day { num: number; title: string; periods: Period[] }

interface Args {
  city: string;
  country: string;
  citySlug: string;
  days: number;
  itinerary: Day[];
  allDays: number[];
}

const origin = 'https://roammate.com';

/** First sentence, capped — used for schema descriptions that should stay short. */
function summarise(text: string, max = 300): string {
  const firstStop = text.search(/\.\s/);
  const s = firstStop > 40 ? text.slice(0, firstStop + 1) : text;
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s.trim();
}

export function buildItinerarySchema({ city, country, citySlug, days, itinerary, allDays }: Args) {
  const url = `${origin}/itinerary/${citySlug}-${days}-day/`;
  const dayLabel = days === 1 ? '1-day' : `${days}-day`;

  // TouristTrip is the semantically correct type for an itinerary, and its
  // subTrip/itinerary chain is what makes the day structure machine-readable.
  const trip = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    '@id': `${url}#trip`,
    name: `${city} ${dayLabel} itinerary`,
    description: `A day-by-day ${dayLabel} itinerary for ${city}, ${country}.`,
    url,
    touristType: 'Independent traveller',
    arrivalLocation: { '@type': 'City', name: city, address: { '@type': 'PostalAddress', addressCountry: country } },
    itinerary: {
      '@type': 'ItemList',
      numberOfItems: itinerary.length,
      itemListElement: itinerary.map((day) => ({
        '@type': 'ListItem',
        position: day.num,
        item: {
          '@type': 'TouristDestination',
          name: `Day ${day.num}: ${day.title}`,
          description: summarise(day.periods.map((p) => `${p.time}: ${p.title}`).join('. '), 300),
          containedInPlace: { '@type': 'City', name: city },
        },
      })),
    },
  };

  // HowTo mirrors the same days as ordered steps. Rich results for HowTo are gone, but
  // the markup remains one of the clearest day-sequence signals for text extraction.
  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${url}#howto`,
    name: `How to spend ${days} ${days === 1 ? 'day' : 'days'} in ${city}`,
    description: `A ${dayLabel} plan for ${city}, ${country}, broken into morning, afternoon and evening.`,
    step: itinerary.map((day) => ({
      '@type': 'HowToSection',
      position: day.num,
      name: `Day ${day.num}: ${day.title}`,
      itemListElement: day.periods.map((p, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: `${p.time}: ${p.title}`,
        text: summarise(p.text, 500),
      })),
    })),
  };

  // FAQ answers are composed only from what the itinerary already contains.
  const otherDays = allDays.filter((d) => d !== days);
  const faqs: { q: string; a: string }[] = [
    {
      q: `How many days do you need in ${city}?`,
      a: allDays.length > 1
        ? `This ${dayLabel} plan covers ${itinerary.length} ${itinerary.length === 1 ? 'day' : 'days'} in ${city}. We also publish ${otherDays.map((d) => `${d}-day`).join(' and ')} versions, so you can match the itinerary to the time you actually have.`
        : `This plan covers ${itinerary.length} ${itinerary.length === 1 ? 'day' : 'days'} in ${city}.`,
    },
    {
      q: `What can you do in ${city} in ${days} ${days === 1 ? 'day' : 'days'}?`,
      // Titles keep their original case — lowercasing destroys acronyms like UNESCO.
      a: itinerary.map((d) => `Day ${d.num} covers ${d.title}`).join('; ') + '.',
    },
  ];

  const firstTip = itinerary.flatMap((d) => d.periods).find((p) => p.tip)?.tip;
  if (firstTip) {
    faqs.push({ q: `What should you know before visiting ${city}?`, a: summarise(firstTip, 500) });
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return [trip, howTo, faq];
}
