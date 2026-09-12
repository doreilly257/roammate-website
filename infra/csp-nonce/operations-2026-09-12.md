# CSP nonce operations review — 2026-09-12

## Scope and conclusion

The user approved review of quota, cost and failure behavior, **not production
deployment, settings changes or plan changes**. This report records the
supervising agent's verified analytics and official documentation. No code,
deployment, failure policy, plan or alerts were changed. Bead `8sw` remains open.

The user subsequently confirmed **Workers Paid**; this is user confirmation,
not API verification. No plan upgrade is needed for this proposal. Actual
invoices and aggregate billed CPU remain unknown, so this is **not a no-charge
guarantee**. The next step is explicit production rollout approval with a
recorded rollback deployment and post-deployment verification.

## Account traffic and conservative request scenario

GraphQL analytics for September 5–11, 2026, UTC returned the following daily
request counts. The Workers dataset excludes Pages Functions, so both must be
included in the account baseline. All Workers and Pages Functions reported zero
invocation errors over this period.

| UTC date | Workers | Pages Functions | Apex HTTP requests | Conservative combined scenario |
| --- | ---: | ---: | ---: | ---: |
| September 5 | 5,426 | 585 | 16,251 | 22,262 |
| September 6 | 6,228 | 1,238 | 14,548 | 22,014 |
| September 7 | 6,260 | 1,081 | 19,137 | 26,478 |
| September 8 | 5,853 | 168 | 15,120 | 21,141 |
| September 9 | 7,409 | 72 | 16,157 | 23,638 |
| September 10 | 6,253 | 885 | 14,396 | 21,534 |
| September 11 | 9,258 | 559 | 18,985 | 28,802 |

The scenario adds **every** `roammate.com` apex HTTP request as a new Function
invocation on top of both existing datasets. It deliberately ignores static
route exclusions; the actual public-site increment should be lower because
excluded static requests do not invoke the Function.

The scenario peaks at **28,802 requests/day**, or **28.8%** of the documented
100,000/day Free allowance **as a hypothetical comparison only, not this Paid
account's active limit**. Its daily mean extrapolated to 30 days is about
**710,867 requests**. This is an illustrative run rate, not a bill or forecast.
Analytics are adaptive; seven days do not capture future traffic, other new
hosts, future account workloads or exceptional spikes.

As a separate partial-window check, September 12, **00:00–15:00 UTC** recorded
5,677 Workers requests, 1,711 Pages Functions requests and 11,266 apex HTTP
requests, with zero invocation errors in both invocation datasets. Their
conservative sum is **18,654 requests for that partial window only**, not a daily
total and not extrapolated here. Production remained deployment
`a70bd978-9b79-48e1-98ea-f0e95f62ab50`.

## Staging CPU evidence

The preview script `pages-worker--18564688-preview` was mapped to the isolated
nonce deployment by the earlier tagged live tail. GraphQL for September 12,
2026, **14:40–15:00 UTC** reported:

| Metric | Observed value |
| --- | ---: |
| Requests | 226 |
| Invocation errors | 0 |
| CPU p50 | 1,279 microseconds = 1.279 ms |
| CPU p99 | 6,956 microseconds = 6.956 ms |

The GraphQL schema's microsecond units were verified. This is a tiny,
test-biased staging sample: p99 is neither the maximum nor the mean, and these
percentiles do not establish production CPU usage, universal compliance with a
CPU limit, or a production bill forecast.

## Pricing and user-confirmed subscription

The official [Workers pricing documentation](https://developers.cloudflare.com/workers/platform/pricing/)
lists:

- **Free:** 100,000 requests/day, shared across Workers and Pages Functions,
  with a 10 ms CPU limit per invocation.
- **Paid Standard:** $5/month minimum, including 10 million requests and
  30 million CPU milliseconds; overages are $0.30 per million requests and
  $0.02 per million CPU milliseconds.

Static Pages requests that do not invoke Functions are free; see
[Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/).
These are general published terms, not verification of remaining entitlement or
an actual invoice. Other account usage also matters for aggregate billing.

The observed `default_usage_model: standard` is **not proof of a Paid
subscription**: new Pages Functions use the Standard usage model. Subscription
reads remain unavailable (MCP authentication error and authorized direct API
**403**). The user subsequently explicitly answered **Workers Paid**, resolving
the plan question through user confirmation rather than API verification.
Actual invoices, aggregate billed CPU and remaining included entitlement are
still unknown; the observed request scenario is not a billing forecast.

## Failure behavior and recommendation

Both production and preview currently have `fail_open: true`; neither was
changed. Cloudflare documents that quota exhaustion with fail open serves static
assets, whereas fail closed returns an error page. See
[Pages Functions fail-open/closed routing](https://developers.cloudflare.com/pages/functions/routing/#fail-open--closed).
The Free daily-cap exhaustion scenario is not a current runtime concern for
this user-confirmed Paid account; the existing setting can remain unchanged.

**Recommendation: retain the existing fail-open setting for the public,
nonce-only Function.** This Function does not enforce authentication or access
control. Based on Cloudflare's documented static fallback and the existing
static `_headers`, the expected fallback preserves the baseline strict CSP but
omits the dynamic nonce: the original JSD CSP problem returns rather than taking
the marketing website offline. This is an explicit inference, **not a tested
quota-exhaustion result** and not advice for admin or authentication Functions.

Quota fail open is **not a general exception fallback**. An unexpected upstream
CSP still causes the middleware to throw and fail closed at runtime; the
implementation does not call `passThroughOnException`.

## Approval and operational follow-up

Obtain explicit production rollout approval with a recorded last-known-good
rollback deployment, verification of the deployment guard before activation,
and post-deployment verification of nonce behavior, JSD, caching and unchanged
admin/API behavior. The
normal deployment workflow remains unchanged and does not include this
middleware. The [staging report](staging-2026-09-12.md) retains the deployment,
resource and cleanup evidence.

Earlier Free-plan alert proposals at **50,000** and **75,000 requests/day** are
not applicable as quota thresholds for this Paid account. No alert or scheduled
monitoring has been configured. Keep `8sw` open until separately
approved production resolution is verified.
