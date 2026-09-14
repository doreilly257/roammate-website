# Referral aggregate refresh — 2026-09-14

**Scope:** Read-only, bounded measurement evidence for `roammate-website-lnn` and the separately labeled `roammate-website-bq3` comparison below. This report does not close either Bead, authorize a growth campaign, or establish GSC acceptance. Parent-agent query receipts supplied the results below; the report author issued no additional queries.

## Prerequisite checks

- The available metric catalog was empty: no canonical conversion metric was available to reuse.
- Event schema and event properties were checked before the aggregate query.
- A September 13 count probe returned 54 `$pageview` events and 3 `app_store_click` events.
- Current `BaseLayout.astro` consolidates Apple labels (`appstore` / `app_store`) into `app_store_click`, not Play labels. `AppCTA` sends an individual Play event; individual Play events exist in the event schema, but are not included here. These figures are an Apple-click proxy, not all-store conversion. Individual Apple events must not be added to their consolidated counterparts, which would double-count the same interaction.

## Exact aggregate SQL

The two complete UTC weeks are August 31–September 7 and September 7–14, with inclusive starts and exclusive ends. **UTC interpretation of these query boundaries is verified** by the following read-only scalar query. Its returned epoch values match JavaScript `Date.parse` of the corresponding explicit-`Z` timestamps, divided by 1,000. This verifies these boundary expressions, not an independently inspected project timezone setting.

```sql
SELECT
    toUnixTimestamp(toDateTime('2026-09-07 00:00:00')) AS split_epoch,
    toUnixTimestamp(toDateTime('2026-08-31 00:00:00')) AS start_epoch,
    toUnixTimestamp(toDateTime('2026-09-14 00:00:00')) AS end_epoch
```

Returned `split_epoch | start_epoch | end_epoch`: `1788739200 | 1788134400 | 1789344000`.

```sql
SELECT
    if(timestamp < toDateTime('2026-09-07 00:00:00'), '2026-08-31/09-07', '2026-09-07/09-14') AS window_utc,
    if(properties.utm_source = 'chatgpt.com', 'chatgpt_utm', 'other_or_missing_utm') AS source_group,
    countIf(event = '$pageview') AS pageviews,
    uniqExactIf(person_id, event = '$pageview') AS pageview_person_ids,
    countIf(event = 'app_store_click') AS apple_click_events,
    uniqExactIf(person_id, event = 'app_store_click') AS apple_click_person_ids
FROM events
WHERE timestamp >= toDateTime('2026-08-31 00:00:00')
    AND timestamp < toDateTime('2026-09-14 00:00:00')
    AND event IN ('$pageview', 'app_store_click')
    AND properties.$host = 'roammate.com'
GROUP BY window_utc, source_group
ORDER BY window_utc, source_group
LIMIT 4
```

## Returned aggregates

| Window label | Event-time source group | Pageviews | Pageview person IDs | Apple click events | Apple click person IDs |
| --- | --- | ---: | ---: | ---: | ---: |
| 2026-08-31/09-07 | chatgpt_utm | 18 | 13 | 1 | 1 |
| 2026-08-31/09-07 | other_or_missing_utm | 146 | 102 | 9 | 8 |
| 2026-09-07/09-14 | chatgpt_utm | 21 | 14 | 4 | 4 |
| 2026-09-07/09-14 | other_or_missing_utm | 227 | 122 | 11 | 11 |

Descriptive Apple-click-events / pageview-unique-person-ID ratios:

| Window label | ChatGPT UTM | Other or missing UTM |
| --- | ---: | ---: |
| 2026-08-31/09-07 | 1/13 (7.69%) | 9/102 (8.82%) |
| 2026-09-07/09-14 | 4/14 (28.57%) | 11/122 (9.02%) |

## Interpretation and limits

- Source assignment uses each event's `utm_source`. The groups are disjoint **per event**, not per person or session: one person can appear in both groups, or have pageviews and clicks assigned differently. This is not an attributed or ordered funnel.
- `uniqExactIf(person_id, ...)` returns aggregate identifier cardinalities, not verified human counts. No raw identities, event rows, personal records, or URL query strings were requested or reproduced for this report.
- Ratios divide click-event counts by distinct pageview person IDs; numerator and denominator are not linked. They are descriptive only, not signup, install, unique-person conversion, retention, or causal lift estimates.
- ChatGPT samples are tiny. No clean-traffic, test, bot, or cohort-membership exclusion was applied. `other_or_missing_utm` must not be relabeled “direct.”
- Deployment and rollback changes confound period comparisons. Instrumentation consistency requires further validation before stronger claims.
- These bounded weekly aggregates cannot validate the historical 60-day “2.5×” claim, establish comparable acquisition quality, or justify closing growth/GSC Beads. They refresh a measurement prerequisite only; root review and Bead disposition remain separate.

