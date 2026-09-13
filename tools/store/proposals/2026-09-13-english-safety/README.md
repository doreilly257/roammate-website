# English App Store safety wording proposal

Website-local proposal for `roammate-website-g1v`; **not active upload input**.
Nothing was changed in an owning app repository, uploaded, or published.

## Source and exact changes

Copied the four current descriptions from
`../roammate-app-ios/fastlane/metadata/{en-US,en-GB,en-AU,en-CA}/description.txt`.
Root independently verified the English public Apple descriptions match those
owner files: public version **2026.3.7**, released **2026-09-01 16:09:53 UTC**.
That evidence establishes the current wording, not publication of this proposal.

Each file has exactly these two sentence replacements; all other bytes, including
locale spelling and the final newline, are preserved:

| Existing sentence | Proposed sentence |
| --- | --- |
| Excursions are lightweight, low-commitment activities you can join in a tap. | Excursions are lightweight, low-commitment activities you can join through the app. |
| Travel with confidence knowing help is a tap away. | SOS can alert your configured emergency contacts; it is not a substitute for local emergency services. |

UTF-8 source SHA-256: `en-US`
`5e53040ab66c2a6b550f729d682c073bf22cd7849c37c5edbe1d428a76a5b474`;
`en-GB`, `en-AU`, `en-CA`
`9110c61e122c1c76154c36057e2514ca9c8ea3d2c5c00ba72534f1319f492805`.
Proposed character counts including final newline: **1,814** for `en-US`,
**1,822** for each other locale; all are below 4,000 characters.

## Why these qualifications

Read-only source review used iOS commit `0ff38e8`; it is not released-binary
attestation. Paths below are within the iOS repository:

- `roammate/Features/Excursions/Views/ExcursionDetailView+Trust.swift:7-18,80-115`:
  a first tap may show a verification prompt before continuing; entry logic dates
  to `c9b3118d` (August 15). `ExcursionDetailView+Actions.swift:43-59,84-93,131-145`
  distinguishes direct admission from a join request. A tap can initiate joining;
  it does not universally complete admission. No new request-to-join claim is made.
- `roammate/Services/EmergencySOSService+Location.swift:18-71` attempts server and
  contact dispatch and handles failure. `api/src/routes/sos.ts:100-128,369-378,448-459`
  distinguishes delivered, failed and unsupported contact sends, not help arriving.
  `roammate/Features/Profile/Views/TermsOfServiceView.swift:97-101` describes
  configured-contact alerting, not emergency services, without guaranteed delivery
  or timeliness; the same wording predates its September 13 formatting change.

Join and SOS capabilities remain intact. These edits remove an exact interaction
promise and ambiguous help assurance; they do not claim those features are absent.

## Review and publication boundary

The release owner must review these exact replacements and recompare current
metadata before adopting them. Owner-repository changes require scoped approval;
an actual publication also requires an editable target and explicit publication
approval. Do not select/create a version or upload from this directory. The eight
translated descriptions completed under `au6` are unchanged.

Local regression guard:

```sh
python3 tools/store/verify_store_metadata.py tools/store/proposals/2026-09-13-english-safety
```

A clean guard checks only listed known-false patterns; it is not a comprehensive
feature-truth audit or evidence that this proposal is live.
