# Synthetic Apple / Play comparison contract

`comparison_contract.py` is a pure Python, in-memory, value-free coverage harness.
Call `evaluate(selection: Selection, apple: Evidence, play: Evidence) -> Result`
with the frozen dataclasses and exact enums exported by that module. There is no
mapping API, parser, CLI, provider integration, or persistence layer. Constructors
do not coerce or semantically validate inputs; `evaluate` returns the same fixed
`INVALID_INPUT` result for malformed structures, without echoing their contents.
Dates must be exact `date` objects, not strings or `datetime`; collections must be
tuples and `contiguous_required` must be an actual bool.

## Boundaries

- No private report, receipt, credential, package, or dimension data is loaded.
- No network, provider subprocess, installation, report parsing, or export occurs.
- No metric values are accepted, computed, displayed, or persisted. Numeric output
  is only date-coverage numerator/denominator pairs and the inclusive intended
  calendar-day denominator, never metric totals.
- Passing tests or `ELIGIBLE_SYNTHETIC` does not certify real-source coverage,
  semantic definitions, platform comparability, attribution, or a growth baseline.
- Real-source evidence, any provider wiring, and any numeric analytics require
  separate approval. There is no website/deployment/analytics configuration change.

## Contract

Selection fixes the intended inclusive interval, Apple Discovery and Engagement
Standard DAILY and Play overview families, exact native metrics, ordered grain
axes, date-intersection policy and requested operation (default `NONE`). Other
Apple report families are deliberately represented only to test rejection.
Apple Counts and Unique Counts remain distinct. Play user/device/event/stock
labels remain separate enums, not a common metric. All aggregation operations
are rejected in this value-free phase, even with verified aggregation semantics;
ratios, combined sums, ranking and attribution are always forbidden.

Evidence carries synthetic observations, all semantic gate statuses, documented
day boundary, selected report versions, superseded-version provenance, and
app/schema, grain, population, unit, aggregation, correction/late-arrival,
precedence and retrieval descriptors. A `VERIFIED` gate is a synthetic caller
assertion, not verification performed by this module. Unknown/failed/missing
gates block all eligible platform dates and intersection. Verified flags cannot
override missing descriptors, unknown/incompatible day boundaries or wrong
families. Boundary buckets are never converted. Generation identity is required
with its verified gate; there is no identity-not-applicable state. Each version
has an exact `ChecksumStatus`: `VERIFIED` requires a checksum descriptor and no
NA reason; `NOT_APPLICABLE` requires an empty checksum and a nonempty
`checksum_na_reason`. `UNKNOWN` (the default) and `FAILED` block coverage even
when the `CHECKSUM` gate is marked verified. That gate attests the applicability
decision or checksum verification; the typed status distinguishes the two.

Each logical report has exactly one selected version. Superseded version IDs
may appear only in provenance, never as observations. Duplicate selections and
unresolved corrections block coverage rather than choosing a version silently.
The predeclared gate asserts selection/version policy was fixed before outcomes;
the harness cannot independently attest the timing or authority of declarations.

Observation keys include date, logical report, selected version and the entire
ordered grain tuple. Distinct dimension rows do not inflate unique day coverage.
Duplicate keys and inconsistent presence exclude the affected date. Grain tuple
arity must match the selection; its documented completeness is also gated.
Any missing/suppressed/unknown grain excludes the entire day, even if another
grain is present. `EXPLICIT_ZERO` is an explicit presence state, never a numeric
metric or an inference from absent data. No expected-grain universe is inferred
from other days: the complete-grain gate must assert completeness, and callers
must represent known unavailable grains explicitly.

Only after semantic gates pass are actual eligible date sets intersected.
Outside-interval observations receive fixed exclusion reasons and never extend
the interval. An empty/disjoint intersection is `UNAVAILABLE`; any partial
intersection is `GAPPED`, unless `contiguous_required=True`, which makes any
missing intended date (including endpoints) `UNAVAILABLE`. Only complete valid
coverage is `ELIGIBLE_SYNTHETIC`. No matching of filenames, monthly labels,
processing dates or min/max bounds substitutes for the actual-daily-date gate.

Results expose fixed native labels, sorted date tuples, fixed reason enums and
sanitized `(platform, date, reason)` exclusions, not input descriptors, report
identities or dimension keys. `diagnostic_*_dates` are observed dates only and
are always diagnostic, not proof of eligible coverage. When semantic gates fail,
`coverage_verified=False`, eligible dates/intersection are empty, and diagnostic
dates remain available without suggesting a certified match. Coverage validity
does not imply complete coverage: inspect eligibility and missing dates too.
`apple_coverage`, `play_coverage` and `shared_coverage` are exact
`(eligible_unique_days, intended_days)` pairs only when semantic gates pass;
otherwise all three are `None`, never fabricated zero numerators.
Per-platform `*_missing_dates`, `*_suppressed_dates` and `*_unknown_dates`
explicitly preserve absence categories. Missing includes totally absent days
and explicit MISSING rows, not suppression/unknown substituted as zero. Multiple
states across grains can place a date in more than one category. These category
tuples describe synthetic observations and remain diagnostic/unverified when
`coverage_verified=False`; they do not certify eligible dates.

## Offline tests

Inline fixtures are invented. Tests inspect only this module and this README,
not provider receipts. From the repository/worktree root, run:

```sh
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)' /opt/homebrew/opt/python@3.14/bin/python3.14 -B -m unittest discover -s tools/analytics -p test_comparison_contract.py
```

The runtime imports only `dataclasses`, `datetime`, and `enum`; tests assert this
boundary. The OS sandbox is the execution network-denial boundary, not that
source check. `-B` prevents bytecode artifacts. This command does not install
dependencies or run any provider tooling.
