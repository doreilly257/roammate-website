# Offline Apple keyword byte validator — September 15, 2026

**Scope:** Standalone read-only input/byte validation under Bead `muz7`. The implementation adds no keyword rewriting, recursive discovery, Fastlane/claims-guard integration, authentication, upload or release behavior. Full store acceptance is outside scope.

This report records implementer/root verification receipts. Its author inspected/copied the [owner-file verification JSON](2026-09-15-apple-keyword-byte-validator.json), but did not execute tests or modify owner metadata. Independent specification and quality reviews both **approved with no blockers**; each reviewer also passed all 47 tests under the sandbox. Root inspected the RED/GREEN log tails and confirmed the reported 29-test/91-failure RED and 29-test focused GREEN. No commit or push is asserted by this report.

## Red/green and independent tests

- Implementer RED: **29 tests**, with **91 missing-implementation subtest failures**, retained at `/tmp/keyword-validator-red.log`. This is the reported intended missing-implementation failure, not 91 distinct test methods.
- Implementer GREEN: **29 focused tests / 47 total store tests**.
- Root independently reran all **47 tests**, which passed in **8.776 seconds**, under `sandbox-exec` with a deny-`network*` policy:

```sh
/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)' python3 -B -m unittest discover -s tools/store -p 'test_*.py'
```

The 47 total comprise the existing 18 store tests plus 29 keyword tests. Root's `sandbox_check` controls reported outbound/inbound/bind policy values **0 outside / 1 inside / 1 in an inherited child**. These were policy checks, **not network connection probes**; no listener or live service was used. Test success establishes the covered local contract, not every possible filesystem race or Apple metadata policy.

## Explicit owner-file verification

Root supplied all **12 explicit owner `keywords.txt` paths** to the validator under the verified boundary. Before/after hashes were equal for all 12. The process exited **1**, correctly reporting valid but over-limit fields rather than modifying them. Output contained only path, byte count and limit; no keyword contents are retained.

| Locale | UTF-8 bytes after the permitted terminal-line-ending removal | Limit outcome |
| --- | ---: | --- |
| ar-SA | **152** | Over 100 |
| en-AU | 99 | Within 100 |
| en-CA | 100 | Within 100 |
| en-GB | 96 | Within 100 |
| en-US | 100 | Within 100 |
| es-ES | 95 | Within 100 |
| es-MX | 98 | Within 100 |
| fr-CA | 95 | Within 100 |
| ja | **152** | Over 100 |
| ko | **150** | Over 100 |
| pt-BR | 95 | Within 100 |
| zh-Hans | **142** | Over 100 |

The four violations are **ar-SA, ja, ko and zh-Hans**. These are byte counts, not Unicode character counts. Within-limit fields are not certified for relevance, localisation, prohibited terms or live App Store acceptance.

## Contract and limits

The [reviewed design](../specs/2026-09-15-apple-keyword-byte-validator-design.md) specifies strict UTF-8, exact `keywords.txt` regular-file inputs, final-component symlink rejection, at most one terminal LF/CRLF removal, no Unicode normalization and no other whitespace trimming. Empty/invalid/control-containing fields produce exit 2; invalid input takes precedence over over-limit exit 1. Valid resolved paths deduplicate without silently accepting an explicitly supplied symlink.

The real-file check confirms unchanged local inputs and four current local byte violations. It does not fix those keywords, identify an editable App Store version, publish metadata or verify current remote parity. Any later text proposal, owner adoption, upload or submission needs its own approved scope. Root owns final review, Bead acceptance and landing.
