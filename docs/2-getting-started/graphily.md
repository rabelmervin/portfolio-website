---
sidebar_position: 3
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Graphily Runtime Local Deployment

This guide walks you through deploying the full Graphily stack locally using a Kubernetes (`kind`) cluster, a local OCI registry, and a custom `wash` host that includes our native MySQL and Compiler plugins.

## Overview

Running Graphily requires a few moving parts to simulate a production environment:
1. **Kubernetes (kind)**: To orchestrate the wasmCloud environment and NATS message broker.
2. **Local OCI Registry**: To host our compiled WebAssembly components.
3. **Custom Wash Host**: The runtime engine that executes our WASM components and provides the native MySQL connections.

---

## Step 1: Clone the Repository

First, ensure you have the Graphily repository cloned and navigate into it. All subsequent commands should be run from the root of this repository.

```bash
git clone https://github.com/rabelmervin/static-graphily.git
cd Graphily
```

---

## Step 2: Create the Graphily Kind Cluster

Next, we need to create a local Kubernetes cluster. We configure it specifically to mirror a local container registry so it can pull our WASM components later.

```bash
cat <<'EOF' | kind create cluster --name graphily --config /dev/stdin
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:5001"]
        endpoint = ["http://localhost:5001"]
EOF
```

Next, install the wasmCloud operator into the cluster using Helm:

```bash
kubectl config use-context kind-graphily

helm install wasmcloud \
  oci://ghcr.io/wasmcloud/charts/runtime-operator \
  --version v2-canary \
  --namespace wasmcloud \
  --create-namespace \
  --set global.tls.enabled=false
```

Verify that the operator is running:

```bash
kubectl rollout status deployment/wasmcloud-runtime-operator -n wasmcloud
kubectl get pods -n wasmcloud
```

---

## Step 3: Build Graphily WASM Components

Now we compile the Rust crates into WebAssembly modules using the `wash` CLI. 

:::danger Windows Users
This build step **must** run in WSL (Windows Subsystem for Linux) or a native Linux environment. The Windows WASM linker currently crashes when processing large binaries like the SeaORM entities.
:::

```bash
(cd crates/gateway     && wash build --skip-fetch)
(cd crates/data-engine && wash build --skip-fetch)
(cd crates/security    && wash build --skip-fetch)
(cd crates/actions     && wash build --skip-fetch)
```

The compiled binaries will be output to the `build/` directory at the root of the repository:
- `build/gateway.wasm`
- `build/data_engine.wasm`
- `build/security.wasm`
- `build/actions.wasm`

---

## Step 4: Setup the Local OCI Registry

wasmCloud loads components from OCI registries (just like Docker images). Let's spin up a local registry on port `5001`.

```bash
docker run -d --restart=always -p 5001:5000 --name graphily-registry registry:2
```

We need to connect this registry container to the `kind` docker network so our Kubernetes cluster can reach it:

```bash
docker network connect kind graphily-registry
```

Verify the registry is reachable:
```bash
curl http://localhost:5001/v2/
# Expected output: {}
```

---

## Step 5: Apply Kubernetes Manifests

Apply the NATS message broker and the wasmCloud workload deployments to the cluster.

```bash
kubectl apply -f k8s/nats.yaml
kubectl apply -f k8s/workloaddeployment.yaml
```

To allow our local `wash` host to communicate with the cluster's NATS instance, port-forward NATS to your local machine. **Keep this command running in a dedicated terminal.**

```bash
kubectl config use-context kind-graphily
kubectl port-forward -n wasmcloud svc/nats 4222:4222
```

---

## Step 6: Load MySQL Data

Graphily requires a MySQL database to serve. In this example, we'll create a database, grant TCP access to the root user, and load a sample schema.

:::info Host Networking
If you are running MySQL on your host machine (outside Docker), use `172.18.0.1` from WSL to access the host's database.
:::

```bash
# Grant TCP access from WSL2 — run as OS root via socket auth
sudo mysql -e "
CREATE DATABASE IF NOT EXISTS mail_billing_slips_a_d4f;
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'your_password';
GRANT ALL ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
"

# Load the business data schema
mysql -u root -pyour_password -h 172.18.0.1 mail_billing_slips_a_d4f \
  < mail-billing-slips/mail-billing-slips/mail_billing_slips_a_d4f.sql
```

