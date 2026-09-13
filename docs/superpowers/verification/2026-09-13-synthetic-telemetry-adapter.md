# Synthetic telemetry adapter — local verification

Date: 2026-09-13. Bead: `roammate-website-d4j`; design: `cf3`; broader telemetry
acceptance remains `sie`.

## Authorized scope and actual implementation

The user approved Option A of the
[reviewed design](../specs/2026-09-13-synthetic-telemetry-adapter-design.md): a
synthetic-only iOS completion adapter and offline tests. Root and an independent
reviewer approved the [implementation plan](../plans/2026-09-13-synthetic-telemetry-adapter.md)
before code. Root explicitly selected surgical edits in the existing owner tree
and the four required Xcode compilation-membership entries rather than bypassing
owner AGENTS or copying unrelated dirty work into another branch.

Owner root: `/Users/doreilly/Work/roammate-app-ios`. Recorded pre-edit HEAD:
`2444659736589bdf659a0cb5ea515c1e759e5f76`. Implementation is **local and
uncommitted**; unrelated owner changes and the concurrent backend flag work are
not included in this acceptance.

Changed paths:

- New `roammate/Services/SyntheticTelemetryAdapter.swift`: SDK-neutral adapter,
  reusing the existing `OfflineTelemetryProjection` and its gated collector.
- New `scripts/test-synthetic-telemetry-adapter.py`: compiles actual Swift sources
  with generated synthetic fixtures in a temporary directory/module cache.
- `roammate.xcodeproj/project.pbxproj`: four additive membership lines only:
  PBXBuildFile, PBXFileReference, Services group and Sources build phase.

The adapter issues opaque fixture handles retaining a separate issuer object,
not the adapter or a trace/user identifier. Foreign handles are rejected before
consumption; owned handles are consumed before validation or callbacks, so an
invalid, disabled or repeated attempt cannot replay. Equal payloads under
distinct handles remain distinct. There is no retained identity registry.
`flush` does nothing; `shutdown` permanently closes the adapter. Calls and gate
changes require caller-enforced serial fixture execution, not an inferred
thread-safety guarantee.

The sink still receives exactly `name`, `start`, `end`, `outcome`, using the
existing 15-name allowlist, finite ordered timing and success/error/unknown
mapping. The existing projector/collector source was not modified. There is no
default sink, buffer, retry, timer, persistence, SDK processor or exporter.
Compilation membership is not runtime instantiation: source search found only
the adapter declaration in application Swift files and no production caller.

## Test-first and fresh local acceptance

The fixture/harness was written before the adapter. Its initial run exited **1**
because `SyntheticTelemetryAdapter.swift` did not exist, establishing the
expected RED dependency failure rather than a toolchain failure. After minimal
implementation, the same command passed. Negative compiler checks were then
tightened to require their intended access-control/extra-argument diagnostics,
not merely any compiler failure, and the complete harness passed again.

Commands from the owner root:

```sh
python3 scripts/test-synthetic-telemetry-adapter.py
python3 scripts/test-offline-auth-telemetry.py telemetry
plutil -lint roammate.xcodeproj/project.pbxproj
git diff --check
```

Observed results:

| Evidence | Result |
| --- | --- |
| Actual adapter/projector harness | **73 cases passed**: 45 name/status mappings, 16 rejected-input cases, 12 lifecycle/privacy cases. |
| Negative Swift compilation | **3 intended rejections**: arbitrary attributes parameter, externally constructed handle, externally reset consumed state. |
| Existing offline projection harness | **45 projection combinations**, rejected names/times, gate recheck and exact four-field records passed. Separate regression run, not 45 additional unique adapter mappings. |
| Xcode project plist | OK. |
| Python harness syntax | Parsed successfully without persistent bytecode. |
| Diff checking | Passed. |

Lifecycle cases include changed-payload duplicates, identical independent
payloads, foreign issuer rejection, disabled-consumed versus disabled-unconsumed
gate transitions, same-handle reentrancy, shutdown inside the sink, repeated
flush/shutdown, pending handles after shutdown and adapter deallocation without
issuer-identity reuse. Poison fixture fields fail if accessed; only the declared
safe primitives cross the adapter boundary. Record reflection confirms the
four-field inventory; no raw fixture payload is printed.

Implementer terminal receipts: RED session `24667`, final chunk `431fbc`, exit 1;
initial GREEN session `51796`, chunk `7e2137`, exit 0; final tightened harness
session `79501`, chunk `70ae92`, exit 0; existing projection/plist/diff chain
session `10389`, chunk `99057b`, exit 0. These are execution references, not
durable filesystem logs.

## Preservation proof and source hashes

Before editing, the dirty project and approved uncommitted projection were
snapshotted. Removing exactly the four new `SyntheticTelemetryAdapter.swift`
lines from the final project reproduces the pre-edit project **byte-for-byte**.
This preserves the previous projection registration and all other existing dirty
project content; comparing only against owner Git HEAD would conflate those
earlier changes with this task. The reviewer independently repeated this proof.

| File / snapshot | SHA-256 |
| --- | --- |
| Pre-edit dirty `project.pbxproj` | `ed4aecbf7904540175d36e8712a79bd7b2c55319e535a8910a7d91b271af8d03` |
| Project after four additive entries | `31238512d3922e8a9895ec37e1cb21f38d995d52e5ea2702eab6fc0627b943e8` |
| Existing projector, before and after | `93eba7cee3a60eb9af450cfd89933a7e6bdc312ac7f353070a41512524712603` |
| New adapter | `cc64451256e907f9753277579e522d8d65aaccd3ee05a4506721c33680054d99` |
| New offline harness | `71a63386a01379d771246bc9d5f4fbe88cc3562048122a11c0ada92274e7d385` |

Temporary handoff directory `/tmp/roammate-synthetic-adapter-2026-09-13` contains
`project-before.pbxproj`, `projection-before.swift`, `head-before.txt`,
`status-before.txt`, `implementation.patch` and `source-hashes.json`. The patch
contains only the two new files and four project entries against that existing
dirty baseline. These `/tmp` files are not a durable commit or backup; the source
hashes and explicit scope above are the retained acceptance record.

## Independent review and boundaries

Independent source/spec/quality review approved with **no blocking findings**,
including the issuer lifetime, consume-before-callback behavior, boundary tests,
absence of production call sites and four-line project preservation. The reviewer
did not claim a separate test rerun.

Root subsequently independently reran the adapter harness (**73 cases and three
intended negative compilation checks**), existing offline projection harness
(**45 combinations plus gate/rejection checks**) and project plist validation
(**OK**). The chain exited **0**, session `40964`, terminal chunk `989d9b`.
This is independent local compilation/fixture evidence, not an app build or live
runtime acceptance.

Root also ran `swiftlint lint --quiet roammate/Services/SyntheticTelemetryAdapter.swift`:
exit **0**, no output (session `87683`, chunk `bda225`). Root independently
repeated the four-line project preservation comparison and verified all four
current source hashes in the table—project, projector, adapter and harness—with
exit **0** (chunk `615f0c`). No implementation changes followed these checks.

No `xcodebuild`, application launch, native XCTest runtime, actual OTel callback,
SDK registration, live export, provider request, real record, release, deployment,
owner commit or owner push was performed by this implementation. The standalone
Swift compilation does not establish full app-target build acceptance. Existing
live telemetry remains unchanged and uncertified by this work. Android runtime
no-egress, real SDK adapter compatibility, released event delivery and journey
baselines remain separate acceptance tasks.
