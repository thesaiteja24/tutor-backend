## Project Folder Structure

All Fastify projects created or maintained using this skill must follow a feature/domain-based structure.

Do not organize domain-specific code into global folders such as:

```text
controllers/
services/
repositories/
routes/
schemas/
```

Keep all files belonging to a domain together under `modules/`.

Use the following structure:

```text
src/
├── app.ts
├── server.ts
│
├── config/
│   ├── env.ts
│   └── index.ts
│
├── plugins/
│   ├── auth.plugin.ts
│   ├── database.plugin.ts
│   ├── docs.plugin.ts
│   └── index.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.services.ts
│   │   ├── auth.repositories.ts
│   │   ├── auth.schemas.ts
│   │   └── index.ts
│   │
│   ├── users/
│   │   ├── user.routes.ts
│   │   ├── user.services.ts
│   │   ├── user.repositories.ts
│   │   ├── user.schemas.ts
│   │   └── index.ts
│   │
│   └── ...
│
├── database/
│   ├── schema/
│   │   ├── users.ts
│   │   ├── orders.ts
│   │   └── index.ts
│   ├── migrations/
│   ├── relations.ts
│   └── index.ts
│
├── shared/
│   ├── errors/
│   ├── schemas/
│   ├── constants/
│   └── utils/
│
├── hooks/
│
└── tests/
    ├── unit/
    ├── integration/
    └── helpers/
```

---

## `app.ts`

Build and configure the Fastify application.

Responsible for:

- registering plugins
- registering hooks
- registering module routes
- registering error handlers
- registering documentation
- application-wide configuration

Do not start the HTTP server from this file.

---

## `server.ts`

Application entry point.

Responsible for:

- loading validated configuration
- creating the Fastify application
- starting the HTTP server
- graceful shutdown handling

Keep bootstrap logic minimal.

---

## `config/`

Contains application configuration.

`env.ts` must validate environment variables using Zod.

Do not access `process.env` throughout application modules.

Use:

```text
process.env
    ↓
Zod validation
    ↓
typed configuration
    ↓
application
```

Infer the configuration type directly from the Zod schema.

Do not create separate configuration type definitions.

---

## `plugins/`

Contains reusable Fastify plugins.

Examples:

- database
- authentication
- JWT
- CORS
- rate limiting
- Swagger/OpenAPI
- Scalar
- external service clients

Use Fastify's plugin and encapsulation model.

Do not place domain business logic inside plugins.

---

# Modules

All application domains must live under:

```text
src/modules/
```

Each domain must be self-contained.

Example:

```text
modules/
└── users/
    ├── user.routes.ts
    ├── user.services.ts
    ├── user.repositories.ts
    ├── user.schemas.ts
    └── index.ts
```

Module files should follow the domain-prefixed naming format:

```text
modules/users/user.routes.ts
modules/users/user.services.ts
modules/users/user.repositories.ts
modules/users/user.schemas.ts
```

---

# Module File Responsibilities

## `*.routes.ts`

Defines the Fastify HTTP boundary for the module.

Responsible for:

- HTTP methods
- paths
- route registration
- Zod request schemas
- Zod response schemas
- documentation metadata
- authentication hooks
- authorization hooks
- extracting validated request input
- calling the relevant service
- returning standardized responses

Keep route handlers thin.

Routes may handle HTTP-specific concerns but must not contain business logic.

Example responsibility:

```text
HTTP request
    ↓
Zod validation
    ↓
route handler
    ↓
service
    ↓
standard response
```

Do not query the database directly from route handlers.

---

## `*.services.ts`

Contains application and domain business logic.

Responsible for:

- business rules
- workflows
- orchestration
- domain-level validation
- transaction coordination
- external-service coordination
- deciding which repository operations are required

Services must not depend directly on:

- FastifyRequest
- FastifyReply

Pass plain validated values into services.

Example:

```ts
const input = request.body;

const user = await userService.createUser(input);
```

instead of passing the full request object:

```ts
await userService.createUser(request);
```

---

## `*.repositories.ts`

Contains persistence logic.

Responsible for:

- Drizzle queries
- database reads
- database writes
- database-specific filters
- persistence operations

Repositories must not contain:

- HTTP handling
- Fastify request/reply objects
- response construction
- authentication logic
- frontend-facing messages

Do not add repository methods that provide no meaningful abstraction.

For very small modules, direct database access from the service may be acceptable if adding a repository would only create unnecessary pass-through methods.

As the module grows, extract persistence logic into `<domain>.repositories.ts`.

---

## `*.schemas.ts`

Contains all module Zod schemas.

Use Zod for:

- request bodies
- route parameters
- query parameters
- applicable headers
- response bodies
- reusable validation contracts

Zod is the single source of truth for API input and output contracts.

Infer TypeScript types directly:

```ts
export const createUserSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  email: z.string().email(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

Prefer colocating inferred types with their schemas when an exported type is useful.

Do not create a separate `types.ts` solely to hold inferred Zod types.

---

## No `controller.ts`

Do not create a controller layer by default.

Fastify route handlers already provide the HTTP boundary.

Adding:

```text
routes
→ controller
→ service
```

usually creates an unnecessary pass-through layer for this architecture.

Use:

```text
routes
→ service
→ repository
```

instead.

The route handles HTTP-specific concerns.

The service handles business logic.

The repository handles persistence.

Introduce a separate controller only if the application's complexity creates a concrete need for one.

---

## No `types.ts`

Do not create module-level `types.ts` files by default.

Types should preferably come from:

```ts
z.infer<typeof schema>
```

or from Drizzle's schema inference.

Example:

```ts
type CreateUserInput = z.infer<typeof createUserSchema>;

