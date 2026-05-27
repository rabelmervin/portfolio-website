---
sidebar_position: 2
---
# Data-Engine

## 1. What it is and Purpose
The **Data-Engine** is the central GraphQL request processing pipeline of Graphily. It is a WebAssembly component (`wasm32-wasip2`) that acts as an orchestration and middleware layer. 

Crucially, **Data-Engine has no knowledge of SeaORM**. It does not use the ORM layer or entity structs. Its purpose is to be the **brain** of Graphily. It ensures every query and mutation passes through a unified security, validation, and transformation pipeline before execution, delegating standard operations to the Entities component while handling complex custom SQL strategies internally.

## 2. Component Boundaries (The WIT Contract)
This is the most critical section for any Wasm component. Other engineers need to know exactly how to talk to it.

**Exports (Provides)**
- `graphily:data-engine/data-engine-api` (Execution of GraphQL queries)
- `graphily:data-engine/auth-db-api` (Auth DB operations used by Gateway)

**Imports (Requires)**
- `graphily:mysql/mysql-api` (MySQL host plugin for aggregates, recursive, and upserts)
- `graphily:security/security-api` (JWT, rate limits, query validation, crypto)
- `graphily:entities/entities-api` (Seaography GraphQL execution)

## 3. Core Responsibilities
- **Operation Routing**: Detects and dispatches Standard, Aggregate, Recursive, Nested, Upsert, Reserve, FileUpload, ConvertFileReference, and `me*` queries.
- **JWT + App Policy Checks**: Verifies app-bound JWTs, enforces mutation-enabled flags, and applies app state rules.
- **RBAC + SecurityContext**:
  - Preflights read access against `GRAPHILY_ACCESS_MATRIX_*` and nested entity access.
  - Builds the `SecurityContext` (roles, role IDs, access matrices, lenses, row-level settings, user claims) for Entities.
- **Input Transformation**: Normalizes filters/where/sort, applies defaults, sanitizes HTML, injects timestamps, hashes password fields, normalizes empty strings, and enforces write-field permissions.
- **Transactions + Latency Budgets**: Wraps mutations in transactions and applies query latency budget checks with accounting.
- **Specialized Execution**: Uses raw SQL via `sea-query` for aggregates/recursive/upserts/reserve, presigns S3 uploads, and dispatches actions via the in-process `actions` library.

## 4. Internal Data Flow
1. **Receive WIT Call**: Accept a `GraphqlRequest` from Gateway and parse the operation type.
2. **Verify & Guard**: Verify JWT, derive roles/auth profile, enforce no-roles profiles, and apply app policy checks (mutations enabled, private app redirect).
3. **Resolve Context**: Resolve DB URL and role IDs; preflight access matrix for reads when configured.
4. **Special Operations**: Handle file upload/convert, aggregates, recursive CTE, upsert/reserve, and other non-standard handlers directly (raw SQL via MySQL WIT).
5. **Actions Dispatch**: If the top field maps to a resource action, call the in-process `actions` library (remote-resource or ActionsAPI path).
6. **Standard Execution**: Normalize variables/query, build `SecurityContext`, enforce latency budget, wrap mutations in a transaction, and call Entities.
7. **Post-Process**: Apply introspection filtering, strip restricted fields, wrap CRUD results, lift pagination, add suggested indexes, commit/rollback, and return `GraphqlResponse`.

## 5. Libraries / Crates Used
| Crate | What it does in Data-Engine |
|---|---|
| **`wit-bindgen`** | Generates WIT bindings for cross-component communication. |
| **`serde` / `serde_json`** | JSON handling for GraphQL variables, JWTs, and RBAC matrices. |
| **`sea-query`** | SQL query builder for raw queries (CTE, aggregates, refresh tokens). |
| **`chrono` / `chrono-tz`** | Timestamp injection and token expiry calculation. |
| **`ammonia`** | HTML sanitization and XSS protection. |
| **`aws-sdk-s3`** / **`aws-smithy-wasm`** | AWS S3 client for presigned URLs within the WASM sandbox. |
| **`uuid`** / **`base64`** / **`hmac`** | UUID generation and crypto support for ZippedJson references. |
