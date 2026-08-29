/**
 * Safety-messaging holdout on /companions/ (bead roammate-website-goc).
 *
 * The trust story is quarantined: src/pages/safety.astro carries 105 safety mentions and
 * took 1 request in 24h, while companions/[slug].astro — 442 pages, the best-converting
 * template on the site at 9.39% CTR — mentions safety once and verification not at all.
 * The template sells the BENEFIT of having a companion but never answers the objection
 * the page actually raises: how is meeting a stranger from the internet made safe.
 *
 * Test arm gets a trust section; control is untouched. Compared at the 3on export.
 *
 * Independent of the GEO holdout in geoTestSet.ts by design — different salt, so
 * assignment is uncorrelated. The two cannot confound each other anyway: that experiment
 * changes /itinerary/ and this one changes /companions/, which are separate URLs and
 * separate Search Console sections.
 */

const SALT = 'safety-v1';

// FNV-1a over slug+salt. Same construction as geoTestSet, different salt.
function hash(s: string): number {
  let h = 0x811c9dc5;
  const input = `${SALT}:${s}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Even split. Unlike the GEO holdout there is no reason to cap the test arm: this is a
 * copy change on a template we already own, not an experiment whose blast radius we are
 * trying to limit, and an even split gives the most statistical power per page.
 */
export function isSafetyTestCity(slug: string): boolean {
  // Bit 16, not bit 0. FNV-1a's lowest bit is just the XOR-parity of the input bytes
  // (the prime is odd, so multiplication never disturbs it), which makes `% 2` a parity
  // function of the slug rather than a mixed hash. A middle bit is properly diffused.
  return ((hash(slug) >>> 16) & 1) === 0;
}
