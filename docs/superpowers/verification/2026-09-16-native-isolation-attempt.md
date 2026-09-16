# Isolated native verification attempt — 2026-09-16

## Scope and evidence provenance

The user approved isolated native verification when the owner build environment was idle. Production traffic, personal data, uploads, and releases remain excluded. This report records evidence supplied by the supervising agent; the report author performed no log probes, native commands, code changes, or runtime launches.

Before the attempt, a fresh process inspection found no Java, Xcode, or emulator processes. Owner changes were preserved. Independently active owner development advanced Android HEAD to `8dfa2a3e` and the iOS release worktree HEAD to `70da7ce`; results must not be silently attributed to older candidates or taken as an attestation of a clean owner tree.

## Isolation prechecks and limitations

The existing `tools/android/preboot-sandbox-controls.py` produced `/tmp/roammate-native-preboot-controls-20260916.json`. Host-synthetic TCP4, UDP4, and TCP6 positive/denial checks and file checks passed. However, inherited file descriptors remained allowed and numeric exceptions were unsupported. These controls **do not establish a full runtime traffic observer or authorize emulator boot**.

The [sanitized host-control receipt](2026-09-16-native-preboot-controls.json) records positive receiver markers and zero receiver markers for the denied TCP4, UDP4, and TCP6 cases. The inherited-descriptor case delivered a marker even under the sandbox, explaining the harness's explicit `close_fds` requirement.

The native attempt used the dedicated root:

`/var/folders/yb/0nhr_99s3ys4_2ms6pyp_3l40000gn/T/roammate-native-isolated-20260916-48b5myz4`

The harness supplied a fresh HOME/environment, `deny-network.sb`, explicit secret/personal-path denials, and closed inherited file descriptors (`close_fds`). A deny-network policy is not, by itself, proof that every intended native runtime/observer requirement has passed.

## Observed attempts

| Attempt | Result and boundary |
| --- | --- |
| Android, `Android-retry.log`: Gradle 9.6.1, `--offline --no-daemon`, isolated Gradle home | Exit 1 in `FileLockContentionHandler`, `SocketException: Operation not permitted`, **before tests**. This is a sandbox/tooling failure, not a demonstrated app-test failure. |
| iOS, `iOS-final.log`: absolute project path and corrected flags, `build-for-testing` under deny-all-network | Exit 74 at SwiftPM nested `sandbox_apply: Operation not permitted`, **before compilation/tests**. No native acceptance established. |
| Bounded iOS retry under the same outer policy, per-process `-IDEPackageSupportDisableManifestSandbox=YES` | Job `shell_c238645c84455238` completed **exit 70**. The cached package graph resolved without new dependency installation, overcoming the nested manifest sandbox failure while retaining the outer deny-all-network policy. It then reported no matching `{generic:1,platform:iOS Simulator}` destination and iOS 26.5 not installed. This establishes destination/toolchain unavailability **within the isolated environment**, not global absence. No compilation or tests ran. |

Earlier profile literal-`n`, incorrect Xcode option, and incorrect working-directory invocations were harness mistakes. They were corrected and are not app bugs or app-test failures.

## Bounded Android model-test execution

After the Gradle IPC failure, the supervising agent copied existing compiled `core/model` debug production code, **38 JUnit test classes**, pinned dependency jars, and existing processed fixture resources to scratch. All **63 inputs** have SHA-256 receipts. Direct **Java 21 `-Xint` JUnitCore** execution under the unchanged deny-all-network boundary, fresh HOME, and `close_fds` **passed 201 tests, exit 0**. See the [sanitized model-test receipt](2026-09-16-native-model-junit.json).

The initial direct-runner assembly omitted processed fixture resources and produced 12 failures out of 201 tests. Adding those existing resources corrected the runner; no tests were removed and no product code changed. This failure was not evidence of an app regression.

This result covers **existing compiled model tests only**: not a fresh build, not source-to-artifact parity, not a signed or minified candidate, not UI/runtime acceptance, and not release approval.

## Acceptance status

The Gradle and Xcode attempts did not reach compilation/tests; the narrower direct Android model runner passed as bounded above. No emulator, app, or device runtime was booted, no release acceptance was claimed, and nothing was uploaded or released. No global settings changed, no SDK/dependency installation occurred, and the outer network sandbox was not relaxed. Owner dirty work remained intact. The available Xcode application and isolated destination failure do not prove global simulator-platform absence.

A subsequent read-only toolchain check reported **Xcode 26.6, build 17F113**. `xcodebuild -showsdks` lists **iOS 26.5 and iOS Simulator 26.5**, and their SDK directories exist. Known installed runtime bundle paths under CoreSimulator volumes include **iOS 18.3 and 26.2**. Therefore, the isolated destination error must not be reported as an absent SDK or used to recommend downloading one. SDK availability, installed simulator runtimes, and discovery through an isolated HOME/CoreSimulator environment are distinct; the exact destination-discovery cause remains unresolved. No device inventory, boot, or installation was performed for this follow-up.

Both JSON receipts parse successfully and contain no absolute local root paths or credential markers under the report's scan. The raw iOS log was **not copied**, because it contains a physical-device identifier; only the generic destination error is summarized here. These receipts and this report do not enlarge runtime or production-traffic authority.
