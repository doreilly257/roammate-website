# Android preboot sandbox assessment: host controls only

Date: September 13, 2026. Bead `fhx8`. This assessment implements only the user-approved, independently reviewed [bounded design](../specs/2026-09-13-android-preboot-sandbox-assessment-design.md).

## Outcome

**A process-local deny-all-network policy blocked the tested new loopback sockets while an explicitly inherited local socketpair remained usable. Android runtime verification is still blocked.** These host controls do not establish emulator compatibility, guest app attribution, denied DNS-attempt observation, or app telemetry silence.

No emulator, AVD, ADB daemon, APK installation, SDK/image download, VM, host firewall/DNS modification, production destination, credential, personal record, or elevated privilege was used. The only destinations were parent-created `127.0.0.1`/`::1` receivers and a local socketpair. Filesystem tests used an owned temporary sentinel, never a real AVD path. Root's earlier bounded emulator help inspection was not repeated.

## Executed control evidence

Script: `tools/android/preboot-sandbox-controls.py`.
SHA-256: `cc658dc8a99aa2ca00b9fb18d6935a1062cf3ad3a1a7ef8e506e56e47ee30988`.

Host: Darwin 25.6.0, arm64; Python 3.14.7; `/usr/bin/sandbox-exec`. Completed execution session **58706**, final chunk **b73339**, exit **0**, before the follow-up clock check at **18:20:43 UTC**. Detailed synthetic-only results are in [the JSON receipt](./2026-09-13-android-preboot-sandbox-controls.json). Child PIDs were discarded from the retained receipt.

| Control | Unsandboxed positive | Sandboxed result |
| --- | --- | --- |
| Owned private sentinel read | Allowed | `EPERM` (errno 1); write to owned temporary HOME still allowed |
| TCP IPv4 loopback | Receiver observed one expected marker | `EPERM`; receiver observed zero markers |
| UDP IPv4 loopback | Receiver observed one expected marker | `EPERM`; receiver observed zero markers |
| TCP IPv6 loopback | Receiver observed one expected marker | `EPERM`; receiver observed zero markers |
| Sole inherited local socketpair descriptor | Parent observed one expected marker | Parent observed one expected marker despite deny-all networking |
| Optional numeric-IPv4 TCP exception | Policy syntax preflight only | Rejected with exit 65; optional exception traffic matrix **not executed** |

All fixture subprocesses use an empty owned HOME, allowlisted environment, Python isolated/no-site mode, closed unrelated descriptors, captured output, and a five-second timeout. Socket operations have one-second deadlines. Parent receivers drain and validate the positive marker before each negative control; a timeout or connection refusal does not count as policy denial. Negative assertions require `EPERM` or `EACCES`, plus zero receiver markers. Every recorded denial was `EPERM`.

The process sandbox policy used `(allow default)` plus `(deny network*)` and a read-deny rule for the owned synthetic-private subtree. It is a **network assessment**, not a comprehensive filesystem sandbox suitable for an emulator. The child never attempts to read real personal directories. A future emulator launch would need independently reviewed filesystem access and descriptor hygiene; neither is inferred from this fixture.

## Supported channel and unsupported syntax

The inherited socketpair result is both a feasible synthetic control-channel observation and a **boundary warning**: denying new networking does not make every inherited descriptor unusable. Only that owned local channel was passed as an extra descriptor; no connected TCP/UDP descriptor or listener was inherited. Any later launcher must close unrelated descriptors and prevent control-channel forwarding to external destinations. The result does not prove the emulator's file-descriptor serial option can replace ADB, boot control, instrumentation commands, or observation.

The first assessment attempt reached the optional exception but aborted because the profile compiler rejected `(remote tcp "127.0.0.1:<port>")`, reporting that the host must be `*` or `localhost`. A bounded `/usr/bin/true` syntax probe reproduced exit 65 without any network activity. The final script records this expected tested-syntax limitation and skips the optional traffic matrix. It does **not** widen the exception to `localhost`/wildcards or claim that every possible exact-IPv4 formulation is impossible. No other operators were investigated. Exit 0 for the completed assessment does not turn that unsupported branch into a passing control.

## Observer remains a preboot blocker

Parent receiver markers are independently observed and attributed to the fixture process launched for that case. Denied attempts are reported by the fixture's own instrumented call path; this is **not a general observer of denied calls from arbitrary processes**.

Root's installed emulator help inspection exposes ports, file-descriptor serial options, tcpdump, custom ADB and metrics/crash-disable controls. Help text alone does not establish app-UID attribution or interception of native/DNS attempts before packet emission. No tcpdump capture was run here, and a pcap would not by itself distinguish guest app UID from emulator/system traffic or prove that a denied send was never attempted.

No demonstrated app-attributed observer chain is available from this assessment. That requirement remains in force **before any boot**. A later proposal needs a prevalidated disposable environment or equivalently demonstrated observer/control chain that can distinguish app and system attempts, including denied DNS/UDP/TCP/native traffic as applicable. Do not substitute a Java-only hook, a zero-packet capture, or network blocking for the required observation. Emulator process inheritance and actual Android control compatibility also remain untested.

## Updated artifact provenance

The earlier [runtime handoff](./2026-09-13-android-telemetry-runtime-handoff.md) records the successful 11:20 UTC APK build at owner revision `66932061`. Root's current assessment recheck reports Android HEAD **`8659a7bb`**, dirty excursion/onboarding work, and **32 committed changed files** since that APK revision, including app version/navigation/invite-prompt/image-upload changes. The APK hashes still identify the historical 11:20 build; they must not be described as a build of the current whole app.

Root also reports no committed difference in core telemetry/startup-test paths, but that narrower source observation does not establish whole-app runtime equivalence. There is still no demonstrated instrumented process observation interval longer than the configured 30-second metric interval. No APK was rebuilt, installed or booted. Root independently rehashed the existing APKs during its read-only provenance check; this is not a new build claim.

## Review and disposition

Independent source/evidence review approved the bounded controls without blocking findings: explicit policy-denial error checks, positive-marker draining, sole inherited descriptor, subprocess deadlines, and unsupported syntax handling were verified by inspection. The reviewer did not rerun controls. JSON validation, script syntax parsing, receipt/script hash equality, relative links and whitespace checks passed.

**Separate root rerun:** session `30715`, final chunk `7827ef`, exited **0** and independently produced the same eleven result categories: owned-HOME writes allowed, private-sentinel `EPERM`, TCP4/UDP4/TCP6 positives with one marker and sandbox `EPERM`/zero markers, inherited local descriptor markers in both runs, and numeric-IPv4 selector preflight exit 65 unsupported. Root inspected the full script without findings. The temporary independent output is `/tmp/roammate-preboot-controls-root.json`; it does not replace the author's sanitized receipt. This is a repeat of host-only controls, not an emulator or app-attributed observation.

Recommend closing only the scoped **assessment** work after root acceptance, while retaining Android runtime acceptance blockers. The next useful step is a separately scoped, no-boot observer/control-chain design or an already available owner-verified disposable environment—not booting the personal AVD, changing the host firewall, provisioning paid resources, or relaxing attribution requirements. No runtime approval is inferred from these host-only results.
