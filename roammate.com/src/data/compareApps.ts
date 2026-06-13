// Display names for the apps roammate is compared against.
// Keyed by comparison blog post slug (roammate-vs-<app>).
// Keep in sync with src/content/blog/roammate-vs-*.json — compare/index.astro
// throws at build time if a comparison post has no entry here.
export const appNames: Record<string, string> = {
  'roammate-vs-couchsurfing': 'Couchsurfing',
  'roammate-vs-tourlina': 'Tourlina',
  'roammate-vs-backpackr': 'Backpackr',
  'roammate-vs-facebook-travel-groups': 'Facebook Travel Groups',
  'roammate-vs-meetup': 'Meetup',
  'roammate-vs-bumble-bff': 'Bumble BFF',
  'roammate-vs-hostelworld': 'Hostelworld',
  'roammate-vs-travello': 'Travello',
  'roammate-vs-gaffl': 'GAFFL',
};
