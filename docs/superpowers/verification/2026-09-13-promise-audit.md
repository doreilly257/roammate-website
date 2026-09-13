# Blog promise audit — 13 September 2026

## Scope and method

Local-source continuation of Beads `roammate-website-do5`, not a live-site or store
certification. Enumerated product-bearing prose before applying known-false rules.
No browser, live API, personal records, owner writes, store uploads or deployment.

- Inventoried all **127 JSON blog posts**. Inspected `description`, `intro` and each
  `sections[].content` field: **556 fields**, with array content joined for screening.
  **71 fields in 22 posts mentioned roammate before these edits**; these are candidate prose fields,
  **not 71 independently verified claims**. Byline, related-slug and image-path
  matches were excluded. Reviewed the candidate passages in context, including
  adjacent pronouns and negative capability statements.
- Enumerated all **64 roammate value cells across nine static comparison tables**.
  `src/pages/blog/[slug].astro` excludes these nine slugs; each static page loads
  the JSON through `src/lib/blog-data.ts` and appends its own table. Both surfaces
  matter: auditing JSON alone misses rendered claims.
- The original **295 candidates in 41 files** and original **39 blog claims in
  19 posts** are historical do5 figures, not counts reverified by this pass.
  This pass does not establish all current website, competitor or store claims.

Paths below are relative to `roammate.com/` unless otherwise stated.

## Established truth used

The do5 owner-confirmed record establishes matching by travel style, daily budget
bracket and destination overlap; optional government-ID/liveness verification with
a profile badge; in-app chat, block/report; nominated emergency contacts and SOS;
and free availability on iOS and Android. Its later notes explicitly correct the
initial suspicion about reviews and record the moderation commitment as confirmed.
The same optional-verification evidence is recorded in
`scripts/check-claims.mjs` (`verification-is-mandatory`: inert mandate/default flag),
and the existing verification/Android copy regressions preserve prior approved
website corrections. These are established project records, not a new production
feature-flag check.

Repository-local `.tmp/appstore-drafts/APPLY.md:32-62` records real-time chat,
trip memories, bucket lists and groups, plus **shipped, end-to-end-tested reviews**
(double-blind release, invalid-review rejection and rating updates). It also records
the disabled concierge and missing read-receipt UI. That ignored artifact is
historical evidence, not an assertion that current store metadata was re-exported.
No SOS, badge or group prohibition was reinstated, and no inference was made from
missing analytics events. Current metadata acceptance stays with the owning apps.

## Proven false and corrected locally

| Original claim | Exact source | Evidence and local correction |
| --- | --- | --- |
| Verification: `Yes (all users)` | `src/pages/blog/roammate-vs-{backpackr,bumble-bff,facebook-travel-groups,gaffl,hostelworld,meetup,tourlina,travello}.astro`, verification table row | Eight claims contradict established optional verification. All eight now say `Optional identity verification`. Couchsurfing already said `Optional, badged` and was unchanged. |
| Potential companion `has verified their identity and travel history before you agree to anything` | `src/content/blog/why-roammate-perfect-companion.json`, `sections[0].content` | Guaranteed verified identity contradicts optional verification; no travel-history attestation evidence was supplied. Replaced the compound guarantee with optional government-ID/liveness check, visible badge and profile details, explicitly not a safety/trustworthiness guarantee. This does not assert that history attestation was proven absent. |
| `roammate's Android version is in development` | `src/content/blog/roammate-vs-hostelworld.json`, `sections[1].content` | Contradicts established shipped Android availability and the page's own iOS/Android table. Removed the stale clause and stated free/no-ads availability on iOS and Android. Competitor claims unchanged. |

**Ten false/overpromising instances corrected across ten content files.** Local
implementation only; none is claimed published by this audit. No URL, page count,
robots or llms change is needed for these in-place corrections; build verification
belongs to root integration.

## Claim-category dispositions

| Category | Disposition and representative sources |
| --- | --- |
| Compatibility matching, travel-specific profiles and planning before arrival | Supported at the capability level by established owner confirmation. Repeated throughout the 22-post inventory and all nine tables. Exact “only”, “all three before any profiles” and comparative superiority formulations are not independently validated algorithm guarantees. |
| Free, iOS/Android, no premium tier, no ads | Established project truth; corrected the additional Hostelworld contradiction. This is not a fresh App Store/Play listing check. |
| Optional identity verification and visible badge | Established; corrected eight mandatory table claims and the compound companion guarantee. `is-roammate-safe.json` explicitly permits unverified messaging. |
| In-app chat and block/report | Capability established. `free-couchsurfing-alternatives-2026.json` and `is-roammate-safe.json` contain stronger surface/retention promises requiring the qualifications below. |
| Emergency contacts and SOS | Established capability; retained in hiking, India and safety-app posts. No claim of SMS or professional rescue added. |
| Companion matching rather than accommodation/trek operation | Consistent with established product role; accommodation denial retained in costs, hiking, Middle East, India, Southeast Asia and accommodation comparisons. A blanket denial of every possible booking capability is a different claim. |
| Reviews, trip memories, bucket list, groups | Existing evidence supports capability. Do not remove reviews because an old event taxonomy omitted them; do not resurrect retired rules. Negative comparisons may need updating as these features evolve. |
| Competitor pricing, features, demographics and market superiority | Outside this roammate capability check; not verified without permitted current external research. Left unchanged. |

## Unsupported promises qualified; remaining evidence limits

These are evidence findings attached to do5, not a separate task tracker.

