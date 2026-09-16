# Pagefind acceptance reconciliation — 2026-09-16

## Scope and disposition for review

The user approved **existing-evidence reconciliation only**. No browser, network, provider or build probe, deployment, purge, rollback, code change or new acceptance test was performed. Dated receipts remain unchanged. The report author read those receipts; source-parity and rollback-history findings below are supplied by the supervising agent.

**Recommended disposition: the original bounded `xsf` rollout criteria are supportable with the qualifications below; submit this reconciliation for independent review before closure.** Do not retain a blanket “no browser acceptance” or Cloudflare authorization blocker after successful cache recovery and the user's manual pass. Conversely, do not promote these records into unrestricted privacy, universal edge consistency or a newly exercised post-fix rollback guarantee. This document itself does not close `xsf`.

## Evidence chain

1. [September 13 preview verification](2026-09-13-preview-integrity-rollout.md): preview `02832491-8fab-4fe1-8ad1-d99924833840`, source `996404cdc0aaa063c78e72ea2797d41fd2427cfb`; deployment gates, independent HTTP/hash checks, and supervisor-attributed real-browser behavior/fault tests.
2. [September 15 production recovery](2026-09-15-pagefind-production-recovery.md) and [cache-operation receipt](2026-09-15-pagefind-production-recovery.json): approved scope, rule/readback, successful exact eight-URL purge, production `435c1c38-c4f2-4ddb-9a41-dd1984dbac8d`, source `2d27a9d6ad98fe7f7ae578b484d146329cb20d3f`; [132-asset receipt](2026-09-15-pagefind-production-asset-verification.json) and [HTTP receipt](2026-09-15-pagefind-production-http-verification.json).
3. [September 16 prerequisite receipt](2026-09-16-blocked-prerequisite-refresh.md): successful later production deployment `c1b1418c-b52a-4180-babd-b0dff0323b61`, source `f8e756f0a4942f4472d24eb3feff18530efabc08`, created **07:33:48 UTC**. This is retained deployment metadata, **not a fresh check in this reconciliation**.
4. Subsequent conversation evidence: the user replied **“pass”** after an offered manual Safari/Firefox interactive checklist. Exact per-criterion coverage, browser/version and test timestamp were not recovered in this pass. This is user-reported acceptance, not an independently replayed session or a new count/privacy/fault-injection receipt.

## Source parity and its limits

The supervising agent compared preview source `996404c` with production source `2d27a9d` across scoped search client/component/page, configuration/dependencies, middleware and deployment code. Only three offline benchmark files under `infra/csp-nonce` differed. The comparison from `2d27a9d` to `f8e756f` across the entire `roammate.com`, infrastructure/CSP and deployment scope was empty.

This supports carrying the **tested runtime implementation** forward as unchanged. It does not establish generated-build byte parity between releases, repeat browser execution on the later build, or prove a new/current response from every edge. Actual generated production consistency is separately supported by the September 15 asset receipt for that measured deployment.

## Original bounded criteria mapped to evidence

