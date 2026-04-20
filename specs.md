# Business Financial Management SaaS PRD

Version: 2.0  
Status: Draft for implementation  
Owner: Mateus Araújo  
Document type: Unified Product Requirements Document  
Execution model: Checkbox-driven  
Implementation style: End-to-end TypeScript, separate frontend and backend, monorepo, full linting

---

## 1. Executive Summary

Build a subscription-based SaaS web application for small businesses and marketplace sellers that consolidates financial and sales data from Mercado Livre and Shopee, combines that data with manually entered product and cost information, and exposes profitability insights through dashboards, charts, lists, and indicators.

The product will use paid monthly and annual plans. Users should only be able to access protected product functionality when they have an active subscription.

For V1, the product must favor clarity, maintainability, and operational simplicity:

- **Frontend**: Next.js on Vercel
- **Backend**: NestJS on Render
- **Repository**: monorepo with shared TypeScript packages
- **Database**: Supabase Postgres
- **Authentication**: Better Auth with Google login
- **Billing**: Stripe subscriptions
- **Sync model**: manual only
- **Sync limit**: three daily windows (morning, afternoon, evening)
- **No workers, no queues, no Redis in V1**
- **APIs live in the NestJS backend, not inside Next.js**

The codebase must be designed so that background jobs, workers, queues, and a more advanced sync engine can be introduced later without a rewrite.

---

## 2. Plan Summary

### 2.1 Architecture Summary

```txt
apps/
  web/  -> Next.js frontend, landing page, dashboard UI, SEO pages
  api/  -> NestJS backend API, auth handlers, billing, marketplace integrations

packages/
  config/
  database/
  types/
  ui/
  eslint-config/
  tsconfig/
  domain/
  validation/
```

### 2.2 Deployment Summary

```txt
Vercel
  └─ apps/web

Render
  └─ apps/api

Supabase
  └─ PostgreSQL

Stripe
  └─ subscription billing

Mercado Livre / Shopee
  └─ marketplace integrations
```

### 2.3 V1 Delivery Summary

- Separate frontend and backend from day one
- SEO-first public website in Next.js
- NestJS API as the single backend authority
- Manual sync button with three allowed windows per day
- Dashboard focused on profitability, margins, break-even, and product/channel insight
- Shared contracts and strict TypeScript across the full repository

---

## 3. Product Vision

Help sellers understand whether they are actually profitable, not just generating sales volume.

The product should answer questions like:

- How much profit am I making per product?
- Which marketplace is more profitable?
- How much do fees, shipping, ads, and costs reduce margin?
- What is my break-even point?
- Which products should I keep selling?

The product should feel modern, credible, and operationally useful from the first login.

---

## 4. Goals

### 4.1 Business Goals

- Launch a monetizable SaaS with monthly and annual plans
- Validate demand with a lean but production-worthy V1
- Keep operational complexity low while preserving architectural separation
- Create a foundation that can grow into deeper analytics and automation

### 4.2 Product Goals

- Let users connect marketplaces and manually sync sales data
- Let users register products, costs, ad spend, and other expenses
- Calculate core financial metrics reliably
- Present insights through a useful dashboard with charts, tables, and indicators
- Provide a high-conversion public landing page with strong SEO foundations

### 4.3 Technical Goals

- Entire codebase in TypeScript end to end
- Strong typing across frontend, backend, database schema, validation, and tests
- Separate frontend and backend applications
- Shared repository packages for consistency and reuse
- Full ESLint coverage across the repository
- Easy to scale the architecture later without a destructive rewrite

---

## 5. Non-Goals for V1

The following are explicitly out of scope for V1:

- Automatic recurring syncs
- Background workers
- Redis
- Queue orchestration
- Complex permission matrix beyond essential organization membership
- Native mobile apps
- Deep accounting workflows such as bank reconciliation
- Predictive analytics and forecasting
- Multi-region infrastructure
- Large-scale inventory management
- Complex tax engine for multiple jurisdictions

---

## 6. Target Users

### 6.1 Primary User

Small business owners and marketplace sellers who need visibility into sales, costs, fees, ads, and real profitability.

### 6.2 Secondary User

Operators or small teams helping manage stores, products, and profitability decisions.

### 6.3 Typical User Characteristics

- Sells through Mercado Livre and/or Shopee
- Understands gross sales better than net profit
- Wants visual dashboards and simple calculators
- Needs practical insights more than accounting complexity

---

## 7. Core User Problems

- Marketplace data is fragmented
- Revenue is visible, but profit is unclear
- Fees, ads, shipping, and product costs are hard to consolidate
- Spreadsheets are slow and error-prone
- Sellers struggle to identify profitable versus unprofitable products

---

## 8. Success Metrics

### 8.1 Product Metrics