- **Age collection — unsupported absolutes qualified locally:**
  `best-solo-travel-apps-over-40.json`, intro previously said `We hold no age data
  on our own users`; `sections[0].content` said `We do not collect age`. Current owner source
  `/Users/doreilly/Work/roammate-app-ios/api/src/routes/profileSetup.ts:75-106`
  accepts private `dateOfBirth`, and `api/src/services/profileSetup.ts:443-450`
  derives age. This is a concrete source contradiction requiring owner release
  confirmation; source presence alone does not prove the route is currently
  deployed/reachable. Both absolutes were replaced with strictly article-scoped
  statements: this post presents no roammate age breakdown and makes no inference
  about its users. These **two qualifications are separate from the ten proven
  false/overpromising corrections** above; they assert neither current collection
  nor noncollection. No claims-guard rule or privacy-policy change was made.
  A new regression failed before editing and passed afterward. No personal records
  were read. The same post's `sections[2].content` previously said `no age filter,
  no gender filter`; that now describes this article's focus on budget, travel
  style and destination overlap instead. Filter availability was not inferred
  from DOB storage or age eligibility checks.
- **Exact location and retained information — qualified locally:**
  `is-roammate-safe.json`, `sections[1].content` previously promised cutting
  contact `without them retaining any of your information` and that GPS,
  accommodation address and movements stay private. Copy now explains that
  blocking cannot erase already shared information or prevent screenshots, and
  advises reviewing permissions/settings and sharing fewer details. No opposite
  location-disclosure or retention-policy assertion was added.
  `best-safety-apps-solo-travel-2026.json`, `sections[5].content` replaces `Nobody
  sees your live position on a map` with permissions/sharing precautions.
  Exact one-tap controls on every profile/conversation remain unverified UI
  detail; established block/report capability alone does not prove tap counts.
- **Blanket negative capabilities — prose qualified locally:**
  `roammate-vs-travello.json`, `sections[0].content` previously said `roammate does
  one thing` and `There's no social feed, no activity booking, no inspiration
  content`. It now describes the established companion-matching purpose, without
  claiming those other capabilities present or absent. Existing groups/memories
  evidence does not prove a social feed or booking surface is shipped.
  The Travello activity-booking table and
  `couchsurfing-vs-hostelworld-vs-roammate.json`'s `no booking` need product-scope
  clarification rather than guesses from route filenames.
- **Reference/insurance/liability denial — qualified locally:**
  `best-apps-to-find-a-hiking-or-trekking-partner.json`, `sections[0].content`
  previously said `There is no fitness check, no reference system, no insurance
  and no liability`. It now distinguishes identity badges and traveller reviews
  from a trekking-fitness assessment and recommends qualified guidance and
  suitable travel insurance. Reviews remain established; no legal liability or
  platform insurance guarantee is made.
- **Outcome/superiority wording:** “deepest compatibility matching”, “faster and
  more reliable”, and exact-example matches in comparison/companion prose are not
  demonstrated by capability existence. Neither population size, successful
  matching rates nor competitor effectiveness was measured here.

The five additional risk-promise passage qualifications above are **not added to
the ten proven false/overpromising instances**. They join the two age-data
qualifications as conservative wording improvements where exhaustive capability,
privacy or legal assertions were not justified. No new broad known-false rules,
competitor-fact changes or privacy-policy edits were made.

## Reproducible regression evidence

Before content/guard changes, new tests failed for all eight table cells, the
companion guarantee and Hostelworld development clause. Guard fixtures independently
failed because the existing regexes returned success for both verification-table
labels and the compound guarantee. An allowed-copy fixture was adjusted to avoid an
unrelated pre-existing cross-sentence regex match, then passed before implementation.

After changes:

```text
npx vitest run scripts/__tests__/verification-copy.test.ts \
  scripts/__tests__/android-availability-copy.test.ts \
  scripts/__tests__/claims-guard.test.ts \
  scripts/__tests__/blog-demographics-copy.test.ts \
  scripts/__tests__/blog-promise-qualifications.test.ts
5 files passed; 26 tests passed
node scripts/check-claims.mjs --all
claims: clean (662 files scanned)
```

The guard now detects the verification-label/roammate-value cell pair without
consuming the competitor's adjacent cell, plus the exact guaranteed-companion
variant. Positive coverage retains optional verification, verified badges, reviews,
SOS, groups and a competitor's all-users cell. A clean 662-file guard remains only
a known-pattern regression result, **not broad audit completion**.
The five risk-promise qualification regressions also failed on the old text before
the neutral edits and passed afterward. `git diff --check` passed.

## Candidate-post inventory

All names below refer to `src/content/blog/<name>.json`:

```text
best-apps-meeting-travellers-middle-east
best-apps-splitting-travel-costs
best-apps-to-find-a-hiking-or-trekking-partner
best-safety-apps-solo-travel-2026
best-solo-travel-apps-over-40
best-travel-apps-for-backpacking-india
best-travel-buddy-apps-southeast-asia
best-travel-companion-apps-2026
couchsurfing-vs-hostelworld-vs-roammate
finding-travel-companions
free-couchsurfing-alternatives-2026
is-roammate-safe
roammate-vs-backpackr
roammate-vs-bumble-bff
roammate-vs-couchsurfing
roammate-vs-facebook-travel-groups
roammate-vs-gaffl
roammate-vs-hostelworld
roammate-vs-meetup
roammate-vs-tourlina
roammate-vs-travello
why-roammate-perfect-companion
```
