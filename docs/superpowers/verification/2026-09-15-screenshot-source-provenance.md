# Screenshot source provenance — September 15, 2026

**Result:** All **39 previously unmatched rows** in the retained September 14 App Store Connect screenshot inventory now match **11 tracked owner-repository source files** by recorded size and MD5. This resolves the bounded source-provenance gap, not broader store or screenshot acceptance.

Root supplied the comparison results; the report author copied the [compact provenance receipt](2026-09-15-screenshot-source-provenance.json) and wrote this report. No image contents were viewed, downloaded or edited; no assets were copied, uploaded or submitted.

## Evidence and search boundary

- Original inventory timestamp: **2026-09-14T03:21:59.472Z**. The receipt's `evidenceCheckedAt` refers to that retained inventory, **not a fresh September 15 App Store Connect query**.
- Earlier source inventory was limited to 90 PNG files under Fastlane and missed the legacy source directory. A subsequent historical Fastlane search covered 87 PNG objects and found no same-size candidates.
- Expanding filename discovery to all **155 tracked owner PNGs** located `roammate_ios_65_screenshots_v8b_20260208_080727/` in `/Users/doreilly/Work/roammate-app-ios`.
- All matched files are tracked; the selected source path has clean Git status. Root checked file stability during comparison and recorded SHA-256 values in addition to matching the inventory's size/MD5. No whole-repository cleanliness claim follows.
- Folder history includes commits `2277e2a` on February 12 and `90dd5ef` on February 15. Folder naming and Git history identify retained provenance; neither proves the screenshots depict the current release accurately.

## Matched population

| Retained screenshot rows | Distinct source files |
| --- | ---: |
| 15 iPhone rows | 5 |
| 24 iPad rows | 6 |
| **39 total rows** | **11** |

The 39 rows reuse those 11 sources across English locales. They are not 39 unique images. The receipt records each locale/display type, existing asset identifier, relative source path, size, MD5, SHA-256 and match/stability/tracked booleans; it contains no image bytes or credentials.

Size plus MD5 matches establish the specific retained inventory-to-file linkage used here. Recording source SHA-256 adds a stronger local source fingerprint, but there is no newly downloaded remote SHA-256 comparison. The result does not establish current live asset identity after September 14 or image-content/feature truth.

## Disposition

Root closed the bounded provenance task `4kuf` and updated `j2y` notes. Do not keep describing these 39 rows as missing local sources. Broader release-owner asset acceptance, current store parity, target-version editability, screenshot accuracy and publication authority remain separate requirements.

No release, upload, metadata change or new store access is authorized by this successful provenance match.
