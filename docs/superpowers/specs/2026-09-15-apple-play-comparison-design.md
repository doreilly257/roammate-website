# Apple / Play native-metric comparison design

Date: 2026-09-15. Status: **technical and user written review approved; implementation remains separately gated**. User selected policy A: separate platform-native metrics, with verified shared dates before comparison. This document authorizes no implementation, private reads, totals, uploads or tracking changes.

## Evidence and present decision

Retained evidence is the owner’s `/Users/doreilly/Work/roammate-app-ios/docs/verification/2026-09-14-apple-analytics-report-windows.md` and the website’s [Play coverage report](../verification/2026-09-15-play-coverage-cargo-cause.md) and [receipt](../verification/2026-09-15-play-coverage.json). No new provider inspection was performed for this design.

Apple’s selected reports are **Discovery and Engagement**, not App Downloads. Standard and Detailed are overlapping alternatives, not additive sources; daily, weekly and monthly instances must not be summed together. Choose **Standard DAILY** for this proposed Apple panel; Detailed and other granularities remain excluded. Retained snapshot Standard DAILY bounds are February 24–August 31; these endpoints do not certify every intervening date or a baseline. The selected ongoing DAILY instance contains September 10–12, despite September 13 processing. See [Apple Discovery and Engagement](https://developer.apple.com/documentation/analytics-reports/app-store-discovery-and-engagement) for the report family, and [Apple App Downloads](https://developer.apple.com/documentation/analytics-reports/app-download) for the distinct family that is not established by this evidence.

Play’s seven selected overview objects span March–September by filename, but actual date coverage differs: March has only 24 date rows between March 1 and 31; August stops at August 21; September stops at September 8 despite a September 13 object update. April–July bounds/counts still do not independently prove unique complete day sets. Thus selected ongoing Apple September 10–12 and Play September 1–8 are **disjoint**. Historical bounds potentially overlap, but exact date sets have not been verified: **no matched window is certified**.

## Alternatives

| ID | Option | Decision |
| --- | --- | --- |
| A | Separate labeled native panels after common-date and semantic gates | **User-selected / recommended.** Preserves differences rather than inventing a shared unit. |
| B | Compare download-oriented families | Blocked: needs separately approved Apple Downloads availability/coverage and verified metric definitions on both platforms. Merely renaming Discovery events would be invalid. |
| C | Coverage-only display | Safe fallback while A’s gates are unresolved; report unavailable metrics and explicit date gaps. |

## Metric contract: preserve distinctions

Apple `Counts` and `Unique Counts` are separate measures. Fix and label the chosen event and dimension grain before deriving any value. Do not sum Unique Counts across dimensions or days without authoritative documentation explicitly permitting that aggregation at the chosen grain. Do not presume Counts are additive across overlapping dimensions either. Never blend Standard and Detailed or use a weekly/monthly period-start label as a daily observation.

The twelve retained Play headers are `Date`, `Package name`, `Daily Device Installs`, `Daily Device Uninstalls`, `Daily Device Upgrades`, `Total User Installs`, `Daily User Installs`, `Daily User Uninstalls`, `Active Device Installs`, `Install events`, `Update events`, and `Uninstall events`. Keep user-labeled, device-labeled, event-labeled and stock/total-labeled fields distinct. These labels are **not sufficient semantic definitions**: exact legacy-column population, deduplication, time basis, stock/flow and aggregation rules remain unverified. Unknown rules fail closed; do not infer that a total/active field can be summed or that a Play install equals an Apple discovery event, download or unique count.

[Google’s statistics export guidance](https://support.google.com/googleplay/android-developer/answer/6135870?hl=en) is a source for export-format/delivery context, not proof of every retained legacy column’s definition. UTF-16 is directly confirmed in the retained receipt. Before metric computation, obtain source-backed definitions for each selected metric, including permitted aggregation; leave unsupported metrics unavailable. This design does not newly verify a precise export delay or timezone.

## Future shared-date acceptance gate

A separately approved coverage pass must satisfy all of the following before any parallel native-metric presentation:

1. **Predeclare selection before inspecting outcomes.** Fix intended calendar interval, Standard DAILY Apple family, Play overview family, metric/dimension grain, eligible report versions and date-intersection rule. Do not shift endpoints or select high-performing days after seeing values.
2. **Verify real Date sets.** Parse actual daily Date values, not filenames, processing dates, update timestamps or min/max alone. Verify timezone/day-boundary semantics from authoritative sources for both reports. Unknown or incompatible day boundaries block matching; no assumed UTC alignment or silent conversion of aggregate day buckets.
3. **Verify completeness and grain.** Exhaust the relevant listing pages and segments, validate expected app/package and schema, and detect duplicate full-grain keys. Multiple dimension rows on one day are not automatically duplicate daily observations; require the documented grain. Retained selected-instance evidence does not prove every instance needed for a new interval is present.
4. **Resolve versions and corrections explicitly.** Record report/instance/object generation identities and checksums where available, retrieval time and documented late-arrival/correction treatment. Select a single applicable version for each logical report under a declared rule; never add old and corrected copies. Unknown precedence blocks affected days rather than arbitrarily choosing a convenient version.
5. **Publish coverage, not silent filtering.** Calculate date-set intersection only after the above gates. Show intended calendar-day denominator, available unique dates per platform, shared dates, missing/suppressed/unknown days and coverage fraction. Missing or suppressed is never zero. Retain all exclusions and reasons in sanitized date-coverage metadata.
6. **Handle gaps visibly.** An empty intersection yields unavailable, not zero. A noncontiguous intersection must be shown as an explicitly gapped date set with coverage denominator, never presented as a continuous matched interval. Do not silently omit unavailable days or call partial coverage complete. If the intended use needs a complete contiguous interval, any gap blocks that use.

## Presentation and privacy

Only separate panels labeled with platform, exact native report/metric, unit/definition status, grain, date set, day boundary, coverage and version status are allowed. Until semantics and shared dates pass, use option C with reasons. Shared dates do not establish shared units, comparable populations or attribution.

No cross-platform ratios, combined sums, rankings, conversion funnels, attribution or growth-acceptance claims are permitted. This phase computes no values. Future persisted evidence is limited to aggregate metadata, header/schema information and date coverage—including gap/duplicate/correction status—not raw report rows, dimension records, credentials or signed URLs. A later proposal to retain/display actual metric values needs its own explicit scope and semantic review.

## Synthetic verification before implementation acceptance

A future offline harness must cover missing interior days despite matching endpoints; duplicate full-grain keys versus legitimate dimension rows; explicit zero versus absent/suppressed data; wrong Apple family or granularity; unknown/incompatible timezones; monthly labels mistaken for days; unique-count additivity rejection; corrected report replacement versus double counting; incomplete pages/segments; disjoint windows; and noncontiguous intersections with an unchanged predeclared denominator. Fixtures must be synthetic, with no private provider reads.

Review this written design before implementation. Passing future synthetic tests would not certify real-source coverage, metric definitions or a growth baseline. Beads remain authoritative for prerequisites and approvals.
