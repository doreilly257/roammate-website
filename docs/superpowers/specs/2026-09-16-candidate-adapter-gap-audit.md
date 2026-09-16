# Candidate adapter gap audit — 2026-09-16

## Scope and source snapshot

User approval covers **read-only remaining candidate-gap audit**, not implementation, native execution, credentials, archive inspection, upload, or production wiring. This report combines supervising-agent source/status observations with bounded reading of owner design documents; no tests, native commands or provider operations were executed by the report author.

Owner: `/Users/doreilly/Work/roammate-app-ios/.worktrees/release`. During the audit, HEAD advanced from `48539e2` to **`db5694e041099aaeee32d056f6f3820e06de1fe6`**, adding only `docs/superpowers/specs/2026-09-16-u3-single-launch-altool-design.md`. The `fastlane/` and `scripts/` diff across that change is empty. The five audited source files—`fastlane/release_candidate.rb`, `fastlane/release_provider.rb`, `fastlane/release_configuration.rb`, `fastlane/Fastfile`, and `scripts/deploy.sh`—match HEAD; other owner dirt remains preserved. This bounded snapshot is not attestation of a wholly clean release worktree or candidate artifact.

Owner scope references:

- `docs/superpowers/specs/2026-09-16-guarded-candidate-workflow-design.md` — guarded stage-one flow and acceptance boundaries.
- `docs/superpowers/plans/2026-09-16-guarded-candidate-implementation.md` — concrete adapter and wrapper work remains required, not supplied by core-only tests.
- `docs/superpowers/specs/2026-09-16-u3-single-launch-altool-design.md` — new owner transport/reconciliation design; design only.

## Implemented core versus missing production integration

`fastlane/release_candidate.rb` defines twelve adapter operations:

`local_preflight`, `toolchain`, `provider_preflight`, `static_gates`, `with_generated`, `native_gates`, `archive`, `inspect`, `cleanup_verified`, `upload`, `processing`, `symbols`.

The supervising agent's bounded `ReleaseCandidate|release_candidate` search under `fastlane/` and `scripts/` found only the core and fake test. It did not find a production candidate adapter, candidate lane, or candidate route in `scripts/deploy.sh`. An injected interface and passing fake orchestration do not implement those native/provider operations.

| Area | Existing evidence | Remaining boundary |
| --- | --- | --- |
| Configuration lifetime | `release_configuration` generator is reusable | Concrete candidate adapter must bind native gates/archive to one validated lifetime and verified cleanup |
| Provider operations | `release_provider` contains a scoped, single-attempt stage-two client | This is not a complete candidate provider/upload adapter or a substitute for exact candidate inventory and processing contracts |
| Artifact checks | Core validates paths and hashes against fake artifacts such as `archive.zip` | File/path/hash acceptance does not establish actual archive structure, app/widget identity, signing, entitlements, configuration, privacy artifacts or dSYM UUID coverage |
| Public execution route | No production adapter/lane/wrapper route found in audited scope | Production wiring remains incomplete; do not invoke legacy `beta` or another route as a substitute |

No real archive, IPA, signing material, dSYM, provider record or credential was inspected in this audit. No current native/runtime or production-readiness claim follows.

## Owner coordination and updated status

- **`iqbr` is closed**: R5 restored isolated Ruby tooling and reported full Fastfile parsing. This is owner-reported completion, not a rerun here.
- **`vbet` is in progress**: the user already selected U3. Do not reopen transport-choice questions or duplicate its implementation work.
- **`p2z9` remains blocked**: its retained `iqbr` blocker note is stale relative to the closed R5 issue, but other concrete adapter/integration gaps remain. Correcting the note would not make the full candidate flow ready.

## U3 changes the reconciliation assessment

The new owner U3 proposal limits the wrapper to **at most one official altool child launch per attested candidate**, with no Pilot or FastlanePty fallback. It accepts opaque Apple-internal recovery; it does **not** promise exactly-once remote delivery or prove a live command/output contract. The document itself authorizes neither implementation nor execution.

Critically, current `resume!("reconcile")` calls `process!`, which also invokes `symbols`. Therefore **current reconciliation is not remotely read-only**. Do not execute it under a read-only audit approval or describe it as GET-only.

U3 proposes splitting observation from symbol delivery: exact VALID observation can stop at `processed_valid`, with symbol work requiring a separate explicit action and appropriate artifact checks. That correction belongs to the owner U3 scope under `vbet`/`p2z9`; this audit must not duplicate it or assume it is implemented merely because the design exists.

## Recommended next approval

Request a **bounded, design-only synthetic archive-evidence validator contract**, coordinated under `p2z9`, while leaving U3 transport/reconciliation ownership intact. The contract could define required evidence, exact source/artifact identity bindings, provenance, conflicting/missing evidence rejection, and synthetic acceptance cases for app/widget/signing/dSYM relationships.

This next step would **not** implement a validator or extractor, run native commands, read real archives, contact providers, wire the candidate lane, or certify signing. It must distinguish validation of supplied synthetic evidence from collection and semantic verification of actual archive contents. Concrete extraction and authoritative evidence provenance would remain separate future design/implementation gates.

Current authorization ends at this audit. Obtain the next explicit approval before producing that additional design or any code; do not infer release authority from workflow progress.
