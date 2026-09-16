# Enclosing offline environment — design proposal

Date: 2026-09-16. **Design only; not implemented or tested.** No launch, provisioning, download, installation, license purchase, or billing change is authorized. Written review and separately scoped approvals are required at the gates below.

## Goal and current evidence

Assess whether a dedicated disposable virtual machine could contain guest-local build IPC while preventing guest access to external networks, host services and personal data. Retain strict host deny-all-network and the working bounded compiled-model JUnit fallback until a separately approved replacement meets its own acceptance gates.

The host's synthetic localhost UDP exception failed its IPv4-only constraint; it is not adopted. Gradle's offline mode selects cached dependencies and fails when required cached modules are absent; it is **not a network isolation boundary**. See [Gradle dependency caching documentation](https://docs.gradle.org/current/userguide/dependency_caching.html).

Bounded discovery found no `qemu`, `vfkit`, `limactl`, `colima`, `podman`, or `tart` on PATH. A Docker CLI exists, but no daemon/context query was made and no usable enclosure was established. Standard `/Applications` paths for UTM, Docker, OrbStack, Parallels and VMware Fusion were absent; this was not an exhaustive machine search. A time-bound snapshot showed about **27 GiB free on SSD** and **16 GiB on Overflow**; this is neither a capacity budget nor authorization to consume that storage.

## Alternatives

| Option | Assessment |
| --- | --- |
| A — Retain strict deny-all and compiled-test fallback | Current usable baseline; does not unblock full Gradle/native acceptance |
| B — Design a disposable VM with no virtual network devices | **Recommended planning direction**: may permit internal IPC behind a stronger enclosing boundary; feasibility, cost and effectiveness unproven |
| C — Weaken host localhost policy or assume an ordinary container is offline | Reject: failed host policy is not repaired by assumption, and container presence alone proves neither network nor host-data isolation |

No option establishes that iOS builds or simulator execution are supported inside the proposed guest.

## Proposed boundary

The future enclosure would have **zero virtual NICs** and no bridges, NAT, port forwards, proxies, host socket/vsock devices, networked control service, shared host directories, clipboard integration, personal credentials, or inherited production configuration. Guest-local loopback IPC may exist; it must not be a route to the host or outside. Apple exposes network, directory-sharing and socket-device configuration explicitly and requires a virtualization entitlement; configuration must be audited, not inferred from an “offline” label. See [VM configuration](https://developer.apple.com/documentation/virtualization/vzvirtualmachineconfiguration) and [network-device configuration correspondence](https://developer.apple.com/documentation/virtualization/vznetworkdevice).

Only an exact approved input manifest may enter on a read-only virtual disk prepared from explicitly approved artifacts—**not a live host-directory mount**. Each input must have a pinned origin, identity/hash, purpose and size; exclude secrets, personal records, signing material, production endpoints and unreviewed startup hooks. Any writable guest disk is dedicated to this run, with a reviewed maximum size and no pre-existing personal guest state.

Control is a bounded, non-network file/serial channel whose implementation cannot bridge to host network services or execute arbitrary guest-supplied host commands. Its endpoint, ownership, byte/time limits and parser require review. Do not introduce a host socket service to simplify control. Outputs are extracted only after confirmed guest shutdown, through a bounded parser that treats all guest bytes and filesystem metadata as untrusted. No automatic executable loading, symlink following, archive traversal, host-path replacement, or raw log forwarding.

## G0 — no-boot feasibility gate

This gate is design/read-only planning, not implementation. Concrete artifact inventory is a **separately approved next step**, not work authorized by writing this document; no input copying or guest creation is implied. Before proposing provisioning, establish all of:

- A specifically identified existing virtualization tool and compatible, pinned guest OS artifact; required entitlements and launch authority.
- Guest/host architecture and OS compatibility for intended tools, without assuming Linux artifacts work on Darwin or that macOS virtualization implies nested iOS simulator support.
- Artifact licensing, redistribution conditions and **no-cost allowance**; any unknown cost stops the proposal.
- Exact approved inputs, sufficient complete offline dependency/toolchain caches, integrity evidence, and a written storage/time budget with current headroom and safe cleanup ownership.
- Configuration inspection and independent observation methods that can assess the boundary before the first boot.

These prerequisites are currently unproven. **Stop at G0**; absence of an installed tool or guest image does not authorize downloading or installing one. Do not query Docker contexts or start a daemon merely because its CLI exists.

## G1 — separately approved synthetic-only verification

Only after G0 and a new explicit approval: implement the minimal enclosure and synthetic fixtures, independently review exact launch configuration, and establish observers before first boot. Verify there are no configured network, host socket, directory-sharing or unintended control devices, and no host-side listener/forwarder generated by the launcher. If the selected stack cannot provide adequate inspection/observation, stop before boot.

Use fresh synthetic state only; no Gradle, SDK build, app, emulator, personal guest state or credentials. Positive observer controls use synthetic guest-local IPv4/IPv6 loopback markers and counters, supplemented by explicit configuration, interface and route evidence. With zero NICs, absence of an externally delivered marker alone proves nothing about attempted egress. Egress-attempt observation that remains unknown makes the assessment **incomplete**, blocking Gradle adoption. Do not introduce NAT, a test virtual NIC, a host bridge, or any request to a real external host/IP to make a positive control pass. If adequate controls cannot be constructed within this boundary, stop and propose a separate design rather than inventing coverage.

Receipt evidence must distinguish inspected configuration, observed traffic paths, delivered markers and attempted operations. Require zero unexpected bridge/host-service access, bounded clean shutdown, no host-data exposure and all required controls completed. An unexpected device, listener, delivered marker, uncontrolled channel, missing positive control, timeout or parser anomaly fails closed. No weaker fallback or hot-added network device is permitted.

Threat model: treat the guest and its output as untrusted. A no-NIC configuration reduces connectivity but is **not absolute proof** against virtualization defects, hypervisor escape, side channels or an incorrectly implemented control channel. Acceptance must explicitly acknowledge this residual boundary; do not claim comprehensive app attribution or absence of every unobserved attempt.

## G2 — separate real-tool compatibility gate

Passing synthetic G1 would not authorize Gradle or native builds. A new approval and reviewed plan must pin the actual toolchain, complete offline cache, project inputs and exact commands. Demonstrate guest OS/architecture compatibility first; Linux Gradle viability does not establish Darwin/Xcode compatibility. Source-to-artifact attestation, native/UI acceptance and release approval remain separate gates. No signing, uploads, production traffic or store operations are inherited from this design.

## Failure, cleanup and evidence

Fail closed on any unmet prerequisite or unexplained boundary observation. Stop only this run's owned guest/processes; confirm shutdown before reading outputs or removing its approved disks. Never stop unrelated owner builds, delete shared caches, change global firewall settings, edit the existing deny-network profile, or reclaim unrelated storage. If ownership or shutdown cannot be established, retain the bounded artifacts for investigation rather than force-delete unknown resources.

Reports contain approved artifact/configuration hashes, tool versions, bounded counters/categories, test coverage, residual risks and pass/fail/incomplete—not credentials, raw environment dumps, personal device IDs or arbitrary guest output. Record every unexecuted acceptance requirement as unverified. A proposal or synthetic pass is never full build or release readiness.

## Review handoff

Bead **`piwr`**, linked to `c2r4`, tracks this enclosing-environment prerequisite. Review this design before seeking separate approval for bounded G0 artifact inventory; do not launch, provision, copy inputs or create a guest. A later implementation authorization, if prerequisites become concrete, must state the exact tool/artifacts, storage ceiling, no-cost basis, synthetic-only scope and cleanup boundary. Until then retain the current strict deny-all fallback.
