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
  - **Access Authorization**: Evaluates the access matrix for a given entity and action against the user's role IDs, returning a complete authorization decision — including row-level scope, permission-based filter rules, and blocked read/write fields.
  - **Entity Access Check**: Performs a lightweight boolean access check for nested entity guard evaluation.
  - **Field-Level Restrictions**: Strips restricted fields from GraphQL JSON responses based on role configurations (`GRAPHILY_FIELD_PERMISSIONS`).
- **App Access Checks**: Evaluates `check-app-access` to enforce app state and visibility.
- **Query Validation**: Validates query depth and complexity from the query string.
- **Password Hashing**: Hashes and verifies `bcrypt` (modern) and legacy `SHA-512` passwords.
- **OAuth + HMAC Helpers**: Generates/validates OAuth state and exposes HMAC signing.

## 4. Internal Data Flow
1. **Receive Call**: Gateway/Data-Engine call a WIT function (JWT verify, rate limit, query validation, RBAC authorization, or field restriction).
2. **Execute Logic**:
  - JWT: verify signature and claims, return the auth result.
  - Rate limits: update in-memory sliding-window buckets and return allow/deny.
  - Query validation: compute depth and complexity from the query text.
  - RBAC authorization: evaluate the access matrix for entity + action + roles, return the full authorization decision (permitted, row-level scope, permission filters, blocked fields).
  - Field restriction: remove disallowed fields from response JSON based on env config.
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
