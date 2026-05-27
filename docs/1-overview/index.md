# What is Graphily?

Graphily is a WebAssembly-native universal data-api platform designed to turn a MySQL database into a GraphQL API with built-in authentication, role-based access control (RBAC), and app-scoped access controls.

At the foundation of Graphily is WebAssembly (WASM) and the wasmCloud component model, which enables dynamic schema compilation into lightweight, hot-swappable components. WebAssembly provides portability, high-performance execution, isolation, and the ability to deploy GraphQL layers anywhere from Kubernetes clusters to edge nodes.

## Use Cases

### API Generation
- Instant GraphQL from MySQL
- High-Performance Data Fetching (SeaORM)
- Automated Pagination, Filtering & Sorting
- Deep Nested Relational Mutations
- Upserts & ID Reservation

### Security
- Zero-Trust Component Isolation
- Role-Based Access Control (RBAC)
- Dynamic Row-Level Security
- Field-Level Data Masking
- JWT & OAuth2 Lifecycle Management

### Extensibility
- Custom SQL Aggregations & Recursive Queries
- Third-Party API Integration (Actions HTTP + ActionsAPI)
- Direct S3 File Upload Proxies
- Semantic Search Integration

## Architecture

Graphily comprises five key WebAssembly components backed by two custom native host plugins. Cross-component calls are defined by WIT contracts:

- **Gateway**: HTTP front door for routing, auth/OAuth, rate limiting, and validation.
- **Data-Engine**: Orchestrates requests, enforces policy, and dispatches to SQL, actions, or Entities.
- **Security**: Centralizes JWT verification, rate limits, query validation, and RBAC field stripping.
- **Actions**: Extends the API by calling external services (remote HTTP and ActionsAPI).
- **Entities**: Executes GraphQL against SeaORM models via Seaography.

Crucially, these WASM components communicate with the native machine via two custom host plugins:
- **MySQL Host Plugin**: Executes SQL over the WIT boundary for queries and mutations.
- **Compiler Host Plugin (Kompilre)**: Regenerates SeaORM entities and rebuilds the Entities component when the schema changes.

[Read more about the internal Architecture](./architecture)
