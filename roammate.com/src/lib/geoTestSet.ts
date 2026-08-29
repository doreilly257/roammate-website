/**
 * GEO schema holdout (beads roammate-website-8hq / -2u3). Widened 2026-08-29.
 *
 * 8ho verified that AI blocks answer informational itinerary queries above the fold
 * while citing competitors and not us. Those pages were also the least machine-
 * extractable on the site: BreadcrumbList and nothing else.
 *
 * DESIGN — stratified, with an untouched control, so the effect is measurable WITHIN
 * one period rather than across a before/after in which Google also changed.
 *
 * The strata exist because roammate's audience skews young solo/backpacker, and those
 * destinations carry far more search demand than the long tail. If every popular
 * destination went into the test arm, a CTR difference would be confounded with
 * popularity. So CORE_DESTINATIONS are deliberately split across BOTH arms, giving a
 * like-for-like core-vs-core comparison as well as tail-vs-tail.
 *
 * Assignment is by city, never by page, so a city's 1/3/7-day variants always share a
 * treatment. It is a pure function of the slug, stable across builds and machines.
 *
 * COHORT_1 is frozen. Those cities were treated from 2026-08-29T14:39Z and must never
 * leave the test arm — dropping a city mid-experiment voids its data. Cities added when
 * the group widened are cohort 2 and have a LATER treatment start, so the two cohorts
 * must be aged separately when interpreting results.
 *
 * PROBE_CITIES are the only cities with known query-level impression data, which makes
 * them the ones whose AI-block citation can be checked by hand. Being non-random they
 * are excluded from the CTR-delta statistics.
 */

export const PROBE_CITIES = ['macau', 'tallinn', 'istanbul'] as const;

/** Frozen cohort 1 — treated from 2026-08-29T14:39Z. Never remove a city from this. */
export const COHORT_1: readonly string[] = [
  'accra',
  'antalya',
  'antigua-guatemala',
  'aqaba',
  'bariloche',
  'bhaktapur',
  'bishkek',
  'cairo',
  'cap-skirring',
  'coron-houseboat',
  'da-nang',
  'dakar',
  'diani-beach',
  'dublin',
  'dubrovnik',
  'honolulu',
  'istanbul',
  'jeju-island',
  'kamakura',
  'koh-phangan',
  'la-fortuna',
  'lake-bled',
  'las-vegas',
  'lima',
  'macau',
  'manali',
  'mount-bromo',
  'mount-rinjani',
  'nice',
  'ometepe',
  'sacred-valley',
  'saint-louis-senegal',
  'taj-mahal',
  'tallinn',
  'tel-aviv',
  'thresher-sharks',
  'tulum-ruins',
  'valparaiso',
  'vilnius',
  'yogyakarta',
];

/**
 * Canonical destinations for the young solo / backpacker segment roammate targets.
 * Curated judgement, NOT measured demand — revisit once the 3on export gives per-page
 * impressions, and re-stratify on real numbers if they disagree.
 */
export const CORE_DESTINATIONS: readonly string[] = [
  'amman',
  'amsterdam',
  'antigua-guatemala',
  'athens',
  'bangkok',
  'barcelona',
  'berlin',
  'bogota',
  'budapest',
  'buenos-aires',
  'byron-bay',
  'cairo',
  'canggu',
  'cape-town',
  'cappadocia',
  'cartagena',
  'chefchaouen',
  'chiang-mai',
  'coron',
  'cusco',
  'da-nang',
  'dahab',
  'dubrovnik',
  'el-nido',
  'ella',
  'fes',
  'gili-islands',
  'goa',
  'hanoi',
  'ho-chi-minh-city',
  'hoi-an',
  'istanbul',
  'jaipur',
  'kandy',
  'kathmandu',
  'koh-phangan',
  'koh-tao',
  'krabi',
  'krakow',
  'kuala-lumpur',
  'kyoto',
  'la-fortuna',
  'la-paz',
  'lake-atitlan',
  'lima',
  'lisbon',
  'luang-prabang',
  'machu-picchu',
  'madrid',
  'marrakech',
  'medellin',
  'mexico-city',
  'oaxaca',
  'osaka',
  'pai',
  'petra',
  'phnom-penh',
  'pokhara',
  'porto',
  'prague',
  'queenstown',
  'rio-de-janeiro',
  'rishikesh',
  'salar-de-uyuni',
  'san-cristobal',
  'santa-teresa',
  'santorini',
  'seoul',
  'seville',
  'siem-reap',
  'sigiriya',
  'singapore',
  'split',
  'sydney',
  'taipei',
  'tbilisi',
  'tirana',
  'tokyo',
  'tulum-ruins',
  'udaipur',
  'varanasi-ghats',
  'wadi-rum',
  'zanzibar',
];

const TARGET_TEST_CITIES = 100;
/** Roughly half the core list, so core cities sit on both sides of the comparison. */
const TARGET_CORE_IN_TEST = 40;

// FNV-1a. Any stable hash works; this one is short and dependency-free.
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Sorting by hash and taking a prefix samples reproducibly AND pins the group size
 *  exactly, which a modulo threshold cannot do. */
function lowestHashing(slugs: string[], n: number): string[] {
  return slugs.slice().sort((a, b) => hash(a) - hash(b) || a.localeCompare(b)).slice(0, Math.max(0, n));
}

export function getGeoTestCities(allCitySlugs: string[]): Set<string> {
  const test = new Set<string>(PROBE_CITIES);
  COHORT_1.forEach((s) => test.add(s));

  const core = new Set<string>(CORE_DESTINATIONS);
  const isFree = (s: string) => !test.has(s);

  // Stratum 1: core destinations, capped so the rest stay in the control arm.
  const coreAlready = CORE_DESTINATIONS.filter((s) => test.has(s)).length;
  lowestHashing(allCitySlugs.filter((s) => core.has(s) && isFree(s)), TARGET_CORE_IN_TEST - coreAlready)
    .forEach((s) => test.add(s));

  // Stratum 2: everything else, filling up to the overall target.
  lowestHashing(allCitySlugs.filter((s) => !core.has(s) && isFree(s)), TARGET_TEST_CITIES - test.size)
    .forEach((s) => test.add(s));

  return test;
}
