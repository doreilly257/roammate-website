# Offline deployment fixture timing investigation

Date: 2026-09-13  
Bead: `roammate-website-lwk`  
Scope: isolated local investigation and reviewed failure diagnostics; no deployment.

## Question and method

The original acceptance was to investigate isolated timing/load before changing
the timeout or production code. The historical 10-second fixture timeout was
not reproduced. Isolated runs compared fresh direct execution of trivial
`#!/bin/sh` command stubs with repeat execution and explicit `/bin/sh` invocation,
then compared the original deployment fixture with an interpreter-driven
experimental equivalent. Timing traced command boundaries rather than assuming
the deployment assembly or cleanup was responsible.

## Observations

| Local experiment | Elapsed observations |
| --- | --- |
| First direct execution of a fresh trivial shell stub | **514–1,237 ms** |
| Repeat direct execution | **29–84 ms** |
| Explicit `/bin/sh` execution | **44–49 ms** |
| Original fixture runs | **5.48 / 4.17 / 4.06 s** |
| Isolated interpreter-driven comparison | **1.57 / 1.05 / 0.75 s** |

Executing a stub through the shell first did not warm its later direct execution.
The first `npx`, `node`, `npm`, `tsc` and `git` stubs accounted for the observed
delays; assembly and cleanup did not. This localizes the measured cost to cold
direct script execution, but does **not** identify the operating-system component
or establish the cause of the unreproduced historical timeout. The comparative
interpreter invocation was an experiment, not a shipped execution change.

Raw trace files were `/tmp/lwk-timed-run1.log` and `/tmp/lwk-timed-run2.log`.
Those are ephemeral local artifacts; the measurements above are the durable
summary, not a promise that those files remain available.

## Reviewed diagnostics improvement

Commit `30bc212` improves `infra/csp-nonce/deploy.test.mjs` failure messages with
spawn error stack/code, exit status, signal, elapsed time, stdout, stderr and
timed Bash `SECONDS`/`LINENO` plus stub tracing. The trace is captured without
printing it on successful runs. The fixture uses a minimal explicit environment
and a synthetic key, not production credentials.

A synthetic missing-`ETIMEDOUT` assertion demonstrated the diagnostic failure
before the change. The focused **6-test** suite passed after the change and
passed independent review; the supervising session subsequently passed the
combined **23-test** nonce/deployment suite. Run from `infra/csp-nonce/`:

```sh
node --test deploy.test.mjs
npm test
```

The **10-second timeout**, direct stub execution, production `deploy.sh` and all
deployment gates remain unchanged. This completes the scoped investigation and
makes future failures actionable; it does **not** claim the intermittent timeout
is fixed. A recurrence should be evaluated using its captured error and timing
evidence rather than silently increasing the timeout or weakening gates.
