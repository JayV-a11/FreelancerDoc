# FreelanceDoc

Professional proposal and contract generator for freelancers. A SaaS MVP built with a secure, layered architecture on Node.js + Next.js.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Running in Development](#running-in-development)
5. [Running Tests](#running-tests)
6. [Deploy](#deploy)
7. [Environment Variables](#environment-variables)
8. [RLS Policies](#rls-policies)
9. [Architecture Decisions](#architecture-decisions)

---

## Architecture

```
freelancedoc/
├── apps/
│   ├── api/                     # Fastify back-end (Node.js)
│   │   ├── src/
│   │   │   ├── modules/         # Feature modules (auth, user, template, document)
│   │   │   │   └── [module]/
│   │   │   │       ├── [module].controller.ts   # HTTP layer only
│   │   │   │       ├── [module].service.ts      # Business logic
│   │   │   │       ├── [module].repository.ts   # Data access only
│   │   │   │       ├── [module].schema.ts       # Zod schemas
│   │   │   │       ├── [module].routes.ts       # Route registration
│   │   │   │       └── [module].test.ts         # Unit + integration tests
│   │   │   ├── shared/
│   │   │   │   ├── config/      # Zod env validation (exits on invalid)
│   │   │   │   ├── errors/      # AppError + subclasses
│   │   │   │   ├── middlewares/ # authenticate hook
│   │   │   │   └── utils/       # hash, logger
│   │   │   ├── types/           # FastifyJWT type augmentation
│   │   │   ├── test/            # Global test setup
│   │   │   ├── app.ts           # Fastify instance + plugin registration
│   │   │   └── server.ts        # Entry point (listen)
│   │   ├── prisma/              # Prisma schema + migrations
│   │   └── tsup.config.ts       # Production bundler
│   │
│   └── web/                     # Next.js 14 front-end (App Router)
│       └── src/
│           ├── app/             # App Router pages
│           │   ├── (auth)/      # Login, Register
│           │   └── (dashboard)/ # Protected dashboard pages
│           ├── components/
│           │   ├── ui/          # shadcn/ui components
│           │   ├── layout/      # Layout components
│           │   └── providers/   # Context providers
│           ├── services/        # API call wrappers
│           ├── stores/          # Zustand stores
│           ├── i18n/            # Internationalisation (next-intl)
│           ├── types/           # TypeScript types
│           ├── lib/             # axios instance, utils, env validation
│           └── middleware.ts    # Next.js middleware (auth guard)
│
├── supabase/
│   ├── migrations/              # Versioned SQL migrations (table + RLS together)
│   ├── rls-policies.sql         # All RLS policies documented
│   └── seed.sql                 # Development seed data
│
├── render.yaml                  # Render deploy config (back-end)
└── vercel.json                  # Vercel deploy config (front-end + security headers)
```

### Layer Rules

| Layer      | Rule                                                         |
|------------|--------------------------------------------------------------|
| Controller | HTTP only — no DB access, no business logic                  |
| Service    | Business logic only — no req/res awareness                   |
| Repository | Data access only — no business rules                         |
| Schema     | Zod validation — every external input validated here         |

---

## Prerequisites

- **Node.js** >= 20 (use `.nvmrc`: `nvm use`)
- **npm** >= 10
- A [Supabase](https://supabase.com) project (free tier works)
- An SMTP provider (e.g., Resend, Mailgun, or local Mailhog for dev)

---

## Environment Setup

```bash
# 1. Clone and install all workspaces
git clone https://github.com/your-org/freelancedoc.git
cd freelancedoc
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env with your Supabase and SMTP credentials

# 3. Generate Prisma client
npm run db:generate --workspace=apps/api

# 4. Run database migrations (requires DIRECT_URL in .env)
npm run db:migrate:dev --workspace=apps/api

# 5. Seed development data (optional)
npm run db:seed --workspace=apps/api
```

---

## Running in Development

```bash
# API (http://localhost:3001)
npm run dev:api

# Web (http://localhost:3000)
npm run dev:web

# Swagger docs (development only)
open http://localhost:3001/docs
```

---

## Running Tests

```bash
# Unit + integration tests (all workspaces)
npm test

# With coverage report
npm run test:coverage

# Mutation testing (Stryker — score must be >= 60%)
npm run test:mutation

# Security tests — RLS isolation and auth boundary tests
# Requires TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_KEY in .env
npm run test:security

# Run everything in sequence
npm run test:all
```

### Coverage Thresholds

| Scope       | Minimum |
|-------------|---------|
| Services    | 90%     |
| Controllers | 80%     |
| Utils       | 100%    |
| Repositories| 80% (against test DB) |

### Mutation Score Threshold

Stryker is configured to **break the build** if the mutation score falls below **60%**.

---

## Deploy

### Back-end → Render

1. Push code to GitHub
2. Create a new **Web Service** in Render and connect your repo
3. Render will auto-detect `render.yaml`
4. Set all `sync: false` environment variables in the Render dashboard
5. Trigger a manual deploy

### Front-end → Vercel

1. Import the repo in Vercel
2. Set **Root Directory** to `apps/web`
3. Add `NEXT_PUBLIC_API_URL` pointing to your Render service URL
4. Deploy

### Database → Supabase

1. Create a Supabase project
2. Copy the connection strings to `.env` (`DATABASE_URL` = pooler port 6543, `DIRECT_URL` = direct port 5432)
3. Run `npm run db:migrate --workspace=apps/api` to apply all migrations (includes RLS policies)

---

## Environment Variables

### Back-end (Render)

| Variable              | Description                                              | Required |
|-----------------------|----------------------------------------------------------|----------|
| `NODE_ENV`            | `production`                                             | ✅       |
| `PORT`                | Server port (default: 3001)                              | ✅       |
| `DATABASE_URL`        | Supabase pooler URL (port 6543) — used at runtime        | ✅       |
| `DIRECT_URL`          | Supabase direct URL (port 5432) — used by migrations     | ✅       |
| `SUPABASE_URL`        | Supabase project URL                                     | ✅       |
| `SUPABASE_SERVICE_KEY`| Service role key — **server-side only, never expose**    | ✅       |
| `JWT_SECRET`          | ≥ 32 chars (256 bits). Generate: `openssl rand -base64 32` | ✅    |
| `JWT_REFRESH_SECRET`  | ≥ 32 chars, **different** from `JWT_SECRET`              | ✅       |
| `ALLOWED_ORIGIN`      | Vercel URL (no trailing slash) — strict CORS             | ✅       |
| `SMTP_HOST`           | SMTP server hostname                                     | ✅       |
| `SMTP_PORT`           | SMTP port (default: 587)                                 | ✅       |
| `SMTP_USER`           | SMTP username                                            | ✅       |
| `SMTP_PASS`           | SMTP password                                            | ✅       |
| `SMTP_FROM`           | Sender email address                                     | optional |

### Front-end (Vercel)

| Variable               | Description                           | Required |
|------------------------|---------------------------------------|----------|
| `NEXT_PUBLIC_API_URL`  | Render API URL (no trailing slash)    | ✅       |

> ⚠️ `NEXT_PUBLIC_` variables are embedded at build time and visible in the browser bundle. **Never place secrets here.**

### Test Environment

| Variable                    | Description                                    |
|-----------------------------|------------------------------------------------|
| `TEST_SUPABASE_URL`         | Isolated test project URL                      |
| `TEST_SUPABASE_SERVICE_KEY` | Service key for test project                   |
| `TEST_DATABASE_URL`         | Test project connection string                 |
| `TEST_JWT_SECRET`           | JWT secret for test tokens                     |

---

## RLS Policies

All tables have RLS enabled with **DENY ALL** as the default. Access is granted only through explicit policies using the principle of least privilege.

Full policy documentation: [`supabase/rls-policies.sql`](supabase/rls-policies.sql)

| Table              | SELECT | INSERT | UPDATE | DELETE |
|--------------------|--------|--------|--------|--------|
| `users`            | own    | service role only | own | ❌ blocked |
| `templates`        | own    | own (user_id forced by DEFAULT) | own | own |
| `documents`        | own    | own (user_id forced by DEFAULT) | own | ❌ blocked |
| `document_versions`| own (via join) | service role only | ❌ blocked | ❌ blocked |

---

## Architecture Decisions

### Why Fastify over Express?
Fastify is schema-first, faster (benchmarks show 2–3× throughput), and has built-in TypeScript support with no additional setup. Its plugin system with `decorators` and `hooks` enforces good architecture patterns naturally.

### Why argon2id for password hashing?
OWASP recommends argon2id as the first choice for password hashing (2024). It's memory-hard by design, making GPU-based brute-force attacks expensive. Configuration: 64 MiB memory, 3 iterations, 4 parallelism.

### Why httpOnly cookie for refresh token?
Storing tokens in `localStorage` exposes them to XSS attacks. An httpOnly cookie is inaccessible to JavaScript, so even a successful XSS attack cannot steal the refresh token. The access token lives only in memory (a JavaScript variable) and is lost on page reload — at which point the cookie silently refreshes it.

### Why Prisma over raw SQL?
Prisma provides type-safe queries that are always parameterized, eliminating SQL injection. Its migration system integrates directly with Supabase and ensures the schema stays in sync. The trade-off (no stored procedures) is acceptable for the MVP scope.

### Why Zod for env validation?
Environment variables are external inputs at the system boundary. Failing fast at startup with a clear error message (rather than a cryptic runtime error hours later) is a production best practice. Zod provides the type narrowing needed to use `env.PORT` as `number` throughout the codebase.

### Why tsup for the API build?
tsup bundles the TypeScript source into a single CJS file, resolves `@/` path aliases automatically, and tree-shakes dead code. The Prisma client is kept external (native binaries can't be bundled). The result is a predictable, fast-starting Node.js process on Render.
