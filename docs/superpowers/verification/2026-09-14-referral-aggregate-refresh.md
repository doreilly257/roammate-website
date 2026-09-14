# Referral aggregate refresh — 2026-09-14

**Scope:** Read-only, bounded measurement evidence for `roammate-website-lnn` only. This report does not close that Bead, authorize a growth campaign, or establish GSC acceptance. Parent-agent query receipts supplied the results below; no additional query was issued to prepare this report.

## Prerequisite checks

- The available metric catalog was empty: no canonical conversion metric was available to reuse.
- Event schema and event properties were checked before the aggregate query.
- A September 13 count probe returned 54 `$pageview` events and 3 `app_store_click` events.
- Current `BaseLayout.astro` consolidates Apple labels (`appstore` / `app_store`) into `app_store_click`, not Play labels. Individual Play events exist in the event schema, but are not included here. These figures are an Apple-click proxy, not all-store conversion.

## Exact aggregate SQL

The two intended complete UTC weeks are August 31–September 7 and September 7–14, with inclusive starts and exclusive ends. **UTC interpretation is an assumption of the query's default `toDateTime` handling; project timezone was not independently queried.** The result labels alone do not verify timezone semantics.

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
- Deployment and rollback changes confound period comparisons. Instrumentation consistency and timezone interpretation require further validation before stronger claims.
- These bounded weekly aggregates cannot validate the historical 60-day “2.5×” claim, establish comparable acquisition quality, or justify closing growth/GSC Beads. They refresh a measurement prerequisite only; root review and Bead disposition remain separate.