- Percentage of registered users who complete onboarding
- Percentage of paying users who connect at least one marketplace
- Percentage of active users who use sync at least once per week
- Percentage of users who register at least one manual product and cost
- Time to first usable dashboard after signup

### 8.2 Business Metrics

- Free-to-paid conversion rate
- Monthly recurring revenue
- Annual plan adoption rate
- Churn rate

### 8.3 Technical Metrics

- Sync success rate
- Average sync duration
- Average API response time for dashboard routes
- Billing webhook success rate
- Lint, typecheck, and test pass rate in CI

---

## 9. Product Scope

### 9.1 V1 Included Features

#### Public marketing site
- Hero section with strong CTA
- Features section
- Pricing section with monthly/annual toggle
- Footer with navigation and social links
- Final CTA section
- SEO-ready metadata, sitemap, canonical structure, and robots

#### Authentication and access
- Signup/login
- Google login
- Session management
- Protected app routes
- Organization/workspace association

#### Billing
- Monthly and annual subscription plans
- Stripe checkout
- Local subscription state mirroring
- Subscription-gated access

#### Dashboard
- Revenue indicators
- Profitability indicators
- Margin indicators
- Charts and tables
- Recent sync information
- Sync-window availability messaging

#### Products and costs
- Manual product registration
- Product cost registration
- Ad cost input
- Manual expense input

#### Integrations
- Marketplace connection structure
- Manual sync trigger
- Sync history and status tracking
- Three sync windows per day

#### Financial calculations
- Gross revenue
- Net revenue
- Gross margin
- Contribution margin
- Net profit
- Break-even point
- Break-even quantity
- Profit per product
- Profit per channel

### 9.2 Post-V1 Expansion Candidates

- Scheduled sync jobs
- Background workers
- Redis/BullMQ
- Automatic retries
- Report exports
- Notifications
- Team permissions
- Deeper analytics
- More integrations
- Separate worker services on Render

---

## 10. Functional Requirements

### 10.1 Marketing Website

The public website must:

- Communicate value clearly in the hero section
- Explain main features with visual clarity
- Present pricing with monthly and annual toggle
- Include a strong CTA near the end of the page
- Load quickly and be optimized for SEO
- Look modern and premium, inspired by Stripe, Vercel, and Linear

#### Acceptance Criteria
- User can understand product value in under 10 seconds
- Pricing clearly distinguishes monthly and annual billing
- CTA is visible above the fold and near the bottom of the page
- Sitemap and robots are available
- Public pages include metadata, canonical URLs, and Open Graph tags

### 10.2 Authentication

The application must:

- Allow signup/login using Google
- Support secure sessions
- Prevent unauthorized access to private routes
- Associate users with an organization/workspace model

#### Acceptance Criteria
- User can sign up using Google
- User can access dashboard only when authenticated
- Unauthenticated users are redirected appropriately

### 10.3 Billing and Plan Enforcement

The product must:

- Provide monthly and annual plans
- Use Stripe Checkout or equivalent Stripe-hosted flow
- Mirror subscription status into the local database
- Restrict protected features when plan state is inactive or invalid

#### Acceptance Criteria
- User can subscribe to a plan
- Successful payment unlocks dashboard access
- Failed or inactive subscription blocks protected usage according to product rules
- Webhook events update subscription state locally

### 10.4 Product and Cost Management

The application must allow users to:

- Create manual products
- Set selling price
- Set product cost
- Set ad cost
- Set additional expenses where applicable
- Edit and archive products

#### Acceptance Criteria
- User can create and edit products
- Calculated fields update correctly
- Archived products do not appear as active by default

### 10.5 Marketplace Integrations

The application must support:

- Connection flow for Mercado Livre
- Connection flow for Shopee if credentials and approval are available
- Secure storage of integration credentials and tokens
- Manual sync trigger
- Sync history tracking

#### Acceptance Criteria
- User can connect a supported marketplace account
- User can trigger sync when allowed
- Sync result is recorded with status and timestamps
- Integration failures are surfaced clearly

### 10.6 Sync Window Rules

The sync feature must:

- Be manual only in V1
- Be allowed at most once per window
- Use three daily windows: morning, afternoon, evening
- Prevent duplicate sync usage within the same window
- Show the next available sync window when blocked

#### Proposed Window Definition
- Morning: 06:00 to 11:59
- Afternoon: 12:00 to 17:59
- Evening: 18:00 to 23:59

Time zone should initially use the product’s primary business time zone and later become organization-configurable.

#### Acceptance Criteria
- If the current window was already used, sync is blocked
- If the current window was not used, sync is allowed
- UI shows current sync availability and next allowed time

### 10.7 Dashboard and Analytics

The dashboard must show:

- Revenue summary
- Net profit summary
- Margin indicators
- Product profitability ranking
- Channel profitability summary
- Recent sync status
- Time-based charts for financial evolution

