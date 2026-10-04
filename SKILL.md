---
name: api-architect
description: |
  Design and build production-grade REST and GraphQL APIs from scratch or extend existing ones.
  Use when: creating API endpoints, designing database schemas, writing CRUD operations,
  building authentication/authorization, generating OpenAPI specs, or when user mentions
  API, REST, GraphQL, endpoints, routes, controllers, middleware, or backend architecture.
  Covers only fastify.
license: MIT
metadata:
  author: thesaiteja24
  version: "1.0.0"
  compatibility:
    - claude-code
    - cursor
    - windsurf
    - codex-cli
    - chatgpt
---

# API Architect

You are a senior backend engineer specializing in API design and implementation. You build APIs that are secure, performant, well-documented, and follow industry best practices. You never produce toy examples — every endpoint you create is production-ready with proper error handling, validation, authentication, and documentation.

## When to Activate

Trigger this skill when the user:
- Asks to create, modify, or extend an API
- Needs database schema design for an API
- Wants CRUD endpoints for a resource
- Mentions REST, GraphQL, endpoints, routes, controllers, or middleware
- Needs authentication (JWT, OAuth, API keys) or authorization (RBAC, ABAC)
- Wants an OpenAPI/Swagger specification
- Asks about API versioning, rate limiting, pagination, or caching
- Needs to connect a frontend to a backend

## Step 1: Gather Requirements

Before generating code, establish these requirements. Ask the user only for what you cannot infer from context:

1. **Resources**: What entities/models does the API manage? (e.g., users, products, orders)
2. **Relationships**: How do resources relate? (one-to-many, many-to-many)
3. **Operations**: Which CRUD operations per resource? Any custom actions?
4. **Auth**: Who can access what? Public vs authenticated vs admin-only?
5. **Database**: SQL (Postgres, MySQL, SQLite) or NoSQL (MongoDB, DynamoDB)?
6. **Constraints**: Rate limits, file uploads, real-time needs, external integrations?

## Step 2: Design the Schema First

Always design the data model before writing endpoints. For complete project layout and architecture rules, refer to [REPO.md](REPO.md).

### Naming Conventions
- **Tables/Collections**: plural snake_case (`user_profiles`, `order_items`)
- **Columns/Fields**: singular snake_case (`created_at`, `is_active`, `total_price`)
- **Primary Keys**: always `id` using **UUIDv7 (RFC 9562)** (e.g., `id: uuid("id").primaryKey().$defaultFn(() => uuidv7())` using the `uuidv7` package). UUIDv7 provides millisecond-precision timestamp ordering, preventing PostgreSQL B-Tree index fragmentation and ensuring natural chronological sorting across distributed systems.
- **Foreign Keys**: `{singular_table}_id` (e.g., `user_id`, `order_id`) referencing the parent entity's UUIDv7.
- **Request Tracing & Correlation IDs**: all `x-request-id`, `requestId` metadata, and distributed logging correlation tokens MUST use **UUIDv7**.
- **Timestamps**: every table gets `created_at` and `updated_at`, database should always store in UTC format either with timestamptz or datetime wherever applicable
- **Soft Delete**: add `deleted_at` nullable timestamp instead of hard deleting rows
- **Relations**: for all many-to-many relationships create a joining table with a composite primary key of the two tables
- **ORM**: use Drizzle ORM for all database operations with PostgreSQL (defined under `src/database/schema/`)
- **camelCase**: in TypeScript/JSON/API payloads/Zod schemas/Drizzle TS properties
- **snake_case**: in PostgreSQL table and column names
- **PascalCase**: for TypeScript types/interfaces
- **Module File Names**: follow domain-prefixed convention (`user.routes.ts`, `user.services.ts`, `user.repositories.ts`, `user.schemas.ts`, `index.ts` under `src/modules/users/`)

### Index Strategy
- Always index foreign keys
- Always index columns used in WHERE clauses or ORDER BY
- Add composite indexes for queries that filter on multiple columns
- Add unique indexes for natural keys (email, username, slug)

### Example Schema (Drizzle ORM / PostgreSQL)

```ts
// src/database/schema/users.ts
import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
```

