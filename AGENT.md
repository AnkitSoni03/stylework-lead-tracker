# AGENT.md: AI-Assisted Development Log

This document records how AI tools were used to build the Stylework Lead Tracker, as the assignment requires. It covers the tools and workflow, the prompts given, which parts were AI-generated and which were human-owned, how AI output was verified, the issues found along the way, and the key engineering decisions.

---

## 1. AI Tools Used

| Tool | Model | Role |
|---|---|---|
| **Claude Code** (Anthropic's agentic CLI) | Claude Opus 5.5 | Primary development assistant. It analysed requirements, proposed the architecture, generated code, tests, configuration, and documentation, ran builds and tests, did browser-based QA, wrote git commits, and ran deployment commands. |

No other AI tools were used.

**Traceability.** Every commit produced with AI assistance carries a `Co-Authored-By: Claude` trailer, so the git history shows exactly where AI contributed.

---

## 2. Development Workflow

The project followed an iterative, human-directed loop:

1. **Requirements.** The AI summarized the assignment PDF, and I confirmed the scope.
2. **Design decisions.** The AI proposed a tech stack and project structure. I reviewed them, approved the stack, and set constraints (for example, separate `frontend/` and `backend/` packages).
3. **Incremental implementation.** Work was split into small, reviewable steps, each ending in a focused commit: backend scaffold → data model → endpoints → backend tests → frontend scaffold → API client → UI → frontend tests → deployment → CI → UI redesign.
4. **Verification at every step.** Every change was type-checked, linted, tested, and exercised manually before it was committed (see [Section 5](#5-verification-of-ai-output)).
5. **Human gates.** Actions with external or security impact stayed under my control: creating the public repository, entering credentials, changing database network access, and approving pushes and deployments.

---

## 3. Prompt Log

These are the main prompts, in chronological order. They were given conversationally and are paraphrased and condensed here, with the original intent kept.

| # | Prompt | Outcome |
|---|---|---|
| 1 | "I've added the assignment PDF. Read it and summarize briefly what needs to be built." | Summary of features, required stack, deliverables, and evaluation weights |
| 2 | "In your opinion, which tech stack would be best?" | Proposed stack with rationale: React + TS + Vite + Tailwind, Express + TS + Zod, MongoDB Atlas, Vitest, Render + Vercel. Approved by me. |
| 3 | "Can you deploy it directly? Just discuss for now, don't start building." | Deployment plan and access requirements (GitHub, Vercel, Render, Atlas) agreed before any code was written |
| 4 | "Check whether all the required tools are installed." | Verified git, Node.js, npm, GitHub CLI, and Vercel CLI, including authentication status |
| 5 | "Use this GitHub account and this email for commits." | Repository-scoped git identity configured, so the global config was left unchanged |
| 6 | "Here is the MongoDB connection string; use it." | Stored only in a git-ignored `.env`, never committed |
| 7 | "Create separate `frontend` and `backend` folders and keep their code separate." | Monorepo with two independent packages |
| 8 | "Make 8–10 meaningful commits, remember to push, and make sure the README and AGENT.md cover every requirement." | Small, focused commits following Conventional Commits. Documentation mapped to the evaluation criteria. |
| 9 | "Deploy it live on Vercel and Render." | Render Blueprint deployment and Vercel production deployment, verified end to end |
| 10 | "Can you add some dummy data?" | An idempotent `npm run seed` script instead of one-off manual inserts |
| 11 | "Add CI as well, and make the UI look professional." | GitHub Actions pipeline, `/api/leads/stats` endpoint, and a dashboard-style UI redesign with new tests |
| 12 | "Rewrite the markdown files the way a professional developer would, in English only." | This document and the README, rewritten |

---

## 4. Ownership: AI-Generated vs. Human-Owned

### AI-generated (reviewed and verified before committing)

| Area | Details |
|---|---|
| Backend code | Express app factory, configuration, Mongoose model, Zod schemas, lead routes, stats aggregation, centralized error middleware, seed script |
| Frontend code | Typed API client, domain types, validation, `App` state management, and all components (`StatsCards`, `LeadTable`, `LeadForm`, `Modal`, `LeadFilters`, `Pagination`, `Toasts`), plus hooks and formatting helpers |
| Tests | All 39 automated tests (20 backend, 19 frontend) |
| Infrastructure | `render.yaml`, GitHub Actions workflow, Vercel CLI deployment |
| Documentation | README.md and AGENT.md, based on my requirements, then reviewed by me |
| Commit messages | Conventional Commit messages for each change |

### Human-owned

| Area | Details |
|---|---|
| Requirements and scope | Interpreting the brief, approving the tech stack, and deciding the priority of deliverables (working product, commit history, documentation, deployment, testing) |
| Architectural constraints | Requiring separate, independently deployable `frontend/` and `backend/` packages |
| Feature direction | Asking for demo data, CI, and a professional UI redesign |
| Infrastructure ownership | Creating the MongoDB Atlas cluster and database user, and providing all accounts (GitHub, Vercel, Render) |
| Security-sensitive actions | Creating the public repository, entering `MONGODB_URI` into Render, configuring Atlas network access, and granting the GitHub `workflow` token scope. These were deliberately not delegated to the AI. |
| Review and approval | Reviewing results and approving each push and deployment |

No application code was written by hand. My contribution was direction, constraints, review, and control over external and security-sensitive actions. Any manual edits made after this point will be listed in this section.

---

## 5. Verification of AI Output

AI-generated code was never accepted without verification. Each change passed these checks before it was committed:

| Check | How |
|---|---|
| Static analysis | `tsc` typecheck for both packages, `oxlint` for the frontend, and a production build for both |
| Automated tests | 20/20 backend and 19/19 frontend tests, run locally and in GitHub Actions CI |
| API smoke tests | Real requests against the live MongoDB Atlas database: create, duplicate (`409`), status update, search, validation (`400`), and malformed id (`400`). Test data was removed afterwards. |
| Browser QA (local) | Driven in Chrome: validation messages, lead creation, status change persisted across reload, search, stats-card filtering, and modal behaviour |
| Responsive QA | Layout checked at desktop width and at 390 px mobile width. Horizontal overflow was measured (`scrollWidth === clientWidth`). |
| Production verification | End-to-end on the live deployment (Vercel → Render → Atlas): health check, CORS allow-list (the allowed origin gets the header and an unknown origin does not), UI-driven create, persisted status change, and search. Test data was removed afterwards. |

---

## 6. Issues Identified and Resolved

These problems were found during development and fixed before release. Most were caught by the verification steps above.

| Issue | Root cause | Resolution |
|---|---|---|
| Local API hung on startup | Node.js's DNS resolver timed out on the `mongodb+srv` SRV lookup on the local network, even though the OS resolver worked | Used the equivalent non-SRV connection string for local development. Production keeps the SRV URI. Documented in the README under Troubleshooting. |
| Mongoose deprecation warning | `{ new: true }` is deprecated in Mongoose 9 | Replaced with `{ returnDocument: "after" }` |
| Lint: `setState` called synchronously inside an effect | Loading flags were set inside the data-fetching effect, which causes cascading renders | Loading state is now derived by tagging each result with the query key that produced it |
| Lint: non-component export in a component file | The validation helper lived in `LeadForm.tsx`, which breaks Fast Refresh | Moved it to `validation.ts` |
| Redundant network request | Resetting the page inside an effect triggered a second fetch | The page is reset in the search and filter event handlers instead |
| Modal focused the wrong element | The first focusable element was the header's close button | Focus now goes to the first form field. A test asserts this. |
| Status column clipped at 390 px | Table cells could not shrink below their content width | The lead column now shrinks and truncates, and secondary columns are hidden on small screens |
| Type error found after a commit | An unused callback parameter in a test failed `tsc -b` | Fixed and amended before pushing. Builds are now checked before every commit. |
| Vercel CLI deploy failed | The Vercel project's root directory was already set to `frontend` | Deployed from the repository root. Documented in the README. |

---

## 7. Key Engineering Decisions

1. **Layered validation.** Zod validates and normalizes input at the API boundary (trimming, lowercasing emails, coercing query parameters) and returns field-level errors that the UI maps to specific inputs. The MongoDB unique index on `email` is the authoritative guard against duplicates, even under concurrent requests.
2. **Consistent error contract.** A single error middleware maps validation, cast, duplicate-key, not-found, and unexpected errors to `{ error, details? }` with the correct HTTP status. Internal errors are logged and never exposed to clients.
3. **Testable app factory.** `createApp()` has no side effects. The database connection and port binding live in `index.ts`, so tests import the app directly.
4. **Realistic, hermetic tests.** Backend tests run against an in-memory MongoDB engine rather than mocks, so indexes, uniqueness, and query semantics are genuinely exercised.
5. **Safe search.** User input is regex-escaped before it is used in a query, which prevents regex injection and pathological patterns. A dedicated test covers this.
6. **Optimistic UI with rollback.** Status changes update immediately. If the request fails, the previous value is restored and an error is shown.
7. **Race-free data fetching.** Search is debounced, and every request is cancellable through `AbortController`, so stale responses can never overwrite newer results.
8. **Efficient pipeline stats.** One `$group` aggregation, zero-filled for every status, drives the dashboard cards. The cards reuse the existing status filter instead of adding new state.
9. **Accessibility without a UI library.** The modal uses `role="dialog"` and `aria-modal`, has a labelled title, closes on Escape and backdrop click, moves focus in on open and restores it on close, and locks body scroll. Form errors are linked to inputs with `aria-describedby`.
10. **Independent, deployable packages.** Separate `frontend/` and `backend/` packages, each with its own CI job and hosting target, avoid coupling and workspace tooling.
11. **Infrastructure as code.** The backend service is declared in `render.yaml`, and CI is declared in `.github/workflows/ci.yml`.
12. **Secret hygiene.** `.env` files are git-ignored and only `.env.example` templates are committed. Production secrets live only in the Render and Vercel dashboards. CORS is restricted to the production frontend origin.

---

## 8. Reflections on Working with AI

- **Most useful:** Fast scaffolding, consistent boilerplate, thorough test generation, and catching edge cases such as regex escaping, duplicate-key handling, and focus management.
- **Where human judgement was essential:** Setting scope and priorities, choosing the architecture, and keeping control of credentials, public repositories, and network access.
- **Takeaway:** AI output is a draft until it is verified. Running the typechecker, linter, tests, and a real browser against every change caught several defects (Section 6) that reading the code alone would likely have missed.
