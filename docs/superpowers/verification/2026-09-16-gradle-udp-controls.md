# Synthetic UDP control-channel assessment — 2026-09-16

## Result: IPv4-only containment failed closed

The user-approved synthetic assessment executed **12 of 36 cases**: **11 passed**, then the experimental policy unexpectedly allowed an IPv6 `::1` bind. The harness stopped immediately. **24 remaining cases were not run.** The [sanitized JSON receipt](2026-09-16-gradle-udp-controls.json) is the authoritative case-level record.

This is a failure of the proposed IPv4-only boundary, not unavailable IPv6 support:

| IPv6 case | Observed result |
| --- | --- |
| Unsandboxed positive | Bind allowed; one fixed marker received; exit 0 |
| Strict deny-all baseline | Denied with `EPERM` / errno 1; zero markers; exit 0 |
| Experimental localhost-port exception | Bind **allowed** when denial was required; harness killed and reaped its own child, exit -9, before sending any marker (`parent_sent: 0`) |

The experimental case failed at bind readiness; zero delivered markers do not turn it into a containment success. The harness did not weaken the policy, add IPv6 permission, or retry with broader localhost access.

## Implementation and verification

Implementation followed the [approved design](../specs/2026-09-16-gradle-control-channel-isolation-design.md) and [TDD plan](../plans/2026-09-16-gradle-control-channel-isolation.md), with pure fake-driven tests before real host execution. **20 pure tests passed**, and independent review preceded the host run.

Review corrections included bounded stdout/stderr capture (**4,096 bytes each**, no unbounded `communicate`), owned-child kill/wait cleanup, and explicit bound-reply sequencing (**READY → RECEIVED → attempted send**) so a denied bind cannot be misreported as outbound denial from a permitted socket. Both unbound-send target controls were retained. Those later send controls were **not reached in this run**.

Only installed Python standard-library fixtures and fixed synthetic markers were used. The receipt records Python **3.14.7**, fixture/tool/policy identities, case timings and outcomes. Scratch-only profile copies were used; installed baseline files remained unchanged. The run's owned scratch resources were removed. No Gradle invocation, daemon, native build, app/emulator/device boot, dependency install, upload, release, or external-host request occurred.

## Reproduction

Pure fake-driven tests, from the project root:

```sh
python3 -m unittest discover -s tools/android -p 'test_udp_control_assessment.py' -v
```

The explicit host-synthetic entry point used for the assessment is:

```sh
python3 tools/android/udp_control_assessment.py --run-host-controls
```

The host entry point creates local synthetic socket controls and emits sanitized JSON. It exits 0 only for a complete pass; this run's `fail` disposition exits 1. The command is documented for reproducibility, not as an instruction to repeat a known failure or permission to change policy. Importing the module or running the unit suite does not execute host controls.

## Unexecuted coverage and limits

The 24 unexecuted cases include wildcard binding, ephemeral/Gradle-shaped binding, unbound outbound controls, bound-reply outbound controls, and explicit synthetic file sentinels. **None is claimed to pass.** The receipt's `not_run` list preserves exact case IDs.

The result establishes only the measured host-synthetic behavior. It does not establish actual Gradle compatibility, app-attributed observation, general filesystem containment, absence of unobserved send attempts, fresh-build acceptance, or release readiness. No policy from this assessment is adopted for real Gradle/native work. Strict deny-all-network and the already-working bounded compiled-model JUnit runner remain the approved baseline; Bead `c2r4` retains the unresolved control prerequisite.