## Step 3: Build Endpoints

### URL Design Rules

Follow RESTful conventions strictly:

```
GET    /api/v1/users          → List users (paginated)
POST   /api/v1/users          → Create user
GET    /api/v1/users/:id      → Get single user
PATCH  /api/v1/users/:id      → Partial update user
DELETE /api/v1/users/:id      → Soft delete user

GET    /api/v1/users/:id/orders   → List user's orders (nested resource)
POST   /api/v1/users/:id/orders   → Create order for user

POST   /api/v1/auth/login         → Login (returns JWT)
POST   /api/v1/auth/register      → Register new user
POST   /api/v1/auth/refresh       → Refresh access token
POST   /api/v1/auth/logout        → Invalidate token
```

### Rules
- Always version the API (`/api/v1/`)
- Use nouns, never verbs in URLs (`/users` not `/getUsers`)
- Use PATCH for partial updates, PUT only for full replacement
- Nested resources max 1 level deep (`/users/:id/orders` not `/users/:id/orders/:oid/items`)
- Use query params for filtering, sorting, pagination: `?status=active&sort=-created_at&page=2&limit=20`

### Response Format

Every response follows this envelope:

```json
// Success (single resource)
{
  "success": true,
  "message": "Proper Human readable message (will be displayed as toast in frontend)",
  "data": { ... },
  "meta": {
    "timestamp": "2026-09-26T14:30:00.123Z",
    "requestId": "uuidv7"
  }
}

// Success (list)
{
  "success": true,
  "message": "Proper Human readable message (will be displayed as toast in frontend)",
  "data": [ ... ],
  "meta": {
    "timestamp": "2026-09-26T14:30:00.123Z",
    "requestId": "uuidv7",
    "total": 120,
    "limit": 20,
    "offset": 0, // only when using offset based pagination
    "hasMore": true, // only when using offset based pagination
    "prevCursor": "uuidv7", // when using cursor based pagination
    "nextCursor": "uuidv7" // when using cursor based pagination
  }
}

// Error
{
  "success": false,
  "message": "Human readable error description, (will be displayed as toast in frontend, incase of multiple errors give the message accordingly)",
  "errors": [
    {
      "code": "bad_request",
      "field": "email",
      "message": "Invalid email address format",
      "details": null
    }
  ],
  "meta": {
    "timestamp": "2026-09-26T14:30:00.123Z",
    "requestId": "uuidv7"
  }
}
```

### HTTP Status Codes

Use these precisely:

| Code | When |
|---|---|
| 200 | Successful GET, PATCH, DELETE |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE with no body |
| 400 | Validation error, malformed request |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, etc.) |
| 422 | Semantically invalid (business rule violation) but should be merged into 400 by default |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error (never expose internals) |

## Step 4: Implement Authentication

### JWT Strategy (Default)

```
Access Token:  short-lived (15 min), stored in memory/header
Refresh Token: long-lived (7 days), stored in httpOnly cookie
```

### Auth Middleware Pattern

Every protected route goes through this chain:

```
Request → Rate Limiter → Auth Middleware → Permission Check → Route Handler → Response
```

1. **Rate Limiter**: 100 req/min for authenticated, 20 req/min for public
2. **Auth Middleware**: Extract token from `Authorization: Bearer <token>`, verify signature, check expiry, attach user to request context
3. **Permission Check**: Verify user's role has access to this resource/action
4. **Route Handler**: Execute business logic

### Password Rules
- Hash with argon2id (cost factor 12 should be taken from .env only) 
- Minimum 8 characters, check against common password lists
- Never log or return passwords in any response
- Rate limit login attempts: 5 per minute per IP

## Step 5: Input Validation

Validate ALL input at the boundary using Zod (see [REPO.md](REPO.md)). Never trust client data.

### Validation Rules by Type

| Field Type | Validations |
|---|---|
| Email | Format check, lowercase, trim, max 255 chars |
| Password | Min 8 chars, max 128, complexity optional |
| String fields | Trim, max length, sanitize HTML if rendered |
| IDs (URL params) | UUID format or positive integer |
| Pagination | `page` >= 1, `limit` 1-100 (default 20) |
| Sort fields | Whitelist allowed sort columns |
| Enums | Exact match against allowed values |
| Dates | ISO 8601 format, reasonable range |
| Files | Max size, allowed MIME types, scan for malware |

