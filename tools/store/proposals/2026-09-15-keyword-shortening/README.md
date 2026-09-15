# Keyword shortening proposals — 2026-09-15

**DRAFT: requires user approval and native-language review before any owner adoption.** These are local review artifacts, not approved store metadata or upload inputs. The iOS owner files were read only; no owner edit, Fastlane wiring, upload, or store operation is authorized by these drafts.

## Approach and limits

Recommend **conservative whole-term reduction** for review: remove existing comma-separated terms, preserving the exact bytes, spelling, and relative order of every retained term. No replacements, Unicode normalization, new keywords, or new product claims are introduced. Selection favors broad travel/companionship vocabulary over safety wording, some overlapping concepts, and selected peripheral associations; this is an editorial hypothesis, **not evidence of keyword efficacy, search volume, translation quality, store acceptance, or native approval**. Retained words are carried over, not independently validated product claims.

Alternatives:

- **Whole-term reduction (recommended draft):** easily audited against the source, avoids newly authored translations, but sacrifices coverage and may not be the best local search vocabulary.
- **Native-reviewed rewriting:** potentially better local phrasing or byte efficiency, but introduces new wording and needs separate user approval, language review, and renewed byte/claim checks; not performed here.
- **Defer adoption:** keep owner files unchanged until a native reviewer resolves priorities; avoids adopting unreviewed wording but leaves the recorded byte overages unresolved.

English glosses below are approximate aids for review, not translations approved for publication. A native reviewer should assess connotations and relevance, including whether terms can suggest dating, accommodation, events, or services the app does not provide.

## Source identity and byte accounting

Read-only source root: `/Users/doreilly/Work/roammate-app-ios/fastlane/metadata/`.
Each source is `<locale>/keywords.txt`. SHA-256 covers the **entire raw source file**, including its one terminal LF. Source field bytes exclude that LF. Proposals have **no terminal newline**, so their raw-file and field byte counts are identical; commas are counted. The 100-byte target is the approved offline guard contract, not a claim that all store requirements pass.

| Locale | Source field bytes | Source raw bytes | Proposed field/raw bytes | Bytes removed from field |
| --- | ---: | ---: | ---: | ---: |
| ar-SA | 152 | 153 | 100 | 52 |
| ja | 152 | 153 | 96 | 56 |
| ko | 150 | 151 | 96 | 54 |
| zh-Hans | 142 | 143 | 98 | 44 |

| Locale | Source SHA-256 (raw file) |
| --- | --- |
| ar-SA | `702f21059d8ad19ece323e1f8cd7ca3dc752035703990b565ff0e039ea959c8d` |
| ja | `f685bfc334f69c95dd0ea5b469d752df617d5d9b4f162387c49ce3abe7b64a66` |
| ko | `786b97e2f2c2983b513c97427207025f4fd68a8c805cb93f9b6441ef414841a8` |
| zh-Hans | `846bbb7b8f4475d64b255f4740a3d19c12207fe92fd6b160fa82b49200dc6b9e` |

## ar-SA — 100 bytes

Proposed payload: [`ar-SA/keywords.txt`](ar-SA/keywords.txt).

Retained in source order: `سفر` (travel), `رفيق` (companion), `مسافرون` (travelers), `أصدقاء` (friends), `مغامرة` (adventure), `رحلة` (trip/journey), `سياحة` (tourism), `فعاليات` (events/activities), `جولة` (tour/outing).

Rationale: retain the existing travel, companionship, and activity vocabulary without substituting new Arabic. Events/tours remain subject to product-relevance review; this draft does not endorse an event or tour service claim.

Removed in source order:

| Term | Approximate gloss | Draft rationale |
| --- | --- | --- |
| `تعارف` | getting acquainted | Avoid a potentially dating-adjacent association pending native review; friends/companion terms remain. |
| `أمان` | safety/security | Avoid carrying safety wording into this unapproved draft. |
| `مرافقة` | accompaniment | Reduce overlap with companion wording; connotations need native review. |
| `explorer` | explorer | Remove English vocabulary to prioritize the retained Arabic terms within the byte budget. |
| `wandering` | wandering | Same byte-budget trade-off; no claim that English keywords are ineffective. |

## ja — 96 bytes

Proposed payload: [`ja/keywords.txt`](ja/keywords.txt).

