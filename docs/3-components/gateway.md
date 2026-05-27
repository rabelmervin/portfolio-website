---
sidebar_position: 1
---
# Gateway

## 1. What it is and Purpose
The **Gateway** is the HTTP front-door of the entire Graphily platform. It is a WebAssembly component (`wasm32-wasip2`) built on the [Axum](https://github.com/tokio-rs/axum) web framework that receives every incoming client request.

Its purpose is to **isolate every concern that happens before a GraphQL query is executed**. By handling authentication, rate limiting, input validation, CORS, and OAuth at the edge, it ensures the downstream Data-Engine and Entities components only ever receive clean, authorized, and validated requests.

## 2. Component Boundaries (The WIT Contract)
This is the most critical section for any Wasm component. Other engineers need to know exactly how to talk to it.

**Exports (Provides)**
- `wasi:http/incoming-handler` via `wasi:http/proxy@0.2.9` (the HTTP entrypoint)

**Imports (Requires)**
- `graphily:security/security-api` (For token verification and rate limiting)
- `graphily:data-engine/data-engine-api` (To forward validated GraphQL requests)
- `graphily:data-engine/auth-db-api` (To verify users and refresh tokens during auth flows)
- `wasi:http/outgoing-handler` via `wasi:http/proxy@0.2.9` (outbound HTTP)

## 3. Core Responsibilities
- **HTTP Routing & Endpoints**: Serves `/graphql` and `/graphql/{app_id}` (GET GraphiQL, POST GraphQL, OPTIONS), plus `/file_upload/{app_id}`, `/oauth`, `/authentication/callback`, `/graphql/{app_id}/builder-login`, `/health`, and `/version`.
- **Authentication & OAuth**: Verifies JWTs (bearer or cookie), supports builder cookies, and handles auth mutations and FusionAuth/Betty Account OAuth callbacks.
- **Rate Limiting**: Enforces IP-level and per-app buckets (BQL + RPM/RPH/RPD) with sandbox multipliers and optional usage reporting.
- **Request Validation**: Enforces query depth/complexity and mutation input validations from configured rules.
- **App Access Gating**: Enforces app state/visibility (live/sandbox/private) and returns deny/redirect-to-OAuth responses.
- **CORS Handling**: Applies CORS based on `GRAPHILY_ALLOWED_ORIGINS` and `GRAPHILY_EXTRA_ORIGINS` with `Vary: Origin` when needed.

## 4. Internal Data Flow
1. **Receive HTTP Request**: Resolve app ID, origin, and client IP; parse the JSON body (single or batch).
2. **Extract & Verify Auth**: Read bearer/cookie JWT, fetch RS256 public key if needed, validate token for the app, and derive builder status (JWT or builder cookie).
3. **Rate Limit**: Enforce IP-level and per-app buckets; compute optional usage header when requested.
4. **Validate GraphQL**: Check query depth/complexity and apply mutation input validation rules.
5. **App Access Gating**: Enforce app state/visibility and validate Betty Account session CAS token when present.
6. **Auth-Exempt Mutations**: Handle `login`, `refreshToken`, `toCookie`, and OAuth mutations in-gateway via auth services and `auth-db-api`.
7. **Forward to Data-Engine**: For all other operations, call `data-engine-api.execute-graphql` and return the JSON response.

## 5. Libraries / Crates Used
| Crate | What it does in Gateway |
|---|---|
| **`axum`** / **`wstd-axum`** | Web framework for routing and request extraction, bridged to the WASM component model. |
| **`wstd`** | WASM standard library for making outbound HTTP calls. |
| **`wit-bindgen`** | Generates WIT bindings for cross-component communication. |
| **`serde` / `serde_json`** | JSON serialization for request bodies and configuration. |
| **`base64`** / **`sha1`** / **`hmac`** / **`marshal-rs`** | Legacy Betty5 cookie parsing and cryptography. |
| **`tracing`** | Structured logging and observability. |
| **`errors`** | Shared error registry for standardizing error codes. |
