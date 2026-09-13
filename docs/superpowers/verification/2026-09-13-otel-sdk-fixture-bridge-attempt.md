# Offline SDK fixture bridge — compiler prerequisite attempt

Date: 2026-09-13. Bead: `roammate-website-a2a`.
Status: **Historical first-attempt blocker; later bounded implementation is
recorded in the [final verification report](2026-09-13-otel-sdk-fixture-bridge.md).**

## Scope and preserved state

The user approved the provider-free real SDK fixture bridge described in
[the reviewed design](../specs/2026-09-13-otel-sdk-fixture-bridge-design.md).
Root and independent review approved the
[implementation plan](../plans/2026-09-13-otel-sdk-fixture-bridge.md), including
complete pinned SDK source compilation and a no-network boundary established
before compiler/dependency tooling.

The only new owner file from this attempt is
`/Users/doreilly/Work/roammate-app-ios/scripts/test-otel-sdk-fixture-bridge.py`:
an **uncommitted, incomplete acceptance harness** containing the proposed
synthetic fixtures and guarded compiler route. No
`roammate/Services/OTelSDKFixtureBridge.swift` was created and no project
membership entries were added. Existing projector/adapter and dirty owner
project/source were preserved. No owner commit/push, package change, SDK source
change, source omission, app launch, provider registration or export occurred.

## Successful isolation preflight

Command, from the iOS owner root:

```sh
python3 scripts/test-otel-sdk-fixture-bridge.py \
  --sdk-core /Volumes/Overflow/DerivedData/roammate-gdszpracthwyqqbkrfjzlseryvys/SourcePackages/checkouts/opentelemetry-swift-core \
  --preflight-only
```

This exited **0**, session `57417`, chunk `50f7a0`, before invoking any Swift
compiler, version or dependency command. IPv4 loopback TCP and UDP listeners
independently received the synthetic sentinel from ordinary child clients.
The same clients under `/usr/bin/sandbox-exec` with policy
`(version 1) (allow default) (deny network*)` had to return an explicit
`EPERM`/`EACCES`, not a timeout or connection refusal. A spawned child repeated
those permission-denied checks to establish inheritance. All controls passed.

These are bounded loopback control observations under a policy denying all
network operations, not a packet capture or proof that application SDKs make no
attempts. No external destination or DNS query was used. Compiler/executable
children use that same policy, an explicit sanitized environment, empty temporary
HOME and temporary caches; ambient credentials and `DYLD_*` settings are not
passed through.

## Actual full-source compile attempt

The same command without `--preflight-only` again passed all controls, then
verified the clean core checkout and owner lockfile at version **2.3.0**, revision
`240c8d5e36c3c7b774ed961325369f0b1f2c965f`.

The compiler reported **Apple Swift 6.3.3**
(`swiftlang-6.3.3.1.3`, `clang-2100.1.1.101`), target
`arm64-apple-macosx26.0`. The API module command included all **167** original
`OpenTelemetryApi` Swift sources, with source-inventory SHA-256
`12fcd581e069b294c9759dbe381259c3fe739058c278641cfdc74f9ec1e0e106`.
It used direct `swiftc -swift-version 5 -parse-as-library -emit-library
-emit-module`, a temporary module cache/output and no package manager.

Compilation exited **1**, session `92926`, terminal chunk `a1320b`, with two
independent prerequisites:

1. `OpenTelemetryContextProvider.swift` and `TaskLocalContextManager.swift` use
   package-access declarations. The compiler requires `-package-name`, which the
   first direct-module command did not specify.
2. The bundled `SwiftMacros.TaskLocalMacro` server failed to start its nested
   sandbox: `sandbox-exec: sandbox_apply: Operation not permitted`; the compiler
   consequently reported a malformed macro-server response.

The command stopped at the API module. No successful API library, SDK module,
decoded `SpanData` fixture, bridge RED/GREEN result or regression result is
claimed. Temporary products were cleaned by the harness. The 147-source SDK
module was inventoried by the harness but its compile command was not reached.
This failure is **not** the intended TDD RED for an absent bridge.

The bounded diagnostic log is temporarily available at
`/Users/doreilly/.lean-ctx/tee/python3_scripts_test-otel-sdk-fixture-br_fe19c6c1.log`
(wrapper retention: 24 hours). It is not a durable build artifact.

## Reviewed next decision, not an applied adjustment

Root independently queried compiler hidden help under the unchanged outer
network-denying boundary: command chunk `1788b8`, exit **0**. The help describes
`-disable-sandbox` as disabling the compiler's subprocess sandbox. Root asked the
user to approve adding the package name and disabling **only that inner compiler
sandbox**, while retaining and proving the outer network-denying boundary for
compiler and macro children.

That answer was pending when this record was written. No such flags were used
for a build or retry. A future approved plan amendment must retain complete
pinned SDK sources, fixed local fixture scope, sanitized environment and
inherited outer denial; it must separately demonstrate that any real macro child
still runs inside that boundary. Success of the existing generic child control
does not by itself establish the adjusted macro execution path.

Until that prerequisite is resolved, the bridge remains unimplemented. Do not
replace SDK types with stubs, strip `@TaskLocal`, weaken the outer policy, fetch
packages, launch the app or call this SDK snapshot acceptance complete.

### Subsequent approval, before a retry

The user later explicitly approved testing the bounded compiler adjustment:
package name plus disabling only Swift's inner subprocess sandbox while retaining
and proving outer all-network denial for compiler children. The plan now proposes
a temporary wrapper on the actual installed `SwiftMacros` plugin-server route to
record explicit in-process TCP/UDP permission denials before `exec` of the
unchanged Apple server. That concrete amendment awaits review; no adjusted build
result or bridge implementation is claimed by this approval update.
