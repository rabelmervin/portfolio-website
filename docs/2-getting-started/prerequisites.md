---
sidebar_position: 1
---
# Prerequisites

To get started with Graphily, you will need the following tools installed on your system.

**All setups**
- [Rust](https://rustup.rs/) (stable toolchain)
- [wash CLI v2](https://wasmcloud.com/docs/installation) — wasmCloud v2 build and runtime tool
- MySQL 8.0 or later

**Kubernetes deployment (additional)**
- [Docker](https://docs.docker.com/get-docker/) — for kind clusters
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) — local Kubernetes
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [helm](https://helm.sh/docs/intro/install/)
- [oras](https://oras.land/docs/installation) — OCI registry client

**Install required Rust targets (run once):**
```bash
rustup target add wasm32-wasip2 wasm32-wasip1 wasm32-unknown-unknown
```
