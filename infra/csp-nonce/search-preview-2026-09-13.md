# Pagefind search: authorized preview evidence, September 13, 2026

## Scope and deployment

The user authorized the recommended **public-site preview only**. The supervising
session deployed source `308350f9871e142e8066e11454bef866bc5a2d79` with
`bash deploy.sh --preview`, using pinned Wrangler **4.131.1** and the normal
scratch assembly of matching HTML, Pagefind assets, Functions and routes.

- Preview: <https://4e3d35d0.roammate-cs7.pages.dev>
- Branch alias: <https://preview.roammate-cs7.pages.dev>
- No production search activation, admin release, backend change or production
  feature-flag change is part of this release.

The evidence below was supplied by the supervising session from this deployment;
the documentation subtask did not redeploy or rerun the expensive gates.

## Deployment gates

The authorized preview passed **21 nonce/deployment tests**, **175 public tests**,
Astro check with **0 errors and 0 warnings**, a **3,505-page build** with
**587 authorized search URLs**, and clean claims checks across **662 files**.

## Effective HTTP and artifact checks

| Request or artifact | Observed result |
| --- | --- |
| Preview `/search/` | **200**, one nonce-bearing search CSP with scoped WASM permission, `no-store`, `noindex` |
| Preview `/search` | **308** to `/search/`, search WASM policy without a nonce |
| Preview homepage | **200**, nonce-bearing ordinary CSP, `no-store`, no WASM permission |
| Preview `/pagefind/pagefind.js` | **200**, JavaScript content type, `public, max-age=0, must-revalidate`, no nonce |
| Preview `/search-manifest.json` | **404** |
| Preview sitemap | Search URL absent |
| Search canonical | `https://roammate.com/search/` |
| Production `/search/` | **404**, ordinary CSP; search not activated |

The local and preview `pagefind.js` SHA-256 digests matched:

```text
252d272bd34d483d19a752060f6a065114d15ab12c42d8f905ca565e2768a009
```

Additional deployed assets fetched with curl matched their local SHA-256 digests:
`pagefind-entry.json`, `wasm.en.pagefind`, `index/en_2eec2ab.pf_index`,
`filter/en_518846d.pf_filter`, `filter/en_8274ff1.pf_filter`, and
`fragment/en_49f665f.pf_fragment`. These are **sampled asset matches**, not a
full-index audit. The compressed Pagefind WASM asset returned **200** with
`application/octet-stream`, `public, max-age=0, must-revalidate`, and no nonce;
the actual browser runtime worked as described below.

## Browser evidence

The supervising session verified the deployed preview in real Chrome:

- Bangkok returned **73 results**, initially showing **10**. Filtering to Thailand
  returned **15**, then Guide returned **10**, with `/guides/bangkok/` first and
  all ten result paths under `/guides/`. An impossible query showed the genuine
  no-results state.
- At 320px, both `clientWidth` and `scrollWidth` were **320**: no horizontal
  overflow in the checked state.
- Aborting `/pagefind/index/*.pf_index` after reload showed **Search unavailable**
  with a visible Retry control. Removing the interception and selecting Retry
  recovered to **73 Bangkok results**, initially showing **10**.
- Submitting Bangkok from the homepage header handed off to a clean `/search/`
  URL, restored Bangkok in the input and returned **73 results**, initially
  showing **10**. The `roammate.search.query` session-storage key was then `null`.
- On search, `window.posthog` was undefined and the page scripts contained no
  PostHog SDK. Captured requests during the header handoff contained no Bangkok
  query in their URLs and no PostHog requests.
- The browser loaded the WASM runtime and entry, index, filter and fragment
  assets. No CSP errors were observed in these checks.

Privacy observations are deliberately scoped: broad PostHog and Cloudflare
Insights routes were intercepted and aborted **before typing**. An initial,
pre-query visit beacon produced CORS errors, so this is not a claim of globally
clean console output, unrestricted telemetry behavior or comprehensive telemetry
privacy. The checked search/handoff kept the query out of the URL; the earlier
local recorder evidence in the README remains a separate test, not a live
production measurement.

## Limits and remaining release boundaries

Malformed **HTTP-200** asset responses remain the known Pagefind limitation
tracked in `roammate-website-f6o`. The isolated SRI prototype is **not shipped**;
network-abort recovery must not be described as handling every corrupt response.

A `pages.dev` preview does not establish production-zone JSD compatibility,
production analytics behavior, long-term latency, invocation totals or cost.
The September 12 nonce production evidence covers that earlier deployment, not
production search. Production search still requires separate authorization and
effective production verification. Any authorized rollback must restore a
rechecked whole deployment, not mix an older HTML release with this index.