## Comparison blog versus homepage — `roammate-website-bq3`

Read-only property metadata confirmed both path values below. The same verified UTC boundaries and aggregate-only privacy limits apply. This comparison groups events by their own pathname; it does not attribute a later click or download to an earlier page visit.

```sql
SELECT
    if(timestamp < toDateTime('2026-09-07 00:00:00'), '2026-08-31/09-07', '2026-09-07/09-14') AS window_utc,
    if(properties.$pathname = '/', 'homepage', 'comparison_blog') AS page_group,
    countIf(event = '$pageview') AS pageviews,
    uniqExactIf(person_id, event = '$pageview') AS pageview_person_ids,
    countIf(event = 'app_store_click') AS apple_click_events,
    uniqExactIf(person_id, event = 'app_store_click') AS apple_click_person_ids
FROM events
WHERE timestamp >= toDateTime('2026-08-31 00:00:00')
    AND timestamp < toDateTime('2026-09-14 00:00:00')
    AND event IN ('$pageview', 'app_store_click')
    AND properties.$host = 'roammate.com'
    AND properties.$pathname IN ('/', '/blog/best-travel-companion-apps-2026/')
GROUP BY window_utc, page_group
ORDER BY window_utc, page_group
LIMIT 4
```

| Window label | Event-time page group | Pageviews | Pageview person IDs | Apple click events | Apple click person IDs |
| --- | --- | ---: | ---: | ---: | ---: |
| 2026-08-31/09-07 | comparison_blog | 8 | 8 | 1 | 1 |
| 2026-08-31/09-07 | homepage | 29 | 19 | 6 | 5 |
| 2026-09-07/09-14 | comparison_blog | 10 | 8 | 5 | 5 |
| 2026-09-07/09-14 | homepage | 37 | 23 | 2 | 2 |

These small, unfiltered samples do not validate historical 60-day parity, download counts, or conversion claims. A person may appear under both paths; click events and pageview person IDs are not linked into a funnel. Apple-only coverage, potential test/bot traffic, and deployment/rollback confounds remain. No raw URLs, query strings, identities or event rows are reproduced. `bq3` and `lnn` remain open; the growth hold is unchanged.

## Source-only click inventory and measurement method

Root inspection of local templates found the following wiring. This is **local source evidence only**, not rendered element counts, full click coverage, content-body link coverage, or parity with the deployed bundle.

| Local template/component | Inspected placement | Individual Apple / Play event labels |
| --- | --- | --- |
| `Hero` | Imported by homepage `index` | `hero_appstore_click` / `hero_playstore_click` |
| `CTA` | Imported by homepage `index` | `cta_appstore_click` / `cta_playstore_click` |
| `StickyBar` | Global `BaseLayout` component | `sticky_appstore_click` / `sticky_playstore_click` |
| `AppCTA` | `BlogPostLayout` top and bottom | `blog_appstore_click` / `blog_playstore_click` |
| Conditional mid-post CTA | `BlogPostLayout` | `blog_midpost_cta_appstore_click` / `blog_midpost_cta_playstore_click` |

`BaseLayout` also includes navigation and footer; neither inspected component contains store links. Blog pages also inherit the global sticky bar. Conditional source placement does not establish whether a particular rendered page includes it.

Under the inspected local wiring, an Apple interaction emits its individual event plus consolidated `app_store_click`; a measurement must use **one family, not their sum**. Play's individual source labels are candidates only: verify each event's actual analytics availability before querying it. Broad `cta_click` includes mixed actions and is not a store-click metric.

A comparable measurement must fix verified UTC windows, exact host/path filters, and explicit platform groups; avoid Apple duplication; and return aggregates only. Any unknown, test or bot handling must be stated rather than silently assumed. Rollout/rollback confounds must remain visible. Distinct identifier counts must not be called humans, clicks must not be called downloads, and event-time grouping must not be presented as inferred person/session attribution. **A clean, comparable result is currently unavailable.** This inventory/method note neither implements tracking changes nor opens a new design project.
