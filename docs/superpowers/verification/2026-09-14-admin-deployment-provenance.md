# Admin Deployment Provenance — 2026-09-14

**Scope:** Read-only provenance investigation. This report records root-verified receipts; the report author did not independently fetch deployments, rebuild artifacts, read secrets or execute probes. No production changes occurred in this report task.

**Verdict:** The Pages source is identified; the backend's exact source commit remains **unverified**. Deployed code evidence excludes one specific later filter fix but does not establish an exact Git commit.

## Deployment identities

| Component | Observed identity | Provenance limit |
| --- | --- | --- |
| Backend Worker | September 10 deployment, version 231, version prefix `b100e60a`; deployment time 13:18:48 UTC | Available metadata and original deployment log do not identify the Git commit |
| Admin Pages | Production deployment prefix `c185fa92`; clean source revision `6f4cf940` | Source provenance does not identify the encrypted credential value |

The backend accepts either `ADMIN_CONSOLE_KEY` or `ADMIN_API_KEY` on the inspected console authorization path. The Pages source sends its own `ADMIN_API_KEY` binding as `X-Admin-Key`. Those facts establish binding names and authorization behavior, not scoped-key equality or distinction from the master.

## Deployed artifact receipts

These hashes identify **code**, not secret values. No credential hashes or raw deployed bundle are published here.

| Receipt | Value |
| --- | --- |
| Extracted deployed `index.js` part, UTF-8 byte length | `1518314` |
| Extracted deployed `index.js` part SHA-256 | `54f36cfaae7c69ad1cc285e2e4889fe9fd513525c8ef14ebd5bc8889de04f6c3` |
| Extracted admin-console module, JavaScript character length | `22874` |
| Extracted admin-console module SHA-256 | `59dbf820cb9f59e637327f545b3708d92800dfb066d7773dd016b6287137ee23` |

The Worker GET response is a multipart envelope with a varying boundary, not raw JavaScript. Root parsed the sole `index.js` part from two independent fresh GETs, stripping the multipart headers and exact CRLF boundary framing. Both extracted parts produced the identical byte length and SHA-256 above. No other part or source map was returned.

**Discarded initial measurement:** `1518497` bytes and SHA-256 `99c5af56b7852990181874d1a600160a08fd821a2f8b9d82928891ff9398d798` measured the multipart response envelope, not the code artifact. They must not be used for source/artifact matching.

The module extraction boundary was its module marker through, but excluding, the next newline-plus-`// ` marker; its recorded hash is unaffected by the outer multipart boundary. JavaScript character length is not a UTF-8 byte count. These fingerprints allow comparison to a future retained artifact; no matching locally retained bundle was found in the bounded search described below.

## Repository candidate, not an exact match

The latest chronological candidate before the deployment is:

| Git object | Identifier |
| --- | --- |
| Candidate commit, September 10 at 09:03:10 UTC | `03cfdc365e9712ebc934302fc1f5dee84f2d1cc6` |
| Candidate `api` tree | `89b79c37c52afa9b0bd66bafcf8b87382c9ed034` |
| Candidate admin-console source blob | `d893e7406a95d5eaebef4cbae224a819066609e6` |
| Candidate auth source blob | `611a7410d687db63d346b1fc374843ea9eaf1b68` |

Chronology alone does not prove what was built or uploaded. A dirty source tree, another branch, dependency/build differences or a retained older artifact could produce a deployment not identified by the latest earlier commit. These Git object IDs are source references, not a demonstrated byte-for-byte correspondence with the deployed bundle.

## Specific post-deployment fix absent

Commit `ba4d99df`, September 10 at 13:43:48 UTC, adds the patterns `LIKE '%@%.test'` and `LIKE '%@test'` to `suspectEmail` in `admin-insights.ts`.

The corrected inspection of the **deployed admin-insights module** found neither added pattern and did find the preceding `LIKE '%@test.%'` pattern. This supports only the conclusion that this specific later filter fix is absent from that deployed module. It does not prove the entire candidate commit matches, nor establish any test-account count, identity or membership.

An initial inspection selected the wrong participation module and was discarded; the conclusion above uses the corrected admin-insights module inspection only.

## Bounded search and remaining gap

- The deployed Worker includes an `index.js.map` source-map reference. A reference is not evidence that a source map was recovered or verified.
- No retained local `index.js` or map was found in the `api` search to maximum depth four excluding `node_modules`, or in the inspected `api/.wrangler` cached JavaScript scope. This is not an exhaustive claim about all disk, CI, backup or remote artifacts.
- The original deployment log was 24,804 bytes and contained no Git annotation.
- No build was regenerated to manufacture a provenance match. No unsupported source commit is assigned to the backend.

An exact source claim needs stronger evidence, such as a trustworthy deployment-to-artifact-to-source receipt or a reproducible artifact match with adequately constrained inputs and any ambiguity explicitly resolved. An artifact match shared by multiple commits still does not uniquely identify the source commit.

## Credential prerequisite and follow-up

Use the [admin key verification and remediation procedure](../plans/2026-09-14-admin-key-verification-remediation.md) for the separate credential question. It prioritizes nonsecret deployment-bound provisioning evidence, requires scoped/master distinction, and gates secure comparison or remediation behind separate approval.

Neither this report nor the procedure authorizes production changes, secret retrieval, credential probes or private-record queries. Moderation/admin contract availability and other acceptance gates remain independent of this provenance finding.