#### Acceptance Criteria
- Dashboard loads core summary metrics without spreadsheet work
- User can understand profitability at a glance
- Calculations match defined formulas

---

## 11. Financial Calculation Requirements

The application must calculate and expose at least the following:

### 11.1 Core Metrics
- Gross revenue
- Net revenue
- Total cost of goods sold
- Total ad costs
- Total fees
- Gross margin percentage
- Contribution margin
- Net profit
- Profit by SKU
- Profit by channel
- Break-even point
- Break-even quantity

### 11.2 Example Formulas

These formulas should be centralized in backend domain services and tested.

- Gross Revenue = sum of sales values
- Net Revenue = gross revenue - refunds - discounts when applicable
- Contribution Margin = selling price - variable costs
- Gross Margin % = (revenue - COGS) / revenue
- Net Profit = revenue - COGS - marketplace fees - ad costs - taxes estimate - fixed costs - additional expenses
- Break-even Quantity = fixed costs / contribution margin per unit

### 11.3 Requirements
- Calculations must be deterministic
- Calculation logic must not be duplicated across frontend and backend
- All formulas must have unit tests

---

## 12. UX and Design Requirements

### 12.1 Brand and UI Direction

The product should feel:

- modern
- clean
- premium
- trustworthy
- data-rich without becoming noisy

### 12.2 Design Principles

- clear typography
- strong spacing
- restrained gradients
- dashboard first, decoration second
- visual hierarchy around important numbers
- no cluttered enterprise-looking screens

### 12.3 Dashboard UX Principles

- important metrics above the fold
- charts should support summary indicators, not replace them
- empty states must guide setup and first sync
- errors must be clear and actionable

---

## 13. SEO Requirements

SEO applies primarily to public pages served by the Next.js frontend.

### 13.1 Public SEO Scope
- homepage
- pricing page
- features page
- integrations page
- future blog or comparison pages

### 13.2 Private App SEO Scope
Private dashboard routes must be noindexed.

### 13.3 Required SEO Features
- metadata per page
- Open Graph tags
- canonical URLs
- sitemap generation
- robots rules
- statically rendered or server-rendered public pages where appropriate
- strong Core Web Vitals hygiene

### 13.4 Acceptance Criteria
- Public pages expose metadata correctly
- Sitemap is generated
- Robots file is available
- Private routes are not intended for search indexing

---

## 14. Technical Architecture

### 14.1 V1 Architecture Decision

For V1, use a **separate frontend and backend**:

- **Frontend**: Next.js on Vercel
- **Backend**: NestJS on Render

This keeps the public web experience fast and SEO-friendly while preserving a clear backend boundary for authentication, billing, integrations, sync orchestration, and domain logic.

### 14.2 Why This Direction

- Keeps frontend and backend responsibilities cleanly separated
- Preserves strong SEO for the public website
- Gives the backend its own deployment lifecycle
- Avoids burying business logic inside Next.js route handlers
- Makes later scaling to workers and background jobs easier

### 14.3 V1 Constraint

V1 still avoids workers, queues, and Redis. The NestJS backend will execute syncs directly in the request path, so sync scope must stay incremental and bounded.

### 14.4 Stack

#### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query

#### Backend
- NestJS
- TypeScript
- Fastify adapter preferred
- Zod for validation boundaries

#### Authentication
- Better Auth
- Google login

#### Billing
- Stripe

#### Database
- Supabase Postgres

#### ORM / Schema / Migrations
- Drizzle ORM

#### Charts
- Recharts or similar React chart library

#### Linting and code quality
- ESLint
- TypeScript strict mode
- Prettier optional but recommended

#### Testing
- Vitest for unit/integration tests
- Playwright for end-to-end tests

#### CI/CD
- GitHub Actions
- Vercel for `apps/web`
- Render for `apps/api`

---

## 15. End-to-End TypeScript Requirements

The entire stack must be TypeScript.

### Required Areas
- Next.js frontend
- NestJS backend
- database schema and queries
- auth configuration
- billing integration layer
- marketplace integration layer
- test code
- shared DTOs, contracts, and validation schemas
- repository tooling where applicable

### Rules
- Enable `strict` TypeScript mode
- Avoid `any` except where explicitly documented and isolated
- Prefer inferred types from schema and validators where practical
- Shared types must live in reusable packages, not copied manually

---

## 16. Linting and Quality Gates

### Required
- ESLint configured for TypeScript, Next.js, and NestJS
- CI must fail on lint errors
- CI must fail on typecheck errors
- CI must fail on test failures for protected branches

### Recommended Scripts
- `lint`
- `typecheck`
- `test`
- `test:e2e`
- `build`

---

## 17. Repository Structure

```txt
apps/
  web/
    src/
      app/
      components/
      features/
      lib/
      styles/

  api/
    src/
      main.ts
      app.module.ts
      modules/
      common/
      integrations/
      domain/
      infra/

packages/
  ui/
  config/
  database/
  types/
  domain/
  validation/
  eslint-config/
  tsconfig/
```

