interface SiblingPages {
  guide: string | null;
  itinerary: { slug: string; days: number }[];
  budget: string | null;
  bestTime: string | null;
  companions: string | null;
}

export function getCitySiblingPages(citySlug: string, guideData: any): SiblingPages {
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

  const companions = `/companions/${citySlug}/`;

  return { guide, itinerary, budget, bestTime, companions };
}