Retained in source order: `旅行` (travel), `一人旅` (solo travel), `旅仲間` (travel companions), `友達` (friends), `バックパッカー` (backpacker), `現地` (local area/on location), `交流` (interaction/exchange), `イベント` (events), `観光` (sightseeing), `旅先` (travel destination).

Rationale: preserve solo/backpacker, companionship, local interaction, and travel vocabulary; retained event wording needs product-relevance review.

Removed in source order:

| Term | Approximate gloss | Draft rationale |
| --- | --- | --- |
| `出会い` | encounters/meeting people | Reduce potentially dating-adjacent ambiguity while retaining friends/interaction terms. |
| `安全` | safety | Avoid carrying safety wording into this unapproved draft. |
| `同行者` | accompanying person | Reduce semantic overlap with retained travel-companion wording. |
| `ノマド` | nomad | Deprioritize a narrower audience association to preserve general travel vocabulary. |
| `ゲストハウス` | guesthouse | Deprioritize accommodation-associated wording and its byte cost; not a finding that it is irrelevant. |

## ko — 96 bytes

Proposed payload: [`ko/keywords.txt`](ko/keywords.txt).

Retained in source order: `여행` (travel), `동행` (accompanying/traveling together), `친구` (friend), `혼행` (solo travel, abbreviated), `배낭여행` (backpacking), `현지인` (local person), `모임` (gathering/group), `여행메이트` (travel mate), `여행자` (traveler), `자유여행` (independent travel).

Rationale: prioritize the existing Korean solo/backpacking, companionship, local-person, and independent-travel vocabulary. Some companion/traveler overlap remains; no claim is made that this is an optimal allocation.

Removed in source order:

| Term | Approximate gloss | Draft rationale |
| --- | --- | --- |
| `만남` | meeting/encounter | Reduce general meeting vocabulary while retaining friends/gathering terms; native review should assess connotations. |
| `안전` | safety | Avoid carrying safety wording into this unapproved draft. |
| `게스트하우스` | guesthouse | Deprioritize accommodation-associated wording and its byte cost. |
| `journeys` | journeys | Remove English vocabulary to prioritize the retained Korean terms within the byte budget. |
| `discovering` | discovering | Same byte-budget trade-off; not a judgment of English keyword efficacy. |

## zh-Hans — 98 bytes

Proposed payload: [`zh-Hans/keywords.txt`](zh-Hans/keywords.txt).

Retained in source order: `旅行` (travel), `旅伴` (travel companion), `交友` (making friends), `结伴` (joining companions), `自由行` (independent travel), `背包客` (backpacker), `同行` (traveling together, context-dependent), `当地人` (local people), `活动` (activities/events), `独自旅行` (solo travel), `穷游` (budget travel), `青旅` (youth hostel, abbreviated).

Rationale: preserve the existing solo/budget/backpacker and companionship vocabulary. `同行` has context-dependent readings; retained events and hostel terms require native/product-relevance review and do not establish those services.

Removed in source order:

| Term | Approximate gloss | Draft rationale |
| --- | --- | --- |
| `安全` | safety | Avoid carrying safety wording into this unapproved draft. |
| `结识` | get acquainted | Reduce overlap with retained making-friends/companionship vocabulary. |
| `周边游` | nearby/local trips | Deprioritize a narrower trip category to preserve solo/budget travel terms. |
| `wanderlust` | strong desire to travel | Remove English vocabulary to prioritize the retained Chinese terms within the byte budget. |
| `discover` | discover | Same byte-budget trade-off; not a judgment of English keyword efficacy. |

## Adoption boundary

Root independently ran the keyword guard under a verified deny-network policy: **exit 0**, with proposed field counts **100/96/96/98** bytes. Root also verified that retained terms are exact original byte tokens in original order, all four owner-source SHA-256 values remained unchanged, and scoped owner Git status was clean. The copied [validation receipt](validation.json) records the byte counts, source/proposal hashes, token-order checks, and unchanged-source results. This is **technical validation only**, not native-language approval, keyword-efficacy evidence, or authorization to adopt or upload.

Before adopting any draft, the user/release owner and a native-language reviewer must approve the **exact payload** and its product relevance. Recheck the owner source hashes against this snapshot to detect drift, then apply any separately approved changes only through the owner repository's workflow. Revalidate the final bytes and metadata constraints after any edit. A byte pass alone is not approval to copy, wire into Fastlane, upload, or release. These proposal files are not an automatic metadata source.
