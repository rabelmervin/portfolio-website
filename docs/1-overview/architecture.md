# Production scenario

## Diagram
![Schema Deploy Runtime](/img/schema_deploy_runtime.png)

## Design-Time Scenario (Schema to Component)

Design time is the build phase where Graphily converts a database schema into a deployable Entities component. **Kompilre** get .sql files and outputs per entity.rs files directly into entities/generated and compile with exiting /src files to build a entities component.

**Kompilre** consists of 2 components Json-compiler and schema-compiler.

1. **Json-compiler** compiles .sql into .json.
2. **Schema-compiler** compiles .json from Json-compiler into .rs entity files.

Typical pipeline:
1. **Schema Input**: The compiler plugin (Kompilre) receives SQL/DDL files or a schema snapshot.
2. **Model Generation**: Kompilre generates SeaORM entity code and BettyQL-compatible schema metadata.
3. **Component Build**: A new Entities WASM component is built with Seaography and the Graphily hooks wired in.
4. **Package & Push**: The resulting component artifact is pushed to the runtime host for activation.

Example local setup (ports are configurable):
- **Compiler service (5002)**: watches schema changes or accepts schema input, runs Kompilre, and produces the Entities component.
- **Runtime host (5001)**: receives the updated Entities component and runs it alongside Gateway, Data-Engine, Security, and Actions.
- Example host HTTP ports: **Kompilre host** on `0.0.0.0:8082`, **Graphily runtime host** on `0.0.0.0:8081`.

Only the Entities component changes during design time; the other components remain stable and can be reused across schema revisions.

## Run-Time Scenario (Request Execution)


At run time, the system runs as a set of WASM components plus host plugins:
- **Gateway**: HTTP entrypoint, auth/OAuth, rate limits, query validation, and CORS.
- **Data-Engine**: request orchestration, RBAC policy checks, and execution dispatch.
- **Security**: JWT verification, rate limiting, query validation, and field stripping.
- **Actions**: external service integration for non-database data.
- **Entities**: GraphQL execution over SeaORM models.

Runtime request flow (simplified):
1. **Client -> Gateway**: HTTP request arrives; Gateway validates auth, rate limits, and query rules.
2. **Gateway -> Data-Engine**: Valid requests are forwarded through the WIT boundary.
3. **Data-Engine -> Entities / SQL / Actions**:
	- **Entities** for standard CRUD and schema-backed queries.
	- **Raw SQL** for aggregates, recursive CTEs, upserts, and reserve operations.
	- **Actions** for remote HTTP or ActionsAPI integrations.
4. **Entities -> MySQL Host Plugin**: SeaORM queries are executed via the MySQL WIT host.
5. **Response -> Gateway -> Client**: Data-Engine post-processes and Gateway returns JSON.

When schema changes are detected (or a new schema snapshot is provided), the compiler plugin rebuilds the Entities component and deploys it to the runtime host. The rest of the components remain stable, minimizing downtime and risk during schema evolution.

## Architecture Overview

Graphily is organized around explicit WIT contracts and host plugins:

**Components**
- Gateway, Data-Engine, Security, Actions, and Entities are independent WASM components.
- Components communicate through WIT interfaces with strict input/output contracts.

**Host Plugins**
- **MySQL Host Plugin** executes SQL for Entities and Data-Engine.
- **Compiler Host Plugin (Kompilre)** builds and ships new Entities components during design time.

**Deployment Topology (example)**
- **Runtime host (5001)** runs Gateway, Data-Engine, Security, Actions, and Entities.
- **Compiler service (5002)** builds Entities from schema input and pushes updates to the runtime host.

This separation allows frequent schema iteration without restarting the full runtime stack.