### 17.1 Architectural Rules

- `apps/web` contains frontend pages, layouts, UI state, and client/server rendering concerns
- `apps/api` contains controllers, services, modules, webhooks, integration adapters, and domain orchestration
- `packages/*` contains shared code used by one or both apps
- framework entrypoints must stay thin
- calculations stay in reusable domain modules
- integration code stays behind provider boundaries
- frontend must consume backend APIs, not duplicate business logic

---

## 18. Data Model Overview

### 18.1 Core Tables

#### Users and organizations
- users
- organizations
- organization_members
- sessions
- auth_accounts

#### Billing
- billing_customers
- subscriptions
- subscription_events

#### Marketplace connections
- marketplace_connections
- sync_runs
- external_orders
- external_order_items
- external_products
- external_fees

#### Product and cost management
- products
- product_costs
- ad_costs
- manual_expenses

#### Analytics
- daily_metrics
- product_metrics

### 18.2 Important Notes
- All business data should be organization-scoped
- Index organization foreign keys consistently
- Sync history should record provider, status, timestamps, and error summary
- Subscription data should be mirrored locally
- Tables used by Better Auth must be aligned with the chosen adapter and schema strategy

---

## 19. API Requirements

The NestJS backend is the API authority. The Next.js frontend must consume this API.

### 19.1 Auth and Billing
- `POST /auth/*`
- `POST /billing/stripe/webhook`

### 19.2 Dashboard
- `GET /dashboard/summary`
- `GET /dashboard/charts`
- `GET /dashboard/recent-sync`

### 19.3 Products and Costs
- `GET /products`
- `POST /products`
- `PATCH /products/:id`
- `GET /costs`
- `POST /costs`
- `PATCH /costs/:id`

### 19.4 Integrations and Sync
- `POST /integrations/mercadolivre/connect`
- `POST /integrations/shopee/connect`
- `POST /sync/run`
- `GET /sync/status`
- `GET /sync/history`

### 19.5 API Rules
- Validate all inputs with Zod or equivalent validated DTO boundaries
- Return typed response shapes
- Use organization-scoped authorization checks
- Keep controllers thin
- Keep business logic in services and domain modules

---

## 20. Sync Design for V1

### 20.1 Sync Philosophy

V1 sync is manual, bounded, and incremental.

### Rules
- User triggers sync manually
- Sync allowed only once per window
- Sync fetches only new or changed data since the last successful sync when supported
- Sync records are stored for visibility and debugging

### 20.2 Sync Flow

1. User clicks `Sync Data` in the web app
2. Frontend calls the NestJS backend
3. Backend authenticates user and verifies active plan
4. Backend determines current window key
5. Backend checks whether that window already contains a successful or processing sync
6. If blocked, backend returns next allowed window
7. If allowed, backend records `sync_run` as processing
8. Backend performs marketplace sync
9. Backend stores or upserts marketplace data
10. Backend recalculates affected metrics
11. Backend records sync as completed or failed
12. Frontend displays result and updated availability state

### 20.3 Sync Risks
- external API slowness
- long-running sync requests
- partial sync failures
- duplicate runs if locking is weak

### 20.4 Mitigations
- keep sync incremental
- limit sync scope
- maintain sync status table
- use idempotent upsert logic where possible
- maintain a clean seam for later worker extraction

---

## 21. Security and Access Requirements

- All private backend endpoints must require authentication
- Subscription-gated features must verify active entitlement
- Secrets must stay server-side
- Marketplace tokens must be encrypted or stored securely
- Stripe webhooks must verify signatures
- Input validation must happen server-side
- Sensitive logs must avoid secret leakage
- CORS and cookie/session strategy must be explicitly configured between `web` and `api`

---

## 22. Performance Requirements

### 22.1 Public Site
- fast initial load
- good Core Web Vitals targets
- CDN-friendly output

### 22.2 Private App
- dashboard summary endpoints should be performant
- frontend should avoid repeated expensive polling
- backend should avoid recalculating everything from raw tables on every request if it becomes expensive

### 22.3 Sync
- keep runtime bounded
- incremental processing only
- fail clearly if provider or time-window rules prevent execution

---

## 23. Observability Requirements

### Required in V1
- error logging for backend routes
- logging for sync runs
- logging for Stripe webhooks
- traceable failure messages in sync history

### Nice to Have
- structured request logging
- monitoring provider integration failures by provider
- analytics for onboarding completion and sync usage

---

## 24. Testing Requirements

### 24.1 Unit Tests
Must cover:
- financial formulas
- sync window calculation
- plan and entitlement rules
- provider mapping helpers
- domain validation rules

