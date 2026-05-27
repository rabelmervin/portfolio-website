---
sidebar_position: 2
---
# Kompilre Runtime Local Deployment

Kompilre is the live schema pipeline for Graphily. It converts `.sql` model definitions into SeaORM entity structs and hot-swaps the running Entities component. It consists of two WASM components (`json-compiler` and `schema-compiler`) and a native host plugin (`compiler-plugin`) embedded into the custom `wash` binary.

This guide covers building the host, deploying a dedicated Kompilre kind cluster, and running the live compilation pipeline locally.

---

## Step 1: Clone the Repositories

First, ensure you have the required repositories cloned into your workspace.

```bash
git clone -b Host-Plugin https://github.com/rabelmervin/wasmCloud.git
git clone https://github.com/rabelmervin/Kompilre.git
```

---

## Step 2: Build the Wash Host Binary

The `wash` binary in this repository has the **MySQL HostPlugin** and the **Kompilre Compiler HostPlugin** natively compiled into it. 

:::danger Linux/WSL Required
This build takes about 20-50 minutes and must be run on Linux or WSL.
:::

Build it once:

```bash
cd wasmCloud
cargo build --release -p wash
cp target/release/wash ../build/wash
cd ..
```

Verify it starts successfully:

```bash
./build/wash --version
```

---

## Step 3: Build Kompilre Components

Build the two WASM components responsible for the compiler logic:

```bash
cd Kompilre

(cd json-compiler   && wash build --skip-fetch)
(cd schema-compiler && wash build --skip-fetch)

cd ..
```

---

## Step 4: Create the Kompilre Kind Cluster

Create a dedicated local Kubernetes cluster for Kompilre, separate from Graphily. This cluster is configured to mirror a local registry on port `5002`.

```bash
cat <<'EOF' | kind create cluster --name kompilre --config /dev/stdin
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:5002"]
        endpoint = ["http://localhost:5002"]
EOF
```

---

## Step 5: Start the Kompilre OCI Registry

Spin up a dedicated OCI registry for Kompilre on port `5002` and connect it to the new cluster network:

```bash
docker run -d --restart=always -p 5002:5000 --name kompilre-registry registry:2
docker network connect kind kompilre-registry
```

---

## Step 6: Install the wasmCloud Operator

Use Helm to install the wasmCloud runtime operator into the `kompilre` cluster:

```bash

helm install wasmcloud \
  oci://ghcr.io/wasmcloud/charts/runtime-operator \
  --version v2-canary \
  --namespace wasmcloud \
  --create-namespace \
  --set global.tls.enabled=false
```

Verify the operator is up:

```bash
kubectl rollout status deployment/wasmcloud-runtime-operator -n wasmcloud
kubectl get pods -n wasmcloud
```

---

## Step 7: Push Components to OCI Registry

Push the compiled WASM components to the `5002` registry using `oras`. 

:::warning Content Type
The `--disable-path-validation` flag and the exact `layer.v1+wasm` content type are required.
:::

```bash
oras push localhost:5002/kompilre/json-compiler:latest \
  build/json_compiler.wasm:application/vnd.module.wasm.content.layer.v1+wasm \
  --plain-http

oras push localhost:5002/kompilre/schema-compiler:latest \
  build/schema_compiler.wasm:application/vnd.module.wasm.content.layer.v1+wasm \
  --plain-http
```

---

## Step 8: Deploy Kompilre Workloads

Apply the NATS and Kompilre workload manifests.

```bash
kubectl config use-context kind-kompilre
kubectl apply -f Kompilre/k8s/nats.yaml
kubectl apply -f Kompilre/k8s/workload.yaml
```

To allow local communication, port-forward NATS. **Keep this running in a dedicated terminal.**

:::info Port Conflict Avoidance
Notice we forward to port `4223` locally to avoid conflicting with the Graphily cluster's NATS (`4222`).
:::

```bash
kubectl config use-context kind-kompilre
kubectl port-forward -n wasmcloud svc/nats 4223:4222
```

---

## Step 9: Start the Kompilre Wash Host

Open a new terminal and start the custom `wash` host on port `8082`. We pass specific environment variables so the compiler plugin knows where to output the generated SeaORM code and which registry to push the final `.wasm` binary to.

```bash
RUST_LOG=info \
GRAPHILY_REPO_ROOT="/mnt/c/Users/rabel mervin/static-graphily" \
REGISTRY_URL="http://localhost:5001" \
IMAGE_TAG="latest" \
./build/wash host \
  --host-group default \
  --scheduler-nats-url nats://localhost:4223 \
  --data-nats-url nats://localhost:4223 \
  --http-addr 0.0.0.0:8082 \
  --allow-insecure-registries
```

---

## Step 10: Trigger a Schema Compile

With the cluster, host, and components running, you can manually trigger the schema compiler pipeline by piping your `.sql` definitions into the `json-compiler` HTTP endpoint.

```bash
# Combine both SQL dumps and POST to json-compiler
cat betty_models.sql betty_model_properties.sql | \
  curl -s -X POST http://localhost:8082/compile \
    -H "Content-Type: text/plain" \
    --data-binary @-
```

This request kicks off the entire compilation flow: converting SQL to JSON, generating Rust code, building the `entities.wasm` file via the host plugin, and hot-swapping it into the Graphily runtime!
