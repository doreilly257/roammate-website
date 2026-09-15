# Analytics vendor clarification drafts

Date: 2026-09-15. Status: **DRAFTS — NOT SENT**. Approved scope is drafting only, not contacting either vendor. These copy-ready questions contain no account identifiers, bucket URI, report rows or credentials; no private examples are necessary.

Prepared from the [public metric-definition audit](2026-09-15-public-metric-definitions.md) and [approved comparison design](../specs/2026-09-15-apple-play-comparison-design.md). Answers must be supported by authoritative current documentation for the exact export, not inferred from similar metrics. Drafting does not resolve any measurement gate.

## Draft A — Apple

**Subject: Analytics Reports API Discovery and Engagement Standard DAILY semantics**

Hello,

Please clarify the following for the Analytics Reports API’s **App Store Discovery and Engagement Standard DAILY** report, specifically `Date`, `Counts` and `Unique Counts`. We are not asking about App Downloads or combining Standard and Detailed reports.

1. What exact timezone and start/end boundaries define each DAILY `Date`? Does UTC apply specifically to this API export, independently of account location? Please link documentation connecting this export to the timezone rule. The [report definition](https://developer.apple.com/documentation/analytics-reports/app-store-discovery-and-engagement) and [general reporting-tool comparison](https://developer.apple.com/help/app-store-connect/measure-app-performance/differences-in-reporting-tools/) provide context, but we do not want to assume general App Analytics guidance proves this exact API boundary.
2. For a fixed Event (please distinguish Impression and Tap), what is the full row grain, and which dimension groups are mutually exclusive? Under what documented conditions may `Counts` be summed across rows, dimensions or dates without double-counting? Are subtotal or overlapping rows possible?
3. Please confirm the deduplication scope of `Unique Counts`. Which, if any, combinations across dimensions or days are valid? We currently treat these values as nonadditive unless explicitly documented otherwise.
4. How should consumers identify and select corrected or rerun DAILY report instances? Do newer instances replace earlier values or provide increments, can their date windows overlap, and what documented late-arrival/correction window applies? Which instance/version attributes establish precedence?
5. How should omitted or suppressed rows/dates be distinguished from genuine zero activity? Is absence ever a documented zero for this exact report and grain?

Please provide current authoritative references and flag any behavior that is not guaranteed. We will keep undefined aggregations and date matching unavailable rather than infer semantics.

Thank you.

## Draft B — Google Play

**Subject: Legacy stats/installs overview Daily Device Installs definition and Date boundary**

Hello,

Please clarify the exact legacy **`Daily Device Installs`** column in downloadable **`stats/installs` overview CSV** reports. The [export documentation](https://support.google.com/googleplay/android-developer/answer/6135870?hl=en-GB) specifies a required integer, while [modern statistics documentation](https://support.google.com/googleplay/android-developer/answer/139628?hl=en) describes other metrics. We need an authoritative definition for this legacy column rather than an assumed mapping.

1. What population and event does this field count? Please explicitly address first installations, reinstalls, preinstalled-app activation, device reactivation, multiple devices belonging to one user, and repeated installations on one device within a day.
2. What identity and time scope govern deduplication? Is this an event flow, distinct-device count or another measure? Can daily values be summed across dates or dimensions, and which aggregation rules avoid double-counting?
3. What exact timezone defines the CSV `Date` and its start/end boundaries? If Pacific Time applies, does it observe daylight saving time (rather than a fixed UTC offset), and are transition days 23/25-hour buckets? Please link guidance specifically applicable to this legacy export; general console statistics guidance alone may not establish that mapping.
4. Is `Daily Device Installs` equivalent to any current Device acquisition or Install events metric? If so, please document the mapping, exclusions and effective dates. If not, please explicitly confirm that modern definitions must not be substituted.
5. How are schema changes, deprecated columns, unavailable/suppressed values and genuine zero distinguished? Does a required integer ever use zero as a placeholder rather than zero measured activity? How should corrected/reissued monthly objects be selected without adding previous and replacement values, and can an object update date be later than its last represented data date?

Please provide current authoritative documentation or a definitive product-support explanation for these exact fields, including any historical version limitations. No account-specific report rows should be needed to establish the general contract.

Thank you.

## Sending boundary

Neither draft has been sent. Any vendor contact needs separate authorization and an approved destination. Do not attach raw reports, credentials, signed URLs or account-specific identifiers automatically. A response would still need review for exact report applicability before evidence status or comparison eligibility changes.
