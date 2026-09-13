# Surge retirement impact review — September 13, 2026

## Scope and evidence

This is a read-only impact review for `roammate-website-ao2`, not retirement
authorization or proof that retirement occurred. No production configuration,
DNS, hosting or deployment was changed by this review. No teardown was attempted.

The supervising session supplied these fresh observations at approximately
**09:07 UTC on September 13, 2026**:

- Cloudflare API: the apex DNS record is a **proxied CNAME** to
  `roammate-cs7.pages.dev`.
- The Pages project's canonical deployment is
  `d1d8272a-bf47-4340-bb41-166cc6740d99`, a successful production deployment of
  source `a95b835c9dc54fbdba415f9f964fda29b2aa1717`, created
  **September 12 at 19:14:49 UTC**.
- HEAD requests to the public site and that deployment's alias returned **200**,
  `no-store`, Cloudflare headers and no Surge headers. The deployment alias also
  returned a nonce-bearing CSP.
- Earlier rollback-list entries `0f9e3a67` and `12b6921e` were present in the list,
  but were **not freshly runtime-verified**.

The DNS/API evidence supports the conclusion that the public apex currently
targets Pages. Headers alone would not establish origin ownership or prove every
route works. The documentation reviewer assessed the supplied evidence without
additional external calls or credential access.

## Impact and evidence limits

Retiring the legacy Surge deployment removes the alternative-provider copy and
its potential DNS fallback. Restoring an older Cloudflare Pages deployment is
not equivalent: a Pages rollback cannot provide an independent fallback during
a Cloudflare outage. The existence, ownership and present usability of the Surge
deployment have **not yet been authenticated**, so this review does not certify
that the historical Surge fallback currently works.

The observed current Pages deployment is a **whole-deployment restore candidate**,
not an automatically validated rollback guarantee. Recheck its availability,
intended source, representative routes and security behavior immediately before
relying on it. A list entry or HEAD response alone is insufficient to validate
all restored behavior. The two older listed deployments are not substituted as
known-good targets on the basis of their presence in the list.

A restore must keep HTML, assets, Functions and routes from the same deployment
together. Normal `deploy.sh` now includes the nonce Function and builds/uploads
the current checkout; it is **not a static-only rollback** and does not by itself
restore a previously verified deployment. No new deployment or fallback-provider
provisioning is authorized by this review.

## Narrow approval request

> Do you approve permanently tearing down the legacy Surge deployment for
> `roammate.com`, after confirming authenticated ownership and the retained
> Cloudflare whole-deployment restore candidate, accepting the loss of Surge as
> an alternative-provider/DNS fallback that Cloudflare rollback cannot replace
> during a Cloudflare outage?

There is **no teardown approval at the time of this review**. A general request
to action all Beads, an expired historical rollback window, or approval to
deploy a public preview does not supply it. The existing Bead remains the sole
tracker for the authenticated preconditions, authorization and any eventual
execution evidence.
