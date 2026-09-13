# Android telemetry runtime handoff — 2026-09-13

## Fresh local evidence, not runtime acceptance

Read-only inspection of `/Users/doreilly/Work/roammate-app-android` found the following owner-generated XML results under `core/telemetry/build/test-results/testDebugUnitTest/`, timestamped **2026-09-13 09:34:32 UTC**:

| Suite | Tests | Failures/errors |
|---|---:|---:|
| TelemetryStartupPolicyTest | 4 | 0 / 0 |
| GuestBlockedExporterTest | 4 | 0 / 0 |
| ResourceAttributesTest | 4 | 0 / 0 |
| SpanFailureTest | 5 | 0 / 0 |

**17 tests passed**, with no skipped cases. These were the concurrent owner's results, not a newly launched second test run. The startup tests exercise enabled controls, disabled SDK construction/direct initialization and absent providers; guest tests exercise a recording span-export delegate and flush suppression. These results do not establish observed instrumented network silence, all exporter implementations' runtime behavior, or production delivery.

Owner `1k3c` retains instrumented no-egress acceptance. Website `46f` must preserve that distinction and its separate historical/demo-review exclusion scope.

## Environment and concrete blockers

- `local.properties` locates the SDK at `/opt/homebrew/share/android-commandlinetools`; `adb` is absent from the shell PATH but exists in that SDK's `platform-tools/`.
- `adb devices -l` returned no connected devices. Listing devices started the local ADB daemon; it did not boot or install an app.
- The existing `roammate_manual_api35` AVD uses Google APIs/API 35/arm64 and fastboot. It has not been established as empty of user state and was not booted or wiped.
- Existing debug and instrumentation APKs both date to **September 10**, before the September 13 test-startup guard. They are not valid acceptance artifacts for the new implementation.
- A concurrent owner Gradle invocation was running broad unit tests, instrumentation compilation and lint (observed PID 86321). No competing Gradle invocation was started and the owner process was not interrupted.
- Scoped searches of owner `scripts/` and `docs/` found no established preboot network-isolation/packet-observation harness. The current weather continuation plan explicitly records compile-only startup assertions and unexecuted runtime no-egress acceptance.

Local-test approval is no longer the general blocker. The remaining prerequisites are current APKs, a coordinated build window, a clean test device and verified preboot isolation with observable connection attempts.

## Proposed bounded harness — approval and provisioning pending

Do not boot the existing manual AVD or treat emulator HTTP proxy settings/airplane mode as a complete network boundary. Those do not independently prove every SDK and protocol was isolated before startup.

Recommended approach: use a **disposable isolated VM with no external network interface or route**, containing a fresh emulator userdata image. Use shared files for preexisting SDK/image/APK artifacts; do not attach production credentials, user snapshots or personal records. A host-only test network may connect the emulator to an observation sink inside that isolated environment, but must have no forwarding path to the internet. This is a design, not a claim such a VM/harness is currently available.

1. Wait for an owner-agreed build window, without polling or interrupting their build. Assemble the current debug and test APKs using existing caches/offline dependencies; record source revision, dirty-file manifest and artifact hashes. Stop if required dependencies are not available offline.
2. Provision the disposable environment and verify the no-external-route boundary **before emulator boot**. Do not modify the workstation's global firewall, DNS or existing AVD. Any additional VM provisioning or resource cost requires explicit acceptance of this design.
3. Start packet/connection-attempt observation before boot. Configure an isolated local DNS/receiver if needed to observe attempted telemetry sends without reaching real destinations. Use a harmless synthetic control to prove the observer detects attempted egress; zero packets without a working observer is not sufficient evidence.
4. Boot only new userdata and install the freshly identified APK pair. Run only `com.roammate.app.TelemetryStartupTest`, using `RoammateTestRunner`. Do not sign in, request verification, navigate real profiles or invoke production APIs.
5. Exercise the existing startup assertions, explicit no-op span/counter/capture calls and flush operations. Observe for longer than the configured trace/log batching and metric-reader intervals. Separate emulator/system background traffic from app-UID/process-attributed telemetry attempts; if attribution is unavailable, report the limitation instead of claiming zero app attempts.
6. Acceptance requires both passing startup assertions and no app-attributed telemetry export attempts during the bounded run, with positive observation controls. Network blocking alone is not proof the app refrained from attempting sends. Retain sanitized synthetic-only results, capture scope, durations and hashes; never retain personal payloads.
7. Destroy only the disposable environment and test artifacts created for this run. Preserve the owner's worktree, manual AVD and unrelated processes.

An existing owner-provided equivalent may replace the VM approach only after its preboot boundary and observation controls are demonstrated. The alternative is to retain the current 17-test/compile-only evidence and leave instrumented acceptance explicitly open. No runtime setup or behavior change was performed as part of this handoff.

## Authorized provisioning assessment — 09:49–09:51 UTC

