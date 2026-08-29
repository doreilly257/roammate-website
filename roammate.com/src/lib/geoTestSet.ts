/**
 * GEO schema holdout (bead roammate-website-8hq, started 2026-08-29).
 *
 * 8ho verified that AI blocks answer informational itinerary queries above the fold
 * while citing competitors and not us. Those pages are also the least machine-
 * extractable on the site: they carry BreadcrumbList and nothing else.
 *
 * This splits /itinerary/ into a test group that emits rich itinerary structured data
 * and an untouched control group, so the effect is measurable WITHIN the same period
 * rather than against a before/after where Google also changed.
 *
 * Assignment is by city, never by page, so a city's 1/3/7-day variants always share a
 * treatment. It is a pure function of the slug, so it is stable across builds and
 * machines — do not reassign a city mid-experiment or the comparison is void.
 *
 * PROBE_CITIES are forced into the test group because they are the only cities with
 * known query-level impression data (from the 2026-08-29 GSC export), which makes them
 * the ones whose AI-block citation can be checked by hand. Being non-random, they are
 * excluded from the CTR-delta statistics — they answer the citation question, not the
 * ranking one.
 */

export const PROBE_CITIES = ['macau', 'tallinn', 'istanbul'] as const;

const TARGET_TEST_CITIES = 40;

// FNV-1a. Any stable hash works; this one is short and dependency-free.
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Test group = the PROBE_CITIES plus the lowest-hashing cities up to TARGET_TEST_CITIES.
 * Taking a prefix of a hash ordering is equivalent to a random sample but reproducible,
 * and unlike a modulo threshold it pins the group size exactly.
 */
export function getGeoTestCities(allCitySlugs: string[]): Set<string> {
  const probes = new Set<string>(PROBE_CITIES);
  const rest = allCitySlugs
    .filter((s) => !probes.has(s))
    .sort((a, b) => hash(a) - hash(b) || a.localeCompare(b))
    .slice(0, Math.max(0, TARGET_TEST_CITIES - probes.size));
  const out = new Set<string>(probes);
  rest.forEach((s) => out.add(s));
  return out;
}
