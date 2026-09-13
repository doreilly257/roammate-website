# iOS auth parity and offline telemetry — 2026-09-13

## Approval and scope

The user explicitly approved two local changes: align existing iOS social-auth completion semantics with Android, and implement/test a 15-fixed-name offline telemetry safety layer **without live exporter wiring**. Root independently reviewed and approved these bounded local implementations. This is not released-event or production-telemetry acceptance.

All implementation paths below are relative to `/Users/doreilly/Work/roammate-app-ios`. No contactus files were involved.

## Auth changes

- `roammate/Services/AnalyticsEvents+Onboarding.swift`: shared `completionEvents(isNewUser:)` and `socialCompletedProps(provider:isNewUser:)` helpers.
- `roammate/Features/Authentication/ViewModels/AuthenticationViewModel+Apple.swift`
- `roammate/Features/Authentication/ViewModels/AuthenticationViewModel+Google.swift`
- `roammate/Features/Authentication/ViewModels/AuthenticationViewModel+Facebook.swift`
- `roammate/Features/Authentication/ViewModels/AuthenticationViewModel+WebOAuth.swift`

The actual inventory is **ten existing success call sites across five providers**, including X and Snapchat in WebOAuth, rather than the eight initially counted. No new provider was added. All ten sites use the shared completion contract; email and failure behavior are unchanged.

| Server classification | Emitted completion events | Properties |
|---|---|---|
| `true` | `signup_completed` | `method: social`, existing `provider`, `is_new_user: "true"` |
| `false` | `login_completed` | `method: social`, existing `provider`, `is_new_user: "false"` |
| absent/null | `signup_completed`, `login_completed` | `method: social`, existing `provider`, `is_new_user: "unknown"` |

Root inspected the actual helper/ten-site diff and compared Android's existing **string-valued** `is_new_user` contract before approval. The Android implementation was not rewritten by this work.

### Conversion-query guidance

Exclude `is_new_user="unknown"` from conversion counts. For known social conversions, require the appropriate explicit classification: signup completion with `"true"`, returning login completion with `"false"`. Do not interpret missing properties on older iOS events as a known classification or silently mix those historical events into the new classified population. Email remains a separate unchanged event path. Build/provider/consent populations and actual release delivery still require validation; local source parity does not establish those facts.

## Offline telemetry changes

- `roammate/Services/OfflineTelemetryProjection.swift`: new pure projection and synchronous injected collector.
- `roammate.xcodeproj/project.pbxproj`: build-file, file-reference, group and Sources registration for that Swift file.

The exact allowed names are:

`auth.apple`, `auth.google`, `auth.facebook`, `auth.email`, `auth.register`, `websocket.connect`, `websocket.send`, `excursion.join`, `excursion.leave`, `excursion.create`, `connect.loadNearby`, `chat.loadMessages`, `chat.sendMessage`, `profile.load`, `profile.update`.

Records contain exactly **name, start, end, outcome**. Outcomes are `success`, `error` or `unknown`; unset status is not fabricated success. Unlisted/dynamic names and nonfinite, negative-start or reversed timestamps are rejected. Raw attributes, events, identities, URLs, messages and error descriptions are not accepted inputs.

The collector has an injected gate and sink, checks its gate on every acceptance and contains no default exporter, buffering, timer or network implementation. No OTel processor/provider registration or production call site was added. There is **no new live export or outbound destination**. Cross-call identity deduplication and exactly-once delivery are explicitly outside this offline layer; root accepted that boundary rather than introducing speculative SDK identity handling without wiring.

## Tests and independent review

- `scripts/test-offline-auth-telemetry.py`: compiles actual pure Swift contracts using synthetic fixtures and temporary local files, without launching the app or making network requests.
- `roammateTests/Services/AnalyticsWiringTests.swift`: native social-classification regression added.
- `roammateTests/Services/TelemetryResourceAttributesTests.swift`: native projection/gate regressions added.
- `docs/verification/2026-09-13-auth-and-offline-telemetry.md`: owner-side reproduction and scope record.

