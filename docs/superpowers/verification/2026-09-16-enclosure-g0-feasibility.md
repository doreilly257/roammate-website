# Enclosing offline environment: G0 feasibility — 2026-09-16

## Disposition: G0 NOT MET

The user approved the [enclosing environment design](../specs/2026-09-16-enclosing-offline-environment-design.md) and bounded **read-only metadata inventory**. That inventory did not establish a usable launcher, clean pinned guest image, compatible guest toolchain, complete offline inputs, no-cost basis, storage budget, or observer proof. No downloads, copying, mounting, guest creation/boot, Gradle execution, provisioning or installation followed.

This report records supervising-agent findings; its author ran no probes. Bead **`nxw3`** tracks the completed bounded inspection; **`c2r4`** remains blocked. The [failed synthetic UDP assessment](2026-09-16-gradle-udp-controls.md) remains a separate reason not to adopt the host-localhost exception.

## Bounded metadata observations

### Existing executable and package metadata

The host architecture is **arm64**. Docker's CLI resolves to:

`/opt/homebrew/Cellar/docker/29.8.1/bin/docker`

| Metadata | Observed value |
| --- | --- |
| Size | 28,948,242 bytes |
| SHA-256 | `15f06c41ca1751cd32c3c774ab3b642dd0e576544bf477fd98dfd323968f1edf` |
| Mach-O magic | `cffaedfe` |
| Local `INSTALL_RECEIPT` architecture | `arm64` |
| `poured_from_bottle` / `built_as_bottle` | `true` / `true` |
| Local formula license identifier | `Apache-2.0` |

**The CLI was not executed.** No daemon, context, socket, Docker Desktop subscription, or personal billing information was queried. A CLI binary and local formula license identifier do not establish a VM engine, Docker Desktop terms, an entitled launcher, or a no-cost operating allowance. This is metadata reporting, not legal or cost advice.

PATH lookup found no `qemu-system-aarch64`, `qemu-system-x86_64`, `vfkit`, `limactl`, `colima`, `podman`, or `tart`. Exact tool-name checks under `/opt/homebrew/Cellar`, `/opt/local/bin`, and `~/.local/bin` found only Docker among the inspected candidates. These bounded locations do **not** establish global machine-wide absence.

Supplementary exact metadata checks also found no `container`, `multipass`, `prlctl`, `vmrun`, `utmctl`, or `krunkit` on PATH. Standard `/Applications` paths for UTM, Docker, OrbStack, Parallels Desktop, and VMware Fusion were absent. These results apply only to the checked PATH and standard application locations; they are not a global absence claim.

### State and image candidate boundaries

The checked `~/.lima`, `~/.colima`, and `~/.tart` paths were absent. `~/.local/share/containers/podman` and `~/.local/share/containers/storage` exist, while `~/.local/share/containers/podman/machine` was absent. **No container-storage or image contents were read, and no personal state was reused.** Existing container directories are not evidence of a clean disposable guest.

A top-level-only filename filter examined Downloads, the Overflow volume root, and the project root. It selected only regular, nonsymlink files matching recognized OS names (`ubuntu`, `debian`, `alpine`, `fedora`, `restore`, `macos`, `linux`) and image extensions (`iso`, `ipsw`, `qcow2`, `img`, `raw`). It found **zero matching candidates**. This was not recursive, did not read personal file contents, and is not an exhaustive claim that the machine has no image files; other names and locations were outside the inspection.

### Host capability is not guest readiness

The Virtualization framework exists and `kern.hv_support` is **1**. Neither observation proves an entitled usable launcher, a clean guest image, isolation, or runtime readiness.

Local JDK release metadata reports **Java 21.0.12.1**, Homebrew, `OS_NAME=Darwin`, `OS_ARCH=aarch64`. That identifies a host toolchain only; it is not evidence that a Linux guest has a compatible JDK or complete offline Gradle/toolchain cache.

## Capacity snapshot and unapproved budget

| Volume | Free bytes at inspection | Approximate GiB |
| --- | ---: | ---: |
| Local SSD | 28,287,836,160 | 26.35 |
| Overflow | 16,987,099,136 | 15.82 |

This time-bound free-space snapshot is **not** storage approval or proof of adequacy. A future budget must cover, on each affected volume, the peak of:

**uncompressed base image + bounded writable overlay + approved input disk + bounded output + operational overhead + retained free-space reserve**.

All component budgets remain unknown. Do not invent a VM size, assume sparse allocation or cloning saves sufficient space, reuse personal images/state, or combine separate volumes' free space as though it were one allocation. Downloads, decompression, staging and retained artifacts must be accounted for wherever they coexist at peak usage.

## G0 prerequisite assessment

| Prerequisite | Current evidence / disposition |
| --- | --- |
| Usable pinned and entitled launcher | **Not established**; Docker CLI metadata and host virtualization capability are insufficient |
| Clean pinned existing guest image | **Not established** within the bounded filename inventory; provenance, identity and cleanliness unknown |
| Guest OS/architecture/toolchain compatibility | **Unknown**; Darwin host JDK is not Linux guest evidence, nor does it establish iOS VM support |
| Complete approved offline dependencies/input manifest | **Unknown**; no cache or container-image contents inspected/copied |
| Licensing and no-cost operating basis | **Unknown** for an actual enclosure; formula license metadata is not subscription or usage evidence |
| Per-volume storage/time budget and cleanup ownership | **Unknown**; free-space snapshot alone cannot satisfy this gate |
| Preboot configuration inspection and observer adequacy | **Unproven**; no concrete enclosure exists to review or test |

No prerequisite is silently promoted from unknown to passed. G1 synthetic boot and G2 real-tool execution remain unauthorized by this inspection and blocked by unmet G0 prerequisites.

## Recommended next direction

Retain strict deny-all-network and the already-working bounded compiled-model test fallback. If the user has a **known clean existing launcher and guest image**, ask only for their nonsecret local locations to enable a newly bounded metadata review. Do not request credentials, repeat the same inspected paths without new evidence, infer permission to search personal contents, or install/download anything to fill the gaps. If no such artifacts are known, record the enclosure prerequisite as blocked rather than presenting a speculative VM as ready.