type User = typeof users.$inferSelect;

type NewUser = typeof users.$inferInsert;
```

Create standalone type files only when types:

- cannot reasonably be inferred from Zod
- cannot be inferred from Drizzle
- are genuinely shared across several unrelated modules

Avoid manually duplicating runtime schemas as TypeScript interfaces.

---

## `index.ts`

Acts as the module's public entry point.

Use it for:

- module route exports
- module registration
- intentionally public module APIs

Avoid exposing internal implementation details unnecessarily.

---

# Database

Database infrastructure belongs under:

```text
src/database/
```

For PostgreSQL use Drizzle ORM.

Recommended structure:

```text
database/
├── schema/
├── migrations/
├── relations.ts
└── index.ts
```

---

## `database/schema/`

Store Drizzle table definitions here.

Prefer one file per primary table/domain when the schema grows.

Example:

```text
schema/
├── users.ts
├── roles.ts
├── products.ts
├── orders.ts
├── order-items.ts
└── index.ts
```

Database naming:

```text
Tables       → snake_case
Columns      → snake_case
Foreign keys → snake_case
```

Application naming:

```text
Variables          → camelCase
Zod properties     → camelCase
JSON fields        → camelCase
Drizzle TS fields  → camelCase
```

Example:

```ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull(),
});
```

---

# Shared

Application-wide reusable code belongs under:

```text
shared/
├── errors/
├── schemas/
├── constants/
└── utils/
```

Only move code into `shared/` when it is actually reused across domains.

Do not move domain-specific logic into `shared/` because it might theoretically be reused later.

---

# Hooks

Use:

```text
src/hooks/
```

for reusable Fastify lifecycle hooks when they are not better represented as plugins.

Examples:

- request context
- audit behavior
- reusable lifecycle processing

Do not place business logic in hooks.

---

# Tests

Use:

```text
tests/
├── unit/
├── integration/
└── helpers/
```

## Unit

Test services and isolated business behavior.

## Integration

Test Fastify endpoints, validation, authentication, database behavior, and response contracts.

Prefer Fastify's injection API.

## Helpers

Use for:

- fixtures
- factories
- database setup
- test authentication
- reusable test utilities

Testing data must not persist in the normal application database.

---

# Module & File Ownership Rules

## Domain Isolation
- Each domain under `src/modules/<domain>/` strictly owns its business logic, validation schemas, and persistence operations.
- **No Cross-Module Database Queries**: A module must never import another module's repository or query tables outside its domain ownership.
- **Cross-Domain Communication**: If Module A needs data or actions from Module B, it must call Module B's public service via Module B's `index.ts`.

## Dependency Hierarchy & Import Matrix

The dependency flow is strictly unidirectional:

$$\text{Routes} \longrightarrow \text{Service} \longrightarrow \text{Repository} \longrightarrow \text{Database Schema}$$

| File / Layer | Owns | Permitted to Import | Prohibited from Importing |
|---|---|---|---|
| **`<domain>.routes.ts`** | HTTP request/reply lifecycle, route schemas, route hooks | `<domain>.services.ts`, `<domain>.schemas.ts`, `shared/` | Direct database / `<domain>.repositories.ts`, other domain routes |
| **`<domain>.services.ts`** | Business logic, domain rules, transactions, orchestration | `<domain>.repositories.ts`, `<domain>.schemas.ts`, other domain public services (`index.ts`), `shared/` | Fastify `request` / `reply` objects, HTTP response builders |
| **`<domain>.repositories.ts`** | Drizzle ORM queries, database filters, persistence | `src/database/schema/`, `src/database/index.ts`, `shared/` | Fastify request/reply, HTTP status codes, user-facing error strings |
| **`<domain>.schemas.ts`** | Zod input/output schemas & inferred TypeScript types | Zod, `shared/schemas/` | Services, repositories, routes, database instances |
| **`index.ts`** | Public interface of the domain module | `<domain>.routes.ts`, exported `<domain>.services.ts` functions | Private module helpers or internal repositories |
| **`src/database/schema/`** | Database table definitions (`pgTable`) & relations | `drizzle-orm/pg-core` | Any file inside `src/modules/` |
| **`src/shared/`** | Generic utilities, standard error classes, constants | Third-party utils | Domain-specific logic from `src/modules/` |

---

# Mandatory Structure Rules

The following rules must be followed:

- All domain-specific code belongs under `src/modules/<domain>/`.
- Each module uses domain-prefixed filenames: `<domain>.routes.ts`, `<domain>.services.ts`, `<domain>.repositories.ts`, `<domain>.schemas.ts`, and `index.ts`.
- Cross-module communication must only happen through public module services exported via `index.ts`.
- Never import or query another module's repository or database tables directly.
- Do not create global domain-specific route/service/repository directories.
- Do not create `controller.ts` by default.
- Do not create `types.ts` for Zod or Drizzle inferred types.
- Route handlers must remain thin and must not directly query the database.
- Business logic belongs in `<domain>.services.ts`.
- Persistence logic belongs in `<domain>.repositories.ts` when a repository abstraction is useful.
- Zod schemas belong in `<domain>.schemas.ts` and are the source of truth for API contracts.
- Infer TypeScript types from Zod or Drizzle wherever possible.
- Fastify integrations belong in `plugins/`.
- Database infrastructure belongs in `database/`.
- Environment configuration belongs in `config/`.
- Shared code belongs in `shared/` only when genuinely shared.
- Do not create empty architectural files merely to match the template.