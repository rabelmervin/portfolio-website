---
sidebar_position: 5
---
# Actions

## 1. What it is and Purpose
The **Actions** component is a backend data-access layer that bridges the Graphily GraphQL API to external action services. It is compiled as a WebAssembly component (`wasm32-wasip2`).

Its purpose is to let Graphily **extend beyond the database**. When a GraphQL query asks for a field mapped to a third-party API or legacy microservice (rather than a database entity), the Actions component takes over. It abstracts away the external network complexity, presenting external data as a unified GraphQL interface to the client.

## 2. Component Boundaries (The WIT Contract)
This is the most critical section for any Wasm component. Other engineers need to know exactly how to talk to it.

**Exports (Provides)**
- `graphily:actions/actions-api` (Exposes `execute_action(app_id, action_id, params, auth_info)`)

**Imports (Requires)**
- None (no WIT imports; outbound HTTP is used only in wasm32 builds)

## 3. Core Responsibilities
- **Remote Resource Execution**: Dispatches queries to remote HTTP endpoints (`/api/run`) and forwards source metadata; decryption is a stub in this repo.
- **ActionsAPI Execution**: Dispatches ActionsAPI calls through mocked gRPC client stubs (no live gRPC transport).
- **Response Formatting + Validation**: Injects `__typename` and validates remote responses (e.g., `totalCount`) when enabled or in sandbox.
- **Authentication Forwarding**: Decodes JWT claims (without signature verification) to propagate user identity to external services.

## 4. Internal Data Flow
1. **Receive Call**: A caller invokes Actions (WIT `execute_action` for remote-resource, or in-process `actions` APIs for both paths).
2. **Resolve Inputs**: Build params/typenames and auth info from variables/JWT; load resource action metadata and data-source config.
3. **Decrypt Source Info**: Base64-decode encrypted fields and pass through a decrypt stub (plaintext passthrough in this repo).
4. **Dispatch**:
	- Remote resource: HTTP POST `/api/run` (wasm32 only).
	- ActionsAPI: call mocked gRPC stubs (connect/build/execute).
5. **Validate + Format**: Enforce response validation rules, inject `__typename`, and return JSON.

## 5. Libraries / Crates Used
| Crate | What it does in Actions |
|---|---|
| **`wit-bindgen`** | Generates WIT bindings for cross-component communication. |
| **`wstd`** | WASM standard library for making the actual outbound HTTP calls via `wasi:http`. |
| **`serde` / `serde_json`** | JSON serialization and deserialization for request parameters and responses. |
| **`base64`** | Decoding JWT payloads (URL safe) and base64-encoded encrypted ciphertexts. |
| **`anyhow` / `thiserror`** | Flexible error handling and derivation for structured error types. |
| **`errors`** | Shared error registry for standardizing error codes returned to the Gateway. |
