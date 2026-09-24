# Stylework Lead Tracker

[![CI](https://github.com/AnkitSoni03/stylework-lead-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/AnkitSoni03/stylework-lead-tracker/actions/workflows/ci.yml)

A full-stack lead management application for capturing sales leads and tracking them through a pipeline. Built with **React + TypeScript**, **Node.js + Express**, and **MongoDB**.

| | |
|---|---|
| **Live application** | https://stylework-lead-tracker.vercel.app |
| **API base URL** | https://stylework-lead-tracker-api.onrender.com |
| **Health check** | https://stylework-lead-tracker-api.onrender.com/api/health |

> **Note:** The API runs on Render's free tier, which spins down after ~15 minutes of inactivity. The first request after an idle period may take up to ~50 seconds; subsequent requests are fast.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Continuous Integration](#continuous-integration)
- [Deployment](#deployment)
- [Trade-offs](#trade-offs)
- [Future Improvements](#future-improvements)
- [AI Usage](#ai-usage)

---

## Features

### Core requirements

| Requirement | Implementation |
|---|---|
| **Create lead** | Modal form with client-side validation, server-side validation, and field-level error messages. Duplicate emails are rejected with `409 Conflict`. |
| **Update lead status** | Inline status dropdown on each row. Updates are applied optimistically and rolled back automatically if the request fails. |
| **Search leads** | Debounced (300 ms), case-insensitive search across name, email, and phone. |
| **List leads** | Sorted newest first, paginated (10 per page), with loading, empty, and error states. |

**Lead fields:** Name, Email, Phone, Status, Created At.
**Statuses:** `new` → `contacted` → `qualified` → `converted` / `lost`.

### Additional features

- **Pipeline dashboard.** Summary cards show the lead count for each status and double as one-click filters.
- **Status filter** that combines with search.
- **Accessible UI.** Labelled form controls, keyboard support (Escape closes the modal), focus management, and ARIA live regions for notifications.
- **Responsive layout** from desktop down to 390 px mobile. On small screens the modal becomes a bottom sheet.
- **Toast notifications** confirm create and update actions.
- **Seed script** (`npm run seed`) for demo data. It is idempotent and safe to re-run.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19, TypeScript, Vite | Required by the brief. Vite gives fast dev startup and optimized builds. |
| Styling | Tailwind CSS v4, lucide-react icons | Consistent design without writing or maintaining custom CSS. |
| Backend | Node.js, Express 5, TypeScript | Same language across the stack. Express 5 forwards async errors to the error middleware natively. |
| Validation | Zod | One declarative schema per request gives both runtime validation and static TypeScript types. |
| Database | MongoDB Atlas, Mongoose 9 | Leads are a single flat entity, which fits a document model. Managed free tier. |
| Testing | Vitest, Supertest, mongodb-memory-server, React Testing Library | Fast, hermetic tests with a real database engine and no external dependencies. |
| CI | GitHub Actions | Lint, typecheck, test, and build on every push and pull request. |
| Hosting | Vercel (frontend), Render (backend) | Free tiers with Git-based deployments. |

---

## Architecture

```
┌──────────────────────────┐   HTTPS / JSON    ┌───────────────────────────┐   Mongoose   ┌───────────────────┐
│  Frontend  (Vercel)      │ ────────────────▶ │  Backend API  (Render)    │ ───────────▶ │  MongoDB Atlas    │
│  React 19 + TypeScript   │                   │  Express 5 + TypeScript   │              │  `leads`          │
│  Vite · Tailwind CSS     │ ◀──────────────── │  Zod validation           │ ◀─────────── │  collection       │
└──────────────────────────┘                   └───────────────────────────┘              └───────────────────┘
```

The repository is a monorepo with two **independent packages**, `frontend/` and `backend/`. Each has its own dependencies, scripts, tests, and deployment target. They share only the HTTP contract documented in the [API reference](#api-reference).

**Request flow:**

1. The frontend calls the REST API through a typed `fetch` client (`src/api.ts`).
2. Express validates the request with Zod. Invalid input returns `400` with per-field error details.
3. Mongoose persists to MongoDB. The unique index on `email` is the final guard against duplicates, including under concurrent requests.
4. A central error middleware maps every failure to a consistent JSON shape and status code.

---

## Project Structure

```
stylework-lead-tracker/
├── .github/workflows/ci.yml     # CI pipeline (backend + frontend jobs)
├── render.yaml                  # Render Blueprint (backend infrastructure as code)
├── backend/
│   ├── src/
│   │   ├── index.ts             # Entry point: connect to MongoDB, start HTTP server
│   │   ├── app.ts               # createApp() factory: middleware, routes, error handling
│   │   ├── config.ts            # Environment variable loading and validation
│   │   ├── seed.ts              # Idempotent demo-data seeder
│   │   ├── models/lead.ts       # Mongoose schema, status enum, indexes
│   │   ├── schemas/lead.ts      # Zod request/query schemas
│   │   ├── routes/leads.ts      # Lead endpoints
│   │   └── middleware/errors.ts # Centralized error → HTTP response mapping
│   └── tests/leads.test.ts      # API integration tests
└── frontend/
    └── src/
        ├── App.tsx              # Page state: query, pagination, optimistic updates
        ├── api.ts               # Typed API client with ApiError
        ├── types.ts             # Shared domain types
        ├── validation.ts        # Client-side validation (mirrors backend rules)
        ├── components/          # StatsCards, LeadTable, LeadForm, Modal, LeadFilters, Pagination, Toasts
        ├── hooks/               # useDebouncedValue
        ├── lib/                 # Formatting and status styling helpers
        └── test/                # Test setup and utilities
```

---

## API Reference

Base URL: `https://stylework-lead-tracker-api.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/leads` | List leads (search, filter, paginate) |
| `GET` | `/api/leads/stats` | Lead counts per status |
| `POST` | `/api/leads` | Create a lead |
| `PATCH` | `/api/leads/:id/status` | Update a lead's status |

### `GET /api/leads`

| Query param | Type | Default | Description |
|---|---|---|---|
| `search` | string | — | Case-insensitive match on name, email, or phone |
| `status` | enum | — | One of `new`, `contacted`, `qualified`, `converted`, `lost` |
| `page` | integer ≥ 1 | `1` | Page number |
| `limit` | integer 1–100 | `20` | Page size |

```bash
curl "https://stylework-lead-tracker-api.onrender.com/api/leads?search=sharma&status=new&limit=5"
```

```json
{
  "data": [
    {
      "id": "6ab5...",
      "name": "Aarav Sharma",
      "email": "aarav.sharma@example.com",
      "phone": "+91 98100 11001",
      "status": "new",
      "createdAt": "2026-09-24T19:30:00.000Z",
      "updatedAt": "2026-09-24T19:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 5
}
```

### `POST /api/leads`

```bash
curl -X POST https://stylework-lead-tracker-api.onrender.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Priya Sharma","email":"priya@example.com","phone":"+91 98765 43210"}'
```

Returns `201 Created` with the new lead. `status` is optional and defaults to `new`. Emails are trimmed and lowercased before storage.

### `PATCH /api/leads/:id/status`

```bash
curl -X PATCH https://stylework-lead-tracker-api.onrender.com/api/leads/<id>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"qualified"}'
```

### `GET /api/leads/stats`

```json
{ "total": 12, "byStatus": { "new": 3, "contacted": 3, "qualified": 2, "converted": 2, "lost": 2 } }
```

### Errors

All errors use this shape:

```json
{ "error": "Validation failed", "details": [{ "field": "email", "message": "Invalid email address" }] }
```

| Status | Meaning |
|---|---|
| `400 Bad Request` | Validation failure, malformed JSON, or an invalid id |
| `404 Not Found` | Lead or route does not exist |
| `409 Conflict` | A lead with this email already exists |
| `500 Internal Server Error` | Unexpected error (logged server-side; details are not exposed) |

---

## Getting Started

### Prerequisites

- Node.js **20+** and npm
- A MongoDB connection string: a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or a local `mongod`

### 1. Clone

```bash
git clone https://github.com/AnkitSoni03/stylework-lead-tracker.git
cd stylework-lead-tracker
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # set MONGODB_URI
npm install
npm run dev             # http://localhost:4000
npm run seed            # optional: insert 12 demo leads
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `PORT` | No | `4000` | HTTP port |
| `CORS_ORIGIN` | No | *(allow all)* | Comma-separated list of allowed frontend origins |

### 3. Frontend

```bash
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:4000
npm install
npm run dev             # http://localhost:5173
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL, with no trailing slash. Baked in at build time. |

### Available scripts

| Package | Script | Purpose |
|---|---|---|
| backend | `dev` / `build` / `start` | Watch mode / compile to `dist/` / run the compiled server |
| backend | `test` / `typecheck` / `seed` | Tests / `tsc --noEmit` / insert demo data |
| frontend | `dev` / `build` / `preview` | Dev server / production build / preview the build |
| frontend | `test` / `typecheck` / `lint` | Tests / `tsc -b` / oxlint |

### Troubleshooting

**`mongodb+srv://` connection hangs with `ETIMEOUT` locally.** Some networks block DNS SRV lookups made by Node.js. Use the equivalent standard connection string instead (`mongodb://host1,host2,host3/<db>?replicaSet=...&tls=true&authSource=admin`). Atlas provides it under *Connect → Drivers*.

---

## Testing

**39 automated tests** cover both packages.

```bash
cd backend  && npm test    # 20 tests
cd frontend && npm test    # 19 tests
```

### Backend: API integration tests (Vitest + Supertest)

These run against a real MongoDB engine in memory (`mongodb-memory-server`), so indexes, the unique email constraint, and query behaviour are exercised exactly as in production, with no external database.

| Area | Covered cases |
|---|---|
| Create | Defaults (`status: new`, `createdAt`), trimming and email normalization, field-level validation errors, invalid status, duplicate email → `409`, malformed JSON → `400` |
| List / search | Newest-first ordering, search by name, email, and phone, regex characters treated literally, status filter, pagination, invalid query params |
| Update status | Successful update, invalid status, missing lead → `404`, malformed id → `400` |
| Stats | Zero-filled counts, per-status aggregation |
| Misc | Health check, unknown route → `404` |

### Frontend: component and integration tests (Vitest + React Testing Library)

`fetch` is stubbed, so these tests exercise real components and user interactions without a backend.

| Area | Covered cases |
|---|---|
| Lead form | Client validation blocks invalid submits, successful submit resets the form, duplicate-email error, server field errors mapped to inputs |
| App | Loading and listing, empty state, network error, search and filter query params, status update via `PATCH` with toast, optimistic rollback on failure, create-and-refresh flow, stats-card filtering, modal focus and Escape |
| Utilities | Validation rules, relative time, initials, avatar colours |

---

## Continuous Integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to `main` and on every pull request. It has two parallel jobs:

| Job | Steps |
|---|---|
| **Backend** | `npm ci` → typecheck → tests → build |
| **Frontend** | `npm ci` → lint → typecheck → tests → build |

npm dependencies and the MongoDB test binary are cached between runs.

---

## Deployment

The backend and frontend deploy separately.

### Backend on Render

The service is defined as code in [`render.yaml`](render.yaml): root directory `backend`, build command `npm ci --include=dev && npm run build`, start command `npm start`, and health check path `/api/health`.

1. In the Render dashboard, choose **New → Blueprint** and select this repository.
2. Provide the secret environment variables:
   - `MONGODB_URI`: the Atlas connection string
   - `CORS_ORIGIN`: the frontend origin, `https://stylework-lead-tracker.vercel.app`
3. In MongoDB Atlas, under **Network Access**, allow connections from Render. Free-tier Render services have no static IP, so this means `0.0.0.0/0`. Access is still protected by database credentials.
4. Every push to `main` triggers an automatic redeploy.

### Frontend on Vercel

1. Import the repository into Vercel and set **Root Directory** to `frontend`. The Vite preset is detected automatically (build: `npm run build`, output: `dist`).
2. Set the environment variable `VITE_API_URL` to `https://stylework-lead-tracker-api.onrender.com`.
3. Deploy. Because `VITE_API_URL` is embedded at build time, redeploy whenever it changes.

To deploy from the CLI, run these from the **repository root**, since the project's root directory is already set to `frontend`:

```bash
npx vercel link --project stylework-lead-tracker
npx vercel env add VITE_API_URL production
npx vercel deploy --prod
```

---

## Trade-offs

| Decision | Benefit | Cost |
|---|---|---|
| **MongoDB over PostgreSQL** | A single flat entity with no relations fits a document model. Quick, free managed hosting. | Constraints live in both the Mongoose and Zod schemas instead of a single SQL schema with migrations. |
| **Regex search** instead of a text or Atlas Search index | Supports partial, case-insensitive matches such as a phone fragment. Simple to implement. | Cannot use an index efficiently, so it scans the collection. Fine at this scale, but not for hundreds of thousands of leads. |
| **Offset pagination** (`skip`/`limit`) | Simple, and supports "page N of M" navigation. | Slower on large collections, and results can shift when data changes between page loads. Cursor-based pagination would scale better. |
| **No authentication** | Stays within the assignment scope. | Anyone with the URL can read and create leads. This would be the first thing to add for production. |
| **Types duplicated** across frontend and backend | Packages stay independent, with no workspace tooling. | The contract can drift. This is mitigated by tests on both sides. |
| **Optimistic status updates** | The UI feels instant. | Needs rollback logic on failure (implemented and tested). |
| **No global state or data-fetching library** | A single page doesn't need Redux or React Query. Fewer dependencies. | Caching and retries are handled manually. This would be revisited as the app grows. |
| **Free-tier hosting** | Zero cost. | The backend has a cold start of up to ~50 s after inactivity. |

---

## Future Improvements

- **Authentication and authorization.** User accounts, lead ownership, and team-based access.
- **Full CRUD.** Edit and delete leads, plus notes and an activity timeline per lead.
- **Scalable search.** MongoDB Atlas Search for indexed, typo-tolerant full-text search.
- **Data at scale.** Cursor-based pagination, sortable columns, and CSV import/export.
- **Frontend data layer.** React Query for caching, background refetching, and retries.
- **Shared API contract.** An OpenAPI spec with a generated, type-safe client.
- **End-to-end tests.** Playwright tests running in CI against preview deployments.
- **Observability and hardening.** Structured logging, error monitoring (e.g. Sentry), rate limiting, and security headers (Helmet).

---

## AI Usage

This project was built with AI assistance, as the assignment encourages. [AGENT.md](AGENT.md) documents the tools and prompts used, which parts were AI-generated and which were human-owned, how the output was verified, and the key engineering decisions.