Tests were written first: auth tests initially failed because the new helpers did not exist; telemetry tests initially failed because the projection source did not exist. After implementation:

```sh
python3 scripts/test-offline-auth-telemetry.py auth
python3 scripts/test-offline-auth-telemetry.py telemetry
plutil -lint roammate.xcodeproj/project.pbxproj
git diff --check
```

Results:

- **15 provider/classification combinations** passed, with unchanged email-property checks.
- Source wiring checks cover **all ten social success sites**.
- **45 allowed-name/status projection combinations** passed, plus rejected names/timestamps, gate transitions and exact four-field record inventory.
- Swift frontend syntax parsing of the four auth extensions and two modified native XCTest files passed.
- Xcode project plist validation and diff checking passed.

Root independently reran **both offline harness commands**, confirmed the same auth 15/ten-site and telemetry 45/gate/four-field results, inspected code and Android string-property parity, and approved the narrow local scope. Root also confirmed diff checking passed.

The auth compilation harness uses minimal event-namespace/redaction stubs. It tests actual helper behavior but does not test real redaction or the complete app dependency graph. No iOS XCTest target run occurred. During delegated implementation, concurrent-agent restrictions prohibited `xcodebuild`.

### Subsequent serial app build and lint cleanup

After delegates finished, root ran the real app Debug build for `generic/platform=iOS Simulator`. The first verbose attempt exceeded the wrapper's 8 MB output cap; that wrapper result did not establish compiler failure. The incremental `-quiet` retry exited **0**, establishing an app build PASS, not a native XCTest target run. Root's retained log is `/Users/doreilly/.lean-ctx/tee/xcodebuild_-quiet_-project_roammate_xcod_c0f6c3dd.log`. Wrapper/parser diagnostic labels do not override the observed command exit status.

That build exposed two new SwiftLint warnings. A narrow follow-up renamed the offline-only status case `ok` to `success` consistently in its source and both test fixtures, and compacted two capture-formatting lines in the existing interactive X sign-in function. Event behavior and exporter isolation are unchanged. Focused SwiftLint over the projection, WebOAuth extension and telemetry test file then completed without warnings; both pure Swift harnesses again passed all 15 auth combinations/ten sites and 45 telemetry combinations/gate/four-field checks, and owner diff checking passed. No additional `xcodebuild` was run by the delegate.

Root subsequently reran both pure Swift harnesses with the same passing results and completed the **post-cleanup serial, quiet, unsigned Debug generic Simulator app build with exit 0** (execution session `6383`, terminal chunk `6b8eb8`). The new offline status identifier and WebOAuth body-length warnings were absent; unrelated existing compiler warnings remain. This establishes final local app build verification, not a warning-free full build, native XCTest execution, app launch, live export or release acceptance.

The final command chain, run from the iOS owner repository, exited 0:

```sh
python3 scripts/test-offline-auth-telemetry.py auth &&
python3 scripts/test-offline-auth-telemetry.py telemetry &&
git diff --check &&
xcodebuild -quiet -project roammate.xcodeproj -scheme roammate \
  -configuration Debug build -destination 'generic/platform=iOS Simulator' \
  -disableAutomaticPackageResolution -skipPackageUpdates CODE_SIGNING_ALLOWED=NO
```

## Owner handoff and remaining acceptance

Owner Beads `roammate-app-ios-agpm` and `roammate-app-ios-t5hy` were claimed and updated with local evidence, inventory correction and remaining boundaries. Their broader release/coverage scope was not closed merely because this slice passed. Website tracking remains the supervising root agent's responsibility.

No owner commit or push, app/backend release or deployment, live provider exchange, production flag change, store upload or personal-record mutation was performed by these changes. Released social-event delivery, native XCTest target execution and any future telemetry adapter/export integration remain separate acceptance tasks. The previously approved four English metadata edits are a different local change and are documented separately.
