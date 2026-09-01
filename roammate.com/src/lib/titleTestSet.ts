/**
 * Guide title / H1 holdout (bead roammate-website-849, from 8hq's investigation).
 *
 * TWO PROBLEMS, both measured against the built dist on 2026-09-01:
 *
 *   1. CANNIBALISATION. 115 city guides are titled "<City> Travel Guide 2026:
 *      3-Day Itinerary" while a dedicated /itinerary/<slug>-3-day/ page exists
 *      titled "<City> 3-day Itinerary: Day-by-Day Guide". 100% collision on those
 *      115 — two of our own pages competing for one duration-specific query, and
 *      the guide is the one that should not be entering that race. It should own
 *      the broad "travel guide" intent instead: where to stay, what it costs,
 *      local tips.
 *
 *   2. BARE H1. Every city guide's H1 is the place name alone ("Macau"), with
 *      every descriptive term stranded in the <title>. The strongest content on
 *      the site carrying the weakest on-page signal.
 *
 * DESIGN — a holdout, not a blanket change, for the same reason as 2u3: the
 * evidence behind this is structural (two pages, one query shape), not causal.
 * Nothing has yet shown the two pages actually surface together. ~40 of the 115
 * are treated and the remaining ~75 are an untouched control, so the effect is
 * measurable within one period rather than across a before/after in which Google
 * also changed.
 *
 * STRATIFIED AGAINST THE GEO TEST (2u3), which is live on these same pages. If
 * assignment were independent, a city could carry both changes and neither effect
 * would be attributable. Splitting within each GEO arm keeps the two experiments
 * orthogonal: each title arm holds roughly the same proportion of GEO-treated
 * pages, so a title delta cannot be a GEO delta in disguise.
 *
 * CONFOUND, AND IT IS DELIBERATE: treated pages get the retitle AND the H1
 * together, so this measures the pair, not either alone. Separating them would
 * need four arms and ~30 pages each, which is too thin to read. If the pair
 * wins, the follow-up question of which half did the work is worth a second test.
 *
 * Treatment started 2026-09-01. Assignment is a pure function of the slug —
 * stable across builds and machines. Do not remove a city from TITLE_TEST once
 * it is live; dropping a page mid-experiment voids its data.
 */
import { getGeoTestCities } from './geoTestSet';

/** Roughly a third of the 115, leaving a control arm about twice its size. */
const TARGET_TREATED = 40;

/** A guide collides when its own title advertises a day count that also has a
 *  dedicated /itinerary/<slug>-<n>-day/ page. */
const DURATION_IN_TITLE = /:\s*(\d+)-Day Itinerary/i;

export function collidesWithItinerary(title: string, itineraries: Record<string, unknown>): boolean {
  const m = title.match(DURATION_IN_TITLE);
  return m != null && Object.prototype.hasOwnProperty.call(itineraries, m[1]);
}

// FNV-1a, salted so this assignment is independent of geoTestSet's.
function hash(s: string): number {
  let h = 0x811c9dc5;
  const salt = `849:${s}`;
  for (let i = 0; i < salt.length; i++) {
    h ^= salt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function lowestHashing(slugs: string[], n: number): string[] {
  return slugs
    .slice()
    .sort((a, b) => hash(a) - hash(b) || a.localeCompare(b))
    .slice(0, Math.max(0, n));
}

/**
 * @param colliding every city slug whose guide title collides, sorted.
 * @param allCitySlugs every city slug, sorted — needed to reproduce the GEO arms.
 */
export function getTitleTestCities(colliding: string[], allCitySlugs: string[]): Set<string> {
  const geo = getGeoTestCities(allCitySlugs);
  const inGeo = colliding.filter((s) => geo.has(s));
  const outGeo = colliding.filter((s) => !geo.has(s));

  // Allocate the treated budget proportionally, so both strata are represented at
  // the same rate and the arms stay balanced on GEO membership.
  const share = colliding.length === 0 ? 0 : TARGET_TREATED / colliding.length;
  const treated = new Set<string>();
  lowestHashing(inGeo, Math.round(inGeo.length * share)).forEach((s) => treated.add(s));
  lowestHashing(outGeo, TARGET_TREATED - treated.size).forEach((s) => treated.add(s));
  return treated;
}

/** Drop the duration so the guide stops competing with its own itinerary page,
 *  and state the broad intent it should own instead. */
export function deCannibalisedTitle(title: string): string {
  return title.replace(DURATION_IN_TITLE, ': Costs, Stays & Local Tips');
}
