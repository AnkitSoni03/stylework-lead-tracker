# Stylework Lead Tracker

A small full-stack app to capture sales leads and move them through a pipeline.

- **Live app:** https://stylework-lead-tracker.vercel.app
- **API:** https://stylework-lead-tracker-api.onrender.com/api/health (free tier: the first request after inactivity can take ~50s while the server wakes up)

[![CI](https://github.com/AnkitSoni03/stylework-lead-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/AnkitSoni03/stylework-lead-tracker/actions/workflows/ci.yml)

**Features:** create a lead · list leads (newest first, paginated) · search by name / email / phone · filter by status · update a lead's status inline · pipeline summary with per-status counts.

**UI:** a dashboard with clickable status cards, an add-lead modal, status pills, relative dates, skeleton loading, toast confirmations and a responsive layout that works down to phone width.

Each lead has **Name, Email, Phone, Status, Created At**. Status is one of `new`, `contacted`, `qualified`, `converted`, `lost`.

---

## Architecture

```
┌──────────────────────────┐   HTTPS / JSON   ┌───────────────────────────┐   Mongoose   ┌──────────────────┐
│  frontend/ (Vercel)      │ ───────────────▶ │  backend/ (Render)        │ ───────────▶ │  MongoDB Atlas   │
│  React 19 + TypeScript   │                  │  Node + Express 5 + TS    │              │  leads collection│
│  Vite, Tailwind CSS      │ ◀─────────────── │  Zod validation           │ ◀─────────── │                  │
└──────────────────────────┘                  └───────────────────────────┘              └──────────────────┘
```

The repo is a simple monorepo with two independent packages. Each one has its own `package.json`, dependencies and tests.

### Backend (`backend/`)

| Path | Responsibility |
|---|---|
| `src/index.ts` | Entry point: connects to MongoDB, then starts the HTTP server |
| `src/app.ts` | `createApp()` factory: CORS, JSON parsing, routes, error handling. Has no DB side effects, so tests can import it directly |
| `src/config.ts` | Reads and validates environment variables |
| `src/models/lead.ts` | Mongoose schema: unique email, status enum, `timestamps` for `createdAt`, indexes |
| `src/schemas/lead.ts` | Zod schemas for request bodies and query params |
| `src/routes/leads.ts` | Lead endpoints |
| `src/middleware/errors.ts` | Maps errors to consistent JSON responses (400 / 404 / 409 / 500) |

#### REST API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/leads?search=&status=&page=1&limit=20` | List leads, newest first. `search` does a case-insensitive match on name, email or phone |
| `GET` | `/api/leads/stats` | Pipeline counts: `{ total, byStatus: { new, contacted, qualified, converted, lost } }` |
| `POST` | `/api/leads` | Create a lead. Body: `{ name, email, phone, status? }` |
| `PATCH` | `/api/leads/:id/status` | Update status. Body: `{ status }` |

List response shape: `{ data: Lead[], total, page, limit }`.
Error response shape: `{ error: string, details?: { field, message }[] }`.

| Status | When |
|---|---|
| `400` | Validation failed, malformed JSON or an invalid id |
| `404` | Lead or route not found |
| `409` | A lead with that email already exists |

### Frontend (`frontend/`)

| Path | Responsibility |
|---|---|
| `src/api.ts` | Typed `fetch` client. Turns failures into `ApiError`, including field-level details |
| `src/App.tsx` | Page state: query, pagination, loading/error, optimistic status updates |
| `src/components/` | `StatsCards`, `LeadFilters`, `LeadTable`, `LeadForm` (inside `Modal`), `Pagination`, `Toasts` |
| `src/lib/` | Status colours, relative-date and avatar formatting helpers |
| `src/validation.ts` | Client-side validation that mirrors the backend rules |
| `src/hooks/useDebouncedValue.ts` | Debounces search input (300 ms) |

---

## Local setup

**Prerequisites:** Node.js 20+ and a MongoDB connection string (a free MongoDB Atlas cluster, or a local `mongod`).

```bash
git clone https://github.com/AnkitSoni03/stylework-lead-tracker.git
cd stylework-lead-tracker
```

### 1. Backend

```bash
cd backend
cp .env.example .env      # then set MONGODB_URI
npm install
npm run dev               # http://localhost:4000
npm run seed              # optional: insert 12 demo leads (safe to re-run)
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (required) |
| `PORT` | Port to listen on (default `4000`) |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins. If empty, any origin is allowed |

> **Tip:** If `mongodb+srv://` connections hang locally with a DNS `ETIMEOUT`, your network's DNS is blocking SRV lookups from Node. Use the standard `mongodb://host1,host2,host3/...?replicaSet=...` connection string from Atlas instead. Atlas shows it under *Connect → Drivers* for older driver versions.

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:4000
npm install
npm run dev               # http://localhost:5173
```

### Tests

```bash
cd backend  && npm test   # 20 API integration tests (Vitest + Supertest + in-memory MongoDB)
cd frontend && npm test   # 19 component/integration/unit tests (Vitest + React Testing Library)
```

Backend tests use `mongodb-memory-server`, so they never touch a real database. The first run downloads a MongoDB binary. Frontend tests stub `fetch`, so they don't need the backend running.

Other checks: `npm run typecheck` (both packages), `npm run lint` (frontend), `npm run build` (both).

**CI:** GitHub Actions (`.github/workflows/ci.yml`) runs all of these for both packages on every push to `main` and on every pull request.

---

## Deployment

### Backend → Render

1. Push the repo to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. Render reads `render.yaml`, which sets `rootDir: backend`, `npm ci --include=dev && npm run build`, `npm start` and health check `/api/health`.
3. Set the secret env vars when prompted:
   - `MONGODB_URI`: the Atlas `mongodb+srv://…` string
   - `CORS_ORIGIN`: the Vercel URL, e.g. `https://stylework-lead-tracker.vercel.app`
4. In MongoDB Atlas → *Network Access*, allow Render to connect. On the free tier Render has no static IP, so this means `0.0.0.0/0`.

### Frontend → Vercel

1. Import the GitHub repo in Vercel and set **Root Directory** to `frontend`. Vercel auto-detects Vite (build `npm run build`, output `dist`).
2. Add the env var `VITE_API_URL` set to the Render URL, e.g. `https://stylework-lead-tracker-api.onrender.com`. It is baked into the bundle at build time, so redeploy after changing it.
3. Deploy. Pushes to `main` redeploy on Render, and on Vercel too once the Git integration is connected.

   Or use the CLI from the **repo root**, since the project's Root Directory is `frontend`:
   ```bash
   npx vercel link --project stylework-lead-tracker
   npx vercel env add VITE_API_URL production
   npx vercel deploy --prod
   ```

After both are up, set the Render `CORS_ORIGIN` to the final Vercel domain.

---

## Trade-offs

- **MongoDB over PostgreSQL.** Leads are a single flat entity with no relations, so a document store is enough, and Atlas's free tier is quick to provision. The cost is that constraints live in two places, Mongoose and Zod. With Postgres, the schema and migrations would be the single source of truth.
- **Regex search instead of a text or Atlas Search index.** Case-insensitive substring matching on name, email and phone is simple and supports partial matches such as a phone fragment. It can't use indexes efficiently, though, so it scans the collection. That's fine at this scale but won't hold up at hundreds of thousands of leads.
- **Offset pagination (`skip`/`limit`).** It's simple and supports "page N of M". Cursor-based pagination would be faster and more stable on large, frequently changing data.
- **No authentication.** The assignment doesn't require it. As deployed, anyone with the URL can read and create leads. Adding auth would be the first production step.
- **Types duplicated across frontend and backend** instead of a shared package. This keeps the two deployable packages independent and avoids workspace tooling. The API contract is small and covered by tests on both sides.
- **Optimistic status updates.** The UI feels instant, and failures roll back with an error message. The trade-off is slightly more client-side state logic.
- **Free-tier hosting.** Render's free instance sleeps after about 15 minutes of inactivity, so the first request after a pause takes around 30–50 seconds while it wakes up.
- **No global state library.** A single page with local `useState` doesn't need Redux or React Query.

## Future improvements

- Authentication and per-user or per-team lead ownership
- Edit and delete leads, plus notes and an activity history per lead
- MongoDB Atlas Search or a text index for scalable, typo-tolerant search
- Cursor pagination, sortable columns, and CSV import/export
- React Query for caching, retries and background refetching
- A shared API contract, e.g. generating the client from an OpenAPI spec
- End-to-end tests (Playwright) running in CI against a preview deployment
- Rate limiting, request logging and error monitoring (e.g. Sentry)

---

See [AGENT.md](./AGENT.md) for how AI tools were used to build this project.