### 24.2 Integration Tests
Must cover:
- database repositories
- Stripe webhook handling
- sync orchestration logic
- auth and organization access logic
- key NestJS modules

### 24.3 End-to-End Tests
Must cover:
- signup/login with Google mocked or adapted for test strategy
- subscription unlock flow where feasible
- product creation
- sync-button rule behavior
- dashboard loading

---

## 25. Progress Tracker

This PRD is checkbox-driven. The sections below are the operational source of truth for implementation progress.

### 25.1 How to Use This Tracker
- Mark milestone-level checkboxes only when the milestone exit criteria are satisfied
- Mark task-level checkboxes as implementation work is completed and merged
- Keep exactly one item under Current Focus checked at a time
- When blocked, add a note under the milestone's Blockers / Notes subsection
- When a milestone is finished, update `docs/CHECKPOINTS.md` with a short summary of what shipped

### 25.2 Overall Progress Snapshot
- [x] M0. Repository Foundation
- [x] M1. Monorepo and Shared Packages
- [x] M2. Frontend Web App Scaffold
- [ ] M3. Backend API Scaffold on Render
- [ ] M4. Database and Schema
- [ ] M5. Authentication and Access Control
- [ ] M6. Billing and Entitlements
- [ ] M7. Marketing Site and SEO
- [ ] M8. Product and Cost Management
- [ ] M9. Financial Domain Engine
- [ ] M10. Marketplace Connections
- [ ] M11. Manual Sync System with 3 Daily Windows
- [ ] M12. Dashboard and Insights
- [ ] M13. Quality, Observability, and Hardening
- [ ] M14. Launch and Post-Launch Readiness

### 25.3 Current Focus
- [x] Active milestone identified
- [x] Active task identified
- [x] Dependencies checked
- [x] Blockers reviewed
- [x] Next task queued

### 25.4 Suggested Tracker Fields for Repo Updates

```md
## Current Focus
- Active milestone: M0
- Active task: Configure shared ESLint package
- Next task: Configure shared tsconfig package
- Blockers: None
- Last completed checkpoint: None

## Completed Checkpoints
- [ ] M0 completed
- [ ] M1 completed
- [ ] M2 completed
```

---

## 26. Milestone Map

### 26.1 Milestone Sequence
- [x] **M0** Repository Foundation
- [x] **M1** Monorepo and Shared Packages
- [ ] **M2** Frontend Web App Scaffold
- [ ] **M3** Backend API Scaffold on Render
- [ ] **M4** Database and Schema
- [ ] **M5** Authentication and Access Control
- [ ] **M6** Billing and Entitlements
- [ ] **M7** Marketing Site and SEO
- [ ] **M8** Product and Cost Management
- [ ] **M9** Financial Domain Engine
- [ ] **M10** Marketplace Connections
- [ ] **M11** Manual Sync System with 3 Daily Windows
- [ ] **M12** Dashboard and Insights
- [ ] **M13** Quality, Observability, and Hardening
- [ ] **M14** Launch and Post-Launch Readiness

### 26.2 Milestone Completion Rule
A milestone is complete only when:
- every required task in that milestone is checked
- the milestone exit criteria are satisfied
- required tests for that milestone are passing
- the checkpoint note has been written to `docs/CHECKPOINTS.md`

### 26.3 Dependency Notes
- M0 blocks everything
- M1 depends on M0
- M2 and M3 depend on M1
- M4 depends on M1 and should align both apps
- M5 depends on M3 and M4
- M6 depends on M5
- M7 depends on M2
- M8 depends on M4 and M5
- M9 depends on M4 and M8
- M10 depends on M5 and M4
- M11 depends on M9 and M10
- M12 depends on M9 and M11
- M13 depends on the core user journey being functional
- M14 depends on all launch-critical milestones

---

## 27. Detailed Milestones and Tasks

---

## [x] M0. Repository Foundation

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [x] Completed

### Objective
Establish a strict TypeScript, ESLint, CI, and repository baseline.

### Dependencies
- none

### Task Groups

#### 0.1 Repository Setup
- [x] Initialize repository
- [x] Add top-level README with setup instructions
- [x] Define branching and PR conventions
- [x] Add `.editorconfig`, `.gitignore`, and repository hygiene files

#### 0.2 TypeScript and Linting Baseline
- [x] Configure strict TypeScript defaults
- [x] Configure ESLint base strategy
- [x] Decide and document Prettier usage
- [x] Define path alias strategy

#### 0.3 CI Baseline
- [x] Add CI workflow for lint, typecheck, test, and build
- [x] Verify local developer startup flow
- [x] Add required scripts to root package.json

### Exit Criteria
- [x] Repository installs cleanly
- [x] Root scripts run successfully
- [x] ESLint passes
- [x] Typecheck passes
- [x] Build pipeline passes
- [x] Setup instructions are documented

