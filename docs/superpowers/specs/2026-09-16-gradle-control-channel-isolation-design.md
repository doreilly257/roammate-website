# Synthetic Gradle control-channel isolation assessment

Date: 2026-09-16. **Proposed design only; written user approval required before implementation or tests.**

## Purpose and known evidence

Determine whether installed macOS sandbox controls can distinguish one fixed, local, receive-only UDP fixture from disallowed bind and send operations. This assessment must not run Gradle, a project build, a daemon, an app, an emulator, or any native release workflow.

The supervising agent inspected installed Gradle **9.6.1** bytecode. `DefaultFileLockCommunicator` constructs `new DatagramSocket(0, InetAddressProvider.getWildcardBindingAddress())`; `pingOwner` later calls `DatagramSocket.send`. The actual deny-all-network Gradle attempt failed in `FileLockContentionHandler` before tests, despite `--offline --no-daemon`. This explains the need to investigate control sockets; it does not justify unrestricted loopback access.

Existing host-synthetic preboot controls rejected the tested numeric-IP remote selector with `host must be * or localhost`. Do not substitute `*`, assume a numeric selector works, or silently allow all localhost outbound traffic. Existing compiled model JUnit tests already run under strict deny-all-network; that usable path remains intact.

## Alternatives

| Option | Trade-off | Recommendation |
| --- | --- | --- |
| A — Retain strict deny-all-network only | Lowest change surface; existing compiled JUnit remains usable, but Gradle IPC remains blocked | Safe current operating baseline |
| B — Assess one synthetic fixed-port receive-only UDP exception | Bounded way to learn actual local sandbox semantics; may fail closed and does not establish Gradle compatibility | **Recommended next assessment, after written approval** |
| C — Plan a separate enclosing offline environment | Could eventually isolate real Gradle networking more comprehensively; higher complexity and resource requirements | Future planning only; no VM, installation, provisioning, or billing authorized |

No option authorizes adopting a relaxed policy for real Gradle or native verification.

## Proposed harness boundary

Use only installed Java/Python and standard-library synthetic fixtures in a new disposable scratch root. Pin interpreter identities, fixed argument vectors and fixture hashes. Supply a fresh HOME/TMP and minimal allowlisted environment, remove credential/injection variables, deny secret/personal paths, and use `close_fds` for every child. Do not copy project sources, caches, signing material, owner configuration, or credentials. Java compilation, if necessary, is limited to these tiny synthetic fixture sources in scratch; it is not a Gradle or application build.

The current deny-network profile remains unchanged. A separately named experimental profile may be created only inside scratch. Its only proposed exception is inbound/receive permission for one selected localhost UDP port; all child outbound network operations remain denied. Unsupported policy syntax is an assessment failure, not permission to widen it. There is no exception for DNS, external hosts, wildcard hosts, arbitrary localhost ports, or arbitrary protocols.

Add identical explicit synthetic-sentinel read/write restrictions only to the two scratch assessment profile copies; the installed baseline remains unchanged. These designated-path checks do not imply general outside-scratch write containment. If the supported localhost selector cannot enforce the proposed IPv4-only boundary, the assessment fails; unavailable IPv6 positive controls make it incomplete. Neither outcome authorizes IPv6 or broader localhost permission.

The orchestrator owns fixed-marker senders/receivers and counters. All packets are fixed synthetic markers, never project or user data. Communication used to coordinate readiness/results is ordinary child pipes, not inherited sockets or a hidden outbound exception. Child descriptors are closed except explicitly assigned standard input/output/error pipes. Parent control traffic uses only explicit loopback socket addresses, with no hostname resolution or external-address requests.

## Port ownership and startup

Select one per-run candidate UDP port by binding a parent reservation to IPv4 loopback without address/port reuse. Record its numeric value and then release it immediately before the sandboxed receiver binds. This handoff is **not an atomic reservation**. The child must bind exclusively, report readiness through its pipe, receive the expected fixed marker, and terminate within a deadline. A bind conflict, unexpected marker, counter mismatch, timeout, or foreign listener evidence invalidates the run; do not kill or inspect another process, and do not reuse an occupied port.

Each case gets a fresh child and explicit expected outcome. Do not let a successful earlier receiver retain the port across later denial cases. Parent counters must distinguish fixed-marker receipt from mere process exit. A child-reported successful bind without positive receipt is insufficient.

