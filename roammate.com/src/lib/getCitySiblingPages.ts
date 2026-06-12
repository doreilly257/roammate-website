interface SiblingPages {
  guide: string | null;
  itinerary: { slug: string; days: number }[];
  budget: string | null;
  bestTime: string | null;
  companions: string | null;
}

// `/guides/{slug}/` pages are generated for every guide entry (see
// pages/guides/[slug].astro), but `/companions/{slug}/` only exists for
// curated city-guide slugs (CITY_GUIDE_SLUGS_LIST in data/guides.ts).
// Place guides also use type:'city' and get statistics/budget/best-time
// pages, so the companions link must be gated on membership to avoid
// emitting links to non-existent pages.
export function getCitySiblingPages(
  citySlug: string,
  guideData: any,
  cityGuideSlugs: Set<string>,
): SiblingPages {
  const isCityGuide = cityGuideSlugs.has(citySlug);
  const guide = `/guides/${citySlug}/`;

  const itinerary = guideData.itineraries
    ? Object.keys(guideData.itineraries).map(Number).sort((a, b) => a - b).map(days => ({
        slug: `/itinerary/${citySlug}-${days}-day/`,
        days,
      }))
    : [];

  const budget = guideData.budgetBreakdown ? `/budget/${citySlug}/` : null;

  const hasBestMonths = guideData.quickFacts?.some(
    (f: any) => f.label === 'Best Months' && f.value,
  );
  const bestTime = hasBestMonths ? `/best-time-to-visit/${citySlug}/` : null;

  const companions = isCityGuide ? `/companions/${citySlug}/` : null;

  return { guide, itinerary, budget, bestTime, companions };
}