### Blockers / Notes
- [x] No blockers currently logged

---

## [x] M1. Monorepo and Shared Packages

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [x] Completed

### Objective
Create the monorepo shape and shared packages used by both frontend and backend.

### Dependencies
- M0 complete

### Task Groups

#### 1.1 Workspace Setup
- [x] Configure pnpm workspaces
- [x] Configure Turborepo
- [x] Add root-level task pipeline
- [x] Document package boundaries

#### 1.2 Shared Packages
- [x] Create `packages/types`
- [x] Create `packages/database`
- [x] Create `packages/domain`
- [x] Create `packages/validation`
- [x] Create `packages/ui`
- [x] Create `packages/eslint-config`
- [x] Create `packages/tsconfig`

#### 1.3 Shared Package Validation
- [x] Verify package imports from both apps
- [x] Verify build and type resolution across apps
- [x] Document package ownership rules

### Exit Criteria
- [x] Monorepo workspace resolves correctly
- [x] Shared packages build or typecheck successfully
- [x] Both apps can consume shared packages
- [x] Repository structure is documented

### Blockers / Notes
- [x] No blockers currently logged

---

## [ ] M2. Frontend Web App Scaffold

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [x] Completed

### Objective
Create the Next.js frontend with public and private route boundaries.

### Dependencies
- M1 complete

### Task Groups

#### 2.1 Web Bootstrap
- [x] Initialize Next.js App Router app in `apps/web`
- [x] Add Tailwind CSS
- [x] Add base UI primitives and design tokens

#### 2.2 Route Structure
- [x] Create `(marketing)` route group
- [x] Create `(app)` route group
- [x] Create base layouts
- [x] Create protected app layout placeholder

#### 2.3 Frontend Conventions
- [x] Add API client layer for NestJS communication
- [x] Add frontend env configuration
- [x] Add error/loading UI conventions
- [x] Add TanStack Query baseline where appropriate

### Exit Criteria
- [x] Frontend runs locally
- [x] Marketing and app route groups exist
- [x] Shared UI foundation exists
- [x] API client layer is established

### Blockers / Notes
- [x] No blockers currently logged
- Implementation work and verification are complete; awaiting user confirmation before marking milestone complete.

---

## [ ] M3. Backend API Scaffold on Render

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Create the NestJS backend and prepare it for deployment on Render.

### Dependencies
- M1 complete

### Task Groups

#### 3.1 API Bootstrap
- [ ] Initialize NestJS app in `apps/api`
- [ ] Choose and configure HTTP adapter
- [ ] Add health endpoint
- [ ] Add module skeleton

#### 3.2 API Architecture
- [ ] Create `common`, `modules`, `infra`, and `integrations` structure
- [ ] Add global validation strategy
- [ ] Add error handling and exception filters
- [ ] Add CORS and cookie/session strategy for web-to-api communication

#### 3.3 Render Readiness
- [ ] Add Render build and start commands
- [ ] Add environment variable documentation for Render
- [ ] Add health check path
- [ ] Verify production boot flow locally

### Exit Criteria
- [ ] Backend runs locally
- [ ] Health endpoint works
- [ ] Base modules compile
- [ ] Render deploy instructions are documented

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M4. Database and Schema

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Set up Supabase Postgres, Drizzle schema, migrations, and shared database access.

### Dependencies
- M1 complete

### Task Groups

#### 4.1 Database Foundation
- [ ] Configure database package
- [ ] Configure Drizzle
- [ ] Add migration workflow
- [ ] Add environment validation for DB access

#### 4.2 Initial Schema
- [ ] Model users and organizations
- [ ] Model billing tables
- [ ] Model marketplace connection tables
- [ ] Model products, costs, and expenses
- [ ] Model sync history
- [ ] Model metrics tables

#### 4.3 Database Quality
- [ ] Add indexes for organization-scoped access
- [ ] Add seed or fixture strategy for local development
- [ ] Document migration and rollback flow

### Exit Criteria
- [ ] Database connection works from backend
- [ ] Migrations run successfully
- [ ] Initial schema exists
- [ ] Local development data strategy exists

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M5. Authentication and Access Control

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Implement authentication, sessions, organization scoping, and route protection.

### Dependencies
- M3 and M4 complete

### Task Groups

#### 5.1 Better Auth Setup
- [ ] Install and configure Better Auth in backend
- [ ] Configure database adapter
- [ ] Configure Google login
- [ ] Expose auth endpoints

#### 5.2 Session and Access Model
- [ ] Define session strategy
- [ ] Define organization membership model
- [ ] Add backend auth guards or equivalent access middleware
- [ ] Add frontend protected-route behavior

#### 5.3 Auth Quality
- [ ] Add auth integration tests
- [ ] Add login/logout flows in frontend
- [ ] Document auth environment variables

