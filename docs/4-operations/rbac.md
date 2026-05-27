---
sidebar_position: 4
---
# Role-Based Access Control (RBAC)

Graphily implements a highly distributed and secure RBAC model. Instead of relying on a single monolithic bottleneck, authorization checks are performed at multiple stages of the request lifecycle to ensure defense in depth.

## The Three Pillars of Graphily RBAC

### 1. Operation-Level Access (Security Component)
Before a request even reaches the data layer, the **Security WASM Component** validates the incoming JWT and parses the GraphQL AST. It extracts the intended operation (e.g., `usersCreateOne`) and ensures the authenticated role has explicit permission to execute that specific mutation or query.

### 2. Access Matrices (Data-Engine Component)
The **Data-Engine** orchestrates complex request flows. It holds access matrices that define broad organizational policies. When a request requires touching multiple microservices or aggregating data, the Data-Engine enforces the organizational matrix rules before routing the traffic.

### 3. Row-Level & Field Guards (Entities Component)
At the lowest level, the **Entities Component** (powered by SeaORM and Seaography) enforces Row-Level Security (RLS) and Field Guards. This ensures that even if a user is allowed to query `users`, they can only retrieve rows that belong to their tenant, and sensitive fields (like `password_hash`) are automatically stripped out.

:::tip Defense in Depth
By distributing these checks across the WASM boundaries, Graphily ensures that a compromise or misconfiguration in one component does not lead to a data breach.
:::
