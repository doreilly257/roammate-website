# iOS destination eligibility follow-up — 2026-09-16

## Scope

User-approved read-only eligibility inspection only. This report records supervising-agent observations; its author ran no probes. No Xcode build, device inventory, device creation/boot, runtime installation, runtime-match mutation, or release operation occurred in this follow-up. Prior runtime inventory and destination receipts were not freshly rerun.

## Fresh bounded observation

Installed `simctl runtime match list -j`, under the existing deny-network profile with the **previously dedicated scratch HOME**, exited **0** without stderr. The query reused the prior native scratch root/home; it did not create a new HOME in this follow-up. Its minimal environment contained `HOME`, `CFFIXED_USER_HOME`, `PATH`, and `TMPDIR`, with `close_fds` and a 15-second timeout. These are this query's observed controls, not a reconstruction of the original native launcher. Its `iphoneos26.5` entry reported:

| Field | Value |
| --- | --- |
| `chosenRuntimeBuild` | `23C54` (installed 26.2) |
| `userOverriddenBuild` | `23C54` |
| `defaultBuild` | `23F81a` |
| `sdkBuild` | `23F81a` |
| `sdkVersion` | `26.5.1` |

This was an observation of existing match state, **not a change** to it. A recorded runtime choice does not prove Xcode destination eligibility or successful compilation.

Static profile inspection found SDK 26.5 supports deployment target 17; runtime profiles for 18.3 and 26.2 specify minimum host versions 13 and 14 respectively and arm64 support. The host snapshot is **26.6.2 arm64**. These compatibility fields alone do not establish an eligible destination. SDK/platform components and simulator runtimes are distinct resources; see [Apple's component installation documentation](https://developer.apple.com/documentation/xcode/downloading-and-installing-additional-xcode-components).

## Owner evidence and remaining uncertainty

Read-only owner evidence at release HEAD **`e2fc83a`**, `.worktrees/release/docs/superpowers/specs/2026-09-16-n3-isolated-environment-comparison.md`, compares N3/N2. Device visibility differs across the isolation boundary, but the comparison does **not establish the root cause** of simulator ineligibility. The “26.5 not installed” wording belongs to ineligible **iOS device** entries; it must not be repurposed as proof of an absent Simulator SDK.

Prior diagnostics do not fully bind exact argument vectors and source differences. Do not reconstruct those missing details as exact evidence or claim a controlled single-variable comparison. No device UUID or personal-device inventory is copied here.

The destination cause remains unresolved. This follow-up does not justify downloading an SDK, changing runtime mappings, exposing personal devices, weakening isolation, or declaring native acceptance. Further native diagnostics require their own bounded scope; the current strict-deny compiled-test fallback remains separate evidence.