Verify the data loaded correctly:

```bash
mysql -u root -pyour_password -h 172.18.0.1 mail_billing_slips_a_d4f \
  -e "SELECT COUNT(*) FROM mail_slip_requests;"
# Expected output: 9
```

---

## Step 7: Push WASM Components to Registry

We use `oras` to push our compiled `.wasm` files to the local registry we created in Step 4.

:::warning Critical Content Type
You must use the exact `application/vnd.module.wasm.content.layer.v1+wasm` content type specified below. If you omit this or use a different content type, the wasmCloud host will reject the component at load time.
:::

```bash
oras push localhost:5001/graphily/gateway:latest \
  build/gateway.wasm:application/vnd.module.wasm.content.layer.v1+wasm \
  --plain-http

oras push localhost:5001/graphily/data-engine:latest \
  build/data_engine.wasm:application/vnd.module.wasm.content.layer.v1+wasm \
  --plain-http

oras push localhost:5001/graphily/entities:latest \
  build/entities.wasm:application/vnd.module.wasm.content.layer.v1+wasm \
  --plain-http

oras push localhost:5001/graphily/security:latest \
  build/security.wasm:application/vnd.module.wasm.content.layer.v1+wasm \
  --plain-http

oras push localhost:5001/graphily/actions:latest \
  build/actions.wasm:application/vnd.module.wasm.content.layer.v1+wasm \
  --plain-http
```

---

## Step 8: Create Configuration Secrets

The operator uses standard Kubernetes Secrets to securely inject configuration into the WASM components via the wasmCloud config protocol.

:::danger Database Host
When defining the `GRAPHILY_DB_URL` inside Kubernetes, use `172.18.0.1` (the host gateway) instead of `127.0.0.1` or `localhost`.
:::

```bash
kubectl create secret generic graphily-secrets --namespace graphily \
  --from-literal=GRAPHILY_DB_URL="mysql://root:your_password@172.18.0.1:3306/mail_billing_slips_a_d4f" \
  --from-literal=GRAPHILY_JWT_SECRET="graphily-dev-secret"
```

---

## Step 9: Start the Custom Wash Host

Finally, we start the custom `wash` host. This custom binary is critical because it contains the native **MySQL Host Plugin** and **Compiler Host Plugin** required by the WebAssembly components to talk to the real world.

First, ensure your machine can resolve the `nats` hostname locally:

```bash
echo "127.0.0.1 nats" | sudo tee -a /etc/hosts
```

Then, run the custom host:

<Tabs>
  <TabItem value="insecure" label="Without TLS" default>

```bash
RUST_LOG=info ./build/wash host \
  --host-group graphily \
  --scheduler-nats-url nats://nats:4222 \
  --data-nats-url nats://nats:4222 \
  --http-addr 0.0.0.0:8081 \
  --allow-insecure-registries 2>&1 | tee wash.log
```

  </TabItem>
  <TabItem value="tls" label="With TLS">

Use this configuration when operator-generated certificates are available:

```bash
RUST_LOG=info ./build/wash host \
  --host-group graphily \
  --scheduler-nats-url nats://wasmcloud-runtime@nats:4222 \
  --data-nats-url nats://wasmcloud-data@nats:4222 \
  --scheduler-nats-tls-ca /tmp/runtime-ca.crt \
  --scheduler-nats-tls-cert /tmp/runtime.crt \
  --scheduler-nats-tls-key /tmp/runtime.key \
  --data-nats-tls-ca /tmp/data-ca.crt \
  --data-nats-tls-cert /tmp/data.crt \
  --data-nats-tls-key /tmp/data.key \
  --http-addr 0.0.0.0:8081 \
  --allow-insecure-registries 2>&1 | tee wash.log
```

  </TabItem>
</Tabs>

Wait for the following lines to appear in your terminal before testing:
```text
INFO HTTP server listening addr=0.0.0.0:8081
INFO MySQL HostPlugin started and registered
INFO Host started
INFO Binding graphily:mysql/mysql-api to workload component
```

---

## Step 10: Health Check

Your runtime is now fully deployed and the Gateway component is listening on port 8081.

Verify the system is up by running a health check:

```bash
curl -s http://localhost:8081/health
```

**Expected output:**
```json
{"status":"ok"}
```