### Exit Criteria
- [ ] User can authenticate
- [ ] Protected routes are enforced
- [ ] Organization-scoped access works
- [ ] Auth flow is documented

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M6. Billing and Entitlements

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Implement Stripe subscription flows and access gating.

### Dependencies
- M5 complete

### Task Groups

#### 6.1 Stripe Foundation
- [ ] Configure Stripe products and prices
- [ ] Define monthly and annual plan identifiers
- [ ] Implement checkout initiation flow
- [ ] Model billing customer and subscription mapping

#### 6.2 Webhooks and Local State
- [ ] Add Stripe webhook endpoint in backend
- [ ] Verify webhook signatures
- [ ] Mirror subscription state locally
- [ ] Define entitlement-check helper

#### 6.3 Product Enforcement
- [ ] Gate protected backend endpoints by entitlement
- [ ] Gate frontend app entry by entitlement
- [ ] Add subscription state UI in app

### Exit Criteria
- [ ] User can subscribe
- [ ] Subscription state is mirrored locally
- [ ] Protected product usage is gated correctly
- [ ] Billing flow is tested at minimum critical-path level

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M7. Marketing Site and SEO

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Build the public website and SEO baseline in Next.js.

### Dependencies
- M2 complete

### Task Groups

#### 7.1 Public Pages
- [ ] Build Hero section
- [ ] Build Features section
- [ ] Build Pricing section with monthly/annual toggle
- [ ] Build Footer
- [ ] Build final CTA section

#### 7.2 SEO Foundation
- [ ] Add metadata strategy
- [ ] Add sitemap generation
- [ ] Add robots rules
- [ ] Add canonical URL strategy
- [ ] Add Open Graph tags

#### 7.3 UX and Performance
- [ ] Add responsive behavior
- [ ] Optimize visual loading
- [ ] Review page performance and page quality

### Exit Criteria
- [ ] Public website is complete
- [ ] SEO baseline exists
- [ ] Pricing is clear
- [ ] CTA flow leads toward signup

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M8. Product and Cost Management

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Allow users to create, edit, and manage products and related cost inputs.

### Dependencies
- M4 and M5 complete

### Task Groups

#### 8.1 Backend
- [ ] Create product module
- [ ] Create product cost module
- [ ] Create ad cost and manual expense endpoints
- [ ] Add archive behavior

#### 8.2 Frontend
- [ ] Build product list page
- [ ] Build create/edit product forms
- [ ] Build cost entry flows
- [ ] Build empty and error states

#### 8.3 Quality
- [ ] Add validation tests
- [ ] Add core integration tests
- [ ] Verify organization scoping

### Exit Criteria
- [ ] User can manage products and costs
- [ ] Calculated fields can consume stored data
- [ ] Product CRUD path is functional end to end

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M9. Financial Domain Engine

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Implement deterministic financial formulas and metric-generation logic.

### Dependencies
- M4 and M8 complete

### Task Groups

#### 9.1 Formula Layer
- [ ] Implement gross revenue formula
- [ ] Implement net revenue formula
- [ ] Implement contribution margin formula
- [ ] Implement gross margin formula
- [ ] Implement net profit formula
- [ ] Implement break-even formulas

#### 9.2 Metrics and Aggregation
- [ ] Add product-level profitability calculations
- [ ] Add channel-level profitability calculations
- [ ] Add daily metrics generation strategy
- [ ] Add metric read helpers for dashboard consumption

#### 9.3 Tests
- [ ] Add unit tests for formulas
- [ ] Add integration tests for stored metric generation
- [ ] Verify deterministic outputs

### Exit Criteria
- [ ] Core formulas are implemented
- [ ] Tests validate metric correctness
- [ ] Dashboard-facing data contracts are available

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M10. Marketplace Connections

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Implement marketplace account connection flows and provider boundaries.

### Dependencies
- M4 and M5 complete

### Task Groups

#### 10.1 Provider Boundaries
- [ ] Define provider interface
- [ ] Add Mercado Livre provider skeleton
- [ ] Add Shopee provider skeleton
- [ ] Add secure token storage strategy

#### 10.2 Connection Flows
- [ ] Implement Mercado Livre connect flow
- [ ] Implement Shopee connect flow if credentials are available
- [ ] Add connection status endpoints
- [ ] Add disconnection flow if needed

#### 10.3 Quality
- [ ] Add provider mapping tests
- [ ] Add connection-flow integration tests
- [ ] Add provider error messaging strategy

### Exit Criteria
- [ ] At least one provider connect flow is functional
- [ ] Provider boundary exists for future expansion
- [ ] Connection state is visible in the app

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M11. Manual Sync System with 3 Daily Windows

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Implement the manual sync button, daily window rules, sync status tracking, and incremental import flow.

### Dependencies
- M9 and M10 complete

### Task Groups

