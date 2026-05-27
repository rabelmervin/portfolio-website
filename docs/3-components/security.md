---
sidebar_position: 4
---
# Security

## 1. What it is and Purpose
The **Security** component is a self-contained security layer compiled as a WebAssembly component (`wasm32-wasip2`). 

Its purpose is to be the **single source of truth for all security operations** in Graphily. By isolating every cryptographic operation, token lifecycle, and rate-limiting decision into one unit, Graphily ensures that sensitive security logic is never duplicated, never scattered, and is easily audited. Other components rely entirely on this component for crypto math.

## 2. Component Boundaries (The WIT Contract)
This is the most critical section for any Wasm component. Other engineers need to know exactly how to talk to it.

**Exports (Provides)**
- `graphily:security/security-api` (Exposes all cryptographic functions: `verify_token`, `generate_token`, `check_password`, rate limiting checks, query validation, etc.)

**Imports (Requires)**
- *None (or standard WASI).* The Security component is a pure logic module that performs CPU-bound cryptographic work. It does not call out to databases or external APIs.

## 3. Core Responsibilities
- **JWT Management**: Generates and verifies access tokens (HS256/HS512/RS256), refresh tokens, and builder tokens.
- **Multi-Tier Rate Limiting**: Maintains global state for IP-level, App-level (BQL, requests per minute/hour/day), Latency Budget, and Login abuse rate limits.
- **RBAC Processing**: 
  - **Field-Level RBAC**: Strips restricted fields from the final GraphQL JSON output before it is returned to the client, based on role configurations (`GRAPHILY_FIELD_PERMISSIONS`).
- **App Access Checks**: Evaluates `check-app-access` to enforce app state and visibility.
- **Query Validation**: Validates query depth and complexity from the query string.
- **Password Hashing**: Hashes and verifies `bcrypt` (modern) and legacy `SHA-512` passwords.
- **OAuth + HMAC Helpers**: Generates/validates OAuth state and exposes HMAC signing.

## 4. Internal Data Flow
1. **Receive Call**: Gateway/Data-Engine call a WIT function (JWT verify, rate limit, query validation, or RBAC strip).
2. **Execute Logic**:
  - JWT: build secret list, verify signature/claims, return `AuthResult`.
  - Rate limits: update in-memory sliding-window buckets and return allow/deny.
  - Query validation: compute depth/complexity from query text (introspection bypass).
  - RBAC strip: remove disallowed fields from response JSON based on env rules.
3. **Return Result**: Synchronous result or error back through the WIT boundary; no external I/O.

## 5. Libraries / Crates Used
| Crate | What it does in Security |
|---|---|
| **`jsonwebtoken`** | Core JWT library for encoding, decoding, and signature verification (HS256/HS512/RS256). |
| **`rsa`** | RSA cryptographic operations for RS256 JWT verification using PEM public keys. |
| **`bcrypt`** | Password hashing and verification. |
| **`aes` / `ctr` / `pbkdf2`** | AES-256-CTR encryption with PBKDF2-HMAC-SHA256 key derivation. |
| **`hmac` / `sha1` / `sha2`** | HMAC signing (OAuth state tokens) and legacy password hashing. |
| **`getrandom`** | Cryptographically secure random number generation (with `js` WASM support). |
| **`wit-bindgen`** | Generates WIT bindings for cross-component communication. |
| **`serde` / `serde_json`** | JSON handling for RBAC rules and JWT claims. |
