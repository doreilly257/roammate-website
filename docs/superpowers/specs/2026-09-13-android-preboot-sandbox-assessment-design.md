# Android preboot macOS sandbox assessment

Date: September 13, 2026. Bead `fhx8`; assessment-only authorization.

## Goal and hard boundary

Assess whether process-local macOS sandbox denial can coexist with a minimal synthetic control channel, without booting an emulator. User approval covers this design and bounded synthetic control tests, not runtime verification.

No existing/personal AVD read, copy, boot or wipe; no APK install, emulator boot, SDK/image download, VM provisioning, host firewall/DNS change, production traffic, elevated privileges, or provider request. Root already inspected bounded emulator help under network denial and an empty temporary HOME. No further emulator invocation is needed for this assessment.

The [existing runtime handoff](../verification/2026-09-13-android-telemetry-runtime-handoff.md) remains authoritative for fresh APK evidence and unresolved isolation/attribution requirements. CLI options for ports, inherited serial file descriptors, tcpdump, custom ADB and disabling metrics/crash reporting establish available knobs only, not safe operational semantics.

## Options and recommendation

1. **Recommend assessment of inherited local socketpair/file-descriptor control under deny-all networking.** Keeps the network policy simple; a parent-created synthetic local channel may remain usable without opening a network exception. This must not be confused with proof the emulator supports every required control operation through such a channel. Inherited descriptors are a boundary risk: eventual launch must close every unrelated descriptor and prohibit network-connected descriptors.
2. **Exact IPv4 loopback TCP port exception.** Useful fallback control model if descriptor control is insufficient. Demonstrate one parent-owned receiver succeeds while another loopback TCP port, IPv6 TCP, and UDP remain denied. This is weaker than no-network control: another process/forwarder on an allowed endpoint could bridge traffic, so no arbitrary service may occupy that port.
3. **Continue requiring a disposable offline VM.** Stronger enclosing boundary if process sandboxing or app-attributed observation cannot be established. No VM provisioning is authorized here; retaining that blocker is a valid assessment outcome.

Do not assume sandbox-exec is a supported Android isolation solution merely because the binary exists. This assessment records host-specific observed behavior; it cannot promise all emulator transports are covered.

## Synthetic controls only

Implement one self-contained Python assessment script under `tools/android/` after independent design review. Use Python standard library, temporary directories, bounded subprocess timeouts and parent-owned loopback receivers. The script never resolves a public hostname or attempts a non-loopback connection. Every byte sent is a fixed synthetic marker.

The script uses a fresh temporary HOME and an allowlisted child environment. It creates a synthetic private-directory sentinel, never reads a personal path, and tests denial against that owned sentinel only. Sandbox policy is applied only to newly launched fixture children; no global settings change. Root/user process permissions are not changed.

Control matrix:

- Unsandboxed synthetic child can read the sentinel and connect to the parent-owned TCP/UDP receivers, proving the destinations and observation counters work.
- Deny-all-network child attempts the same loopback connections; expected policy errors and zero receiver markers demonstrate denial in those tested cases, not universal coverage. Include IPv6 loopback where supported; report unsupported IPv6 separately, not as a denial pass.
- A parent-created local socketpair transferred as the sole explicit extra descriptor carries a fixed control marker from the sandboxed child despite deny-all networking, or reports failure. Record the result rather than assume inherited descriptors are covered by network denial.
- If needed, test a policy with only one exact IPv4 loopback TCP remote-port exception. The allowed receiver must get its marker; a different port, UDP, and IPv6 remain negative controls. Do not widen to all loopback or all network operations to make controls pass.
- The sandboxed child is denied the synthetic private sentinel; temporary HOME access remains usable. This is a synthetic filesystem-control demonstration, not an attempted read of real AVD data.

Record subprocess exit status, fixed case names, bounded policy error categories, parent-receiver marker counts and elapsed durations. No arbitrary payloads, system logs, personal directory inventory, packet payloads, identities or credentials are retained. Clean up only script-created children, sockets and temporary directories in finally blocks. Do not terminate unrelated processes. Tests run serially with short per-case deadlines.

## Observation and acceptance limits

The parent can attribute each synthetic control to the child it launched and independently count received markers. A denied call reported by that fixture demonstrates the instrumented fixture attempt, not a general macOS denied-connection observer. `tcpdump`/pcap alone cannot establish attempted DNS/TLS sends rejected before packet emission and does not map guest traffic to an Android application UID.

**An app-attributed observer is a preboot prerequisite and is not supplied by these controls.** Source/help inspection may identify candidates, but no emulator boot is allowed until an observer chain is independently demonstrated with positive controls that distinguish app versus emulator/system traffic and capture denied attempts, including DNS/UDP/TCP as applicable. Native uninstrumented SDK traffic must not be certified by a Java-only hook or a zero-packet capture. If the available tools do not provide this capability, explicitly leave Android runtime acceptance blocked rather than weakening its definition.

Passing host controls means only the tested sandbox/control-channel combination is feasible on this host. It does not prove emulator startup compatibility, inherited-child sandbox coverage for an actual emulator, app UID attribution, instrumentation behavior, exported telemetry silence, or the required instrumented process lifetime beyond 30 seconds.

## Review and next step

Independent review must approve this bounded matrix before execution. Any sandbox syntax incompatibility is a local assessment result; correct only the fixture policy, never a host firewall or live target. Do not relax policy to allow public network probes.

After controls, write a verification report with exact script hash, environment/tool identifiers, actual outcomes and explicit uncovered transports. Root reviews whether a later no-boot observer-design step is worthwhile. No assessment result itself authorizes a boot, install, real SDK subscription or production traffic.
