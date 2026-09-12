interface SiblingPages {
  guide: string | null;
  itinerary: { slug: string; days: number }[];
  budget: string | null;
  bestTime: string | null;
  companions: string | null;
}

// Every guide keeps its main URL. Preserve the existing curated-city companions
// link placement, but suppress all derivative links for standalone guides.
export function getCitySiblingPages(
  citySlug: string,
  guideData: any,
  cityGuideSlugs: Set<string>,
): SiblingPages {
  const isCityGuide = cityGuideSlugs.has(citySlug);
  const guide = `/guides/${citySlug}/`;
  if (guideData.generateDerivedPages === false) {
    return { guide, itinerary: [], budget: null, bestTime: null, companions: null };
  }

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