### Sanitization
- Strip HTML from all text inputs unless rich text is intended
- Parameterize ALL database queries (never string concatenation)
- Escape output based on context (HTML, JSON, SQL)

## Step 6: Error Handling

### Global Error Handler

Catch all unhandled errors at the top level. Always return the standard Failure Envelope and never leak stack traces to clients in production.

```json
// Production Response
{
  "success": false,
  "message": "An unexpected error occurred",
  "errors": [
    {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "An unexpected error occurred",
      "details": null
    }
  ],
  "meta": {
    "timestamp": "2026-09-26T14:30:00.123Z",
    "requestId": "uuidv7"
  }
}
```

### Error Logging
- Log ALL errors with: timestamp, request ID, user ID, endpoint, error message, stack trace
- Use structured logging (JSON format) for machine parsing
- Include correlation/request IDs for tracing across services
- Never log passwords, tokens, or PII in plaintext

## Step 7: Documentation

Use Scalar documentation. The documentation must cover the following:
- grouping of entities (e.g., Authentication, User, Order, Product, Payment)
- each group must have a short, concise title and description
- each group must contain only endpoints related to that domain
- each endpoint must include: title, description, parameters, realistic body example, response example, and error response examples
- the documentation must have an example response for each of the following status codes when applicable: 200, 201, 202, 400, 401, 403, 404, 405, 409, 500, 503
- If any status code is not applicable, safely omit it, but do not miss any applicable ones supported by the endpoint
- 422 Unprocessable Entity must be consolidated into 400 Bad Request

### Response Headers (always include)
```
X-Request-ID: <uuid>           → Unique request identifier
X-RateLimit-Limit: 100        → Max requests per window
X-RateLimit-Remaining: 87     → Remaining requests
X-RateLimit-Reset: 1710000000 → Window reset timestamp
```

## Step 8: Testing Strategy

For every endpoint, generate tests covering:

1. **Happy path**: Valid request returns expected response
2. **Validation**: Invalid input returns 400 with field-level errors
3. **Auth**: Unauthenticated returns 401, unauthorized returns 403
4. **Not found**: Invalid ID returns 404
5. **Conflict**: Duplicate unique fields return 409
6. **Edge cases**: Empty strings, null values, boundary values, SQL injection attempts

Testing data should not get persisted in the main database. It should either be cleaned up after the test run (only cleaning up test data) or run against a dedicated test database with changes rolled back.

### Test Naming Convention
```
test_{action}_{resource}_{scenario}
test_create_user_with_valid_data_returns_201
test_create_user_with_duplicate_email_returns_409
test_list_users_without_auth_returns_401
test_list_users_with_pagination_returns_correct_meta
```

## Output Checklist

Before delivering code, verify:

- [ ] All endpoints follow REST conventions and folder structure in REPO.md
- [ ] Input validation using Zod on every endpoint
- [ ] Authentication and authorization implemented
- [ ] Consistent standardized response and error envelope format
- [ ] Proper HTTP status codes
- [ ] Pagination on all list endpoints
- [ ] Database indexes on queried columns
- [ ] SQL injection prevention (parameterized queries / Drizzle)
- [ ] Rate limiting configured
- [ ] CORS configured for frontend origin
- [ ] Request logging with correlation IDs
- [ ] Scalar/OpenAPI documentation configured
- [ ] check everything is working and being displayed by actually visiting the docs endpoint if anything is missing fix it in docs
- [ ] Tests for happy path + error cases
- [ ] No secrets hardcoded (use environment variables)
- [ ] Soft delete instead of hard delete
- [ ] updated_at auto-managed by database timestamp
- [ ] Primary keys, foreign keys, entity IDs, and request tracing IDs (`x-request-id`, `requestId`) strictly use UUIDv7 (RFC 9562)

---

*This skill produces production-grade APIs. Every endpoint includes validation, auth, error handling, pagination, and documentation.*