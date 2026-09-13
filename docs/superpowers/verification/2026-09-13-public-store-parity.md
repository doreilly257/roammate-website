# Public store parity — 2026-09-13

## Scope and method

Public, unauthenticated reads performed approximately 09:04–09:09 UTC. No App Store Connect or Play Console authenticated API, credential, upload, version creation, or owner-repository write was used. Nimble CLI was unavailable and browser-tool opens failed; direct HTTPS reads of the official public endpoints succeeded.

Website store links identify Apple app `6758834253` and Android package `com.roammate.app.android`.

Apple comparisons use `results[0]` from the linked public lookup URLs. Normalization is **CRLF to LF and outer whitespace trimming only**. Descriptions were compared with `/Users/doreilly/Work/roammate-app-ios/fastlane/metadata/<locale>/description.txt`; the eight non-English descriptions were also compared with website `.tmp/appstore-drafts/<locale>.description.txt`. Name and release notes were compared with the corresponding owner `name.txt` and `release_notes.txt`. No keywords, subtitle, private localization IDs, editable-version status, or screenshots were established by these checks.

## Apple results

Every response below reported version **2026.3.7**, `currentVersionReleaseDate` **2026-09-01T16:09:53Z**. Every requested locale's description, name and release notes matched the owner files after the stated normalization.

| Intended locale | Public request: country / language | Description characters | Approved website draft matches | Returned-language evidence |
|---|---|---:|---|---|
| en-US | [us / en_us](https://itunes.apple.com/lookup?id=6758834253&country=us&lang=en_us) | 1754 | Not applicable | Description uniquely matches owner en-US |
| en-GB | [gb / en_gb](https://itunes.apple.com/lookup?id=6758834253&country=gb&lang=en_gb) | 1762 | Not applicable | Matches owner en-GB/en-AU/en-CA, whose descriptions are identical |
| en-AU | [au / en_au](https://itunes.apple.com/lookup?id=6758834253&country=au&lang=en_au) | 1762 | Not applicable | Matches owner en-GB/en-AU/en-CA, whose descriptions are identical |
| en-CA | [ca / en_ca](https://itunes.apple.com/lookup?id=6758834253&country=ca&lang=en_ca) | 1762 | Not applicable | Matches owner en-GB/en-AU/en-CA, whose descriptions are identical |
| es-ES | [es / es_es](https://itunes.apple.com/lookup?id=6758834253&country=es&lang=es_es) | 1586 | Yes | Uniquely matches owner es-ES |
| es-MX | [mx / es_mx](https://itunes.apple.com/lookup?id=6758834253&country=mx&lang=es_mx) | 1646 | Yes | Uniquely matches owner es-MX |
| pt-BR | [br / pt_br](https://itunes.apple.com/lookup?id=6758834253&country=br&lang=pt_br) | 1638 | Yes | Uniquely matches owner pt-BR |
| fr-CA | [ca / fr_ca](https://itunes.apple.com/lookup?id=6758834253&country=ca&lang=fr_ca) | 1710 | Yes | Uniquely matches owner fr-CA; returned App Store URL includes `l=fr` |
| ko | [kr / ko_kr](https://itunes.apple.com/lookup?id=6758834253&country=kr&lang=ko_kr) | 772 | Yes | Uniquely matches owner ko |
| ja | [jp / ja_jp](https://itunes.apple.com/lookup?id=6758834253&country=jp&lang=ja_jp) | 704 | Yes | Uniquely matches owner ja |
| zh-Hans | [cn / zh_cn](https://itunes.apple.com/lookup?id=6758834253&country=cn&lang=zh_cn) | 504 | Yes | Uniquely matches owner zh-Hans |
| ar-SA | [sa / ar_sa](https://itunes.apple.com/lookup?id=6758834253&country=sa&lang=ar_sa) | 1230 | Yes | Uniquely matches owner ar-SA; returned App Store URL includes `l=ar` |

The lookup does not return a definitive description-locale field. The evidence against fallback is the complete description's unique match to the intended non-English owner locale, not simply the requested country or language. The three identical English descriptions cannot independently distinguish those language variants.

All eight approved non-English descriptions are therefore **already publicly published**, including the expanded chat, memories, bucket-list and groups content in the prepared drafts. This supersedes the historical `2026.3.6`/409/not-published blocker for **au6's original eight-description publication deliverable**. This session did not upload them, establish who uploaded them, or create a new store version. Future-version requirements must not be substituted for that original completed scope.

The sampled/current four English descriptions no longer contain the historical AI Concierge or read-receipt promises. This establishes the wording's removal, not the runtime state of either feature.

## Representative public Google Play results

| Public request | Fresh result | Comparison boundary |
|---|---|---|
| [English, US](https://play.google.com/store/apps/details?id=com.roammate.app.android&hl=en&gl=US) | HTTP 200; visible Updated on date Sep 10, 2026; embedded page data contains version `2026.3.7`; full description 2076 characters | Extracted description, with HTML breaks converted to newlines and entities decoded, exactly matches owner `fastlane/metadata/android/en-US/full_description.txt` after outer trimming |
| [Spanish, Mexico](https://play.google.com/store/apps/details?id=com.roammate.app.android&hl=es&gl=MX) | HTTP 200; localized title and Spanish description returned | Text begins like owner es-ES, not es-419. No full exact-comparison assertion for this response; `gl=MX` alone does not establish Latin American Spanish localization |

The English listing still presents emergency-contact location sharing, badges, groups and no-premium-tier capabilities. Their presence is not itself proof they are false or true in the released app. The Spanish response uses a shorter feature description and does not qualify identity verification as optional in its safety list; that wording difference alone does not explicitly assert mandatory verification.

Only representative Play languages were read. No all-12-Play-locale, device-delivery, rollout-percentage or binary-feature acceptance is claimed. Embedded version data is a public listing identifier, not proof of every user's installed build.

## Remaining boundaries by Bead

- **au6:** Original approved eight-description publication is evidenced publicly. A new editable version is not needed to accomplish publication that has already occurred.
- **bq2:** Current localized names are publicly evidenced for the checked Apple responses, including es-MX/fr-CA. Private keyword fields, subtitle/resource completeness, planned keyword improvements and any future publication approval remain separate.
- **j2y:** Public description/name/release-note parity is established for these Apple checks, and English description parity for Play. Owner installation/review of the newer website tooling, next-release assets and screenshot coverage are not established.
- **do5:** Historical English AI/read-receipt metadata discrepancies are removed in the checked public Apple text. Broad capability truth still needs applicable owner/source/released evidence; metadata parity and a version string do not prove app behavior or make every remaining claim an audited fact.

No raw API response or screenshot artifact was saved during the read-only pass; the URLs, comparison method, lengths and match outcomes above are the reproducible evidence record.