The user subsequently approved a disposable environment, preboot network
isolation, a verified observer and fresh APKs when the owner build window is
available. That clears the proposed harness's general approval gate, not its
technical preconditions. No paid resources, existing user data, production
traffic, host-wide firewall changes or competing owner builds are allowed.

A fresh read-only inventory established:

- The host is Darwin 25.6.0 on arm64. `limactl`, `colima`, `podman`, `tart`,
  generic QEMU executables, `prlctl`, `VBoxManage` and `multipass` were not on PATH.
  The standard `/Applications/` locations checked for UTM, VirtualBox, Parallels,
  OrbStack and Docker apps were absent. This is a bounded availability check,
  not an exhaustive search of personal directories.
- Docker CLI exists, but a read-only version query could not connect to its
  default `/var/run/docker.sock`: the socket was absent. No daemon or VM was
  started, no image pulled and no remote Docker context selected.
- The installed Android SDK includes its Android-specific QEMU executables and
  the API 35 Google APIs arm64 system image. These files alone do not supply a
  verified enclosing offline VM or app-attributed connection-attempt observer.
- `sandbox-exec` and `tcpdump` exist, but tool presence is not a tested isolation
  boundary or a positive-controlled observer. No sandbox/firewall policy or
  packet capture was applied to the host or another process.
- Both owner APKs still have September 10 modification timestamps: debug
  **17:49:59 UTC**, instrumentation **17:49:58 UTC**. They remain unsuitable for
  the September 13 startup implementation.
- PID **86321** remained present, alongside Gradle daemon **53134**. Process
  presence alone does not identify the precise current Gradle task; no
  owner-agreed build window had been established. Neither was interrupted and
  no build was started.

No provisioned disposable VM, fresh APK pair or demonstrated preboot
isolation/observation chain was available through these checks. Consequently no
AVD was booted, wiped or copied, no app installed, and no runtime acceptance
claim was made. Speculative harness code would not establish the missing
boundary, so none was added or executed. The concrete handoff is an owner-agreed
build window plus an available approved offline VM/image or a demonstrated
equivalent with preboot isolation and positive-controlled attempt observation.
The prior local unit-test evidence remains separate from this unexecuted runtime
acceptance.

## Fresh APK prerequisite completed — 11:20 UTC follow-up

The earlier September 10 artifact and active-build observations above are
historical, not the current artifact state. At this follow-up the owner tree was
clean at **`66932061aff7849d7d54d830fc3dbf20c8ce5850`** before and after assembly;
the startup suppression was already committed in `caad7490`, not an outstanding
dirty-file change. No active Gradle client was observed before starting this
explicitly approved local assembly; a Gradle daemon remained present. This is not
a claim that an owner-agreed build window was separately obtained.

The root ran in `/Users/doreilly/Work/roammate-app-android`:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  ./gradlew --offline --console=plain :app:assembleDebug :app:assembleDebugAndroidTest
```

Assembly succeeded: **13 minutes 9 seconds**, 1,309 actionable tasks (48 executed,
1,261 up-to-date), terminal session `69427`, chunk `fefd2a`, exit 0. The temporary
log is `/Users/doreilly/.lean-ctx/tee/JAVA_HOME__opt_homebrew_opt_openjdk_21_l_1355ed4d.log`
with 24-hour retention; it is not a durable verification artifact.

| Artifact under owner repository | Bytes | Modified UTC, 2026-09-13 | SHA-256 |
| --- | ---: | --- | --- |
| `app/build/outputs/apk/debug/app-debug.apk` | 37,100,151 | 11:19:58 | `d061d3b22e9c8fc4e97f266639e457b677d5b91f7c3c892ae39e7f71b2f2cca6` |
| `app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk` | 1,663,701 | 11:20:49 | `269bad8ed61c5be3948f838b2094789860c33994b33a085e9a2309565c3dbe16` |

The report author independently rechecked both hashes and the clean source
revision. Root inspection using build-tools `aapt` 36.0.0 confirmed instrumentation
runner `com.roammate.app.RoammateTestRunner`, target package
`com.roammate.app.android`, and app version code 13 / version name `2026.3.7`.
No APK was installed, no emulator booted and no device test was run.

**The fresh-APK prerequisite is now satisfied.** The remaining concrete runtime
prerequisite is the approved disposable environment with demonstrated preboot
isolation and a positive-controlled, app-attributed connection-attempt observer.
The existing `TelemetryStartupTest` already checks actual absent SDK/analytics
handles, null logging bridges, a non-recording span, counter/capture no-ops and
flush calls. Its assertions do not include a timed observation interval.

Owner `RoammateTelemetry.kt` configures trace/log batching at 5 seconds and the
metric reader at 30 seconds. The eventual harness must record the actual process
lifetime and observe the instrumented process for **longer than 30 seconds**;
merely waiting after a process has exited is not equivalent. Neither process
lifetime nor a working observer is inferred from successful APK assembly. Preserve
`1k3c` instrumented no-egress acceptance and `46f`'s separate historical/demo-review
exclusion boundary until the corresponding evidence exists.