| Criterion | Supporting evidence | Disposition and qualification |
| --- | --- | --- |
| Deployment validation/build gates pass | Preview reported 23 nonce/deployment tests, 348 public tests, Astro zero errors/warnings, 3,505 pages / 587 indexed articles and 662-file claims guard. Production recovery reported exit 0 with 26 nonce tests, 348 public tests, Astro zero errors/warnings, 587 authorized entries and claims gate | **Supported for recorded deployments.** Supplied build receipts, not new execution or proof of every app capability |
| Correct search route, nonce and scoped WASM CSP | Preview and production `/search` 308 to `/search/`; production search HTML 200, `no-store`, distinct fresh nonces, canonical and scoped WASM permission | **Supported by bounded live receipts.** No general promise about future responses |
| Ordinary pages remain unaffected by search-specific policy | Production home/about 200 with ordinary nonce CSP and no search WASM allowance; rollback target ordinary pages separately checked | **Supported for sampled baseline routes.** Not a re-audit of every route |
| Search assets bypass nonce middleware and revalidate | Scoped cache exception applied/read back, old rule unchanged, exact eight-URL purge succeeded; 132 production assets matched expected bytes/digests as applicable, revalidation and nonce absence | **Supported; cache blocker resolved.** The 128-entry integrity manifest covers index/filter assets, not every Pagefind-directory file; four additional runtime/entry/WASM/manifest assets were checked |
| Real queries, facets and usable UI | Preview real browser: Bangkok 73, initial 10; Thailand 15, Guide narrows to 10; genuine zero-results fixture; 320px no horizontal overflow. Later user reported manual Safari/Firefox checklist pass | **Supported with environment attribution.** Preview counts are not invented production counts; exact later manual subchecks/browser identity remain unspecified |
| Fail-closed integrity and Retry behavior | Preview intercepted corrupt index/filter, missing entry, stale digest and redirect produced zero-item error/Retry; same-page recovery worked; redirected target was not requested | **Supported for tested implementation and preview faults.** Source parity supports relevance; not a claim that production faults were injected or all possible corruptions tested |
| Bounded search privacy/handoff behavior | Preview `window.posthog` undefined, clean header-to-search URL, consumed handoff storage, captured URLs without the query and no captured PostHog requests; external traffic blocked before typing | **Supported for that bounded test.** Network blocking limits inference about unrestricted sessions. No new universal privacy criterion is added; no unrestricted telemetry proof is claimed |
| Coupled HTML/index deployment and rollback procedure | Single Pages deployment unit; checked known-good `d1d8272a-bf47-4340-bb41-166cc6740d99`; actual earlier whole-deployment rollback, followed by documented mixed-cache discovery, exact cleanup/exception and successful revalidation repair | **Supported as coupled deployment/rollback plus verified cache recovery.** Not instantaneous atomicity across all caches; no post-fix destructive rollback drill occurred or is required merely to restate the bounded criterion |

## Rollback and privacy: avoid both overclaim and scope inflation

The supervising agent's retained history includes the **September 13 whole-deployment rollback** and mixed-cache behavior, not an imaginary flawless transition. September 15 rechecked the rollback target and corrected the specific cache cause: origin-header exception, scoped purge and coherent checked production assets. That sequence supports the documented recovery mechanism while preserving the observed failure history. “Coupled HTML/index rollback” means restoring the deployment artifact together with explicit cache handling—not proving zero mixed responses at every instant worldwide.

Privacy evidence similarly has a defined boundary: external traffic was blocked during the preview checks. It proves the recorded clean URL/storage/SDK behavior and captured request observations under that setup. It cannot prove all unblocked third-party behavior. The criterion should not silently expand into universal privacy certification, nor should this report claim such certification. The user manual pass adds functional acceptance but does not fill unspecified network-privacy or injected-error details.

## What remains unproven, without inventing new blockers

- Exact later manual browser/version/timestamp and per-criterion observations.
- Generated byte equivalence between every successive build, or a fresh September 16 edge/browser replay.
- Unrestricted all-browser telemetry behavior, all-region instantaneous cache atomicity, universal fault recovery, or a post-fix destructive rollback rehearsal.

Those stronger statements are **not established**. On the supplied original bounded criteria, they are also not new mandatory prerequisites. If independent review identifies an original criterion that specifically required one of them, retain only that precise unmet criterion with its original wording and evidence gap; do not reset the entire rollout to generic authorization/browser blocked status.

## Review recommendation

Independently review the table against the original `xsf` acceptance wording and close only if the original bounded interpretation is confirmed. The defensible closure statement would be: deployment gates, scoped nonce/WASM behavior, asset revalidation/integrity, tested browser search/facets/fail-closed recovery/privacy behavior, coupled rollback recovery and subsequent user manual acceptance are supported by dated evidence with unchanged runtime source. It must retain preview-versus-production attribution and all stated limits.

No new deployment, cache write, global privacy test or destructive rollback is authorized by this reconciliation. Any genuinely stricter future requirement belongs in separately scoped work, not a retroactive universal acceptance claim.
