# Apple analytics segment evidence — September 13, 2026

Checked at **2026-09-13T14:21:20.026Z**. Related website Bead: `t7f`.

## Read-only execution and retained evidence

The supervising root executed strictly GET-only App Store Connect report,
instance and segment requests using the existing owner's documented `jose`
authentication pattern. It did **not** execute the metadata uploader. Root
confirmed both existing requests still contain **156 reports** and downloaded
six selected Discovery and Engagement segment payloads into memory only.
No request was created, metadata uploaded or release submitted.

This report's author inspected the sanitized root summary, not the raw payloads
or credentials. The adjacent [sanitized JSON](2026-09-13-apple-analytics-segments.json)
retains the check time, selected instance/segment identifiers, downloaded-byte
counts, SHA-256 hashes, row counts, delimiter, headers and observed date ranges.
It contains no raw rows, signed download URLs, tokens or secret values. Each
selected instance returned one segment and no next-page link; this is not a claim
that all 156 reports or all their instances were downloaded.

The GET traversal follows Apple's documented [report instances endpoint](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-analyticsreports-_id_-instances)
and [instance segments endpoint](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-analyticsreportinstances-_id_-segments).

## Observed date coverage

Processing dates below came from root's instance checks; the `Date` values and
counts came from the downloaded segments. Row counts describe file structure,
not people, installs or conversion totals.

| Selected segment | Processing date | Observed `Date` range or bucket label | Distinct `Date` values | Rows |
| --- | --- | --- | ---: | ---: |
| Ongoing Standard, DAILY | 2026-09-12 | 2026-09-09–2026-09-11 | 3 | 360 |
| Ongoing Detailed, DAILY | 2026-09-12 | 2026-09-09–2026-09-11 | 3 | 17 |
| Ongoing Standard, WEEKLY | 2026-09-11 | 2026-08-31 bucket label | 1 | 504 |
| Ongoing Standard, MONTHLY | 2026-09-05 | 2026-08-01 bucket label | 1 | 1,245 |
| Snapshot Standard, DAILY | Not retained in this segment summary | 2026-02-24–2026-08-31 | 189 | 8,109 |
| Snapshot Detailed, DAILY | Not retained in this segment summary | 2026-03-02–2026-08-31 | 121 | 327 |

**Processing date is not observation date.** The September 12 daily instances
contain three earlier dates. Weekly and monthly single `Date` labels identify
their aggregation buckets, not single-day observation windows; this inspection
does not derive exact bucket-end dates or combine these granularities.

Standard and Detailed snapshot coverage differs. These minima, maxima and row
counts alone do not establish why: no suppression cause, zero-activity interval,
continuous Detailed coverage or equivalence between report populations is inferred.

## Exact headers

All six files were tab-delimited. Standard header order:

```text
Date | App Name | App Apple Identifier | Event | Page Type | Source Type | Engagement Type | Device | Platform Version | Territory | Counts | Unique Counts
```

Detailed header order:

```text
Date | App Name | App Apple Identifier | Event | Page Type | Page Title | Source Type | Source Info | Campaign | Engagement Type | Device | Platform Version | Territory | Counts | Unique Counts
```

Pipes above are presentation separators, not the file delimiter. No values from
the potentially identifying or campaign-related columns were retained.

## Remaining acceptance

Apple read access and these selected segment/header checks are **not blocked**.
The next analytical phase is to select a defensible common observation window,
granularity, events and dimensions; verify metric and suppression semantics;
and derive aggregate results without double-counting overlapping instances or
mixing Standard and Detailed populations. This pass establishes no impressions,
install or conversion baseline and no release-aligned growth conclusion.

Play Statistics still requires the owner's nonsecret `gs://pubsite_prod…` bucket
identifier and verified read-only access. Apple progress does not resolve that
separate provider prerequisite or complete the combined Bead.