#### 11.1 Sync Rule Engine
- [ ] Implement window-key calculation
- [ ] Implement current-window availability check
- [ ] Implement duplicate-window blocking
- [ ] Implement next-available-window response logic

#### 11.2 Sync Execution
- [ ] Create sync run service
- [ ] Record `processing`, `completed`, and `failed` states
- [ ] Implement incremental sync strategy
- [ ] Implement idempotent upsert flow
- [ ] Recalculate affected metrics after sync

#### 11.3 Frontend UX
- [ ] Add Sync Data button
- [ ] Add blocked-state messaging
- [ ] Add sync status and history UI
- [ ] Add loading and failure states

### Exit Criteria
- [ ] User can run sync when allowed
- [ ] User is blocked after using the current window
- [ ] Sync history is visible
- [ ] Updated metrics appear after successful sync

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M12. Dashboard and Insights

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Expose useful financial insights through the dashboard.

### Dependencies
- M9 and M11 complete

### Task Groups

#### 12.1 Backend Read Models
- [ ] Implement dashboard summary endpoint
- [ ] Implement chart endpoint
- [ ] Implement recent sync endpoint
- [ ] Implement product profitability read model

#### 12.2 Frontend Dashboard
- [ ] Build top-level KPI section
- [ ] Build charts section
- [ ] Build profitability tables
- [ ] Build recent sync panel
- [ ] Build empty states for not-yet-synced accounts

#### 12.3 Dashboard Quality
- [ ] Validate numbers against domain formulas
- [ ] Review data-loading states
- [ ] Review mobile and desktop usability

### Exit Criteria
- [ ] Dashboard displays useful financial insight
- [ ] Summary metrics and charts load correctly
- [ ] Recent sync data is visible
- [ ] UI reflects real backend-calculated values

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M13. Quality, Observability, and Hardening

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Improve reliability, error visibility, and launch confidence.

### Dependencies
- Core product path is functional

### Task Groups

#### 13.1 Quality Gates
- [ ] Expand unit test coverage
- [ ] Expand integration test coverage
- [ ] Add end-to-end smoke coverage
- [ ] Enforce CI branch protections

#### 13.2 Observability
- [ ] Add structured logging for backend
- [ ] Add sync failure logging
- [ ] Add webhook failure logging
- [ ] Add operational troubleshooting notes

#### 13.3 Hardening
- [ ] Review secrets handling
- [ ] Review error redaction
- [ ] Review API rate protection strategy
- [ ] Review deployment environment parity

### Exit Criteria
- [ ] Critical flows are covered by tests
- [ ] Logs support debugging
- [ ] Deployment posture is documented
- [ ] Release confidence is acceptable

### Blockers / Notes
- [ ] No blockers currently logged

---

## [ ] M14. Launch and Post-Launch Readiness

### Status
- [ ] Not started
- [ ] In progress
- [ ] Blocked
- [ ] Completed

### Objective
Prepare the product for initial launch and clear next-step evolution.

### Dependencies
- Launch-critical milestones complete

### Task Groups

#### 14.1 Launch Readiness
- [ ] Verify production environment variables
- [ ] Verify web and API domains
- [ ] Verify Stripe production configuration
- [ ] Verify Supabase production configuration
- [ ] Verify Render production deployment
- [ ] Verify Vercel production deployment

#### 14.2 Product Readiness
- [ ] Validate onboarding path
- [ ] Validate billing-to-access path
- [ ] Validate marketplace connect-to-sync path
- [ ] Validate dashboard insight path

#### 14.3 Post-Launch Planning
- [ ] Define V2 extraction points for jobs and workers
- [ ] Document future queue/Redis strategy
- [ ] Document next product milestones
- [ ] Write launch retrospective template

### Exit Criteria
- [ ] Production stack is verified
- [ ] Launch-critical journey works end to end
- [ ] Next technical evolution path is documented

### Blockers / Notes
- [ ] No blockers currently logged

---

## 28. Checkpoint Discipline

Every completed milestone must append an entry to `docs/CHECKPOINTS.md` using the following format:

```md
## Checkpoint Mx
- Date:
- Milestone:
- Summary of what shipped:
- Key files/modules added:
- Tests added or updated:
- Known issues:
- Next recommended milestone:
- Next recommended task:
```

The checkpoint file is intended to let an implementation agent resume accurately from the last known stable point.

---

## 29. Final V1 Recommendation

For V1, the recommended stack and deployment model are:

- **Frontend**: Next.js on Vercel
- **Backend**: NestJS on Render
- **Database**: Supabase Postgres
- **Auth**: Better Auth with Google login
- **Billing**: Stripe
- **Language**: TypeScript everywhere
- **Quality**: ESLint everywhere, strict typing, tests in CI
- **Sync model**: manual only, three daily windows
- **Background jobs**: deferred to a later phase
- **Architecture goal**: clean separation now, scalable extraction later