## Synthetic acceptance matrix

Run the same tiny Java/Python operations against the baseline and experimental policy. Positive controls establish that the installed fixtures and parent observers work; negative observations alone cannot establish containment.

| Case | Expected result |
| --- | --- |
| Unsandboxed, bounded loopback positive control | Exclusive fixed-port UDP bind and parent-to-child fixed-marker receipt succeed |
| Strict deny-all baseline | Corresponding child socket operation denied; no marker receipt |
| Experimental fixed-port IPv4 loopback UDP receiver | Exclusive bind and receipt of one parent marker succeed; no child reply required |
| Different UDP local port | Bind denied; separate positive control proves the fixture can otherwise bind it |
| TCP on the allowed numeric port | Bind/listen denied; separate bounded TCP positive control validates the check |
| IPv6 loopback UDP, including the same port | Denied for this IPv4-only proposal; positive control or explicit unsupported-environment classification required |
| IPv4/IPv6 wildcard bind | Denied, including the allowed port; a wildcard bind succeeding is a **containment failure**, even if a filter appears to limit later delivery |
| Ephemeral/wildcard Gradle-shaped constructor | Denied; this assessment intentionally does not grant actual Gradle's binding pattern |
| Child sends a marker to a parent loopback receiver, both allowed-number and other-port targets | Send denied and receiver count remains zero; matching unsandboxed positive controls must first demonstrate marker reception |
| Explicitly denied synthetic read/write sentinels | Both scratch-only assessment profiles deny reads/writes to designated synthetic sentinel paths; matching unsandboxed controls succeed. These checks establish only those explicit denials, not general outside-scratch write containment. Never probe actual personal files. |

Only loopback and bind addresses are exercised. Do not perform external hostname/IP requests to "prove" isolation. Bound every wait and packet count. Test processes must not turn into persistent listeners. Unsupported IPv6 or incomplete positive controls produce incomplete assessment, not a pass for the corresponding requirement.

The principal risk is that an inbound UDP exception permits **wildcard bind** despite an endpoint filter. Record the exact observed operation, classify it as failure, retain strict deny-all for real work, and stop. Do not reinterpret the test as safe merely because no external packet was sent.

## TCP is a separate question

This first assessment adds no TCP exception. A future fixed-port TCP control fixture may be proposed separately only if evidence makes it necessary. It requires its own exact endpoint, positive/negative matrix and written approval; it is not an automatic fallback if UDP fails. An all-localhost outbound exception is outside this design.

## Fail-closed and cleanup rules

Stop on unsupported syntax, policy parse errors, failed positive controls, unexpected bind/send success, wildcard success, resource collision, unexpected output, timeout, changed fixture identity, inability to close descriptors, or inability to establish the fresh environment. Preserve only sanitized results and hashes; never publish raw environment dumps, owner paths, tokens, device identifiers, or arbitrary exception text.

Emit bounded records: case ID, policy/fixture hash, protocol/family, synthetic port, expected/observed operation result, fixed errno/category, marker count, exit status, elapsed time, and final pass/fail/incomplete. No report should say "no attempts occurred": absence of delivered markers is not observation of every attempted send. Parent marker counters prove only the tested paths.

Always terminate/reap only children created by this run, close its sockets, and remove only its verified scratch directory. Do not stop owner builds, alter global firewall/security settings, edit existing sandbox profiles, install dependencies, or leave background listeners. A failed attempt does not authorize a weaker retry.

## Meaning of a passing assessment

A pass would establish only that these synthetic fixed-port cases behaved as specified with the measured installed tools. It would **not** establish actual Gradle compatibility: Gradle currently requests wildcard/ephemeral UDP and may require additional daemon TCP. It would not establish app-attributed observation, emulator isolation, absence of unobserved attempts, fresh-build success, signed/minified artifact acceptance, or release readiness.

Any real Gradle adaptation, native execution, or runtime adoption remains a separate design and approval gate. The current useful fallback is strict deny-all-network plus the already-working bounded compiled-model test runner.

## Review handoff

Review this written proposal and its strict wildcard-bind failure criterion before implementation planning. No fixture code, experimental policy, socket test, native build, or runtime adoption has been performed by writing this document. Implementation must wait for explicit approval of this written design.
